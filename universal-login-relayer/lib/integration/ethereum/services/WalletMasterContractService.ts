import {recoverFromRelayerRequest, RelayerRequest, hashRelayerRequest, ensure} from '@universal-login/commons';
import { ethers, providers} from 'ethers';
import WalletMasterWithRefund from '@universal-login/contracts/build/Wallet.json';
import { UnauthorisedAddress } from '../../../core/utils/errors';
import {MultiChainService} from '../../../core/services/MultiChainService';

const MAGICVALUE = '0x20c13b0b';

class WalletMasterContractService {
  constructor(private multiChainService: MultiChainService) {}

  private async ensureValidSignature(walletContractAddress: string, signature: string, payloadDigest: string, recoveredAddress: string, network: string) {
    const provider = this.multiChainService.getProvider(network);
    const contract = new ethers.Contract(walletContractAddress, WalletMasterWithRefund.interface, provider);
    const isCorrectAddress = await contract.isValidSignature(payloadDigest, signature);
    ensure(isCorrectAddress === MAGICVALUE, UnauthorisedAddress, recoveredAddress);
  }

  async ensureValidAuthorisationRequestSignature(relayerRequest: RelayerRequest, network: string) {
    const recoveredAddress = recoverFromRelayerRequest(relayerRequest);
    const {contractAddress, signature} = relayerRequest;
    const payloadDigest = hashRelayerRequest(relayerRequest);

    await this.ensureValidSignature(contractAddress, signature!, payloadDigest, recoveredAddress, network);
  }
}

export default WalletMasterContractService;
