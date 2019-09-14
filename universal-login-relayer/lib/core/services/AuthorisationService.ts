import {RelayerRequest, recoverFromRelayerRequest} from '@universal-login/commons';
import AuthorisationStore, {AddAuthorisationRequest} from '../../integration/sql/services/AuthorisationStore';
import WalletMasterContractService from '../../integration/ethereum/services/WalletMasterContractService';
import {MultiChainService} from './MultiChainService';
import {ensureChainSupport} from '../../integration/ethereum/validations';

class AuthorisationService {
  constructor(private authorisationStore: AuthorisationStore, private walletMasterContractService: WalletMasterContractService, private multiChainService: MultiChainService) {}

  addRequest(requestAuthorisation: AddAuthorisationRequest, network: string) {
    return this.authorisationStore.addRequest(requestAuthorisation, network);
  }

  async cancelAuthorisationRequest(authorisationRequest: RelayerRequest, network: string) {
    const recoveredAddress = recoverFromRelayerRequest(authorisationRequest);
    return this.authorisationStore.removeRequest(authorisationRequest.contractAddress, recoveredAddress, network);
  }

  async removeAuthorisationRequests(authorisationRequest: RelayerRequest, network: string) {
    await this.walletMasterContractService.ensureValidRelayerRequestSignature(authorisationRequest, network);

    return this.authorisationStore.removeRequests(authorisationRequest.contractAddress, network);
  }

  async getAuthorisationRequests(authorisationRequest: RelayerRequest, network: string) {
    await this.walletMasterContractService.ensureValidRelayerRequestSignature(authorisationRequest, network);

    return this.authorisationStore.getPendingAuthorisations(authorisationRequest.contractAddress, network);
  }
}

export default AuthorisationService;
