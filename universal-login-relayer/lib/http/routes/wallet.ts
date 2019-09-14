import {Router} from 'express';
import WalletService from '../../integration/ethereum/WalletService';
import MessageHandler from '../../core/services/MessageHandler';
import {SignedMessage, DeployArgs} from '@universal-login/commons';
import {asyncHandler, sanitize, responseOf} from '@restless/restless';
import {asString, asObject} from '@restless/sanitizers';
import {asEthAddress, asBigNumber} from '@restless/ethereum';
import {asArrayish} from '../utils/sanitizers';

const execution = (messageHandler : MessageHandler) =>
  async (data: {body: {signedMessage: SignedMessage, network: string}}) => {
    const status = await messageHandler.handleMessage(data.body.signedMessage, data.body.network);
    return responseOf({status}, 201);
  };

const getStatus = (messageHandler: MessageHandler) =>
  async (data: {messageHash: string, network: string}) => {
    const status = await messageHandler.getStatus(data.messageHash, data.network);
    return responseOf(status);
  };

const deploy = (walletContractService: WalletService) =>
  async (data: {body: DeployArgs}) => {
    const {publicKey, ensName, gasPrice, gasToken, signature, network} = data.body;
    const transaction = await walletContractService.deploy({publicKey, ensName, gasPrice, gasToken, signature, network});
    return responseOf(transaction, 201);
  };

export default (walletContractService : WalletService, messageHandler: MessageHandler) => {
  const router = Router();

  router.post('/execution', asyncHandler(
    sanitize({
      body: asObject({
        signedMessage: asObject({
          gasToken: asString,
          to: asString,
          from: asString,
          nonce: asString,
          gasLimitExecution: asBigNumber,
          gasLimit: asBigNumber,
          gasPrice: asBigNumber,
          data: asArrayish,
          value: asBigNumber,
          signature: asString
        }),
        network: asString
      })
    }),
    execution(messageHandler)
  ));

  router.get('/execution/:network/:messageHash', asyncHandler(
    sanitize({
      messageHash: asString,
      network: asString
    }),
    getStatus(messageHandler)
  ));

  router.post('/deploy', asyncHandler(
    sanitize({
      body: asObject({
        publicKey: asEthAddress,
        ensName: asString,
        gasPrice: asString,
        gasToken: asString,
        signature: asString,
        network: asString
      })
    }),
    deploy(walletContractService)
  ));

  return router;
};
