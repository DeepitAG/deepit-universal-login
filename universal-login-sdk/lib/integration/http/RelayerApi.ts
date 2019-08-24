import {CancelAuthorisationRequest, GetAuthorisationRequest, http, HttpFunction} from '@universal-login/commons';
import {fetch} from './fetch';

export class RelayerApi {
  private http: HttpFunction;
  constructor(relayerUrl: string) {
    this.http = http(fetch)(relayerUrl);
  }

  async createWallet(managementKey: string, ensName: string, chainName: string) {
    return this.http('POST', '/wallet', {
      managementKey,
      ensName,
      chainName
    }).catch((e: any) => {
      // TODO: Maybe wrap this as a custom Error?
      throw new Error(e !== undefined && e.error);
    });
  }

  async getConfig() {
    return this.http('GET', '/config');
  }

  async execute(signedMessage: any, chainName: string) {
    return this.http('POST', '/wallet/execution', {signedMessage, chainName})
      .catch((e: any) => {
        // TODO: Maybe wrap this as a custom Error?
        throw new Error(e !== undefined && e.error);
      });
  }

  async getStatus(messageHash: string, chainName: string) {
    return this.http('GET', `/wallet/execution/${chainName}/${messageHash}`);
  }

  async connect(walletContractAddress: string, key: string, chainName: string) {
    return this.http('POST', '/authorisation', {
      walletContractAddress,
      key,
      chainName
    });
  }

  async denyConnection(cancelAuthorisationRequest: CancelAuthorisationRequest, chainName: string) {
    const {walletContractAddress} = cancelAuthorisationRequest;
    return this.http('POST', `/authorisation/${walletContractAddress}`, {
      cancelAuthorisationRequest,
      chainName
    }).catch((e: any) => {
      throw new Error(e.error);
    });
  }

  async getPendingAuthorisations(getAuthorisationRequest: GetAuthorisationRequest, chainName: string) {
    const {walletContractAddress, signature} = getAuthorisationRequest;
    return this.http('GET', `/authorisation/${chainName}/${walletContractAddress}?signature=${signature}`);
  }

  async deploy(publicKey: string, ensName: string, gasPrice: string, signature: string, chainName: string) {
    return this.http('POST', '/wallet/deploy', {
      publicKey,
      ensName,
      gasPrice,
      signature,
      chainName
    });
  }
}
