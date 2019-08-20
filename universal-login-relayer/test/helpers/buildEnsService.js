import ENSBuilder from 'ens-builder';
import ENSService from '../../lib/integration/ethereum/ensService';
import {withENS} from '@universal-login/commons';
import {setupMultiChainProvider} from './setupMultiChainProvider';

const buildEnsService = async (wallet, domain) => {
  const ensBuilder = new ENSBuilder(wallet);
  const [label, tld] = domain.split('.');
  const ensAddress = await ensBuilder.bootstrapWith(label, tld);
  const provider = withENS(wallet.provider, ensAddress);
  const ensRegistrars = [domain];
  const {multiChainProvider} = await setupMultiChainProvider(provider, ensRegistrars);
  const ensService = new ENSService(multiChainProvider);
  return [ensService, multiChainProvider, ensBuilder];
};

export default buildEnsService;
