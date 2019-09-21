import {ensure, ensureNotNull, NetworkConfig} from '@universal-login/commons';
import {InvalidTransaction, ChainNotSupported} from './errors';

export const ensureProperTransactionHash = (transactionHash: string) => ensure(transactionHash.length === 66, InvalidTransaction, transactionHash);

export const ensureChainSupport = (networkConfig: NetworkConfig, network: string) =>
  ensureNotNull(networkConfig[network], ChainNotSupported, network);