import Knex from 'knex';
import {providers, Wallet, utils, Contract} from 'ethers';
const ENSBuilder = require('ens-builder');
import {withENS, getContractHash, ContractJSON, ETHER_NATIVE_TOKEN, deployContract, ChainSpec} from '@universal-login/commons';
import {deployFactory} from '@universal-login/contracts';
import WalletMasterWithRefund from '@universal-login/contracts/build/Wallet.json';
import ProxyContract from '@universal-login/contracts/build/WalletProxy.json';
import MockToken from '@universal-login/contracts/build/MockToken.json';
import {Config} from '../../config/relayer';
import Relayer from './Relayer';
import {getConfig} from '../../core/utils/config';

const DOMAIN_LABEL = 'mylogin';
const DOMAIN_TLD = 'eth';
const DOMAIN = `${DOMAIN_LABEL}.${DOMAIN_TLD}`;

type CreateRelayerArgs = {
  port: string;
  wallet: Wallet;
  walletContract: Contract;
  factoryContract: Contract;
};

export class RelayerUnderTest extends Relayer {
  static async createPreconfigured(wallet: Wallet, port = '33111') {
    const walletContract = await deployContract(wallet, WalletMasterWithRefund);
    const factoryContract = await deployFactory(wallet, walletContract.address);
    return this.createPreconfiguredRelayer({port, wallet, walletContract, factoryContract});
  }

  static async createPreconfiguredRelayer({port, wallet, walletContract, factoryContract}: CreateRelayerArgs) {
    const ensBuilder = new ENSBuilder(wallet);
    const ensAddress = await ensBuilder.bootstrapWith(DOMAIN_LABEL, DOMAIN_TLD);
    const providerWithENS = withENS(wallet.provider as providers.Web3Provider, ensAddress);
    const contractWhiteList = getContractWhiteList();
    const mockToken = await deployContract(wallet, MockToken);
    const supportedTokens = [
      {
        address: mockToken.address,
        minimalAmount: utils.parseEther('0.05').toString()
      },
      {
        address: ETHER_NATIVE_TOKEN.address,
        minimalAmount: '500000'
      }
    ];
    const testConfig = getConfig('test');
    const config: Config = {
      port,
      database: testConfig.database,
      onRampProviders: testConfig.onRampProviders,
      localization: testConfig.localization,
      networkConfig: {
        default: {
          privateKey: wallet.privateKey,
          chainSpec: providerWithENS.network as ChainSpec,
          ensRegistrars: [DOMAIN],
          walletContractAddress: walletContract.address,
          contractWhiteList,
          factoryAddress: factoryContract.address,
          supportedTokens,
          provider: providerWithENS,
        }
      }
    };
    const relayer = new RelayerUnderTest(config);
    return {relayer, factoryContract, supportedTokens, contractWhiteList, ensAddress, walletContract, mockToken, provider: providerWithENS};
  }

  static async createPreconfiguredMultiChainRelayer(port: string, wallet1: Wallet, wallet2: Wallet) {
    const provider1 = await this.configureENSProvider(wallet1);
    const provider2 = await this.configureENSProvider(wallet2);
    const contractWhiteList = getContractWhiteList();
    const mockToken1 = await deployContract(wallet1, MockToken as any);
    const mockToken2 = await deployContract(wallet2, MockToken as any);
    const walletContract1 = await deployContract(wallet1, WalletMasterWithRefund as any);
    const walletContract2 = await deployContract(wallet2, WalletMasterWithRefund as any);
    const factoryContract1 = await deployFactory(wallet1, walletContract1.address);
    const factoryContract2 = await deployFactory(wallet2, walletContract2.address);
    const supportedTokens1 = [
      {
        address: mockToken1.address,
        minimalAmount: utils.parseEther('0.05').toString()
      },
      {
        address: ETHER_NATIVE_TOKEN.address,
        minimalAmount: utils.parseEther('0.05').toString()
      }
    ];
    const supportedTokens2 = [
      {
        address: mockToken2.address,
        minimalAmount: utils.parseEther('0.05').toString()
      },
      {
        address: ETHER_NATIVE_TOKEN.address,
        minimalAmount: utils.parseEther('0.05').toString()
      }
    ];
    const testConfig = getConfig('test');
    const config: Config = {
      port,
      database: testConfig.database,
      onRampProviders: testConfig.onRampProviders,
      localization: testConfig.localization,
      networkConfig: {
        default: {
          privateKey: wallet1.privateKey,
          chainSpec: provider1.network as ChainSpec,
          ensRegistrars: [DOMAIN],
          walletContractAddress: walletContract1.address,
          contractWhiteList,
          factoryAddress: factoryContract1.address,
          supportedTokens: supportedTokens1,
          provider: provider1,
        },
        otherChain: {
          privateKey: wallet2.privateKey,
          chainSpec: provider2.network as ChainSpec,
          ensRegistrars: [DOMAIN],
          walletContractAddress: walletContract2.address,
          contractWhiteList,
          factoryAddress: factoryContract2.address,
          supportedTokens: supportedTokens2,
          provider: provider2,
        }
      }
    };
    const ensAddress1 = provider1.network.ensAddress;
    const ensAddress2 = provider2.network.ensAddress;
    const relayer = new RelayerUnderTest(config);
    return {relayer, factoryContract1, factoryContract2, supportedTokens1, supportedTokens2, contractWhiteList,
            ensAddress1, ensAddress2, walletContract1, walletContract2, mockToken1, mockToken2, provider1, provider2};
  }

  static async configureENSProvider(wallet: Wallet) {
    const ensBuilder = new ENSBuilder(wallet);
    const ensAddress = await ensBuilder.bootstrapWith(DOMAIN_LABEL, DOMAIN_TLD);
    return withENS(wallet.provider as providers.Web3Provider, ensAddress);
  }

  url() {
    return `http://127.0.0.1:${this.port}`;
  }

  async clearDatabase() {
    return clearDatabase(this.database);
  }

  async stop() {
    await clearDatabase(this.database);
    await super.stopLater();
  }
}

export async function clearDatabase(knex: Knex) {
  await knex.delete().from('devices');
  await knex.delete().from('queue_items');
  await knex.delete().from('signature_key_pairs');
  await knex.delete().from('messages');
  await knex.delete().from('authorisations');
}

export const getContractWhiteList = () => ({
  wallet: [],
  proxy: [getContractHash(ProxyContract as ContractJSON)]
});
