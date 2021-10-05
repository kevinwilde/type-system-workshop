import { Term } from "./parser.ts";
import { lookupInStdLib } from "./stdlib.ts";
import { assertNever, genUniqTypeVar, printType } from "./utils.ts";

export type Type =
  | { tag: "TyBool" }
  | { tag: "TyInt" }
  | { tag: "TyStr" }
  | { tag: "TyList"; elementType: Type }
  | { tag: "TyArrow"; paramTypes: Type[]; returnType: Type }
  | { tag: "TyTbd"; sym: symbol }
  | { tag: "TyScheme", freeVars: symbol[]; type: Type };

type Context = { name: string; type: Type }[];

type Constraint = [Type, Type];
type Constraints = Constraint[];

export function typeCheck(term: Term) {
  const [type, constraints] = getTypeAndConstraints(term, []);
  // console.log(type, JSON.stringify(constraints, null , 2))
  const unifiedConstraints = unify(constraints);
  // console.log(JSON.stringify(unifiedConstraints, null, 2))
  const finalType = applySubst(unifiedConstraints, type);
  return reduceTypeScheme(finalType);
}

function getTypeAndConstraints(term: Term, ctx: Context): [Type, Constraints] {
  switch (term.tag) {
    case "TmBool":
      return [{ tag: "TyBool" }, []];
    case "TmInt":
      return [{ tag: "TyInt" }, []];
    case "TmStr":
      return [{ tag: "TyStr" }, []];
    case "TmVar":
      return [getTypeFromContext(ctx, term.name), []];
    case "TmEmpty":
      return [
        {
          tag: "TyList",
          elementType: { tag: "TyTbd", sym: genUniqTypeVar() },
        },
        [],
      ];
    case "TmCons": {
      const [carType, constr1] = getTypeAndConstraints(term.car, ctx);
      const [cdrType, constr2] = getTypeAndConstraints(term.cdr, ctx);
      const newConstraints: Constraints = [
        // car must match element type of cdr
        [{ tag: "TyList", elementType: carType }, cdrType],
      ];
      return [
        { tag: "TyList", elementType: carType },
        [...newConstraints, ...constr1, ...constr2],
      ];
    }
    case "TmIf": {
      const [condType, constr1] = getTypeAndConstraints(term.cond, ctx);
      const [thenType, constr2] = getTypeAndConstraints(term.then, ctx);
      const [elseType, constr3] = getTypeAndConstraints(term.else, ctx);
      const newConstraints: Constraints = [
        [{ tag: "TyBool" }, condType], // cond must have type bool
        [thenType, elseType], // then and else must have same type
      ];
      return [
        thenType,
        [...newConstraints, ...constr1, ...constr2, ...constr3],
      ];
    }
    case "TmLet": {
      const tbdTypeForRecursion: Type = { tag: "TyTbd", sym: genUniqTypeVar() };
      const [valType, constr1] = getTypeAndConstraints(
        term.val,
        [ // Allows recursion by saying this name is in context, with type TBD as of now
          { name: term.name, type: tbdTypeForRecursion },
          ...ctx,
        ],
      );
      const principalValType = applySubst(unify(constr1), valType)
      // console.log(printType(principalValType))

      const [bodyType, constr2] = getTypeAndConstraints(
        term.body,
        [
          {
            name: term.name,
            type: {
              tag: "TyScheme",
              type: principalValType,
              freeVars: [...new Set(collectSymbolsNotInContext(principalValType, ctx))],
            }
          },
          ...ctx
        ],
      );

      return [
        bodyType,
        [
          // Constraint that the TBD-type we referenced above matches the
          // type determined for the value of the let expression
          [tbdTypeForRecursion, principalValType],
          ...constr1,
          ...constr2,
        ],
      ];
    }
    case "TmAbs": {
      const paramsCtx: Context = [];
      for (const p of term.params) {
        paramsCtx.push(
          {
            name: p.name,
            type: (p.typeAnn || { tag: "TyTbd", sym: genUniqTypeVar() }),
          },
        );
      }
      const newCtx = [...paramsCtx, ...ctx];
      const [tyBody, constr2] = getTypeAndConstraints(term.body, newCtx);
      return [
        {
          tag: "TyArrow",
          paramTypes: paramsCtx.map((p) => p.type),
          returnType: tyBody,
        },
        constr2,
      ];
    }
    case "TmApp": {
      const [funcType, constr1] = getTypeAndConstraints(term.func, ctx);

      const argTypes = [];
      const argConstraints = [];
      for (const arg of term.args) {
        const [tyArg, constr2] = getTypeAndConstraints(arg, ctx);
        argTypes.push(tyArg);
        argConstraints.push(...constr2);
      }

      const tbdType: Type = { tag: "TyTbd", sym: genUniqTypeVar() };
      const newConstraint: Constraints[0] = [
        funcType,
        {
          tag: "TyArrow",
          paramTypes: argTypes,
          returnType: tbdType,
        },
      ];

      return [
        tbdType,
        [newConstraint, ...constr1, ...argConstraints],
      ];
    }
    default:
      return assertNever(term);
  }
}

