import {Contract, providers} from 'ethers';
import ProxyCounterfactualFactory from '@universal-login/contracts/build/ProxyCounterfactualFactory.json';
import {computeContractAddress, createKeyPair} from '@universal-login/commons';
import {Provider} from 'ethers/providers';


export class BlockchainService {
  constructor(){
  }

  getCode(contractAddress: string, provider: Provider) {
    return provider.getCode(contractAddress);
  }

  getBlockNumber(provider: Provider) {
    return provider.getBlockNumber();
  }

  getLogs(filter: providers.Filter, provider: Provider) {
    return provider.getLogs(filter);
  }

  getInitCode = async (factoryAddress: string, provider: Provider) => {
    const factoryContract = new Contract(factoryAddress, ProxyCounterfactualFactory.interface, provider);
    return factoryContract.initCode();
  }

  createFutureWallet = async (factoryAddress: string, provider: Provider) => {
    const {privateKey, publicKey} = createKeyPair();
    const futureContractAddress = computeContractAddress(factoryAddress, publicKey, await this.getInitCode(factoryAddress, provider));
    return [privateKey, futureContractAddress, publicKey];
  }
}

