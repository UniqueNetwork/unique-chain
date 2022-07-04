import { getApiConnection } from "../substrate/substrate-api";
import { expectTxFailure } from "./util/helpers";
import {
  changeIssuer,
  createCollection,
} from "./util/tx";

describe("integration test: collection issuer", () => {
  const Alice = "//Alice";
  const Bob = "//Bob";

  let api: any;
  before(async () => {
    api = await getApiConnection();
  });

  it("change collection issuer", async () => {
    await createCollection(
      api,
      Alice,
      "test-metadata",
      null,
      "test-symbol"
    ).then(async (collectionId) => {
      await changeIssuer(api, Alice, collectionId, Bob);
    });
  });

  it("[negative] change not an owner NFT collection issuer", async () => {
    await createCollection(api, Bob, "test-metadata", null, "test-symbol").then(
      async (collectionId) => {
        const tx = changeIssuer(api, Alice, collectionId, Bob);
        await expectTxFailure(/rmrkCore\.NoPermission/, tx);
      }
    );
  });

  it("[negative] change non-existigit NFT collection issuer", async () => {
    await createCollection(
      api,
      Alice,
      "test-metadata",
      null,
      "test-symbol"
    ).then(async () => {
      const tx = changeIssuer(api, Alice, 99999, Bob);
      await expectTxFailure(/rmrkCore\.CollectionUnknown/, tx);
    });
  });

  after(() => {
    api.disconnect();
  });
});
