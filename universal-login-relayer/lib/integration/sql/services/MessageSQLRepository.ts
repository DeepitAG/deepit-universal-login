import Knex from 'knex';
import {stringifySignedMessageFields, bignumberifySignedMessageFields, ensureNotNull, getMessageWithSignatures, MessageState} from '@universal-login/commons';
import {getKeyFromHashAndSignature} from '../../../core/utils/utils';
import IMessageRepository from '../../../core/services/messages/IMessagesRepository';
import {InvalidMessage, MessageNotFound} from '../../../core/utils/errors';
import MessageItem from '../../../core/models/messages/MessageItem';
import {ensureProperTransactionHash} from '../../../core/utils/validations';

export class MessageSQLRepository implements IMessageRepository {
  constructor(public knex: Knex) {
  }

  async add(messageHash: string, messageItem: MessageItem, chainName: string) {
    ensureNotNull(messageItem.message, MessageNotFound, messageHash);
    return this.knex
      .insert({
        messageHash,
        transactionHash: messageItem.transactionHash,
        walletAddress: messageItem.walletAddress,
        state: 'AwaitSignature',
        message: stringifySignedMessageFields(messageItem.message),
        chainName
      })
      .into('messages');
  }

  async get(messageHash: string, chainName: string) {
    const message = await this.getMessageEntry(messageHash, chainName);
    if (!message) {
      throw new InvalidMessage(messageHash);
    }
    if (message.message) {
      message.message = bignumberifySignedMessageFields(message.message);
    }
    const signatureKeyPairs = await this.getCollectedSignatureKeyPairs(messageHash, chainName);
    const messageItem: MessageItem = message && {
      ...message,
      collectedSignatureKeyPairs: signatureKeyPairs
    };
    return messageItem;
  }

  private async getMessageEntry(messageHash: string, chainName: string) {
    return this.knex('messages')
      .where('messageHash', messageHash)
      .where('chainName', chainName)
      .columns(['transactionHash', 'error', 'walletAddress', 'message', 'state'])
      .first();
  }

  async isPresent(messageHash: string, chainName: string) {
    const message = await this.getMessageEntry(messageHash, chainName);
    const signatureKeyPairs = await this.knex('signature_key_pairs')
      .where('messageHash', messageHash)
      .where('chainName', chainName);
    return !!message || signatureKeyPairs.length !== 0;
  }

  async remove(messageHash: string, chainName: string) {
    const messageItem: MessageItem = await this.get(messageHash, chainName);
    await this.knex('signature_key_pairs')
      .delete()
      .where('messageHash', messageHash)
      .where('chainName', chainName);
    await this.knex('messages')
      .delete()
      .where('messageHash', messageHash);
    return messageItem;
  }

  async addSignature(messageHash: string, signature: string, chainName: string) {
    const key = getKeyFromHashAndSignature(messageHash, signature);
    await this.knex
      .insert({
        messageHash,
        signature,
        key,
        chainName
      })
      .into('signature_key_pairs');
  }

  async getCollectedSignatureKeyPairs(messageHash: string, chainName: string) {
    return this.knex('signature_key_pairs')
      .where('messageHash', messageHash)
      .where('chainName', chainName)
      .select(['key', 'signature']);
  }

  async setMessageState(messageHash: string, state: MessageState, chainName: string) {
    return this.knex('messages')
      .where('messageHash', messageHash)
      .where('chainName', chainName)
      .update('state', state);
  }

  async markAsPending(messageHash: string, transactionHash: string, chainName: string) {
    ensureProperTransactionHash(transactionHash);
    return this.knex('messages')
      .where('messageHash', messageHash)
      .where('chainName', chainName)
      .update('transactionHash', transactionHash)
      .update('state', 'Pending');
  }

  async markAsError(messageHash: string, error: string, chainName: string) {
    return this.knex('messages')
      .where('messageHash', messageHash)
      .where('chainName', chainName)
      .update('error', error)
      .update('state', 'Error');
  }

  async containSignature(messageHash: string, signature: string, chainName: string) {
    const foundSignature = await this.knex('signature_key_pairs')
      .where('messageHash', messageHash)
      .where('chainName', chainName)
      .andWhere('signature', signature)
      .first();
    return !!foundSignature;
  }

  async getMessage(messageHash: string, chainName: string) {
    const message = (await this.get(messageHash, chainName)).message;
    ensureNotNull(message, MessageNotFound, messageHash);
    const collectedSignatureKeyPairs = await this.getCollectedSignatureKeyPairs(messageHash, chainName);
    return getMessageWithSignatures(message, collectedSignatureKeyPairs);
  }
}

export default MessageSQLRepository;
