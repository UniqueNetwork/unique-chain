local
m = import 'baedeker-library/mixin/spec.libsonnet',
;

function(relay_spec, assethub_spec)

local relay = {
	name: 'relay',
	bin: 'bin/polkadot',
	validatorIdAssignment: 'staking',
	spec: {Genesis:{
		chain: relay_spec,
		modify:: bdk.mixer([
			m.genericRelay($, hrmp = std.join([], [
				// [[$.parachains[a].paraId, $.parachains[b].paraId, 8, 512], [$.parachains[b].paraId, $.parachains[a].paraId, 8, 512]],
				// for [a, b] in [
					// ['unique', 'acala'],
					// ['unique', 'moonbeam'],
					// ['unique', 'statemint'],
					// ['unique', 'astar'],
					// ['unique', 'polkadex'],
				// ]
			])),
            m.simplifyGenesisName(),
            {
                _genesis+: {
                            configuration+: {
                                config+: {
                                    async_backing_params+: {
										allowed_ancestry_len: 3,
										max_candidate_depth: 4,
									},
                                    validation_upgrade_cooldown: 200,
                                    validation_upgrade_delay: 100,
                                    minimum_validation_upgrade_delay: 15,
                                    minimum_backing_votes: 2,
                                    needed_approvals: 2,
                                    scheduler_params+: {
                                      lookahead: 1,
                                    },
								},
							},
				},
			},
            m.unsimplifyGenesisName(),
		]),
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

local unique = {
	name: 'unique',
	bin: 'bin/unique',
	paraId: 2037,
	spec: {Genesis:{
		modify:: m.genericPara($),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'para',
			extraArgs: [
				'--increase-future-pool',
				'--pool-type=fork-aware',
			],
		},
		for name in ['alice', 'bob']
	},
};

local assethub = {
	name: 'assethub',
	bin: 'bin/assethub',
	paraId: 1000,
	spec: {
		FromScratchGenesis: {
			spec: m.genericPara($)(assethub_spec),
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

local acala = {
	name: 'acala',
	bin: 'bin/acala',
	paraId: 2000,
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
			parentConnection: 'internal-samedir',
            expectedDataPath: '/acala/data',				
		},
		for name in ['alice', 'bob']
	},
};

local moonbeam = {
	name: 'moonbeam',
	bin: 'bin/moonbeam',
	signatureSchema: 'Ethereum',
	paraId: 2004,
	spec: {Genesis:{
		chain: 'moonbeam-local',
		specFilePrefix: 'moonbeam-local-',
		modify:: m.genericPara($),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'para-nimbus',
			parentConnection: 'internal-samedir',
            expectedDataPath: '/data',			
		},
		for name in ['alith', 'baltathar']
	},
};

local astar = {
	name: 'astar',
	bin: 'bin/astar',
	paraId: 2006,
	spec: {Genesis:{
		chain: 'astar-dev',
		modify:: m.genericPara($),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'para',
			parentConnection: 'internal-samedir',
            expectedDataPath: '/data',				
		},
		for name in ['alice', 'bob']
	},
};

local polkadex = {
	name: 'polkadex',
	bin: 'bin/polkadex',
	paraId: 2040,
	spec: {Genesis:{
		chain: 'mainnet',
		modify:: m.genericPara($),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'para',
			parentConnection: 'internal-samedir',
            expectedDataPath: '/data',

		},
		for name in ['alice', 'bob']
	},
};

local hydradx = {
	name: 'hydradx',
	bin: 'bin/hydradx',
	paraId: 2034,
	spec: {Genesis:{
		chain: 'local',
		modify:: m.genericPara($),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'para',
			parentConnection: 'internal-samedir',
            expectedDataPath: '/hydra',			
		},
		for name in ['alice', 'bob']
	},
};


relay + {
	parachains: {
		[para.name]: para,
		for para in [
			unique,
			acala,
			moonbeam,
			assethub,
			astar,
			polkadex,
			hydradx,
		]
	},
}
