import Knex from 'knex';

export interface AuthorisationRequest {
  walletContractAddress: string;
  key: string;
  deviceInfo: object;
}

class AuthorisationStore {
  constructor(private database : Knex) {}

  addRequest(request: AuthorisationRequest, chainName: string) {
    const {walletContractAddress, key, deviceInfo} = request;
    return this.database.insert({walletContractAddress: walletContractAddress.toLowerCase(), key: key.toLowerCase(), deviceInfo, chainName})
      .into('authorisations')
      .returning('id');
  }

  getPendingAuthorisations(walletContractAddress: string, chainName: string) {
    return this.database('authorisations')
      .where({walletContractAddress: walletContractAddress.toLowerCase(), chainName})
      .select();
  }

  removeRequest(walletContractAddress: string, publicKey: string, chainName: string) {
    return this.database('authorisations')
      .where('walletContractAddress', walletContractAddress.toLowerCase())
      .where('key', publicKey.toLocaleLowerCase())
      .where('chainName', chainName)
      .del();
  }
}

export default AuthorisationStore;