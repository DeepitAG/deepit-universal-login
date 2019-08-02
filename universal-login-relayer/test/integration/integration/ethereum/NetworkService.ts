import chai, {expect} from 'chai';
import sinonChai from 'sinon-chai';
import setupNetworkService from '../../../helpers/setupNetworkService';
import NetworkService from '../../../../lib/integration/ethereum/NetworkService';

chai.use(require('chai-string'));
chai.use(sinonChai);

describe('INT: NetworkService', async () => {
  let networkService: NetworkService;
  let factoryContractAddress: string;

  before(async () => {
    ({networkService, factoryContractAddress} = await setupNetworkService());
  });

  it("should have correct factory address", async () => {
    expect(networkService.getNetworkConterfactualFactory('development')).to.be.eq(factoryContractAddress);
  })

  it("should return correct provider", async () => {
    const networkProvider = networkService.getNetworkProvider('development');
    expect(networkProvider.network.name).to.be.eq('ganache');
  })
});
