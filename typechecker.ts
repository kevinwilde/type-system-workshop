import { Term } from "./parser.ts";
import { lookupInStdLib } from "./stdlib.ts";
import { assertNever, DiscriminateUnion } from "./utils.ts";

export type Type =
  | { tag: "TyBool" }
  | { tag: "TyInt" }
  | { tag: "TyStr" }
  | { tag: "TyList"; elementType: Type }
  | { tag: "TyArrow"; paramTypes: Type[]; returnType: Type }
  | { tag: "TyVar"; name: string }
  | { tag: "TyUniv"; typeVars: string[]; resultType: Type };

type Context = { name: string; type: Type }[];

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
      if (!typesAreEquiv(thenType, elseType, ctx)) {
        throw new Error(
          `Expected branches of conditional to be the same type but got ${thenType.tag} and ${elseType.tag}`,
        );
      }
      return thenType;
    }
    case "TmEmpty": {
      return { tag: "TyList", elementType: term.typeAnn };
    }
    case "TmCons": {
      const carType = getTypeOf(term.car, ctx);
      const cdrType = getTypeOf(term.cdr, ctx);
      if (!typesAreEquiv(carType, cdrType, ctx)) {
        throw new Error(
          `Element type mismatch in list. Got elements of type ${carType.tag} and ${cdrType.tag}`,
        );
      }
      return { tag: "TyList", elementType: carType };
    }
    case "TmLet": {
      return getTypeOf(
        term.body,
        [{ name: term.name, type: getTypeOf(term.val, ctx) }].concat(ctx),
      );
    }
    case "TmAbs": {
      const newBindings = term.params.map((p) => ({
        name: p.name,
        type: p.typeAnn,
      }));
      return {
        tag: "TyArrow",
        paramTypes: newBindings.map((b) => b.type),
        returnType: getTypeOf(term.body, newBindings.concat(ctx)),
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
        if (!typesAreEquiv(argTypes[i], funcType.paramTypes[i], ctx)) {
          throw new Error(
            `parameter type mismatch: expected type ${
              funcType.paramTypes[i].tag
            }, but got ${argTypes[i].tag}`,
          );
        }
      }
      return funcType.returnType;
    }
    case "TmTypeAbs": {
      const newBindings: Context = term.typeParams.map((tp) => ({
        name: tp,
        type: { tag: "TyVar", name: tp },
      }));
      return {
        tag: "TyUniv",
        typeVars: term.typeParams,
        resultType: getTypeOf(term.body, newBindings.concat(ctx)),
      };
    }
    case "TmTypeApp": {
      const bodyType = getTypeOf(term.body, ctx);
      // // let bod
      // // if (term.body.tag === "TmVar") {
      // //   body =
      // // }
      // if (term.body.tag !== "TmTypeAbs") {
      //   throw new Error(`Expected type abstraction but got ${term.body.tag}`);
      // }
      // if (term.body.typeParams.length !== term.typeArgs.length) {
      //   throw new Error(
      //     `Type param arity mismatch: expected ${term.body.typeParams.length} arguments, but got ${term.typeArgs.length}`,
      //   );
      // }
      if (bodyType.tag !== "TyUniv") {
        throw new Error(`Expected type abstraction but got ${bodyType.tag}`);
      }
      if (bodyType.typeVars.length !== term.typeArgs.length) {
        throw new Error(
          `Type param arity mismatch: expected ${bodyType.typeVars.length} arguments, but got ${term.typeArgs.length}`,
        );
      }
      const newBindings: Context = [];
      for (let i = 0; i < term.typeArgs.length; i++) {
        newBindings.push(
          { name: bodyType.typeVars[i], type: term.typeArgs[i] },
        );
      }
      return reduceUnivType(bodyType, newBindings.concat(ctx));
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

function reduceUnivType(
  type: DiscriminateUnion<Type, "tag", "TyUniv">,
  ctx: Context,
): Type {
  function helper(tyS: Type): Type {
    switch (tyS.tag) {
      case "TyBool":
      case "TyInt":
      case "TyStr":
        return tyS;
      case "TyList":
        return {
          tag: "TyList",
          elementType: helper(tyS.elementType),
        };
      case "TyArrow":
        return {
          tag: "TyArrow",
          paramTypes: tyS.paramTypes.map((p) => helper(p)),
          returnType: helper(tyS.returnType),
        };
      case "TyVar": {
        const typeFromCtx = ctx.find((binding) => binding.name === tyS.name);
        if (typeFromCtx) {
          return typeFromCtx.type;
        } else {
          return tyS;
        }
      }
      case "TyUniv": {
        console.log("HERE!");
        // return helper({
        //   tag: "TyUniv",
        //   resultType: helper(tyS.resultType),
        //   typeVars: tyS.typeVars,
        // });
        return helper(tyS.resultType);
      }
      default:
        return assertNever(tyS);
    }
  }
  return helper(type.resultType);
}

function typesAreEquiv(t1: Type, t2: Type, ctx: Context): boolean {
  if (t1.tag === "TyVar" && t2.tag === "TyVar") {
    return t1.name === t2.name; // TODO doesn't work if names aren't unique
  } else if (t1.tag === "TyVar") {
    const typeFromCtx = ctx.filter((item) => item.name === t1.name)[0];
    if (!typeFromCtx) throw new Error();
    return typesAreEquiv(typeFromCtx.type, t2, ctx);
  } else if (t2.tag === "TyVar") {
    const typeFromCtx = ctx.filter((item) => item.name === t2.name)[0];
    if (!typeFromCtx) throw new Error();
    return typesAreEquiv(t1, typeFromCtx.type, ctx);
  } else if (t1.tag !== t2.tag) {
    return false;
  } else if (t1.tag === "TyList" && t2.tag === "TyList") {
    return typesAreEquiv(t1.elementType, t2.elementType, ctx);
  } else if (
    t1.tag === "TyArrow" && t2.tag === "TyArrow" &&
    t1.paramTypes.length === t2.paramTypes.length
  ) {
    for (let i = 0; i < t1.paramTypes.length; i++) {
      if (!typesAreEquiv(t1.paramTypes[i], t2.paramTypes[i], ctx)) {
        return false;
      }
    }
    if (!typesAreEquiv(t1.returnType, t2.returnType, ctx)) {
      return false;
    }
  }
  return true;
}
