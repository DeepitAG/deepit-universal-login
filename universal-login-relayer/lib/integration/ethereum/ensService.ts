import {utils, Contract} from 'ethers';
import ENS from '@universal-login/contracts/build/ENS.json';
import {parseDomain, resolveName, ENSDomainInfo} from '@universal-login/commons';
import {MultiChainService} from '../../core/services/MultiChainService';

class ENSService {

  constructor(private multiChainService: MultiChainService) {
  }

  async getDomainsInfo(network: string) {
    const ensRegistrars = this.multiChainService.getRegistrars(network);
    const chainSpec = this.multiChainService.getChainSpec(network);
    const provider = this.multiChainService.getProvider(network);
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

  async findRegistrar(domain: string, network: string) {
    const domainsInfo = await this.getDomainsInfo(network);
    return domainsInfo[domain] || null;
  }

  async argsFor(ensName: string, network: string) {
    const chainSpec = this.multiChainService.getChainSpec(network);
    const [label, domain] = parseDomain(ensName);
    const hashLabel = utils.keccak256(utils.toUtf8Bytes(label));
    const node = utils.namehash(`${label}.${domain}`);
    const registrarConfig = await this.findRegistrar(domain, network);
    if (registrarConfig === null) {
      return null;
    }
    const {resolverAddress} = registrarConfig;
    const {registrarAddress} = registrarConfig;
    return [hashLabel, ensName, node, chainSpec.ensAddress, registrarAddress, resolverAddress];
  }

  resolveName = async (ensName: string, network: string) => {
    const provider = this.multiChainService.getProvider(network);
    const chainSpec = this.multiChainService.getChainSpec(network);
    return resolveName(provider, chainSpec.ensAddress, ensName);
  }
}

export default ENSService;