function unify(constraints: Constraints): Constraints {
  if (constraints.length === 0) {
    return [];
  }

  const [ty1, ty2] = constraints[0];
  const restConstraints = constraints.slice(1);
  if (ty1.tag === "TyTbd" && ty2.tag === "TyTbd" && ty1.sym === ty2.sym) {
    return unify(restConstraints);
  } else if (ty2.tag === "TyTbd") {
    if (occursIn(ty2.sym, ty1)) {
      throw new Error(`circular constraints`);
    }
    return [
      [ty2, ty1],
      ...unify(substituteInConstraints(ty2.sym, ty1, restConstraints)),
    ];
  } else if (ty1.tag === "TyTbd") {
    if (occursIn(ty1.sym, ty2)) {
      throw new Error(`circular constraints`);
    }
    return [
      [ty1, ty2],
      ...unify(substituteInConstraints(ty1.sym, ty2, restConstraints)),
    ];
  } if (ty1.tag === "TyScheme" && ty2.tag === "TyScheme") {
    const newConstraint: Constraints[0] = [
      refreshTbdTypes(ty1.type, ty1.freeVars),
      refreshTbdTypes(ty2.type, ty2.freeVars),
    ];
    return unify([newConstraint, ...restConstraints]);
  } else if (ty2.tag === "TyScheme") {
    const newConstraint: Constraints[0] = [
      ty1,
      refreshTbdTypes(ty2.type, ty2.freeVars),
    ];
    return unify([newConstraint, ...restConstraints]);
  } else if (ty1.tag === "TyScheme") {
    const newConstraint: Constraints[0] = [
      refreshTbdTypes(ty1.type, ty1.freeVars),
      ty2,
    ];
    return unify([newConstraint, ...restConstraints]);
  } else if (ty1.tag === ty2.tag) {
    switch (ty1.tag) {
      case "TyBool":
      case "TyInt":
      case "TyStr":
        return unify(restConstraints);
      case "TyList": {
        if (ty2.tag !== "TyList") throw new Error();
        const elementConstraint: Constraints[0] = [
          ty1.elementType,
          ty2.elementType,
        ];
        return unify([...restConstraints, elementConstraint]);
      }
      case "TyArrow": {
        if (ty2.tag !== "TyArrow") throw new Error();
        if (ty1.paramTypes.length !== ty2.paramTypes.length) {
          throw new Error(
            `Unsolvable constraints: expected ${ty1.paramTypes.length} arguments but got ${ty2.paramTypes.length}`,
          );
        }
        const paramConstraints: Constraints = [];
        for (let i = 0; i < ty1.paramTypes.length; i++) {
          paramConstraints.push([
            ty1.paramTypes[i],
            ty2.paramTypes[i],
          ]);
        }
        const returnConstraint: Constraints[0] = [
          ty1.returnType,
          ty2.returnType,
        ];
        return unify(
          [...restConstraints, ...paramConstraints, returnConstraint],
        );
      }
      default:
        return assertNever(ty1);
    }
  } else if (ty1.tag !== ty2.tag) {
    throw new TypeError(
      `Unsolvable constraints, expected type ${ty1.tag}, but got ${ty2.tag}`,
    );
  } else {
    throw new Error();
  }
}

// Checks if sym occurs within some other type
// ex. 'a occurs within (Listof 'a)
//     'a does not occur within int
//     'a occurs within (-> int (Listof 'b) 'a)
//     'a occurs within (-> (Listof (Listof (-> 'a 'a int))) int)
function occursIn(sym: symbol, otherType: Type): boolean {
  switch (otherType.tag) {
    case "TyBool":
    case "TyInt":
    case "TyStr":
      return false;
    case "TyList":
      return occursIn(sym, otherType.elementType);
    case "TyArrow":
      return otherType.paramTypes.filter((p) => occursIn(sym, p)).length > 0 ||
        occursIn(sym, otherType.returnType);
    case "TyTbd":
      return otherType.sym === sym;
    case "TyScheme":
      return occursIn(sym, otherType.type)
    default:
      return assertNever(otherType);
  }
}

function substituteInConstraints(
  sym: symbol,
  ty: Type,
  constraints: Constraints,
): Constraints {
  return constraints.map((c) => {
    const [ty1, ty2] = c;
    return [
      substituteInType(sym, ty, ty1),
      substituteInType(sym, ty, ty2),
    ];
  });
}

/**
 * @param sym symbol of type to subsitute
 * @param knownType type of sym / constraint on sym
 * @param typeToSubstInsideOf type to substitute inside of
 */
