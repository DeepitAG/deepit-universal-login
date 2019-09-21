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
  wallet: string[];
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
  walletContractAddress: string;
  contractWhiteList: ContractWhiteList;
  tokenContractAddress?: string;
  maxGasLimit: number;
}

export declare type NetworkConfig = Record<string, NetworkData>;

export interface PublicNetworkData {
  factoryAddress: string;
  chainSpec: ChainSpec;
  supportedTokens: SupportedToken[];
  ensRegistrars: string[];
  walletContractAddress: string;
  contractWhiteList: ContractWhiteList;
  maxGasLimit: number;
}

export declare type PublicNetworkConfig = Record<string, PublicNetworkData>;

export interface PublicRelayerConfig {
  localization: LocalizationConfig;
  onRampProviders: OnRampConfig;
  networkConfig: PublicNetworkConfig;
}
