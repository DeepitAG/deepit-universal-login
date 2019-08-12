import {MultiChainProvider} from '../../lib/integration/ethereum/MultiChainProvider';
import {NetworkConfig, ChainSpec} from '../../lib/core/models/relayer';
import {ContractFactory, providers, Wallet, utils} from 'ethers';
import ProxyCounterfactualFactory from '@universal-login/contracts/build/ProxyCounterfactualFactory.json';
import {getWallets, defaultAccounts} from 'ethereum-waffle';
import {promisify} from 'util';
const ganache = require('ganache-cli');

const ganacheConfig = {
  accounts: defaultAccounts
}

export async function setupMultiChainProvider() {
  const server = ganache.server(ganacheConfig);
  const listenPromise = promisify(server.listen);
  await listenPromise(8545);
  const provider = new providers.JsonRpcProvider('http://localhost:8545');
  const wallet = getWallets(provider)[0];
  const factoryContractDeployer = new ContractFactory(ProxyCounterfactualFactory.abi, ProxyCounterfactualFactory.bytecode, wallet);
  let factory = await factoryContractDeployer.deploy(['0x0']);
  await factory.deployed();
  const factoryAddress = factory.address;
  const configuration: NetworkConfig = {};
  configuration['development'] = {
    jsonRpcUrl: 'http://localhost:8545',
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
  return {multiChainProvider, factoryAddress, server};
}

