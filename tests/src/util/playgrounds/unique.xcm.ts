
import {ApiPromise, WsProvider} from '@polkadot/api';
import {AssetsGroup, ChainHelperBase, EthereumBalanceGroup, HelperGroup, SubstrateBalanceGroup, TokensGroup, UniqueHelper, XTokensGroup, XcmGroup} from './unique';
import {ILogger,  TSigner} from './types';
import {SudoHelper} from './unique.dev';
import {AcalaAssetMetadata, DemocracyStandardAccountVote, MoonbeamAssetInfo} from './types.xcm';

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

