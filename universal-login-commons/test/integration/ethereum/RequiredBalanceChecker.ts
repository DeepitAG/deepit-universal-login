import {expect} from 'chai';
import {utils, Contract, Wallet} from 'ethers';
import {deployContract} from 'ethereum-waffle';
import {BalanceChecker} from '../../../lib/integration/ethereum/BalanceChecker';
import {RequiredBalanceChecker} from '../../../lib/integration/ethereum/RequiredBalanceChecker';
import {ETHER_NATIVE_TOKEN} from '../../../lib/core/constants/constants';
import {TEST_ACCOUNT_ADDRESS} from '../../../lib/core/constants/test';
import MockToken from '../../fixtures/MockToken.json';
import {SupportedToken} from '../../../lib';
import {setupMultiChainProvider} from '../../fixtures/setupMultiChainProvider.js';
import {MultiChainProvider} from '../../../lib/integration/ethereum/MultiChainProvider';

describe('INT: RequiredBalanceChecker', () => {
  const chainName = "development";
  let multiChainProvider: MultiChainProvider;
  let balanceChecker: BalanceChecker;
  let requiredBalanceChecker: RequiredBalanceChecker;
  let wallet: Wallet;
  let mockToken: Contract;
  let supportedTokens: SupportedToken[];
  let server: any;

  beforeEach(async () => {
    ({multiChainProvider, server} = await setupMultiChainProvider());
    wallet = multiChainProvider.getWallet(chainName);
    balanceChecker = new BalanceChecker(multiChainProvider);
    requiredBalanceChecker = new RequiredBalanceChecker(balanceChecker);
    mockToken = await deployContract(wallet, MockToken);
    supportedTokens = [
      {
        address: ETHER_NATIVE_TOKEN.address,
        minimalAmount: utils.parseEther('0.5').toString()
      },
      {
        address: mockToken.address,
        minimalAmount: utils.parseEther('0.3').toString()
      }
    ];
  });

  it('no tokens with required balance', async () => {
    expect(await requiredBalanceChecker.findTokenWithRequiredBalance(supportedTokens, TEST_ACCOUNT_ADDRESS, chainName)).to.be.null;
  });

  it('one token with just enough balance', async () => {
    await mockToken.transfer(TEST_ACCOUNT_ADDRESS, utils.parseEther('0.3'));
    const actualTokenAddress = await requiredBalanceChecker.findTokenWithRequiredBalance(supportedTokens, TEST_ACCOUNT_ADDRESS, chainName);
    expect(actualTokenAddress).to.eq(mockToken.address);
  });

  it('two tokens with just enough balance', async () => {
    await wallet.sendTransaction({to: TEST_ACCOUNT_ADDRESS, value: utils.parseEther('0.5')});
    await mockToken.transfer(TEST_ACCOUNT_ADDRESS, utils.parseEther('0.3'));
    const actualTokenAddress = await requiredBalanceChecker.findTokenWithRequiredBalance(supportedTokens, TEST_ACCOUNT_ADDRESS, chainName);
    expect(actualTokenAddress).to.eq(ETHER_NATIVE_TOKEN.address);
  });

  afterEach(async () => {
    await server.close();
  })
});
