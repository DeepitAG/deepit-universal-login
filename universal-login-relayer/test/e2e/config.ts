import chai, {expect} from 'chai';
import chaiHttp from 'chai-http';
import {startRelayer} from '../helpers/http';
import {getPublicConfig, getPublicNetworkConfig} from '../../lib/http/routes/config';
import {RelayerUnderTest} from '../../lib';

chai.use(chaiHttp);

describe('E2E: Relayer - Config routes', async () => {
  let relayer: RelayerUnderTest;

  before(async () => {
    ({relayer} = await startRelayer());
  });

  it('should return public config', async () => {
    const {localization, onRampProviders, ipGeolocationApi} = relayer.getConfig();
    const networkConfig = getPublicNetworkConfig(relayer.getConfig());
    const expectedConfig = {
      localization,
      onRampProviders,
      networkConfig,
      ipGeolocationApi
    };
    const result = await chai.request(relayer.getServer())
      .get('/config');
    expect(result.body.config).to.be.deep.eq(expectedConfig);
  });


  it('getPublicConfig should return PublicConfig', () => {
    const {localization, onRampProviders, ipGeolocationApi} = relayer.getConfig();
    const networkConfig = getPublicNetworkConfig(relayer.getConfig());
    const expectedConfig = {
      localization,
      onRampProviders,
      networkConfig,
      ipGeolocationApi
    };
    const publicConfig = getPublicConfig(relayer.getConfig());

    expect(publicConfig).to.be.deep.eq(expectedConfig);
  });

  after(async () => {
    await relayer.stop();
  });
});
