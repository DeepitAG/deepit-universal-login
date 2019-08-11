import {utils, Contract, providers} from 'ethers';
import {waitToBeMined} from '@universal-login/commons';
import Token from './abi/Token.json';
import Relayer from './Relayer';
import {Config} from '../../config/relayer';

interface TokenGrantingRelayerCongig extends Config {
  tokenContractAddress : string;
}

class TokenGrantingRelayer extends Relayer {
  private readonly tokenContractAddress : string;

  constructor(config : TokenGrantingRelayerCongig, provider? : providers.Provider) {
    super(config);
    this.tokenContractAddress = config.tokenContractAddress;
    this.addHooks();
  }

  addHooks() {
    this.hooks.addListener('created', async (transaction : utils.Transaction, chainName: string) => {
      const tokenContract = this.multiChainProvider.getTokenContract(chainName);
      const provider = this.multiChainProvider.getNetworkProvider(chainName);
      const receipt = await waitToBeMined(provider, transaction.hash as string);
      if (receipt.status) {
        tokenContract.transfer(receipt.contractAddress, utils.parseEther('100'));
      }
    });

    this.hooks.addListener('added', async (transaction : utils.Transaction, chainName: string) => {
      const tokenContract = this.multiChainProvider.getTokenContract(chainName);
      const provider = this.multiChainProvider.getNetworkProvider(chainName);
      const receipt = await waitToBeMined(provider, transaction.hash as string);
      if (receipt.status) {
        tokenContract.transfer(transaction.to, utils.parseEther('5'));
      }
    });

     this.hooks.addListener('keysAdded', async (transaction : utils.Transaction, chainName: string) => {
      const tokenContract = this.multiChainProvider.getTokenContract(chainName);
      const provider = this.multiChainProvider.getNetworkProvider(chainName);
      const receipt = await waitToBeMined(provider, transaction.hash as string);
      if (receipt.status) {
        tokenContract.transfer(transaction.to, utils.parseEther('15'));
      }
    });
  }
}

export {TokenGrantingRelayer};
