import {SignerOptions, SubmittableExtrinsic} from '@polkadot/api/types/submittable';
import {ISubmittableResult, IKeyringPair} from '@polkadot/types/types';

export type TxResult = {
  status: 'success' | 'fail',
  reason?: string,
  result?: ISubmittableResult,
}

export type Tx = {
  signer: IKeyringPair,
  extrinsic: SubmittableExtrinsic<'promise', ISubmittableResult>,
  options?: Partial<SignerOptions> | undefined,
}

export function signSendAndWait(transaction: Tx): Promise<TxResult> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    try {
      const {signer, extrinsic, options} = transaction;
      const unsub = await extrinsic.signAndSend(signer, options ? options : {}, (result) => {
        const {events, status} = result;

        // If the transaction wasn't included in the block for some reason:
        if (status.isDropped) {
          console.log('TX DROPPED');
          unsub();
          resolve({status: 'fail', reason: 'ExtrinsicDropped', result});
        }
        // Do not use in block
        else if (status.isFinalized /* || status.isInBlock */) {
          const errors = events.filter(e => e.event.method === 'ExtrinsicFailed');
          if (errors.length > 0) {
            unsub();
            resolve({status: 'fail', reason: 'ExtrinsicFailed', result});
          }
          unsub();
          resolve({status: 'success', result});
        }
        else if (status.isRetracted) {
          console.log('TX RETRACTED');
          unsub();
          resolve({status:'fail', reason: 'Tx retracted'});
        }
        else if (status.isInvalid) {
          console.log('TX INVALID');
          unsub();
          resolve({status:'fail', reason: 'Tx Invalid'});
        }
        else if (status.isFinalityTimeout) {
          console.log('TX FINALITY TIMEOUT');
          unsub();
          resolve({status:'fail', reason: 'FinalityTimeout'});
        }
        else if (status.isUsurped) {
          console.log('TX IS USURPED');
          unsub();
          resolve({status:'fail', reason: 'Tx usurped'});
        }
        else if (status.isBroadcast || status.isInBlock || status.isNone) {/* do nothing */}
        else {
          console.log(status);
        }
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      resolve({status: 'fail', reason});
    }
  });
}
