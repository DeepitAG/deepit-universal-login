import chai, {expect} from 'chai';
import sinonChai from 'sinon-chai';
import {setupMultiChainService} from '../../../helpers/setupMultiChainService';
import {MultiChainService} from '../../../../lib/core/services/MultiChainService';
import {createMockProvider} from 'ethereum-waffle';

chai.use(require('chai-string'));
chai.use(sinonChai);

describe('INT: MultiChainService', async () => {
  let multiChainService: MultiChainService;
  let factoryAddress: string;
  const provider = createMockProvider();
  const chainName = 'default';

  before(async () => {
    ({multiChainService, factoryAddress} = await setupMultiChainService(provider));
  });

  it('should have correct factory address', async () => {
    const factory = multiChainService.getFactoryContract(chainName);
    expect(factory.address).to.be.eq(factoryAddress);
  });

  it('should return correct provider', async () => {
    const provider = multiChainService.getNetworkProvider(chainName);
    expect(provider.network.name).to.be.eq('unknown');
  });
});
