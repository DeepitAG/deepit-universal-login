import {Contract, utils} from 'ethers';
import {MultiChainProvider} from './MultiChainProvider';
import WalletContract from '@universal-login/contracts/build/WalletMaster.json';


export class SignaturesService {
  constructor(private multiChainProvider: MultiChainProvider) {
  }

  async getRequiredSignatures(walletAddress: string, chainName: string): Promise<utils.BigNumber> {
    const wallet = this.multiChainProvider.getWallet(chainName);
    const walletContract = new Contract(walletAddress, WalletContract.interface, wallet);
    const requiredSignatures = await walletContract.requiredSignatures();
    return requiredSignatures;
  }
}
