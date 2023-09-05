local
m = import 'baedeker-library/mixin/spec.libsonnet',
;

local relay = {
	name: 'relay',
	bin: 'bin/polkadot',
	validatorIdAssignment: 'staking',
	spec: {Genesis:{
		chain: 'rococo-local',
		modify:: m.genericRelay($),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'relay',
		},
		for name in ['alice', 'bob', 'charlie']
	},
};

local quartz = {
	name: 'quartz',
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

relay + {
	parachains: {
		[para.name]: para,
		for para in [quartz]
	},
}
