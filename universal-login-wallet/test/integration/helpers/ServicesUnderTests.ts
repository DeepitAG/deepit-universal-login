import {createServices} from '../../../src/ui/createServices';
import {providers} from 'ethers';
import {testJsonRpcUrl} from '@universal-login/commons';
import {MockedStorageService} from './MockedStorageService';

export const createPreconfiguredServices = async (provider: providers.Provider, relayer: any, tokens: string[]) => {
  const domains = relayer.config.ensRegistrars;
  const config = {
    jsonRpcUrl: testJsonRpcUrl,
    relayerUrl: relayer.url(),
    domains,
    tokens,
  };
  const storageService = new MockedStorageService();
  const services = createServices(config, {provider, storageService});
  services.sdk.priceObserver.getCurrentPrices = () => {
    return Promise.resolve({ETH: {USD: 1, EUR: 1, BTC: 1}});
  };
  return services;
};
