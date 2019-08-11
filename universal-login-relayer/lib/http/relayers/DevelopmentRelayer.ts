import {utils, Contract, providers} from 'ethers';
import {waitToBeMined} from '@universal-login/commons';
import {Config} from '../../config/relayer';
import Token from './abi/Token.json';
import Relayer from './Relayer';

export declare interface DevelopmentRelayerConfig extends Config {
  tokenContractAddress: string;
}

declare interface Transaction {
  hash: string;
}

class DevelopmentRelayer extends Relayer {

  constructor(config: DevelopmentRelayerConfig, provider?: providers.Provider) {
    super(config);
    this.addHooks();
  }

  addHooks() {
    const tokenAmount = utils.parseEther('100');
    const etherAmount = utils.parseEther('100');
    this.hooks.addListener('created', async (transaction: Transaction) => {
      const provider = this.multiChainProvider.getNetworkProvider('development');
      const wallet = this.multiChainProvider.getWallet('development');
      const tokenContract = this.multiChainProvider.getTokenContract('development');
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
