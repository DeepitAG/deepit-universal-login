import path from 'path';
import {Config} from './relayer';

export const config: Config =  Object.freeze({
  port: 'GENERATED',
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
      rampUrl: 'https://ri-widget-staging.firebaseapp.com/'
    }
  },
  database: {
    client: 'postgresql',
    connection: {
      database: 'universal_login_relayer_test',
      user: 'postgres',
      password: 'postgres',
    },
    migrations: {
      directory: path.join(__dirname, '../integration/sql/migrations'),
    }
  },
  networkConfig: {
    default: {
      jsonRpcUrl: 'GENERATED',
      factoryAddress: 'GENERATED',
      chainSpec: {
        name: 'test',
        ensAddress: 'GENERATED',
        chainId: 0,
      },
      supportedTokens: [{
        address: 'GENERATED',
        minimalAmount: 'GENERATED'
      }],
      privateKey: 'GENERATED',
      ensRegistrars: ['GENERATED'],
      walletMasterAddress: 'GENERATED',
      contractWhiteList: {
        proxy: ['GENERATED'],
        master: ['GENERATED']
      },
    }
  },
});

export default config;
