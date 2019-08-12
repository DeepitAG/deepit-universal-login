import {Contract, providers} from 'ethers';
import ProxyCounterfactualFactory from '@universal-login/contracts/build/ProxyCounterfactualFactory.json';
import {computeContractAddress, createKeyPair} from '@universal-login/commons';
import {ProvidersRecord} from '../../config/ProvidersRecord';


export class BlockchainService {
  constructor(private providersRecord: ProvidersRecord){
  }

  getCode(contractAddress: string, chainName: string) {
    const provider = this.providersRecord[chainName];
    return provider.getCode(contractAddress);
  }

  getBlockNumber(chainName: string) {
    const provider = this.providersRecord[chainName];
    return provider.getBlockNumber();
  }

  getLogs(filter: providers.Filter, chainName: string) {
    const provider = this.providersRecord[chainName];
    return provider.getLogs(filter);
  }

  getInitCode = async (factoryAddress: string, chainName: string) => {
    const provider = this.providersRecord[chainName];
    const factoryContract = new Contract(factoryAddress, ProxyCounterfactualFactory.interface, provider);
    return factoryContract.initCode();
  }

  createFutureWallet = async (factoryAddress: string, chainName: string) => {
    const {privateKey, publicKey} = createKeyPair();
    const futureContractAddress = computeContractAddress(factoryAddress, publicKey, await this.getInitCode(factoryAddress, chainName));
    return [privateKey, futureContractAddress, publicKey];
  }
}

