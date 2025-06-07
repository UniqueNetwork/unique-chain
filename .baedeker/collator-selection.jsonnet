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
			m.genericRelay($),
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
		for name in ['alice', 'bob', 'charlie', 'dave', 'eve']
	},
};

local unique = {
	name: 'unique',
	bin: 'bin/unique',
	paraId: 1001,
	spec: {Genesis:{
		modify:: bdk.mixer([
			m.simplifyGenesisName(),
			// HACK: Baedeker checks pallets session and collatorSelection
			// by checking for keys with the name of the pallet in the genesis.
			// However, new versions of the Polkadot SDK do not add these pallets
			// to the genesis when generating the spec.
			//
			// This will be fixed in Baedeker one day, but for now we will add empty entries
			// so that Baedeker correctly initializes storages for this pallets.
			// Without hack the tests will fail in method resetInvulnerables
			// with the error ValidatorNotRegistered.
			//
			// Link to the discussions:
			// https://chat.uniquenetwork.dev/unique/pl/r81k3pdrp7d15nzem78jj8ndpc
			{
				_genesis+: {
					session+: {},
					collatorSelection+: {},
				},
			},
			m.unsimplifyGenesisName(),
			m.genericPara($),
		]),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'para',
			extraArgs: [
				'--pool-type=fork-aware',
			],			
		},
		for name in ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta']
	},
};

relay + {
	parachains: {
		[para.name]: para,
		for para in [unique]
	},
}
