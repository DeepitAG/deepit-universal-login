import {CancelAuthorisationRequest, GetAuthorisationRequest} from '@universal-login/commons';
import AuthorisationStore from '../../integration/sql/services/AuthorisationStore';
import WalletMasterContractService from '../../integration/ethereum/services/WalletMasterContractService';

class AuthorisationService {
  constructor(private authorisationStore: AuthorisationStore, private walletMasterContractService: WalletMasterContractService) {}

  addRequest(requestAuthorisation: any) {
    return this.authorisationStore.addRequest(requestAuthorisation);
  }

  async removeAuthorisationRequest(cancelAuthorisationRequest: CancelAuthorisationRequest, chainName: string) {
    await this.walletMasterContractService.ensureValidCancelAuthorisationRequestSignature(cancelAuthorisationRequest, chainName);

    const {walletContractAddress, publicKey} = cancelAuthorisationRequest;
    return this.authorisationStore.removeRequest(walletContractAddress, publicKey);
  }

  async getAuthorisationRequests(getAuthorisationRequest: GetAuthorisationRequest, chainName: string) {
    await this.walletMasterContractService.ensureValidGetAuthorisationRequestSignature(getAuthorisationRequest, chainName);

    const {walletContractAddress} = getAuthorisationRequest;
    return this.authorisationStore.getPendingAuthorisations(walletContractAddress);
  }
}

export default AuthorisationService;
