import {Router, Request} from 'express';
import {AddAuthorisationRequest} from '../../integration/sql/services/AuthorisationStore';
import {asyncHandler, sanitize, responseOf} from '@restless/restless';
import {asString, asObject} from '@restless/sanitizers';
import {asEthAddress} from '@restless/ethereum';
import {getDeviceInfo} from '../utils/getDeviceInfo';
import {AuthorisationRequest} from '@universal-login/commons';
import {asAuthorisationRequest} from '../utils/sanitizers';
import AuthorisationService from '../../core/services/AuthorisationService';
import bodyParser = require('body-parser');


const request = (authorisationService: AuthorisationService) =>
  async (data: {body: {key: string, walletContractAddress: string, network: string}}, req: Request) => {
    const addAuthorisationRequest: AddAuthorisationRequest = {...data.body, deviceInfo: getDeviceInfo(req)};
    const result = await authorisationService.addRequest(addAuthorisationRequest, data.body.network);
    return responseOf({response: result}, 201);
  };

const getPending = (authorisationService: AuthorisationService) =>
  async (data: {network: string, contractAddress: string, query: {signature: string}}) => {
    const authorisationRequest: AuthorisationRequest = {
      contractAddress: data.contractAddress,
      signature: data.query.signature
    };
    const result = await authorisationService.getAuthorisationRequests(authorisationRequest, data.network);
    return responseOf({response: result});
  };

const denyRequest = (authorisationService: AuthorisationService) =>
  async (data: {body: {authorisationRequest: AuthorisationRequest, network: string}}) => {
    const result = await authorisationService.removeAuthorisationRequest(data.body.authorisationRequest, data.body.network);
    return responseOf(result, 204);
  };

const cancelRequest = (authorisationService: AuthorisationService) =>
  async (data: {body: {authorisationRequest: AuthorisationRequest, network: string}}) => {
    const result = await authorisationService.cancelAuthorisationRequest(data.body.authorisationRequest, data.body.network);
    const httpCode = result === 0 ? 401 : 204;
    return responseOf(result, httpCode);
  };

export default (authorisationService: AuthorisationService) => {
  const router = Router();

  router.post('/', asyncHandler(
    sanitize({
      body: asObject({
        network: asString,
        walletContractAddress: asEthAddress,
        key: asString
      })
    }),
    request(authorisationService)
  ));

  router.get('/:network/:contractAddress', asyncHandler(
    sanitize({
      network: asString,
      contractAddress: asString,
      query: asObject({
        signature: asString
      }),
    }),
    getPending(authorisationService)
  ));

  router.post('/:contractAddress', asyncHandler(
    sanitize({
      body: asObject({
        authorisationRequest: asAuthorisationRequest,
        network: asString
      })
    }),
    denyRequest(authorisationService)
  ));

  router.delete('/:contractAddress', asyncHandler(
    sanitize({
      body: asObject({
        authorisationRequest: asAuthorisationRequest,
        network: asString
      })
    }),
    cancelRequest(authorisationService)
  ));

  return router;
};
