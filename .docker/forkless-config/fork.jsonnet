// Get live chain data on the URL provided with `forkFrom`, and 
// merge the necessary data into chain spec `rawSpec` to launch a new chain with.
// 
// Usage: chainql --tla-code=rawSpec="import 'parachain-spec-raw.json'" --tla-str=forkFrom="wss://some-parachain.node:443" fork.jsonnet > modified-spec-raw.json

function(rawSpec, forkFrom)
// Get data from the live chain
local sourceChain = cql.chain(forkFrom).latest;

// Convert all keys to their hex format unless they do not exist
local raw = local sourceRaw = sourceChain._raw._preloadKeys; {
  [key]: cql.toHex(sourceRaw[key])
  for key in std.objectFields(sourceRaw)
  if sourceRaw[key] != null
};

// Get normalized type names used on the chain
local typeNames = (import './typeNames.jsonnet')(sourceChain);

local
auraKeys = [
	// AuraExt.Authorities, we don't have aura pallet enabled for some reason, to refer using cql api
	'0x3c311d57d4daf52904616cf69648081e5e0621c4869aa60c02be9adcc98a0d1d',
	// Aura.Authorities
	'0x57f8dc2f5ab09467896f47300f0424385e0621c4869aa60c02be9adcc98a0d1d',
],

// Keys, which should be migrated from passed spec, rather than from forked chain
wantedKeys = [
	sourceChain.ParachainInfo._key.ParachainId,
	sourceChain.Sudo._key.Key,
	sourceChain.System.BlockHash._key['0'],
	sourceChain.System._key.ParentHash,
] + auraKeys,

// Keys to remove from original chain
unwantedPrefixes = [
	// Aura.CurrentSlot
	'0x57f8dc2f5ab09467896f47300f04243806155b3cd9a8c9e5e9a23fd5dc13a5ed',
	// Ensure there will be no panics caused by unexpected kept state
	sourceChain.ParachainSystem._key.ValidationData,
	sourceChain.ParachainSystem._key.RelayStateProof,
	sourceChain.ParachainSystem._key.HostConfiguration,
	sourceChain.ParachainSystem._key.LastDmqMqcHead,
	// Part of head
	sourceChain.System._key.BlockHash,
	sourceChain.System._key.Number,
	sourceChain.System._key.Digest,
] + auraKeys,

// Filter elements with unwanted keys
cleanupRaw(raw) = {
	[key]: raw[key]
	for key in std.objectFields(raw)
	if std.all(std.map(function(prefix) !std.startsWith(key, prefix), unwantedPrefixes))
};

// Merge data from the forked chain and the chain spec, cleaning up unwanted keys from the chain and adding wanted keys from the chain spec
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
				// Calculate total issuance (previous total issuance - Alice's funds + 1 Munique)
				[totalIssuance]: cql.calc([
					Munique,
					if std.objectHas(super, totalIssuance) then sourceChain._decode(typeNames.u128, super[totalIssuance]) else '0',
					if std.objectHas(super, aliceAccount) then sourceChain._decode(typeNames.AccountInfo, super[aliceAccount]).data.free else '0',
					'-', '+',
				]),
				// Encode Alice's account with new balance
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
