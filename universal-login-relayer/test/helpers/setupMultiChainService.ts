import {MultiChainService} from '../../lib/core/services/MultiChainService';
import {NetworkConfig, ChainSpec, deployContract, ContractJSON, ETHER_NATIVE_TOKEN} from '@universal-login/commons';
import {utils} from 'ethers';
import WalletMaster from '@universal-login/contracts/build/WalletMaster.json';
import {getWallets} from 'ethereum-waffle';
import {Provider} from 'ethers/providers';
import {getContractWhiteList} from '../../lib/http/relayers/RelayerUnderTest';
import {deployFactory} from '@universal-login/contracts';

export async function setupMultiChainService(provider: Provider, ensRegistrars = []) {
  const [wallet] = getWallets(provider);
  const walletMaster = await deployContract(wallet, WalletMaster as ContractJSON);
  await walletMaster.deployed();
  const contractWhiteList = getContractWhiteList();
  const factory = await deployFactory(wallet, walletMaster.address);
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
      walletMasterAddress: walletMaster.address,
      contractWhiteList
    }
  };
  const multiChainService = new MultiChainService(configuration);
  return {multiChainService, factoryAddress};
}

