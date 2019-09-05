import Knex from 'knex';

export interface AddAuthorisationRequest {
  walletContractAddress: string;
  key: string;
  deviceInfo: object;
}

class AuthorisationStore {
  constructor(private database : Knex) {}

  addRequest(request: AddAuthorisationRequest, chainName: string) {
    const {walletContractAddress, key, deviceInfo} = request;
    return this.database.insert({walletContractAddress, key, deviceInfo, chainName})
      .into('authorisations')
      .returning('id');
  }

  getPendingAuthorisations(walletContractAddress: string, chainName: string) {
    return this.database('authorisations')
      .where({walletContractAddress, chainName})
      .select();
  }

  removeRequest(contractAddress: string, key: string, chainName: string) {
    return this.database('authorisations')
      .where('walletContractAddress', contractAddress)
      .where('key', key)
      .where('chainName', chainName)
      .del();
  }

  removeRequests(contractAddress: string, chainName: string) {
    return this.database('authorisations')
      .where('walletContractAddress', contractAddress)
      .where('chainName', chainName)
      .del();
  }
}

export default AuthorisationStore;
