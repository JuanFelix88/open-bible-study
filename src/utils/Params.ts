type ParamRet<TParam = ParamType> = TParam extends ParamType.STRING
  ? [string, Error?]
  : [number, Error?];

export enum ParamType {
  STRING = "string",
  NUMBER = "number",
}

export class Params {
  public static getRequiredParam<T extends ParamType = ParamType.STRING>(
    name: string,
    params: Record<string, string>,
    type: T = ParamType.STRING as T
  ): ParamRet<T> {
    if (!params) {
      throw new Error("Params are needed");
    }

    if (type === ParamType.STRING) {
      if (!params[name]) {
        return [null as any, new Error(`Param ${name} is needed`)];
      }

      return [params[name] as string, null] as any;
    }

    if (type === ParamType.NUMBER) {
      if (!params[name]) {
        return [null, new Error(`Param ${name} is needed`)] as any;
      }

      if (isNaN(Number(params[name]))) {
        return [null, new Error(`Param ${name} must be a number`)] as any;
      }
      return [parseFloat(params[name]), null] as any;
    }

    throw new Error(`Unknown param type ${type}`);
  }
}
