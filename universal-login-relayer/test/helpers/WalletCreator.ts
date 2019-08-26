import fetch from 'node-fetch';
import {Wallet, Contract, utils} from 'ethers';
import {http, HttpFunction, PublicRelayerConfig, createKeyPair, calculateInitializeSignature, computeContractAddress, TEST_GAS_PRICE} from '@universal-login/commons';
import {encodeInitializeWithRefundData} from '@universal-login/contracts';
import ProxyCounterfactualFactory from '@universal-login/contracts/build/ProxyCounterfactualFactory.json';
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

  private async getInitCode (factoryAddress: string, chainName: string) {
    const provider = this.multiChainService.getProvider(chainName);
    const factoryContract = new Contract(factoryAddress, ProxyCounterfactualFactory.interface, provider);
    return factoryContract.initCode();
  }

  private async setupInitData(publicKey: string, ensName: string, gasPrice: string, chainName: string) {
    const ensService = await this.fetchEnsService();
    const args = await ensService.argsFor(ensName, chainName) as string[];
    const initArgs = [publicKey, ...args, gasPrice];
    return encodeInitializeWithRefundData(initArgs);
  }

  async createFutureWallet(chainName: string) {
    await this.fetchEnsService();
    const {factoryAddress} = await this.relayerConfig.networkConfig[chainName];
    const keyPair = createKeyPair();
    const futureContractAddress = computeContractAddress(factoryAddress, keyPair.publicKey, await this.getInitCode(factoryAddress, chainName));
    return {contractAddress: futureContractAddress, keyPair};
  }

  private async getSignature(privateKey: string, publicKey: string, ensName: string, chainName: string) {
    const initData = await this.setupInitData(publicKey, ensName, TEST_GAS_PRICE, chainName);
    return calculateInitializeSignature(initData, privateKey);
  }

  async deployWallet(chainName: string, ensName: string = 'name.mylogin.eth') {
    const {contractAddress, keyPair} = await this.createFutureWallet(chainName);
    const wallet = this.multiChainService.getWallet(chainName);
    await wallet.sendTransaction({to: contractAddress, value: utils.parseEther('1.0')});
    const signature = await this.getSignature(keyPair.privateKey, keyPair.publicKey, ensName, chainName);
    await this.http('POST', '/wallet/deploy', {
      publicKey: keyPair.publicKey,
      ensName,
      gasPrice: TEST_GAS_PRICE,
      signature,
      chainName
    });
    return {contractAddress, keyPair};
  }
}
