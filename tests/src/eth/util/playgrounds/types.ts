import {EthUniqueHelper} from './unique.dev';

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

export type EthUniqueHelperConstructor = new (...args: any[]) => EthUniqueHelper;
