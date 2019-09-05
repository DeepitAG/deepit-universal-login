import {utils, Wallet} from 'ethers';
import {deployContract} from 'ethereum-waffle';
import buildEnsService from '../helpers/buildEnsService';
import MockToken from '@universal-login/contracts/build/MockToken';
import {executeAddKey} from '@universal-login/contracts/testutils';
import createWalletContract from '../helpers/createWalletContract';

export default async function basicWalletContractWithMockToken(provider, wallets) {
  const [, otherWallet, wallet] = wallets;
  const [ensService, multiChainService] = await buildEnsService(wallet, 'mylogin.eth');
  const walletContract = await createWalletContract(wallet);
  const actionWallet = Wallet.createRandom();
  const actionKey = actionWallet.privateKey;
  const mockToken = await deployContract(wallet, MockToken);
  await wallet.sendTransaction({to: walletContract.address, value: utils.parseEther('1.0')});
  await mockToken.transfer(walletContract.address, utils.parseEther('1.0'));
  await executeAddKey(walletContract, actionWallet.address, wallet.privateKey);
  return {multiChainService, wallet, actionKey, provider, mockToken, walletContract, otherWallet };
}
