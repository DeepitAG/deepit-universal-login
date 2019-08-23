import {providers} from 'ethers';
import {SignedMessage} from '@universal-login/commons';
import {MultiChainService} from '../../core/services/MultiChainService';
import {messageToTransaction} from '../../core/utils/utils';
import MessageValidator from '../../core/services/messages/MessageValidator';

export class MessageExecutor {

  constructor(private multiChainService: MultiChainService) {
  }

  async execute(signedMessage: SignedMessage, chainName: string): Promise<providers.TransactionResponse> {
    const transactionReq: providers.TransactionRequest = messageToTransaction(signedMessage);
    const wallet = this.multiChainService.getWallet(chainName);
    const contractWhitelist = this.multiChainService.getContractWhiteList(chainName);
    const messageValidator = new MessageValidator(wallet, contractWhitelist);
    await messageValidator.validate(signedMessage, transactionReq);
    return wallet.sendTransaction(transactionReq);
  }
}

export default MessageExecutor;
