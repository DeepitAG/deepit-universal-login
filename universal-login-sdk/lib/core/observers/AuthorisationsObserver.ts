import {RelayerApi} from '../../integration/http/RelayerApi';
import deepEqual from 'deep-equal';
import ObserverRunner from './ObserverRunner';
import {ensure, Notification, GetAuthorisationRequest} from '@universal-login/commons';
import {ConcurrentAuthorisation} from '../utils/errors';

class AuthorisationsObserver extends ObserverRunner {
  private lastAuthorisations: Notification[] = [];
  private getAuthorisationRequest?: GetAuthorisationRequest;
  private callbacks: Function[] = [];
  private chainName?: string;

  constructor(private relayerApi: RelayerApi) {
    super();
  }

  async tick() {
    return this.checkAuthorisationsChangedFor(this.getAuthorisationRequest!, this.chainName!);
  }

  private async checkAuthorisationsChangedFor(getAuthorisationRequest: GetAuthorisationRequest, chainName: string) {
    const authorisations = await this.fetchPendingAuthorisations(getAuthorisationRequest, chainName);
    if (!deepEqual(authorisations, this.lastAuthorisations)) {
      this.lastAuthorisations = authorisations;
      for (const callback of this.callbacks) {
        callback(authorisations);
      }
    }
  }

  private async fetchPendingAuthorisations(getAuthorisationRequest: GetAuthorisationRequest, chainName: string) {
    const {response} = await this.relayerApi.getPendingAuthorisations(getAuthorisationRequest, chainName);
    return response;
  }

  subscribe(getAuthorisationRequest: GetAuthorisationRequest, chainName: string, callback: Function) {
    ensure(
      !this.getAuthorisationRequest ||
      (this.getAuthorisationRequest.walletContractAddress === getAuthorisationRequest.walletContractAddress),
      ConcurrentAuthorisation
    );

    callback(this.lastAuthorisations);
    this.getAuthorisationRequest = getAuthorisationRequest;
    this.chainName = chainName;
    this.callbacks.push(callback);
    if (this.isStopped()) {
      this.start();
    }

    return () => {
      this.callbacks = this.callbacks.filter((element) => callback !== element);
      if (this.callbacks.length === 0) {
        this.getAuthorisationRequest = undefined;
        this.lastAuthorisations = [];
        this.stop();
      }
    };
  }
}

export default AuthorisationsObserver;
