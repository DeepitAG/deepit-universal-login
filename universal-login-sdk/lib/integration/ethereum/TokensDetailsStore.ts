import {TokenDetails, TokenDetailsService, ObservedToken} from '@universal-login/commons';
import {Chains} from '.././../config/Chains';

export class TokensDetailsStore {
  tokensDetails: TokenDetails[] = [];

  constructor(private tokenDetailsService: TokenDetailsService, private tokens: ObservedToken[], private chains: Chains) {}

  async fetchTokensDetails() {
    for (const {address, chainName} of this.tokens) {
      const provider = this.chains[chainName as string].provider;
      const details = await this.tokenDetailsService.getTokenDetails(address, provider);
      this.tokensDetails.push(details);
    }
  }

  getTokenAddress(symbol: string) {
    const token = this.tokensDetails.find((token) => token.symbol === symbol);
    return token ? token.address : undefined;
  }
}
