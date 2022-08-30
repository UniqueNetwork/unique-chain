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
