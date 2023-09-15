import {blake2AsHex} from '@polkadot/util-crypto';
import {usingPlaygrounds} from '../util';
import {UniqueHelper} from '../util/playgrounds/unique';
import {PalletIdentityIdentityInfo} from '../interfaces/types-lookup';

async function govInit(url: string) {
    await usingPlaygrounds(async (helper) => {
        const runtimeVersion = await helper.callRpc('api.rpc.state.getRuntimeVersion', []);
        const network = runtimeVersion.specName;

        console.log(`Preparing Gov Init steps for ${network.toUpperCase()}`);

        const govAccounts = (await import(
            `./${network}-gov-accounts.json`,
            { assert: { type: "json" } }
        )).default;

        printCall(
            url,
            "[Step 1] Sudo call",
            sudoCall(helper, govAccounts.counselors),
        );

        printCall(
            url,
            "[Step 2] Council Prime initializes the Tech Comm",
            initTechComm(helper, govAccounts.techcomms),
        );

        printCall(
            url,
            "[Step 3] Register the Tech Comm Prime as Registrar",
            setupTechCommPrimeAsRegistrar(helper, govAccounts.techcomms.prime.address),
        )

        printCall(
            url,
            "[Step 4] Tech Comm inserts identities",
            insertIdentities(helper, govAccounts),
        );

        printCall(
            url,
            "[Step 5] Tech Comm disables the maintenance",
            disableMaintenance(helper),
        );

        printCall(
            url,
            "[Step 6] Council Prime initiates a referendum to add the stuff",
            initStuff(helper, govAccounts),
        );

        printCall(
            url,
            "Misc: sponsor gov accounts",
            sponsorGovAccounts(helper, govAccounts),
        );
    }, url);
}

function printCall(url: string, title: string, call: any) {
    const encodedCall = call.method.toHex();
    console.log(`${title}\n\t- https://polkadot.js.org/apps/?rpc=${url}#/extrinsics/decode/${encodedCall}`);
    console.log();
}

function promoteFellow(helper: UniqueHelper, fellow: any, promotionsNum: number) {
    return new Array(promotionsNum).fill(helper.fellowship.collective.promoteCall(fellow.address));
}

function promoteFellows(helper: UniqueHelper, fellows: any[], promotionsNum: number) {
    return fellows.map(fellow => promoteFellow(helper, fellow, promotionsNum)).flat();
}

function sudoCall(helper: UniqueHelper, counselors: any) {
    return helper.constructApiCall('api.tx.sudo.sudo', [
        helper.utility.batchAllCall([
            helper.council.membership.addMemberCall(counselors.prime.address),
            helper.council.membership.setPrimeCall(counselors.prime.address),
        ])
    ]);
}

function addMemberCalls(helper: UniqueHelper, pallet: string, members: any[]) {
    return members.map((member: any) => {
        return helper.constructApiCall(`api.tx.${pallet}.addMember`, [member.address]);
    });
}

function initTechComm(helper: UniqueHelper, techcomms: any) {
    const councilProposalThreshold = 1;

    const proposal = helper.utility.batchAllCall([
        ...addMemberCalls(helper, 'technicalCommitteeMembership', [techcomms.prime, ...techcomms.rest]),
        helper.technicalCommittee.membership.setPrimeCall(techcomms.prime.address),
    ]);

    return helper.constructApiCall(
        'api.tx.council.propose', [
            councilProposalThreshold,
            proposal,
            proposal.encodedLength,
        ]
    );
}

function disableMaintenance(helper: UniqueHelper) {
    const proposal = helper.constructApiCall('api.tx.maintenance.disable', []);

    return helper.constructApiCall('api.tx.technicalCommittee.execute', [
        proposal,
        proposal.encodedLength,
    ]);
}

function setupTechCommPrimeAsRegistrar(helper: UniqueHelper, techcommPrime: string) {
    const proposal = helper.constructApiCall('api.tx.identity.addRegistrar', [techcommPrime]);

    return helper.constructApiCall('api.tx.technicalCommittee.execute', [
        proposal,
        proposal.encodedLength
    ]);
}

function insertIdentities(helper: UniqueHelper, govAccounts: any) {
    const identityOf = (member: any) => [
        member.address,
        {
            deposit: 0n,
            judgements: [
                [0, 'KnownGood']
            ],
            info: {
                display: {
                    raw: member.identity.display
                }
            }
        }
    ];

    const identitiesOf = (group: any[]) => group.map(identityOf);

    const proposal = helper.constructApiCall('api.tx.identity.forceInsertIdentities', [[
        identityOf(govAccounts.counselors.prime),
        ...identitiesOf(govAccounts.counselors.rest),
        identityOf(govAccounts.techcomms.prime),
        ...identitiesOf(govAccounts.techcomms.rest),
        ...identitiesOf(govAccounts.fellowCoreDevs),
    ]]);

    return helper.constructApiCall('api.tx.technicalCommittee.execute', [
        proposal,
        proposal.encodedLength
    ]);
}

function initStuff(helper: UniqueHelper, govAccounts: any) {
    const referendumProposal = helper.utility.batchAllCall([
        ...addMemberCalls(helper, 'councilMembership', govAccounts.counselors.rest),

        ...addMemberCalls(helper, 'fellowshipCollective', govAccounts.counselors.rest),
        ...addMemberCalls(helper, 'fellowshipCollective', [
            govAccounts.techcomms.prime,
            ...govAccounts.techcomms.rest,
        ]),
        ...addMemberCalls(helper, 'fellowshipCollective', govAccounts.fellowCoreDevs),

        ...addMemberCalls(helper, 'fellowshipCollective', [govAccounts.counselors.prime]),
        ...promoteFellow(helper, govAccounts.counselors.prime, 7),

        ...promoteFellows(helper, govAccounts.counselors.rest, 6),
        ...promoteFellows(helper, [govAccounts.techcomms.prime, ...govAccounts.techcomms.rest], 6),
        ...promoteFellows(helper, govAccounts.fellowCoreDevs, 6),
    ]);

    const encodedProposal = referendumProposal.method.toHex();

    const proposalHash = blake2AsHex(encodedProposal, 256);

    const councilProposalThreshold = 1;

    const councilProposal = helper.constructApiCall('api.tx.democracy.externalProposeDefault', [{
        Legacy: proposalHash
    }]);

    return helper.utility.batchAllCall([
        helper.constructApiCall('api.tx.preimage.notePreimage', [encodedProposal]),
        helper.constructApiCall('api.tx.council.propose', [
            councilProposalThreshold,
            councilProposal,
            councilProposal.encodedLength,
        ])
    ]);
}

function sponsorGovAccounts(helper: UniqueHelper, govAccounts: any) {
    const transferCalls = (group: any[], balance: bigint = 1000n * (10n ** 18n)) => {
        return group.map(account => helper.constructApiCall('api.tx.balances.transfer', [account.address, balance]));
    };

    return helper.utility.batchAllCall([
        ...transferCalls([govAccounts.counselors.prime], 10_000n * (10n ** 18n)),
        ...transferCalls(govAccounts.counselors.rest),
        ...transferCalls([govAccounts.techcomms.prime, ...govAccounts.techcomms.rest]),
        ...transferCalls(govAccounts.fellowCoreDevs),
    ]);
}

await govInit(process.argv[2]);
