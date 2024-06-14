local
m = import 'baedeker-library/mixin/spec.libsonnet',
;

function(relay_spec)

local relay = {
	name: 'relay',
	bin: 'bin/polkadot',
	validatorIdAssignment: 'staking',
	spec: {Genesis:{
		chain: relay_spec,
		modify:: m.genericRelay($),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'relay',
			expectedDataPath: '/parity',
        	extraArgs: [
          		'--insecure-validator-i-know-what-i-do',
	        ],			
		},
		for name in ['alice', 'bob', 'charlie', 'dave', 'eve']
	},
};

local unique = {
	name: 'unique',
	bin: 'bin/unique',
	paraId: 1001,
	spec: {Genesis:{
		modify:: m.genericPara($),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'para',
		},
		for name in ['alpha', 'beta', 'gamma', 'delta']
	},
};

relay + {
	parachains: {
		[para.name]: para,
		for para in [unique]
	},
}
