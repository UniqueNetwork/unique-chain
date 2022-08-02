// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

describe.skip('app-promotions.stake extrinsic', () => {
  it('will change balance state to "locked", add it to "staked" map, and increase "totalStaked" amount', async () => {
    // arrange: Alice balance = 1000
    // act:     Alice calls appPromotion.stake(100)

    // assert:  Alice locked balance equal 100
    // assert:  Alice free balance closeTo 900
    // assert:  query appPromotion.staked(Alice) equal [100]
    // assert:  query appPromotion.totalStaked() increased by 100

    // act:     Alice extrinsic appPromotion.stake(200)
  
    // assert:  Alice locked balance equal 300
    // assert:  query appPromotion.staked(Alice) equal [100, 200]
    // assert:  query appPromotion.totalStaked() increased by 200
  });

  it('will throws if stake amount is more than total free balance', async () => {
    // arrange: Alice balance = 1000
    // assert:  Alice calls appPromotion.stake(1000) throws /// because Alice needs some fee

    // act:     Alice calls appPromotion.stake(700)
    // assert:  Alice calls appPromotion.stake(400) throws /// because Alice has ~300 free QTZ and 700 locked
  });

  it('for different accounts in one block is possible', async () => {
    // arrange: Alice, Bob, Charlie, Dave balance = 1000
    // arrange: Alice, Bob, Charlie, Dave calls appPromotion.stake(100) in the same time

    // assert:  query appPromotion.staked(Alice/Bob/Charlie/Dave) equal [100]
  });
});

describe.skip('unstake balance extrinsic', () => {
  it('will change balance state to "reserved", add it to "pendingUnstake" map, and subtract it from totalStaked', async () => {
    // arrange: Alice balance = 1000
    // arrange: Alice calls appPromotion.stake(Alice, 500)

    // act:     Alice calls appPromotion.unstake(300)
    // assert:  Alice reserved balance to equal 300
    // assert:  query appPromotion.staked(Alice) equal [200] /// 500 - 300
    // assert:  query appPromotion.pendingUnstake(Alice) to equal [300]
    // assert:  query appPromotion.totalStaked() decreased by 300
  });

  it('will remove from the "staked" map starting from the oldest entry', async () => {
    // arrange: Alice balance = 1000
    // arrange: Alice stakes 100
    // arrange: Alice stakes 200
    // arrange: Alice stakes 300

    // assert Alice stake is [100, 200, 300]


    // act:     Alice calls appPromotion.unstake(30)
    // assert:  query appPromotion.staked(Alice) to equal [70, 200, 300] /// Can unstake part of stake
    // assert:  query appPromotion.pendingUnstake(Alice) to equal [30]

    // act:     Alice calls appPromotion.unstake(170)
    // assert:  query appPromotion.staked(Alice) to equal [100, 300] /// Can unstake one stake totally and one more partialy
    // assert:  query appPromotion.pendingUnstake(Alice) to equal [30, 170]

    // act:     Alice calls appPromotion.unstake(400)
    // assert:  query appPromotion.staked(Alice) to equal [100, 300] /// Can totally unstake 2 stakes in one tx 
    // assert:  query appPromotion.pendingUnstake(Alice) to equal [30, 170, 400]
  });

  it('will return balance to "available" state after the period of unstaking is finished, and subtract it from "pendingUnstake"', async () => {
    // arrange: Alice balance = 1000
    // arrange: Alice stakes 100
    // act:     Alice calls appPromotion.unstake(30)
    // act:     Alice waits for pendingPeriod end (7 days for production but faster for tests)

    // assert:  Alice free balance closeTo ~1000 (minus fee)
    // assert:  query appPromotion.pendingUnstake(Alice) to equal []
  });

  it('will throws if unstake amount is more than "staked"', async () => {
    // arrange: Alice balance = 1000
    // arrange: Alice stakes 100

    // assert:  Alice calls appPromotion.unstake(200) throws
    // assert:  query appPromotion.staked(Alice) to equal [100] /// stake amount didnt change 100
  });

  it('for different accounts in one block is possible', async () => {
    // arrange: Alice, Bob, Charlie, Dave balance = 1000
    // arrange: Alice, Bob, Charlie, Dave stakes 100

    // act:     Alice, Bob, Charlie, Dave calls appPromotion.unstake(100)

    // assert:  query appPromotion.pendingUnstake(Alice/Bob,Charlie,Dave) to equal []
  });
});

