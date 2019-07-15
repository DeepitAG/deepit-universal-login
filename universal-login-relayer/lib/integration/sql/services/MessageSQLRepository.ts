import Knex from 'knex';
import {stringifySignedMessageFields, bignumberifySignedMessageFields, ensureNotNull, getMessageWithSignatures} from '@universal-login/commons';
import {getKeyFromHashAndSignature} from '../../../core/utils/utils';
import {InvalidMessage, MessageNotFound} from '../../../core/utils/errors';
import IMessageRepository from '../../../core/services/messages/IMessagesRepository';
import MessageItem from '../../../core/models/messages/MessageItem';
import {ensureProperTransactionHash} from '../../../core/utils/validations';

export class MessageSQLRepository implements IMessageRepository {
  constructor(public knex: Knex) {
  }

  async add(messageHash: string, messageItem: MessageItem) {
    ensureNotNull(messageItem.message, MessageNotFound, messageHash);
    return this.knex
      .insert({
        messageHash,
        transactionHash: messageItem.transactionHash,
        walletAddress: messageItem.walletAddress,
        state: messageItem.state,
        message: stringifySignedMessageFields(messageItem.message)
      })
      .into('messages');
  }

  async get(messageHash: string) {
    const message = await this.getMessageEntry(messageHash);
    if (!message) {
      throw new InvalidMessage(messageHash);
    }
    if (message.message) {
      message.message = bignumberifySignedMessageFields(message.message);
    }
    const signatureKeyPairs = await this.getCollectedSignatureKeyPairs(messageHash);
    const messageItem: MessageItem = message && {
      ...message,
      collectedSignatureKeyPairs: signatureKeyPairs
    };
    return messageItem;
  }

  private getMessageEntry(messageHash: string) {
    return this.knex('messages')
      .where('messageHash', messageHash)
      .columns(['transactionHash', 'error', 'walletAddress', 'message', 'state'])
      .first();
  }

  async isPresent(messageHash: string) {
    const message = await this.getMessageEntry(messageHash);
    const signatureKeyPairs = await this.knex('signature_key_pairs')
      .where('messageHash', messageHash);
    return !!message || signatureKeyPairs.length !== 0;
  }

  async remove(messageHash: string) {
    const messageItem: MessageItem = await this.get(messageHash);
    await this.knex('signature_key_pairs')
      .delete()
      .where('messageHash', messageHash);
    await this.knex('messages')
      .delete()
      .where('messageHash', messageHash);
    return messageItem;
  }

  async addSignature(messageHash: string, signature: string) {
    const key = getKeyFromHashAndSignature(messageHash, signature);
    await this.knex
      .insert({
        messageHash,
        signature,
        key
      })
      .into('signature_key_pairs');
  }

  async getCollectedSignatureKeyPairs(messageHash: string) {
    return this.knex('signature_key_pairs')
      .where('messageHash', messageHash)
      .select(['key', 'signature']);
  }

  async markAsSuccess(messageHash: string, transactionHash: string) {
    ensureProperTransactionHash(transactionHash);
    return this.knex('messages')
      .where('messageHash', messageHash)
      .update('transactionHash', transactionHash);
  }

  async markAsError(messageHash: string, error: string) {
    return this.knex('messages')
      .where('messageHash', messageHash)
      .update('error', error);
  }

  async containSignature(messageHash: string, signature: string) {
    const foundSignature = await this.knex('signature_key_pairs')
      .where('messageHash', messageHash)
      .andWhere('signature', signature)
      .first();
    return !!foundSignature;
  }

  async getMessage(messageHash: string) {
    const message = (await this.get(messageHash)).message;
    ensureNotNull(message, MessageNotFound, messageHash);
    const collectedSignatureKeyPairs = await this.getCollectedSignatureKeyPairs(messageHash);
    return getMessageWithSignatures(message, collectedSignatureKeyPairs);
  }
}

export default MessageSQLRepository;