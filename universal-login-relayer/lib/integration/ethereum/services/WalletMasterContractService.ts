import {recoverFromCancelAuthorisationRequest, recoverFromGetAuthorisationRequest, GetAuthorisationRequest, hashGetAuthorisationRequest, CancelAuthorisationRequest, hashCancelAuthorisationRequest, ensure} from '@universal-login/commons';
import {Contract} from 'ethers';
import WalletMasterWithRefund from '@universal-login/contracts/build/WalletMasterWithRefund.json';
import { UnauthorisedAddress } from '../../../core/utils/errors';
import {MultiChainService} from '../../../core/services/MultiChainService';

const MAGICVALUE = '0x20c13b0b';

class WalletMasterContractService {
  constructor(private multiChainService: MultiChainService) {}

  async ensureValidSignature(walletContractAddress: string, signature: string, payloadDigest: string, recoveredAddress: string, chainName: string) {
    const provider = this.multiChainService.getProvider(chainName);
    const contract = new Contract(walletContractAddress, WalletMasterWithRefund.interface, provider);
    const isCorrectAddress = await contract.isValidSignature(payloadDigest, signature);
    ensure(isCorrectAddress === MAGICVALUE, UnauthorisedAddress, recoveredAddress);
  }

  async ensureValidCancelAuthorisationRequestSignature(cancelAuthorisationRequest: CancelAuthorisationRequest, chainName: string) {
    const recoveredAddress = recoverFromCancelAuthorisationRequest(cancelAuthorisationRequest);
    const {walletContractAddress, signature} = cancelAuthorisationRequest;
    const payloadDigest = hashCancelAuthorisationRequest(cancelAuthorisationRequest);

    await this.ensureValidSignature(walletContractAddress, signature!, payloadDigest, recoveredAddress, chainName);
  }

  async ensureValidGetAuthorisationRequestSignature(getAuthorisationRequest: GetAuthorisationRequest, chainName: string) {
    const recoveredAddress = recoverFromGetAuthorisationRequest(getAuthorisationRequest);
    const {walletContractAddress, signature} = getAuthorisationRequest;
    const payloadDigest = hashGetAuthorisationRequest(getAuthorisationRequest);

    await this.ensureValidSignature(walletContractAddress, signature!, payloadDigest, recoveredAddress, chainName);
  }
}

export default WalletMasterContractService;
