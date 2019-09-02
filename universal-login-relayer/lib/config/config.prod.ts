import path from 'path';
import {utils} from 'ethers';
import {getEnv, ETHER_NATIVE_TOKEN} from '@universal-login/commons';
import {Config} from './relayer';

export const config: Config =  Object.freeze({
  port: getEnv('PORT', ''),
<<<<<<< HEAD
=======
  privateKey: getEnv('PRIVATE_KEY', ''),
  chainSpec: Object.freeze({
    ensAddress: getEnv('ENS_ADDRESS', ''),
    chainId: 0,
    name: 'ganache'
  }),
  ensRegistrars: [
    getEnv('ENS_DOMAIN_1', ''),
    getEnv('ENS_DOMAIN_2', ''),
    getEnv('ENS_DOMAIN_3', ''),
  ],
  walletContractAddress: getEnv('WALLET_MASTER_ADDRESS', ''),
  contractWhiteList: {
    wallet: [],
    proxy: ['0xfc8b7148b2866fd89eec60cb9fcc38a8527a090b9219ab243e82b010cda8d3a9']
  },
  factoryAddress: getEnv('FACTORY_ADDRESS', ''),
  supportedTokens: [{
    address: ETHER_NATIVE_TOKEN.address,
    minimalAmount: utils.parseEther('0.005').toString()
  }],
>>>>>>> upstream/master
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
    connection: getEnv('DATABASE_URL', ''),
    migrations: {
      directory: path.join(__dirname, '../integration/sql/migrations'),
    }
  },
  networkConfig: {
    default: {
      jsonRpcUrl: getEnv('JSON_RPC_URL', ''),
      privateKey: getEnv('PRIVATE_KEY', ''),
      chainSpec: Object.freeze({
        ensAddress: getEnv('ENS_ADDRESS', ''),
        chainId: 0,
        name: 'ganache'
      }),
      ensRegistrars: [
        getEnv('ENS_DOMAIN_1', ''),
        getEnv('ENS_DOMAIN_2', ''),
        getEnv('ENS_DOMAIN_3', ''),
      ],
      walletContractAddress: getEnv('WALLET_MASTER_ADDRESS', ''),
      contractWhiteList: {
        wallet: [],
        proxy: [
          '0xca33d06bff615ad98056f8f720c57042cd3e820985235a3f77b73067c451cd3e',
          '0xcb0b7ef2bf016035e985e68079f3979acda20f6e746b0019bbc9393bb4521ade',
          '0xe386cf5b5d9d4b568de7cd2d8c9a14584aa07626f10e934cf8fd92b5f86a509b',
          '0x0c76ab02dd9c82773878ddd5b0563c7d274c67ea727575ba4a515cdf194d1315'
        ]
      },
      factoryAddress: getEnv('FACTORY_ADDRESS', ''),
      supportedTokens: [{
        address: ETHER_NATIVE_TOKEN.address,
        minimalAmount: utils.parseEther('0.005').toString()
      }],
    }
  },
});

export default config;
