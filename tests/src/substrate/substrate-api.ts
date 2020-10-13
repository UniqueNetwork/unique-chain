import { WsProvider, ApiPromise } from "@polkadot/api";
import config from "../config";
import promisifySubstrate from "./promisify-substrate";
import { ApiOptions } from "@polkadot/api/types";

function defaultApiOptions(): ApiOptions {
  const wsProvider = new WsProvider(config.substrateUrl);
  return { provider: wsProvider, types: JSON.parse(config.customTypes) };
}

export default async function usingApi(action: (api: ApiPromise) => Promise<void>, settings: ApiOptions | undefined = undefined): Promise<void> {
  settings = settings || defaultApiOptions();
  let api: ApiPromise = new ApiPromise(settings);

  try {
    await promisifySubstrate(api, async () => {
      if(api) {
        await api.isReadyOrError;
        await action(api);
      }
    })();
  } finally {
    await api.disconnect();
  }
}