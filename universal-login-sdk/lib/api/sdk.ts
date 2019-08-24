import {utils, Contract} from 'ethers';
import WalletContract from '@universal-login/contracts/build/WalletMaster.json';
import {TokensValueConverter, TokenDetailsService, Notification, generateCode, addCodesToNotifications, resolveName, MANAGEMENT_KEY, waitForContractDeploy, Message, createSignedMessage, MessageWithFrom, ensureNotNull, PublicRelayerConfig, createKeyPair, signCancelAuthorisationRequest, signGetAuthorisationRequest, ensure, BalanceChecker, deepMerge, DeepPartial, SignedMessage} from '@universal-login/commons';
import AuthorisationsObserver from '../core/observers/AuthorisationsObserver';
import BlockchainObserver from '../core/observers/BlockchainObserver';
import {DeploymentReadyObserver} from '../core/observers/DeploymentReadyObserver';
import {DeploymentObserver} from '../core/observers/DeploymentObserver';
import {RelayerApi} from '../integration/http/RelayerApi';
import {BlockchainService} from '../integration/ethereum/BlockchainService';
import {MissingConfiguration, InvalidEvent, InvalidContract} from '../core/utils/errors';
import {FutureWalletFactory} from './FutureWalletFactory';
import {ExecutionFactory, Execution} from '../core/services/ExecutionFactory';
import {BalanceObserver, OnBalanceChange} from '../core/observers/BalanceObserver';
import {SdkConfigDefault} from '../config/SdkConfigDefault';
import {SdkConfig} from '../config/SdkConfig';
import {AggregateBalanceObserver, OnAggregatedBalanceChange} from '../core/observers/AggregateBalanceObserver';
import {PriceObserver, OnTokenPricesChange} from '../core/observers/PriceObserver';
import {ProviderDict, Chains} from '../config/Chains';
import {Provider} from 'ethers/providers';
import {TokensDetailsStore} from '../integration/ethereum/TokensDetailsStore';
import {getChains} from '../core/utils/getChains';

