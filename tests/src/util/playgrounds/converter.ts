import {AugmentedRpc} from '@polkadot/rpc-core/types';
import {BTreeMap, BTreeSet, Bytes, Compact, Enum, Null, Option, Struct, Text, Type, U256, U8aFixed, Vec, bool, u128, u16, u32, u64, u8, Raw} from '@polkadot/types-codec';
import {AnyTuple, CallBase, Codec, ICompact, INumber, ITuple} from '@polkadot/types-codec/types';
import {AccountId32, Address, Balance, Call, ConsensusEngineId, H160, H256, H512} from '@polkadot/types/interfaces/runtime';
import {ExtrinsicV4, EcdsaSignature, Ed25519Signature, FunctionMetadataLatest, Sr25519Signature} from '@polkadot/types/interfaces';
import {Observable} from '@polkadot/types/types';
import {GenericExtrinsic, GenericExtrinsicEra, GenericImmortalEra} from '@polkadot/types';
import {FrameSystemAccountInfo, PolkadotPrimitivesV4PersistedValidationData, PalletBalancesBalanceLock, PalletForeignAssetsModuleAssetMetadata, OrmlVestingVestingSchedule, PalletPreimageRequestStatus, OrmlTokensAccountData, PalletRankedCollectiveMemberRecord, PalletReferendaReferendumInfo, FrameSupportPreimagesBounded, PalletDemocracyReferendumInfo, PalletDemocracyVoteThreshold, PalletIdentityRegistration, UpDataStructsPropertiesMapPropertyPermission, UpDataStructsSponsorshipStateBasicCrossAccountIdRepr, PalletBalancesIdAmount} from '@unique-nft/opal-testnet-types/types';

export type UniqueRpcResult<T> = T extends AugmentedRpc<(...args: any) => Observable<infer R>> ? Converted<R> : never;
export type UniqueQueryResult<T> = Converted<T>;

export type Converted<T> = T extends Vec<infer R> ? Converted<R>[]
  : T extends Option<infer R> ? Converted<R> | null
  : T extends Struct ? ConvertedStruct<T>
  : T extends BTreeMap<infer K, infer V> ? Map<Converted<K>, Converted<V>>
  : T extends BTreeSet<infer V> ? V[]
  : T extends ConsensusEngineId ? ConvertedConsensusEngineId<T>
  : T extends bool ? boolean
  : T extends string ? string
  : T extends number ? number
  : T extends boolean ? boolean
  : T extends u128 ? bigint
  : T extends U256 ? bigint
  : T extends u16 ? number
  : T extends u32 ? number
  : T extends u64 ? number
  : T extends u8 ? number
  : T extends Type ? string
  : T extends H160 ? string
  : T extends H256 ? string
  : T extends H512 ? string
  : T extends U8aFixed ? string
  : T extends Bytes ? string
  : T extends AccountId32 ? string
  : T extends Text ? string
  : T extends Null ? null
  : T extends ITuple<infer R> ? ConvertedTuple<R>
  : T extends AnyTuple ? any[]
  : T extends Enum ? ConvertedEnum<T>
  : T extends Compact<infer R> ? Converted<R>
  : T extends ICompact<infer R> ? Converted<R>
  : T extends INumber ? bigint
  : T extends GenericExtrinsic ? ConvertedExtrinsic<T>
  : T extends CallBase<any> ? ConvertedCall<T>
  : T extends Balance ? bigint
  : T extends GenericImmortalEra ? string
  : T extends Codec ? string
  : never;

type ConvertedTuple<R> = R extends [infer H, ...infer T] ? T extends [] ? [Converted<H>] : [Converted<H>, ...ConvertedTuple<T>] : never;

type FieldsToOmit = 'meta' | 'keys' | 'toString' | 'forEach' | 'registry' | 'entries' | 'values' | 'set' | 'createdAtHash' |
  'initialU8aLength' | 'isStorageFallback' | 'defKeys' |  'isEmpty' | 'size' | 'encodedLength' | 'hash' | 'eq' | 'inspect' |
  'toHex' | 'toHuman' | 'has' | 'toJSON' | 'toPrimitive' |  'toRawType' | 'toU8a' | 'Type' | 'get' | 'getAtIndex' | 'getT' |
  'toArray' | 'clear' | 'delete' | symbol;

