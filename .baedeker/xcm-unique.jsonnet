local
m = import 'baedeker-library/mixin/spec.libsonnet',
;

local 
assethubSpec = import 'assethub-spec.json',
;

function(relay_spec)

local relay = {
	name: 'relay',
	bin: 'bin/polkadot',
	validatorIdAssignment: 'staking',
	spec: {Genesis:{
		chain: relay_spec,
		modify:: m.genericRelay($, hrmp = std.join([], [
		])),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'relay',
			expectedDataPath: '/parity',
		},
		for name in ['alice', 'bob', 'charlie', 'dave', 'eve', 'ferdie', 'gregory', 'holly']
	},
};


local assethub = {
	name: 'assethub',
	bin: 'bin/assethub',
	paraId: 1004,
	spec: {
		FromScratchGenesis: {
			spec: assethubSpec,
			modify:: m.genericPara($),
		}
	},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'para-ed',
			parentConnection: 'internal-samedir',
            expectedDataPath: '/parity',
		},
		for name in ['alice', 'bob']
	},
};

relay + {
	parachains: {
		[para.name]: para,
		for para in [assethub]
	},
}
