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
		modify:: m.genericRelay($, hrmp = std.join([], [
			[[$.parachains[a].paraId, $.parachains[b].paraId, 8, 512], [$.parachains[b].paraId, $.parachains[a].paraId, 8, 512]],
			for [a, b] in [
				['unique', 'acala'],
				['unique', 'moonbeam'],
				['unique', 'statemint'],
				['unique', 'astar'],
				['unique', 'polkadex'],
			]
		])),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'relay',
		},
		for name in ['alice', 'bob', 'charlie', 'dave', 'eve', 'ferdie', 'gregory']
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

local acala = {
	name: 'acala',
	bin: 'bin/acala',
	paraId: 1002,
	spec: {Genesis:{
		chain: 'acala-dev',
		modify:: bdk.mixer([
			m.genericPara($),
			function(prev) prev {id+: '-local'},
		]),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'para',
		},
		for name in ['alice', 'bob']
	},
};

local moonbeam = {
	name: 'moonbeam',
	bin: 'bin/moonbeam',
	signatureSchema: 'Ethereum',
	paraId: 1003,
	spec: {Genesis:{
		chain: 'moonbeam-local',
		specFilePrefix: 'moonbeam-local-',
		modify:: m.genericPara($),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'para-nimbus',
		},
		for name in ['alith', 'baltathar']
	},
};

local statemint = {
	name: 'statemint',
	bin: 'bin/cumulus',
	paraId: 1004,
	spec: {Genesis:{
		chain: 'statemint-local',
		modify:: m.genericPara($),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'para-ed',
		},
		for name in ['alice', 'bob']
	},
};

local astar = {
	name: 'astar',
	bin: 'bin/astar',
	paraId: 1005,
	spec: {Genesis:{
		chain: 'astar-dev',
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

local polkadex = {
	name: 'polkadex',
	bin: 'bin/polkadex',
	paraId: 1006,
	spec: {Genesis:{
		chain: 'mainnet',
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
		for para in [unique, acala, moonbeam, statemint, astar, polkadex]
	},
}