type IfEquals<X, Y, A=X, B=never> =
  (<T> () => T extends X ? 1 : 2) extends
  (<T> () => T extends Y ? 1 : 2) ? A : B;

type ReadonlyKeys<T> = {
  [P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, never, P>
}[keyof T];

type OmitStructFields<T> = T extends Struct ? Omit<T, FieldsToOmit> : never;

type ConvertedStruct<T> = T extends Struct ? { [K in keyof OmitStructFields<T>]: OmitStructFields<T>[K]  extends infer U ? Converted<U> : never } : never;
type ConvertedExtrinsic<T> =
  T extends GenericExtrinsic<infer A> ?
  {
    args: Converted<A>,
    callIndex: Uint8Array,
    data: Uint8Array,
    era: Converted<GenericExtrinsicEra>,
    encodedLength: number,
    isSigned: boolean,
    length: number,
    meta: Converted<FunctionMetadataLatest>,
    method: Converted<CallBase<A>>,
    nonce: Converted<ICompact<INumber>>,
    signature: Converted<EcdsaSignature | Ed25519Signature | Sr25519Signature>,
    signer: Converted<Address>,
    tip: Converted<ICompact<INumber>>,
    type: number,
    inner: Converted<ExtrinsicV4>,
    version: number,
  } : never;
type ConvertedCall<T> = T extends CallBase<any> ? { readonly [K in keyof Pick<T, ReadonlyKeys<T>>]: T[K]  extends infer U ? Converted<U> : never } : never;
type ConvertedConsensusEngineId<T> =
  T extends ConsensusEngineId  ?
  {
    isAura: boolean,
    isBabe: boolean,
    isGrandpa: boolean,
    isPow: boolean,
    isNimbus: boolean,
  } : never;

type ExtractTypesFromEnum<T> = T extends Enum ? T['type'] : never;
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
type LastOf<T> = UnionToIntersection<T extends any ? () => T : never> extends () => (infer R) ? R extends string? R : never : never;
type ConvertedEnumVariantWithValue<T extends Enum, L extends T['type']> = {
  [K in keyof T as K extends `as${infer U}` ? (U extends L ? U : never) : never]: Converted<T[K]>;
};
type ConvertedEnumVariant<T extends Enum, L extends T['type'], V = ConvertedEnumVariantWithValue<T, L>> = keyof V extends never ? L : V;
type ConvertedEnum<T extends Enum, R = ExtractTypesFromEnum<T>, L = LastOf<R>> = [R] extends [never] ? never : ConvertedEnumVariant<T, LastOf<R>> | ConvertedEnum<T, Exclude<R, L>>;

function isBool(value: Codec): value is bool {
  return value.toRawType() == 'bool';
}

function isOption(value: Codec): value is Option<any> {
  return value.toRawType().startsWith('Option<');
}

function isVec(value: Codec): value is Vec<any> {
  return value.toRawType().startsWith('Vec<');
}

function isStruct(value: Codec): value is Struct {
  return ('getT' in value) && ('Type' in value);
}

function isBytes(value: Codec): value is Bytes {
  return value.toRawType() == 'Bytes';
}

function isU128(value: Codec): value is u128 {
  return value.toRawType() == 'u128';
}

function isU256(value: Codec): value is U256 {
  return value.toRawType() == 'u256';
}

function isU16(value: Codec): value is u16 {
  return value.toRawType() == 'u16';
}

function isU32(value: Codec): value is u32 {
  return value.toRawType() == 'u32';
}

function isU64(value: Codec): value is u64 {
  return value.toRawType() == 'u64';
}

function isU8(value: Codec): value is u8 {
  return value.toRawType() == 'u8';
}

function isH160(value: Codec): value is H160 {
  const rawType = value.toRawType();
  return rawType == '[u8;20]' || rawType == 'H160';
}

function isH256(value: Codec): value is H256 {
  const rawType = value.toRawType();
  return rawType == '[u8;32]' || rawType == 'H256';
}

function isH512(value: Codec): value is H512 {
  const rawType = value.toRawType();
  return rawType == '[u8;64]' || rawType == 'H512';
}

function isU8aFixed(value: Codec): value is U8aFixed {
  return value.toRawType().startsWith('[u8;');
}

function isAccountId32(value: Codec): value is AccountId32 {
  return value.toRawType() == 'AccountId';
}

function isNull(value: Codec): value is Null {
  return value.toRawType() == 'Null';
}

function isText(value: Codec): value is Text {
  return value.toRawType() == 'Text';
}

function isTuple(value: Codec): value is ITuple<any[]> {
  const rawType = value.toRawType();
  return rawType.startsWith('(') && rawType.endsWith(')') &&  ('Types' in value);
}

function isEnum(value: Codec): value is Enum {
  return value.toRawType().startsWith('{"_enum":');
}

function isCompact(value: Codec): value is Compact<any> {
  return value.toRawType().startsWith('Compact<');
}

function isBTreeMap(value: Codec): value is BTreeMap<any, any> {
  return value.toRawType().startsWith('BTreeMap<');
}

function isConsensusEngineId(value: Codec): value is ConsensusEngineId {
  return value.toRawType() == 'ConsensusEngineId';
}

function isExtrinsic(value: Codec): value is GenericExtrinsic {
  return value.toRawType() == 'Extrinsic';
}

function isType(value: Codec): value is Type {
  return value.toRawType() == 'Type';
}

function isBTreeSet(value: Codec): value is BTreeSet<any> {
  return value.toRawType().startsWith('BTreeSet');
}

function isBalance(value: Codec): value is Balance {
  return value.toRawType() == 'Balance';
}

function isRaw(value: any): value is Raw {
  return value.toRawType() == 'Raw';
}

function isCodec(value: any): value is Codec {
  return typeof value == 'object' && 'toRawType' in value;
}

// function convert(value: bool): Converted<bool>;
// function convert<T extends Codec>(value: Option<T>): Converted<Option<T>>;
export function convert(value: any): any {
  if(isCodec(value)) {
    if(isBool(value))
      return convertBool(value);
    else if(isOption(value))
      return convertOption(value);
    else if(isVec(value))
      return convertVec(value);
    else if(isStruct(value))
      return convertStruct(value);
    else if(isBytes(value))
      return convertBytes(value);
    else if(isU128(value))
      return convertU128(value);
    else if(isU256(value))
      return convertU256(value);
    else if(isU16(value))
      return convertU16(value);
    else if(isU32(value))
      return convertU32(value);
    else if(isU64(value))
      return convertU64(value);
    else if(isU8(value))
      return convertU8(value);
    else if(isH160(value))
      return convertH160(value);
    else if(isH256(value))
      return convertH256(value);
    else if(isH512(value))
      return convertH512(value);
    else if(isU8aFixed(value))
      return convertU8aFixed(value);
    else if(isAccountId32(value))
      return convertAccountId32(value);
    else if(isNull(value))
      return convertNull(value);
    else if(isText(value))
      return convertText(value);
    else if(isTuple(value))
      return convertTuple(value);
    else if(isEnum(value))
      return convertEnum(value);
    else if(isCompact(value))
      return convertCompact(value);
    else if(isBTreeMap(value))
      return convertBTreeMap(value);
    else if(isConsensusEngineId(value))
      return convertConsensusEngineId(value);
    else if(isExtrinsic(value))
      return convertExtrinsic(value);
    else if(isType(value))
      return convertType(value);
    else if(isBTreeSet(value))
      return convertBTreeSet(value);
    else if(isBalance(value))
      return convertBalance(value);
    else if(isRaw(value))
      return convertRaw(value);
    // eslint-disable-next-line no-restricted-syntax
    throw new Error(`Unsupported type: ${value.toRawType()} ${value.toHuman()}`);
  } else {
    return value;
  }
}

function convertOption<T extends Codec>(value: Option<T>): Converted<Option<T>> {
  const unwrapped = value.unwrapOr(null);
  if(unwrapped != null)
    return convert(unwrapped) as Converted<T>;
  else
    return null;
}

function convertVec<T extends Codec>(value: Vec<T>): Converted<Vec<T>> {
  return value.map(v => convert(v)) as Converted<Vec<T>>;
}

function convertBool(value: bool): Converted<bool> {
  return value.toPrimitive();
}

const omitedProperties: any[] = ['meta', 'keys', 'toString', 'forEach', 'registry', 'entries', 'values',
  'set', 'createdAtHash', 'initialU8aLength', 'isStorageFallback', 'defKeys',  'isEmpty', 'size', 'encodedLength',
  'hash', 'eq', 'inspect', 'toHex', 'toHuman', 'has', 'toJSON', 'toPrimitive',  'toRawType', 'toU8a', 'Type', 'get',
  'getAtIndex', 'getT', 'toArray', 'clear', 'delete', 'Symbol.iterator', 'Symbol.iterator', 'Symbol.toStringTag'];

function convertStruct<T extends Struct>(value: T): Converted<T> {
  const result: any = {};
  for(const [k, v] of value.entries()) {
    if(!(k in omitedProperties))
      result[k] = convert(v);
  }

  return result as Converted<T>;
}

function convertBytes(value: Bytes): Converted<Bytes> {
  return value.toPrimitive() as string;
}

function convertU128(value: u128): Converted<u128> {
  return value.toBigInt();
}

function convertU256(value: U256): Converted<U256> {
  return value.toBigInt();
}

function convertU16(value: u16): Converted<u16> {
  return value.toNumber();
}

function convertU32(value: u32): Converted<u32> {
  return value.toNumber();
}

function convertU64(value: u64): Converted<u64> {
  return value.toNumber();
}

function convertU8(value: u8): Converted<u8> {
  return value.toNumber();
}

function convertH160(value: H160): Converted<H160> {
  return value.toHex();
}

function convertH256(value: H256): Converted<H256> {
  return value.toHex();
}

function convertH512(value: H512): Converted<H512> {
  return value.toHex();
}

function convertU8aFixed(value: U8aFixed): Converted<U8aFixed> {
  if(value.isUtf8)
    return value.toUtf8();
  else
    return value.toHex();
}

function convertAccountId32(value: AccountId32): Converted<AccountId32> {
  return value.toString();
}

function convertNull(_value: Null): Converted<Null> {
  return null;
}

function convertText(value: Text): Converted<Text> {
  return value.toString();
}

function convertTuple<T extends any[]>(value: ITuple<T>): Converted<ITuple<T>> {
  return value.map(e => convert(e)) as Converted<ITuple<T>>;
}

function convertEnum<T extends Enum>(value: T): Converted<T> {
  const asType = (value as any)[`as${value.type}`];
  if(asType != null && asType.toRawType() != 'Null') {
    const result: any = {};
    result[`${value.type}`] = convert(asType);
    return result as Converted<T>;
  } else {
    return value.type as Converted<T>;
  }
}

function convertCompact<T extends INumber>(value: Compact<T>): Converted<Compact<T>> {
  return convert(value.unwrap()) as Converted<Compact<T>>;
}

function convertBTreeMap<K extends Codec, V extends Codec>(tree: BTreeMap<K, V>): Converted<BTreeMap<K, V>> {
  const result = new Map<Converted<K>, Converted<V>>();
  for(const [key, value] of tree)
    result.set(convert(key), convert(value));
  return result;
}

function convertConsensusEngineId(value: ConsensusEngineId): Converted<ConsensusEngineId> {
  return  {
    isAura: value.isAura,
    isBabe: value.isBabe,
    isGrandpa: value.isGrandpa,
    isPow: value.isPow,
    isNimbus: value.isNimbus,
  };
}

function convertExtrinsic(value: GenericExtrinsic<AnyTuple>): Converted<GenericExtrinsic<AnyTuple>> {
  return {
    args: convert(value.args),
    callIndex: convert(value.callIndex),
    data: convert(value.data),
    era: convert(value.era),
    encodedLength: convert(value.encodedLength),
    isSigned: convert(value.isSigned),
    length: convert(value.length),
    meta: convert(value.meta),
    method: convert(value.method),
    nonce: convert(value.nonce),
    signature: convert(value.signature),
    signer: convert(value.signer),
    tip: convert(value.tip),
    type: convert(value.type),
    inner: convert(value.inner),
    version: convert(value.version),
  };
}

function convertType(value: Type): Converted<Type> {
  return value.toString();
}

function convertBTreeSet<V extends Codec>(set: BTreeSet<V>): Converted<BTreeSet<V>> {
  const result: V[] = [];
  for(const value of set)
    result.push(convert(value));
  return result;
}

function convertBalance(value: Balance): Converted<Balance> {
  return value.toBigInt();
}

function convertRaw(value: Raw): Converted<Raw> {
  return value.toHex();
}

// function convertUint8Array(value: Uint8Array): Converted<Uint8Array> {
//   return Buffer.from(value).toString('hex');
// }

export interface Queries {
  appPromotion: {
    stakesPerAccount: u8,
  },
  assetRegistry: {
    assetMetadatas: Option<PalletForeignAssetsModuleAssetMetadata>,
  },
  balances: {
    totalIssuance: u128,
    locks: Vec<PalletBalancesBalanceLock>,
    freezes: Vec<PalletBalancesIdAmount>,
  },
  collatorSelection: {
    candidates: Vec<AccountId32>,
    invulnerables: Vec<AccountId32>,
    lastAuthoredBlock: u32,
    licenseDepositOf: u128,
  },
  common: {
    collectionPropertyPermissions: UpDataStructsPropertiesMapPropertyPermission,
  },
  configuration: {
    collatorSelectionDesiredCollatorsOverride: u32,
    collatorSelectionLicenseBondOverride: u128,
  },
  council: {
    members: Vec<AccountId32>,
    prime: Option<AccountId32>,
    proposals: Vec<H256>,
    proposalOf: Option<Call>,
    proposalCount: u32,
  },
  councilMembership: {
    members: Vec<AccountId32>,
    prime: Option<AccountId32>,
  },
  democracy: {
    nextExternal: Option<ITuple<[FrameSupportPreimagesBounded, PalletDemocracyVoteThreshold]>>,
    publicProps: Vec<ITuple<[u32, FrameSupportPreimagesBounded, AccountId32]>>,
    referendumInfoOf: Option<PalletDemocracyReferendumInfo>,
  },
  evmContractHelpers: {
    owner: H160,
    sponsoring: UpDataStructsSponsorshipStateBasicCrossAccountIdRepr,
  }
  fellowshipReferenda:{
    referendumInfoFor: Option<PalletReferendaReferendumInfo>,
  },
  fellowshipCollective: {
    members: Option<PalletRankedCollectiveMemberRecord>,
  },
  identity: {
    identityOf: Option<PalletIdentityRegistration>,
  },
  inflation: {
    blockInflation: u128,
    startingYearTotalIssuance: u128,
  },
  parachainSystem: {
    validationData: Option<PolkadotPrimitivesV4PersistedValidationData>,
  },
  preimage: {
    statusFor: Option<PalletPreimageRequestStatus>,
  },
  session: {
    currentIndex: u32,
    validators: Vec<AccountId32>,
  },
  system: {
    account: FrameSystemAccountInfo,
    number: u32,
  },
  technicalCommittee: {
    members: Vec<AccountId32>,
    prime: Option<AccountId32>,
    proposals: Vec<H256>,
    proposalOf: Option<Call>,
    proposalCount: u32,
  },
  technicalCommitteeMembership: {
    members: Vec<AccountId32>,
    prime: Option<AccountId32>,
  },
  tokens: {
    accounts: OrmlTokensAccountData,
  },
  vesting: {
    vestingSchedules: Vec<OrmlVestingVestingSchedule>,
  },
}

