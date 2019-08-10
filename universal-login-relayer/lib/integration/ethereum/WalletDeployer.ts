import {TransactionOverrides} from '@universal-login/commons';
import MultiChainProvider from '@universal-login/commons';

interface DeployFactoryArgs {
  publicKey: string;
  intializeData: string;
  signature: string;
}

export class WalletDeployer {

  constructor(private multiChainProvider: MultiChainProvider) {
  }

  deploy(deployFactoryArgs: DeployFactoryArgs, overrideOptions: TransactionOverrides, chainName: string) {
    const factoryContract = this.multiChainProvider.getFactoryContract(chainName);
    return factoryContract.createContract(deployFactoryArgs.publicKey, deployFactoryArgs.intializeData, deployFactoryArgs.signature, overrideOptions);
  }

  getInitCode(chainName: string) {
    const factoryContract = this.multiChainProvider.getFactoryContract(chainName);
    return factoryContract.initCode();
  }
}
