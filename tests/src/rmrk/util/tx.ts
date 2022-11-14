import {ApiPromise} from '@polkadot/api';
import {Bytes, Option, u32, Vec} from '@polkadot/types-codec';
import {
  RmrkTraitsNftAccountIdOrCollectionNftTuple as NftOwner, RmrkTraitsPartEquippableList as EquippableList,
  RmrkTraitsPartPartType as PartType, RmrkTraitsResourceBasicResource as BasicResource,
  RmrkTraitsResourceComposableResource as ComposableResource, RmrkTraitsResourceResourceInfo as ResourceInfo, RmrkTraitsResourceSlotResource as SlotResource, RmrkTraitsTheme as Theme,
} from '@polkadot/types/lookup';
import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import '../../interfaces/augment-api';
import privateKey from '../../substrate/privateKey';
import {executeTransaction} from '../../substrate/substrate-api';
import {
  getBase,
  getCollection,
  getCollectionsCount,
  getEquippableList,
  getNft,
  getParts,
  getResources, 
  getResourcePriority, 
  getTheme,
  NftIdTuple,
} from './fetch';
import {
  extractRmrkCoreTxResult,
  extractRmrkEquipTxResult, isCollectionPropertyExists, isNftOwnedBy, isNftPropertyExists, isTxResultSuccess, makeNftOwner,
  findResourceById, getResourceById, checkResourceStatus,
} from './helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

export async function createCollection(
  api: ApiPromise,
  issuerUri: string,
  metadata: string,
  max: number | null,
  symbol: string,
): Promise<number> {
  let collectionId = 0;

  const oldCollectionCount = await getCollectionsCount(api);
  const maxOptional = max ? max.toString() : null;
  const ss58Format = (api.registry.getChainProperties())!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));
  const tx = api.tx.rmrkCore.createCollection(metadata, maxOptional, symbol);
  const events = await executeTransaction(api, issuer, tx);

  const collectionResult = extractRmrkCoreTxResult(events, 'CollectionCreated', (data) => {
    return parseInt(data[1].toString(), 10);
  });
  expect(collectionResult.success, 'Error: unable to create a collection').to.be.true;

  collectionId = collectionResult.successData!;

  const newCollectionCount = await getCollectionsCount(api);
  const collectionOption = await getCollection(api, collectionId);

  expect(newCollectionCount).to.be.equal(oldCollectionCount + 1, 'Error: NFT collection count should increase');
  expect(collectionOption.isSome, 'Error: unable to fetch created NFT collection').to.be.true;

  const collection = collectionOption.unwrap();

  expect(collection.metadata.toUtf8()).to.be.equal(metadata, 'Error: Invalid NFT collection metadata');
  expect(collection.max.isSome).to.be.equal(max !== null, 'Error: Invalid NFT collection max');

  if (collection.max.isSome) {
    expect(collection.max.unwrap().toNumber()).to.be.equal(max, 'Error: Invalid NFT collection max');
  }
  expect(collection.symbol.toUtf8()).to.be.equal(symbol, "Error: Invalid NFT collection's symbol");
  expect(collection.nftsCount.toNumber()).to.be.equal(0, "Error: NFT collection shoudn't have any tokens");
  expect(collection.issuer.toString()).to.be.equal(issuer.address, 'Error: Invalid NFT collection issuer');

  return collectionId;
}

export async function changeIssuer(
  api: ApiPromise,
  issuerUri: string,
  collectionId: number,
  newIssuer: string,
) {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const alice = privateKey(issuerUri, Number(ss58Format));
  const bob = privateKey(newIssuer, Number(ss58Format));

  // This is only needed when RMRK uses `uniques` pallet by Parity
  // let tx = api.tx.uniques.setAcceptOwnership(
  //     api.createType('Option<u32>', collectionId)
  // );
  // let events = await executeTransaction(api, bob, tx);
  // expect(isTxResultSuccess(events), 'Error: Unable to accept ownership').to.be.true;

  const tx = api.tx.rmrkCore.changeCollectionIssuer(collectionId, bob.address);
  const events = await executeTransaction(api, alice, tx);
  const changeIssuerResult = extractRmrkCoreTxResult(events, 'IssuerChanged', (data) => {
    return parseInt(data[2].toString(), 10);
  });
  expect(changeIssuerResult.success, 'Error: Unable to change NFT collection issuer').to.be.true;
  expect(changeIssuerResult.successData!, 'Error: Invalid collection id after changing the issuer')
    .to.be.eq(collectionId);

  await getCollection(api, collectionId).then((collectionOption) => {
    const collection = collectionOption.unwrap();
    expect(collection.issuer.toString())
      .to.be.deep.eq(bob.address, 'Error: Invalid NFT collection issuer');
  });
}

