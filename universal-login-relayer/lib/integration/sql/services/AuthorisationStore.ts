import Knex from 'knex';

export interface AddAuthorisationRequest {
  walletContractAddress: string;
  key: string;
  deviceInfo: object;
}

class AuthorisationStore {
  constructor(private database: Knex) {}

  addRequest(request: AddAuthorisationRequest, network: string) {
    const {walletContractAddress, key, deviceInfo} = request;
    return this.database.insert({walletContractAddress, key, deviceInfo, network})
      .into('authorisations')
      .returning('id');
  }

  getPendingAuthorisations(walletContractAddress: string, network: string) {
    return this.database('authorisations')
      .where({walletContractAddress, network})
      .select();
  }

  get(contractAddress: string, key: string) {
    return this.database('authorisations')
      .where({
        walletContractAddress: contractAddress,
        key
      })
      .select('key', 'walletContractAddress', 'deviceInfo')
      .first();
  }

  async removeRequest(contractAddress: string, key: string, network: string): Promise<number> {
    return this.database('authorisations')
      .where('walletContractAddress', contractAddress)
      .where('key', key)
      .where('network', network)
      .del();
  }

  removeRequests(contractAddress: string, network: string) {
    return this.database('authorisations')
      .where('walletContractAddress', contractAddress)
      .where('network', network)
      .del();
  }
}

export default AuthorisationStore;
