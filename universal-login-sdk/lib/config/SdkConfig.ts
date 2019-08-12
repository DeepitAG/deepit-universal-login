import {TokenDetails, ObservedCurrency, PaymentOptions, NetworkConfig} from '@universal-login/commons';

export interface SdkConfig {
  paymentOptions: PaymentOptions;
  observedTokens: TokenDetails[];
  observedCurrencies: ObservedCurrency[];
}
