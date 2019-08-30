import {MultiChainService} from '../../lib/core/services/MultiChainService';
import {NetworkConfig, ChainSpec, deployContract, ContractJSON, ETHER_NATIVE_TOKEN} from '@universal-login/commons';
import {utils} from 'ethers';
import Wallet from '@universal-login/contracts/build/Wallet.json';
import {getWallets} from 'ethereum-waffle';
import {Provider} from 'ethers/providers';
import {getContractWhiteList} from '../../lib/http/relayers/RelayerUnderTest';
import {deployFactory} from '@universal-login/contracts';

export async function setupMultiChainService(provider: Provider, ensRegistrars = []) {
  const [wallet] = getWallets(provider);
  const walletContract = await deployContract(wallet, Wallet as ContractJSON);
  await walletContract.deployed();
  const contractWhiteList = getContractWhiteList();
  const factory = await deployFactory(wallet, walletContract.address);
  await factory.deployed();
  const factoryAddress = factory.address;
  const configuration: NetworkConfig = {
    default: {
      provider,
      factoryAddress,
      chainSpec: await provider.getNetwork() as ChainSpec,
      supportedTokens: [{
        ...ETHER_NATIVE_TOKEN,
        minimalAmount: utils.parseEther('0.05').toString()
      }],
      privateKey: wallet.privateKey,
      ensRegistrars,
      walletContractAddress: walletContract.address,
      contractWhiteList
    }
  };
  const multiChainService = new MultiChainService(configuration);
  return {multiChainService, factoryAddress};
}
