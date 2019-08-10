import {providers, Contract, utils} from 'ethers';
import IERC20 from 'openzeppelin-solidity/build/contracts/IERC20.json';
import {ETHER_NATIVE_TOKEN} from '../../core/constants/constants';
import {MultiChainProvider} from './MultiChainProvider';

export class BalanceChecker {
  constructor(private multChainProvider: MultiChainProvider) {}

  getBalance(walletAddress: string, tokenAddress: string, chainName: string) {
    if (tokenAddress === ETHER_NATIVE_TOKEN.address) {
      return this.getEthBalance(walletAddress, chainName);
    }
    return this.getTokenBalance(walletAddress, tokenAddress, chainName);
  }

  private getEthBalance(walletAddress: string, chainName: string) {
    const provider = this.multChainProvider.getNetworkProvider(chainName);
    return provider.getBalance(walletAddress);
  }

  private getTokenBalance(walletAddress: string, tokenAddress: string, chainName: string): Promise<utils.BigNumber> {
    const provider = this.multChainProvider.getNetworkProvider(chainName);
    const token = new Contract(tokenAddress, IERC20.abi, provider);
    return token.balanceOf(walletAddress);
  }
}
