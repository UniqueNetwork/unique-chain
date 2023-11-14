import {writeFile} from 'fs/promises';
import {join} from 'path';
import {exit} from 'process';
import {fileURLToPath} from 'url';

// TODO: Extract metadata statically with chainql.
const url = process.env.RELAY_OPAL_HTTP_URL || process.env.RELAY_QUARTZ_HTTP_URL || process.env.RELAY_UNIQUE_HTTP_URL || process.env.RELAY_SAPPHIRE_HTTP_URL || 'http://127.0.0.1:9944';

const srcDir = fileURLToPath(new URL('.', import.meta.url));

for(let i = 0; i < 10; i++) {
  try {
    console.log(`Trying to fetch metadata, retry ${i + 1}/${10}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      redirect: 'follow',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'state_getMetadata',
        params: [],
      }),
    });
    const json = await response.json();
    const output = join(srcDir, 'metadata.json');
    console.log(`Received response, saving to ${output}`);
    await writeFile(output, JSON.stringify(json));
    exit(0);
  } catch (e) {
    console.error('Failed to request metadata:');
    console.error(e);
    console.error('Waiting 1 minute');
    await new Promise(res => setTimeout(res, 60 * 1000));
  }
}
console.error('Out of retries');
exit(1);
