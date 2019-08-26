import chai, {expect} from 'chai';
import chaiHttp from 'chai-http';
import {startRelayerWithRefund, createWalletCounterfactually, getAuthorisation, postAuthorisationRequest} from '../helpers/http';
import {signCancelAuthorisationRequest, signGetAuthorisationRequest, createKeyPair} from '@universal-login/commons';
import {utils} from 'ethers';

chai.use(chaiHttp);


describe('E2E: Relayer - Authorisation routes', async () => {
  let relayer;
  let otherWallet;
  let contract;
  let keyPair;
  let walletMaster;
  let factoryContract;
  let ensAddress;
  let deployer;

  const relayerPort = '33511';
  const relayerUrl = `http://localhost:${relayerPort}`;
  const chainName = 'default';

  beforeEach(async () => {
    keyPair = createKeyPair();
    ({otherWallet, relayer, deployer, walletMaster, ensAddress, factoryContract} = await startRelayerWithRefund(relayerPort));
    contract = await createWalletCounterfactually(deployer, relayerUrl, keyPair, walletMaster.address, factoryContract.address, ensAddress);
  });

  it('get empty pending authorisations', async () => {
    const {result} = await getAuthorisation(relayer, contract.address, keyPair, chainName);
    expect(result.status).to.eq(200);
    expect(result.body.response).to.deep.eq([]);
  });

  it('create and get authorisation', async () => {
    const newKeyPair = createKeyPair();
    await postAuthorisationRequest(relayer, contract.address, newKeyPair, chainName);

    const {result, response} = await getAuthorisation(relayer, contract.address, keyPair, chainName);
    expect(result.status).to.eq(200);
    expect(response[0]).to.include({
      key: newKeyPair.publicKey,
      walletContractAddress: contract.address,
    });
    expect(response[0].deviceInfo).to.deep.include({
      city: 'unknown',
      ipAddress: '::ffff:127.0.0.1'
    });
  });

  it('deny request', async () => {
    const newKeyPair = createKeyPair();
    await postAuthorisationRequest(relayer, contract.address, newKeyPair, chainName);

    const cancelAuthorisationRequest = {
      walletContractAddress: contract.address,
      publicKey: newKeyPair.publicKey,
      signature: ''
    };
    signCancelAuthorisationRequest(cancelAuthorisationRequest, keyPair.privateKey);
    const result = await chai.request(relayer.server)
      .post(`/authorisation/${contract.address}`)
      .send({cancelAuthorisationRequest, chainName});
    expect(result.status).to.eq(204);


    const {result, response} = await getAuthorisation(relayer, contract.address, keyPair, chainName);
    expect(response).to.deep.eq([]);
  });

  it('Send valid cancel request', async () => {
    const {publicKey} = createKeyPair();
    const cancelAuthorisationRequest = {
      walletContractAddress: contract.address,
      publicKey,
      signature: ''
    };

    signCancelAuthorisationRequest(cancelAuthorisationRequest, keyPair.privateKey);
    const {body, status} = await chai.request(relayer.server)
      .post(`/authorisation//${contract.address}`)
      .send({cancelAuthorisationRequest, chainName});

    expect(status).to.eq(204);
    expect(body).to.deep.eq({});
  });

  it('Send forged cancel request', async () => {
    const attackerPrivateKey = createKeyPair().privateKey;
    const attackerAddress = utils.computeAddress(attackerPrivateKey);
    const cancelAuthorisationRequest = {
      walletContractAddress: contract.address,
      publicKey: otherWallet.address,
      signature: ''
    };

    signCancelAuthorisationRequest(cancelAuthorisationRequest, attackerPrivateKey);
    const {body, status} = await chai.request(relayer.server)
      .post(`/authorisation/${contract.address}`)
      .send({cancelAuthorisationRequest, chainName});

    expect(status).to.eq(401);
    expect(body.type).to.eq('UnauthorisedAddress');
    expect(body.error).to.eq(`Error: Unauthorised address: ${attackerAddress}`);
  });

  it('Forged getPending request', async () => {
    const attackerPrivateKey = createKeyPair().privateKey;
    const getAuthorisationRequest = {
      walletContractAddress: contract.address,
      signature: ''
    };
    signGetAuthorisationRequest(getAuthorisationRequest, attackerPrivateKey);

    const {body, status} = await chai.request(relayer.server)
      .get(`/authorisation/${chainName}/${contract.address}?signature=${getAuthorisationRequest.signature}`)
      .send({chainName});

    expect(status).to.eq(401);
    expect(body.type).to.eq('UnauthorisedAddress');
  });

  afterEach(async () => {
    await relayer.stop();
  });
});