export async function deleteCollection(
  api: ApiPromise,
  issuerUri: string,
  collectionId: string,
): Promise<number> {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));
  const tx = api.tx.rmrkCore.destroyCollection(collectionId);
  const events = await executeTransaction(api, issuer, tx);

  const collectionTxResult = extractRmrkCoreTxResult(
    events,
    'CollectionDestroy',
    (data) => {
      return parseInt(data[1].toString(), 10);
    },
  );
  expect(collectionTxResult.success, 'Error: Unable to delete NFT collection').to.be.true;

  const collection = await getCollection(
    api,
    parseInt(collectionId, 10),
  );
  expect(collection.isEmpty, 'Error: NFT collection should be deleted').to.be.true;

  return 0;
}

export async function negativeDeleteCollection(
  api: ApiPromise,
  issuerUri: string,
  collectionId: string,
): Promise<number> {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));
  const tx = api.tx.rmrkCore.destroyCollection(collectionId);
  await expect(executeTransaction(api, issuer, tx)).to.be.rejected;

  return 0;
}

export async function setNftProperty(
  api: ApiPromise,
  issuerUri: string,
  collectionId: number,
  nftId: number,
  key: string,
  value: string,
) {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));
  const nftIdOpt = api.createType('Option<u32>', nftId);
  const tx = api.tx.rmrkCore.setProperty(
    collectionId,
    nftIdOpt,
    key,
    value,
  );
  const events = await executeTransaction(api, issuer, tx);

  const propResult = extractRmrkCoreTxResult(events, 'PropertySet', (data) => {
    return {
      collectionId: parseInt(data[0].toString(), 10),
      nftId: data[1] as Option<u32>,
      key: data[2] as Bytes,
      value: data[3] as Bytes,
    };
  });

  expect(propResult.success, 'Error: Unable to set NFT property').to.be.true;
  const eventData = propResult.successData!;
  const eventDescription = 'from set NFT property event';

  expect(eventData.collectionId, 'Error: Invalid collection ID ' + eventDescription)
    .to.be.equal(collectionId);

  expect(eventData.nftId.eq(nftIdOpt), 'Error: Invalid NFT ID ' + eventDescription)
    .to.be.true;

  expect(eventData.key.eq(key), 'Error: Invalid property key ' + eventDescription)
    .to.be.true;

  expect(eventData.value.eq(value), 'Error: Invalid property value ' + eventDescription)
    .to.be.true;

  expect(
    await isNftPropertyExists(api, collectionId, nftId, key, value),
    'Error: NFT property is not found',
  ).to.be.true;
}

