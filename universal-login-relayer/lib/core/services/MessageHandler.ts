import {providers} from 'ethers';
import {EventEmitter} from 'fbemitter';
import {SignedMessage, EMPTY_DEVICE_INFO} from '@universal-login/commons';
import {isAddKeyCall, decodeParametersFromData, isAddKeysCall, isRemoveKeyCall} from '../utils/encodeData';
import AuthorisationStore from '../../integration/sql/services/AuthorisationStore';
import QueueService from './messages/QueueService';
import PendingMessages from './messages/PendingMessages';
import {decodeDataForExecuteSigned} from '../utils/messages/serialisation';
import MessageExecutor from '../../integration/ethereum/MessageExecutor';
import IMessageRepository from './messages/IMessagesRepository';
import IQueueStore from './messages/IQueueStore';
import {MessageStatusService} from './messages/MessageStatusService';
import {MultiChainService} from '../../core/services/MultiChainService';
import {DevicesService} from './DevicesService';
import {GasValidator} from './validators/GasValidator';

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
    statusService: MessageStatusService,
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
        const [key] = decodeParametersFromData(message.data as string, ['address']);
        await this.updateDevicesAndAuthorisations(to, key, network);
        this.hooks.emit('added', {transaction: sentTransaction, contractAddress: to});
      } else if (isRemoveKeyCall(message.data as string)) {
        const [key] = decodeParametersFromData(message.data as string, ['address']);
        await this.devicesService.remove(to, key, network);
      } else if (isAddKeysCall(message.data as string)) {
        const [keys] = decodeParametersFromData(message.data as string, ['address[]']);
        for (const key of keys) {
          await this.updateDevicesAndAuthorisations(to, key, network);
        }
        this.hooks.emit('keysAdded', {transaction: sentTransaction, contractAddress: to});
      }
    }
  }

  async handleMessage(message: SignedMessage, network: string) {
    const maxGasLimit = this.multiChainService.getMaxGasLimit(network);
    console.log(maxGasLimit);
    const gasValidator = new GasValidator(maxGasLimit);
    await gasValidator.validate(message);
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
