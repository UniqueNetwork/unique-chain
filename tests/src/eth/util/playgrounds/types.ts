export interface ContractImports {
  solPath: string;
  fsPath: string;
}

export interface CompiledContract {
  abi: any;
  object: string;
}

export type NormalizedEvent = {
  address: string,
  event: string,
  args: { [key: string]: string }
};
export interface TEthCrossAccount {
  readonly 0: string,
  readonly 1: string | Uint8Array,
  readonly field_0: string,
  readonly field_1: string | Uint8Array,
}
