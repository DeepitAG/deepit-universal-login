import {MultiChainProvider} from '../../lib/integration/ethereum/MultiChainProvider';
import {NetworkConfig, ChainSpec, deployContract, ContractJSON} from '@universal-login/commons';
import {ContractFactory} from 'ethers';
import ProxyCounterfactualFactory from '@universal-login/contracts/build/ProxyCounterfactualFactory.json';
import WalletMasterWithRefund from '@universal-login/contracts/build/WalletMasterWithRefund.json';
import {getWallets} from 'ethereum-waffle';
import {Provider} from 'ethers/providers';
import {getContractWhiteList} from '../../lib/http/relayers/RelayerUnderTest';

export async function setupMultiChainProvider(provider: Provider, ensRegistrars = []) {
  const [wallet] = getWallets(provider);
  const walletMaster = await deployContract(wallet, WalletMasterWithRefund as ContractJSON);
  const contractWhiteList = getContractWhiteList();
  const factoryContractDeployer = new ContractFactory(ProxyCounterfactualFactory.abi, ProxyCounterfactualFactory.bytecode, wallet);
  const factory = await factoryContractDeployer.deploy(['0x0']);
  await factory.deployed();
  const factoryAddress = factory.address;
  const configuration: NetworkConfig = {};
  configuration['default'] = {
    provider,
    factoryAddress,
    chainSpec: await provider.getNetwork() as ChainSpec,
    supportedTokens: [],
    privateKey: wallet.privateKey,
    ensRegistrars,
    walletMasterAddress: walletMaster.address,
    contractWhiteList
  };
  const multiChainProvider = new MultiChainProvider(configuration);
  return {multiChainProvider, factoryAddress};
}

