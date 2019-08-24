import fetch from 'node-fetch';
import {Wallet, Contract, utils} from 'ethers';
import {http, HttpFunction, PublicRelayerConfig, createKeyPair, calculateInitializeSignature, computeContractAddress, TEST_GAS_PRICE} from '@universal-login/commons';
import {encodeInitializeWithRefundData} from '@universal-login/contracts';
import ProxyCounterfactualFactory from '@universal-login/contracts/build/ProxyCounterfactualFactory.json';
import ENSService from '../../lib/integration/ethereum/ensService';
import {RelayerUnderTest} from '../../lib';

export class WalletCreator {
  private http: HttpFunction;
  private ensService?: ENSService;
  private relayerConfig: PublicRelayerConfig;

  constructor(private relayer: RelayerUnderTest, private wallet: Wallet) {
    this.http = http(fetch)(relayer.url());
    this.relayerConfig = relayer.publicConfig;
  }

  private async fetchEnsService(chainName: string) {
    const {multiChainService} = await this.relayer;
    if (this.ensService) {
      return this.ensService;
    }
    this.ensService = new ENSService(multiChainService);
    // await this.ensService.start();
    return this.ensService;
  }

  private async getInitCode (factoryAddress: string){
    const factoryContract = new Contract(factoryAddress, ProxyCounterfactualFactory.interface, this.wallet.provider);
    return factoryContract.initCode();
  }

  private async setupInitData(publicKey: string, ensName: string, gasPrice: string, chainName: string) {
    const ensService = await this.fetchEnsService(chainName);
    const args = await ensService.argsFor(ensName, chainName) as string[];
    const initArgs = [publicKey, ...args, gasPrice];
    return encodeInitializeWithRefundData(initArgs);
  }

  async createFutureWallet(chainName: string) {
    await this.fetchEnsService(chainName);
    const {factoryAddress} = await this.relayerConfig.networkConfig[chainName];
    const keyPair = createKeyPair();
    const futureContractAddress = computeContractAddress(factoryAddress, keyPair.publicKey, await this.getInitCode(factoryAddress));
    return {privateKey: keyPair.privateKey, contractAddress: futureContractAddress, publicKey: keyPair.publicKey};
  }

  private async getSignature(privateKey: string, publicKey: string, ensName: string, chainName: string) {
    const initData = await this.setupInitData(publicKey, ensName, TEST_GAS_PRICE, chainName);
    return calculateInitializeSignature(initData, privateKey);
  }

  async deployWallet(chainName: string, ensName: string = 'name.mylogin.eth') {
    const {contractAddress, privateKey, publicKey} = await this.createFutureWallet(chainName);
    await this.wallet.sendTransaction({to: contractAddress, value: utils.parseEther('1.0')});
    const signature = await this.getSignature(privateKey, publicKey, ensName, chainName);
    await this.http('POST', '/wallet/deploy', {
      publicKey,
      ensName,
      gasPrice: TEST_GAS_PRICE,
      signature,
      chainName
    });
    return {privateKey, contractAddress, publicKey};
  }
}
