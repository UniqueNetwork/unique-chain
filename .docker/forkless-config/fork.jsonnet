
function(rawSpec, forkFrom)
local sourceChain = cql.chain(forkFrom).latest;

local raw = local sourceRaw = sourceChain._raw._preloadKeys; {
  [key]: cql.toHex(sourceRaw[key])
  for key in std.objectFields(sourceRaw)
  if sourceRaw[key] != null
};

local typeNames = (import './typeNames.jsonnet')(sourceChain);

local
auraKeys = [
	sourceChain.AuraExt._key.Authorities,
	sourceChain.Aura._key.Authorities,
] + (if 'CollatorSelection' in sourceChain then [
	sourceChain.CollatorSelection._key.Candidates,
	sourceChain.CollatorSelection._key.Invulnerables,
] else []),

// Keys, which should be migrated from passed spec, rather than from forked chain
wantedKeys = [
	sourceChain.ParachainInfo._key.ParachainId,
	sourceChain.Sudo._key.Key,
	sourceChain.System.BlockHash._key['0'],
	// Always [69, 69, 69, ..., 69, 69, 69]
	sourceChain.System._key.ParentHash,
] + auraKeys,

// Keys to remove from original chain
unwantedPrefixes = [
	sourceChain.Aura._key.CurrentSlot,
	// Ensure there will be no panics caused by unexpected kept state
	sourceChain.ParachainSystem._key.ValidationData,
	sourceChain.ParachainSystem._key.RelayStateProof,
	sourceChain.ParachainSystem._key.HostConfiguration,
	sourceChain.ParachainSystem._key.LastRelayChainBlockNumber,
	sourceChain.ParachainSystem._key.LastDmqMqcHead,
	// Part of head
	sourceChain.System._key.BlockHash,
	sourceChain.System._key.Number,
	sourceChain.System._key.Digest,
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

local
	aliceAccount = sourceChain.System._encodeKey.Account(['0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d']),
	totalIssuance = sourceChain.Balances._encodeKey.TotalIssuance([]),
 	unique = cql.calc(["10", "18", "**"]),
 	Munique = cql.calc([unique, "10", "6", "**", "*"]),
;

outSpec {
	genesis+: {
		raw+: {
			top+: {
				[totalIssuance]: sourceChain._encode(typeNames.u128, cql.calc([
					Munique,
					if std.objectHas(super, totalIssuance) then sourceChain._decode(typeNames.u128, super[totalIssuance]) else '0',
					if std.objectHas(super, aliceAccount) then sourceChain._decode(typeNames.AccountInfo, super[aliceAccount]).data.free else '0',
					'-', '+',
				])),
				[aliceAccount]: sourceChain._encode(typeNames.AccountInfo, {
					nonce: 0,
					consumers: 3,
					providers: 1,
					sufficients: 0,
					data: {
						free: Munique,
						reserved: "0",
						misc_frozen: "0",
						fee_frozen: "0",
					},
				},)
			},
		},
	},
}