class UniversalLoginSDK {
  relayerApi: RelayerApi;
  authorisationsObserver: AuthorisationsObserver;
  chains: Chains = {};
  executionFactory: ExecutionFactory;
  balanceObserver?: BalanceObserver;
  tokensValueConverter: TokensValueConverter;
  aggregateBalanceObserver?: AggregateBalanceObserver;
  priceObserver: PriceObserver;
  tokenDetailsService: TokenDetailsService;
  tokensDetailsStore: TokensDetailsStore;
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
    providerOrProviderDict.call ?
      this.chains['default'] = {provider: providerOrProviderDict as Provider}
      : this.chains = getChains(providerOrProviderDict as ProviderDict);
    this.relayerApi = new RelayerApi(relayerUrl);
    this.authorisationsObserver = new AuthorisationsObserver(this.relayerApi);
    this.executionFactory = new ExecutionFactory(this.relayerApi);
    this.blockchainService = new BlockchainService();
    this.sdkConfig = deepMerge(SdkConfigDefault, sdkConfig);
    this.tokenDetailsService = new TokenDetailsService();
    this.tokensDetailsStore = new TokensDetailsStore(this.tokenDetailsService, this.sdkConfig.observedTokens, this.chains);
    this.priceObserver = new PriceObserver(this.tokensDetailsStore, this.sdkConfig.observedCurrencies);
    this.tokensValueConverter = new TokensValueConverter(this.sdkConfig.observedCurrencies);
  }

  async create(ensName: string, chainName = 'default'): Promise<[string, string]> {
    const {publicKey, privateKey} = createKeyPair();
    const result = await this.relayerApi.createWallet(publicKey, ensName, chainName);
    const provider = this.chains[chainName].provider;
    const contract = await waitForContractDeploy(
      provider,
      WalletContract,
      result.transaction.hash,
    );
    return [privateKey, contract.address];
  }

  async createFutureWallet(chainName = 'default') {
    await this.getRelayerConfig();
    this.fetchFutureWalletFactory(chainName);
    return this.futureWalletFactory!.createFutureWallet();
  }

  async addKey(to: string, publicKey: string, privateKey: string, transactionDetails: Message, keyPurpose = MANAGEMENT_KEY, chainName = 'default') {
    return this.selfExecute(to, 'addKey', [publicKey, keyPurpose], privateKey, transactionDetails, chainName);
  }

  async addKeys(to: string, publicKeys: string[], privateKey: string, transactionDetails: Message, keyPurpose = MANAGEMENT_KEY, chainName = 'default') {
    const keyRoles = new Array(publicKeys.length).fill(keyPurpose);
    return this.selfExecute(to, 'addKeys', [publicKeys, keyRoles], privateKey, transactionDetails, chainName);
  }

  async removeKey(to: string, key: string, privateKey: string, transactionDetails: Message, chainName = 'default') {
    return this.selfExecute(to, 'removeKey', [key, MANAGEMENT_KEY], privateKey, transactionDetails, chainName);
  }

  async setRequiredSignatures(to: string, requiredSignatures: number, privateKey: string, transactionDetails: Message, chainName = 'default') {
    return this.selfExecute(to, 'setRequiredSignatures', [requiredSignatures], privateKey, transactionDetails, chainName);
  }

  async getMessageStatus(messageHash: string, chainName = 'default') {
    return this.relayerApi.getStatus(messageHash, chainName);
  }

  async getRelayerConfig() {
    this.relayerConfig = this.relayerConfig || (await this.relayerApi.getConfig()).config;
    return this.relayerConfig;
  }

  async fetchDeploymentReadyObserver(chainName: string) {
    const provider = this.chains[chainName].provider;
    ensureNotNull(this.relayerConfig, MissingConfiguration);
    this.chains[chainName].deploymentReadyObserver = this.chains[chainName].deploymentReadyObserver || new DeploymentReadyObserver(this.relayerConfig!.networkConfig[chainName].supportedTokens, provider);
  }

  async fetchDeploymentObserver(chainName: string) {
    const provider = this.chains[chainName].provider;
    ensureNotNull(this.relayerConfig, MissingConfiguration);
    this.chains[chainName].deploymentObserver = this.chains[chainName].deploymentObserver || new DeploymentObserver(this.blockchainService, this.relayerConfig!.networkConfig[chainName].contractWhiteList, provider);
  }

  async fetchBalanceObserver(ensName: string, chainName: string) {
    const provider = this.chains[chainName].provider;
    const balanceChecker = new BalanceChecker(provider);
    const walletContractAddress = await this.getWalletContractAddress(ensName, chainName);
    ensureNotNull(walletContractAddress, InvalidContract);
    ensureNotNull(this.relayerConfig, MissingConfiguration);

    await this.tokensDetailsStore.fetchTokensDetails();
    this.balanceObserver = new BalanceObserver(balanceChecker, walletContractAddress, this.tokensDetailsStore);
  }

  async fetchAggregateBalanceObserver(ensName: string, chainName: string) {
    if (this.aggregateBalanceObserver) {
      return;
    }
    await this.fetchBalanceObserver(ensName, chainName);
    this.aggregateBalanceObserver = new AggregateBalanceObserver(this.balanceObserver!, this.priceObserver, this.tokensValueConverter);
  }

  private fetchFutureWalletFactory(chainName: string) {
    ensureNotNull(this.relayerConfig, Error, 'Relayer configuration not yet loaded');
    const futureWalletConfig = {
      supportedTokens: this.relayerConfig!.networkConfig[chainName].supportedTokens,
      factoryAddress: this.relayerConfig!.networkConfig[chainName].factoryAddress,
      contractWhiteList: this.relayerConfig!.networkConfig[chainName].contractWhiteList,
      chainSpec: this.relayerConfig!.networkConfig[chainName].chainSpec
    };
    const provider = this.chains[chainName].provider;
    this.futureWalletFactory = new FutureWalletFactory(futureWalletConfig, provider, chainName, this.blockchainService, this.relayerApi);
  }

  async execute(message: Message, privateKey: string, chainName = 'default'): Promise<Execution> {
    const unsignedMessage = {
      ...this.sdkConfig.paymentOptions,
      ...message,
      nonce: message.nonce || parseInt(await this.getNonce(message.from!, chainName), 10),
    } as MessageWithFrom;
    const signedMessage: SignedMessage = createSignedMessage(unsignedMessage, privateKey);
    return this.executionFactory.createExecution(signedMessage, chainName);
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

  async getKeyPurpose(walletContractAddress: string, key: string, chainName = 'default') {
    const provider = this.chains[chainName].provider;
    const walletContract = new Contract(walletContractAddress, WalletContract.interface, provider);
    return walletContract.getKeyPurpose(key);
  }

  async getNonce(walletContractAddress: string, chainName = 'default') {
    const provider = this.chains[chainName].provider;
    const contract = new Contract(walletContractAddress, WalletContract.interface, provider);
    return contract.lastNonce();
  }

  async getWalletContractAddress(ensName: string, chainName = 'default') {
    const walletContractAddress = await this.resolveName(ensName, chainName);
    const provider = this.chains[chainName].provider;
    if (walletContractAddress && await this.blockchainService.getCode(walletContractAddress, provider)) {
      return walletContractAddress;
    }
    return null;
  }

  async walletContractExist(ensName: string, chainName = 'default') {
    const walletContractAddress = await this.getWalletContractAddress(ensName, chainName);
    return walletContractAddress !== null;
  }

  async resolveName(ensName: string, chainName = 'default') {
    await this.getRelayerConfig();
    const {ensAddress} = this.relayerConfig!.networkConfig[chainName].chainSpec;
    const provider = this.chains[chainName].provider;
    return resolveName(provider, ensAddress, ensName);
  }

  async connect(walletContractAddress: string, chainName = 'default') {
    const {publicKey, privateKey} = createKeyPair();
    await this.relayerApi.connect(walletContractAddress, publicKey, chainName);
    return {
      privateKey,
      securityCode: generateCode(publicKey)
    };
  }

  async denyRequest(walletContractAddress: string, publicKey: string, privateKey: string, chainName = 'default') {
    const cancelAuthorisationRequest = {walletContractAddress, publicKey};
    signCancelAuthorisationRequest(cancelAuthorisationRequest, privateKey);
    await this.relayerApi.denyConnection(cancelAuthorisationRequest, chainName);
    return publicKey;
  }

  subscribe(eventType: string, filter: any, callback: Function, chainName = 'default') {
    ensure(['KeyAdded', 'KeyRemoved'].includes(eventType), InvalidEvent, eventType);
    return this.chains[chainName].blockchainObserver!.subscribe(eventType, filter, callback);
  }

  async subscribeToBalances(ensName: string, callback: OnBalanceChange, chainName = 'default') {
    await this.fetchBalanceObserver(ensName, chainName);
    return this.balanceObserver!.subscribe(callback);
  }

  async subscribeToAggregatedBalance(ensName: string, callback: OnAggregatedBalanceChange, chainName = 'default') {
    await this.fetchAggregateBalanceObserver(ensName, chainName);
    return this.aggregateBalanceObserver!.subscribe(callback);
  }

  subscribeToPrices(callback: OnTokenPricesChange) {
    return this.priceObserver.subscribe(callback);
  }

  subscribeAuthorisations(walletContractAddress: string, privateKey: string, callback: Function, chainName = 'default') {
    return this.authorisationsObserver.subscribe(
      signGetAuthorisationRequest({walletContractAddress}, privateKey),
      chainName,
      (notifications: Notification[]) => callback(addCodesToNotifications(notifications))
    );
  }

  async start() {
    for (const chainName in this.chains) {
      const provider = this.chains[chainName].provider;
      const blockchainObserver = new BlockchainObserver(this.blockchainService, provider);
      this.chains[chainName].blockchainObserver = blockchainObserver;
      await this.chains[chainName].blockchainObserver!.start();
    }
    await this.tokensDetailsStore.fetchTokensDetails();
  }

  stop() {
    for (const chainName in this.chains) {
      this.chains[chainName].blockchainObserver!.stop();
    }
  }

  async finalizeAndStop() {
    for (const chainName in this.chains) {
      await this.chains[chainName].blockchainObserver!.finalizeAndStop();
    }
  }
}

export default UniversalLoginSDK;
