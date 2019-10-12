import {sleep, onCritical, SignedMessage} from '@universal-login/commons';
import {IExecutionQueue} from './IExecutionQueue';
import {QueueItem} from '../../models/QueueItem';
import Deployment from '../../models/Deployment';
import {IExecutor} from '../execution/IExecutor';

type ExecutionWorkerState = 'running' | 'stopped' | 'stopping';

class ExecutionWorker {
  private state: ExecutionWorkerState;

  constructor(
    private executors: Array<IExecutor<SignedMessage | Deployment>>,
    private executionQueue: IExecutionQueue,
    private tickInterval: number = 100
  ) {
    this.state = 'stopped';
  }

  private async tryExecute(nextItem: QueueItem) {
    for (let i = 0; i < this.executors.length; i++) {
      if (this.executors[i].canExecute(nextItem)){
        await this.execute(this.executors[i], nextItem.hash, nextItem.network);
        return;
      }
    }
    await this.executionQueue.remove(nextItem.hash, nextItem.network);
  }

  async execute(executor: IExecutor<SignedMessage | Deployment>, itemHash: string, network: string) {
    await executor.handleExecute(itemHash, network);
    await this.executionQueue.remove(itemHash, network);
  }

  start() {
    if (this.state !== 'running') {
      this.state = 'running';
      this.loop().catch(onCritical);
    }
  }

  private async tick() {
    if (this.state === 'stopping'){
      this.state = 'stopped';
    } else {
      await sleep(this.tickInterval);
    }
  }

  async loop() {
    do {
      const nextItem = await this.executionQueue.getNext();
      if (nextItem){
        await this.tryExecute(nextItem);
      } else {
        await this.tick();
      }
    } while (this.state !== 'stopped');
  }

  async stop() {
    this.state = 'stopped';
  }

  async stopLater() {
    this.state = 'stopping';
    while (!this.isStopped()) {
      await sleep(this.tickInterval);
    }
  }

  private isStopped() {
    return this.state === 'stopped';
  }
}

export default ExecutionWorker;