function substituteInType(
  sym: symbol,
  knownType: Type,
  typeToSubstInsideOf: Type,
): Type {
  switch (typeToSubstInsideOf.tag) {
    case "TyBool":
    case "TyInt":
    case "TyStr":
      return typeToSubstInsideOf;
    case "TyList":
      return {
        tag: "TyList",
        elementType: substituteInType(
          sym,
          knownType,
          typeToSubstInsideOf.elementType,
        ),
      };
    case "TyArrow":
      return {
        tag: "TyArrow",
        paramTypes: typeToSubstInsideOf.paramTypes.map((p) =>
          substituteInType(sym, knownType, p)
        ),
        returnType: substituteInType(
          sym,
          knownType,
          typeToSubstInsideOf.returnType,
        ),
      };
    case "TyTbd": {
      if (typeToSubstInsideOf.sym === sym) {
        return knownType;
      } else {
        return typeToSubstInsideOf;
      }
    }
    case "TyScheme": {
      return {
        tag: "TyScheme",
        type: substituteInType(sym, knownType, typeToSubstInsideOf.type),
        freeVars: typeToSubstInsideOf.freeVars,
      }
    }
    default:
      return assertNever(typeToSubstInsideOf);
  }
}

function collectSymbolsNotInContext(type: Type, ctx: Context): symbol[] {
  switch(type.tag) {
    case "TyBool":
    case "TyInt":
    case "TyStr":
      return [];
    case "TyList":
      return collectSymbolsNotInContext(type.elementType, ctx)
    case "TyArrow":
      return [...type.paramTypes.map((p) => collectSymbolsNotInContext(p, ctx)).flat(), ...collectSymbolsNotInContext(type.returnType, ctx)]
    case "TyTbd": {
      if (ctx.find((t) => t.type.tag === "TyTbd" && t.type.sym === type.sym)) {
        return []
      } else {
        return [type.sym]
      }
    }
    case "TyScheme":
      return collectSymbolsNotInContext(type.type, ctx)
    default:
      return assertNever(type)
  }
}

function reduceTypeScheme(type: Type): Type {
  switch(type.tag) {
    case "TyBool":
    case "TyInt":
    case "TyStr":
      return type
    case "TyList":
      return {
        tag: "TyList",
        elementType: reduceTypeScheme(type.elementType),
      }
    case "TyArrow":
      return {
        tag: "TyArrow",
        paramTypes: type.paramTypes.map((p) => reduceTypeScheme(p)),
        returnType: reduceTypeScheme(type.returnType),
      }
    case "TyTbd":
      return type
    case "TyScheme":
      return reduceTypeScheme(type.type)
    default:
      return assertNever(type)
  }
}

// TODO make work correctly
// - need to make sure that when you have the same sym multiple times
//   within a type, it is refreshed consistently (i.e. with only 1
//   new sym).
// - need to make sure you don't refresh a type which is also mentioned
//   in context
function refreshTbdTypes(type: Type, freeVars: symbol[]): Type {
  const alreadyRefreshed = new Map<symbol, symbol>()
  function helper(type: Type, freeVars: symbol[]): Type {
    switch(type.tag) {
      case "TyBool":
      case "TyInt":
      case "TyStr":
        return type;
      case "TyList":
        return {
          tag: "TyList",
          elementType: helper(type.elementType, freeVars)
        }
      case "TyArrow":
        return {
          tag: "TyArrow",
          paramTypes: type.paramTypes.map((p) => helper(p, freeVars)),
          returnType: helper(type.returnType, freeVars),
        };
      case "TyTbd":{
        // console.log('here!!!', freeVars)
        if (alreadyRefreshed.has(type.sym)) {
          return {
            tag: "TyTbd",
            sym: alreadyRefreshed.get(type.sym)!,
          }
        } else if (freeVars.includes(type.sym)) {
          const newSym = genUniqTypeVar()
          alreadyRefreshed.set(type.sym, newSym)
          return {
            tag: "TyTbd",
            sym: newSym,
          }
        }
        return type
      }
      case "TyScheme":
        return {
          tag: "TyScheme",
          type: helper(type.type, [...type.freeVars, ...freeVars]),
          freeVars: [],
        }
      default:
        return assertNever(type)
    }
  }
  // console.log('===================')
  // console.log('refreshing type')
  // console.log(JSON.stringify(type, null, 2))
  const result = helper(type, freeVars)
  // console.log(JSON.stringify(result, null, 2))
  // console.log('===================')
  return result
}

function applySubst(constraints: Constraints, ty: Type) {
  let curResult = ty;
  for (const constraint of constraints) {
    const [tyTbd, ty2] = constraint;
    if (tyTbd.tag !== "TyTbd") throw new Error();
    curResult = substituteInType(tyTbd.sym, ty2, curResult);
  }
  return curResult;
}

function getTypeFromContext(ctx: Context, varName: string): Type {
  const result = ctx.find((binding) => binding.name === varName);
  if (result) return result.type;
  const stdLibResult = lookupInStdLib(varName);
  if (stdLibResult) return stdLibResult.type;
  throw new Error(`Unbound variable: ${varName}`);
}