export async function mintNft(
  api: ApiPromise,
  issuerUri: string,
  ownerUri: string | null,
  collectionId: number,
  metadata: string,
  recipientUri: string | null = null,
  royalty: number | null = null,
  transferable = true,
  resources: {basic?: any, composable?: any, slot?: any}[] | null = null,
): Promise<number> {
  let nftId = 0;
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));
  const owner = ownerUri ? privateKey(ownerUri, Number(ss58Format)).address : null;
  const recipient = recipientUri ? privateKey(recipientUri, Number(ss58Format)).address : null;
  const royaltyOptional = royalty ? royalty.toString() : null;

  const actualOwnerUri = ownerUri ? ownerUri : issuerUri;
  const actualOwnerAddress = ownerUri ? owner : issuer.address;

  const collectionOpt = await getCollection(api, collectionId);

  const tx = api.tx.rmrkCore.mintNft(
    owner,
    collectionId,
    recipient,
    royaltyOptional,
    metadata,
    transferable,
    resources as any,
  );

  const events = await executeTransaction(api, issuer, tx);
  const nftResult = extractRmrkCoreTxResult(events, 'NftMinted', (data) => {
    return parseInt(data[2].toString(), 10);
  });

  expect(nftResult.success, 'Error: Unable to mint NFT').to.be.true;

  const newCollectionNftsCount = (await getCollection(api, collectionId))
    .unwrap()
    .nftsCount
    .toNumber();

  const oldCollectionNftsCount = collectionOpt
    .unwrap()
    .nftsCount.toNumber();

  expect(newCollectionNftsCount, 'Error: NFTs count should increase')
    .to.be.equal(oldCollectionNftsCount + 1);

  nftId = nftResult.successData!;

  const nftOption = await getNft(api, collectionId, nftId);

  expect(nftOption.isSome, 'Error: Unable to fetch created NFT').to.be.true;

  const nft = nftOption.unwrap();

  expect(nft.owner.isAccountId, 'Error: NFT owner should be some user').to.be.true;
  expect(nft.owner.asAccountId.toString()).to.be.equal(actualOwnerAddress, 'Error: Invalid NFT owner');

  const isOwnedInUniques = await isNftOwnedBy(api, actualOwnerUri, collectionId, nftId);
  expect(isOwnedInUniques, `Error: created NFT is not actually owned by ${ownerUri}`)
    .to.be.true;

  if (recipient === null && royalty === null) {
    expect(nft.royalty.isNone, 'Error: Invalid NFT recipient')
      .to.be.true;
  } else {
    expect(nft.royalty.isSome, 'Error: NFT royalty not found')
      .to.be.true;

    const nftRoyalty = nft.royalty.unwrap();
    expect(nftRoyalty.recipient.eq(recipient), 'Error: Invalid NFT recipient')
      .to.be.true;

    expect(nftRoyalty.amount.eq(royalty), 'Error: Invalid NFT royalty')
      .to.be.true;
  }

  expect(nft.metadata.toUtf8()).to.be.equal(metadata, 'Error: Invalid NFT metadata');
    
  const nftResources = await getResources(api, collectionId, nftId);
  if (resources == null) {
    expect(nftResources, 'Error: Invalid NFT resources').to.be.empty;
  } else {
    expect(nftResources.length).to.be.equal(resources.length);

    for (let i = 0; i < resources.length; i++) {
      let successFindingResource = false;
      const resource = resources[i];
      // try to find the matching resource from the query
      for (let j = 0; j < nftResources.length && !successFindingResource; j++) {
        const nftResourceData = nftResources[j].toHuman();
        expect(
          Object.prototype.hasOwnProperty.call(nftResourceData, 'resource'),
          `Error: Corrupted resource data on resource #${i}`,
        ).to.be.true;
        const nftResource = nftResourceData.resource!;
                type NftResourceKey = keyof typeof nftResource;

                let typedResource = null;
                let typedNftResource = null;

                if (resource.basic && Object.prototype.hasOwnProperty.call(nftResource, 'Basic')) {
                  typedResource = resource.basic!;
                  typedNftResource = nftResource['Basic' as NftResourceKey]!;
                } else if (resource.composable && Object.prototype.hasOwnProperty.call(nftResource, 'Composable')) {
                  typedResource = resource.composable!;
                  typedNftResource = nftResource['Composable' as NftResourceKey]! as any;
                  if (typedResource.parts != undefined && typedResource.parts.toString() != typedNftResource.parts.toString()
                        || typedResource.base != typedNftResource.base && typedResource.base != undefined) {
                    continue;
                  }
                } else if (resource.slot && Object.prototype.hasOwnProperty.call(nftResource, 'Slot')) {
                  typedResource = resource.slot!;
                  typedNftResource = nftResource['Slot' as NftResourceKey]! as any;
                  if (typedResource.slot != typedNftResource.slot && typedResource.slot != undefined 
                        || typedResource.base != typedNftResource.base && typedResource.base != undefined) {
                    continue;
                  }
                } else {
                  continue;
                }

                if (typedResource.src != typedNftResource.src 
                    || typedResource.metadata != typedNftResource.metadata 
                    || typedResource.thumb != typedNftResource.thumb
                    || typedResource.license != typedNftResource.license
                ) {
                  continue;
                }

                // do final checks since this is now established to be the resource we seek
                expect(nftResourceData.pending, `Error: Resource #${i} is pending`).to.be.false;
                expect(nftResourceData.pendingRemoval, `Error: Resource #${i} is pending removal`).to.be.false;

                // remove the matching resource from the resources we check
                nftResources.splice(j, 1);
                successFindingResource = true;
      }

      expect(successFindingResource, `Error: Couldn't find resource #${i}'s counterpart among the returned`).to.be.true;
    }
  }

  return nftId;
}

export async function sendNft(
  api: ApiPromise,
  expectedStatus: 'pending' | 'sent',
  originalOwnerUri: string,
  collectionId: number,
  nftId: number,
  newOwner: string | NftIdTuple,
) {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const originalOwner = privateKey(originalOwnerUri, Number(ss58Format));
  const newOwnerObj = makeNftOwner(api, newOwner);

  const nftBeforeSendingOpt = await getNft(api, collectionId, nftId);

  const tx = api.tx.rmrkCore.send(collectionId, nftId, newOwnerObj);
  const events = await executeTransaction(api, originalOwner, tx);

  const sendResult = extractRmrkCoreTxResult(events, 'NFTSent', (data) => {
    return {
      dstOwner: data[1] as NftOwner,
      collectionId: parseInt(data[2].toString(), 10),
      nftId: parseInt(data[3].toString(), 10),
    };
  });

  expect(sendResult.success, 'Error: Unable to send NFT').to.be.true;
  const sendData = sendResult.successData!;

  expect(sendData.dstOwner.eq(newOwnerObj), 'Error: Invalid target user (from event data)')
    .to.be.true;

  expect(sendData.collectionId)
    .to.be.equal(collectionId, 'Error: Invalid collection ID (from event data)');

  expect(sendData.nftId).to.be.equal(nftId, 'Error: Invalid NFT ID (from event data)');

  expect(nftBeforeSendingOpt.isSome, 'Error: Unable to fetch NFT before sending').to.be.true;

  const nftBeforeSending = nftBeforeSendingOpt.unwrap();

  const nftAfterSendingOpt = await getNft(api, collectionId, nftId);

  expect(nftAfterSendingOpt.isSome, 'Error: Unable to fetch NFT after sending').to.be.true;

  const nftAfterSending = nftAfterSendingOpt.unwrap();

  const isOwnedByNewOwner = await isNftOwnedBy(api, newOwner, collectionId, nftId);
  const isPending = expectedStatus === 'pending';

  expect(
    isOwnedByNewOwner,
    `Error: The NFT should be owned by ${newOwner.toString()}`,
  ).to.be.true;

  expect(nftAfterSending.royalty.eq(nftBeforeSending.royalty), 'Error: Invalid NFT royalty after sending')
    .to.be.true;

  expect(nftAfterSending.metadata.eq(nftBeforeSending.metadata), 'Error: Invalid NFT metadata after sending')
    .to.be.true;

  expect(nftAfterSending.equipped.eq(nftBeforeSending.equipped), 'Error: Invalid NFT equipped status after sending')
    .to.be.true;

  expect(nftAfterSending.pending.eq(isPending), 'Error: Invalid NFT pending state')
    .to.be.true;
}

