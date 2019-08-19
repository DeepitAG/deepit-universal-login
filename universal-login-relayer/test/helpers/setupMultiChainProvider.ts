import {MultiChainProvider} from '../../lib/integration/ethereum/MultiChainProvider';
import {NetworkConfig, ChainSpec} from '@universal-login/commons';
import {ContractFactory} from 'ethers';
import ProxyCounterfactualFactory from '@universal-login/contracts/build/ProxyCounterfactualFactory.json';
import {getWallets, createMockProvider} from 'ethereum-waffle';
import {Provider} from 'ethers/providers';
import buildEnsService from './buildEnsService';
import ENSService from '../../lib/integration/ethereum/ensService';
import {getContractWhiteList} from '../../lib/http/relayers/RelayerUnderTest';

export async function setupMultiChainProvider(provider: Provider) {
  const wallet = getWallets(provider)[0];
  const contractWhiteList = getContractWhiteList();
  const factoryContractDeployer = new ContractFactory(ProxyCounterfactualFactory.abi, ProxyCounterfactualFactory.bytecode, wallet);
  let factory = await factoryContractDeployer.deploy(['0x0']);
  await factory.deployed();
  const factoryAddress = factory.address;
  const configuration: NetworkConfig = {};
  const [providerWithENS, ensRegistrars] = await buildEnsService(wallet, 'mylogin.eth') as any[];
  configuration['default'] = {
    provider: providerWithENS,
    factoryAddress,
    chainSpec: await providerWithENS.getNetwork() as ChainSpec,
    supportedTokens: [],
    privateKey: wallet.privateKey,
    ensRegistrars,
    walletMasterAddress: "PLACEHOLDER",
    contractWhiteList
  };
  const multiChainProvider = new MultiChainProvider(configuration);
  const ensService = new ENSService(multiChainProvider);
  return {multiChainProvider, factoryAddress, ensService};
}

