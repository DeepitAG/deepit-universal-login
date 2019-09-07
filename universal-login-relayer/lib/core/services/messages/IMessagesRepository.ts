import {CollectedSignatureKeyPair, SignedMessage, MessageState} from '@universal-login/commons';
import MessageItem from '../../models/messages/MessageItem';

export default interface IMessageRepository {
  add: (messageHash: string, pendingMessage: MessageItem, network: string) => Promise<void>;
  get: (messageHash: string, network: string) => Promise<MessageItem>;
  isPresent: (messageHash: string, network: string) => Promise<boolean>;
  remove: (messageHash: string, network: string) => Promise<MessageItem>;
  addSignature: (messageHash: string, signature: string, network: string) => Promise<void>;
  getMessage: (messageHash: string, network: string) => Promise<SignedMessage>;
  getCollectedSignatureKeyPairs: (messageHash: string, network: string) => Promise<CollectedSignatureKeyPair[]>;
  markAsPending: (messageHash: string, transactionHash: string, network: string) => Promise<void>;
  markAsError: (messageHash: string, error: string, network: string) => Promise<void>;
  setMessageState: (messageHash: string, state: MessageState, network: string) => Promise<void>;
  containSignature: (messageHash: string, signature: string, network: string) => Promise<boolean>;
}