export async function acceptNft(
  api: ApiPromise,
  issuerUri: string,
  collectionId: number,
  nftId: number,
  newOwner: string | [number, number],
) {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));
  const newOwnerObj = makeNftOwner(api, newOwner);

  const nftBeforeOpt = await getNft(api, collectionId, nftId);

  const tx = api.tx.rmrkCore.acceptNft(collectionId, nftId, newOwnerObj);
  const events = await executeTransaction(api, issuer, tx);

  const acceptResult = extractRmrkCoreTxResult(events, 'NFTAccepted', (data) => {
    return {
      recipient: data[1] as NftOwner,
      collectionId: parseInt(data[2].toString(), 10),
      nftId: parseInt(data[3].toString(), 10),
    };
  });

  expect(acceptResult.success, 'Error: Unable to accept NFT').to.be.true;
  const acceptData = acceptResult.successData!;

  expect(acceptData.recipient.eq(newOwnerObj), 'Error: Invalid NFT recipient (from event data)')
    .to.be.true;

  expect(acceptData.collectionId)
    .to.be.equal(collectionId, 'Error: Invalid collection ID (from event data)');

  expect(acceptData.nftId)
    .to.be.equal(nftId, 'Error: Invalid NFT ID (from event data)');

  const nftBefore = nftBeforeOpt.unwrap();

  const isPendingBeforeAccept = nftBefore.pending.isTrue;

  const nftAfter = (await getNft(api, collectionId, nftId)).unwrap();
  const isPendingAfterAccept = nftAfter.pending.isTrue;

  expect(isPendingBeforeAccept, 'Error: NFT should be pending to be accepted')
    .to.be.true;

  expect(isPendingAfterAccept, 'Error: NFT should NOT be pending after accept')
    .to.be.false;

  const isOwnedInUniques = await isNftOwnedBy(api, newOwner, collectionId, nftId);
  expect(isOwnedInUniques, `Error: created NFT is not actually owned by ${newOwner.toString()}`)
    .to.be.true;
}

export async function rejectNft(
  api: ApiPromise,
  issuerUri: string,
  collectionId: number,
  nftId: number,
) {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));
  const nftBeforeOpt = await getNft(api, collectionId, nftId);

  const tx = api.tx.rmrkCore.rejectNft(collectionId, nftId);
  const events = await executeTransaction(api, issuer, tx);
  const rejectResult = extractRmrkCoreTxResult(events, 'NFTRejected', (data) => {
    return {
      collectionId: parseInt(data[1].toString(), 10),
      nftId: parseInt(data[2].toString(), 10),
    };
  });

  const rejectData = rejectResult.successData!;

  expect(rejectData.collectionId)
    .to.be.equal(collectionId, 'Error: Invalid collection ID (from event data)');

  expect(rejectData.nftId)
    .to.be.equal(nftId, 'Error: Invalid NFT ID (from event data)');

  const nftBefore = nftBeforeOpt.unwrap();

  const isPendingBeforeReject = nftBefore.pending.isTrue;

  const nftAfter = await getNft(api, collectionId, nftId);

  expect(isPendingBeforeReject, 'Error: NFT should be pending to be rejected')
    .to.be.true;

  expect(nftAfter.isNone, 'Error: NFT should be burned after reject')
    .to.be.true;
}

export async function createBase(
  api: ApiPromise,
  issuerUri: string,
  baseType: string,
  symbol: string,
  parts: object[],
): Promise<number> {
  let baseId = 0;
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));

  const partTypes = api.createType('Vec<RmrkTraitsPartPartType>', parts) as Vec<PartType>;

  const tx = api.tx.rmrkEquip.createBase(baseType, symbol, partTypes);
  const events = await executeTransaction(api, issuer, tx);

  const baseResult = extractRmrkEquipTxResult(events, 'BaseCreated', (data) => {
    return parseInt(data[1].toString(), 10);
  });

  expect(baseResult.success, 'Error: Unable to create Base')
    .to.be.true;

  baseId = baseResult.successData!;
  const baseOptional = await getBase(api, baseId);

  expect(baseOptional.isSome, 'Error: Unable to fetch created Base')
    .to.be.true;

  const base = baseOptional.unwrap();
  const baseParts = await getParts(api, baseId);

  expect(base.issuer.toString()).to.be.equal(issuer.address, 'Error: Invalid Base issuer');
  expect(base.baseType.toUtf8()).to.be.equal(baseType, 'Error: Invalid Base type');
  expect(base.symbol.toUtf8()).to.be.equal(symbol, 'Error: Invalid Base symbol');
  expect(partTypes.eq(baseParts), 'Error: Received invalid base parts').to.be.true;

  return baseId;
}

