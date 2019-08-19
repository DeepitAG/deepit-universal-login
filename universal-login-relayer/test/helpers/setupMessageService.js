import {EventEmitter} from 'fbemitter';
import {loadFixture} from 'ethereum-waffle';
import MessageHandler from '../../lib/core/services/MessageHandler';
import QueueSQLStore from '../../lib/integration/sql/services/QueueSQLStore';
import AuthorisationStore from '../../lib/integration/sql/services/AuthorisationStore';
import basicWalletContractWithMockToken from '../fixtures/basicWalletContractWithMockToken';
import MessageSQLRepository from '../../lib/integration/sql/services/MessageSQLRepository';
import {MessageStatusService} from '../../lib/core/services/messages/MessageStatusService';
import {SignaturesService} from '../../lib/integration/ethereum/SignaturesService';
import MessageValidator from '../../lib/core/services/messages/MessageValidator';
import MessageExecutor from '../../lib/integration/ethereum/MessageExecutor';

export default async function setupMessageService(knex) {
  const {multiChainProvider, wallet, actionKey, provider, mockToken, walletContract, otherWallet} = await loadFixture(basicWalletContractWithMockToken);
  const hooks = new EventEmitter();
  const authorisationStore = new AuthorisationStore(knex);
  const messageRepository = new MessageSQLRepository(knex);
  const queueStore = new QueueSQLStore(knex);
  const signaturesService = new SignaturesService(multiChainProvider);
  const statusService = new MessageStatusService(messageRepository, signaturesService);
  const messageValidator = new MessageValidator(multiChainProvider);
  const messageExecutor = new MessageExecutor(multiChainProvider, messageValidator);
  const messageHandler = new MessageHandler(multiChainProvider, authorisationStore, hooks, messageRepository, queueStore, messageExecutor, statusService);
  return { wallet, actionKey, provider, mockToken, authorisationStore, messageHandler, walletContract, otherWallet };
}
