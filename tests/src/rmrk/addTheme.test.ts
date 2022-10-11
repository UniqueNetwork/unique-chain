import {expect} from 'chai';
import {getApiConnection} from '../substrate/substrate-api';
import {createBase, addTheme} from './util/tx';
import {expectTxFailure, requirePallets, Pallets} from './util/helpers';
import {getThemeNames} from './util/fetch';

describe('integration test: add Theme to Base', () => {
  let api: any;
  before(async function() {
    api = await getApiConnection();
    await requirePallets(this, [Pallets.RmrkEquip]);
  });

  const alice = '//Alice';
  const bob = '//Bob';

  it('add default theme', async () => {
    const baseId = await createBase(api, alice, 'default-themed-base', 'DTBase', []);
    await addTheme(api, alice, baseId, {
      name: 'default',
      properties: [
        {
          key: 'some-key',
          value: 'some-key-value',
        },
        {
          key: 'another-key',
          value: 'another-key-value',
        },
      ],
    });
  });

  it('add default theme and a custom one', async () => {
    const baseId = await createBase(api, alice, '2-themed-base', '2TBase', []);
    await addTheme(api, alice, baseId, {
      name: 'default',
      properties: [
        {
          key: 'default-key',
          value: 'default-key-value',
        },
      ],
    });
    await addTheme(api, alice, baseId, {
      name: 'custom-theme',
      properties: [
        {
          key: 'custom-key-0',
          value: 'custom-key-value-0',
        },
        {
          key: 'custom-key-1',
          value: 'custom-key-value-1',
        },
      ],
    });
  });

  it('fetch filtered theme keys', async () => {
    const baseId = await createBase(api, alice, '2-themed-base', '2TBase', []);
    await addTheme(api, alice, baseId, {
      name: 'default',
      properties: [
        {
          key: 'first-key',
          value: 'first-key-value',
        },
        {
          key: 'second-key',
          value: 'second-key-value',
        },
      ],
    }, ['second-key']);
  });

  it('fetch theme names', async() => {
    const baseId = await createBase(api, alice, '3-themed-base', '3TBase', []);
    const names = [
      'default',
      'first-theme',
      'second-theme',
    ];

    for (let i = 0; i < names.length; i++) {
      await addTheme(api, alice, baseId, {name: names[i], properties: [{key: 'dummy', value: 'dummy'}]});
    }

    const fetchedNames = await getThemeNames(api, baseId);

    for (let i = 0; i < names.length; i++) {
      const isFound = fetchedNames.find((name) => name === names[i]) !== undefined;

      expect(isFound, 'Error: invalid theme names').to.be.true;
    }
  });

  it('[negative] unable to add theme to non-existing base', async () => {
    const maxBaseId = 0xFFFFFFFF;
    const tx = addTheme(api, alice, maxBaseId, {
      name: 'default',
      properties: [],
    });

    await expectTxFailure(/rmrkEquip\.BaseDoesntExist/, tx);
  });

  it('[negative] unable to add custom theme if no default theme', async () => {
    const baseId = await createBase(api, alice, 'no-default-themed-base', 'NDTBase', []);
    const tx = addTheme(api, alice, baseId, {
      name: 'custom-theme',
      properties: [],
    });

    await expectTxFailure(/rmrkEquip\.NeedsDefaultThemeFirst/, tx);
  });

  it('[negative] unable to add theme by a not-an-owner', async () => {
    const baseId = await createBase(api, alice, 'no-default-themed-base', 'NDTBase', []);
    const tx = addTheme(api, bob, baseId, {
      name: 'default',
      properties: [],
    });

    await expectTxFailure(/rmrkEquip\.PermissionError/, tx);
  });

  after(() => { api.disconnect(); });
});
