import chai, {expect} from 'chai';
import sinonChai from 'sinon-chai';
import {setupMultiChainProvider} from '../../../helpers/setupMultiChainProvider';
import {MultiChainProvider} from '../../../../lib/integration/ethereum/MultiChainProvider';

chai.use(require('chai-string'));
chai.use(sinonChai);

describe('INT: MultiChainProvider', async () => {
  let multiChainProvider: MultiChainProvider;
  let factoryAddress: string;

  before(async () => {
    ({multiChainProvider, factoryAddress} = await setupMultiChainProvider());
  });

  it("should have correct factory address", async () => {
    const factory = multiChainProvider.getFactoryContract('development');
    expect(factory.address).to.be.eq(factoryAddress);
  })

  it("should return correct provider", async () => {
    const provider = multiChainProvider.getNetworkProvider('development');
    expect(provider.network.name).to.be.eq('unknown');
  })
});
