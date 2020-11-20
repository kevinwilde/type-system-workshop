import { Term } from "./parser.ts";
import { lookupInStdLib } from "./stdlib.ts";
import { assertNever, genUniqTypeVar } from "./utils.ts";

export type Type =
  | { tag: "TyBool" }
  | { tag: "TyInt" }
  | { tag: "TyStr" }
  | { tag: "TyList"; elementType: Type }
  | { tag: "TyArrow"; paramTypes: Type[]; returnType: Type };

type Context = { name: string; type: Type }[];

type Constraint = [Type, Type];
type Constraints = Constraint[];

export function typeCheck(term: Term) {
  return getTypeOf(term, []);
}

function getTypeOf(term: Term, ctx: Context): Type {
  switch (term.tag) {
    case "TmBool":
      return { tag: "TyBool" };
    case "TmInt":
      return { tag: "TyInt" };
    case "TmStr":
      return { tag: "TyStr" };
    case "TmVar":
      return getTypeFromContext(ctx, term.name);
    case "TmIf": {
      const condType = getTypeOf(term.cond, ctx);
      if (condType.tag !== "TyBool") {
        throw new Error(
          `Expected guard of conditional to be a boolean but got ${condType.tag}`,
        );
      }
      const thenType = getTypeOf(term.then, ctx);
      const elseType = getTypeOf(term.else, ctx);
      if (!typesAreEquiv(thenType, elseType)) {
        throw new Error(
          `Expected branches of conditional to be the same type but got ${thenType.tag} and ${elseType.tag}`,
        );
      }
      return thenType;
    }
    case "TmLet": {
      return getTypeOf(
        term.body,
        [{ name: term.name, type: getTypeOf(term.val, ctx) }, ...ctx],
      );
    }
    case "TmAbs": {
      const paramsCtx: Context = term.params.map((p) => ({
        name: p.name,
        type: p.typeAnn,
      }));
      const newCtx = [...paramsCtx, ...ctx];
      return {
        tag: "TyArrow",
        paramTypes: paramsCtx.map((p) => p.type),
        returnType: getTypeOf(term.body, newCtx),
      };
    }
    case "TmApp": {
      let funcType = getTypeOf(term.func, ctx);
      if (funcType.tag !== "TyArrow") {
        throw new Error(`Expected arrow type but got ${funcType.tag}`);
      }
      if (term.args.length !== funcType.paramTypes.length) {
        throw new Error(
          `arity mismatch: expected ${funcType.paramTypes.length} arguments, but got ${term.args.length}`,
        );
      }
      const argTypes = term.args.map((arg) => getTypeOf(arg, ctx));
      for (let i = 0; i < argTypes.length; i++) {
        if (!typesAreEquiv(argTypes[i], funcType.paramTypes[i])) {
          throw new Error(
            `parameter type mismatch: expected type ${
              funcType.paramTypes[i].tag
            }, but got ${argTypes[i].tag}`,
          );
        }
      }
      return funcType.returnType;
    }
    default: {
      return assertNever(term);
    }
  }
}

function getTypeFromContext(ctx: Context, varName: string): Type {
  const result = ctx.find((binding) => binding.name === varName);
  if (result) return result.type;
  const stdLibResult = lookupInStdLib(varName);
  if (stdLibResult) return stdLibResult.type;
  throw new Error(`Unbound variable: ${varName}`);
}

function typesAreEquiv(t1: Type, t2: Type): boolean {
  if (t1.tag !== t2.tag) {
    return false;
  } else if (
    t1.tag === "TyArrow" && t2.tag === "TyArrow" &&
    t1.paramTypes.length === t2.paramTypes.length
  ) {
    for (let i = 0; i < t1.paramTypes.length; i++) {
      if (!typesAreEquiv(t1.paramTypes[i], t2.paramTypes[i])) {
        return false;
      }
    }
    if (!typesAreEquiv(t1.returnType, t2.returnType)) {
      return false;
    }
  }
  return true;
}
