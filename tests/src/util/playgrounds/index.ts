// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import {IKeyringPair} from '@polkadot/types/types';
import config from '../../config';
import '../../interfaces/augment-api-events';
import {DevUniqueHelper, SilentLogger, SilentConsole} from './unique.dev';


export const usingPlaygrounds = async (code: (helper: DevUniqueHelper, privateKey: (seed: string) => IKeyringPair) => Promise<void>) => {
  const silentConsole = new SilentConsole();
  silentConsole.enable();

  const helper = new DevUniqueHelper(new SilentLogger());

  try {
    await helper.connect(config.substrateUrl);
    const ss58Format = helper.chain.getChainProperties().ss58Format;
    const privateKey = (seed: string) => helper.util.fromSeed(seed, ss58Format);
    await code(helper, privateKey);
  }
  finally {
    await helper.disconnect();
    silentConsole.disable();
  }
};
