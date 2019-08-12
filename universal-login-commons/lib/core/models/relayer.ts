import {LocalizationConfig, SafelloConfig, RampConfig} from './onRamp';

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
  ramp: RampConfig;
}

export interface NetworkData {
  jsonRpcUrl: string;
  factoryAddress: string;
  chainSpec: ChainSpec;
  supportedTokens: SupportedToken[];
  privateKey: string;
  ensRegistrars: string[];
  walletMasterAddress: string;
  contractWhiteList: ContractWhiteList;
  tokenContractAddress?: string;
}

export declare type NetworkConfig = Record<string, NetworkData>;

export interface PublicRelayerConfig {
  networkConf: NetworkConfig;
  localization: LocalizationConfig;
  onRampProviders: OnRampConfig;
}