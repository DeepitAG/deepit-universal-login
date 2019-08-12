import {ContractFactory, Wallet, utils} from 'ethers';
import ProxyContract from '@universal-login/contracts/build/Proxy.json';
import ENSService from './ensService';
import {EventEmitter} from 'fbemitter';
import {Abi, defaultDeployOptions, ensureNotNull, ensure, RequiredBalanceChecker, computeContractAddress, DeployArgs, getInitializeSigner, DEPLOY_GAS_LIMIT, MultiChainProvider} from '@universal-login/commons';
import {InvalidENSDomain, NotEnoughBalance, EnsNameTaken, InvalidSignature} from '../../core/utils/errors';
import {encodeInitializeWithENSData, encodeInitializeWithRefundData} from '@universal-login/contracts';
import {WalletDeployer} from '../ethereum/WalletDeployer';

class WalletService {
  private bytecode: string;
  private abi: Abi;

  constructor(private multiChainProvider: MultiChainProvider, private ensService: ENSService, private hooks: EventEmitter, private walletDeployer: WalletDeployer, private requiredBalanceChecker: RequiredBalanceChecker) {
    const contractJSON = ProxyContract;
    this.abi = contractJSON.interface;
    this.bytecode = `0x${contractJSON.evm.bytecode.object}`;
  }

  async create(key: string, ensName: string, overrideOptions = {}, chainName: string) {
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
      this.hooks.emit('created', transaction);
      return transaction;
    }
    throw new InvalidENSDomain(ensName);
  }

  async deploy({publicKey, ensName, gasPrice, signature, chainName}: DeployArgs) {
    ensure(!await this.ensService.resolveName(ensName, chainName), EnsNameTaken, ensName);
    const ensArgs = this.ensService.argsFor(ensName, chainName);
    ensureNotNull(ensArgs, InvalidENSDomain, ensName);
    const factoryContract = this.multiChainProvider.getFactoryContract(chainName);
    const contractAddress = computeContractAddress(factoryContract.address, publicKey, await this.walletDeployer.getInitCode(chainName));
    const supportedTokens = this.multiChainProvider.getSupportedTokens(chainName);
    ensure(!!await this.requiredBalanceChecker.findTokenWithRequiredBalance(supportedTokens, contractAddress, chainName), NotEnoughBalance);
    const args = [publicKey, ...ensArgs as unknown as string[], gasPrice];
    const initWithENS = encodeInitializeWithRefundData(args);
    ensure(getInitializeSigner(initWithENS, signature) === publicKey, InvalidSignature);
    return this.walletDeployer.deploy({publicKey, signature, intializeData: initWithENS}, {gasLimit: DEPLOY_GAS_LIMIT, gasPrice: utils.bigNumberify(gasPrice)}, chainName);
  }
}

export default WalletService;
