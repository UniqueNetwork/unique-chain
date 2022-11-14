import {readFile, writeFile} from 'fs/promises';
import path from 'path';
import usingApi from './substrate/substrate-api';

const formatNumber = (num: string): string => num.split('').reverse().join('').replace(/([0-9]{3})/g, '$1_').split('').reverse().join('').replace(/^_/, '');

(async () => {
  let weightToFeeCoefficientOverride: string;
  let minGasPriceOverride: string;
  await usingApi(async (api, _privateKey) => {
    weightToFeeCoefficientOverride = (await api.query.configuration.weightToFeeCoefficientOverride() as any).toBigInt().toString();
    minGasPriceOverride = (await api.query.configuration.minGasPriceOverride() as any).toBigInt().toString();
  });
  const constantsFile = path.resolve(__dirname, '../../primitives/common/src/constants.rs');
  let constants = (await readFile(constantsFile)).toString();

  let weight2feeFound = false;
  constants = constants.replace(/(\/\*<weight2fee>\*\/)[0-9_]+(\/\*<\/weight2fee>\*\/)/, (_f, p, s) => {
    weight2feeFound = true;
    return p+formatNumber(weightToFeeCoefficientOverride)+s;
  });
  if (!weight2feeFound) {
    throw new Error('failed to find weight2fee marker in source code');
  }

  let minGasPriceFound = false;
  constants = constants.replace(/(\/\*<mingasprice>\*\/)[0-9_]+(\/\*<\/mingasprice>\*\/)/, (_f, p, s) => {
    minGasPriceFound = true;
    return p+formatNumber(minGasPriceOverride)+s;
  });
  if (!minGasPriceFound) {
    throw new Error('failed to find mingasprice marker in source code');
  }

  await writeFile(constantsFile, constants);
})().catch(e => {
  console.log(e.stack);
});
