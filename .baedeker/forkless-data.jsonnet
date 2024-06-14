local
m = import 'baedeker-library/mixin/spec.libsonnet',
rm = import 'baedeker-library/mixin/raw-spec.libsonnet',
;

function(relay_spec, forked_spec, fork_source)

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
	spec: {Raw:{
		local modifyRaw = bdk.mixer([
			rm.resetNetworking($),
			rm.decodeSpec(),
			rm.polkaLaunchPara($),
			rm.reencodeSpec(),
		]),
		raw_spec: modifyRaw({
			name: "Unused",
			id: "%s_local" % forked_spec,
			bootNodes: error "override me",
			chainType: error "override me",
			telemetryEndpoints: error "override me",
			codeSubstitutes: error "override me",
			para_id: error "override me",
			relay_chain: "unused",
			genesis: {
				raw: {
					top: cql.chain(fork_source).latest._preloadKeys._raw,
					childrenDefault: {},
				},
			},
		}),
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
		for para in [unique]
	},
}
