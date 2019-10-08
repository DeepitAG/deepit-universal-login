import {Router, Request} from 'express';
import MessageHandler from '../../core/services/MessageHandler';
import {SignedMessage, DeployArgs} from '@universal-login/commons';
import {asyncHandler, sanitize, responseOf} from '@restless/restless';
import {asString, asObject} from '@restless/sanitizers';
import {asEthAddress, asBigNumber} from '@restless/ethereum';
import {asArrayish} from '../utils/sanitizers';
import {getDeviceInfo} from '../utils/getDeviceInfo';
import DeploymentHandler from '../../core/services/DeploymentHandler';

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

const deploy = (deploymentHandler: DeploymentHandler) =>
  async (data: {body: DeployArgs & {applicationName: string}}, req: Request) => {
    const {applicationName, ...deployArgs} = data.body;
    const deviceInfo = getDeviceInfo(req, applicationName);
    const transaction = await deploymentHandler.handleDeployment(deployArgs, deviceInfo);
    return responseOf(transaction, 201);
  };

export default (deploymentHandler : DeploymentHandler, messageHandler: MessageHandler) => {
  const router = Router();

  router.post('/execution', asyncHandler(
    sanitize({
      body: asObject({
        signedMessage: asObject({
          gasToken: asString,
          to: asEthAddress,
          from: asEthAddress,
          nonce: asString,
          gasLimitExecution: asBigNumber,
          gasPrice: asBigNumber,
          gasData: asBigNumber,
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
        network: asString,
        applicationName: asString
      })
    }),
    deploy(deploymentHandler)
  ));

  return router;
};
