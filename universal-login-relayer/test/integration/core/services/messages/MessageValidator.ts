import {expect} from 'chai';
import {Contract, Wallet, utils, providers} from 'ethers';
import {loadFixture} from 'ethereum-waffle';
import {createSignedMessage, MessageWithFrom, TEST_ACCOUNT_ADDRESS, ContractWhiteList, MultiChainProvider} from '@universal-login/commons';
import basicWalletContractWithMockToken from '../../../../fixtures/basicWalletContractWithMockToken';
import MessageValidator from '../../../../../lib/core/services/messages/MessageValidator';
import {messageToTransaction} from '../../../../../lib/core/utils/utils';
import {getContractWhiteList} from '../../../../../lib/http/relayers/RelayerUnderTest';

describe('INT: MessageValidator', async () => {
  let message: MessageWithFrom;
  let mockToken: Contract;
  let walletContract: Contract;
  let wallet: Wallet;
  let messageValidator: MessageValidator;
  let multiChainProvider: MultiChainProvider;
  const contractWhiteList: ContractWhiteList = getContractWhiteList();
  const chainName = 'development';

  before(async () => {
    ({mockToken, wallet, walletContract} = await loadFixture(basicWalletContractWithMockToken));
    message = {from: walletContract.address, gasToken: mockToken.address, to: TEST_ACCOUNT_ADDRESS};
    messageValidator = new MessageValidator(multiChainProvider);
  });

  it('successfully pass the validation', async () => {
    const signedMessage = createSignedMessage({...message}, wallet.privateKey);
    const transactionRequest: providers.TransactionRequest = messageToTransaction(signedMessage);
    await expect(messageValidator.validate(signedMessage, transactionRequest, chainName)).to.not.be.rejected;
  });

  it('throws when not enough gas', async () => {
    const signedMessage = createSignedMessage({...message, gasLimit: 100}, wallet.privateKey);
    const transactionRequest: providers.TransactionRequest = messageToTransaction(signedMessage);
    await expect(messageValidator.validate(signedMessage, transactionRequest, chainName)).to.be.eventually.rejectedWith('Not enough gas');
  });

  it('throws when not enough tokens', async () => {
    const signedMessage = createSignedMessage({...message, gasLimit: utils.parseEther('2.0')}, wallet.privateKey);
    const transactionRequest: providers.TransactionRequest = messageToTransaction(signedMessage);
    await expect(messageValidator.validate(signedMessage, transactionRequest, chainName))
      .to.be.eventually.rejectedWith('Not enough tokens');
  });

  it('throws when invalid proxy', async () => {
    const messageValidatorWithInvalidProxy = new MessageValidator(multiChainProvider);
    const signedMessage = createSignedMessage({...message}, wallet.privateKey);
    const transactionRequest: providers.TransactionRequest = messageToTransaction(signedMessage);
    await expect(messageValidatorWithInvalidProxy.validate(signedMessage, transactionRequest, chainName)).to.be.eventually.rejectedWith(`Invalid proxy at address '${signedMessage.from}'. Deployed contract bytecode hash: '${contractWhiteList.proxy[0]}'. Supported bytecode hashes: [${TEST_ACCOUNT_ADDRESS}]`);
  });
});
