import {LocalizationConfig, SafelloConfig} from './onRamp';

export interface SupportedToken {
  address: string;
  minimalAmount: string;
}

export interface ChainSpec {
  ensAddress: string;
  chainId: number;
  name: string;
}

export interface ContractWhiteList {
  master: string[];
  proxy: string[];
}

export interface OnRampConfig {
  safello: SafelloConfig;
}

export interface PublicRelayerConfig {
  supportedTokens: SupportedToken[];
  factoryAddress: string;
  chainSpec: ChainSpec;
  contractWhiteList: ContractWhiteList;
  localization: LocalizationConfig;
  onRampProviders: OnRampConfig;
}

interface NetworkData {
  jsonRpcUrl: string;
  factoryAddress: string;
  chainSpec: ChainSpec;
}

export declare type NetworkConfig = Record<string, NetworkData>;
