import { Term } from "./parser.ts";
import { lookupInStdLib } from "./stdlib.ts";
import { assertNever } from "./utils.ts";

export type Type =
  | { tag: "TyBool" }
  | { tag: "TyInt" }
  | { tag: "TyStr" }
  // | { tag: "TyList"; elementType: Type }
  | { tag: "TyArrow"; paramTypes: Type[]; returnType: Type };

export function typeCheck(term: Term): Type {
  switch (term.tag) {
    case "TmBool":
      throw new Error("TODO");
    case "TmInt":
      throw new Error("TODO");
    case "TmStr":
      throw new Error("TODO");
    case "TmVar":
      throw new Error("TODO");
    case "TmIf": {
      // { tag: "TmIf"; cond: Term; then: Term; else: Term }
      throw new Error("TODO");
    }
    case "TmLet": {
      // { tag: "TmLet"; name: string; val: Term; body: Term }
      throw new Error("TODO");
    }
    case "TmAbs": {
      // { tag: "TmAbs"; params: { name: string; typeAnn: Type }[]; body: Term }
      throw new Error("TODO");
    }
    case "TmApp": {
      // { tag: "TmApp"; func: Term; args: Term[] }
      throw new Error("TODO");
    }
    default:
      return assertNever(term);
  }
}