export async function setResourcePriorities(
  api: ApiPromise,
  issuerUri: string,
  collectionId: number,
  nftId: number,
  priorities: number[],
) {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));

  const prioritiesVec = api.createType('Vec<u32>', priorities);
  const tx = api.tx.rmrkCore.setPriority(collectionId, nftId, prioritiesVec);
  const events = await executeTransaction(api, issuer, tx);

  const prioResult = extractRmrkCoreTxResult(events, 'PrioritySet', (data) => {
    return {
      collectionId: parseInt(data[0].toString(), 10),
      nftId: parseInt(data[1].toString(), 10),
    };
  });

  expect(prioResult.success, 'Error: Unable to set resource priorities').to.be.true;
  const eventData = prioResult.successData!;

  expect(eventData.collectionId)
    .to.be.equal(collectionId, 'Error: Invalid collection ID (set priorities event data)');

  expect(eventData.nftId).to.be.equal(nftId, 'Error: Invalid NFT ID (set priorities event data');

  for (let i = 0; i < priorities.length; i++) {
    const resourceId = priorities[i];

    const fetchedPrio = await getResourcePriority(api, collectionId, nftId, resourceId);
    expect(fetchedPrio).to.be.equal(i, 'Error: Invalid priorities are set');
  }

}

export async function setEquippableList(
  api: ApiPromise,
  issuerUri: string,
  baseId: number,
  slotId: number,
  equippableList: 'All' | 'Empty' | { 'Custom': number[] },
) {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));
  const equippable = api.createType('RmrkTraitsPartEquippableList', equippableList) as EquippableList;

  const tx = api.tx.rmrkEquip.equippable(baseId, slotId, equippable);
  const events = await executeTransaction(api, issuer, tx);

  const equipListResult = extractRmrkEquipTxResult(events, 'EquippablesUpdated', (data) => {
    return {
      baseId: parseInt(data[0].toString(), 10),
      slotId: parseInt(data[1].toString(), 10),
    };
  });

  expect(equipListResult.success, 'Error: unable to update equippable list').to.be.true;
  const updateEvent = equipListResult.successData!;

  expect(updateEvent.baseId)
    .to.be.equal(baseId, 'Error: invalid base ID from update equippable event');

  expect(updateEvent.slotId)
    .to.be.equal(slotId, 'Error: invalid base ID from update equippable event');

  const fetchedEquippableList = await getEquippableList(api, baseId, slotId);

  expect(fetchedEquippableList, 'Error: unable to fetch equippable list').to.be.not.null;
  if (fetchedEquippableList) {
    expect(fetchedEquippableList)
      .to.be.deep.equal(equippableList, 'Error: invalid equippable list was set');
  }
}

export async function addTheme(
  api: ApiPromise,
  issuerUri: string,
  baseId: number,
  themeObj: object,
  filterKeys: string[] | null = null,
) {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));
  const theme = api.createType('RmrkTraitsTheme', themeObj) as Theme;

  const tx = api.tx.rmrkEquip.themeAdd(baseId, theme);
  const events = await executeTransaction(api, issuer, tx);

  expect(isTxResultSuccess(events), 'Error: Unable to add Theme').to.be.true;

  const fetchedThemeOpt = await getTheme(api, baseId, theme.name.toUtf8(), null);

  expect(fetchedThemeOpt.isSome, 'Error: Unable to fetch theme').to.be.true;

  const fetchedTheme = fetchedThemeOpt.unwrap();

  expect(theme.name.eq(fetchedTheme.name), 'Error: Invalid theme name').to.be.true;

  for (let i = 0; i < theme.properties.length; i++) {
    const property = theme.properties[i];
    const propertyKey = property.key.toUtf8();

    const propertyFoundCount = fetchedTheme.properties.filter((fetchedProp) => property.key.eq(fetchedProp.key)).length;

    expect(propertyFoundCount > 1, `Error: Too many properties with key ${propertyKey} found`)
      .to.be.false;

    if (filterKeys) {
      const isFiltered = fetchedTheme.properties.find((fetchedProp) => fetchedProp.key.eq(property.key)) === undefined;

      if (isFiltered) {
        expect(propertyFoundCount === 0, `Error: Unexpected filtered key ${propertyKey}`)
          .to.be.true;
        continue;
      }
    }

    expect(propertyFoundCount === 1, `Error: The property with key ${propertyKey} is not found`)
      .to.be.true;
  }
}

export async function lockCollection(
  api: ApiPromise,
  issuerUri: string,
  collectionId: number,
  max = 0,
) {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));
  const tx = api.tx.rmrkCore.lockCollection(collectionId);
  const events = await executeTransaction(api, issuer, tx);
  const lockResult = extractRmrkCoreTxResult(events, 'CollectionLocked', (data) => {
    return parseInt(data[1].toString(), 10);
  });
  expect(lockResult.success, 'Error: Unable to lock a collection').to.be.true;
  expect(lockResult.successData!, 'Error: Invalid collection was locked')
    .to.be.eq(collectionId);

  await getCollection(api, collectionId).then((collectionOption) => {
    const collection = collectionOption.unwrap();
    expect(collection.max.unwrap().toNumber()).to.be.equal(max);
  });
}

