import Knex from 'knex';
import {NotFound} from '../../../core/utils/errors';
import IRepository from '../../../core/services/messages/IRepository';

export class SQLRepository<T> implements IRepository<T> {
  constructor(public knex: Knex, protected tableName: string) {
  }

  async add(hash: string, item: T) {
    return this.knex
      .insert({
        hash,
        ...item
      })
      .into(this.tableName);
  }

  async get(hash: string, network: string) {
    const item = await this.knex(this.tableName)
      .where('hash', hash)
      .where('network', network)
      .first();

    if (!item) {
      throw new NotFound(hash, 'NotFound');
    }
    return item;
  }

  async isPresent(hash: string, network: string) {
    const item = await this.knex(this.tableName)
      .where('hash', hash)
      .where('network', network)
      .first();

    return !!item;
  }

  async remove(hash: string, network: string) {
    const item = await this.get(hash, network);
    await this.knex(this.tableName)
      .delete()
      .where('hash', hash)
      .andWhere('network', network);
    return item;
  }
}

export default SQLRepository;