describe.skip('Admin adress', () => {
  it('can be set by sudo only', async () => {
    // assert:  Sudo calls appPromotion.setAdminAddress(Alice) /// Sudo successfully sets Alice as admin
    // assert:  Bob calls appPromotion.setAdminAddress(Bob) throws /// Random account can not set admin
    // assert:  Alice calls appPromotion.setAdminAddress(Bob) throws /// Admin account can not set admin
  });

  it('can be any valid CrossAccountId', async () => {
    /// We are not going to set an eth address as a sponsor,
    /// but we do want to check, it doesn't break anything;

    // arrange: Charlie creates Punks
    // arrange: Sudo calls appPromotion.setAdminAddress(0x0...) success 
    // arrange: Sudo calls appPromotion.setAdminAddress(Alice) success 
    
    // assert:  Alice calls appPromotion.sponsorCollection(Punks.id) success
  });

  it('can be reassigned', async () => {
    // arrange: Charlie creates Punks
    // arrange: Sudo calls appPromotion.setAdminAddress(Alice)
    // act:     Sudo calls appPromotion.setAdminAddress(Bob)

    // assert:  Alice calls appPromotion.sponsorCollection(Punks.id) throws /// Alice can not set collection sponsor
    // assert:  Bob calls appPromotion.sponsorCollection(Punks.id) successful /// Bob can set collection sponsor

    // act:     Sudo calls appPromotion.setAdminAddress(null) successful /// Sudo can set null as a sponsor
    // assert:  Bob calls appPromotion.stopSponsoringCollection(Punks.id) throws /// Bob is no longer an admin  
  });
});


describe.skip('App-promotion collection sponsoring', () => {
  it('can not be set by non admin', async () => {
    // arrange: Charlie creates Punks
    // arrange: Sudo calls appPromotion.setAdminAddress(Alice)

    // assert:  Random calls appPromotion.sponsorCollection(Punks.id) throws /// Random account can not set sponsoring
    // assert:  Alice calls appPromotion.sponsorCollection(Punks.id) success /// Admin account can set sponsoring
  });

  it('will set pallet address as confirmed admin for collection without sponsor', async () => {
    // arrange: Charlie creates Punks

    // act:     Admin calls appPromotion.sponsorCollection(Punks.id)

    // assert:  query collectionById: Punks sponsoring is confirmed by PalleteAddress
  });

  it('will set pallet address as confirmed admin for collection with unconfirmed sponsor', async () => {
    // arrange: Charlie creates Punks
    // arrange: Charlie calls setCollectionSponsor(Punks.Id, Dave) /// Dave is unconfirmed sponsor

    // act:     Admin calls appPromotion.sponsorCollection(Punks.id)

    // assert:  query collectionById: Punks sponsoring is confirmed by PalleteAddress
  });

  it('will set pallet address as confirmed admin for collection with confirmed sponsor', async () => {
    // arrange: Charlie creates Punks
    // arrange: setCollectionSponsor(Punks.Id, Dave)
    // arrange: confirmSponsorship(Punks.Id, Dave) /// Dave is confirmed sponsor

    // act:     Admin calls appPromotion.sponsorCollection(Punks.id)

    // assert:  query collectionById: Punks sponsoring is confirmed by PalleteAddress
  });

  it('can be overwritten by collection owner', async () => {
    // arrange: Charlie creates Punks
    // arrange: appPromotion.sponsorCollection(Punks.Id)  /// Sponsor of Punks is pallete

    // act:     Charlie calls unique.setCollectionLimits(limits) /// Charlie as owner can successfully change limits
    // assert:  query collectionById(Punks.id) 1. sponsored by pallete, 2. limits has been changed

    // act:     Charlie calls setCollectionSponsor(Dave) /// Collection owner reasignes sponsoring
    // assert:  query collectionById: Punks sponsoring is unconfirmed by Dave
  });
  
  it('will keep collection limits set by the owner earlier', async () => {
    // arrange: const limits = {...all possible collection limits}
    // arrange: Charlie creates Punks
    // arrange: Charlie calls unique.setCollectionLimits(limits) /// Owner sets all possible limits

    // act:     Admin calls appPromotion.sponsorCollection(Punks.id)
    // assert:  query collectionById(Punks.id) returns limits 
  });
  
  it('will throw if collection doesn\'t exist', async () => {
    // assert:  Admin calls appPromotion.sponsorCollection(999999999999999) throw 
  });

  it('will throw if collection was burnt', async () => {
    // arrange: Charlie creates Punks
    // arrange: Charlie burns Punks

    // assert:  Admin calls appPromotion.sponsorCollection(Punks.id) throw 
  });
});

