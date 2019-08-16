import {providers, utils} from 'ethers';
import {SignedMessage, ensure} from '@universal-login/commons';
import {ensureEnoughGas, ensureEnoughToken} from '../../../integration/ethereum/validations';
import {InvalidProxy} from '../../utils/errors';
import {MultiChainProvider} from '../../../integration/ethereum/MultiChainProvider';

export class MessageValidator {
  constructor(private multiChainProvider: MultiChainProvider) {
  }

  async validate(signedMessage: SignedMessage, transactionReq: providers.TransactionRequest, chainName: string) : Promise<void> {
    const wallet = this.multiChainProvider.getWallet(chainName);
    await this.ensureCorrectProxy(signedMessage.from, chainName);
    await ensureEnoughToken(wallet.provider, signedMessage);
    await ensureEnoughGas(wallet.provider, wallet.address, transactionReq, signedMessage);
  }

  private async ensureCorrectProxy(from: string, chainName: string) {
    const contractWhiteList = this.multiChainProvider.getContractWhiteList(chainName);
    const wallet = this.multiChainProvider.getWallet(chainName);
    const proxyByteCode = await wallet.provider.getCode(from);
    const proxyContractHash = utils.keccak256(proxyByteCode);
    ensure(
      contractWhiteList.proxy.includes(proxyContractHash),
      InvalidProxy,
      from,
      proxyContractHash,
      contractWhiteList.proxy);
  }
}

export default MessageValidator;
