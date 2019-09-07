import {AuthorisationRequest, recoverFromAuthorisationRequest} from '@universal-login/commons';
import AuthorisationStore from '../../integration/sql/services/AuthorisationStore';
import WalletMasterContractService from '../../integration/ethereum/services/WalletMasterContractService';
import {MultiChainService} from './MultiChainService';
import {ensureChainSupport} from '../../integration/ethereum/validations';

class AuthorisationService {
  constructor(private authorisationStore: AuthorisationStore, private walletMasterContractService: WalletMasterContractService, private multiChainService: MultiChainService) {}

  addRequest(requestAuthorisation: any, network: string) {
    ensureChainSupport(this.multiChainService.networkConfig, network);
    return this.authorisationStore.addRequest(requestAuthorisation, network);
  }

  async cancelAuthorisationRequest(authorisationRequest: AuthorisationRequest, network: string) {
    const recoveredAddress = recoverFromAuthorisationRequest(authorisationRequest);
    return this.authorisationStore.removeRequest(authorisationRequest.contractAddress, recoveredAddress, network);
  }

  async removeAuthorisationRequest(authorisationRequest: AuthorisationRequest, network: string) {
    await this.walletMasterContractService.ensureValidAuthorisationRequestSignature(authorisationRequest, network);

    return this.authorisationStore.removeRequests(authorisationRequest.contractAddress, network);
  }

  async getAuthorisationRequests(authorisationRequest: AuthorisationRequest, network: string) {
    await this.walletMasterContractService.ensureValidAuthorisationRequestSignature(authorisationRequest, network);

    return this.authorisationStore.getPendingAuthorisations(authorisationRequest.contractAddress, network);
  }
}

export default AuthorisationService;
