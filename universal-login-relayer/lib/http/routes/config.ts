import {Router, Request, Response} from 'express';
import asyncMiddleware from '../middlewares/async_middleware';
import {Config} from '../../config/relayer';
import {PublicRelayerConfig, PublicNetworkConfig} from '@universal-login/commons';

export function getPublicNetworkConfig(config: Config): PublicNetworkConfig {
  const networkConfig = config.networkConfig;
  const publicNetworkConfig: PublicNetworkConfig = {};
  for (const property in networkConfig) {
    const {factoryAddress, chainSpec, supportedTokens, ensRegistrars, walletContractAddress, contractWhiteList} = networkConfig[property];
    publicNetworkConfig[property] = {factoryAddress, chainSpec, supportedTokens, ensRegistrars, walletContractAddress, contractWhiteList};
  }
  return publicNetworkConfig;
}

export function getPublicConfig(config: Config): PublicRelayerConfig {
  const {localization, onRampProviders} = config;
  const networkConfig = getPublicNetworkConfig(config);
  return {
    localization,
    onRampProviders,
    networkConfig
  };
}

export const network = (config: PublicRelayerConfig) => async (req: Request, res: Response) => {
  res.status(200)
    .type('json')
    .send({config});
};

export default (config: PublicRelayerConfig) => {
  const router = Router();

  router.get('/',
    asyncMiddleware(network(config)));

  return router;
};
