import {Router, Request} from 'express';
import {asyncHandler, sanitize, responseOf} from '@restless/restless';
import {asString, asObject} from '@restless/sanitizers';
import {asEthAddress} from '@restless/ethereum';
import {RelayerRequest} from '@universal-login/commons';
import {getDeviceInfo} from '../utils/getDeviceInfo';
import {asRelayerRequest} from '../utils/sanitizers';
import AuthorisationService from '../../core/services/AuthorisationService';
import {AddAuthorisationRequest} from '../../core/models/AddAuthorisationRequest';


const request = (authorisationService: AuthorisationService) =>
  async (data: {body: {key: string, walletContractAddress: string, network: string}}, req: Request) => {
    const addAuthorisationRequest: AddAuthorisationRequest = {...data.body, deviceInfo: getDeviceInfo(req)};
    const result = await authorisationService.addRequest(addAuthorisationRequest, data.body.network);
    return responseOf({response: result}, 201);
  };

const getPending = (authorisationService: AuthorisationService) =>
  async (data: {network: string, contractAddress: string,  query: {signature: string}}) => {
    const authorisationRequest: RelayerRequest = {
      contractAddress: data.contractAddress,
      signature: data.query.signature
    };
    const result = await authorisationService.getAuthorisationRequests(authorisationRequest, data.network);
    return responseOf({response: result});
  };

const denyRequest = (authorisationService: AuthorisationService) =>
  async (data: {body: {authorisationRequest: RelayerRequest, network: string}}) => {
    const result = await authorisationService.removeAuthorisationRequests(data.body.authorisationRequest, data.body.network);
    return responseOf(result, 204);
  };

const cancelRequest = (authorisationService: AuthorisationService) =>
  async (data: {body: {authorisationRequest: RelayerRequest, network: string}}) => {
    const result = await authorisationService.cancelAuthorisationRequest(data.body.authorisationRequest, data.body.network);
    const httpCode = result === 0 ? 404 : 204;
    return responseOf({response: result}, httpCode);
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
        authorisationRequest: asRelayerRequest,
        network: asString
      })
    }),
    denyRequest(authorisationService)
  ));

  router.delete('/:contractAddress', asyncHandler(
    sanitize({
      body: asObject({
        authorisationRequest: asRelayerRequest,
        network: asString
      })
    }),
    cancelRequest(authorisationService)
  ));

  return router;
};
