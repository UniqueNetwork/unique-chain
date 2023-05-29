function(chainUrl)

  local
    state = cql.chain(chainUrl).latest,
    locked_balances = state.Balances.Locks._preloadKeys,
    locks = [
      { [k]: std.filter(function(l) l.id == '0x6170707374616b65', locked_balances[k]) }
      for k in std.objectFields(locked_balances)
    ],
    non_empty_locks = std.prune(locks)
  ;

  std.map(function(a) {address: std.objectFields(a)[0], balance: a[std.objectFields(a)[0]][0].amount}, non_empty_locks)