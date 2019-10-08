import {expect} from 'chai';
import {loadFixture} from 'ethereum-waffle';
import MessageExecutor from '../../../../lib/integration/ethereum/MessageExecutor';
import basicWalletContractWithMockToken from '../../../fixtures/basicWalletContractWithMockToken';
import {SignedMessage, TEST_ACCOUNT_ADDRESS} from '@universal-login/commons';
import {messageToSignedMessage, emptyMessage} from '@universal-login/contracts';
import {providers, Wallet, Contract} from 'ethers';
import {bigNumberify} from 'ethers/utils';
import {MultiChainService} from '../../../../lib/core/services/MultiChainService';
import MessageMemoryRepository from '../../../helpers/MessageMemoryRepository';

describe('INT: MessageExecutor', async () => {
  let messageExecutor: MessageExecutor;
  let signedMessage: SignedMessage;
  let provider: providers.Provider;
  let wallet: Wallet;
  let walletContract: Contract;
  let multiChainService: MultiChainService;
  const network = 'default';

  before(async () => {
    ({multiChainService, wallet, walletContract, provider} = await loadFixture(basicWalletContractWithMockToken));
    messageExecutor = new MessageExecutor(multiChainService, new MessageMemoryRepository(), async () => {});
    const message = {...emptyMessage, from: walletContract.address, to: TEST_ACCOUNT_ADDRESS, value: bigNumberify(2), nonce: await walletContract.lastNonce()};
    signedMessage = messageToSignedMessage(message, wallet.privateKey);
  });

  it('should execute transaction and wait for it', async () =>  {
    const expectedBalance = (await provider.getBalance(signedMessage.to)).add(signedMessage.value);
    const transactionResponse = await messageExecutor.execute(signedMessage, network);
    await transactionResponse.wait();
    const balance = await provider.getBalance(signedMessage.to);
    expect(balance).to.be.eq(expectedBalance);
  });
});
