import {providers, Wallet, Contract} from 'ethers';
import {NetworkConfig} from '@universal-login/commons';
import ProxyCounterfactualFactory from '@universal-login/contracts/build/ProxyCounterfactualFactory.json';
import Token from '@universal-login/commons/lib/contracts/Token.json';
import {ensureChainSupport} from '../../integration/ethereum/validations';

export class MultiChainService {

  constructor(public networkConfig: NetworkConfig) {
  }

  getNetworkProvider(chainName: string) {
    ensureChainSupport(this.networkConfig, chainName);
    if (!this.networkConfig[chainName].provider) {
      const jsonRpcUrl = this.networkConfig[chainName].jsonRpcUrl;
      const chainSpec = this.networkConfig[chainName].chainSpec;
      this.networkConfig[chainName].provider = new providers.JsonRpcProvider(jsonRpcUrl, chainSpec);
    }
    return this.networkConfig[chainName].provider as any;
  }

  getFactoryContract(chainName: string) {
    ensureChainSupport(this.networkConfig, chainName);
    return new Contract(this.networkConfig[chainName].factoryAddress, ProxyCounterfactualFactory.interface, this.getWallet(chainName));
  }

  getWallet(chainName: string) {
    ensureChainSupport(this.networkConfig, chainName);
    const privateKey = this.networkConfig[chainName].privateKey;
    return new Wallet(privateKey, this.getNetworkProvider(chainName));
  }

  getRegistrars(chainName: string) {
    ensureChainSupport(this.networkConfig, chainName);
    return this.networkConfig[chainName].ensRegistrars;
  }

  getChainSpec(chainName: string) {
    ensureChainSupport(this.networkConfig, chainName);
    return this.networkConfig[chainName].chainSpec;
  }

  getWalletMasterAddress(chainName: string) {
    ensureChainSupport(this.networkConfig, chainName);
    return this.networkConfig[chainName].walletMasterAddress;
  }

  getSupportedTokens(chainName: string) {
    ensureChainSupport(this.networkConfig, chainName);
    return this.networkConfig[chainName].supportedTokens;
  }

  getContractWhiteList(chainName: string) {
    ensureChainSupport(this.networkConfig, chainName);
    return this.networkConfig[chainName].contractWhiteList;
  }

  getTokenContract(chainName: string) {
    ensureChainSupport(this.networkConfig, chainName);
    const tokenAddress = this.networkConfig[chainName].tokenContractAddress as string;
    const wallet = this.getWallet(chainName);
    return new Contract(tokenAddress, Token.abi, wallet);
  }
}
