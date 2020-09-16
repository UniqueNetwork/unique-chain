import ApiPromise from "@polkadot/api/promise/Api";

type PromiseType<T> = T extends PromiseLike<infer TInner> ? TInner : T;

export default function promisifySubstrate<T extends (...args: any[]) => any>(api: ApiPromise, action: T): (...args: Parameters<T>) => Promise<PromiseType<ReturnType<T>>> {
  return (...args: Parameters<T>) => {
    const promise = new Promise<PromiseType<ReturnType<T>>>((resolve, reject) => {
      const cleanup = () => {
        api.off('disconnected', fail);
        api.off('error', fail);
      };

      const success = (r: any) => {
        cleanup();
        resolve(r);
      };
      const fail = (error: any) => {
        cleanup();
        reject(error);
      };
      
      api.on('disconnected', fail);
      api.on('error', fail);

      const result = action(...args);
      Promise.resolve(result)
        .then(success, fail);

    });
    return promise as any;
  };
}
