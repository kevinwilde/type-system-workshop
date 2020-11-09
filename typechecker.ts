import { Term } from "./parser.ts";
import { lookupInStdLib } from "./stdlib.ts";
import {
  genUniqTypeVar,
  assertNever,
} from "./utils.ts";

export type Type =
  | { tag: "TyBool" }
  | { tag: "TyInt" }
  | { tag: "TyStr" }
  | { tag: "TyVoid" }
  | { tag: "TyList"; elementType: Type }
  | { tag: "TyArrow"; paramTypes: Type[]; returnType: Type }
  | { tag: "TyId"; name: symbol };

type Context = { name: string; type: Type }[];

type Constraint = [Type, Type];
type Constraints = Constraint[];

export function typeCheck(term: Term) {
  const [type, constraints] = recon([], term);
  const resultConstraints = unify(constraints);
  const finalType = applySubst(resultConstraints, type);
  return finalType;
}

function getTypeFromContext(
  ctx: Context,
  varName: string,
): Type {
  const result = ctx.find((binding) => binding.name === varName);
  if (result) return result.type;
  const stdLibResult = lookupInStdLib(varName);
  if (stdLibResult) return stdLibResult.type;
  throw new Error(`Unbound variable: ${varName}`);
}

function recon(
  ctx: Context,
  term: Term,
): [Type, Constraints] {
  switch (term.tag) {
    case "TmBool": {
      return [{ tag: "TyBool" }, []];
    }
    case "TmInt": {
      return [{ tag: "TyInt" }, []];
    }
    case "TmStr": {
      return [{ tag: "TyStr" }, []];
    }
    case "TmVar": {
      const tyVar = getTypeFromContext(ctx, term.name);
      return [tyVar, []];
    }
    case "TmEmpty": {
      return [
        {
          tag: "TyList",
          elementType: { tag: "TyId", name: genUniqTypeVar() },
        },
        [],
      ];
    }
    case "TmCons": {
      // 1 - car
      // 2 - cdr
      const [tyT1, constr1] = recon(ctx, term.car);
      const [tyT2, constr2] = recon(ctx, term.cdr);
      const newConstraints: Constraints = [
        [ // car must be element type of cdr
          { tag: "TyList", elementType: tyT1 },
          tyT2,
        ],
      ];
      return [
        { tag: "TyList", elementType: tyT1 },
        [...newConstraints, ...constr1, ...constr2],
      ];
    }
    case "TmIf": {
      // 1 - cond
      // 2 - then
      // 3 - else
      const [tyT1, constr1] = recon(ctx, term.cond);
      const [tyT2, constr2] = recon(ctx, term.then);
      const [tyT3, constr3] = recon(ctx, term.else);
      const newConstraints: Constraints = [
        [{ tag: "TyBool" }, tyT1], // cond must have type bool
        [tyT2, tyT3], // then and else must have same type
      ];
      return [tyT3, [...newConstraints, ...constr1, ...constr2, ...constr3]];
    }
    case "TmLet": {
      // 1 - value
      // 2 - body
      const unknownTypeForRecursion: Type = {
        tag: "TyId",
        name: genUniqTypeVar(),
      };
      const [tyT1, constr1] = recon(
        [ // Allows recursion by saying this name is in context, with type unknown as of now
          { name: term.name, type: unknownTypeForRecursion },
          ...ctx,
        ],
        term.val,
      );

      const [tyT2, constr2] = recon(
        [{ name: term.name, type: tyT1 }, ...ctx],
        term.body,
      );

      return [
        tyT2,
        [
          // Constraint that the unknown type we referenced above, matches the
          // type determined for the value of the let expression
          [unknownTypeForRecursion, tyT1],
          ...constr1,
          ...constr2,
        ], // TODO ?
      ];
    }
    case "TmAbs": {
      // paramTypes
      // 2 - body
      const paramsCtx: Context = [];
      for (const p of term.params) {
        paramsCtx.push(
          {
            name: p.name,
            type: (p.typeAnn || { tag: "TyId", name: genUniqTypeVar() }),
          },
        );
      }
      const newCtx = [...paramsCtx, ...ctx];
      const [tyT2, constr2] = recon(newCtx, term.body);
      return [
        {
          tag: "TyArrow",
          paramTypes: paramsCtx.map((e) => e.type),
          returnType: tyT2,
        },
        constr2,
      ];
    }
    case "TmApp": {
      // 1 - func
      // argTypes
      const [tyT1, constr1] = recon(ctx, term.func);

      let argTypes = [];
      let argConstraints = [];
      for (const arg of term.args) {
        const [tyT2, constr2] = recon(ctx, arg);
        argTypes.push(tyT2);
        argConstraints.push(...constr2);
      }

      const tyIdSym = genUniqTypeVar();
      const newConstraint: Constraints[0] = [
        tyT1,
        {
          tag: "TyArrow",
          paramTypes: argTypes,
          returnType: { tag: "TyId", name: tyIdSym },
        },
      ];

      return [
        { tag: "TyId", name: tyIdSym },
        [newConstraint, ...constr1, ...argConstraints],
      ];
    }
    default:
      return assertNever(term);
  }
}

