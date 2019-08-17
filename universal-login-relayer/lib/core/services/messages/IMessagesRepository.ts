import {CollectedSignatureKeyPair, SignedMessage, MessageState} from '@universal-login/commons';
import MessageItem from '../../models/messages/MessageItem';

export default interface IMessageRepository {
  add: (messageHash: string, pendingMessage: MessageItem, chainName: string) => Promise<void>;
  get: (messageHash: string, chainName: string) => Promise<MessageItem>;
  isPresent: (messageHash: string, chainName: string) => Promise<boolean>;
  remove: (messageHash: string, chainName: string) => Promise<MessageItem>;
  addSignature: (messageHash: string, signature: string, chainName: string) => Promise<void>;
  getMessage: (messageHash: string, chainName: string) => Promise<SignedMessage>;
  getCollectedSignatureKeyPairs: (messageHash: string, chainName: string) => Promise<CollectedSignatureKeyPair[]>;
  markAsPending: (messageHash: string, transactionHash: string, chainName: string) => Promise<void>;
  markAsError: (messageHash: string, error: string, chainName: string) => Promise<void>;
  setMessageState: (messageHash: string, state: MessageState, chainName: string) => Promise<void>;
  containSignature: (messageHash: string, signature: string, chainName: string) => Promise<boolean>;
}
