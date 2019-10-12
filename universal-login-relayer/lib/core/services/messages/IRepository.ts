import {MineableState} from '@universal-login/commons';
import {Mineable} from '../../models/Mineable';

export default interface IRepository<T extends Mineable> {
  add: (hash: string, item: T) => Promise<void>;
  get: (hash: string, network: string) => Promise<T>;
  isPresent: (hash: string, network: string) => Promise<boolean>;
  remove: (hash: string, network: string) => Promise<T>;
  markAsPending: (hash: string, transactionHash: string, network: string) => Promise<void>;
  markAsError: (hash: string, error: string, network: string) => Promise<void>;
  setState: (hash: string, state: MineableState, network: string) => Promise<void>;
}
