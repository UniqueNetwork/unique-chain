// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

import {ApiPromise} from '@polkadot/api';

type PromiseType<T> = T extends PromiseLike<infer TInner> ? TInner : T;

export default function promisifySubstrate<T extends (...args: any[]) => any>(api: ApiPromise, action: T): (...args: Parameters<T>) => Promise<PromiseType<ReturnType<T>>> {
  return (...args: Parameters<T>) => {
    const promise = new Promise<PromiseType<ReturnType<T>>>((resolve: ((result: PromiseType<ReturnType<T>>) => void) | undefined, reject: ((error: any) => void) | undefined) => {
      const cleanup = () => {
        api.off('disconnected', fail);
        api.off('error', fail);
        resolve = undefined;
        reject = undefined;
      };

      const success = (r: any) => {
        resolve && resolve(r);
        cleanup();
      };
      const fail = (error: any) => {
        reject && reject(error);
        cleanup();
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
