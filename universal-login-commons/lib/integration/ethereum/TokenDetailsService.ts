import {providers, Contract} from 'ethers';
import {ETHER_NATIVE_TOKEN} from '../../core/constants/constants';
import {TokenDetails} from '../../core/models/TokenData';

const tokenAbi = [
  'function name() public view returns (string)',
  'function symbol() public view returns (string)'
];

export class TokenDetailsService {
  constructor() {}

  async getTokenDetails(tokenAddress: string, provider: providers.Provider): Promise<TokenDetails> {
    const symbol = await this.getSymbol(tokenAddress, provider);
    const name = await this.getName(tokenAddress, provider);
    return {address: tokenAddress, symbol, name};
  }

  async getSymbol(tokenAddress: string, provider: providers.Provider): Promise<string> {
    if (tokenAddress === ETHER_NATIVE_TOKEN.address) {
      return ETHER_NATIVE_TOKEN.symbol;
    }
    const token = new Contract(tokenAddress, tokenAbi, provider);
    return token.symbol();
  }

  async getName(tokenAddress: string, provider: providers.Provider): Promise<string> {
    if (tokenAddress === ETHER_NATIVE_TOKEN.address) {
      return ETHER_NATIVE_TOKEN.name;
    }
    const token = new Contract(tokenAddress, tokenAbi, provider);
    return token.name();
  }
}
