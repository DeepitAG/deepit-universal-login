import chai, {expect} from 'chai';
import chaiHttp from 'chai-http';
import {startRelayer, createWalletContract, getAuthorisation, postAuthorisationRequest} from '../helpers/http';
import {signCancelAuthorisationRequest, signGetAuthorisationRequest, createKeyPair} from '@universal-login/commons';
import {utils} from 'ethers';

chai.use(chaiHttp);


describe('E2E: Relayer - Authorisation routes', async () => {
  let relayer;
  let provider;
  let wallet;
  let otherWallet;
  let contract;
  const chainName = 'default';

  beforeEach(async () => {
    ({provider, wallet, otherWallet, relayer} = await startRelayer());
    contract = await createWalletContract(provider, relayer.server, wallet.address);
  });

  it('get empty pending authorisations', async () => {
    const {result, response} = await getAuthorisation(relayer, contract, wallet, chainName);
    expect(result.status).to.eq(200);
    expect(result.body.response).to.deep.eq([]);
  });

  it('create and get authorisation', async () => {
    await postAuthorisationRequest(relayer, contract, wallet, chainName);
    const {result, response} = await getAuthorisation(relayer, contract, wallet, chainName);
    expect(result.status).to.eq(200);
    expect(response[0]).to.include({
      key: wallet.address,
      walletContractAddress: contract.address,
    });
    expect(response[0].deviceInfo).to.deep.include({
      city: 'unknown',
      ipAddress: '::ffff:127.0.0.1'
    });
  });

  it('deny request', async () => {
    await postAuthorisationRequest(relayer, contract, wallet, chainName);

    const cancelAuthorisationRequest = {
      walletContractAddress: contract.address,
      publicKey: wallet.address,
      signature: ''
    };
    signCancelAuthorisationRequest(cancelAuthorisationRequest, wallet.privateKey);
    const result = await chai.request(relayer.server)
      .post(`/authorisation/${contract.address}`)
      .send({cancelAuthorisationRequest, chainName});
    expect(result.status).to.eq(204);


    const {result, response} = await getAuthorisation(relayer, contract, wallet, chainName);
    expect(response).to.deep.eq([]);
  });

  it('Send valid cancel request', async () => {
    const {publicKey} = createKeyPair();

    const cancelAuthorisationRequest = {
      walletContractAddress: contract.address,
      publicKey,
      signature: ''
    };

    signCancelAuthorisationRequest(cancelAuthorisationRequest, wallet.privateKey);
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
    const attackerAddress = utils.computeAddress(attackerPrivateKey);
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