describe.skip('app-promotion stopSponsoringCollection', () => {
  it('can not be called by non-admin', async () => {
    // arrange: Alice creates Punks
    // arrange: appPromotion.sponsorCollection(Punks.Id) 

    // assert:  Random calls appPromotion.stopSponsoringCollection(Punks) throws
    // assert:  query collectionById(Punks.id): sponsoring confirmed by PalleteAddress
  });

  it('will set sponsoring as disabled', async () => {
    // arrange: Alice creates Punks
    // arrange: appPromotion.sponsorCollection(Punks.Id) 

    // act:     Admin calls appPromotion.stopSponsoringCollection(Punks)

    // assert:  query collectionById(Punks.id): sponsoring unconfirmed
  });

  it('will not affect collection which is not sponsored by pallete', async () => {
    // arrange: Alice creates Punks
    // arrange: Alice calls setCollectionSponsoring(Punks)
    // arrange: Alice calls confirmSponsorship(Punks)

    // act:     Admin calls appPromotion.stopSponsoringCollection(A)
    // assert:  query collectionById(Punks): Sponsoring: {Confirmed: Alice} /// Alice still collection owner
  });

  it('will throw if collection does not exist', async () => {
    // arrange: Alice creates Punks
    // arrange: Alice burns Punks

    // assert:  Admin calls appPromotion.stopSponsoringCollection(Punks.id) throws
    // assert:  Admin calls appPromotion.stopSponsoringCollection(999999999999999) throw 
  });
});

describe.skip('app-promotion contract sponsoring', () => {
  it('will set contract sponsoring mode and set palletes address as a sponsor', async () => {
    // arrange: Alice deploys Flipper
    
    // act:     Admin calls appPromotion.sponsorContract(Flipper.address)

    // assert:  contract.sponsoringMode = TODO
    // assert:  contract.sponsor to be PalleteAddress
  });

  it('will overwrite sponsoring mode and existed sponsor', async () => {
    // arrange: Alice deploys Flipper
    // arrange: Alice sets self sponsoring for Flipper

    // act:     Admin calls appPromotion.sponsorContract(Flipper.address)

    // assert:  contract.sponsoringMode = TODO
    // assert:  contract.sponsor to be PalleteAddress
  });

  it('can be overwritten by contract owner', async () => {
    // arrange: Alice deploys Flipper
    // arrange: Admin calls appPromotion.sponsorContract(Flipper.address)

    // act:     Alice sets self sponsoring for Flipper

    // assert:  contract.sponsoringMode = Self
    // assert:  contract.sponsor to be contract
  });

  it('can not be set by non admin', async () => {
    // arrange: Alice deploys Flipper
    // arrange: Alice sets self sponsoring for Flipper

    // assert:  Random calls appPromotion.sponsorContract(Flipper.address) throws
    // assert:  contract.sponsoringMode = Self
    // assert:  contract.sponsor to be contract
  });

  it('will return unused gas fee to app-promotion pallete', async () => {
    // arrange: Alice deploys Flipper
    // arrange: Admin calls appPromotion.sponsorContract(Flipper.address)

    // assert:  Bob calls Flipper - expect balances deposit event do not appears for Bob /// Unused gas fee returns to contract
    // assert:  Bobs balance the same
  });

  it('will failed for non contract address', async () => {
    // arrange: web3 creates new address - 0x0

    // assert: Admin calls appPromotion.sponsorContract(0x0) throws
    // assert: Admin calls appPromotion.sponsorContract(Substrate address) throws
  });

  it('will actually sponsor transactions', async () => {
    // TODO test it because this is a new way of contract sponsoring
  });
});