export async function setPropertyCollection(
  api: ApiPromise,
  issuerUri: string,
  collectionId: number,
  key: string,
  value: string,
) {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const alice = privateKey(issuerUri, Number(ss58Format));

  const tx = api.tx.rmrkCore.setProperty(collectionId, null, key, value);
  const events = await executeTransaction(api, alice, tx);
  const propResult = extractRmrkCoreTxResult(events, 'PropertySet', (data) => {
    return {
      collectionId: parseInt(data[0].toString(), 10),
      nftId: data[1] as Option<u32>,
      key: data[2] as Bytes,
      value: data[3] as Bytes,
    };
  });

  expect(propResult.success, 'Error: Unable to set collection property').to.be.true;
  const eventData = propResult.successData!;
  const eventDescription = 'from set collection property event';

  expect(eventData.collectionId, 'Error: Invalid collection ID ' + eventDescription)
    .to.be.equal(collectionId);

  expect(eventData.nftId.eq(null), 'Error: Unexpected NFT ID ' + eventDescription)
    .to.be.true;

  expect(eventData.key.eq(key), 'Error: Invalid property key ' + eventDescription)
    .to.be.true;

  expect(eventData.value.eq(value), 'Error: Invalid property value ' + eventDescription)
    .to.be.true;

  expect(await isCollectionPropertyExists(api, collectionId, key, value))
    .to.be.true;
}

export async function burnNft(
  api: ApiPromise,
  issuerUri: string,
  collectionId: number,
  nftId: number,
) {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));
  const maxBurns = 10;
  const tx = api.tx.rmrkCore.burnNft(collectionId, nftId, maxBurns);
  const events = await executeTransaction(api, issuer, tx);
  const burnResult = extractRmrkCoreTxResult(events, 'NFTBurned', (data) => {
    return parseInt(data[1].toString(), 10);
  });

  expect(burnResult.success, 'Error: Unable to burn an NFT').to.be.true;
  expect(burnResult.successData!, 'Error: Invalid NFT was burned')
    .to.be.eq(nftId);

  const nftBurned = await getNft(api, collectionId, nftId);
  expect(nftBurned.isSome).to.be.false;
}

export async function acceptNftResource(
  api: ApiPromise,
  issuerUri: string,
  collectionId: number,
  nftId: number,
  resourceId: number,
) {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));

  const tx = api.tx.rmrkCore.acceptResource(
    collectionId,
    nftId,
    resourceId,
  );

  const events = await executeTransaction(api, issuer, tx);
  const acceptResult = extractRmrkCoreTxResult(events, 'ResourceAccepted', (data) => {
    return {
      nftId: parseInt(data[0].toString(), 10),
      resourceId: parseInt(data[1].toString(), 10),
    };
  });

  expect(acceptResult.success, 'Error: Unable to accept a resource').to.be.true;
  expect(acceptResult.successData!.nftId, 'Error: Invalid NFT ID while accepting a resource')
    .to.be.eq(nftId);
  expect(acceptResult.successData!.resourceId, 'Error: Invalid resource ID while accepting a resource')
    .to.be.eq(resourceId);

  const resource = await getResourceById(api, collectionId, nftId, resourceId);
  checkResourceStatus(resource, 'added');
}

async function executeResourceCreation(
  api: ApiPromise,
  issuer: IKeyringPair,
  tx: any,
  collectionId: number,
  nftId: number,
  expectedStatus: 'pending' | 'added',
): Promise<ResourceInfo> {
  const events = await executeTransaction(api, issuer, tx);

  const resourceResult = extractRmrkCoreTxResult(events, 'ResourceAdded', (data) => {
    return parseInt(data[1].toString(), 10);
  });
  expect(resourceResult.success, 'Error: Unable to add resource').to.be.true;
  const resourceId = resourceResult.successData!;

  const resource = await getResourceById(api, collectionId, nftId, resourceId);
  checkResourceStatus(resource, expectedStatus);

  return resource;
}

