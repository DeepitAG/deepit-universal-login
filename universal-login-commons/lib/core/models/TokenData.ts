import {utils} from 'ethers';

export type ObservedToken = {
  address: string;
  chainName?: string;
};

export type TokenDetails = ObservedToken & {
  name: string;
  symbol: string;
};

export type TokenDetailsWithBalance = TokenDetails & {
  balance: utils.BigNumber;
};
