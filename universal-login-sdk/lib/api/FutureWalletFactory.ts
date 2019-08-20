import {providers} from 'ethers';
import {NetworkData, calculateInitializeSignature} from '@universal-login/commons';
import {DeploymentReadyObserver} from '../core/observers/DeploymentReadyObserver';
import {DeploymentObserver} from '../core/observers/DeploymentObserver';
import {BlockchainService} from '../integration/ethereum/BlockchainService';
import {RelayerApi} from '../integration/http/RelayerApi';
import {ENSService} from '../integration/ethereum/ENSService';
import {encodeInitializeWithRefundData} from '@universal-login/contracts';

export type BalanceDetails = {
  tokenAddress: string,
  contractAddress: string
};

export type FutureWallet = {
  privateKey: string,
  contractAddress: string,
  waitForBalance: () => Promise<BalanceDetails>,
  deploy: (ensName: string, gasPrice: string) => Promise<string>
};

type FutureFactoryConfig = Pick<NetworkData, 'supportedTokens' | 'factoryAddress' | 'contractWhiteList' | 'chainSpec'>;

export class FutureWalletFactory {
  private ensService: ENSService;

  constructor(
    private config: FutureFactoryConfig,
    private provider: providers.Provider,
    private chainName: string,
    private blockchainService: BlockchainService,
    private relayerApi: RelayerApi) {
      this.ensService = new ENSService(provider, config.chainSpec.ensAddress);
  }

  async setupInitData(publicKey: string, ensName: string, gasPrice: string) {
    const args = await this.ensService.argsFor(ensName) as string[];
    const initArgs = [publicKey, ...args, gasPrice];
    return encodeInitializeWithRefundData(initArgs);
  }

  async createFutureWallet(): Promise<FutureWallet> {
    const [privateKey, contractAddress, publicKey] = await this.blockchainService.createFutureWallet(this.config.factoryAddress, this.provider);
    const waitForBalance = async () => new Promise(
      (resolve) => {
        const onReadyToDeploy = (tokenAddress: string, contractAddress: string) => resolve({tokenAddress, contractAddress});
        const deploymentReadyObserver = new DeploymentReadyObserver(this.config.supportedTokens, this.provider);
        deploymentReadyObserver.startAndSubscribe(contractAddress, onReadyToDeploy);
      }
    ) as Promise<BalanceDetails>;

    const deploy = async (ensName: string, gasPrice: string) => {
      const initData = await this.setupInitData(publicKey, ensName, gasPrice);
      const signature = await calculateInitializeSignature(initData, privateKey);
      await this.relayerApi.deploy(publicKey, ensName, gasPrice, signature, this.chainName);
      return new Promise(
        (resolve) => {
          const deploymentObserver = new DeploymentObserver(this.blockchainService, this.config.contractWhiteList, this.provider);
          const onContractDeployed = (contractAddress: string) => resolve(contractAddress);
          deploymentObserver.startAndSubscribe(contractAddress, onContractDeployed);
        }
      ) as Promise<string>;
    };

    return {
      privateKey,
      contractAddress,
      waitForBalance,
      deploy
    };
  }
}