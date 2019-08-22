import chai, {expect} from 'chai';
import AuthorisationStore from '../../../../lib/integration/sql/services/AuthorisationStore';
import {getWallets, createMockProvider, deployContract} from 'ethereum-waffle';
import WalletMaster from '@universal-login/contracts/build/WalletMaster.json';
import WalletService from '../../../../lib/integration/ethereum/WalletService';
import buildEnsService from '../../../helpers/buildEnsService';
import {waitForContractDeploy} from '@universal-login/commons';
import {EventEmitter} from 'fbemitter';
import {getKnexConfig} from '../../../helpers/knex';
import deviceInfo from '../../../config/defaults';
import {deployFactory} from '@universal-login/contracts';
import { MultiChainProvider } from '../../../../lib/integration/ethereum/MultiChainProvider';


chai.use(require('chai-string'));

describe('INT: Authorisation Service', async () => {
  let authorisationStore;
  let provider;
  let multiChainProvider;
  let managementKey;
  let wallet;
  let ensDeployer;
  let ensService;
  let walletContractService;
  let walletContract;
  let otherWallet;
  const chainName = 'default';

  beforeEach(async () => {
    provider = createMockProvider();
    [wallet, managementKey, otherWallet, ensDeployer] = await getWallets(provider);
    [ensService, multiChainProvider] = await buildEnsService(ensDeployer, 'mylogin.eth');
    provider = multiChainProvider.getNetworkProvider(chainName);
    const database = getKnexConfig();
    authorisationStore = new AuthorisationStore(database);
    walletContractService = new WalletService(multiChainProvider, ensService, new EventEmitter());
    const transaction = await walletContractService.create(managementKey.address, 'alex.mylogin.eth', chainName);
    walletContract = await waitForContractDeploy(managementKey, WalletMaster, transaction.hash);
  });

  it('Authorisation roundtrip', async () => {
    const walletContractAddress =  walletContract.address;
    const key = managementKey.address;
    const request = {walletContractAddress, key, deviceInfo};

    const [id] = await authorisationStore.addRequest(request, chainName);
    const authorisations = await authorisationStore.getPendingAuthorisations(walletContractAddress, chainName);
    expect(authorisations[authorisations.length - 1]).to.deep.eq({...request, id, chainName});

    await authorisationStore.removeRequest(otherWallet.address, managementKey.address, chainName);
    const authorisationsAfterDelete = await authorisationStore.getPendingAuthorisations(otherWallet.address, chainName);
    expect(authorisationsAfterDelete).to.deep.eq([]);
  });

  it('should return [] array when no pending authorisations', async () => {
    expect(await authorisationStore.getPendingAuthorisations(walletContract.address, chainName)).to.deep.eq([]);
  });

  afterEach(async () => {
    await authorisationStore.database.delete().from('authorisations');
    await authorisationStore.database.destroy();
  });
});
