import {utils, Contract, providers, Wallet} from 'ethers';
import WalletContract from '@universal-login/contracts/build/WalletMaster.json';
import {TokenDetails, TokenDetailsService, Notification, generateCode, addCodesToNotifications, resolveName, MANAGEMENT_KEY, waitForContractDeploy, Message, createSignedMessage, MessageWithFrom, ensureNotNull, PublicRelayerConfig, createKeyPair, signCancelAuthorisationRequest, signGetAuthorisationRequest, ensure, BalanceChecker, deepMerge, DeepPartial, SignedMessage, MultiChainProvider} from '@universal-login/commons';
import AuthorisationsObserver from '../core/observers/AuthorisationsObserver';
import BlockchainObserver from '../core/observers/BlockchainObserver';
import {DeploymentReadyObserver} from '../core/observers/DeploymentReadyObserver';
import {DeploymentObserver} from '../core/observers/DeploymentObserver';
import {RelayerApi} from '../integration/http/RelayerApi';
import {BlockchainService} from '../integration/ethereum/BlockchainService';
import {MissingConfiguration, InvalidEvent, InvalidContract} from '../core/utils/errors';
import {FutureWalletFactory} from './FutureWalletFactory';
import {ExecutionFactory, Execution} from '../core/services/ExecutionFactory';
import {BalanceObserver} from '../core/observers/BalanceObserver';
import {SdkConfigDefault} from '../config/SdkConfigDefault';
import {SdkConfig} from '../config/SdkConfig';
import {AggregateBalanceObserver} from '../core/observers/AggregateBalanceObserver';
import {PriceOracle} from '../core/services/PriceOracle';
import {PriceObserver} from '../core/observers/PriceObserver';
import {ProviderDict, Chains} from '../config/Chains';
import {Provider} from 'ethers/providers';

class UniversalLoginSDK {
  relayerApi: RelayerApi;
  authorisationsObserver: AuthorisationsObserver;
  chains: Chains = {};
  executionFactory: ExecutionFactory;
  balanceObserver?: BalanceObserver;
  aggregateBalanceObserver?: AggregateBalanceObserver;
  priceObserver: PriceObserver;
  blockchainService: BlockchainService;
  futureWalletFactory?: FutureWalletFactory;
  sdkConfig: SdkConfig;
  relayerConfig?: PublicRelayerConfig;
  factoryAddress?: string;

  constructor(
    relayerUrl: string,
    providerOrProviderDict: Provider | ProviderDict,
    sdkConfig?: DeepPartial<SdkConfig>
  ) {
    providerOrProviderDict.on ?
      this.chains['default'].provider = providerOrProviderDict as Provider
      : this.chains = deepMerge(this.chains, providerOrProviderDict)
    this.relayerApi = new RelayerApi(relayerUrl);
    this.authorisationsObserver = new AuthorisationsObserver(this.relayerApi);
    this.executionFactory = new ExecutionFactory(this.relayerApi);
    this.blockchainService = new BlockchainService();
    this.sdkConfig = deepMerge(SdkConfigDefault, sdkConfig);
    this.priceObserver = new PriceObserver(this.sdkConfig.observedTokens, this.sdkConfig.observedCurrencies);
  }

  async create(ensName: string, chainName: string = 'default'): Promise<[string, string]> {
    const {publicKey, privateKey} = createKeyPair();
    const result = await this.relayerApi.createWallet(publicKey, ensName);
    const provider = this.chains[chainName].provider;
    const contract = await waitForContractDeploy(
      provider,
      WalletContract,
      result.transaction.hash,
    );
    return [privateKey, contract.address];
  }

  async createFutureWallet(chainName: string = 'default') {
    await this.getRelayerConfig();
    this.fetchFutureWalletFactory(chainName);
    return this.futureWalletFactory!.createFutureWallet();
  }

  async addKey(to: string, publicKey: string, privateKey: string, transactionDetails: Message, keyPurpose = MANAGEMENT_KEY, chainName: string = 'default') {
    return this.selfExecute(to, 'addKey', [publicKey, keyPurpose], privateKey, transactionDetails, chainName);
  }

