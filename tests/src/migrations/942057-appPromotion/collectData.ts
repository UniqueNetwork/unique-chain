import {spawnSync} from 'child_process';

export const collectData = () => spawnSync('sh', ['./collect-data.sh']);
