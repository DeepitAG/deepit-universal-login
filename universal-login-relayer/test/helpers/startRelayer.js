import {utils} from 'ethers';
import {deployContract} from 'ethereum-waffle';
import WalletMaster from '@universal-login/contracts/build/WalletMaster.json';
import {deployFactory} from '@universal-login/contracts';
import Token from '../../lib/http/relayers/abi/Token.json';
import ENSBuilder from 'ens-builder';
import {getContractWhiteList} from '../../lib/http/relayers/RelayerUnderTest';
import {getConfig} from '../../lib/index.js';

const defaultDomain = 'mylogin.eth';

async function depolyEns(wallet) {
  const ensBuilder = new ENSBuilder(wallet);
  const [label, tld] = defaultDomain.split('.');
  return ensBuilder.bootstrapWith(label, tld);
}

async function startRelayer(wallet, relayerConstructor) {
  const walletMaster = await deployContract(wallet, WalletMaster);
  const tokenContract = await deployContract(wallet, Token, []);
  const factoryContract = await deployFactory(wallet, walletMaster.address);
  const ensAddress = await depolyEns(wallet);
  const testConfig = getConfig('test');
  const config = Object.freeze({
    port: 33511,
    database: testConfig.database,
    onRampProviders: testConfig.onRampProviders,
    localization: testConfig.localization,
    networkConf: {
      default: {
        provider: wallet.provider,
        privateKey: wallet.privateKey,
        chainSpec: {
          ensAddress,
        },
        ensRegistrars: ['mylogin.eth'],
        walletMasterAddress: walletMaster.address,
        tokenContractAddress: tokenContract.address,
        contractWhiteList: getContractWhiteList(),
        factoryAddress: factoryContract.address,
        supportedTokens: [
          {
            address: tokenContract.address,
            minimalAmount: utils.parseEther('0.5').toString()
        }],
        tokenContractAddress: tokenContract.address
      }
    }
  });
  const relayer = new relayerConstructor(config, wallet.provider);
  await relayer.start();
  return {relayer, tokenContract, factoryContract};
}

module.exports = {startRelayer, defaultDomain};
