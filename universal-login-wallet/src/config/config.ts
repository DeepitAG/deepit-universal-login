require('dotenv').config();
import {ETHER_NATIVE_TOKEN} from '@universal-login/commons';


export default Object.freeze({

  development: {
    domains: ['mylogin.eth'],
    relayerUrl: 'http://localhost:3311',
    jsonRpcUrl: 'http://localhost:18545',
    tokens: [
      {address: process.env.TOKEN_CONTRACT_ADDRESS!, chainName: 'default'},
      {address: ETHER_NATIVE_TOKEN.address, chainName: 'default'}
    ],
  },

  test: {
    domains: ['mylogin.eth'],
    relayerUrl: 'http://localhost:3311',
    jsonRpcUrl: 'http://localhost:18545',
    tokens: [
      {address: process.env.TOKEN_CONTRACT_ADDRESS!, chainName: 'default'},
      {address: ETHER_NATIVE_TOKEN.address, chainName: 'default'}
    ],
  },

  production: {
    domains: [process.env.ENS_DOMAIN_1!],
    relayerUrl: process.env.RELAYER_URL!,
    jsonRpcUrl: process.env.JSON_RPC_URL!,
    tokens: [
      {address: process.env.TOKEN_CONTRACT_ADDRESS!, chainName: 'default'},
      {address: ETHER_NATIVE_TOKEN.address, chainName: 'default'}
    ],
  }
});
