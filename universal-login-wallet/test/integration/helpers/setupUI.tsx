import React from 'react';
import {utils} from 'ethers';
import {getWallets} from 'ethereum-waffle';
import Relayer from '@universal-login/relayer';
import {ETHER_NATIVE_TOKEN, ObservedToken} from '@universal-login/commons';
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

  const [privateKey, contractAddress] = await services.sdk.create(name);
  await wallet.sendTransaction({to: contractAddress, value: utils.parseEther('2.0')});
  services.walletService.connect({name, contractAddress, privateKey});
  const appWrapper = mountWithContext(<App/>, services, ['/']);
  const appPage = new AppPage(appWrapper);
  await appPage.login().waitForHomeView('2.0');
  return {appPage, services, contractAddress, appWrapper};
};
