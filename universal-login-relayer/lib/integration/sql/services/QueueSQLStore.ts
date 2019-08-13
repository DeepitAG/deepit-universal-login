import Knex from 'knex';
import {SignedMessage, calculateMessageHash} from '@universal-login/commons';
import {IQueueStore} from '../../../core/services/messages/IQueueStore';

export default class QueueSQLStore implements IQueueStore {
  public tableName: string;

  constructor(public database: Knex) {
    this.tableName = 'queue_items';
  }

  async add(signedMessage: SignedMessage, chainName: string) {
    const messageHash = calculateMessageHash(signedMessage);
    await this.database
      .insert({
        hash: messageHash,
        type: 'Mesasge',
        created_at: this.database.fn.now(),
        chain: chainName
      })
      .into(this.tableName);
    return messageHash;
  }

  async getNext() {
    const hash = await this.database(this.tableName)
      .first()
      .orderBy('created_at', 'asc')
      .column('hash', 'type')
      .select();
    const chainName = await this.database(this.tableName)
      .first()
      .orderBy('created_at', 'asc')
      .column('chain', 'type')
      .select();
    let next;
    hash && chainName? next = {hash: hash.hash, chainName: chainName.chainName}: undefined;
    return next;
  }

  async remove(hash: string) {
    return this.database(this.tableName)
      .where('hash', hash)
      .delete();
  }
}
