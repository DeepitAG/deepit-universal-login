import path from 'path';
import {utils} from 'ethers';
import {getEnv, ETHER_NATIVE_TOKEN} from '@universal-login/commons';
import {Config} from './relayer';

export const config: Config =  Object.freeze({
  port: getEnv('PORT', ''),
  privateKey: getEnv('PRIVATE_KEY', ''),
  ensRegistrars: [
    getEnv('ENS_DOMAIN_1', ''),
    getEnv('ENS_DOMAIN_2', ''),
    getEnv('ENS_DOMAIN_3', ''),
  ],
  walletMasterAddress: getEnv('WALLET_MASTER_ADDRESS', ''),
  contractWhiteList: {
    master: [],
    proxy: ['0xca33d06bff615ad98056f8f720c57042cd3e820985235a3f77b73067c451cd3e']
  },
  localization: {
    language: 'en',
    country: 'any'
  },
  onRampProviders: {
    safello: {
      appId: '1234-5678',
      baseAddress: 'https://app.s4f3.io/sdk/quickbuy.html',
      addressHelper: true
    },
    ramp: {
      appName: 'Universal Login',
      logoUrl: 'https://universalloginsdk.readthedocs.io/en/latest/_images/logo.png',
      rampUrl: 'https://ri-widget-staging-ropsten.firebaseapp.com/'
    }
  },
  database: {
    client: 'postgresql',
    connection: getEnv('DATABASE_URL', ''),
    migrations: {
      directory: path.join(__dirname, '../integration/sql/migrations'),
    }
  },
  networkConf: {
    kovan: {
      jsonRpcUrl: getEnv('JSON_RPC_URL', ''),
      factoryAddress: getEnv('FACTORY_ADDRESS', ''),
      chainSpec: Object.freeze({
        ensAddress: getEnv('ENS_ADDRESS', ''),
        chainId: 0,
        name: 'ganache'
      }),
      supportedTokens: [{
        address: ETHER_NATIVE_TOKEN.address,
        minimalAmount: utils.parseEther('0.005').toString()
      }],
    }
  },
});

export default config;
