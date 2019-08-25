import React from 'react';
import {getWallets} from 'ethereum-waffle';
import Relayer from '@universal-login/relayer';
import {ETHER_NATIVE_TOKEN, ObservedToken} from '@universal-login/commons';
import {createAndSetWallet} from '@universal-login/sdk/testutils';
import App from '../../../src/ui/react/App';
import {AppPage} from '../pages/AppPage';
import {mountWithContext} from './CustomMount';
import {createPreconfiguredServices} from './ServicesUnderTests';

export const setupUI = async (relayer: Relayer, token?: ObservedToken) => {
  const name = 'name.mylogin.eth';
  const provider = relayer.multiChainService.getProvider('default');
  const [wallet] = await getWallets(provider);
  const tokens = token ? [token, {...ETHER_NATIVE_TOKEN, chainName: 'default'}] : [{...ETHER_NATIVE_TOKEN, chainName: 'default'}];
  const services = await createPreconfiguredServices(provider, relayer, tokens);
  await services.sdk.tokensDetailsStore.fetchTokensDetails();
  const {contractAddress} = await createAndSetWallet(name, services.walletService, wallet, services.sdk);
  const appWrapper = mountWithContext(<App/>, services, ['/']);
  const appPage = new AppPage(appWrapper);
  await appPage.login().waitForHomeView('1.9999999999995');
  return {appPage, services, contractAddress, appWrapper};
};
