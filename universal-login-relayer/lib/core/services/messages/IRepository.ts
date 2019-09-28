export default interface IRepository<T> {
  add: (hash: string, item: T) => Promise<void>;
  get: (hash: string, network: string) => Promise<T>;
  isPresent: (hash: string, network: string) => Promise<boolean>;
  remove: (hash: string, network: string) => Promise<T>;
}
