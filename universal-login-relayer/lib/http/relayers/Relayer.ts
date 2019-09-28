import express, {Application} from 'express';
import WalletRouter from '../routes/wallet';
import ConfigRouter, {getPublicConfig} from '../routes/config';
import RequestAuthorisationRouter from '../routes/authorisation';
import DevicesRouter from '../routes/devices';
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
import {IExecutionQueue} from '../../core/services/messages/IExecutionQueue';
import IMessageRepository from '../../core/services/messages/IMessagesRepository';
import AuthorisationStore from '../../integration/sql/services/AuthorisationStore';
import WalletMasterContractService from '../../integration/ethereum/services/WalletMasterContractService';
import {MessageStatusService} from '../../core/services/messages/MessageStatusService';
import {SignaturesService} from '../../integration/ethereum/SignaturesService';
import {MultiChainService} from '../../core/services/MultiChainService';
import {PublicRelayerConfig} from '@universal-login/commons';
import IMessageValidator from '../../core/services/validators/IMessageValidator';
import MessageExecutor from '../../integration/ethereum/MessageExecutor';
import {DevicesStore} from '../../integration/sql/services/DevicesStore';
import {DevicesService} from '../../core/services/DevicesService';
import {GasValidator} from '../../core/services/validators/GasValidator';
import DeploymentHandler from '../../core/services/DeploymentHandler';
import IRepository from '../../core/services/messages/IRepository';
import Deployment from '../../core/models/Deployment';
import SQLRepository from '../../integration/sql/services/SQLRepository';
import ExecutionWorker from '../../core/services/messages/ExecutionWorker';

const defaultPort = '3311';


export type RelayerClass = {
  new (config: any, provider: providers.Provider): Relayer;
};

class Relayer {
  protected readonly port: string;
  protected readonly hooks: EventEmitter;
  public multiChainService: MultiChainService;
  public readonly database: Knex;
  private ensService: ENSService = {} as ENSService;
  private authorisationStore: AuthorisationStore = {} as AuthorisationStore;
  private authorisationService: AuthorisationService = {} as AuthorisationService;
  private devicesStore: DevicesStore = {} as DevicesStore;
  private devicesService: DevicesService = {} as DevicesService;
  private walletMasterContractService: WalletMasterContractService = {} as WalletMasterContractService;
  private walletContractService: WalletService = {} as WalletService;
  private executionQueue: QueueSQLStore = {} as QueueSQLStore;
  private messageHandler: MessageHandler = {} as MessageHandler;
  private deploymentHandler: DeploymentHandler = {} as DeploymentHandler;
  private gasValidator: GasValidator = {} as GasValidator;
  private messageRepository: IMessageRepository = {} as IMessageRepository;
  private deploymentRepository: IRepository<Deployment> = {} as IRepository<Deployment>;
  private signaturesService: SignaturesService = {} as SignaturesService;
  private statusService: MessageStatusService = {} as MessageStatusService;
  private messageExecutionValidator: IMessageValidator = {} as IMessageValidator;
  private executionWorker: ExecutionWorker = {} as ExecutionWorker;
  private messageExecutor: MessageExecutor = {} as MessageExecutor;
  private app: Application = {} as Application;
  protected server: Server = {} as Server;
  public publicConfig: PublicRelayerConfig;

  constructor(protected config: Config) {
    this.port = config.port || defaultPort;
    this.hooks = new EventEmitter();
    this.multiChainService = new MultiChainService(config.networkConfig);
    this.database = Knex(config.database);
    this.publicConfig = getPublicConfig(this.config);
  }

  async start() {
    await this.database.migrate.latest();
    this.runServer();
    this.executionWorker.start();
  }

  runServer() {
    this.app = express();
    this.app.use(useragent.express());
    this.app.use(cors({
      origin : '*',
      credentials: true,
    }));
    this.ensService = new ENSService(this.multiChainService);
    this.authorisationStore = new AuthorisationStore(this.database);
    this.walletMasterContractService = new WalletMasterContractService(this.multiChainService);
    this.authorisationService = new AuthorisationService(this.authorisationStore, this.walletMasterContractService, this.multiChainService);
    this.devicesStore = new DevicesStore(this.database);
    this.devicesService = new DevicesService(this.devicesStore, this.walletMasterContractService);
    this.walletContractService = new WalletService(this.multiChainService, this.ensService, this.hooks, this.devicesService);
    this.messageRepository = new MessageSQLRepository(this.database);
    this.deploymentRepository = new SQLRepository(this.database, 'deployments');
    this.executionQueue = new QueueSQLStore(this.database);
    this.signaturesService = new SignaturesService(this.multiChainService);
    this.statusService = new MessageStatusService(this.messageRepository, this.signaturesService);
    this.messageHandler = new MessageHandler(this.multiChainService, this.authorisationStore, this.devicesService, this.hooks, this.messageRepository, this.statusService, this.executionQueue);
    this.messageExecutor = new MessageExecutor(this.multiChainService, this.messageRepository, this.messageHandler.onTransactionMined.bind(this.messageHandler));
    this.executionWorker = new ExecutionWorker(this.messageExecutor, this.executionQueue);
    this.deploymentHandler = new DeploymentHandler(this.walletContractService, this.deploymentRepository, this.executionQueue);
    this.app.use(bodyParser.json());
    this.app.use('/wallet', WalletRouter(this.deploymentHandler, this.messageHandler));
    this.app.use('/config', ConfigRouter(this.publicConfig));
    this.app.use('/authorisation', RequestAuthorisationRouter(this.authorisationService));
    this.app.use('/devices', DevicesRouter(this.devicesService));
    this.app.use(errorHandler);
    this.server = this.app.listen(this.port);
  }

  async stop() {
    await this.executionWorker.stop();
    await this.database.destroy();
    await this.server.close();
  }

  async stopLater() {
    await this.executionWorker.stopLater();
    await this.database.destroy();
    await this.server.close();
  }
}

export default Relayer;
