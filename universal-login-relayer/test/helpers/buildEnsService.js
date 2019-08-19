import ENSBuilder from 'ens-builder';
import {withENS} from '@universal-login/commons';

const buildEnsService = async (wallet, domain) => {
  const ensBuilder = new ENSBuilder(wallet);
  const [label, tld] = domain.split('.');
  const ensAddress = await ensBuilder.bootstrapWith(label, tld);
  const provider = withENS(wallet.provider, ensAddress);
  const ensRegistrars = [domain];
  return [provider, ensRegistrars];
};

export default buildEnsService;
