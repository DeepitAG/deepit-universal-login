import {loadFixture} from 'ethereum-waffle';
import NetworkService from '../../lib/integration/ethereum/NetworkService';
import basicWalletContract from '../fixtures/basicWalletContract';

export default async function setupNetworkService() {
  const {provider, factoryContractAddress} = await loadFixture(basicWalletContract);
  const configuration = {};
  configuration['development'] = {};
  configuration['development'].jsonRpcUrl = "localhost:18545";
  configuration['development'].factoryAddress = factoryContractAddress;
  configuration['development'].chainSpec = provider.network;
  const networkService = new NetworkService(configuration);
  return {networkService, factoryContractAddress};
}

