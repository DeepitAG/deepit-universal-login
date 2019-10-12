import {QueueItem} from '../../models/QueueItem';

export interface IExecutor<A> {
  canExecute(item: QueueItem): boolean;
  execute(item: A, network: string): Promise<any>;
  handleExecute(hash: string, network: string): Promise<any>;
}