import ENSBuilder from 'ens-builder';
import ENSService from '../../lib/integration/ethereum/ensService';
import {withENS} from '@universal-login/commons';
import {setupMultiChainService} from './setupMultiChainService';

const buildEnsService = async (wallet, domain) => {
  const ensBuilder = new ENSBuilder(wallet);
  const [label, tld] = domain.split('.');
  const ensAddress = await ensBuilder.bootstrapWith(label, tld);
  const provider = withENS(wallet.provider, ensAddress);
  const ensRegistrars = [domain];
  const {multiChainService} = await setupMultiChainService(provider, ensRegistrars);
  const ensService = new ENSService(multiChainService);
  return [ensService, multiChainService, ensBuilder];
};

export default buildEnsService;