  async addKeys(to: string, publicKeys: string[], privateKey: string, transactionDetails: Message, keyPurpose = MANAGEMENT_KEY, chainName: string = 'default') {
    const keyRoles = new Array(publicKeys.length).fill(keyPurpose);
    return this.selfExecute(to, 'addKeys', [publicKeys, keyRoles], privateKey, transactionDetails, chainName);
  }

  async removeKey(to: string, key: string, privateKey: string, transactionDetails: Message, chainName: string = 'default') {
    return this.selfExecute(to, 'removeKey', [key, MANAGEMENT_KEY], privateKey, transactionDetails, chainName);
  }

  async setRequiredSignatures(to: string, requiredSignatures: number, privateKey: string, transactionDetails: Message, chainName: string = 'default') {
    return this.selfExecute(to, 'setRequiredSignatures', [requiredSignatures], privateKey, transactionDetails, chainName);
  }

  async getMessageStatus(messageHash: string) {
    return this.relayerApi.getStatus(messageHash);
  }

  async getRelayerConfig() {
    this.relayerConfig = this.relayerConfig || (await this.relayerApi.getConfig()).config;
    return this.relayerConfig;
  }

  async fetchDeploymentReadyObserver(chainName: string) {
    const provider = this.chains[chainName].provider;
    ensureNotNull(this.relayerConfig, MissingConfiguration);
    this.chains[chainName].deploymentReadyObserver = this.chains[chainName].deploymentReadyObserver || new DeploymentReadyObserver(this.relayerConfig!.networkConf[chainName].supportedTokens, provider);
  }

  async fetchDeploymentObserver(chainName: string) {
    const provider = this.chains[chainName].provider;
    ensureNotNull(this.relayerConfig, MissingConfiguration);
    this.chains[chainName].deploymentObserver = this.chains[chainName].deploymentObserver || new DeploymentObserver(this.blockchainService, this.relayerConfig!.networkConf[chainName].contractWhiteList, provider);
  }

  async fetchBalanceObserver(ensName: string, chainName: string) {
    const provider = this.chains[chainName].provider;
    const balanceChecker = new BalanceChecker(provider);
    const walletContractAddress = await this.getWalletContractAddress(ensName, chainName);
    ensureNotNull(walletContractAddress, InvalidContract);
    ensureNotNull(this.relayerConfig, MissingConfiguration);

    const tokenDetails = await this.getTokensDetails(chainName);
    this.balanceObserver = new BalanceObserver(balanceChecker, walletContractAddress, tokenDetails);
  }

  async fetchAggregateBalanceObserver(ensName: string, chainName: string) {
    if (this.aggregateBalanceObserver) {
      return;
    }
    await this.fetchBalanceObserver(ensName, chainName);
    this.aggregateBalanceObserver = new AggregateBalanceObserver(this.balanceObserver!, new PriceOracle());
  }

  async getTokensDetails(chainName: string = 'default') {
    const provider = this.chains[chainName].provider;
    const tokenDetailsService = new TokenDetailsService(provider);
    const tokenDetails: TokenDetails[] = [];
    for (const token of this.sdkConfig.observedTokens) {
      const name = await tokenDetailsService.getName(token.address);
      const symbol = await tokenDetailsService.getSymbol(token.address);
      tokenDetails.push({...token, name, symbol});
    }
    return tokenDetails;
  }

  private fetchFutureWalletFactory(chainName: string) {
    ensureNotNull(this.relayerConfig, Error, 'Relayer configuration not yet loaded');
    const futureWalletConfig = {
      supportedTokens: this.relayerConfig!.networkConf[chainName].supportedTokens,
      factoryAddress: this.relayerConfig!.networkConf[chainName].factoryAddress,
      contractWhiteList: this.relayerConfig!.networkConf[chainName].contractWhiteList,
      chainSpec: this.relayerConfig!.networkConf[chainName].chainSpec
    };
    const provider = this.chains[chainName].provider;
    this.futureWalletFactory = new FutureWalletFactory(futureWalletConfig, provider, this.blockchainService, this.relayerApi);
  }

