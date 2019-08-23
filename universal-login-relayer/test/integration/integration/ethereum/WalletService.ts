import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import {Wallet, Contract} from 'ethers';
import setupWalletService from '../../../helpers/setupWalletService';
import WalletService from '../../../../lib/integration/ethereum/WalletService';
import {MultiChainService} from '../../../../lib/core/services/MultiChainService';
import {Provider} from 'ethers/providers';

chai.use(require('chai-string'));
chai.use(sinonChai);


describe('INT: WalletService', async () => {
  let walletService: WalletService;
  let wallet: Wallet;
  let callback: sinon.SinonSpy;
  let walletContract: Contract;
  let provider: Provider;
  let multiChainService: MultiChainService;
  const chainName = 'default';

  before(async () => {
    ({wallet, multiChainService, walletService, callback, walletContract} = await setupWalletService());
    provider = multiChainService.getNetworkProvider(chainName);
  });

  describe('Create', async () => {
    it('returns contract address', async () => {
      expect(walletContract.address).to.be.properAddress;
    });

    it('is initialized with management key', async () => {
      expect(await walletContract.keyExist(wallet.address)).to.eq(true);
    });

    it('has ENS name reserved', async () => {
      expect(await provider.resolveName('alex.mylogin.eth')).to.eq(walletContract.address);
    });

    it('should emit created event', async () => {
      const transaction = await walletService.create(wallet.address, 'example.mylogin.eth', chainName);
      expect(callback).to.be.calledWith(sinon.match(transaction));
    });

    it('should fail with not existing ENS name', async () => {
      const creationPromise = walletService.create(wallet.address, 'alex.non-existing-id.eth', chainName);
      await expect(creationPromise)
        .to.be.eventually.rejectedWith('ENS domain alex.non-existing-id.eth does not exist or is not compatible with Universal Login');
    });
  });
});
