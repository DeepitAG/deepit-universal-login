import {ContractFactory, utils} from 'ethers';
import ProxyContract from '@universal-login/contracts/build/Proxy.json';
import ENSService from './ensService';
import {EventEmitter} from 'fbemitter';
import {Abi, defaultDeployOptions, ensureNotNull, ensure, BalanceChecker, RequiredBalanceChecker, computeContractAddress, DeployArgs, getInitializeSigner, DEPLOY_GAS_LIMIT} from '@universal-login/commons';
import {InvalidENSDomain, NotEnoughBalance, EnsNameTaken, InvalidSignature} from '../../core/utils/errors';
import {encodeInitializeWithENSData, encodeInitializeWithRefundData} from '@universal-login/contracts';
import {WalletDeployer} from '../ethereum/WalletDeployer';
import {MultiChainProvider} from './MultiChainProvider';

class WalletService {
  private bytecode: string;
  private abi: Abi;

  constructor(private multiChainProvider: MultiChainProvider, private ensService: ENSService, private hooks: EventEmitter) {
    const contractJSON = ProxyContract;
    this.abi = contractJSON.interface;
    this.bytecode = `0x${contractJSON.evm.bytecode.object}`;
  }

  async create(key: string, ensName: string, chainName: string, overrideOptions = {}) {
    const ensArgs = await this.ensService.argsFor(ensName, chainName);
    if (ensArgs !== null) {
      let args = [key, ...ensArgs] as string[];
      const initData = encodeInitializeWithENSData(args);
      const walletMasterAddress = this.multiChainProvider.getWalletMasterAddress(chainName);
      const wallet = this.multiChainProvider.getWallet(chainName);
      args = [walletMasterAddress, initData];
      const deployTransaction = {
        ...defaultDeployOptions,
        ...overrideOptions,
        ...new ContractFactory(this.abi, this.bytecode).getDeployTransaction(...args),
      };
      const transaction = await wallet.sendTransaction(deployTransaction);
      this.hooks.emit('created', transaction, chainName);
      return transaction;
    }
    throw new InvalidENSDomain(ensName);
  }

  async deploy({publicKey, ensName, gasPrice, signature, chainName}: DeployArgs) {
    const factoryContract = this.multiChainProvider.getFactoryContract(chainName);
    const provider = this.multiChainProvider.getNetworkProvider(chainName);
    const wallet = this.multiChainProvider.getWallet(chainName);
    const walletDeployer = new WalletDeployer(factoryContract.address, wallet);
    const balanceChecker = new BalanceChecker(provider);
    const requiredBalanceChecker = new RequiredBalanceChecker(balanceChecker);
    ensure(!await this.ensService.resolveName(ensName, chainName), EnsNameTaken, ensName);
    const ensArgs = await this.ensService.argsFor(ensName, chainName);
    ensureNotNull(ensArgs, InvalidENSDomain, ensName);
    const contractAddress = computeContractAddress(factoryContract.address, publicKey, await walletDeployer.getInitCode());
    const supportedTokens = this.multiChainProvider.getSupportedTokens(chainName);
    ensure(!!await requiredBalanceChecker.findTokenWithRequiredBalance(supportedTokens, contractAddress), NotEnoughBalance);
    const args = [publicKey, ...ensArgs as unknown as string[], gasPrice];
    const initWithENS = encodeInitializeWithRefundData(args);
    ensure(getInitializeSigner(initWithENS, signature) === publicKey, InvalidSignature);
    return walletDeployer.deploy({publicKey, signature, intializeData: initWithENS}, {gasLimit: DEPLOY_GAS_LIMIT, gasPrice: utils.bigNumberify(gasPrice)});
  }
}

export default WalletService;
