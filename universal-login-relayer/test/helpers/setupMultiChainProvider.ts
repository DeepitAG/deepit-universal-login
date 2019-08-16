import {MultiChainProvider} from '../../lib/integration/ethereum/MultiChainProvider';
import {NetworkConfig, ChainSpec} from '@universal-login/commons';
import {ContractFactory} from 'ethers';
import ProxyCounterfactualFactory from '@universal-login/contracts/build/ProxyCounterfactualFactory.json';
import {getWallets, createMockProvider} from 'ethereum-waffle';

export async function setupMultiChainProvider() {
  const provider = createMockProvider();
  const wallet = getWallets(provider)[0];
  const factoryContractDeployer = new ContractFactory(ProxyCounterfactualFactory.abi, ProxyCounterfactualFactory.bytecode, wallet);
  let factory = await factoryContractDeployer.deploy(['0x0']);
  await factory.deployed();
  const factoryAddress = factory.address;
  const configuration: NetworkConfig = {};
  configuration['development'] = {
    provider,
    factoryAddress,
    chainSpec: provider.network as ChainSpec,
    supportedTokens: [],
    privateKey: wallet.privateKey,
    ensRegistrars: [],
    walletMasterAddress: "PLACEHOLDER",
    contractWhiteList: {
      proxy: [],
      master: []
    }
  };
  const multiChainProvider = new MultiChainProvider(configuration);
  return {multiChainProvider, factoryAddress};
}

