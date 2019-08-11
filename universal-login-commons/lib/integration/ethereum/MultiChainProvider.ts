import {providers, Wallet, Contract} from 'ethers';
import {NetworkConfig} from '../../core/models/relayer';
import ProxyCounterfactualFactory from '@universal-login/contracts/build/ProxyCounterfactualFactory.json';
import Token from '../../contracts/Token.json';

export class MultiChainProvider {

  constructor(private config: NetworkConfig) {
  }

  getNetworkProvider(chainName: string) {
    const jsonRpcUrl = this.config[chainName].jsonRpcUrl;
    const chainSpec = this.config[chainName].chainSpec;
    const provider = new providers.JsonRpcProvider(jsonRpcUrl, chainSpec);
    return provider;
  }

  getFactoryContract(chainName: string) {
    return new Contract(this.config[chainName].factoryAddress, ProxyCounterfactualFactory.interface, this.getWallet(chainName));
  }

  getWallet(chainName: string) {
    const privateKey = this.config[chainName].privateKey;
    return new Wallet(privateKey, this.getNetworkProvider(chainName));
  }

  getRegistrars(chainName: string) {
    return this.config[chainName].ensRegistrars;
  }

  getChainSpec(chainName: string) {
    return this.config[chainName].chainSpec;
  }

  getWalletMasterAddress(chainName: string) {
    return this.config[chainName].walletMasterAddress;
  }

  getSupportedTokens(chainName: string) {
    return this.config[chainName].supportedTokens;
  }

  getContractWhiteList(chainName: string) {
    return this.config[chainName].contractWhiteList;
  }

  getTokenContract(chainName: string) {
    const tokenAddress = this.config[chainName].tokenContractAddress as string;
    const wallet = this.getWallet(chainName);
    return new Contract(tokenAddress, Token.abi, wallet);
  }
}