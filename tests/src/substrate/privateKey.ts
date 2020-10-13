import { Keyring } from "@polkadot/api";
import { IKeyringPair } from "@polkadot/types/types";

export default function privateKey(account: string): IKeyringPair {
  const keyring = new Keyring({ type: 'sr25519' });
  
  return keyring.addFromUri(account);
}