import {CancelAuthorisationRequest, GetAuthorisationRequest, http, HttpFunction} from '@universal-login/commons';
import {fetch} from './fetch';

export class RelayerApi {
  private http: HttpFunction;
  private chainName = 'default';

  constructor(relayerUrl: string) {
    this.http = http(fetch)(relayerUrl);
  }

  async getConfig() {
    return this.http('GET', '/config');
  }

  async execute(message: any) {
    return this.http('POST', '/wallet/execution', {signedMessage: message, chainName: this.chainName})
      .catch((e: any) => {
        // TODO: Maybe wrap this as a custom Error?
        throw new Error(e !== undefined && e.error);
      });
  }

  async getStatus(messageHash: string) {
    return this.http('GET', `/wallet/execution/${this.chainName}/${messageHash}`);
  }

  async connect(walletContractAddress: string, key: string) {
    return this.http('POST', '/authorisation', {
      walletContractAddress,
      key,
      chainName: this.chainName,
    });
  }

  async denyConnection(cancelAuthorisationRequest: CancelAuthorisationRequest) {
    const {walletContractAddress} = cancelAuthorisationRequest;
    return this.http('POST', `/authorisation/${walletContractAddress}`, {
      cancelAuthorisationRequest,
      chainName: this.chainName
    }).catch((e: any) => {
      throw new Error(e.error);
    });
  }

  async getPendingAuthorisations(getAuthorisationRequest: GetAuthorisationRequest) {
    const {walletContractAddress, signature} = getAuthorisationRequest;
    return this.http('GET', `/authorisation/${this.chainName}/${walletContractAddress}?signature=${signature}`);
  }

  async deploy(publicKey: string, ensName: string, gasPrice: string, signature: string) {
    return this.http('POST', '/wallet/deploy', {
      publicKey,
      ensName,
      gasPrice,
      signature,
      chainName: this.chainName,
    });
  }
}
