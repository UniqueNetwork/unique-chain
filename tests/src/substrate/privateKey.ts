import { Keyring } from "@polkadot/api";

export default function privateKey(account: string) {
  const keyring = new Keyring({ type: 'sr25519' });
  
  return keyring.addFromUri(account);
}