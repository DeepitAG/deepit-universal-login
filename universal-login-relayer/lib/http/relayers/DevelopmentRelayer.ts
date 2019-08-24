import {utils} from 'ethers';
import {waitToBeMined} from '@universal-login/commons';
import {Config} from '../../config/relayer';
import Relayer from './Relayer';

export declare interface DevelopmentRelayerConfig extends Config {
  tokenContractAddress: string;
}

declare interface Transaction {
  hash: string;
}

class DevelopmentRelayer extends Relayer {

  constructor(config: DevelopmentRelayerConfig) {
    super(config);
    this.addHooks();
  }

  addHooks() {
    const tokenAmount = utils.parseEther('100');
    const etherAmount = utils.parseEther('100');
    this.hooks.addListener('created', async (transaction: Transaction, chainName: string) => {
      const provider = this.multiChainService.getProvider(chainName);
      const wallet = this.multiChainService.getWallet(chainName);
      const tokenContract = this.multiChainService.getTokenContract(chainName);
      const receipt = await waitToBeMined(provider, transaction.hash);
      if (receipt.status) {
        const tokenTransaction = await tokenContract.transfer(receipt.contractAddress, tokenAmount);
        await waitToBeMined(provider, tokenTransaction.hash);
        const transaction = {
          to: receipt.contractAddress,
          value: etherAmount
        };
        await wallet.sendTransaction(transaction);
      }
    });
  }
}

export {DevelopmentRelayer};
