import {Wallet, utils, Contract} from 'ethers';
import {RelayerUnderTest} from '../../lib/http/relayers/RelayerUnderTest';
import {createMockProvider, getWallets} from 'ethereum-waffle';
import {waitForContractDeploy, calculateInitializeSignature, TEST_GAS_PRICE, parseDomain, signGetAuthorisationRequest} from '@universal-login/commons';
import WalletContract from '@universal-login/contracts/build/WalletMaster.json';
import ENS from '@universal-login/contracts/build/ENS.json';
import chai from 'chai';
import {deployFactory, getFutureAddress, deployWalletMasterWithRefund, encodeInitializeWithRefundData} from '@universal-login/contracts';

export const startRelayer = async (port = '33111') => {
  const provider = createMockProvider();
  const [deployer] = getWallets(provider);
  const wallet = Wallet.createRandom();
  const otherWallet = Wallet.createRandom();
  const {relayer, factoryContract, walletMaster, mockToken, ensAddress} = await RelayerUnderTest.createPreconfigured(deployer, port);
  await relayer.start();
  return {provider, wallet, otherWallet, relayer, deployer, factoryContract, walletMaster, mockToken, ensAddress};
};

export const startMultiChainRelayer = async (port = '33111') => {
  const provider1 = createMockProvider();
  const provider2 = createMockProvider();
  const [deployer1] = getWallets(provider1);
  const [deployer2] = getWallets(provider2);
  const wallet = Wallet.createRandom();
  const otherWallet = Wallet.createRandom();
  const {relayer, factoryContract1, factoryContract2, walletMaster1, walletMaster2, mockToken1, mockToken2, ensAddress1, ensAddress2} = await RelayerUnderTest.createPreconfiguredMultiChainRelayer(port, deployer1, deployer2);
  await relayer.start();
  return {provider1, provider2, wallet, otherWallet, relayer, deployer1, deployer2, factoryContract1, factoryContract2, walletMaster1, walletMaster2, mockToken1, mockToken2, ensAddress1, ensAddress2};
};

export const createWalletContract = async (provider, relayerUrlOrServer, publicKey, ensName = 'marek.mylogin.eth', chainName = 'default') => {
  const result = await chai.request(relayerUrlOrServer)
  .post('/wallet')
  .send({
    managementKey: publicKey,
    ensName,
    chainName
  });
  const {transaction} = result.body;
  return waitForContractDeploy(provider, WalletContract, transaction.hash);
};

export const createWalletCounterfactually = async (wallet, relayerUrlOrServer, keyPair, walletMasterAddress, factoryContractAddress, ensAddress, ensName = 'marek.mylogin.eth', chainName = 'default') => {
  const futureAddress = getFutureAddress(walletMasterAddress, factoryContractAddress, keyPair.publicKey);
  await wallet.sendTransaction({to: futureAddress, value: utils.parseEther('1.0')});
  const initData = await getInitData(keyPair, ensName, ensAddress, wallet.provider, TEST_GAS_PRICE);
  const signature = await calculateInitializeSignature(initData, keyPair.privateKey);
  await chai.request(relayerUrlOrServer)
  .post('/wallet/deploy')
  .send({
    publicKey: keyPair.publicKey,
    ensName,
    gasPrice: TEST_GAS_PRICE,
    signature,
    chainName
  });
  return new Contract(futureAddress, WalletContract.interface, wallet);
};


export const startRelayerWithRefund = async (port = '33111') => {
  const provider = createMockProvider();
  const [deployer, wallet, otherWallet] = getWallets(provider);
  const walletMaster = await deployWalletMasterWithRefund(deployer);
  const factoryContract = await deployFactory(deployer, walletMaster.address);
  const {relayer, mockToken, ensAddress} = await RelayerUnderTest.createPreconfiguredRelayer({port, wallet: deployer, walletMaster, factoryContract});
  await relayer.start();
  return {provider, relayer, mockToken, factoryContract, walletMaster, deployer, ensAddress, wallet, otherWallet};
};

export const getInitData = async (keyPair, ensName, ensAddress, provider, gasPrice) => {
  const [label, domain] = parseDomain(ensName);
  const hashLabel = utils.keccak256(utils.toUtf8Bytes(label));
  const node = utils.namehash(`${label}.${domain}`);
  const ens = new Contract(ensAddress, ENS.interface, provider);
  const resolverAddress = await ens.resolver(utils.namehash(domain));
  const registrarAddress = await ens.owner(utils.namehash(domain));
  return encodeInitializeWithRefundData([keyPair.publicKey, hashLabel, ensName, node, ensAddress, registrarAddress, resolverAddress, gasPrice]);
};

export const postAuthorisationRequest = async(relayer, walletContractAddress, keyPair, chainName) =>
  await chai.request(relayer.server)
    .post('/authorisation')
    .send({
      walletContractAddress,
      key: keyPair.publicKey,
      chainName
    })


export const getAuthorisation = async (relayer, walletContractAddress, keyPair, chainName) => {
  const getAuthorisationRequest = {
    walletContractAddress,
    signature: ''
  };
  signGetAuthorisationRequest(getAuthorisationRequest, keyPair.privateKey);
  const {signature} = getAuthorisationRequest;

  const result = await chai.request(relayer.server)
    .get(`/authorisation/${chainName}/${walletContractAddress}?signature=${signature}`)
    .send({
      key: keyPair.publicKey,
    });
  return {result, response: result.body.response};
}
