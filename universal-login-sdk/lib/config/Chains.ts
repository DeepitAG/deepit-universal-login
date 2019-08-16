import {Provider} from 'ethers/providers';
import BlockchainObserver from '../core/observers/BlockchainObserver';
import {DeploymentObserver} from '../core/observers/DeploymentObserver';
import {DeploymentReadyObserver} from '../core/observers/DeploymentReadyObserver';

export declare type ProviderDict = Record<string, Provider>;

interface Chain {
  provider : Provider;
  blockchainObserver?: BlockchainObserver;
  deploymentObserver?: DeploymentObserver;
  deploymentReadyObserver?: DeploymentReadyObserver;
}

export declare type Chains = Record<string, Chain>;