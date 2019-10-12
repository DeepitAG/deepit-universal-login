import {providers} from 'ethers';
import {QueueItem} from '../../core/models/QueueItem';
import {IExecutor} from '../../core/services/execution/IExecutor';
import Deployment from '../../core/models/Deployment';
import IRepository from '../../core/services/messages/IRepository';
import {TransactionHashNotFound} from '../../core/utils/errors';
import {ensureNotNull} from '@universal-login/commons';

export class DeploymentExecutor implements IExecutor<Deployment> {

  constructor(
    private deploymentRepository: IRepository<Deployment>,
  ) {}

  canExecute(item: QueueItem): boolean {
    return item.type === 'Deployment';
  }

  async handleExecute(deploymentHash: string, network: string) {
    try {
      const deployment = await this.deploymentRepository.get(deploymentHash, network);
      const transactionResponse = await this.execute(deployment);
      const {hash, wait} = transactionResponse;
      ensureNotNull(hash, TransactionHashNotFound);
      await this.deploymentRepository.markAsPending(deploymentHash, hash!, network);
      await wait();
      await this.deploymentRepository.setState(deploymentHash, 'Success', network);
    } catch (error) {
      const errorMessage = `${error.name}: ${error.message}`;
      await this.deploymentRepository.markAsError(deploymentHash, errorMessage, network);
    }
  }

  async execute(deployment: Deployment): Promise<providers.TransactionResponse> {
    return {hash: 'xyz', wait: async () => {}} as any;
  }
}

export default DeploymentExecutor;