// STOP CONTRACT SPONSORING
describe.skip('app-promotion stopSponsoringContract', () => {
  it('will set contract sponsoring mode as disabled', async () => {
    // arrange: Alice deploys Flipper
    // arrange: Admin calls appPromotion.sponsorContract(Flipper.address)
    
    // act:     Admin calls appPromotion.stopSponsoringContract(Flipper.address)
    // assert:  contract sponsoring mode = TODO

    // act:     Bob calls Flipper

    // assert:  PalleteAddress balance did not change
    // assert:  Bobs balance less than before /// Bob payed some fee
  });

  it('can not be called by non-admin', async () => {
    // arrange: Alice deploys Flipper
    // arrange: Admin calls appPromotion.sponsorContract(Flipper.address)

    // assert:  Random calls appPromotion.stopSponsoringContract(Flipper.address) throws
    // assert:  contract sponsor is PallereAddress
  });

  it('will not affect a contract which is not sponsored by pallete', async () => {
    // arrange: Alice deploys Flipper
    // arrange: Alice sets self sponsoring for Flipper
    
    // act:     Admin calls appPromotion.stopSponsoringContract(Flipper.address) throws

    // assert:  contract.sponsoringMode = Self
    // assert:  contract.sponsor to be contract
  });

  it('will failed for non contract address', async () => {
    // arrange: web3 creates new address - 0x0

    // expect stopSponsoringContract(0x0) throws
  });
});

describe.skip('app-promotion rewards', () => {
  it('will start charging only after 24h', async () => {

  });

  it('will credit 0.05% for staking period', async () => {
    // arrange: bob.stake(10000);
    // arrange: bob.stake(20000);
    // arrange: waitForRewards();

    // assert:  bob.staked to equal [10005, 20010]
  });
  
  it('will be credited from treasury', async () => {
    // TODO
  });
  
  it('will not be credited for unstaked (reserved) balance', async () => {
    // arrange: bob.stake(10000);
    // arrange: bob.unstake(5000);
    // arrange: waitForRewards();

    // assert:  bob.staked to equal [5002.5] 
  });

  it('will not be credited for tokens reserved for non-staking reason', async() => {
    // arrange: bob balance = 20000
    // arrange: bob calls vesting.vestedTransfer(10000)
    // arrange: bob.stake(1000);
    // arrange: waitForRewards();

    // assert:  appPromotion.staked(bob) to equal [1000.5] 
  });

  it('will bring compound interest', async () => {
    // arrange: bob balance = 30000
    // arrange: bob.stake(10000);
    // arrange: bob.stake(10000);
    // arrange: waitForRewards();

    // assert:  bob.staked() equal [10005, 10005, 10005] /// 10_000 * 1.0005
    // act:     waitForRewards();

    // assert:  bob.staked() equal [10010.0025, 10010.0025, 10010.0025] /// 10_005 * 1.0005
    // act:     bob.unstake(10.0025)
    // assert:  bob.staked() equal [10000, 10010.0025, 10010.0025] /// 10_005 * 1.0005

    // act:     waitForRewards();
    // assert:  bob.staked() equal [10005, 10015,00750125, 10015,00750125] ///
  });
});
