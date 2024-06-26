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
		modify:: m.genericRelay($, hrmp = [
			// [$.parachains.opal.paraId, $.parachains.westmint.paraId, 8, 512],
			// [$.parachains.westmint.paraId, $.parachains.opal.paraId, 8, 512],
		]),
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
		for name in ['alice', 'bob']
	},
};

local westmint = {
	name: 'westmint',
	bin: 'bin/assethub',
	paraId: 1002,
	spec: {Genesis:{
		chain: 'westmint-local',
		modify:: m.genericPara($),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'para',
			expectedDataPath: '/parity',			
		},
		for name in ['alice', 'bob']
	},
};

relay + {
	parachains: {
		[para.name]: para,
		for para in [unique, westmint]
	},
}
