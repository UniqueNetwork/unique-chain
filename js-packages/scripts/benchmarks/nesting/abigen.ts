import {runTypeChain, glob, DEFAULT_FLAGS} from 'typechain';


async function main() {
  const cwd = process.cwd();

  // find all files matching the glob
  const allFiles = glob(cwd, ['./ABI/*.abi']);

  await runTypeChain({
    cwd,
    filesToProcess: allFiles,
    allFiles,
    outDir: 'ABIGEN',
    target: 'web3-v1',
    flags: {...DEFAULT_FLAGS, alwaysGenerateOverloads: true, tsNocheck: false},
  });
}

main().catch(console.error);