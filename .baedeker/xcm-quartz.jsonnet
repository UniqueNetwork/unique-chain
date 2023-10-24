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
			// [[$.parachains[a].paraId, $.parachains[b].paraId, 8, 512], [$.parachains[b].paraId, $.parachains[a].paraId, 8, 512]],
			// for [a, b] in [
			// 	['quartz', 'karura'],
			// 	['quartz', 'moonriver'],
			// 	['quartz', 'statemine'],
			// 	['quartz', 'shiden'],
			// ]
		])),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'relay',
		},
		for name in ['alice', 'bob', 'charlie', 'dave', 'eve', 'ferdie']
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

local karura = {
	name: 'karura',
	bin: 'bin/acala',
	paraId: 1002,
	spec: {Genesis:{
		chain: 'karura-dev',
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

local moonriver = {
	name: 'moonriver',
	bin: 'bin/moonbeam',
	signatureSchema: 'Ethereum',
	paraId: 1003,
	spec: {Genesis:{
		chain: 'moonriver-local',
		specFilePrefix: 'moonriver-local-',
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

local statemine = {
	name: 'statemine',
	bin: 'bin/cumulus',
	paraId: 1004,
	spec: {Genesis:{
		chain: 'statemine-local',
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

local shiden = {
	name: 'shiden',
	bin: 'bin/astar',
	paraId: 1005,
	spec: {Genesis:{
		chain: 'shiden-dev',
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
		for para in [quartz, karura, moonriver, statemine, shiden]
	},
}
