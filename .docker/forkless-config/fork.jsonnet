// Get live chain data on the URL provided with `forkFrom`, and 
// insert the necessary data into a chain spec to launch a new chain with.
// 
// ### Arguments
// - `rawSpec`: Path to the raw chain spec to modify
// - `forkFrom`: URL of the chain's WS port to get the data from
// 
// ### Usage
// `chainql --tla-code=rawSpec="import 'parachain-spec-raw.json'" --tla-str=forkFrom="wss://some-parachain.node:443" fork.jsonnet`

function(rawSpec, forkFrom)
local sourceChainState = cql.chain(forkFrom).latest;

local raw = local sourceRaw = sourceChainState._raw._preloadKeys; {
  [key]: cql.toHex(sourceRaw[key])
  for key in std.objectFields(sourceRaw)
  if sourceRaw[key] != null
};

local
auraKeys = [
	sourceChainState.AuraExt._key.Authorities,
	sourceChainState.Aura._key.Authorities,
] + (if 'CollatorSelection' in sourceChainState then [
	sourceChainState.CollatorSelection._key.Candidates,
	sourceChainState.CollatorSelection._key.Invulnerables,
] else []),

// Keys, which should be migrated from passed spec, rather than from forked chain
wantedKeys = [
	sourceChainState.ParachainInfo._key.ParachainId,
	sourceChainState.Sudo._key.Key,
	sourceChainState.System.BlockHash._key['0'],
	// Always [69, 69, 69, ..., 69, 69, 69]
	sourceChainState.System._key.ParentHash,
] + auraKeys,
// Keys to remove from original chain
unwantedPrefixes = [
	sourceChainState.Aura._key.CurrentSlot,
	// Ensure there will be no panics caused by unexpected kept state
	sourceChainState.ParachainSystem._key.ValidationData,
	sourceChainState.ParachainSystem._key.RelayStateProof,
	sourceChainState.ParachainSystem._key.HostConfiguration,
	sourceChainState.ParachainSystem._key.LastRelayChainBlockNumber,
	sourceChainState.ParachainSystem._key.LastDmqMqcHead,
	// Part of head
	sourceChainState.System._key.BlockHash,
	sourceChainState.System._key.Number,
	sourceChainState.System._key.Digest,
] + auraKeys,

cleanupRaw(raw) = {
	[key]: raw[key]
	for key in std.objectFields(raw)
	if std.all(std.map(function(prefix) !std.startsWith(key, prefix), unwantedPrefixes))
};


local originalRaw = rawSpec.genesis.raw.top;
local outSpec = rawSpec {
	genesis+: {
		raw+: {
			top: cleanupRaw(raw) {
				[key]: originalRaw[key]
				for key in wantedKeys
				if std.objectHas(originalRaw, key)
			},
		},
	},
};

local pow10(n) = std.foldl(function(a, _) a * std.bigint('10'), std.range(0, n), std.bigint('1'));

local
	aliceAccount = sourceChainState.System._encodeKey.Account(['0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d']),
	totalIssuance = sourceChainState.Balances._encodeKey.TotalIssuance([]),
	Munique = pow10(6 + 18),
;

outSpec {
	genesis+: {
		raw+: {
			top+: {
				[totalIssuance]: sourceChainState.Balances._encodeValue.TotalIssuance(
					if std.objectHas(super, totalIssuance)
						then sourceChainState.Balances._decodeValue.TotalIssuance(super[totalIssuance])
						else std.bigint(0)
					- if std.objectHas(super, aliceAccount)
						then sourceChainState.System._decodeValue.Account(super[aliceAccount]).data.free
						else std.bigint(0)
					+ Munique
				),
				[aliceAccount]: sourceChainState.System._encodeValue.Account({
					nonce: 0,
					consumers: 3,
					providers: 1,
					sufficients: 0,
					data: {
						free: Munique,
						reserved: std.bigint('0'),
						misc_frozen: std.bigint('0'),
						fee_frozen: std.bigint('0'),
					},
				},)
			},
		},
	},
}
