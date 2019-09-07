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

  async add(messageHash: string, messageItem: MessageItem, network: string) {
    ensureNotNull(messageItem.message, MessageNotFound, messageHash);
    return this.knex
      .insert({
        messageHash,
        transactionHash: messageItem.transactionHash,
        walletAddress: messageItem.walletAddress,
        state: 'AwaitSignature',
        message: stringifySignedMessageFields(messageItem.message),
        network
      })
      .into('messages');
  }

  async get(messageHash: string, network: string) {
    const message = await this.getMessageEntry(messageHash, network);
    if (!message) {
      throw new InvalidMessage(messageHash);
    }
    if (message.message) {
      message.message = bignumberifySignedMessageFields(message.message);
    }
    const signatureKeyPairs = await this.getCollectedSignatureKeyPairs(messageHash, network);
    const messageItem: MessageItem = message && {
      ...message,
      collectedSignatureKeyPairs: signatureKeyPairs
    };
    return messageItem;
  }

  private async getMessageEntry(messageHash: string, network: string) {
    return this.knex('messages')
      .where('messageHash', messageHash)
      .where('network', network)
      .columns(['transactionHash', 'error', 'walletAddress', 'message', 'state'])
      .first();
  }

  async isPresent(messageHash: string, network: string) {
    const message = await this.getMessageEntry(messageHash, network);
    const signatureKeyPairs = await this.knex('signature_key_pairs')
      .where('messageHash', messageHash)
      .where('network', network);
    return !!message || signatureKeyPairs.length !== 0;
  }

  async remove(messageHash: string, network: string) {
    const messageItem: MessageItem = await this.get(messageHash, network);
    await this.knex('signature_key_pairs')
      .delete()
      .where('messageHash', messageHash)
      .where('network', network);
    await this.knex('messages')
      .delete()
      .where('messageHash', messageHash);
    return messageItem;
  }

  async addSignature(messageHash: string, signature: string, network: string) {
    const key = getKeyFromHashAndSignature(messageHash, signature);
    await this.knex
      .insert({
        messageHash,
        signature,
        key,
        network
      })
      .into('signature_key_pairs');
  }

  async getCollectedSignatureKeyPairs(messageHash: string, network: string) {
    return this.knex('signature_key_pairs')
      .where('messageHash', messageHash)
      .where('network', network)
      .select(['key', 'signature']);
  }

  async setMessageState(messageHash: string, state: MessageState, network: string) {
    return this.knex('messages')
      .where('messageHash', messageHash)
      .where('network', network)
      .update('state', state);
  }

  async markAsPending(messageHash: string, transactionHash: string, network: string) {
    ensureProperTransactionHash(transactionHash);
    return this.knex('messages')
      .where('messageHash', messageHash)
      .where('network', network)
      .update('transactionHash', transactionHash)
      .update('state', 'Pending');
  }

  async markAsError(messageHash: string, error: string, network: string) {
    return this.knex('messages')
      .where('messageHash', messageHash)
      .where('network', network)
      .update('error', error)
      .update('state', 'Error');
  }

  async containSignature(messageHash: string, signature: string, network: string) {
    const foundSignature = await this.knex('signature_key_pairs')
      .where('messageHash', messageHash)
      .where('network', network)
      .andWhere('signature', signature)
      .first();
    return !!foundSignature;
  }

  async getMessage(messageHash: string, network: string) {
    const message = (await this.get(messageHash, network)).message;
    ensureNotNull(message, MessageNotFound, messageHash);
    const collectedSignatureKeyPairs = await this.getCollectedSignatureKeyPairs(messageHash, network);
    return getMessageWithSignatures(message, collectedSignatureKeyPairs);
  }
}

export default MessageSQLRepository;
