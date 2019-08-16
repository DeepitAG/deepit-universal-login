import express, {Application} from 'express';
import WalletRouter from '../routes/wallet';
import ConfigRouter, {getPublicConfig} from '../routes/config';
import RequestAuthorisationRouter from '../routes/authorisation';
import WalletService from '../../integration/ethereum/WalletService';
import ENSService from '../../integration/ethereum/ensService';
import bodyParser from 'body-parser';
import {providers} from 'ethers';
import cors from 'cors';
import {EventEmitter} from 'fbemitter';
import useragent from 'express-useragent';
import Knex from 'knex';
import {Server} from 'http';
import {Config} from '../../config/relayer';
import MessageHandler from '../../core/services/MessageHandler';
import QueueSQLStore from '../../integration/sql/services/QueueSQLStore';
import errorHandler from '../middlewares/errorHandler';
import MessageSQLRepository from '../../integration/sql/services/MessageSQLRepository';
import AuthorisationService from '../../core/services/AuthorisationService';
import IQueueStore from '../../core/services/messages/IQueueStore';
import IMessageRepository from '../../core/services/messages/IMessagesRepository';
import {WalletDeployer} from '../../integration/ethereum/WalletDeployer';
import AuthorisationStore from '../../integration/sql/services/AuthorisationStore';
import WalletMasterContractService from '../../integration/ethereum/services/WalletMasterContractService';
import {MessageStatusService} from '../../core/services/messages/MessageStatusService';
import {SignaturesService} from '../../integration/ethereum/SignaturesService';
import MessageValidator from '../../core/services/messages/MessageValidator';
import MessageExecutor from '../../integration/ethereum/MessageExecutor';
import {MultiChainProvider} from '../../integration/ethereum/MultiChainProvider';

const defaultPort = '3311';


export type RelayerClass = {
  new (config: any, provider: providers.Provider): Relayer;
};

class Relayer {
  protected readonly port: string;
  protected readonly hooks: EventEmitter;
  public multiChainProvider: MultiChainProvider;
  public readonly database: Knex;
  private ensService: ENSService = {} as ENSService;
  private authorisationStore: AuthorisationStore = {} as AuthorisationStore;
  private authorisationService: AuthorisationService = {} as AuthorisationService;
  private walletMasterContractService: WalletMasterContractService = {} as WalletMasterContractService;
  private walletContractService: WalletService = {} as WalletService;
  private queueStore: IQueueStore = {} as IQueueStore;
  private messageHandler: MessageHandler = {} as MessageHandler;
  private messageRepository: IMessageRepository = {} as IMessageRepository;
  private signaturesService: SignaturesService = {} as SignaturesService;
  private statusService: MessageStatusService = {} as MessageStatusService;
  private messageValidator: MessageValidator = {} as MessageValidator;
  private messageExecutor: MessageExecutor = {} as MessageExecutor;
  private app: Application = {} as Application;
  protected server: Server = {} as Server;
  private walletDeployer: WalletDeployer = {} as WalletDeployer;

  constructor(protected config: Config) {
    this.port = config.port || defaultPort;
    this.hooks = new EventEmitter();
    this.multiChainProvider = new MultiChainProvider(config.networkConf);
    this.database = Knex(config.database);
  }

  async start() {
    await this.database.migrate.latest();
    this.runServer();
    this.messageHandler.start();
  }

  runServer() {
    this.app = express();
    this.app.use(useragent.express());
    this.app.use(cors({
      origin : '*',
      credentials: true,
    }));
    this.ensService = new ENSService(this.multiChainProvider);
    this.authorisationStore = new AuthorisationStore(this.database);
    this.walletContractService = new WalletService(this.multiChainProvider, this.ensService, this.hooks);
    this.walletMasterContractService = new WalletMasterContractService(this.multiChainProvider);
    this.authorisationService = new AuthorisationService(this.authorisationStore, this.walletMasterContractService);
    this.messageRepository = new MessageSQLRepository(this.database);
    this.queueStore = new QueueSQLStore(this.database);
    this.signaturesService = new SignaturesService(this.multiChainProvider);
    this.statusService = new MessageStatusService(this.messageRepository, this.signaturesService);
    this.messageValidator = new MessageValidator(this.multiChainProvider);
    this.messageExecutor = new MessageExecutor(this.multiChainProvider, this.messageValidator);
    this.messageHandler = new MessageHandler(this.multiChainProvider, this.authorisationStore, this.hooks, this.messageRepository, this.queueStore, this.messageExecutor, this.statusService);
    const publicConfig = getPublicConfig(this.config);
    this.app.use(bodyParser.json());
    this.app.use('/wallet', WalletRouter(this.walletContractService, this.messageHandler));
    this.app.use('/config', ConfigRouter(publicConfig));
    this.app.use('/authorisation', RequestAuthorisationRouter(this.authorisationService));
    this.app.use(errorHandler);
    this.server = this.app.listen(this.port);
  }

  async stop() {
    await this.messageHandler.stop();
    await this.database.destroy();
    await this.server.close();
  }

  async stopLater() {
    await this.messageHandler.stopLater();
    await this.database.destroy();
    await this.server.close();
  }
}

export default Relayer;