export async function addNftBasicResource(
  api: ApiPromise,
  issuerUri: string,
  expectedStatus: 'pending' | 'added',
  collectionId: number,
  nftId: number,
  src: string | null,
  metadata: string | null,
  license: string | null,
  thumb: string | null,
): Promise<number> {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));

  const basicResource = api.createType('RmrkTraitsResourceBasicResource', {
    src: src,
    metadata: metadata,
    license: license,
    thumb: thumb,
  }) as BasicResource;

  const tx = api.tx.rmrkCore.addBasicResource(
    collectionId,
    nftId,
    basicResource,
  );

  const resource = await executeResourceCreation(api, issuer, tx, collectionId, nftId, expectedStatus);

  // FIXME A workaround. It seems it is a PolkadotJS bug.
  // All of the following are `false`.
  //
  // console.log('>>> basic:', resource.resource.isBasic);
  // console.log('>>> composable:', resource.resource.isComposable);
  // console.log('>>> slot:', resource.resource.isSlot);
  const resourceJson = resource.resource.toHuman() as any;

  expect(Object.prototype.hasOwnProperty.call(resourceJson, 'Basic'), 'Error: Expected basic resource type')
    .to.be.true;

  const recvBasicRes = resourceJson['Basic'];

  expect(recvBasicRes.src, 'Error: Invalid basic resource src')
    .to.be.eq(src);
  expect(recvBasicRes.metadata, 'Error: basic first resource metadata')
    .to.be.eq(metadata);
  expect(recvBasicRes.license, 'Error: basic first resource license')
    .to.be.eq(license);
  expect(recvBasicRes.thumb, 'Error: basic first resource thumb')
    .to.be.eq(thumb);

  return resource.id.toNumber();
}

export async function addNftComposableResource(
  api: ApiPromise,
  issuerUri: string,
  expectedStatus: 'pending' | 'added',
  collectionId: number,
  nftId: number,
  parts: number[],
  baseId: number,
  src: string | null,
  metadata: string | null,
  license: string | null,
  thumb: string | null,
): Promise<number> {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));

  const composableResource = api.createType('RmrkTraitsResourceComposableResource', {
    parts: parts, // api.createType('Vec<u32>', parts),
    base: baseId,
    src: src,
    metadata: metadata,
    license: license,
    thumb: thumb,
  }) as ComposableResource;

  const tx = api.tx.rmrkCore.addComposableResource(
    collectionId,
    nftId,
    composableResource,
  );

  const resource = await executeResourceCreation(api, issuer, tx, collectionId, nftId, expectedStatus);

  // FIXME A workaround. It seems it is a PolkadotJS bug.
  // All of the following are `false`.
  //
  // console.log('>>> basic:', resource.resource.isBasic);
  // console.log('>>> composable:', resource.resource.isComposable);
  // console.log('>>> slot:', resource.resource.isSlot);
  const resourceJson = resource.resource.toHuman() as any;

  expect(Object.prototype.hasOwnProperty.call(resourceJson, 'Composable'), 'Error: Expected composable resource type')
    .to.be.true;

  const recvComposableRes = resourceJson['Composable'];

  expect(recvComposableRes.parts.toString(), 'Error: Invalid composable resource parts')
    .to.be.eq(parts.toString());
  expect(recvComposableRes.base, 'Error: Invalid composable resource base id')
    .to.be.eq(baseId.toString());
  expect(recvComposableRes.src, 'Error: Invalid composable resource src')
    .to.be.eq(src);
  expect(recvComposableRes.metadata, 'Error: Invalid composable resource metadata')
    .to.be.eq(metadata);
  expect(recvComposableRes.license, 'Error: Invalid composable resource license')
    .to.be.eq(license);
  expect(recvComposableRes.thumb, 'Error: Invalid composable resource thumb')
    .to.be.eq(thumb);

  return resource.id.toNumber();
}

export async function addNftSlotResource(
  api: ApiPromise,
  issuerUri: string,
  expectedStatus: 'pending' | 'added',
  collectionId: number,
  nftId: number,
  baseId: number,
  slotId: number,
  src: string | null,
  metadata: string | null,
  license: string | null,
  thumb: string | null,
): Promise<number>  {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));

  const slotResource = api.createType('RmrkTraitsResourceSlotResource', {
    base: baseId,
    src: src,
    metadata,
    slot: slotId,
    license: license,
    thumb: thumb,
  }) as SlotResource;

  const tx = api.tx.rmrkCore.addSlotResource(
    collectionId,
    nftId,
    slotResource,
  );

  const resource = await executeResourceCreation(api, issuer, tx, collectionId, nftId, expectedStatus);

  // FIXME A workaround. It seems it is a PolkadotJS bug.
  // All of the following are `false`.
  //
  // console.log('>>> basic:', resource.resource.isBasic);
  // console.log('>>> composable:', resource.resource.isComposable);
  // console.log('>>> slot:', resource.resource.isSlot);
  const resourceJson = resource.resource.toHuman() as any;

  expect(Object.prototype.hasOwnProperty.call(resourceJson, 'Slot'), 'Error: Expected slot resource type')
    .to.be.true;

  const recvSlotRes = resourceJson['Slot'];

  expect(recvSlotRes.base, 'Error: Invalid slot resource base id')
    .to.be.eq(baseId.toString());
  expect(recvSlotRes.slot, 'Error: Invalid slot resource slot id')
    .to.be.eq(slotId.toString());
  expect(recvSlotRes.src, 'Error: Invalid slot resource src')
    .to.be.eq(src);
  expect(recvSlotRes.metadata, 'Error: Invalid slot resource metadata')
    .to.be.eq(metadata);
  expect(recvSlotRes.license, 'Error: Invalid slot resource license')
    .to.be.eq(license);
  expect(recvSlotRes.thumb, 'Error: Invalid slot resource thumb')
    .to.be.eq(thumb);

  return resource.id.toNumber();
}

