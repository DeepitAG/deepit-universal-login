import {ContractWhiteList, LocalizationConfig, SafelloConfig, NetworkConfig} from '@universal-login/commons';
import {KnexConfig} from './KnexConfig';

export interface Config {
  port?: string;
  localization: LocalizationConfig;
  onRampProviders: {
    safello: SafelloConfig;
  };
  database: KnexConfig;
  networkConf: NetworkConfig;
}
