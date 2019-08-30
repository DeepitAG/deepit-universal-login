import {expect} from 'chai';
import {utils} from 'ethers';
import {createSignedMessage, waitExpect} from '@universal-login/commons';
import {transferMessage, addKeyMessage, removeKeyMessage} from '../../../fixtures/basicWalletContract';
import setupMessageService from '../../../helpers/setupMessageService';
import defaultDeviceInfo from '../../../config/defaults';
import {getKnexConfig} from '../../../helpers/knex';
import {clearDatabase} from '../../../../lib/http/relayers/RelayerUnderTest';

describe('INT: MessageHandler', async () => {
  let messageHandler;
  let provider;
  let authorisationStore;
  let wallet;
  let mockToken;
  let walletContract;
  let msg;
  let otherWallet;
  const knex = getKnexConfig();
  const chainName = 'default';

  beforeEach(async () => {
    ({wallet, provider, messageHandler, mockToken, authorisationStore, walletContract, otherWallet} = await setupMessageService(knex));
    msg = {...transferMessage, from: walletContract.address, gasToken: mockToken.address};
    messageHandler.start();
  });

  afterEach(async () => {
    await clearDatabase(knex);
  });

  it('Error when not enough tokens', async () => {
    const message = {...msg, gasLimit: utils.parseEther('2.0')};
    const signedMessage = createSignedMessage(message, wallet.privateKey);
    const {messageHash} = await messageHandler.handleMessage(signedMessage, chainName);
    await messageHandler.stopLater();
    const messageEntry = await messageHandler.getStatus(messageHash, chainName);
    expect(messageEntry.error).to.be.eq('Error: Not enough tokens');
  });

  it('Error when not enough gas', async () => {
    const message = {...msg, gasLimit: 100};
    const signedMessage = createSignedMessage(message, wallet.privateKey);
    const {messageHash} = await messageHandler.handleMessage(signedMessage, chainName);
    await messageHandler.stopLater();
    const messageEntry = await messageHandler.getStatus(messageHash, chainName);
    expect(messageEntry.error).to.be.eq('Error: Not enough gas');
    const {state} = await messageHandler.getStatus(messageHash, chainName);
    expect(state).to.be.eq('Error');
  });

  describe('Transfer', async () => {
    it('successful execution of transfer', async () => {
      const expectedBalance = (await provider.getBalance(msg.to)).add(msg.value);
      const signedMessage = createSignedMessage(msg, wallet.privateKey);
      const {messageHash} = await messageHandler.handleMessage(signedMessage, chainName);
      await messageHandler.stopLater();
      expect(await provider.getBalance(msg.to)).to.eq(expectedBalance);
      const {state, transactionHash} = await messageHandler.getStatus(messageHash, chainName);
      expect(transactionHash).to.not.be.null;
      expect(state).to.be.eq('Success');
    });
  });

  describe('Add Key', async () => {
    it('execute add key', async () => {
      msg = {...addKeyMessage, from: walletContract.address, gasToken: mockToken.address, to: walletContract.address};
      const signedMessage = createSignedMessage(msg, wallet.privateKey);

      await messageHandler.handleMessage(signedMessage, chainName);
      await messageHandler.stopLater();
      expect(await walletContract.keyExist(otherWallet.address)).to.be.true;
    });

    describe('Collaboration with Authorisation Service', async () => {
      it('should remove request from pending authorisations if addKey', async () => {
        const request = {walletContractAddress: walletContract.address, key: otherWallet.address, deviceInfo: defaultDeviceInfo};
        await authorisationStore.addRequest(request, chainName);
        msg = {...addKeyMessage, from: walletContract.address, gasToken: mockToken.address, to: walletContract.address};
        const signedMessage = createSignedMessage(msg, wallet.privateKey);
        await messageHandler.handleMessage(signedMessage, chainName);
        await messageHandler.stopLater();
        const authorisations = await authorisationStore.getPendingAuthorisations(walletContract.address, chainName);
        expect(authorisations).to.deep.eq([]);
      });
    });
  });

  describe('Remove key ', async () => {
    beforeEach(async () => {
      const message =  {...addKeyMessage, from: walletContract.address, gasToken: mockToken.address, to: walletContract.address};
      const signedMessage = createSignedMessage(message, wallet.privateKey);
      await messageHandler.handleMessage(signedMessage, chainName);
    });

    it('should remove key', async () => {
      await waitExpect(async () => expect((await walletContract.keyExist(otherWallet.address))).to.be.true);
      const message =  {...removeKeyMessage, from: walletContract.address, gasToken: mockToken.address, to: walletContract.address};
      const signedMessage = createSignedMessage(message, wallet.privateKey);

      await messageHandler.handleMessage(signedMessage, chainName);
      await messageHandler.stopLater();
      expect((await walletContract.keyExist(otherWallet.address))).to.eq(false);
    });
  });

  after(async () => {
    await knex.destroy();
  });
});


