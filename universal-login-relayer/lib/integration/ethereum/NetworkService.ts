import {providers, Contract} from 'ethers';
import ProxyCounterfactualFactory from '@universal-login/contracts/build/ProxyCounterfactualFactory.json';
import {Config} from '../../config/relayer';

class NetworkService {

  constructor(private config: Config) {
  }

  getNetworkProvider(network: string) {
    const uri = this.config.networks[network].uri;
    const chainSpec = this.config.networks[network].chainSpec;
    const provider = new providers.JsonRpcProvider(uri, chainSpec);
    return provider;
  }

  getNetworkConterfactualFactory(network: string) {
    const factoryAddress = this.config.networks[network].factoryAddress;
    const provider = this.getNetworkProvider(network);
    const counterfactualFactory = new Contract(factoryAddress ,ProxyCounterfactualFactory.abi, provider);
    return counterfactualFactory;
  }
}

export default NetworkService;
