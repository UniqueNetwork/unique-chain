import {SignerOptions, SubmittableExtrinsic} from '@polkadot/api/types/submittable';
import {ISubmittableResult, IKeyringPair} from '@polkadot/types/types';

// FIXME: rename
export type TransactionResult = {
  status: 'success' | 'fail',
  reason?: string,
  result?: ISubmittableResult,
}

export function signSendAndWait(
  signer: IKeyringPair,
  extrinsic: SubmittableExtrinsic<'promise', ISubmittableResult>,
  options?: Partial<SignerOptions> | undefined,
): Promise<TransactionResult> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    try {
      const unsub = await extrinsic.signAndSend(signer, options ? options : {}, (result) => {
        const {events, status} = result;
        // If the transaction wasn't included in the block for some reason:
        if (status.isDropped) {
          console.log('Transaction has been dropped');
          unsub();
          resolve({status: 'fail', reason: 'ExtrinsicDropped', result});
        }
        // status.isInBlock useful for a dev node only
        if (status.isFinalized || status.isInBlock) {
          const errors = events.filter(e => e.event.method === 'ExtrinsicFailed');
          if (errors.length > 0) {
            unsub();
            resolve({status: 'fail', reason: 'ExtrinsicFailed', result});
          }
          unsub();
          resolve({status: 'success', result});
        }
      });
    } catch (error) {
      console.log('Unknown error');
      const reason = error instanceof Error ? error.message : 'Unknown error';
      resolve({status: 'fail', reason});
    }
  });
}