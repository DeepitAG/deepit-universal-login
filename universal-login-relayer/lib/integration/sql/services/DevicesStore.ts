import {Device, DeviceInfo} from '@universal-login/commons';
import Knex = require('knex');

export class DevicesStore {
  private devices: Device[] = [];
  private tableName: string = 'devices';

  constructor(public database: Knex) {
  }

  async add(contractAddress: string, publicKey: string, deviceInfo: DeviceInfo, network: string) {
    this.devices.push({contractAddress, publicKey, deviceInfo});
    return this.database(this.tableName).insert({contractAddress, publicKey, deviceInfo, network});
  }

  async get(contractAddress: string, network: string): Promise<Device[]> {
    return this.database(this.tableName)
      .where({contractAddress})
      .andWhere({network})
      .select();
  }

  async remove(contractAddress: string, publicKey: string, network: string) {
    return this.database(this.tableName)
      .where({contractAddress})
      .andWhere({publicKey})
      .andWhere({network})
      .delete();
  }
}
