import {providers} from 'ethers';
import {NetworkConfig} from '@universal-login/commons';

class NetworkService {

  constructor(private config: NetworkConfig) {
  }

  getNetworkProvider(network: string) {
    const jsonRpcUrl = this.config[network].jsonRpcUrl;
    const chainSpec = this.config[network].chainSpec;
    const provider = new providers.JsonRpcProvider(jsonRpcUrl, chainSpec);
    return provider;
  }

  getNetworkConterfactualFactory(network: string) {
    return this.config[network].factoryAddress;
  }
}

export default NetworkService;
