import {EventEmitter} from 'fbemitter';
import sinon from 'sinon';
import {Wallet, Contract, utils} from 'ethers';
import {computeContractAddress, TEST_GAS_PRICE, KeyPair, calculateInitializeSignature} from '@universal-login/commons';
import {deployFactory, encodeInitializeWithRefundData, deployWalletMasterWithRefund} from '@universal-login/contracts';
import WalletService from '../../lib/integration/ethereum/WalletService';
import buildEnsService from './buildEnsService';
import ENSService from '../../lib/integration/ethereum/ensService';


export default async function setupWalletService(wallet: Wallet) {
  const [ensService, multiChainService] = await buildEnsService(wallet, 'mylogin.eth');
  const factoryContract = multiChainService.getFactoryContract('default');
  const provider = multiChainService.getProvider('default');
  const hooks = new EventEmitter();
  const walletService = new WalletService(multiChainService, ensService, hooks);
  const callback = sinon.spy();
  hooks.addListener('created', callback);
  return {provider, wallet, walletService, callback, factoryContract, ensService};
}

export const createFutureWallet = async (keyPair: KeyPair, ensName: string, factoryContract: Contract, wallet: Wallet, ensService: ENSService, chainName: string) => {
  const futureContractAddress = computeContractAddress(factoryContract.address, keyPair.publicKey, await factoryContract.initCode());
  await wallet.sendTransaction({to: futureContractAddress, value: utils.parseEther('1')});
  const args = await ensService.argsFor(ensName, chainName) as string[];
  const initData = encodeInitializeWithRefundData([keyPair.publicKey, ...args, TEST_GAS_PRICE]);
  const signature = await calculateInitializeSignature(initData, keyPair.privateKey);
  return {signature, futureContractAddress};
};
