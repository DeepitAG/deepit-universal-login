import chai, {expect} from 'chai';
import {startMultiChainRelayer, createWalletContract, getAuthorisation, postAuthorisationRequest, getInitData} from '../helpers/http';
import {createKeyPair, getDeployedBytecode, computeContractAddress, calculateInitializeSignature, createSignedMessage, waitExpect, TEST_GAS_PRICE, OPERATION_CALL} from '@universal-login/commons';
import {getDeployData} from '@universal-login/contracts';
import {utils} from 'ethers';
import ProxyContract from '@universal-login/contracts/build/Proxy.json';

describe('E2E: Relayer - Multi-Chain', async () => {
  let provider1;
  let provider2;
  let ensAddress2;
  let deployer1;
  let deployer2;
  let walletMaster2;
  let factoryContract2;
  let wallet;
  let otherWallet;
  let relayer;
  const chainName = 'default';
  const otherChainName = 'otherChain';
  const ensName = 'giulio.mylogin.eth';

  beforeEach(async () => {
    ({provider1, provider2, deployer1, deployer2, ensAddress2, walletMaster2, factoryContract2, wallet, otherWallet, relayer} = await startMultiChainRelayer());
  });

  it('create and get authorisation on both chains', async () => {
    const contract = await createWalletContract(provider1, relayer.server, wallet.address, ensName, chainName);
    const otherContract = await createWalletContract(provider2, relayer.server, wallet.address, ensName, otherChainName);
    await postAuthorisationRequest(relayer, contract, wallet, chainName);
    await postAuthorisationRequest(relayer, otherContract, wallet, otherChainName);
    const req1 = await getAuthorisation(relayer, contract, wallet, chainName);
    const req2 = await getAuthorisation(relayer, otherContract, wallet, otherChainName);
    expect(req1.result.status).to.eq(200);
    expect(req2.result.status).to.eq(200);
    expect(req1.response[0]).to.include({
      key: wallet.address,
      walletContractAddress: contract.address,
    });
    expect(req2.response[0]).to.include({
      key: wallet.address,
      walletContractAddress: otherContract.address,
    });
  });

  it('deploy conterfactually on secondary chain', async () => {
    const keyPair = createKeyPair();
    const initCode = getDeployData(ProxyContract, [walletMaster2.address, '0x0']);
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
        chainName: otherChainName
      });
    expect(result.status).to.eq(201);
    expect(await provider2.getCode(contractAddress)).to.eq(`0x${getDeployedBytecode(ProxyContract)}`);
    expect(await deployer2.getBalance()).to.be.above(initialRelayerBalance);
  });

  it('Execute signed transfer in secondary chain', async () => {
    const contract = await createWalletContract(provider2, relayer.server, wallet.address, ensName, otherChainName);
    await deployer2.sendTransaction({to: contract.address, value: utils.parseEther('1.5')});
    const msg = {
      from: contract.address,
      to: otherWallet.address,
      value: 1000000000,
      data: [],
      nonce: '0',
      gasToken: '0x0000000000000000000000000000000000000000',
      gasPrice: 110000000,
      gasLimit: 1000000,
      operationType: OPERATION_CALL,
    };
    const balanceBefore = await provider2.getBalance(otherWallet.address);
    const signedMessage = createSignedMessage(msg, wallet.privateKey);
    const {status, body} = await chai.request(relayer.server)
      .post('/wallet/execution')
      .send({signedMessage, chainName: otherChainName});
    expect(status).to.eq(201);
    await waitExpect(async () => expect(await provider2.getBalance(otherWallet.address)).to.eq(balanceBefore.add(msg.value)));
    const checkStatusId = async () => {
      const statusById = await chai.request(relayer.server)
        .get(`/wallet/execution/status/${otherChainName}/${body.transaction}`);
      expect(statusById.body.transactionHash).to.not.be.null;
    };
    await waitExpect(() => checkStatusId());
  });

  it('cannot interact with not supported chain', async () => {
    const contract = await createWalletContract(provider1, relayer.server, wallet.address, ensName, chainName);
    await deployer1.sendTransaction({to: contract.address, value: utils.parseEther('1.5')});
    const msg = {
      from: contract.address,
      to: otherWallet.address,
      value: 1000000000,
      data: [],
      nonce: '0',
      gasToken: '0x0000000000000000000000000000000000000000',
      gasPrice: 110000000,
      gasLimit: 1000000,
      operationType: OPERATION_CALL,
    };
    const signedMessage = createSignedMessage(msg, wallet.privateKey);
    console.log('lol');
    const result = await chai.request(relayer.server)
      .post('/wallet/execution')
      .send({signedMessage, chainName: 'giulioChain'});
    expect(result.status).to.eq(409);
    expect(result.error.text).to.be.eq('{"error":"Error: Chain giulioChain is not supported","type":"ChainNotSupported"}')
  });

  afterEach(async () => {
    await relayer.stop();
  });
});
