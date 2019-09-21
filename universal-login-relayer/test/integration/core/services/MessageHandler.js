import {expect} from 'chai';
import {waitExpect, waitExpect} from '@universal-login/commons';
import {encodeFunction} from '@universal-login/contracts/testutils';
import WalletContract from '@universal-login/contracts/build/Wallet.json';
import {deployContract} from 'ethereum-waffle';
import MockToken from '@universal-login/contracts/build/MockToken';
import {transferMessage, addKeyMessage, removeKeyMessage} from '../../../fixtures/basicWalletContract';
import setupMessageService from '../../../helpers/setupMessageService';
import defaultDeviceInfo from '../../../config/defaults';
import {getKnexConfig} from '../../../helpers/knex';
import {clearDatabase} from '../../../../lib/http/relayers/RelayerUnderTest';
import {messageToSignedMessage} from '@universal-login/contracts';

describe('INT: MessageHandler', async () => {
  let messageHandler;
  let provider;
  let authorisationStore;
  let devicesStore;
  let wallet;
  let walletContract;
  let msg;
  let otherWallet;
  const knex = getKnexConfig();
  const network = 'default';

  beforeEach(async () => {
    ({wallet, provider, messageHandler, authorisationStore, walletContract, otherWallet, devicesStore} = await setupMessageService(knex));
    msg = {...transferMessage, from: walletContract.address, nonce: await walletContract.lastNonce()};
    messageHandler.start();
  });

  afterEach(async () => {
    messageHandler.stopLater();
    await clearDatabase(knex);
  });

  it('Error when not enough tokens', async () => {
    const mockToken = await deployContract(wallet, MockToken);
    await mockToken.transfer(walletContract.address, 1);

    const signedMessage = messageToSignedMessage({...msg, gasToken: mockToken.address}, wallet.privateKey);
    const {messageHash} = await messageHandler.handleMessage(signedMessage, network);
    await messageHandler.stopLater();
    const messageEntry = await messageHandler.getStatus(messageHash, network);
    expect(messageEntry.error).to.be.eq('Error: Not enough tokens');
  });

  it('Error when not enough gas', async () => {
    const gasLimitExecution = 1;
    const gasData = 7696;
    const gasLimit = gasData + gasLimitExecution;
    const signedMessage = messageToSignedMessage({...msg, gasLimit}, wallet.privateKey);
    await expect(messageHandler.handleMessage(signedMessage, network)).to.be.rejectedWith('Insufficient Gas. Got GasLimitExecution 1 but should greater than 105000');
  });

  describe('Transfer', async () => {
    it('successful execution of transfer', async () => {
      const expectedBalance = (await provider.getBalance(msg.to)).add(msg.value);
      const signedMessage = messageToSignedMessage(msg, wallet.privateKey);
      const {messageHash} = await messageHandler.handleMessage(signedMessage, network);
      await messageHandler.stopLater();
      expect(await provider.getBalance(msg.to)).to.eq(expectedBalance);
      const {state, transactionHash} = await messageHandler.getStatus(messageHash, network);
      expect(transactionHash).to.not.be.null;
      expect(state).to.be.eq('Success');
    });
  });

  describe('Add Key', async () => {
    it('execute add key', async () => {
      msg = {...addKeyMessage, from: walletContract.address, to: walletContract.address, nonce: await walletContract.lastNonce()};
      const signedMessage = messageToSignedMessage(msg, wallet.privateKey);

      await messageHandler.handleMessage(signedMessage, network);
      await messageHandler.stopLater();
      expect(await walletContract.keyExist(otherWallet.address)).to.be.true;
    });

    describe('Collaboration with Authorisation Service', async () => {
      it('should remove request from pending authorisations if addKey', async () => {
        const request = {walletContractAddress: walletContract.address, key: otherWallet.address, deviceInfo: defaultDeviceInfo};
        await authorisationStore.addRequest(request, network);
        msg = {...addKeyMessage, from: walletContract.address, to: walletContract.address, nonce: await walletContract.lastNonce()};
        const signedMessage = messageToSignedMessage(msg, wallet.privateKey);
        await messageHandler.handleMessage(signedMessage, network);
        await messageHandler.stopLater();
        const authorisations = await authorisationStore.getPendingAuthorisations(walletContract.address, network);
        expect(authorisations).to.deep.eq([]);
        expect(await devicesStore.get(walletContract.address, network)).length(1);
      });
    });
  });

  describe('Add Keys', async () => {
    it('execute add key', async () => {
      const keys = [otherWallet.address];
      const data = encodeFunction(WalletContract, 'addKeys', [keys]);
      msg = {...addKeyMessage, from: walletContract.address, to: walletContract.address, nonce: await walletContract.lastNonce(), data};
      const signedMessage0 = messageToSignedMessage(msg, wallet.privateKey);
      await messageHandler.handleMessage(signedMessage0);
      await messageHandler.stopLater();
      expect(await walletContract.keyExist(otherWallet.address)).to.be.true;
      const devices = await devicesStore.get(walletContract.address);
      expect(devices.map(({publicKey}) => publicKey)).to.be.deep.eq(keys);
    });
  });

  describe('Remove key ', async () => {
    beforeEach(async () => {
      const message =  {...addKeyMessage, from: walletContract.address, to: walletContract.address, nonce: await walletContract.lastNonce()};
      const signedMessage = messageToSignedMessage(message, wallet.privateKey);

      await messageHandler.handleMessage(signedMessage, network);
    });

    it('should remove key', async () => {
      await waitExpect(async () => expect((await walletContract.keyExist(otherWallet.address))).to.be.true);
      const message =  {...removeKeyMessage, from: walletContract.address, to: walletContract.address, nonce: await walletContract.lastNonce()};
      const signedMessage = messageToSignedMessage(message, wallet.privateKey);

      await messageHandler.handleMessage(signedMessage, network);
      await messageHandler.stopLater();
      expect(await devicesStore.get(walletContract.address, otherWallet.address)).to.be.deep.eq([]);
      expect(await walletContract.keyExist(otherWallet.address)).to.eq(false);
    });
  });

  after(async () => {
    await knex.destroy();
  });
});


