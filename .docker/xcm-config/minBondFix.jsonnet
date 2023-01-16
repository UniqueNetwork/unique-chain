// Add genesis data with increased candidacy bonds to some chain spec JSON.
// 
// Usage: `chainql --tla-code=spec="import 'moonbeam.json'" minBondFix.jsonnet > moonbeam-modified.json`

function(spec)
spec {
	genesis+: {
		runtime+: {
			parachainStaking+: {
				candidates: std.map(function(candidate) [candidate[0], candidate[1] * 1000], super.candidates)
			},
		},
	},
}
