import {providers} from 'ethers';
import {SignedMessage} from '@universal-login/commons';
import {MultiChainService} from '../../core/services/MultiChainService';
import {messageToTransaction} from '../../core/utils/messages/serialisation';
import MessageExecutionValidator from './validators/MessageExecutionValidator';

export class MessageExecutor {

  constructor(private multiChainService: MultiChainService) {
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
