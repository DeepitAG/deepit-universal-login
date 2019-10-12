import Knex from 'knex';
import {stringifySignedMessageFields, bignumberifySignedMessageFields, ensureNotNull, getMessageWithSignatures} from '@universal-login/commons';
import {getKeyFromHashAndSignature} from '../../../core/utils/encodeData';
import IMessageRepository from '../../../core/services/messages/IMessagesRepository';
import {InvalidMessage, MessageNotFound} from '../../../core/utils/errors';
import MessageItem from '../../../core/models/messages/MessageItem';
import SQLRepository from './SQLRepository';
import console = require('console');

export class MessageSQLRepository extends SQLRepository<MessageItem> implements IMessageRepository {
  constructor(public knex: Knex) {
    super(knex, 'messages');
  }

  // Override
  async add(messageHash: string, messageItem: MessageItem) {
    ensureNotNull(messageItem.message, MessageNotFound, messageHash);
    await super.add(messageHash, {
        transactionHash: messageItem.transactionHash,
        walletAddress: messageItem.walletAddress,
        state: 'AwaitSignature',
        message: stringifySignedMessageFields(messageItem.message),
        error: null,
        network: messageItem.network} as MessageItem);
  }

  async get(hash: string, network: string) {
    const message = await this.getMessageEntry(hash, network);
    if (!message) {
      throw new InvalidMessage(hash);
    }
    if (message.message) {
      message.message = bignumberifySignedMessageFields(message.message);
    }
    const signatureKeyPairs = await this.getCollectedSignatureKeyPairs(hash, network);
    const messageItem: MessageItem = message && {
      ...message,
      collectedSignatureKeyPairs: signatureKeyPairs
    };
    return messageItem as MessageItem;
  }

  private async getMessageEntry(messageHash: string, network: string) {
    return this.knex(this.tableName)
      .where('hash', messageHash)
      .columns(['transactionHash', 'error', 'walletAddress', 'message', 'state', 'network'])
      .first();
  }

  // Override
  async isPresent(messageHash: string, network: string) {
    const message = await this.getMessageEntry(messageHash, network);
    const signatureKeyPairs = await this.knex('signature_key_pairs')
      .where('messageHash', messageHash)
      .andWhere('network', network);
    return !!message || signatureKeyPairs.length !== 0;
  }

  // Override
  async remove(messageHash: string, network: string) {
    const messageItem: MessageItem = await this.get(messageHash, network);
    await this.knex('signature_key_pairs')
      .delete()
      .where('messageHash', messageHash);
    await super.remove(messageHash, network);
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
