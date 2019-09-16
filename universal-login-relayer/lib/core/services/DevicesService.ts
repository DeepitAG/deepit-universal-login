import {Device, DeviceInfo, RelayerRequest} from '@universal-login/commons';
import {DevicesStore} from '../../integration/sql/services/DevicesStore';
import WalletMasterContractService from '../../integration/ethereum/services/WalletMasterContractService';

export class DevicesService {
  constructor(private devicesStore: DevicesStore, private walletMasterContractService: WalletMasterContractService) {
  }

  async add(contractAddress: string, publicKey: string, deviceInfo: DeviceInfo, network: string) {
    return this.devicesStore.add(contractAddress, publicKey, deviceInfo, network);
  }

  async addOrUpdate(contractAddress: string, publicKey: string, deviceInfo: DeviceInfo, network: string) {
    await this.devicesStore.remove(contractAddress, publicKey, network);
    return this.devicesStore.add(contractAddress, publicKey, deviceInfo, network);
  }

  async getDevices(devicesRequest: RelayerRequest, network: string): Promise<Device[]> {
    await this.walletMasterContractService.ensureValidRelayerRequestSignature(devicesRequest, network);
    return this.devicesStore.get(devicesRequest.contractAddress, network);
  }
}
