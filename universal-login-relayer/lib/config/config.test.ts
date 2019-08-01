import path from 'path';
import {Config} from './relayer';

export const config: Config =  Object.freeze({
  port: 'GENERATED',
  privateKey: 'GENERATED',
  chainSpec: {
    name: 'test',
    ensAddress: 'GENERATED',
    chainId: 0,
  },
  ensRegistrars: ['GENERATED'],
  walletMasterAddress: 'GENERATED',
  contractWhiteList: {
    proxy: ['GENERATED'],
    master: ['GENERATED']
  },
  factoryAddress: 'GENERATED',
  supportedTokens: [{
    address: 'GENERATED',
    minimalAmount: 'GENERATED'
  }],
  localization: {
    language: 'en',
    country: 'any'
  },
  onRampProviders: {
    safello: {
      appId: '1234-5678',
      baseAddress: 'https://app.s4f3.io/sdk/quickbuy.html',
      addressHelper: true
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
  networks: {
    development: {
      uri: "GENERATED",
      factoryAddress: "GENERATED",
      chainSpec: {
        name: 'test',
        ensAddress: 'GENERATED',
        chainId: 0,
      }
    }
  },
});

export default config;
