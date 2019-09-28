import Knex from 'knex';
import {SignedMessage, calculateMessageHash} from '@universal-login/commons';
import {IExecutionQueue} from '../../../core/services/messages/IExecutionQueue';
import Deployment from '../../../core/models/Deployment';

export default class QueueSQLStore implements IExecutionQueue {
  public tableName: string;

  constructor(public database: Knex) {
    this.tableName = 'queue_items';
  }

  async addMessage(signedMessage: SignedMessage, network: string) {
    const messageHash = calculateMessageHash(signedMessage);
    await this.database
      .insert({
        hash: messageHash,
        type: 'Message',
        created_at: this.database.fn.now(),
        network
      })
      .into(this.tableName);
    return messageHash;
  }

  async addDeployment(deployment: Deployment) {
    await this.database
      .insert({
        hash: deployment.hash,
        type: 'Deployment',
        created_at: this.database.fn.now(),
        network: deployment.network
      })
      .into(this.tableName);
    return deployment.hash;
  }

  async getNext() {
    const next = await this.database(this.tableName)
      .first()
      .orderBy('created_at', 'asc')
      .column('hash', 'type')
      .column('network', 'type')
      .select();
    return next;
  }

  async remove(hash: string, network: string) {
    return this.database(this.tableName)
      .where('hash', hash)
      .where('network', network)
      .delete();
  }
}
