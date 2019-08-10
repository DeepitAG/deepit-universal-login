import {utils, Contract} from 'ethers';
import ENS from '@universal-login/contracts/build/ENS.json';
import {parseDomain, resolveName, ENSDomainInfo} from '@universal-login/commons';
import MultiChainProvider from '@universal-login/commons';

class ENSService {

  constructor(private multiChainProvider: MultiChainProvider) {
  }

  async getDomainsInfo(chainName: string) {
    const ensRegistrars = this.multiChainProvider.getRegistrars(chainName);
    const chainSpec = this.multiChainProvider.getChainSpec(chainName);
    const provider = this.multiChainProvider.getNetworkProvider(chainName);
    const ens = new Contract(chainSpec.ensAddress, ENS.interface, provider);
    const domainsInfo : Record<string, ENSDomainInfo>  = {};
    for (let count = 0; count < ensRegistrars.length; count++) {
      const domain = ensRegistrars[count];
      const resolverAddress = await ens.resolver(utils.namehash(domain));
      const registrarAddress = await ens.owner(utils.namehash(domain));
      domainsInfo[domain] = {registrarAddress, resolverAddress};
    }
    return domainsInfo;
  }

  async findRegistrar(domain: string, chainName: string) {
    const domainsInfo = await this.getDomainsInfo(chainName)
    return domainsInfo[domain] || null;
  }

  async argsFor(ensName: string, chainName: string) {
    const chainSpec = this.multiChainProvider.getChainSpec(chainName);
    const [label, domain] = parseDomain(ensName);
    const hashLabel = utils.keccak256(utils.toUtf8Bytes(label));
    const node = utils.namehash(`${label}.${domain}`);
    const registrarConfig = await this.findRegistrar(domain, chainName);
    if (registrarConfig === null) {
      return null;
    }
    const {resolverAddress} = registrarConfig;
    const {registrarAddress} = registrarConfig;
    return [hashLabel, ensName, node, chainSpec.ensAddress, registrarAddress, resolverAddress];
  }

  resolveName = async (ensName: string, chainName: string) => {
    const provider = this.multiChainProvider.getNetworkProvider(chainName);
    const chainSpec = this.multiChainProvider.getChainSpec(chainName);
    return resolveName(provider, chainSpec.ensAddress, ensName);
  }
}

export default ENSService;
