import { WsProvider, ApiPromise } from "@polkadot/api";
import config from "./config";

const wsProvider = new WsProvider(config.substrateUrl);
const settings = { provider: wsProvider };


export default function createSubstrateApi(): Promise<ApiPromise> {
  return new ApiPromise(settings).isReady;
}