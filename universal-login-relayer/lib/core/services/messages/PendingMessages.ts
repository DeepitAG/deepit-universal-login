import {Wallet, Contract} from 'ethers';
import {calculateMessageHash, SignedMessage, INVALID_KEY, ensure, MessageStatus} from '@universal-login/commons';
import WalletContract from '@universal-login/contracts/build/WalletMaster.json';
import {MessageStatusService} from './MessageStatusService';
import {DuplicatedSignature, InvalidSignature, DuplicatedExecution, NotEnoughSignatures} from '../../utils/errors';
import IMessageRepository from './IMessagesRepository';
import {getKeyFromHashAndSignature, createMessageItem} from '../../utils/utils';
import QueueService from './QueueService';
import {MultiChainService} from '../MultiChainService';

export default class PendingMessages {

  constructor(
    private multiChainService : MultiChainService,
    private messageRepository: IMessageRepository,
    private queueService: QueueService,
    private statusService: MessageStatusService
  ) {}

  async isPresent(messageHash : string, chainName: string) {
    return this.messageRepository.isPresent(messageHash, chainName);
  }

  async add(message: SignedMessage, chainName: string) : Promise<MessageStatus> {
    const messageHash = calculateMessageHash(message);
    if (!await this.isPresent(messageHash, chainName)) {
      const messageItem = createMessageItem(message);
      await this.messageRepository.add(messageHash, messageItem, chainName);
    }
    await this.addSignatureToPendingMessage(messageHash, message, chainName);
    const status = await this.getStatus(messageHash, chainName);
    status.messageHash = messageHash;
    if (await this.isEnoughSignatures(messageHash, chainName)) {
      await this.onReadyToExecute(messageHash, message, chainName);
    }
    return status;
  }

  private async onReadyToExecute(messageHash: string, message: SignedMessage, chainName: string) {
    await this.ensureCorrectExecution(messageHash, chainName);
    return this.queueService.add(message, chainName);
  }

  private async addSignatureToPendingMessage(messageHash: string, message: SignedMessage, chainName: string) {
    const wallet = this.multiChainService.getWallet(chainName);
    const messageItem = await this.messageRepository.get(messageHash, chainName);
    ensure(!messageItem.transactionHash, DuplicatedExecution);
    const isContainSignature = await this.messageRepository.containSignature(messageHash, message.signature, chainName);
    ensure(!isContainSignature, DuplicatedSignature);
    await this.ensureCorrectKeyPurpose(message, messageItem.walletAddress, wallet);
    await this.messageRepository.addSignature(messageHash, message.signature, chainName);
  }

  private async ensureCorrectKeyPurpose(message: SignedMessage, walletAddress: string, wallet: Wallet) {
    const key = getKeyFromHashAndSignature(
      calculateMessageHash(message),
      message.signature
    );
    const walletContract = new Contract(walletAddress, WalletContract.interface, wallet);
    const keyPurpose = await walletContract.getKeyPurpose(key);
    ensure(!keyPurpose.eq(INVALID_KEY), InvalidSignature, 'Invalid key purpose');
  }

  async getStatus(messageHash: string, chainName: string) {
    return this.statusService.getStatus(messageHash, chainName);
  }

  async ensureCorrectExecution(messageHash: string, chainName: string) {
    const {required, transactionHash, totalCollected} = await this.statusService.getStatus(messageHash, chainName);
    ensure(!transactionHash, DuplicatedExecution);
    ensure(await this.isEnoughSignatures(messageHash, chainName), NotEnoughSignatures, required, totalCollected);
  }

  async isEnoughSignatures(messageHash: string, chainName: string) : Promise<boolean> {
    const {totalCollected, required} = await this.getStatus(messageHash, chainName);
    return totalCollected >= required;
  }
}
