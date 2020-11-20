import { Term } from "./parser.ts";
import { lookupInStdLib } from "./stdlib.ts";
import { assertNever, genUniqTypeVar } from "./utils.ts";

export type Type =
  | { tag: "TyBool" }
  | { tag: "TyInt" }
  | { tag: "TyStr" }
  | { tag: "TyList"; elementType: Type }
  | { tag: "TyArrow"; paramTypes: Type[]; returnType: Type }
  | { tag: "TyTbd"; sym: symbol };

type Context = { name: string; type: Type }[];

type Constraint = [Type, Type];
type Constraints = Constraint[];

export function typeCheck(term: Term) {
  const [type, constraints] = getTypeAndConstraints(term, []);
  const unifiedConstraints = unify(constraints);
  const finalType = applySubst(unifiedConstraints, type);
  return finalType;
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

      const [bodyType, constr2] = getTypeAndConstraints(
        term.body,
        [{ name: term.name, type: valType }, ...ctx],
      );

      return [
        bodyType,
        [
          // Constraint that the TBD-type we referenced above matches the
          // type determined for the value of the let expression
          [tbdTypeForRecursion, valType],
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
    default:
      return assertNever(typeToSubstInsideOf);
  }
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
