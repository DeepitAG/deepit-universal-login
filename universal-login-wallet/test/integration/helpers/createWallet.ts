import {Wallet, utils} from 'ethers';
import WalletService from '../../../src/integration/storage/WalletService';

export const createWallet = async (name: string, walletService: WalletService, wallet: Wallet) => {
  const {contractAddress, waitForBalance, deploy, privateKey} = await walletService.createFutureWallet();
  wallet.sendTransaction({to: contractAddress, value: utils.parseEther('2.0')});
  await waitForBalance();
  await deploy(name, '1');
  walletService.setDeployed(name);
  return {contractAddress, privateKey};
};
