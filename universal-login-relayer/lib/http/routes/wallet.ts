import {Router} from 'express';
import WalletService from '../../integration/ethereum/WalletService';
import MessageHandler from '../../core/services/MessageHandler';
import {SignedMessage, DeployArgs} from '@universal-login/commons';
import {asyncHandler, sanitize, responseOf, asString, asObject} from '@restless/restless';
import {asBigNumberish, asArrayish} from '../utils/sanitizers';

const execution = (messageHandler : MessageHandler) =>
  async (data: {body: {signedMessage: SignedMessage, chainName: string}}) => {
    const status = await messageHandler.handleMessage(data.body.signedMessage, data.body.chainName);
    return responseOf({status}, 201);
  };

const getStatus = (messageHandler: MessageHandler) =>
  async (data: {messageHash: string, chainName: string}) => {
    const status = await messageHandler.getStatus(data.messageHash, data.chainName);
    return responseOf(status);
  };

const deploy = (walletContractService: WalletService) =>
  async (data: {body: DeployArgs}) => {
    const {publicKey, ensName, gasPrice, signature, chainName} = data.body;
    const transaction = await walletContractService.deploy({publicKey, ensName, gasPrice, signature, chainName});
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
          gasLimit: asBigNumberish,
          gasPrice: asBigNumberish,
          data: asArrayish,
          value: asBigNumberish,
          signature: asString
        }),
        chainName: asString
      })
    }),
    execution(messageHandler)
  ));

  router.get('/execution/:chainName/:messageHash', asyncHandler(
    sanitize({
      messageHash: asString,
      chainName: asString
    }),
    getStatus(messageHandler)
  ));

  router.post('/deploy', asyncHandler(
    sanitize({
      body: asObject({
        publicKey: asString,
        ensName: asString,
        gasPrice: asString,
        signature: asString,
        chainName: asString
      })
    }),
    deploy(walletContractService)
  ));

  return router;
};
