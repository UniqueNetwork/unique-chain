// Get Unique Network's non-fungible, refungible, and fungible token counts from a live chain specified by the `chainUrl` parameter.
// 
// ### Args
// - `chainUrl`: the URL of the chain to pull data from.
//
// ### Usage
// `chainql -S --tla-str=chainUrl=wss://eu-ws-quartz.unique.network:9944 uniqueTokenCount.jsonnet`

function(chainUrl)

local state = cql.chain(chainUrl).latest;

local
	// Load and cache all the keys pointing to the collections in the chain's storage
	collections = state.Common.CollectionById._preloadKeys,
	// Filter collections corresponding to a specific type (NFT, Fungible, ReFungible)
	collectionsByType(type) = std.filter(function(c) c.mode == type || std.isObject(c.mode) && std.objectHas(c.mode, type), std.objectValues(collections)),
;

local data = {
	nft: {
		// Iterate over and count the tokens minted and burnt
		minted: std.foldr(function(a, b) a + b, std.objectValues(state.Nonfungible.TokensMinted._preloadKeys), 0),
		burnt: std.foldr(function(a, b) a + b, std.objectValues(state.Nonfungible.TokensBurnt._preloadKeys), 0),
		alive: self.minted - self.burnt,
		_collections:: collectionsByType('NFT'),
		collectionCount: std.length(self._collections),
	},
	refungible: {
		// Iterate over and count the tokens minted and burnt
		minted: std.foldr(function(a, b) a + b, std.objectValues(state.Refungible.TokensMinted._preloadKeys), 0),
		burnt: std.foldr(function(a, b) a + b, std.objectValues(state.Refungible.TokensBurnt._preloadKeys), 0),
		alive: self.minted - self.burnt,
		_collections:: collectionsByType('ReFungible'),
		collectionCount: std.length(self._collections),
	},
	fungible: {
		// Count the variety of different Fungible tokens created on the chain (represented as collections)
		_collections:: collectionsByType('Fungible'),
		collectionCount: std.length(self._collections),
	},
};

// Return a formatted string with the resulting data
std.join('\n', [
	'# HELP tokens_total The total number of existing tokens',
	'# TYPE tokens_total counter',
	'tokens_total{type="NFT"} ' + data.nft.alive,
	'tokens_total{type="ReFungible"} ' + data.refungible.alive,
	'',
	'# HELP collections_total The total number of existing collections',
	'# TYPE collections_total counter',
	'collections_total{type="Fungible"} ' + data.fungible.collectionCount,
	'collections_total{type="NFT"} ' + data.nft.collectionCount,
	'collections_total{type="Refungible"} ' + data.refungible.collectionCount,
])