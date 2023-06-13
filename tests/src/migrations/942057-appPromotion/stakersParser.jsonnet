function(chainUrl)

  local
    state = cql.chain(chainUrl).latest,
    locked_balances = state.Balances.Locks._preloadKeys,
    accountsRaw = state.System.Account._preloadKeys,
    stakers = state.AppPromotion.Staked._preloadKeys,
    unstakes = state.AppPromotion.PendingUnstake._preloadKeys,
    locks = [
      { [k]: std.filter(function(l) l.id == '0x6170707374616b65', locked_balances[k]) }
      for k in std.objectFields(locked_balances)
    ],
    unstakersData = [
      { [pair[0]]: { block: block, value: pair[1] } }

      for block in std.objectFields(unstakes)
      for pair in unstakes[block]
    ],
    non_empty_locks = std.prune(locks)
  ;

  std.map(function(a) {
    address: std.objectFields(a)[0],
    balance: a[std.objectFields(a)[0]][0].amount,
    account: accountsRaw[std.objectFields(a)[0]].data,
    locks: locked_balances[std.objectFields(a)[0]],
    stakes: if std.objectHas(stakers, std.objectFields(a)[0]) then stakers[std.objectFields(a)[0]] else null,
    unstakes: std.filterMap(function(b) std.objectHas(b, std.objectFields(a)[0]), function(c) std.objectValues(c)[0], unstakersData),
  }, non_empty_locks)