export async function equipNft(
  api: ApiPromise,
  issuerUri: string,
  item: NftIdTuple,
  equipper: NftIdTuple,
  resource: number,
  base: number,
  slot: number,
) {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));
  const tx = api.tx.rmrkEquip.equip(item, equipper, resource, base, slot);
  const events = await executeTransaction(api, issuer, tx);
  const equipResult = extractRmrkEquipTxResult(events, 'SlotEquipped', (data) => {
    return {
      item_collection: parseInt(data[0].toString(), 10),
      item_nft: parseInt(data[1].toString(), 10),
      base_id: parseInt(data[2].toString(), 10),
      slot_id: parseInt(data[3].toString(), 10),
    };
  });
  expect(equipResult.success, 'Error: Unable to equip an item').to.be.true;
  expect(equipResult.successData!.item_collection, 'Error: Invalid item collection id')
    .to.be.eq(item[0]);
  expect(equipResult.successData!.item_nft, 'Error: Invalid item NFT id')
    .to.be.eq(item[1]);
  expect(equipResult.successData!.base_id, 'Error: Invalid base id')
    .to.be.eq(base);
  expect(equipResult.successData!.slot_id, 'Error: Invalid slot id')
    .to.be.eq(slot);
}

export async function unequipNft(
  api: ApiPromise,
  issuerUri: string,
  item: any,
  equipper: any,
  resource: number,
  base: number,
  slot: number,
) {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));
  const tx = api.tx.rmrkEquip.equip(item, equipper, resource, base, slot);
  const events = await executeTransaction(api, issuer, tx);

  const unEquipResult = extractRmrkEquipTxResult(
    events,
    'SlotUnequipped',
    (data) => {
      return {
        item_collection: parseInt(data[0].toString(), 10),
        item_nft: parseInt(data[1].toString(), 10),
        base_id: parseInt(data[2].toString(), 10),
        slot_id: parseInt(data[3].toString(), 10),
      };
    },
  );

  expect(unEquipResult.success, 'Error: Unable to unequip an item').to.be.true;
  expect(unEquipResult.successData!.item_collection, 'Error: Invalid item collection id')
    .to.be.eq(item[0]);
  expect(unEquipResult.successData!.item_nft, 'Error: Invalid item NFT id')
    .to.be.eq(item[1]);
  expect(unEquipResult.successData!.base_id, 'Error: Invalid base id')
    .to.be.eq(base);
  expect(unEquipResult.successData!.slot_id, 'Error: Invalid slot id')
    .to.be.eq(slot);
}

export async function removeNftResource(
  api: ApiPromise,
  expectedStatus: 'pending' | 'removed',
  issuerUri: string,
  collectionId: number,
  nftId: number,
  resourceId: number,
) {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));

  const tx = api.tx.rmrkCore.removeResource(collectionId, nftId, resourceId);
  const events = await executeTransaction(api, issuer, tx);
  const removeResult = extractRmrkCoreTxResult(events, 'ResourceRemoval', (data) => {
    return {
      nftId: parseInt(data[0].toString(), 10),
      resourceId: parseInt(data[1].toString(), 10),
    };
  });
  expect(removeResult.success, 'Error: Unable to remove a resource').to.be.true;
  expect(removeResult.successData!.nftId, 'Error: Invalid NFT Id while removing a resource')
    .to.be.eq(nftId);
  expect(removeResult.successData!.resourceId, 'Error: Invalid resource Id while removing a resource')
    .to.be.eq(resourceId);

  const afterDeleting = await findResourceById(api, collectionId, nftId, resourceId);

  if (expectedStatus === 'pending') {
    expect(afterDeleting).not.to.be.null;
    expect(afterDeleting?.pendingRemoval.isTrue).to.be.equal(true);
  } else {
    expect(afterDeleting).to.be.null;
  }
}

export async function acceptResourceRemoval(
  api: ApiPromise,
  issuerUri: string,
  collectionId: number,
  nftId: number,
  resourceId: number,
) {
  const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
  const issuer = privateKey(issuerUri, Number(ss58Format));

  const tx = api.tx.rmrkCore.acceptResourceRemoval(collectionId, nftId, resourceId);
  const events = await executeTransaction(api, issuer, tx);
  const acceptResult = extractRmrkCoreTxResult(events, 'ResourceRemovalAccepted', (data) => {
    return {
      nftId: parseInt(data[0].toString(), 10),
      resourceId: parseInt(data[1].toString(), 10),
    };
  });
  expect(acceptResult.success, 'Error: Unable to accept a resource').to.be.true;
  expect(acceptResult.successData!.nftId, 'Error: Invalid NFT Id while accepting a resource')
    .to.be.eq(nftId);
  expect(acceptResult.successData!.resourceId, 'Error: Invalid resource Id while accepting a resource')
    .to.be.eq(resourceId);

  const afterDeleting = await findResourceById(api, collectionId, nftId, resourceId);
  expect(afterDeleting, 'Error: resource deleting failed').to.be.null;
}
