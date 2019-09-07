import {AuthorisationRequest, recoverFromAuthorisationRequest} from '@universal-login/commons';
import AuthorisationStore from '../../integration/sql/services/AuthorisationStore';
import WalletMasterContractService from '../../integration/ethereum/services/WalletMasterContractService';
import {MultiChainService} from './MultiChainService';
import {ensureChainSupport} from '../../integration/ethereum/validations';

class AuthorisationService {
  constructor(private authorisationStore: AuthorisationStore, private walletMasterContractService: WalletMasterContractService, private multiChainService: MultiChainService) {}

  addRequest(requestAuthorisation: any, chainName: string) {
    ensureChainSupport(this.multiChainService.networkConfig, chainName);
    return this.authorisationStore.addRequest(requestAuthorisation, chainName);
  }

  async cancelAuthorisationRequest(authorisationRequest: AuthorisationRequest, chainName: string) {
    const recoveredAddress = recoverFromAuthorisationRequest(authorisationRequest);
    return this.authorisationStore.removeRequest(authorisationRequest.contractAddress, recoveredAddress, chainName);
  }

  async removeAuthorisationRequest(authorisationRequest: AuthorisationRequest, chainName: string) {
    await this.walletMasterContractService.ensureValidAuthorisationRequestSignature(authorisationRequest, chainName);

    return this.authorisationStore.removeRequests(authorisationRequest.contractAddress, chainName);
  }

  async getAuthorisationRequests(authorisationRequest: AuthorisationRequest, chainName: string) {
    await this.walletMasterContractService.ensureValidAuthorisationRequestSignature(authorisationRequest, chainName);

    return this.authorisationStore.getPendingAuthorisations(authorisationRequest.contractAddress, chainName);
  }
}

export default AuthorisationService;
