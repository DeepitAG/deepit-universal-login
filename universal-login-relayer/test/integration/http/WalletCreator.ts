import {expect} from 'chai';
import {providers, Contract} from 'ethers';
import {createMockProvider, getWallets} from 'ethereum-waffle';
import {getDeployedBytecode} from '@universal-login/commons';
import ProxyContract from '@universal-login/contracts/build/WalletProxy.json';
import WalletMasterWithRefund from '@universal-login/contracts/build/Wallet.json';
import {WalletCreator} from '../../helpers/WalletCreator';
import Relayer, {RelayerUnderTest} from '../../../lib';

describe('WalletCreator', () => {
  let walletCreator: WalletCreator;
  let relayer: Relayer;
  let provider: providers.Provider;

  const relayerPort = '33112';
  const chainName = 'default';

  beforeEach(async () => {
    provider = createMockProvider();
    const [wallet] = getWallets(provider);
    ({relayer} = await RelayerUnderTest.createPreconfigured(wallet, relayerPort));
    await relayer.start();
    walletCreator = new WalletCreator(relayer as any);
  });

  afterEach(async () => {
    await relayer.stop();
  });

  it('Creates wallet contract', async () => {
    const applicationWallet = await walletCreator.createFutureWallet(chainName);
    expect(applicationWallet.keyPair.privateKey).to.be.properPrivateKey;
    expect(applicationWallet.contractAddress).to.be.properAddress;
  });

  it('Sends funds to the contract', async () => {
    const {contractAddress, keyPair} = await walletCreator.deployWallet(chainName);
    expect(await provider.getBalance(contractAddress)).to.eq('999999999999500000');
    expect(contractAddress).to.be.properAddress;
    expect(await provider.getCode(contractAddress)).to.eq(`0x${getDeployedBytecode(ProxyContract as any)}`);
    const walletContract = new Contract(contractAddress, WalletMasterWithRefund.interface, provider);
    expect(await walletContract.keyExist(keyPair.publicKey)).to.be.true;
  });
});