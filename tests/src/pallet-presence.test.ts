import { ApiPromise } from "@polkadot/api";
import { expect } from "chai";
import usingApi from "./substrate/substrate-api";

function getModuleNames(api: ApiPromise): string[] {
  return api.runtimeMetadata.asLatest.modules.map(m => m.name.toString().toLowerCase());
}

describe('Pallet presence.', () => {
  it('NFT pallet is present.', async () => {
    await usingApi(async api => {
      expect(getModuleNames(api)).to.include('nft');
    });
  });
  it('Balances pallet is present.', async () => {
    await usingApi(async api => {
      expect(getModuleNames(api)).to.include('balances');
    });
  });
  it('Contracts pallet is present.', async () => {
    await usingApi(async api => {
      expect(getModuleNames(api)).to.include('contracts');
    });
  });
});
