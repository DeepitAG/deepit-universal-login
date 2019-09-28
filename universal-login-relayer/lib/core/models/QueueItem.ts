export interface QueueItem {
  hash: string;
  network: string;
  type: 'Message' | 'Deployment';
}
