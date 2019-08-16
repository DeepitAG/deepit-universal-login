import {Wallet, providers} from 'ethers';
import {SignedMessage} from '@universal-login/commons';
import {MultiChainProvider} from './MultiChainProvider';
import {messageToTransaction} from '../../core/utils/utils';
import MessageValidator from '../../core/services/messages/MessageValidator';

export class MessageExecutor {

  constructor(private multiChainProvider: MultiChainProvider, private messageValidator: MessageValidator) {
  }

  async execute(signedMessage: SignedMessage, chainName: string): Promise<providers.TransactionResponse> {
    const transactionReq: providers.TransactionRequest = messageToTransaction(signedMessage);
    const wallet = this.multiChainProvider.getWallet(chainName);
    await this.messageValidator.validate(signedMessage, transactionReq, chainName);
    return wallet.sendTransaction(transactionReq);
  }
}

export default MessageExecutor;
