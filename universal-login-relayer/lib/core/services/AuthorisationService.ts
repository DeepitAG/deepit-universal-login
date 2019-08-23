import {CancelAuthorisationRequest, GetAuthorisationRequest} from '@universal-login/commons';
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

  async removeAuthorisationRequest(cancelAuthorisationRequest: CancelAuthorisationRequest, chainName: string) {
    ensureChainSupport(this.multiChainService.networkConfig, chainName);
    await this.walletMasterContractService.ensureValidCancelAuthorisationRequestSignature(cancelAuthorisationRequest, chainName);

    const {walletContractAddress, publicKey} = cancelAuthorisationRequest;
    return this.authorisationStore.removeRequest(walletContractAddress, publicKey, chainName);
  }

  async getAuthorisationRequests(getAuthorisationRequest: GetAuthorisationRequest, chainName: string) {
    ensureChainSupport(this.multiChainService.networkConfig, chainName);
    await this.walletMasterContractService.ensureValidGetAuthorisationRequestSignature(getAuthorisationRequest, chainName);

    const {walletContractAddress} = getAuthorisationRequest;
    return this.authorisationStore.getPendingAuthorisations(walletContractAddress, chainName);
  }
}

export default AuthorisationService;
