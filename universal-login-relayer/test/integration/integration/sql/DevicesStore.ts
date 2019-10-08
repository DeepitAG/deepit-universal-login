import {expect} from 'chai';
import {DevicesStore} from '../../../../lib/integration/sql/services/DevicesStore';
import {TEST_CONTRACT_ADDRESS, TEST_ACCOUNT_ADDRESS, TEST_DEVICE_INFO, TEST_APPLICATION_NAME} from '@universal-login/commons';
import {getKnexConfig} from '../../../helpers/knex';
import {clearDatabase} from '../../../../lib/http/relayers/RelayerUnderTest';

describe('INT: DevicesStore', () => {
  let devicesStore: DevicesStore;
  const network = 'default';
  const device2 = {
    os: 'iPhone',
    applicationName: TEST_APPLICATION_NAME,
    platform: 'iphone',
    city: 'Warsaw, Poland',
    ipAddress: '84.10.249.134',
    time: '18 minutes ago',
    browser: 'Safari'
  };
  const knex = getKnexConfig();

  beforeEach(() => {
    devicesStore = new DevicesStore(knex);
  });

  it('initially empty', async () => {
    const devices = await devicesStore.get(TEST_CONTRACT_ADDRESS, network);
    expect(devices).to.be.deep.eq([]);
  });

  it('add to store 1 element', async () => {
    await devicesStore.add(TEST_CONTRACT_ADDRESS, TEST_ACCOUNT_ADDRESS, TEST_DEVICE_INFO, network);
    const devices = await devicesStore.get(TEST_CONTRACT_ADDRESS, network);
    expect(devices).to.be.deep.eq([{deviceInfo: TEST_DEVICE_INFO, publicKey: TEST_ACCOUNT_ADDRESS, network, contractAddress: TEST_CONTRACT_ADDRESS}]);
    const devices2 = await devicesStore.get(TEST_ACCOUNT_ADDRESS, network);
    expect(devices2).to.be.deep.eq([]);
  });

  it('add to store 2 elements', async () => {
    await devicesStore.add(TEST_CONTRACT_ADDRESS, TEST_ACCOUNT_ADDRESS, TEST_DEVICE_INFO, network);
    await devicesStore.add(TEST_CONTRACT_ADDRESS, TEST_CONTRACT_ADDRESS, device2, network);
    const devices = await devicesStore.get(TEST_CONTRACT_ADDRESS, network);
    expect(devices).to.be.deep.eq([
      {deviceInfo: TEST_DEVICE_INFO, publicKey: TEST_ACCOUNT_ADDRESS, contractAddress: TEST_CONTRACT_ADDRESS, network},
      {deviceInfo: device2, publicKey: TEST_CONTRACT_ADDRESS, contractAddress: TEST_CONTRACT_ADDRESS, network}]);
  });

  it('should remove element', async () => {
    await devicesStore.add(TEST_CONTRACT_ADDRESS, TEST_ACCOUNT_ADDRESS, TEST_DEVICE_INFO, network);
    const removeItemsCount = await devicesStore.remove(TEST_CONTRACT_ADDRESS, TEST_ACCOUNT_ADDRESS, network);
    expect(removeItemsCount).to.be.eq(1);
    const devices = await devicesStore.get(TEST_CONTRACT_ADDRESS, network);
    expect(devices).length(0);
  });

  afterEach(async () => {
    await clearDatabase(knex);
  });
  after(async () => {
    await knex.destroy();
  });
});
