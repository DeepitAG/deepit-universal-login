import chai, {expect} from 'chai';
import {startMultiChainRelayer, getAuthorisation, postAuthorisationRequest, getInitData} from '../helpers/http';
import {createKeyPair, getDeployedBytecode, computeContractAddress, calculateInitializeSignature, createSignedMessage, waitExpect, TEST_GAS_PRICE} from '@universal-login/commons';
import {getDeployData} from '@universal-login/contracts';
import {utils, Wallet, Contract} from 'ethers';
import ProxyContract from '@universal-login/contracts/build/WalletProxy.json';
import WalletContract from '@universal-login/contracts/build/Wallet.json';
import {Provider} from 'ethers/providers';
import {WalletCreator} from '../helpers/WalletCreator';

describe('E2E: Relayer - Multi-Chain', async () => {
  let provider2: Provider;
  let ensAddress2: any;
  let deployer1: Wallet;
  let deployer2: Wallet;
  let walletContract2: Contract;
  let factoryContract2: Contract;
  let otherWallet: Wallet;
  let relayer: any;
  let walletCreator: WalletCreator;
  const network = 'default';
  const otherChainName = 'otherChain';
  const ensName = 'giulio.mylogin.eth';

  beforeEach(async () => {
    ({provider2, deployer1, deployer2, ensAddress2, walletContract2, factoryContract2, otherWallet, relayer} = await startMultiChainRelayer());
    walletCreator = new WalletCreator(relayer);
  });

  it('create and get authorisation on both chains', async () => {
    const {contractAddress, keyPair: keyPair1} = await walletCreator.deployWallet(network);
    const {contractAddress: otherContractAddress, keyPair: keyPair2} = await walletCreator.deployWallet(otherChainName);
    const newKeyPair = createKeyPair();
    const contract1 = new Contract(contractAddress, WalletContract.interface, deployer1);
    const contract2 = new Contract(otherContractAddress, WalletContract.interface, deployer2);
    await postAuthorisationRequest(relayer, contract1, newKeyPair, network);
    await postAuthorisationRequest(relayer, contract2, newKeyPair, otherChainName);
    const req1 = await getAuthorisation(relayer, contract1, keyPair1, network);
    const req2 = await getAuthorisation(relayer, contract2, keyPair2, otherChainName);
    expect(req1.result.status).to.eq(200);
    expect(req2.result.status).to.eq(200);
    expect(req1.response[0]).to.include({
      key: newKeyPair.publicKey,
      walletContractAddress: contractAddress,
    });
    expect(req2.response[0]).to.include({
      key: newKeyPair.publicKey,
      walletContractAddress: otherContractAddress,
    });
  });

  it('deploy conterfactually on secondary chain', async () => {
    const keyPair = createKeyPair();
    const initCode = getDeployData(ProxyContract as any, [walletContract2.address]);
    const contractAddress = computeContractAddress(factoryContract2.address, keyPair.publicKey, initCode);
    const initData = await getInitData(keyPair, ensName, ensAddress2, provider2, TEST_GAS_PRICE);
    const signature = await calculateInitializeSignature(initData, keyPair.privateKey);
    await deployer2.sendTransaction({to: contractAddress, value: utils.parseEther('0.5')});
    const initialRelayerBalance = await deployer2.getBalance();
    const result = await chai.request(relayer.server)
      .post(`/wallet/deploy/`)
      .send({
        publicKey: keyPair.publicKey,
        ensName,
        gasPrice: TEST_GAS_PRICE,
        signature,
        network: otherChainName
      });
    expect(result.status).to.eq(201);
    expect(await provider2.getCode(contractAddress)).to.eq(`0x${getDeployedBytecode(ProxyContract as any)}`);
    expect(await deployer2.getBalance()).to.be.above(initialRelayerBalance);
  });

  it('execute signed transfer in secondary chain', async () => {
    const {contractAddress, keyPair} = await walletCreator.deployWallet(otherChainName, ensName);
    await deployer2.sendTransaction({to: contractAddress, value: utils.parseEther('1.5')});
    const msg = {
      from: contractAddress,
      to: otherWallet.address,
      value: 1000000000,
      data: [],
      nonce: '0',
      gasToken: '0x0000000000000000000000000000000000000000',
      gasPrice: 110000000,
      gasLimit: 1000000,
    };
    const balanceBefore = await provider2.getBalance(otherWallet.address);
    const signedMessage = createSignedMessage(msg, keyPair.privateKey);
    const {status, body} = await chai.request(relayer.server)
      .post('/wallet/execution')
      .send({signedMessage, network: otherChainName});
    expect(status).to.eq(201);
    await waitExpect(async () => expect(await provider2.getBalance(otherWallet.address)).to.eq(balanceBefore.add(msg.value)) as any);
    const checkStatusId = async () => {
      const statusById = await chai.request(relayer.server)
        .get(`/wallet/execution/status/${otherChainName}/${body.transaction}`);
      expect(statusById.body.transactionHash).to.not.be.null;
    };
    await waitExpect(() => checkStatusId());
  });

  it('cannot interact with not supported chain', async () => {
    const {contractAddress, keyPair} = await walletCreator.deployWallet(network, ensName);
    await deployer1.sendTransaction({to: contractAddress, value: utils.parseEther('1.5')});
    const msg = {
      from: contractAddress,
      to: otherWallet.address,
      value: 1000000000,
      data: [],
      nonce: '0',
      gasToken: '0x0000000000000000000000000000000000000000',
      gasPrice: 110000000,
      gasLimit: 1000000,
    };
    const signedMessage = createSignedMessage(msg, keyPair.privateKey);
    const result = await chai.request(relayer.server)
      .post('/wallet/execution')
      .send({signedMessage, network: 'giulioChain'});
    expect(result.status).to.eq(409);
    expect(result.error.text).to.be.eq('{"error":"Error: Chain giulioChain is not supported","type":"ChainNotSupported"}');
  });

  afterEach(async () => {
    await relayer.stop();
  });
});
