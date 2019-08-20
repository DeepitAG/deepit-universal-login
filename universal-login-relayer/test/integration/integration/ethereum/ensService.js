import chai, {expect} from 'chai';
import buildEnsService from '../../../helpers/buildEnsService';
import {getWallets, createMockProvider} from 'ethereum-waffle';

chai.use(require('chai-string'));

describe('INT: ENSService', async () => {
  let ensService;
  let provider;
  let wallet;
  let ensBuilder;
  const domain = 'mylogin.eth';
  const chainName = 'default';

  before(async () => {
    provider = createMockProvider();
    [wallet] = await getWallets(provider);
    [ensService, , ensBuilder] = await buildEnsService(wallet, domain);
  });

  describe('findRegistrar', () => {
    it('should find resolver and registrar addresses', async () => {
      const registrarInBuilder = ensBuilder.registrars[`${domain}`].address;
      const resolverInBuilder = ensBuilder.resolver.address;
      const registrar = await ensService.findRegistrar(domain, chainName);
      expect(registrar.registrarAddress).to.eq(registrarInBuilder);
      expect(registrar.resolverAddress).to.eq(resolverInBuilder);
    });

    it('return null if not found', async () => {
      expect(await ensService.findRegistrar('whatever.non-existing-id.eth', chainName)).to.be.null;
    });
  });

  describe('argsFor', () => {
    it('return null if not found', async () => {
      expect(await ensService.argsFor('whatever.non-existing-id.eth', chainName)).to.be.null;
    });
  });
});
