import {CollectedSignatureKeyPair, SignedMessage} from '@universal-login/commons';
import MessageItem from '../../models/messages/MessageItem';
import IRepository from './IRepository';

export default interface IMessageRepository extends IRepository<MessageItem> {
  addSignature: (messageHash: string, signature: string, network: string) => Promise<void>;
  getMessage: (messageHash: string, network: string) => Promise<SignedMessage>;
  getCollectedSignatureKeyPairs: (messageHash: string, network: string) => Promise<CollectedSignatureKeyPair[]>;
  containSignature: (messageHash: string, signature: string, network: string) => Promise<boolean>;
}
