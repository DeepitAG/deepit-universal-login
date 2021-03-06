export interface Notification {
  id: number;
  key: string;
  walletContractAddress: string;
  securityCodeWithFakes?: number[];
  deviceInfo: DeviceInfo;
}

export interface DeviceInfo {
  ipAddress: string;
  name: string;
  city: string;
  os: string;
  browser: string;
  time: string;
}
