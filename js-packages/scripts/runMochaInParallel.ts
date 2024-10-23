import * as fs from 'fs';
import * as path from 'path';
import {exec} from 'child_process';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('ts-node/esm', pathToFileURL('./'));

function readAllFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(readAllFiles(filePath));
    } else if(filePath.endsWith('.test.ts')) {
      results.push(filePath);
    }
  });

  return results;
}

const files = readAllFiles('./');
const MAX_PROCESSES = 8;
let currentlyRunningProcessesCount = 0;
let fileIndex = 0;

function startProcess(command: string) {
  console.log('starting', command);
  currentlyRunningProcessesCount++;
  return exec(command, (error, stdout, stderr) => {
    console.log("finished", command);
    if (stderr)
      console.log(`Stderr: ${stderr}`);
    if (stdout)
      console.log(`Stdout: ${stdout}`);
    currentlyRunningProcessesCount--;
    console.log("running", currentlyRunningProcessesCount, "tests left", files.length - fileIndex);
  });
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

await new Promise((resolve) => {
  const setup = startProcess('yarn setup');
  setup.on('close', (code) => {
    console.log(`Setup exited with code ${code}`);
    resolve(true);
  });
})

while (fileIndex < files.length) {
  startProcess(`yarn mocha --timeout 9999999 --loader=ts-node/esm.mjs './${files[fileIndex]}'`);
  fileIndex++;
  while (currentlyRunningProcessesCount >= MAX_PROCESSES) {
    await sleep(100);
  }
}