import {exec} from 'child_process';
import path from 'path';
import {dirname} from 'path';
import {fileURLToPath} from 'url';

export const collectData = () => {
  const dirName = dirname(fileURLToPath(import.meta.url));

  const pathToScript = path.resolve(dirName, './stakersParser.jsonnet');
  const outputPath = path.resolve(dirName, './output.json');
  exec(`chainql --tla-str=chainUrl=ws://127.0.0.1:9944 ${pathToScript} > ${outputPath}`);
};
