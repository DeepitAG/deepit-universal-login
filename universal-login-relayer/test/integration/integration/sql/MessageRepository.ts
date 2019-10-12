import {expect} from 'chai';
import {Wallet, Contract} from 'ethers';
import {loadFixture} from 'ethereum-waffle';
import {calculateMessageHash, SignedMessage, TEST_TRANSACTION_HASH, bignumberifySignedMessageFields, stringifySignedMessageFields, CollectedSignatureKeyPair, TEST_ACCOUNT_ADDRESS, UnsignedMessage} from '@universal-login/commons';
import {emptyMessage, messageToUnsignedMessage, unsignedMessageToSignedMessage} from '@universal-login/contracts';
import {executeSetRequiredSignatures} from '@universal-login/contracts/testutils';
import IMessageRepository from '../../../../lib/core/services/messages/IMessagesRepository';
import MessageItem from '../../../../lib/core/models/messages/MessageItem';
import basicWalletContractWithMockToken from '../../../fixtures/basicWalletContractWithMockToken';
import {getKeyFromHashAndSignature} from '../../../../lib/core/utils/encodeData';
import {getKnexConfig} from '../../../helpers/knex';
import MessageSQLRepository from '../../../../lib/integration/sql/services/MessageSQLRepository';
import MessageMemoryRepository from '../../../helpers/MessageMemoryRepository';
import {clearDatabase} from '../../../../lib/http/relayers/RelayerUnderTest';
import {createMessageItem} from '../../../../lib/core/utils/messages/serialisation';

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
  let unsignedMessage: UnsignedMessage;
  let signedMessage: SignedMessage;
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
    const message = {...emptyMessage, from: walletContract.address, to: TEST_ACCOUNT_ADDRESS, nonce: await walletContract.lastNonce()};
    unsignedMessage = messageToUnsignedMessage(message);
    signedMessage = unsignedMessageToSignedMessage(unsignedMessage, wallet.privateKey);

    messageItem = createMessageItem(signedMessage, network);
    messageHash = calculateMessageHash(signedMessage);
  });

  afterEach(async () => {
    config.type.name.includes('SQL') && await clearDatabase(knex);
  });

  it('roundtrip', async () => {
    expect(await messageRepository.isPresent(messageHash, network)).to.be.eq(false, 'store is not initially empty');
    await messageRepository.add(messageHash, messageItem);
    expect(await messageRepository.isPresent(messageHash, network)).to.be.eq(true);
    messageItem.message = bignumberifySignedMessageFields(stringifySignedMessageFields(messageItem.message));
    expect(await messageRepository.get(messageHash, network)).to.be.deep.eq(messageItem);
    expect(await messageRepository.isPresent(messageHash, network)).to.be.eq(true);
    const removedPendingExecution = await messageRepository.remove(messageHash, network);
    expect(await messageRepository.isPresent(messageHash, network)).to.be.eq(false);
    expect(removedPendingExecution).to.be.deep.eq(messageItem);
  });

  it('containSignature should return false if signature not collected', async () => {
    expect(await messageRepository.containSignature(messageHash, signedMessage.signature, network)).to.be.false;
  });

  it('containSignature should return true if signature already collected', async () => {
    await messageRepository.add(messageHash, messageItem);
    await messageRepository.addSignature(messageHash, signedMessage.signature, network);
    expect(await messageRepository.containSignature(messageHash, signedMessage.signature, network)).to.be.true;
  });

  it('get throws error if message doesn`t exist', async () => {
    await expect(messageRepository.get(messageHash, network)).to.be.eventually.rejectedWith(`Could not find message with hash: ${messageHash}`);
  });

  it('should add signature', async () => {
    await executeSetRequiredSignatures(walletContract, 2, wallet.privateKey);
    await messageRepository.add(messageHash, messageItem);
    const message2 = unsignedMessageToSignedMessage(unsignedMessage, actionKey);
    await messageRepository.addSignature(messageHash, message2.signature, network);
    const returnedMessageItem = await messageRepository.get(messageHash, network);
    const signatures = returnedMessageItem.collectedSignatureKeyPairs.map((signatureKeyPair: CollectedSignatureKeyPair) => signatureKeyPair.signature);
    expect(signatures).to.contains(message2.signature);
  });

  describe('markAsPending', async () => {
    it('should mark message item as pending', async () => {
      await messageRepository.add(messageHash, messageItem);
      const expectedTransactionHash = TEST_TRANSACTION_HASH;
      await messageRepository.markAsPending(messageHash, expectedTransactionHash, network);
      const {transactionHash, state} = await messageRepository.get(messageHash, network);
      expect(transactionHash).to.be.eq(expectedTransactionHash);
      expect(state).to.be.eq('Pending');
    });

    it('should throw error if transactionHash is invalid', async () => {
      await messageRepository.add(messageHash, messageItem);
      const invalidTransactionHash = '0x0';
      await expect(messageRepository.markAsPending(messageHash, invalidTransactionHash, network)).to.be.rejectedWith(`Invalid transaction: ${invalidTransactionHash}`);
    });
  });

  it('should set message state', async () => {
    await messageRepository.add(messageHash, messageItem);
    const expectedState = 'Queued';
    await messageRepository.setState(messageHash, expectedState, network);
    const {state} = await messageRepository.get(messageHash, network);
    expect(state).to.be.eq(expectedState);
  });

  it('should mark message item as error', async () => {
    await messageRepository.add(messageHash, messageItem);
    const expectedMessageError = 'Pending Message Store Error';
    await messageRepository.markAsError(messageHash, expectedMessageError, network);
    const {error, state} = await messageRepository.get(messageHash, network);
    expect(error).to.be.eq(expectedMessageError);
    expect(state).to.be.eq('Error');
  });

  it('should throw error if signed message is missed', async () => {
    delete messageItem.message;
    await expect(messageRepository.add(messageHash, messageItem)).to.rejectedWith(`Message not found for hash: ${messageHash}`);
  });

  it('should get signatures', async () => {
    await messageRepository.add(messageHash, messageItem);
    await messageRepository.addSignature(messageHash, signedMessage.signature, network);
    const key = getKeyFromHashAndSignature(messageHash, signedMessage.signature);
    expect(await messageRepository.getCollectedSignatureKeyPairs(messageHash, network)).to.be.deep.eq([{key, signature: signedMessage.signature}]);
    const {signature} = unsignedMessageToSignedMessage(unsignedMessage, actionKey);
    await messageRepository.addSignature(messageHash, signature, network);
    const key2 = getKeyFromHashAndSignature(messageHash, signature);
    expect(await messageRepository.getCollectedSignatureKeyPairs(messageHash, network)).to.be.deep.eq([{key, signature: signedMessage.signature}, {key: key2, signature}]);
  });

  after(async () => {
    await knex.destroy();
  });
});
}
