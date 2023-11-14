import {readFile, writeFile} from 'fs/promises';
import path from 'path';
import {makeNames, usingPlaygrounds} from '@unique/tests/util/index.js';

const {dirname} = makeNames(import.meta.url);

const formatNumber = (num: string): string => num.split('').reverse().join('').replace(/([0-9]{3})/g, '$1_').split('').reverse().join('').replace(/^_/, '');

(async () => {
  let weightToFeeCoefficientOverride: string;
  let minGasPriceOverride: string;
  await usingPlaygrounds(async (helpers, _privateKey) => {
    weightToFeeCoefficientOverride = (await helpers.getApi().query.configuration.weightToFeeCoefficientOverride() as any).toBigInt().toString();
    minGasPriceOverride = (await helpers.getApi().query.configuration.minGasPriceOverride() as any).toBigInt().toString();
  });
  const constantsFile = path.resolve(dirname, '../../primitives/common/src/constants.rs');
  let constants = (await readFile(constantsFile)).toString();

  let weight2feeFound = false;
  constants = constants.replace(/(\/\*<weight2fee>\*\/)[0-9_]+(\/\*<\/weight2fee>\*\/)/, (_f, p, s) => {
    weight2feeFound = true;
    return p+formatNumber(weightToFeeCoefficientOverride)+s;
  });
  if(!weight2feeFound) {
    throw new Error('failed to find weight2fee marker in source code');
  }

  let minGasPriceFound = false;
  constants = constants.replace(/(\/\*<mingasprice>\*\/)[0-9_]+(\/\*<\/mingasprice>\*\/)/, (_f, p, s) => {
    minGasPriceFound = true;
    return p+formatNumber(minGasPriceOverride)+s;
  });
  if(!minGasPriceFound) {
    throw new Error('failed to find mingasprice marker in source code');
  }

  await writeFile(constantsFile, constants);
})().catch(e => {
  console.log(e.stack);
});
