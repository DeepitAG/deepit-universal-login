import {utils} from 'ethers';
import {waitToBeMined} from '@universal-login/commons';
import Relayer from './Relayer';
import {Config} from '../../config/relayer';
import {CallbackArgs} from './DevelopmentRelayer';

class TokenGrantingRelayer extends Relayer {

  constructor(config : Config) {
    super(config);
    this.addHooks();
  }

  addHooks() {
    this.hooks.addListener('created', async ({transaction, contractAddress, chainName} : CallbackArgs) => {
      const tokenContract = this.multiChainService.getTokenContract(chainName);
      const provider = this.multiChainService.getProvider(chainName);
      const receipt = await waitToBeMined(provider, transaction.hash as string);
      if (receipt.status) {
        tokenContract.transfer(contractAddress, utils.parseEther('100'));
      }
    });

    this.hooks.addListener('added', async ({transaction, contractAddress, chainName} : CallbackArgs) => {
      const tokenContract = this.multiChainService.getTokenContract(chainName);
      const provider = this.multiChainService.getProvider(chainName);
      const receipt = await waitToBeMined(provider, transaction.hash as string);
      if (receipt.status) {
        tokenContract.transfer(contractAddress, utils.parseEther('5'));
      }
    });

     this.hooks.addListener('keysAdded', async ({transaction, contractAddress, chainName} : CallbackArgs) => {
      const tokenContract = this.multiChainService.getTokenContract(chainName);
      const provider = this.multiChainService.getProvider(chainName);
      const receipt = await waitToBeMined(provider, transaction.hash as string);
      if (receipt.status) {
        tokenContract.transfer(contractAddress, utils.parseEther('15'));
      }
    });
  }
}

export {TokenGrantingRelayer};
