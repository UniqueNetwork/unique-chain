export interface IFeeGas {
  fee?: number | bigint,
  gas?: number | bigint,
  substrate?: number,
  zeppelin?: {
    fee: number | bigint,
    gas: number | bigint,
  }

}
export interface IFunctionFee {
  [name: string]: IFeeGas
}

export abstract class FunctionFeeVM {
  [name: string]: {
    ethFee?: number | bigint,
    ethGas?: number | bigint,
    substrate?: number,
    zeppelinFee?: number | bigint,
    zeppelinGas?: number | bigint
  };

  static fromModel(model: IFunctionFee): FunctionFeeVM {
    const res: FunctionFeeVM = {};

    Object.keys(model).forEach(key => {
      res[key] = {};
      if (model[key].fee && model[key].gas) {
        res[key].ethFee = model[key].fee;
        res[key].ethGas = model[key].gas;
      }
      if (model[key].substrate)
        res[key].substrate = model[key].substrate;
      if (model[key].zeppelin) {
        res[key].zeppelinFee = model[key].zeppelin?.fee;
        res[key].zeppelinGas = model[key].zeppelin?.gas;
      }
    });

    return res;
  }
}