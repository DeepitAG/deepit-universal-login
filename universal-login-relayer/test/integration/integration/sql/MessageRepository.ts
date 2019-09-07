import {expect} from 'chai';
import {Wallet, Contract} from 'ethers';
import {loadFixture} from 'ethereum-waffle';
import {calculateMessageHash, createSignedMessage, SignedMessage, TEST_TRANSACTION_HASH, bignumberifySignedMessageFields, stringifySignedMessageFields, CollectedSignatureKeyPair} from '@universal-login/commons';
import {executeSetRequiredSignatures} from '@universal-login/contracts/testutils';
import IMessageRepository from '../../../../lib/core/services/messages/IMessagesRepository';
import MessageItem from '../../../../lib/core/models/messages/MessageItem';
import basicWalletContractWithMockToken from '../../../fixtures/basicWalletContractWithMockToken';
import {getKeyFromHashAndSignature, createMessageItem} from '../../../../lib/core/utils/utils';
import {getKnexConfig} from '../../../helpers/knex';
import MessageSQLRepository from '../../../../lib/integration/sql/services/MessageSQLRepository';
import MessageMemoryRepository from '../../../helpers/MessageMemoryRepository';
import {clearDatabase} from '../../../../lib/http/relayers/RelayerUnderTest';

for (const config of [{
    type: MessageSQLRepository,
  }, {
    type: MessageMemoryRepository,
  }]
) {
describe(`INT: IMessageRepository (${config.type.name})`, async () => {
  let messageRepository: IMessageRepository;
  let wallet: Wallet;
  let walletContract: Contract;
  let message: SignedMessage;
  let messageItem: MessageItem;
  let messageHash: string;
  let actionKey: string;
  const network = 'default';
  const knex = getKnexConfig();

  beforeEach(async () => {
    ({wallet, walletContract, actionKey} = await loadFixture(basicWalletContractWithMockToken));
    let args: any;
    if (config.type.name.includes('SQL')) {
      args = knex;
    }
    messageRepository = new config.type(args);
    message = createSignedMessage({from: walletContract.address, to: '0x', nonce: await walletContract.lastNonce()}, wallet.privateKey);

    messageItem = createMessageItem(message);
    messageHash = calculateMessageHash(message);
  });

  afterEach(async () => {
    config.type.name.includes('SQL') && await clearDatabase(knex);
  });

  it('roundtrip', async () => {
    expect(await messageRepository.isPresent(messageHash, network)).to.be.eq(false, 'store is not initially empty');
    await messageRepository.add(messageHash, messageItem, network);
    expect(await messageRepository.isPresent(messageHash, network)).to.be.eq(true);
    messageItem.message = bignumberifySignedMessageFields(stringifySignedMessageFields(messageItem.message));
    expect(await messageRepository.get(messageHash, network)).to.be.deep.eq(messageItem);
    expect(await messageRepository.isPresent(messageHash, network)).to.be.eq(true);
    const removedPendingExecution = await messageRepository.remove(messageHash, network);
    expect(await messageRepository.isPresent(messageHash, network)).to.be.eq(false);
    expect(removedPendingExecution).to.be.deep.eq(messageItem);
  });

  it('containSignature should return false if signature not collected', async () => {
    expect(await messageRepository.containSignature(messageHash, message.signature, network)).to.be.false;
  });

  it('containSignature should return true if signature already collected', async () => {
    await messageRepository.add(messageHash, messageItem, network);
    await messageRepository.addSignature(messageHash, message.signature, network);
    expect(await messageRepository.containSignature(messageHash, message.signature, network)).to.be.true;
  });

  it('get throws error if message doesn`t exist', async () => {
    await expect(messageRepository.get(messageHash, network)).to.be.eventually.rejectedWith(`Could not find message with hash: ${messageHash}`);
  });

  it('should add signature', async () => {
    await executeSetRequiredSignatures(walletContract, 2, wallet.privateKey);
    await messageRepository.add(messageHash, messageItem, network);
    const message2 = createSignedMessage({from: walletContract.address, to: '0x', nonce: await walletContract.lastNonce()}, actionKey);
    await messageRepository.addSignature(messageHash, message2.signature, network);
    const returnedMessageItem = await messageRepository.get(messageHash, network);
    const signatures = returnedMessageItem.collectedSignatureKeyPairs.map((signatureKeyPair: CollectedSignatureKeyPair) => signatureKeyPair.signature);
    expect(signatures).to.contains(message2.signature);
  });

  describe('markAsPending', async () => {
    it('should mark message item as pending', async () => {
      await messageRepository.add(messageHash, messageItem, network);
      const expectedTransactionHash = TEST_TRANSACTION_HASH;
      await messageRepository.markAsPending(messageHash, expectedTransactionHash, network);
      const {transactionHash, state} = await messageRepository.get(messageHash, network);
      expect(transactionHash).to.be.eq(expectedTransactionHash);
      expect(state).to.be.eq('Pending');
    });

    it('should throw error if transactionHash is invalid', async () => {
      await messageRepository.add(messageHash, messageItem, network);
      const invalidTransactionHash = '0x0';
      await expect(messageRepository.markAsPending(messageHash, invalidTransactionHash, network)).to.be.rejectedWith(`Invalid transaction: ${invalidTransactionHash}`);
    });
  });

  it('should set message state', async () => {
    await messageRepository.add(messageHash, messageItem, network);
    const expectedState = 'Queued';
    await messageRepository.setMessageState(messageHash, expectedState, network);
    const {state} = await messageRepository.get(messageHash, network);
    expect(state).to.be.eq(expectedState);
  });

  it('should mark message item as error', async () => {
    await messageRepository.add(messageHash, messageItem, network);
    const expectedMessageError = 'Pending Message Store Error';
    await messageRepository.markAsError(messageHash, expectedMessageError, network);
    const {error, state} = await messageRepository.get(messageHash, network);
    expect(error).to.be.eq(expectedMessageError);
    expect(state).to.be.eq('Error');
  });

  it('should throw error if signed message is missed', async () => {
    delete messageItem.message;
    await expect(messageRepository.add(messageHash, messageItem, network)).to.rejectedWith(`Message not found for hash: ${messageHash}`);
  });

  it('should get signatures', async () => {
    await messageRepository.add(messageHash, messageItem, network);
    await messageRepository.addSignature(messageHash, message.signature, network);
    const key = getKeyFromHashAndSignature(messageHash, message.signature);
    expect(await messageRepository.getCollectedSignatureKeyPairs(messageHash, network)).to.be.deep.eq([{key, signature: message.signature}]);
    const {signature} = createSignedMessage({from: walletContract.address, to: '0x', nonce: await walletContract.lastNonce()}, actionKey);
    await messageRepository.addSignature(messageHash, signature, network);
    const key2 = getKeyFromHashAndSignature(messageHash, signature);
    expect(await messageRepository.getCollectedSignatureKeyPairs(messageHash, network)).to.be.deep.eq([{key, signature: message.signature}, {key: key2, signature}]);
  });

  after(async () => {
    await knex.destroy();
  });
});
}
