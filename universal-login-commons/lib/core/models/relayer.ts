import {LocalizationConfig, SafelloConfig, RampConfig} from './onRamp';
import {Provider} from 'ethers/providers';

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
  provider?: Provider;
  jsonRpcUrl?: string;
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

export interface PublicNetworkData {
  factoryAddress: string;
  chainSpec: ChainSpec;
  supportedTokens: SupportedToken[];
  ensRegistrars: string[];
  walletMasterAddress: string;
  contractWhiteList: ContractWhiteList;
}

export declare type PublicNetworkConfig = Record<string, PublicNetworkData>;

export interface PublicRelayerConfig {
  localization: LocalizationConfig;
  onRampProviders: OnRampConfig;
  networkConfig: PublicNetworkConfig;
}
