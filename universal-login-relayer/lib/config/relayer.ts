import {LocalizationConfig, OnRampConfig, NetworkConfig, IPGeolocationApiConfig} from '@universal-login/commons';
import {KnexConfig} from './KnexConfig';

export interface Config {
  port?: string;
  localization: LocalizationConfig;
  onRampProviders: OnRampConfig;
  database: KnexConfig;
  networkConfig: NetworkConfig;
  ipGeolocationApi: IPGeolocationApiConfig;
}
