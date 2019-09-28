import Knex from 'knex';
import {EventEmitter} from 'fbemitter';
import {loadFixture} from 'ethereum-waffle';
import MessageHandler from '../../lib/core/services/MessageHandler';
import QueueSQLStore from '../../lib/integration/sql/services/QueueSQLStore';
import AuthorisationStore from '../../lib/integration/sql/services/AuthorisationStore';
import basicWalletContractWithMockToken from '../fixtures/basicWalletContractWithMockToken';
import MessageSQLRepository from '../../lib/integration/sql/services/MessageSQLRepository';
import {MessageStatusService} from '../../lib/core/services/messages/MessageStatusService';
import {SignaturesService} from '../../lib/integration/ethereum/SignaturesService';
import MessageExecutor from '../../lib/integration/ethereum/MessageExecutor';
import {DevicesStore} from '../../lib/integration/sql/services/DevicesStore';
import {DevicesService} from '../../lib/core/services/DevicesService';
import WalletMasterContractService from '../../lib/integration/ethereum/services/WalletMasterContractService';
import {Config} from '../../lib';
import ExecutionWorker from '../../lib/core/services/messages/ExecutionWorker';

export default async function setupMessageService(knex: Knex, config: Config) {
  const {multiChainService, wallet, actionKey, provider, mockToken, walletContract, otherWallet} = await loadFixture(basicWalletContractWithMockToken);
  const hooks = new EventEmitter();
  const authorisationStore = new AuthorisationStore(knex);
  const messageRepository = new MessageSQLRepository(knex);
  const devicesStore = new DevicesStore(knex);
  const executionQueue = new QueueSQLStore(knex);
  const walletMasterContractService = new WalletMasterContractService(multiChainService);
  const devicesService = new DevicesService(devicesStore, walletMasterContractService);
  const signaturesService = new SignaturesService(multiChainService);
  const statusService = new MessageStatusService(messageRepository, signaturesService);
  const messageHandler = new MessageHandler(multiChainService, authorisationStore, devicesService, hooks, messageRepository, statusService, executionQueue);
  const messageExecutor = new MessageExecutor(multiChainService, messageRepository, messageHandler.onTransactionMined.bind(messageHandler));
  const executionWorker = new ExecutionWorker(messageExecutor, executionQueue);
  return { multiChainService, wallet, actionKey, provider, mockToken, authorisationStore, devicesStore, messageHandler, walletContract, otherWallet, executionWorker };
}
