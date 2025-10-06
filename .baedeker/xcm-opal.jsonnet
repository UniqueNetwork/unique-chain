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
		modify:: bdk.mixer([
			m.genericRelay($, hrmp = std.join([], [])),
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
                                lookahead: 3,
                            },
                            executor_params: [
                                { MaxMemoryPages: 8192 },
                                { PvfExecTimeout: [ "Backing", 2500 ] },
                                { PvfExecTimeout: [ "Approval", 15000 ] }
                            ],
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
            extraArgs: [
                '--network-backend=libp2p',
			],
        },
        for name in ['alice', 'bob', 'charlie', 'dave', 'eve']
    },
};

local opal = {
	name: 'opal',
	bin: 'bin/unique',
	paraId: 2037,
	spec: {Genesis:{
		modify:: m.genericPara($),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
            wantedKeys: {
                _controller: "Sr25519",
                _stash: "Sr25519",
                aura: "Sr25519",
                orcl: 'Sr25519',
                sessionKeys: {
                    "aura": "aura"
                },
            },
			extraArgs: [
				'--increase-future-pool',
				'--pool-type=fork-aware',
			],
            extraArgsInternalParent: [
                '--network-backend=libp2p',
            ]
		},
		for name in ['alice', 'bob', 'charlie']
	},
};

local assethub = {
    name: 'assethub',
    bin: 'bin/assethub',
    paraId: 1000, 
    spec: {Genesis:{
        chain: 'asset-hub-westend-local',
        modify:: m.genericPara($),
    }},
    nodes: {
        [name]: {
            bin: $.bin,
            wantedKeys: 'para',
            parentConnection: 'internal-samedir',
            expectedDataPath: '/parity',
            extraArgsInternalParent: [
                '--network-backend=libp2p',
            ]
        },
        for name in ['alice', 'bob']
    },
};

relay + {
    parachains: {
        [para.name]: para,
        for para in [opal, assethub]
    },
}
