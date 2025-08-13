import {main} from './correctStateAfterMaintenance.ts';
import process from "node:process";

main({
  wsEndpoint: process.env.WS_RPC!,
  donorSeed: process.env.SUPERUSER_SEED!,
}).then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
