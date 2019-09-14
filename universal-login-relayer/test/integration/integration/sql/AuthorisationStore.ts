import chai, {expect} from 'chai';
import Knex from 'knex';
import {Wallet} from 'ethers';
import {getWallets, createMockProvider} from 'ethereum-waffle';
import {createKeyPair, TEST_GAS_PRICE, ETHER_NATIVE_TOKEN} from '@universal-login/commons';
import setupWalletService, {createFutureWallet} from '../../../helpers/setupWalletService';
import AuthorisationStore from '../../../../lib/integration/sql/services/AuthorisationStore';
import {getKnexConfig} from '../../../helpers/knex';
import deviceInfo from '../../../config/defaults';

chai.use(require('chai-string'));

describe('INT: Authorisation Store', async () => {
  let authorisationStore: AuthorisationStore;
  let wallet: Wallet;
  let provider;
  let contractAddress: string;
  let otherWallet: Wallet;
  let database: Knex;
  const keyPair = createKeyPair();
  const ensName = 'justyna.mylogin.eth';
  const network = 'default';

  beforeEach(async () => {
    provider = createMockProvider();
    [wallet, otherWallet] = await getWallets(provider);
    database = getKnexConfig();
    authorisationStore = new AuthorisationStore(database);
    const {walletService, factoryContract, ensService} = await setupWalletService(wallet);
    const {futureContractAddress, signature} = await createFutureWallet(keyPair, ensName, factoryContract, wallet, ensService, network);
    await walletService.deploy({publicKey: keyPair.publicKey, ensName, gasPrice: TEST_GAS_PRICE, signature, gasToken: ETHER_NATIVE_TOKEN.address, network});
    contractAddress = futureContractAddress;
  });

  it('Authorisation roundtrip', async () => {
    const request = {walletContractAddress: contractAddress, key: keyPair.publicKey, deviceInfo};
    const [id] = await authorisationStore.addRequest(request, network);
    const authorisations = await authorisationStore.getPendingAuthorisations(contractAddress, network);
    expect(authorisations[authorisations.length - 1]).to.deep.eq({...request, id, network});

    await authorisationStore.removeRequests(otherWallet.address, network);
    const authorisationsAfterDelete = await authorisationStore.getPendingAuthorisations(otherWallet.address, network);
    expect(authorisationsAfterDelete).to.deep.eq([]);
  });

  it('Authorisation add-remove roundtrip', async () => {
    const request = {walletContractAddress: contractAddress, key: keyPair.publicKey, deviceInfo};
    await authorisationStore.addRequest(request);
    const authorisations = await authorisationStore.getPendingAuthorisations(contractAddress);
    expect(authorisations).length(1);
    const itemToRemove = await authorisationStore.get(contractAddress, keyPair.publicKey);
    const removedItemsCount = await authorisationStore.removeRequest(contractAddress, keyPair.publicKey);
    expect(itemToRemove).to.deep.eq(request);
    expect(removedItemsCount).to.be.eq(1);
  });

  it('Remove non-existing item', async () => {
    const removedItemsCount = await authorisationStore.removeRequest(contractAddress, keyPair.publicKey);
    expect(removedItemsCount).to.be.eq(0);
  });

  it('Many authorisation requests roundtrip', async () => {
    const requests = [1, 2, 3].map((_) => ({walletContractAddress: contractAddress, key: createKeyPair().publicKey, deviceInfo}));
    const ids = [];
    for (const request of requests) {
       const [id] = await authorisationStore.addRequest(request, network);
       ids.push(id);
    }

    const authorisations = await authorisationStore.getPendingAuthorisations(contractAddress, network);
    expect(authorisations.length).to.eq(3);
    expect(authorisations[0]).to.deep.eq({...requests[0], id: ids[0], network});
    expect(authorisations[1]).to.deep.eq({...requests[1], id: ids[1], network});
    expect(authorisations[2]).to.deep.eq({...requests[2], id: ids[2], network});

    await authorisationStore.removeRequests(otherWallet.address, network);
    const authorisationsAfterDelete = await authorisationStore.getPendingAuthorisations(otherWallet.address, network);
    expect(authorisationsAfterDelete).to.deep.eq([]);
  });

  it('should return [] array when no pending authorisations', async () => {
    expect(await authorisationStore.getPendingAuthorisations(contractAddress, network)).to.deep.eq([]);
  });

  afterEach(async () => {
    await database.delete().from('authorisations');
    await database.destroy();
  });
});