  async execute(message: Message, privateKey: string, chainName: string = 'default'): Promise<Execution> {
    const unsignedMessage = {
      ...this.sdkConfig.paymentOptions,
      ...message,
      nonce: message.nonce || parseInt(await this.getNonce(message.from!, chainName), 10),
    } as MessageWithFrom;
    const signedMessage: SignedMessage = createSignedMessage(unsignedMessage, privateKey);
    return this.executionFactory.createExecution(signedMessage);
  }

  protected selfExecute(to: string, method: string , args: any[], privateKey: string, transactionDetails: Message, chainName: string) {
    const data = new utils.Interface(WalletContract.interface).functions[method].encode(args);
    const message = {
      ...transactionDetails,
      to,
      from: to,
      data
    };
    return this.execute(message, privateKey, chainName);
  }

  async getKeyPurpose(walletContractAddress: string, key: string, chainName: string = 'default') {
    const provider = this.chains[chainName].provider;
    const walletContract = new Contract(walletContractAddress, WalletContract.interface, provider);
    return walletContract.getKeyPurpose(key);
  }

  async getNonce(walletContractAddress: string, chainName: string = 'default') {
    const provider = this.chains[chainName].provider;
    const contract = new Contract(walletContractAddress, WalletContract.interface, provider);
    return contract.lastNonce();
  }

  async getWalletContractAddress(ensName: string, chainName: string = 'default') {
    const walletContractAddress = await this.resolveName(ensName, chainName);
    const provider = this.chains[chainName].provider;
    if (walletContractAddress && await this.blockchainService.getCode(walletContractAddress, provider)) {
      return walletContractAddress;
    }
    return null;
  }

  async walletContractExist(ensName: string, chainName: string = 'default') {
    const walletContractAddress = await this.getWalletContractAddress(ensName, chainName);
    return walletContractAddress !== null;
  }

  async resolveName(ensName: string, chainName: string = 'default') {
    await this.getRelayerConfig();
    const {ensAddress} = this.relayerConfig!.networkConf[chainName].chainSpec;
    const provider = this.chains[chainName].provider;
    return resolveName(provider, ensAddress, ensName);
  }

  async connect(walletContractAddress: string) {
    const {publicKey, privateKey} = createKeyPair();
    await this.relayerApi.connect(walletContractAddress, publicKey.toLowerCase());
    return {
      privateKey,
      securityCode: generateCode(publicKey)
    };
  }

  async denyRequest(walletContractAddress: string, publicKey: string, privateKey: string) {
    const cancelAuthorisationRequest = {walletContractAddress, publicKey};
    signCancelAuthorisationRequest(cancelAuthorisationRequest, privateKey);
    await this.relayerApi.denyConnection(cancelAuthorisationRequest);
    return publicKey;
  }

  subscribe(eventType: string, filter: any, chainName: string, callback: Function) {
    ensure(['KeyAdded', 'KeyRemoved'].includes(eventType), InvalidEvent, eventType);
    return this.chains[chainName].blockchainObserver.subscribe(eventType, filter, callback);
  }

  async subscribeToBalances(ensName: string, callback: Function, chainName: string = 'default') {
    await this.fetchBalanceObserver(ensName, chainName);
    return this.balanceObserver!.subscribe(callback);
  }

  async subscribeToAggregatedBalance(ensName: string, callback: Function, currencySymbol: string, chainName: string = 'default') {
    await this.fetchAggregateBalanceObserver(ensName, chainName);
    return this.aggregateBalanceObserver!.subscribe(callback, currencySymbol);
  }

  subscribeAuthorisations(walletContractAddress: string, privateKey: string, callback: Function) {
    return this.authorisationsObserver.subscribe(
      signGetAuthorisationRequest({walletContractAddress}, privateKey),
      (notifications: Notification[]) => callback(addCodesToNotifications(notifications))
    );
  }

  async start(chainName: string = 'default') {
    const provider = this.chains[chainName].provider;
    const blockchainObserver = new BlockchainObserver(this.blockchainService, provider);
    this.chains[chainName].blockchainObserver = blockchainObserver;
    await this.chains[chainName].blockchainObserver.start();
  }

  stop(chainName: string = 'default') {
    this.chains[chainName].blockchainObserver.stop();
  }

  async finalizeAndStop(chainName: string = 'defualt') {
    await this.chains[chainName].blockchainObserver.finalizeAndStop();
  }
}

export default UniversalLoginSDK;
