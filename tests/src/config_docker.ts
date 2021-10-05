//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import process from 'process';

const config = {
  substrateUrl: process.env.substrateUrl || 'ws://172.17.0.1:9944',
  frontierUrl: process.env.frontierUrl || 'http://172.17.0.1:9933',
};

export default config;
