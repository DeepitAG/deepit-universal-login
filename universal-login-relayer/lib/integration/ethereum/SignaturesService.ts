import {Contract, utils} from 'ethers';
import {MultiChainService} from '../../core/services/MultiChainService';
import WalletContract from '@universal-login/contracts/build/Wallet.json';


export class SignaturesService {
  constructor(private multiChainProvider: MultiChainService) {
  }

  async getRequiredSignatures(walletAddress: string, chainName: string): Promise<utils.BigNumber> {
    const wallet = this.multiChainProvider.getWallet(chainName);
    const walletContract = new Contract(walletAddress, WalletContract.interface, wallet);
    const requiredSignatures = await walletContract.requiredSignatures();
    return requiredSignatures;
  }
}
