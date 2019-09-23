import {Wallet, Contract} from 'ethers';
import {calculateMessageHash, SignedMessage, ensure, MessageStatus} from '@universal-login/commons';
import WalletContract from '@universal-login/contracts/build/Wallet.json';
import {MessageStatusService} from './MessageStatusService';
import {DuplicatedSignature, InvalidSignature, DuplicatedExecution, NotEnoughSignatures} from '../../utils/errors';
import IMessageRepository from './IMessagesRepository';
import {getKeyFromHashAndSignature} from '../../utils/encodeData';
import QueueService from './QueueService';
import {MultiChainService} from '../MultiChainService';
import {createMessageItem} from '../../utils/messages/serialisation';
import console = require('console');

export default class PendingMessages {

  constructor(
    private multiChainService : MultiChainService,
    private messageRepository: IMessageRepository,
    private queueService: QueueService,
    private statusService: MessageStatusService
  ) {}

  async isPresent(messageHash : string, network: string) {
    return this.messageRepository.isPresent(messageHash, network);
  }

  async add(message: SignedMessage, network: string) : Promise<MessageStatus> {
    const messageHash = calculateMessageHash(message);
    if (!await this.isPresent(messageHash, network)) {
      const messageItem = createMessageItem(message);
      await this.messageRepository.add(messageHash, messageItem, network);
    }
    await this.addSignatureToPendingMessage(messageHash, message, network);
    const status = await this.getStatus(messageHash, network);
    status.messageHash = messageHash;
    if (await this.isEnoughSignatures(messageHash, network)) {
      await this.onReadyToExecute(messageHash, message, network);
    }
    return status;
  }

  private async onReadyToExecute(messageHash: string, message: SignedMessage, network: string) {
    await this.ensureCorrectExecution(messageHash, network);
    return this.queueService.add(message, network);
  }

  private async addSignatureToPendingMessage(messageHash: string, message: SignedMessage, network: string) {
    const wallet = this.multiChainService.getWallet(network);
    const messageItem = await this.messageRepository.get(messageHash, network);
    ensure(!messageItem.transactionHash, DuplicatedExecution);
    const isContainSignature = await this.messageRepository.containSignature(messageHash, message.signature, network);
    ensure(!isContainSignature, DuplicatedSignature);
    await this.ensureKeyExist(message, messageItem.walletAddress, wallet);
    await this.messageRepository.addSignature(messageHash, message.signature, network);
  }

  private async ensureKeyExist(message: SignedMessage, walletAddress: string, wallet: Wallet) {
    const key = getKeyFromHashAndSignature(
      calculateMessageHash(message),
      message.signature
    );
    const walletContract = new Contract(walletAddress, WalletContract.interface, wallet);
    ensure(await walletContract.keyExist(key), InvalidSignature, 'Invalid key');
  }

  async getStatus(messageHash: string, network: string) {
    return this.statusService.getStatus(messageHash, network);
  }

  async ensureCorrectExecution(messageHash: string, network: string) {
    const {required, transactionHash, totalCollected} = await this.statusService.getStatus(messageHash, network);
    ensure(!transactionHash, DuplicatedExecution);
    ensure(await this.isEnoughSignatures(messageHash, network), NotEnoughSignatures, required, totalCollected);
  }

  async isEnoughSignatures(messageHash: string, network: string) : Promise<boolean> {
    const {totalCollected, required} = await this.getStatus(messageHash, network);
    return totalCollected >= required;
  }
}
