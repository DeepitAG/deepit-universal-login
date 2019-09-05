import {recoverFromAuthorisationRequest, AuthorisationRequest, hashAuthorisationRequest, ensure} from '@universal-login/commons';
import { ethers, providers} from 'ethers';
import WalletMasterWithRefund from '@universal-login/contracts/build/Wallet.json';
import { UnauthorisedAddress } from '../../../core/utils/errors';
import {MultiChainService} from '../../../core/services/MultiChainService';

const MAGICVALUE = '0x20c13b0b';

class WalletMasterContractService {
  constructor(private multiChainService: MultiChainService) {}

  async ensureValidSignature(walletContractAddress: string, signature: string, payloadDigest: string, recoveredAddress: string, chainName: string) {
    const provider = this.multiChainService.getProvider(chainName);
    const contract = new ethers.Contract(walletContractAddress, WalletMasterWithRefund.interface, provider);
    const isCorrectAddress = await contract.isValidSignature(payloadDigest, signature);
    ensure(isCorrectAddress === MAGICVALUE, UnauthorisedAddress, recoveredAddress);
  }

  async ensureValidAuthorisationRequestSignature(authorisationRequest: AuthorisationRequest, chainName: string) {
    const recoveredAddress = recoverFromAuthorisationRequest(authorisationRequest);
    const {contractAddress, signature} = authorisationRequest;
    const payloadDigest = hashAuthorisationRequest(authorisationRequest);

    await this.ensureValidSignature(contractAddress, signature!, payloadDigest, recoveredAddress, chainName);
  }
}

export default WalletMasterContractService;
