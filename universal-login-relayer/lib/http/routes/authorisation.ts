import {Router, Request} from 'express';
import {AuthorisationRequest} from '../../integration/sql/services/AuthorisationStore';
import {asyncHandler, sanitize, responseOf, asString, asObject} from '@restless/restless';
import {getDeviceInfo} from '../utils/getDeviceInfo';
import {CancelAuthorisationRequest, GetAuthorisationRequest} from '@universal-login/commons';
import { asCancelAuthorisationRequest } from '../utils/sanitizers';
import AuthorisationService from '../../core/services/AuthorisationService';


const request = (authorisationService: AuthorisationService) =>
  async (data: {body: {key: string, walletContractAddress: string, chainName: string}}, req: Request) => {
    const requestAuthorisation: AuthorisationRequest = {...data.body, deviceInfo: getDeviceInfo(req)};
    const result = await authorisationService.addRequest(requestAuthorisation, data.body.chainName);
    return responseOf({response: result}, 201);
  };

const getPending = (authorisationService: AuthorisationService) =>
  async (data: {chainName: string, walletContractAddress: string, query: {signature: string}}) => {
    const getAuthorisationRequest: GetAuthorisationRequest = {
      walletContractAddress: data.walletContractAddress,
      signature: data.query.signature
    };
    const result = await authorisationService.getAuthorisationRequests(getAuthorisationRequest, data.chainName);
    return responseOf({response: result});
  };

const denyRequest = (authorisationService: AuthorisationService) =>
  async (data: {body: {cancelAuthorisationRequest: CancelAuthorisationRequest, chainName: string}}) => {
    const result = await authorisationService.removeAuthorisationRequest(data.body.cancelAuthorisationRequest, data.body.chainName);
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

  router.get('/:chainName/:walletContractAddress', asyncHandler(
    sanitize({
      chainName: asString,
      walletContractAddress: asString,
      query: asObject({
        signature: asString
      }),
    }),
    getPending(authorisationService)
  ));

  router.post('/:walletContractAddress', asyncHandler(
    sanitize({
      body: asObject({
        cancelAuthorisationRequest: asCancelAuthorisationRequest,
        chainName: asString
      })
    }),
    denyRequest(authorisationService)
  ));

  return router;
};
