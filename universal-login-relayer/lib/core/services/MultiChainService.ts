import {providers, Wallet, Contract} from 'ethers';
import {NetworkConfig} from '@universal-login/commons';
import WalletProxyFactory from '@universal-login/contracts/build/WalletProxyFactory.json';
import Token from '@universal-login/commons/lib/contracts/Token.json';
import {ensureChainSupport} from '../../integration/ethereum/validations';

export class MultiChainService {

  constructor(public networkConfig: NetworkConfig) {
  }

  getProvider(network: string) {
    ensureChainSupport(this.networkConfig, network);
    if (!this.networkConfig[network].provider) {
      const jsonRpcUrl = this.networkConfig[network].jsonRpcUrl;
      const chainSpec = this.networkConfig[network].chainSpec;
      this.networkConfig[network].provider = new providers.JsonRpcProvider(jsonRpcUrl, chainSpec);
    }
    return this.networkConfig[network].provider as any;
  }

  getFactoryContract(network: string) {
    ensureChainSupport(this.networkConfig, network);
    return new Contract(this.networkConfig[network].factoryAddress, WalletProxyFactory.interface, this.getWallet(network));
  }

  getWallet(network: string) {
    ensureChainSupport(this.networkConfig, network);
    const privateKey = this.networkConfig[network].privateKey;
    return new Wallet(privateKey, this.getProvider(network));
  }

  getRegistrars(network: string) {
    ensureChainSupport(this.networkConfig, network);
    return this.networkConfig[network].ensRegistrars;
  }

  getChainSpec(network: string) {
    ensureChainSupport(this.networkConfig, network);
    return this.networkConfig[network].chainSpec;
  }

  getWalletContractAddress(network: string) {
    ensureChainSupport(this.networkConfig, network);
    return this.networkConfig[network].walletContractAddress;
  }

  getSupportedTokens(network: string) {
    ensureChainSupport(this.networkConfig, network);
    return this.networkConfig[network].supportedTokens;
  }

  getContractWhiteList(network: string) {
    ensureChainSupport(this.networkConfig, network);
    return this.networkConfig[network].contractWhiteList;
  }

  getTokenContract(network: string) {
    ensureChainSupport(this.networkConfig, network);
    const tokenAddress = this.networkConfig[network].tokenContractAddress as string;
    const wallet = this.getWallet(network);
    return new Contract(tokenAddress, Token.abi, wallet);
  }
}
