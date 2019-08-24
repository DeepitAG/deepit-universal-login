import React from 'react';
import {providers} from 'ethers';
import UniversalLoginSDK, {WalletService} from '@universal-login/sdk';
import UserDropdownService from '../core/app/UserDropdownService';
import connectToWallet from '../core/services/ConnectToWallet';
import WalletPresenter from '../core/presenters/WalletPresenter';
import {ObservedToken} from '@universal-login/commons/lib';

interface Config {
  domains: string[];
  relayerUrl: string;
  jsonRpcUrl: string;
  tokens: ObservedToken[];
}

interface Overrides {
  provider?: providers.Provider;
}

export const createServices = (config: Config, {provider} : Overrides = {}) => {
  const sdkProvider = provider ? provider : new providers.JsonRpcProvider(config.jsonRpcUrl);
  const sdk = new UniversalLoginSDK(
    config.relayerUrl,
    sdkProvider,
    {
      paymentOptions: {},
      observedTokens: config.tokens
    }
  );
  const userDropdownService = new UserDropdownService();
  const walletService = new WalletService(sdk);
  const walletPresenter = new WalletPresenter(walletService);
  const _connectToWallet = connectToWallet(sdk, walletService);
  return {
    sdk,
    config,
    userDropdownService,
    connectToWallet: _connectToWallet,
    walletService,
    walletPresenter,
    start: () => sdk.start()
  };
};

export type Services = ReturnType<typeof createServices>;

export const ServiceContext = React.createContext({} as Services);
