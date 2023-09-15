import {ApiPromise, WsProvider} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import {ChainHelperBase, EthereumBalanceGroup, HelperGroup, SubstrateBalanceGroup, UniqueHelper} from './unique';
import {ILogger, TSigner, TSubstrateAccount} from './types';
import {AcalaAssetMetadata, DemocracyStandardAccountVote, IForeignAssetMetadata, MoonbeamAssetInfo} from './types.xcm';


export class XcmChainHelper extends ChainHelperBase {
  async connect(wsEndpoint: string, _listeners?: any): Promise<void> {
    const wsProvider = new WsProvider(wsEndpoint);
    this.api = new ApiPromise({
      provider: wsProvider,
    });
    await this.api.isReadyOrError;
    this.network = await UniqueHelper.detectNetwork(this.api);
  }
}

class AcalaAssetRegistryGroup extends HelperGroup<AcalaHelper> {
  async registerForeignAsset(signer: TSigner, destination: any, metadata: AcalaAssetMetadata) {
    await this.helper.executeExtrinsic(signer, 'api.tx.assetRegistry.registerForeignAsset', [destination, metadata], true);
  }
}

class MoonbeamAssetManagerGroup extends HelperGroup<MoonbeamHelper> {
  makeRegisterForeignAssetProposal(assetInfo: MoonbeamAssetInfo) {
    const apiPrefix = 'api.tx.assetManager.';

    const registerTx = this.helper.constructApiCall(
      apiPrefix + 'registerForeignAsset',
      [assetInfo.location, assetInfo.metadata, assetInfo.existentialDeposit, assetInfo.isSufficient],
    );

    const setUnitsTx = this.helper.constructApiCall(
      apiPrefix + 'setAssetUnitsPerSecond',
      [assetInfo.location, assetInfo.unitsPerSecond, assetInfo.numAssetsWeightHint],
    );

    const batchCall = this.helper.getApi().tx.utility.batchAll([registerTx, setUnitsTx]);
    const encodedProposal = batchCall?.method.toHex() || '';
    return encodedProposal;
  }

  async assetTypeId(location: any) {
    return await this.helper.callRpc('api.query.assetManager.assetTypeId', [location]);
  }
}

class MoonbeamDemocracyGroup extends HelperGroup<MoonbeamHelper> {
  notePreimagePallet: string;

  constructor(helper: MoonbeamHelper, options: { [key: string]: any } = {}) {
    super(helper);
    this.notePreimagePallet = options.notePreimagePallet;
  }

  async notePreimage(signer: TSigner, encodedProposal: string) {
    await this.helper.executeExtrinsic(signer, `api.tx.${this.notePreimagePallet}.notePreimage`, [encodedProposal], true);
  }

  externalProposeMajority(proposal: any) {
    return this.helper.constructApiCall('api.tx.democracy.externalProposeMajority', [proposal]);
  }

  fastTrack(proposalHash: string, votingPeriod: number, delayPeriod: number) {
    return this.helper.constructApiCall('api.tx.democracy.fastTrack', [proposalHash, votingPeriod, delayPeriod]);
  }

  async referendumVote(signer: TSigner, referendumIndex: number, accountVote: DemocracyStandardAccountVote) {
    await this.helper.executeExtrinsic(signer, 'api.tx.democracy.vote', [referendumIndex, {Standard: accountVote}], true);
  }
}

class MoonbeamCollectiveGroup extends HelperGroup<MoonbeamHelper> {
  collective: string;

  constructor(helper: MoonbeamHelper, collective: string) {
    super(helper);

    this.collective = collective;
  }

