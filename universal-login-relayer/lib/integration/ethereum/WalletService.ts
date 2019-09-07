import {EventEmitter} from 'fbemitter';
import {utils} from 'ethers';
import {ensureNotNull, ensure, RequiredBalanceChecker, BalanceChecker, computeContractAddress, DeployArgs, getInitializeSigner, DEPLOY_GAS_LIMIT} from '@universal-login/commons';
import {encodeInitializeWithENSData} from '@universal-login/contracts';
import ENSService from './ensService';
import {InvalidENSDomain, NotEnoughBalance, EnsNameTaken, InvalidSignature} from '../../core/utils/errors';
import {WalletDeployer} from '../ethereum/WalletDeployer';
import {MultiChainService} from '../../core/services/MultiChainService';

class WalletService {

  constructor(private multiChainService: MultiChainService, private ensService: ENSService, private hooks: EventEmitter) {
  }

  async deploy({publicKey, ensName, gasPrice, signature, network}: DeployArgs) {
    const factoryContract = this.multiChainService.getFactoryContract(network);
    const provider = this.multiChainService.getProvider(network);
    const wallet = this.multiChainService.getWallet(network);
    const walletDeployer = new WalletDeployer(factoryContract.address, wallet);
    const balanceChecker = new BalanceChecker(provider);
    const requiredBalanceChecker = new RequiredBalanceChecker(balanceChecker);
    ensure(!await this.ensService.resolveName(ensName, network), EnsNameTaken, ensName);
    const ensArgs = await this.ensService.argsFor(ensName, network);
    ensureNotNull(ensArgs, InvalidENSDomain, ensName);
    const factoryAddress = (this.multiChainService.getFactoryContract('default')).address;
    const supportedTokens = this.multiChainService.getSupportedTokens('default');
    const contractAddress = computeContractAddress(factoryAddress, publicKey, await walletDeployer.getInitCode());
    ensure(!!await requiredBalanceChecker.findTokenWithRequiredBalance(supportedTokens, contractAddress), NotEnoughBalance);
    const args = [publicKey, ...ensArgs as string[], gasPrice];
    const initWithENS = encodeInitializeWithENSData(args);
    ensure(getInitializeSigner(initWithENS, signature) === publicKey, InvalidSignature);
    const transaction = await walletDeployer.deploy({publicKey, signature, intializeData: initWithENS}, {gasLimit: DEPLOY_GAS_LIMIT, gasPrice: utils.bigNumberify(gasPrice)});
    this.hooks.emit('created', {transaction, contractAddress, network});
    return transaction;
  }
}

export default WalletService;
