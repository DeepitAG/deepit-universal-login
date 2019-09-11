import {recoverFromRelayerRequest, RelayerRequest, hashRelayerRequest, ensure} from '@universal-login/commons';
import { ethers, providers} from 'ethers';
import WalletMasterWithRefund from '@universal-login/contracts/build/Wallet.json';
import { UnauthorisedAddress } from '../../../core/utils/errors';
import {MultiChainService} from '../../../core/services/MultiChainService';

const MAGICVALUE = '0x20c13b0b';

class WalletMasterContractService {
  constructor(private multiChainService: MultiChainService) {}

  async ensureValidSignature(walletContractAddress: string, signature: string, payloadDigest: string, recoveredAddress: string, network: string) {
    const provider = this.multiChainService.getProvider(network);
    const contract = new ethers.Contract(walletContractAddress, WalletMasterWithRefund.interface, provider);
    const isCorrectAddress = await contract.isValidSignature(payloadDigest, signature);
    ensure(isCorrectAddress === MAGICVALUE, UnauthorisedAddress, recoveredAddress);
  }

  async ensureValidAuthorisationRequestSignature(authorisationRequest: RelayerRequest, network: string) {
    const recoveredAddress = recoverFromRelayerRequest(authorisationRequest);
    const {contractAddress, signature} = authorisationRequest;
    const payloadDigest = hashRelayerRequest(authorisationRequest);

    await this.ensureValidSignature(contractAddress, signature!, payloadDigest, recoveredAddress, network);
  }
}

export default WalletMasterContractService;
