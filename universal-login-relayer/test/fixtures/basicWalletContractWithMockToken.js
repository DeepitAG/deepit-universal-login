import {utils, Wallet} from 'ethers';
import {deployContract, getWallets} from 'ethereum-waffle';
import {ACTION_KEY, setupMultiChainProvider} from '@universal-login/commons';
import MockToken from '@universal-login/contracts/build/MockToken';
import createWalletContract from '../helpers/createWalletContract';
import buildEnsService from '../helpers/buildEnsService';

export default async function basicWalletContractWithMockToken(provider, wallets) {
  const {multiChainProvider} = await setupMultiChainProvider();
  const provider = multiChainProvider.getNetworkProvider('development');
  const wallets = getWallets(provider);
  const [wallet, otherWallet] = wallets;
  const [ensService, provider] = await buildEnsService(wallet, 'mylogin.eth');
  const walletContract = await createWalletContract(wallet, ensService);
  const actionWallet = Wallet.createRandom();
  const actionKey = actionWallet.privateKey;
  const mockToken = await deployContract(wallet, MockToken);
  await walletContract.addKey(actionWallet.address, ACTION_KEY);
  await wallet.sendTransaction({to: walletContract.address, value: utils.parseEther('1.0')});
  await mockToken.transfer(walletContract.address, utils.parseEther('1.0'));
  return {multiChainProvider, wallet, actionKey, provider, mockToken, walletContract, otherWallet };
}
