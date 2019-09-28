import {Wallet, providers} from 'ethers';
import {SignedMessage, ensureNotNull} from '@universal-login/commons';
import {messageToTransaction} from '../../core/utils/messages/serialisation';
import {QueueItem} from '../../core/models/QueueItem';
import {IExecutor} from '../../core/services/execution/IExecutor';
import IMessageRepository from '../../core/services/messages/IMessagesRepository';
import {TransactionHashNotFound} from '../../core/utils/errors';
import {MultiChainService} from '../../core/services/MultiChainService';
import MessageExecutionValidator from './validators/MessageExecutionValidator';

export type OnTransactionMined = (transaction: providers.TransactionResponse, network: string) => Promise<void>;

export class MessageExecutor implements IExecutor<SignedMessage> {

  constructor(
    private multiChainService: MultiChainService,
    private messageRepository: IMessageRepository,
    private onTransactionMined: OnTransactionMined,
  ) {}

  canExecute(item: QueueItem): boolean {
    return item.type === 'Message';
  }

  async handleExecute(messageHash: string, network: string) {
    try {
      const signedMessage = await this.messageRepository.getMessage(messageHash, network);
      const transactionResponse = await this.execute(signedMessage, network);
      const {hash, wait} = transactionResponse;
      ensureNotNull(hash, TransactionHashNotFound);
      await this.messageRepository.markAsPending(messageHash, hash!, network);
      await wait();
      await this.onTransactionMined(transactionResponse, network);
      await this.messageRepository.setMessageState(messageHash, 'Success', network);
    } catch (error) {
      const errorMessage = `${error.name}: ${error.message}`;
      await this.messageRepository.markAsError(messageHash, errorMessage, network);
    }
  }

  async execute(signedMessage: SignedMessage, network: string): Promise<providers.TransactionResponse> {
    const transactionReq: providers.TransactionRequest = messageToTransaction(signedMessage);
    const wallet = this.multiChainService.getWallet(network);
    const contractWhitelist = this.multiChainService.getContractWhiteList(network);
    const messageValidator = new MessageExecutionValidator(wallet, contractWhitelist);
    await messageValidator.validate(signedMessage);
    return wallet.sendTransaction(transactionReq);
  }
}

export default MessageExecutor;
