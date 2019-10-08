import UniversalLoginSDK from '../../api/sdk';

export async function setBetaNotice(sdk: UniversalLoginSDK) {
  const {name} = (await sdk.getRelayerConfig())!.networkConfig['default'].chainSpec;
  sdk.setNotice(`This is beta version running on ${name}`);
}
