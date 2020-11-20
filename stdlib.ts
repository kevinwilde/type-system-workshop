import { Value } from "./interpreter.ts";
import { Type } from "./typechecker.ts";
import { DiscriminateUnion, genUniqTypeVar, assertNever } from "./utils.ts";

type StdLibFun = {
  tag: "TmStdlibFun";
  type: DiscriminateUnion<Type, "tag", "TyArrow">;
  // TODO
  // impl: (...args: Value[]) => Value;
  impl: (...args: any[]) => Value;
};

const STD_LIB: Record<string, () => StdLibFun> = {
  "not": () => ({
    tag: "TmStdlibFun",
    type: {
      tag: "TyArrow",
      paramTypes: [{ tag: "TyBool" }],
      returnType: { tag: "TyBool" },
    },
    impl: (
      x: DiscriminateUnion<Value, "tag", "TmBool">,
    ) => ({ tag: "TmBool", val: !(x.val) }),
  }),
  "+": () => ({
    tag: "TmStdlibFun",
    type: {
      tag: "TyArrow",
      paramTypes: [{ tag: "TyInt" }, { tag: "TyInt" }],
      returnType: { tag: "TyInt" },
    },
    impl: (
      x: DiscriminateUnion<Value, "tag", "TmInt">,
      y: DiscriminateUnion<Value, "tag", "TmInt">,
    ) => ({ tag: "TmInt", val: x.val + y.val }),
  }),
  "-": () => ({
    tag: "TmStdlibFun",
    type: {
      tag: "TyArrow",
      paramTypes: [{ tag: "TyInt" }, { tag: "TyInt" }],
      returnType: { tag: "TyInt" },
    },
    impl: (
      x: DiscriminateUnion<Value, "tag", "TmInt">,
      y: DiscriminateUnion<Value, "tag", "TmInt">,
    ) => ({ tag: "TmInt", val: x.val - y.val }),
  }),
  "*": () => ({
    tag: "TmStdlibFun",
    type: {
      tag: "TyArrow",
      paramTypes: [{ tag: "TyInt" }, { tag: "TyInt" }],
      returnType: { tag: "TyInt" },
    },
    impl: (
      x: DiscriminateUnion<Value, "tag", "TmInt">,
      y: DiscriminateUnion<Value, "tag", "TmInt">,
    ) => ({ tag: "TmInt", val: x.val * y.val }),
  }),
  "=": () => {
    const paramType: Type = { tag: "TyTbd", sym: genUniqTypeVar() };
    return {
      tag: "TmStdlibFun",
      type: {
        tag: "TyArrow",
        paramTypes: [paramType, paramType],
        returnType: { tag: "TyBool" },
      },
      impl: (x: Value, y: Value) => {
        switch (x.tag) {
          case "TmBool":
          case "TmStr":
          case "TmInt": {
            if (x.tag !== y.tag) throw new Error();
            return { tag: "TmBool", val: x.val == y.val };
          }
          case "TmEmpty":
            return { tag: "TmBool", val: y.tag === "TmEmpty" };
          case "TmCons":
          case "TmClosure":
          case "TmStdlibFun":
            return { tag: "TmBool", val: x === y };
          default:
            return assertNever(x);
        }
      },
    };
  },
  "string-length": () => ({
    tag: "TmStdlibFun",
    type: {
      tag: "TyArrow",
      paramTypes: [{ tag: "TyStr" }],
      returnType: { tag: "TyInt" },
    },
    impl: (
      x: DiscriminateUnion<Value, "tag", "TmStr">,
    ) => ({ tag: "TmInt", val: x.val.length }),
  }),
  "string->list": () => ({
    tag: "TmStdlibFun",
    type: {
      tag: "TyArrow",
      paramTypes: [{ tag: "TyStr" }],
      returnType: { tag: "TyList", elementType: { tag: "TyStr" } },
    },
    impl: (x: DiscriminateUnion<Value, "tag", "TmStr">) => {
      let curTerm: Value = { tag: "TmEmpty" };
      let i = x.val.length - 1;
      while (i >= 0) {
        curTerm = {
          tag: "TmCons",
          car: { tag: "TmStr", val: x.val[i] },
          cdr: curTerm,
        };
        i--;
      }
      return curTerm;
    },
  }),
  "string-concat": () => ({
    tag: "TmStdlibFun",
    type: {
      tag: "TyArrow",
      paramTypes: [{ tag: "TyStr" }, { tag: "TyStr" }],
      returnType: { tag: "TyStr" },
    },
    impl: (
      x: DiscriminateUnion<Value, "tag", "TmStr">,
      y: DiscriminateUnion<Value, "tag", "TmStr">,
    ) => ({ tag: "TmStr", val: x.val + y.val }),
  }),
  "cons": () => {
    const elementType: Type = { tag: "TyTbd", sym: genUniqTypeVar() };
    const listType: Type = { tag: "TyList", elementType };
    return {
      tag: "TmStdlibFun",
      type: {
        tag: "TyArrow",
        paramTypes: [elementType, listType],
        returnType: listType,
      },
      impl: (car: Value, cdr: Value) => ({ tag: "TmCons", car, cdr }),
    };
  },
  "empty?": () => ({
    tag: "TmStdlibFun",
    type: {
      tag: "TyArrow",
      paramTypes: [
        ({
          tag: "TyList",
          elementType: { tag: "TyTbd", sym: genUniqTypeVar() },
        }),
      ],
      returnType: ({ tag: "TyBool" }),
    },
    impl: (
      lst:
        | DiscriminateUnion<Value, "tag", "TmCons">
        | DiscriminateUnion<Value, "tag", "TmEmpty">,
    ) => ({ tag: "TmBool", val: lst.tag === "TmEmpty" }),
  }),
  "car": () => {
    const elementType: Type = { tag: "TyTbd", sym: genUniqTypeVar() };
    return {
      tag: "TmStdlibFun",
      type: {
        tag: "TyArrow",
        paramTypes: [{ tag: "TyList", elementType }],
        returnType: elementType,
      },
      impl: (
        lst:
          | DiscriminateUnion<Value, "tag", "TmCons">
          | DiscriminateUnion<Value, "tag", "TmEmpty">,
      ) => {
        if (lst.tag === "TmEmpty") throw new Error("Called car on empty list");
        return lst.car;
      },
    };
  },
  "cdr": () => {
    const elementType: Type = { tag: "TyTbd", sym: genUniqTypeVar() };
    const listType: Type = { tag: "TyList", elementType };
    return {
      tag: "TmStdlibFun",
      type: {
        tag: "TyArrow",
        paramTypes: [listType],
        returnType: listType,
      },
      impl: (
        lst:
          | DiscriminateUnion<Value, "tag", "TmCons">
          | DiscriminateUnion<Value, "tag", "TmEmpty">,
      ) => {
        if (lst.tag === "TmEmpty") throw new Error("Called cdr on empty list");
        return lst.cdr;
      },
    };
  },
};

export function lookupInStdLib(
  varName: string,
): (ReturnType<typeof STD_LIB[keyof typeof STD_LIB]>) | undefined {
  return STD_LIB[varName]?.() || undefined;
}
