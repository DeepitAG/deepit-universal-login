import {createServices} from '../../../src/ui/createServices';
import {providers} from 'ethers';
import {testJsonRpcUrl} from '@universal-login/commons';
import {ObservedToken} from '@universal-login/commons/lib';

export const createPreconfiguredServices = async (provider: providers.Provider, relayer: any, tokens: ObservedToken[]) => {
    const domains = relayer.config.ensRegistrars;
    const config = {
      jsonRpcUrl: testJsonRpcUrl,
      relayerUrl: relayer.url(),
      domains,
      tokens
    };
    return createServices(config, {provider});
};
