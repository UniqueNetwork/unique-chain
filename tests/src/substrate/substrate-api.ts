import { WsProvider, ApiPromise } from "@polkadot/api";
import config from "../config";
import promisifySubstrate from "./promisify-substrate";
import { ApiOptions } from "@polkadot/api/types";

export default async function usingApi(action: (api: ApiPromise) => Promise<void>): Promise<void> {
  const wsProvider = new WsProvider(config.substrateUrl);
  const settings: ApiOptions = { provider: wsProvider, types: JSON.parse(config.customTypes) };
  let api: ApiPromise | undefined = undefined;

  try {
    api = await ApiPromise.create(settings);
    await promisifySubstrate(api, () => api && api.isReady)();
    await action(api);
  } finally {
    api && api.disconnect();
  }
}