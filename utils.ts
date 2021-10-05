import { typeCheck } from "./typechecker.ts";
import { evaluate } from "./interpreter.ts";

export type DiscriminateUnion<T, K extends keyof T, V extends T[K]> = T extends
  Record<K, V> ? T : never;

export function assertNever(x: never): never {
  throw new Error();
}

export function prettyPrint(obj: any) {
  function removeInfo(arg: any): any {
    if (!arg) {
      return arg;
    }
    if (Array.isArray(arg)) {
      return arg.map((el) => removeInfo(el));
    }
    if ("info" in arg) {
      const { info, ...result } = arg;
      if (Object.keys(result).length === 1) {
        return removeInfo(result[Object.keys(result)[0]]);
      }
      return removeInfo(result);
    }
    const result: any = {};
    for (const [k, v] of Object.entries(arg)) {
      if (typeof v === "object") {
        result[k] = removeInfo(v);
      } else {
        result[k] = v;
      }
    }
    return result;
  }
  return JSON.stringify(removeInfo(obj), null, 2);
}

// export const genUniqTypeVar = Symbol;
// For debugging...easier to console log than symbols
let i = 0;
export const genUniqTypeVar = (): symbol => {
  i++;
  return `?X_${i}` as any;
};

export function printValue(v: ReturnType<typeof evaluate>): string {
  switch (v.tag) {
    case "TmBool":
      return v.val ? `#t` : `#f`;
    case "TmInt":
      return `${v.val}`;
    case "TmStr":
      return `"${v.val}"`;
    case "TmEmpty":
      return `empty`;
    case "TmCons":
      return `(cons ${printValue(v.car)} ${printValue(v.cdr)})`;
    case "TmClosure":
      return `[CLOSURE]`; // TODO ?
    case "TmStdlibFun":
      return `[STD_LIB]`; // TODO ?
    default:
      return assertNever(v);
  }
}

export function printType(t: ReturnType<typeof typeCheck>) {
  // produces stream of identifiers like
  // 'a 'b 'c ... 'z 'aa 'ab 'ac ... 'az 'ba 'bb 'bc ... 'bz 'ca 'cb 'cc ...
  const nextFreeGenerator = () => {
    let i = 0;
    return () => {
      let n = i;
      let result = "'";
      while (n >= 26) {
        const multiple = Math.floor(n / 26);
        result += String.fromCharCode(97 + multiple - 1);
        n -= (26 * multiple);
      }
      result += String.fromCharCode(97 + (n % 26));
      i += 1;
      return result;
    };
  };
  const nextFree = nextFreeGenerator();

  const symbolToPrettyType: Map<unknown, string> = new Map();

  function helper(t: ReturnType<typeof typeCheck>): string {
    switch (t.tag) {
      case "TyBool":
        return "bool";
      case "TyInt":
        return "int";
      case "TyStr":
        return "str";
      case "TyList":
        return `(Listof ${helper(t.elementType)})`;
      case "TyArrow":
        return `(-> ${(t.paramTypes.map((p) => helper(p))).join(" ")} ${
          helper(t.returnType)
        })`;
      case "TyTbd": {
        if (!(symbolToPrettyType.has(t.sym))) {
          symbolToPrettyType.set(t.sym, nextFree());
        }
        return symbolToPrettyType.get(t.sym)!;
      }
      case "TyScheme":{
        return `[SCHEME: ${helper(t.type)}]`
      }
      default:
        return assertNever(t);
    }
  }

  return helper(t);
}
