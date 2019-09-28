import {SignedMessage} from '@universal-login/commons';
import MessageItem from '../../models/messages/MessageItem';

export interface IQueueStore {
  add: (message: SignedMessage, network: string) => Promise<string>;
  getNext: () => Promise<MessageItem | undefined>;
  remove: (messageHash: string) => Promise<void>;
}


export default IQueueStore;
