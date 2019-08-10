import {NetworkConfig, LocalizationConfig, OnRampConfig} from '@universal-login/commons';
import {KnexConfig} from './KnexConfig';

export interface Config {
  port?: string;
  localization: LocalizationConfig;
  onRampProviders: OnRampConfig;
  database: KnexConfig;
  networkConf: NetworkConfig;
}
