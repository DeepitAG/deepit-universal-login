import {Router, Request} from 'express';
import {AddAuthorisationRequest} from '../../integration/sql/services/AuthorisationStore';
import {asyncHandler, sanitize, responseOf, asString, asObject} from '@restless/restless';
import {getDeviceInfo} from '../utils/getDeviceInfo';
import {AuthorisationRequest} from '@universal-login/commons';
import {asAuthorisationRequest} from '../utils/sanitizers';
import AuthorisationService from '../../core/services/AuthorisationService';
import bodyParser = require('body-parser');


const request = (authorisationService: AuthorisationService) =>
  async (data: {body: {key: string, walletContractAddress: string, chainName: string}}, req: Request) => {
    const addAuthorisationRequest: AddAuthorisationRequest = {...data.body, deviceInfo: getDeviceInfo(req)};
    const result = await authorisationService.addRequest(addAuthorisationRequest, data.body.chainName);
    return responseOf({response: result}, 201);
  };

const getPending = (authorisationService: AuthorisationService) =>
  async (data: {chainName: string, contractAddress: string, query: {signature: string}}) => {
    const authorisationRequest: AuthorisationRequest = {
      contractAddress: data.contractAddress,
      signature: data.query.signature
    };
    const result = await authorisationService.getAuthorisationRequests(authorisationRequest, data.chainName);
    return responseOf({response: result});
  };

const denyRequest = (authorisationService: AuthorisationService) =>
  async (data: {body: {authorisationRequest: AuthorisationRequest, chainName: string}}) => {
    const result = await authorisationService.removeAuthorisationRequest(data.body.authorisationRequest, data.body.chainName);
    return responseOf(result, 204);
  };

export default (authorisationService: AuthorisationService) => {
  const router = Router();

  router.post('/', asyncHandler(
    sanitize({
      body: asObject({
        walletContractAddress: asString,
        key: asString,
        chainName: asString
      })
    }),
    request(authorisationService)
  ));

  router.get('/:chainName/:contractAddress', asyncHandler(
    sanitize({
      chainName: asString,
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
        chainName: asString
      })
    }),
    denyRequest(authorisationService)
  ));

  return router;
};
