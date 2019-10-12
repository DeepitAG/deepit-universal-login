import fetch from 'node-fetch';
import {Wallet, Contract, utils} from 'ethers';
import {http, HttpFunction, PublicRelayerConfig, createKeyPair, calculateInitializeSignature, computeCounterfactualAddress, TEST_GAS_PRICE, ETHER_NATIVE_TOKEN, TEST_APPLICATION_INFO} from '@universal-login/commons';
import {encodeInitializeWithENSData} from '@universal-login/contracts';
import WalletProxyFactory from '@universal-login/contracts/build/WalletProxyFactory.json';
import ENSService from '../../lib/integration/ethereum/ensService';
import {RelayerUnderTest} from '../../lib';
import {MultiChainService} from '../../lib/core/services/MultiChainService';

export class WalletCreator {
  private http: HttpFunction;
  private ensService?: ENSService;
  private relayerConfig: PublicRelayerConfig;
  private multiChainService: MultiChainService;

  constructor(private relayer: RelayerUnderTest) {
    this.http = http(fetch)(relayer.url());
    this.relayerConfig = relayer.publicConfig;
    this.multiChainService = this.relayer.multiChainService;
  }

  private async fetchEnsService() {
    if (this.ensService) {
      return this.ensService;
    }
    this.ensService = new ENSService(this.multiChainService);
    // await this.ensService.start();
    return this.ensService;
  }

  private async getInitCode (factoryAddress: string, network: string) {
    const provider = this.multiChainService.getProvider(network);
    const factoryContract = new Contract(factoryAddress, WalletProxyFactory.interface, provider);
    return factoryContract.initCode();
  }

  private async setupInitData(publicKey: string, ensName: string, gasPrice: string, network: string) {
    const ensService = await this.fetchEnsService();
    const args = await ensService.argsFor(ensName, network) as string[];
    const initArgs = [publicKey, ...args, gasPrice, ETHER_NATIVE_TOKEN.address];
    return encodeInitializeWithENSData(initArgs);
  }

  async createFutureWallet(network: string) {
    await this.fetchEnsService();
    const {factoryAddress} = await this.relayerConfig.networkConfig[network];
    const keyPair = createKeyPair();
    const futureContractAddress = computeCounterfactualAddress(factoryAddress, keyPair.publicKey, await this.getInitCode(factoryAddress, network));
    return {contractAddress: futureContractAddress, keyPair};
  }

  private async getSignature(privateKey: string, publicKey: string, ensName: string, network: string) {
    const initData = await this.setupInitData(publicKey, ensName, TEST_GAS_PRICE, network);
    return calculateInitializeSignature(initData, privateKey);
  }

  async deployWallet(network: string, ensName: string = 'name.mylogin.eth') {
    const {contractAddress, keyPair} = await this.createFutureWallet(network);
    const wallet = this.multiChainService.getWallet(network);
    await wallet.sendTransaction({to: contractAddress, value: utils.parseEther('1.0')});
    const signature = await this.getSignature(keyPair.privateKey, keyPair.publicKey, ensName, network);
    await this.http('POST', '/wallet/deploy', {
      publicKey: keyPair.publicKey,
      ensName,
      gasPrice: TEST_GAS_PRICE,
      gasToken: ETHER_NATIVE_TOKEN.address,
      signature,
      network,
      applicationInfo: TEST_APPLICATION_INFO
    });
    return {contractAddress, keyPair};
  }
}
