import {getApiConnection} from '../substrate/substrate-api';
import {requirePallets, Pallets} from './util/helpers';
import {createCollection, createBase} from './util/tx';

describe('integration test: create new Base', () => {
  let api: any;
  before(async function() {
    api = await getApiConnection();
    await requirePallets(this, [Pallets.RmrkCore, Pallets.RmrkEquip]);
  });

  const alice = '//Alice';

  it('create empty Base', async () => {
    await createBase(api, alice, 'empty-base-type', 'EBase', []);
  });

  it('create Base with fixed part', async () => {
    await createBase(api, alice, 'fixedpart-base-type', 'FPBase', [
      {
        'FixedPart': {
          id: 42,
          z: 0,
          src: 'some-fixed-url',
        },
      },
    ]);
  });

  it('create Base with slot part (no collection)', async () => {
    await createBase(api, alice, 'slotpart-base-type', 'SPBase', [
      {
        'SlotPart': {
          id: 112,
          equippable: 'Empty',
          z: 0,
          src: 'some-fallback-slot-url',
        },
      },
    ]);
  });

  it('create Base with slot part (any collection)', async () => {
    await createBase(api, alice, 'slotpartany-base-type', 'SPABase', [
      {
        'SlotPart': {
          id: 222,
          equippable: 'All',
          z: 1,
          src: 'some-fallback-slot-url',
        },
      },
    ]);
  });

  it('create Base with slot part (custom collections)', async () => {
    const firstCollectionId = await createCollection(
      api,
      alice,
      'first-collection-meta',
      null,
      'first-collection',
    );

    const secondCollectionId = await createCollection(
      api,
      alice,
      'first-collection-meta',
      null,
      'first-collection',
    );

    await createBase(api, alice, 'slotpartcustom-base-type', 'SPCBase', [
      {
        'SlotPart': {
          id: 1024,
          equippable: {
            'Custom': [firstCollectionId, secondCollectionId],
          },
          z: 2,
          src: 'some-fallback-slot-url',
        },
      },
    ]);
  });

  after(async() => { await api.disconnect(); });
});