/**
 * @param tyX symbol of type to subsitute
 * @param tyT "known type" of tyX / constraint on tyX
 * @param tyS type to substitute inside of
 */
function substituteInTy(tyX: symbol, tyT: Type, tyS: Type) {
  function helper(tyS: Type): Type {
    switch (tyS.tag) {
      case "TyBool":
      case "TyInt":
      case "TyStr":
      case "TyVoid":
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
      case "TyId": {
        if (tyS.name === tyX) {
          return tyT;
        } else {
          return tyS;
        }
      }
      default:
        return assertNever(tyS);
    }
  }
  return helper(tyS);
}

function applySubst(constraints: Constraints, tyT: Type) {
  return constraints.reverse().reduce((tyS, constraint) => {
    const [tyId, tyC2] = constraint;
    if (tyId.tag !== "TyId") throw new Error();
    return substituteInTy(tyId.name, tyC2, tyS);
  }, tyT);
}

function substituteInConstr(
  tyX: symbol,
  tyT: Type,
  constraints: Constraints,
): Constraints {
  return constraints.map((c) => {
    const [tyS1, tyS2] = c;
    return [
      substituteInTy(tyX, tyT, tyS1),
      substituteInTy(tyX, tyT, tyS2),
    ];
  });
}

function occursIn(tyX: symbol, tyT: Type) {
  function helper(tyT: Type): boolean {
    switch (tyT.tag) {
      case "TyBool":
      case "TyInt":
      case "TyStr":
      case "TyVoid":
        return false;
      case "TyList":
        return helper(tyT.elementType);
      case "TyArrow":
        return tyT.paramTypes.filter((p) => helper(p)).length > 0 ||
          helper(tyT.returnType);
      case "TyId":
        return tyT.name === tyX;
      default:
        return assertNever(tyT);
    }
  }
  return helper(tyT);
}

function unify(constraints: Constraints) {
  function helper(constraints: Constraints): Constraints {
    if (constraints.length === 0) {
      return [];
    }

    const [tyS, tyT] = constraints[0];
    const restConstraints = constraints.slice(1);
    if (tyS.tag === "TyId" && tyT.tag === "TyId" && tyS.name === tyT.name) {
      return helper(restConstraints);
    } else if (tyT.tag === "TyId") {
      if (occursIn(tyT.name, tyS)) {
        throw new Error(`circular constraints`);
      }
      return [
        ...helper(substituteInConstr(tyT.name, tyS, restConstraints)),
        [tyT, tyS],
      ];
    } else if (tyS.tag === "TyId") {
      const flippedConstraint: Constraint = [tyT, tyS];
      return helper([flippedConstraint, ...restConstraints]);
    } else if (tyS.tag === tyT.tag) {
      switch (tyS.tag) {
        case "TyBool":
        case "TyInt":
        case "TyStr":
        case "TyVoid":
          return helper(restConstraints);
        case "TyList": {
          if (tyT.tag !== "TyList") throw new Error();
          const elementConstraint: Constraints[0] = [
            tyS.elementType,
            tyT.elementType,
          ];
          return helper([elementConstraint, ...restConstraints]);
        }
        case "TyArrow": {
          if (tyT.tag !== "TyArrow") throw new Error();
          if (tyS.paramTypes.length !== tyT.paramTypes.length) {
            throw new Error(
              `Unsolvable constraints: expected ${tyS.paramTypes.length} arguments but got ${tyT.paramTypes.length}`,
            );
          }
          const paramConstraints: Constraints = [];
          for (let i = 0; i < tyS.paramTypes.length; i++) {
            paramConstraints.push([
              tyS.paramTypes[i],
              tyT.paramTypes[i],
            ]);
          }
          const returnConstraint: Constraints[0] = [
            tyS.returnType,
            tyT.returnType,
          ];
          return helper(
            [...paramConstraints, returnConstraint, ...restConstraints],
          );
        }
        default:
          return assertNever(tyS);
      }
    } else if (tyS.tag !== tyT.tag) {
      throw new TypeError(
        `Unsolvable constraints, expected type ${tyS.tag}, but got ${tyT.tag}`,
      );
    } else {
      throw new Error();
    }
  }
  return helper(constraints);
}
