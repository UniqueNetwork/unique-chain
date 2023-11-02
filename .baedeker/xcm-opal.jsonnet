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
			{genesis+:{runtime+:{configuration+:{config+:{async_backing_params+:{allowed_ancestry_len:3, max_candidate_depth: 4}, scheduling_lookahead:5,max_validators_per_core:1, minimum_backing_votes:1,needed_approvals:1,on_demand_cores:5}}}}}
		]),
		// modify:: m.genericRelay($, hrmp = [
		// 	// [$.parachains.opal.paraId, $.parachains.westmint.paraId, 8, 512],
		// 	// [$.parachains.westmint.paraId, $.parachains.opal.paraId, 8, 512],
		// ]),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'relay',
			extraArgs: [
				// "--log=parachain::candidate-backing=trace,parachain::candidate-selection=trace," +
				// 	"parachain::pvf=trace,parachain::collator-protocol=trace," +
				// 	"parachain::provisioner=trace",
			],
		},
		for name in ['alice', 'bob', 'charlie', 'dave', 'eve']
	},
};

local opal = {
	name: 'opal',
	bin: 'bin/unique',
	paraId: 1001,
	spec: {Genesis:{
		modify:: m.genericPara($),
	}},
	nodes: {
		[name]: {
			bin: $.bin,
			wantedKeys: 'para',
			extraArgs: [
					// "--log=cumulus-consensus=trace,cumulus-collator=trace," +
     //                "parachain::candidate-backing=trace,"+
					// "parachain::collator-protocol=trace,parachain::candidate-selection=trace," +
					// "parachain::collation-generation=trace,parachain::filtering=trace",
			],
		},
		for name in ['alice', 'bob', 'charlie', 'dave', 'eve']
	},
};

local westmint = {
	name: 'westmint',
	bin: 'bin/cumulus',
	paraId: 1002,
	spec: {Genesis:{
		chain: 'westmint-local',
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
		for para in [opal]
	},
}
