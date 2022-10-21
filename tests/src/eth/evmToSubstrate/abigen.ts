import {runTypeChain, glob} from 'typechain';


async function main() {
  const cwd = process.cwd();

  // find all files matching the glob
  const allFiles = glob(cwd, ['./ABI/*.json']);

  const result = await runTypeChain({
    cwd,
    filesToProcess: allFiles,
    allFiles,
    outDir: 'ABIGEN',
    target: 'web3-v1',
  });
}

main().catch(console.error);