import {providers} from 'ethers';
import {EventEmitter} from 'fbemitter';
import {SignedMessage, EMPTY_DEVICE_INFO} from '@universal-login/commons';
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
import {DevicesService} from './DevicesService';

class MessageHandler {
  private pendingMessages: PendingMessages;
  private queueService: QueueService;

  constructor(
    private multiChainService: MultiChainService,
    private authorisationStore: AuthorisationStore,
    private devicesService: DevicesService,
    private hooks: EventEmitter,
    messageRepository: IMessageRepository,
    queueStore: IQueueStore,
    messageExecutor: MessageExecutor,
    statusService: MessageStatusService
  ) {
    this.queueService = new QueueService(messageExecutor, queueStore, messageRepository, this.onTransactionMined.bind(this));
    this.pendingMessages = new PendingMessages(multiChainService, messageRepository, this.queueService, statusService);
  }

  start() {
    this.queueService.start();
  }

  async onTransactionMined(sentTransaction: providers.TransactionResponse, network: string) {
    const {data, to} = sentTransaction;
    const message = decodeDataForExecuteSigned(data);
    if (message.to === to) {
      if (isAddKeyCall(message.data as string)) {
        const key = getKeyFromData(message.data as string);
        await this.updateDevicesAndAuthorisations(to, key, network);
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

  private async updateDevicesAndAuthorisations(contractAddress: string, key: string, network: string) {
    const authorisationEntry = await this.authorisationStore.get(contractAddress, key);
    const deviceInfo = authorisationEntry ? authorisationEntry.deviceInfo : EMPTY_DEVICE_INFO;
    await this.authorisationStore.removeRequest(contractAddress, key, network);
    await this.devicesService.add(contractAddress, key, deviceInfo, network);
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
