const npmBinsToPackageName = {
  'ts-node': 'ts-node',
  'eslint': 'eslint',
  'tsc': 'typescript',
  'mocha': 'mocha',
};

const paths = [];
for(const k of Object.keys(npmBinsToPackageName)) {
  paths.push([k], ['run', k]);
}

module.exports = {
  name: 'plugin-root-bin',
  factory: require => {
    const {BaseCommand} = require('@yarnpkg/cli');
    const {Option} = require('clipanion');

    class ExecuteBinFromRootCommand extends BaseCommand {
      static paths = paths;

      args = Option.Proxy();

      async execute() {
        const fs = require('fs');
        const path = require('path');

        const ownPackageJson = JSON.parse(await fs.promises.readFile('package.json', 'utf-8'));
        const cmd = this.path[this.path.length - 1];

        if(ownPackageJson.scripts?.[cmd]) {
          throw new Error(`'${cmd}' is defined in package.json but the 'plugin-root-bin' also defined it. To avoid unexpected results, please rename the script in package.json`);
        }

        const dir = await this.getBinaryPackageDirectory(fs, path, cmd, ownPackageJson);
        const pkg = JSON.parse(await fs.promises.readFile(path.join(dir, 'package.json'), 'utf-8'));

        const packageRelativeBinPath = typeof pkg.bin === 'object'
          ? pkg.bin[cmd]
          : pkg.bin;

        const binPath = path.join(dir, packageRelativeBinPath);

        process.exitCode = await this.cli.run(['node', binPath, ...this.args]);

        // seems something in yarn resets the exit code, so force exit
        process.exit();
      }

      async getBinaryPackageDirectory(_fs, path, cmd, _ownPackageJson) {
        const res = path.resolve(__dirname, '../../node_modules', npmBinsToPackageName[cmd]);
        console.error(res);
        return res;
      }
    }

    return {
      commands: [
        ExecuteBinFromRootCommand,
      ],
    };
  },
};
