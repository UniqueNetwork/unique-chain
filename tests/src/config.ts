import process from 'process';

const config = {
  substrateUrl: process.env.substrateUrl || 'ws://127.0.0.1:9944'
}

export default config;