  async propose(signer: TSigner, threshold: number, proposalHash: string, lengthBound: number) {
    await this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.propose`, [threshold, proposalHash, lengthBound], true);
  }

  async vote(signer: TSigner, proposalHash: string, proposalIndex: number, approve: boolean) {
    await this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.vote`, [proposalHash, proposalIndex, approve], true);
  }

  async close(signer: TSigner, proposalHash: string, proposalIndex: number, weightBound: any, lengthBound: number) {
    await this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.close`, [proposalHash, proposalIndex, weightBound, lengthBound], true);
  }

  async proposalCount() {
    return Number(await this.helper.callRpc(`api.query.${this.collective}.proposalCount`, []));
  }
}

class PolkadexXcmHelperGroup<T extends ChainHelperBase> extends HelperGroup<T> {
  async whitelistToken(signer: TSigner, assetId: any) {
    await this.helper.executeExtrinsic(signer, 'api.tx.xcmHelper.whitelistToken', [assetId], true);
  }
}

export class ForeignAssetsGroup extends HelperGroup<UniqueHelper> {
  async register(signer: TSigner, ownerAddress: TSubstrateAccount, location: any, metadata: IForeignAssetMetadata) {
    await this.helper.executeExtrinsic(
      signer,
      'api.tx.foreignAssets.registerForeignAsset',
      [ownerAddress, location, metadata],
      true,
    );
  }

  async update(signer: TSigner, foreignAssetId: number, location: any, metadata: IForeignAssetMetadata) {
    await this.helper.executeExtrinsic(
      signer,
      'api.tx.foreignAssets.updateForeignAsset',
      [foreignAssetId, location, metadata],
      true,
    );
  }
}

export class XcmGroup<T extends ChainHelperBase> extends HelperGroup<T> {
  palletName: string;

  constructor(helper: T, palletName: string) {
    super(helper);

    this.palletName = palletName;
  }

  async limitedReserveTransferAssets(signer: TSigner, destination: any, beneficiary: any, assets: any, feeAssetItem: number, weightLimit: any) {
    await this.helper.executeExtrinsic(signer, `api.tx.${this.palletName}.limitedReserveTransferAssets`, [destination, beneficiary, assets, feeAssetItem, weightLimit], true);
  }

  async setSafeXcmVersion(signer: TSigner, version: number) {
    await this.helper.executeExtrinsic(signer, `api.tx.${this.palletName}.forceDefaultXcmVersion`, [version], true);
  }

  async teleportAssets(signer: TSigner, destination: any, beneficiary: any, assets: any, feeAssetItem: number) {
    await this.helper.executeExtrinsic(signer, `api.tx.${this.palletName}.teleportAssets`, [destination, beneficiary, assets, feeAssetItem], true);
  }

  async teleportNativeAsset(signer: TSigner, destinationParaId: number, targetAccount: Uint8Array, amount: bigint, xcmVersion = 3) {
    const destinationContent = {
      parents: 0,
      interior: {
        X1: {
          Parachain: destinationParaId,
        },
      },
    };

    const beneficiaryContent = {
      parents: 0,
      interior: {
        X1: {
          AccountId32: {
            network: 'Any',
            id: targetAccount,
          },
        },
      },
    };

    const assetsContent = [
      {
        id: {
          Concrete: {
            parents: 0,
            interior: 'Here',
          },
        },
        fun: {
          Fungible: amount,
        },
      },
    ];

    let destination;
    let beneficiary;
    let assets;

    if(xcmVersion == 2) {
      destination = {V1: destinationContent};
      beneficiary = {V1: beneficiaryContent};
      assets = {V1: assetsContent};

    } else if(xcmVersion == 3) {
      destination = {V2: destinationContent};
      beneficiary = {V2: beneficiaryContent};
      assets = {V2: assetsContent};

    } else {
      throw Error('Unknown XCM version: ' + xcmVersion);
    }

    const feeAssetItem = 0;

    await this.teleportAssets(signer, destination, beneficiary, assets, feeAssetItem);
  }

  async send(signer: IKeyringPair, destination: any, message: any) {
    await this.helper.executeExtrinsic(
      signer,
      `api.tx.${this.palletName}.send`,
      [
        destination,
        message,
      ],
      true,
    );
  }
}

export class XTokensGroup<T extends ChainHelperBase> extends HelperGroup<T> {
  async transfer(signer: TSigner, currencyId: any, amount: bigint, destination: any, destWeight: any) {
    await this.helper.executeExtrinsic(signer, 'api.tx.xTokens.transfer', [currencyId, amount, destination, destWeight], true);
  }

  async transferMultiasset(signer: TSigner, asset: any, destination: any, destWeight: any) {
    await this.helper.executeExtrinsic(signer, 'api.tx.xTokens.transferMultiasset', [asset, destination, destWeight], true);
  }

  async transferMulticurrencies(signer: TSigner, currencies: any[], feeItem: number, destLocation: any, destWeight: any) {
    await this.helper.executeExtrinsic(signer, 'api.tx.xTokens.transferMulticurrencies', [currencies, feeItem, destLocation, destWeight], true);
  }
}



export class TokensGroup<T extends ChainHelperBase> extends HelperGroup<T> {
  async accounts(address: string, currencyId: any) {
    const {free} = (await this.helper.callRpc('api.query.tokens.accounts', [address, currencyId])).toJSON() as any;
    return BigInt(free);
  }
}

export class AssetsGroup<T extends ChainHelperBase> extends HelperGroup<T> {
  async create(signer: TSigner, assetId: number, admin: string, minimalBalance: bigint) {
    await this.helper.executeExtrinsic(signer, 'api.tx.assets.create', [assetId, admin, minimalBalance], true);
  }

  async setMetadata(signer: TSigner, assetId: number, name: string, symbol: string, decimals: number) {
    await this.helper.executeExtrinsic(signer, 'api.tx.assets.setMetadata', [assetId, name, symbol, decimals], true);
  }

  async mint(signer: TSigner, assetId: number, beneficiary: string, amount: bigint) {
    await this.helper.executeExtrinsic(signer, 'api.tx.assets.mint', [assetId, beneficiary, amount], true);
  }

  async account(assetId: string | number, address: string) {
    const accountAsset = (
      await this.helper.callRpc('api.query.assets.account', [assetId, address])
    ).toJSON()! as any;

    if(accountAsset !== null) {
      return BigInt(accountAsset['balance']);
    } else {
      return null;
    }
  }
}

export class RelayHelper extends XcmChainHelper {
  balance: SubstrateBalanceGroup<RelayHelper>;
  xcm: XcmGroup<RelayHelper>;

  constructor(logger?: ILogger, options: { [key: string]: any } = {}) {
    super(logger, options.helperBase ?? RelayHelper);

    this.balance = new SubstrateBalanceGroup(this);
    this.xcm = new XcmGroup(this, 'xcmPallet');
  }
}

export class WestmintHelper extends XcmChainHelper {
  balance: SubstrateBalanceGroup<WestmintHelper>;
  xcm: XcmGroup<WestmintHelper>;
  assets: AssetsGroup<WestmintHelper>;
  xTokens: XTokensGroup<WestmintHelper>;

  constructor(logger?: ILogger, options: { [key: string]: any } = {}) {
    super(logger, options.helperBase ?? WestmintHelper);

    this.balance = new SubstrateBalanceGroup(this);
    this.xcm = new XcmGroup(this, 'polkadotXcm');
    this.assets = new AssetsGroup(this);
    this.xTokens = new XTokensGroup(this);
  }
}

export class MoonbeamHelper extends XcmChainHelper {
  balance: EthereumBalanceGroup<MoonbeamHelper>;
  assetManager: MoonbeamAssetManagerGroup;
  assets: AssetsGroup<MoonbeamHelper>;
  xTokens: XTokensGroup<MoonbeamHelper>;
  democracy: MoonbeamDemocracyGroup;
  collective: {
    council: MoonbeamCollectiveGroup,
    techCommittee: MoonbeamCollectiveGroup,
  };

  constructor(logger?: ILogger, options: { [key: string]: any } = {}) {
    super(logger, options.helperBase ?? MoonbeamHelper);

    this.balance = new EthereumBalanceGroup(this);
    this.assetManager = new MoonbeamAssetManagerGroup(this);
    this.assets = new AssetsGroup(this);
    this.xTokens = new XTokensGroup(this);
    this.democracy = new MoonbeamDemocracyGroup(this, options);
    this.collective = {
      council: new MoonbeamCollectiveGroup(this, 'councilCollective'),
      techCommittee: new MoonbeamCollectiveGroup(this, 'techCommitteeCollective'),
    };
  }
}

export class AstarHelper extends XcmChainHelper {
  balance: SubstrateBalanceGroup<AstarHelper>;
  assets: AssetsGroup<AstarHelper>;
  xcm: XcmGroup<AstarHelper>;

  constructor(logger?: ILogger, options: { [key: string]: any } = {}) {
    super(logger, options.helperBase ?? AstarHelper);

    this.balance = new SubstrateBalanceGroup(this);
    this.assets = new AssetsGroup(this);
    this.xcm = new XcmGroup(this, 'polkadotXcm');
  }
}

export class AcalaHelper extends XcmChainHelper {
  balance: SubstrateBalanceGroup<AcalaHelper>;
  assetRegistry: AcalaAssetRegistryGroup;
  xTokens: XTokensGroup<AcalaHelper>;
  tokens: TokensGroup<AcalaHelper>;
  xcm: XcmGroup<AcalaHelper>;

  constructor(logger?: ILogger, options: { [key: string]: any } = {}) {
    super(logger, options.helperBase ?? AcalaHelper);

    this.balance = new SubstrateBalanceGroup(this);
    this.assetRegistry = new AcalaAssetRegistryGroup(this);
    this.xTokens = new XTokensGroup(this);
    this.tokens = new TokensGroup(this);
    this.xcm = new XcmGroup(this, 'polkadotXcm');
  }
}

export class PolkadexHelper extends XcmChainHelper {
  assets: AssetsGroup<PolkadexHelper>;
  balance: SubstrateBalanceGroup<PolkadexHelper>;
  xTokens: XTokensGroup<PolkadexHelper>;
  xcm: XcmGroup<PolkadexHelper>;
  xcmHelper: PolkadexXcmHelperGroup<PolkadexHelper>;

  constructor(logger?: ILogger, options: { [key: string]: any } = {}) {
    super(logger, options.helperBase ?? PolkadexHelper);

    this.assets = new AssetsGroup(this);
    this.balance = new SubstrateBalanceGroup(this);
    this.xTokens = new XTokensGroup(this);
    this.xcm = new XcmGroup(this, 'polkadotXcm');
    this.xcmHelper = new PolkadexXcmHelperGroup(this);
  }
}

