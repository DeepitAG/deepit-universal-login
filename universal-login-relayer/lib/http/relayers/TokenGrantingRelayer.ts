import {utils} from 'ethers';
import {waitToBeMined} from '@universal-login/commons';
import Relayer from './Relayer';
import {Config} from '../../config/relayer';

class TokenGrantingRelayer extends Relayer {

  constructor(config : Config) {
    super(config);
    this.addHooks();
  }

  addHooks() {
    this.hooks.addListener('created', async (transaction : utils.Transaction, chainName: string) => {
      const tokenContract = this.multiChainService.getTokenContract(chainName);
      const provider = this.multiChainService.getProvider(chainName);
      const receipt = await waitToBeMined(provider, transaction.hash as string);
      if (receipt.status) {
        tokenContract.transfer(receipt.contractAddress, utils.parseEther('100'));
      }
    });

    this.hooks.addListener('added', async (transaction : utils.Transaction, chainName: string) => {
      const tokenContract = this.multiChainService.getTokenContract(chainName);
      const provider = this.multiChainService.getProvider(chainName);
      const receipt = await waitToBeMined(provider, transaction.hash as string);
      if (receipt.status) {
        tokenContract.transfer(transaction.to, utils.parseEther('5'));
      }
    });

    this.hooks.addListener('keysAdded', async (transaction : utils.Transaction, chainName: string) => {
      const tokenContract = this.multiChainService.getTokenContract(chainName);
      const provider = this.multiChainService.getProvider(chainName);
      const receipt = await waitToBeMined(provider, transaction.hash as string);
      if (receipt.status) {
        tokenContract.transfer(transaction.to, utils.parseEther('15'));
      }
    });
  }
}

export {TokenGrantingRelayer};
