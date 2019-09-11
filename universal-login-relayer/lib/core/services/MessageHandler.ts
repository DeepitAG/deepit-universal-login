import {providers} from 'ethers';
import {EventEmitter} from 'fbemitter';
import {SignedMessage, DecodedMessageWithFrom} from '@universal-login/commons';
import {isAddKeyCall, getKeyFromData, isAddKeysCall} from '../utils/utils';
import AuthorisationStore from '../../integration/sql/services/AuthorisationStore';
import QueueService from './messages/QueueService';
import PendingMessages from './messages/PendingMessages';
import {decodeDataForExecuteSigned} from '../utils/messages/serialisation';
import MessageExecutor from '../../integration/ethereum/MessageExecutor';
import IMessageRepository from './messages/IMessagesRepository';
import IQueueStore from './messages/IQueueStore';
import {MessageStatusService} from './messages/MessageStatusService';
import {MultiChainService} from '../../core/services/MultiChainService';
import {ensureChainSupport} from '../../integration/ethereum/validations';

class MessageHandler {
  private pendingMessages: PendingMessages;
  private queueService: QueueService;

  constructor(
    private multiChainService: MultiChainService,
    private authorisationStore: AuthorisationStore,
    private hooks: EventEmitter,
    messageRepository: IMessageRepository,
    queueStore: IQueueStore,
    messageExecutor: MessageExecutor,
    statusService: MessageStatusService
  ) {
    this.queueService = new QueueService(messageExecutor, queueStore, messageRepository, this.onTransactionSent.bind(this));
    this.pendingMessages = new PendingMessages(multiChainService, messageRepository, this.queueService, statusService);
  }

  start() {
    this.queueService.start();
  }

  async onTransactionSent(sentTransaction: providers.TransactionResponse, network: string) {
    const {data, to} = sentTransaction;
    const message = decodeDataForExecuteSigned(data);
    if (message.to === to) {
      if (isAddKeyCall(message.data as string)) {
        await this.removeReqFromAuthService({...message, from: to}, network);
        this.hooks.emit('added', {transaction: sentTransaction, contractAddress: to, network});
      } else if (isAddKeysCall(message.data as string)) {
        this.hooks.emit('keysAdded', {transaction: sentTransaction, contractAddress: to, network});
      }
    }
  }

  async handleMessage(message: SignedMessage, network: string) {
    ensureChainSupport(this.multiChainService.networkConfig, network);
    return this.pendingMessages.add(message, network);
  }

  private async removeReqFromAuthService(message: DecodedMessageWithFrom, network: string) {
    const key = getKeyFromData(message.data as string);
    return this.authorisationStore.removeRequest(message.from, key, network);
  }

  async getStatus(messageHash: string, network: string) {
    if (!await this.pendingMessages.isPresent(messageHash, network)) {
      return null;
    }
    return this.pendingMessages.getStatus(messageHash, network);
  }

  async stop() {
    await this.queueService.stop();
  }

  async stopLater() {
    return this.queueService.stopLater();
  }
}

export default MessageHandler;
