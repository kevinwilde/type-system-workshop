import { Value } from "./interpreter.ts";
import { Type } from "./typechecker.ts";
import { DiscriminateUnion, assertNever } from "./utils.ts";

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
    const paramType: Type = { tag: "TyInt" };
    return {
      tag: "TmStdlibFun",
      type: {
        tag: "TyArrow",
        paramTypes: [paramType, paramType],
        returnType: { tag: "TyBool" },
      },
      impl: (
        x: DiscriminateUnion<Value, "tag", "TmInt">,
        y: DiscriminateUnion<Value, "tag", "TmInt">,
      ) => ({ tag: "TmBool", val: x.val == y.val }),
    };
  },
  "string=?": () => {
    const paramType: Type = { tag: "TyStr" };
    return {
      tag: "TmStdlibFun",
      type: {
        tag: "TyArrow",
        paramTypes: [paramType, paramType],
        returnType: { tag: "TyBool" },
      },
      impl: (
        x: DiscriminateUnion<Value, "tag", "TmStr">,
        y: DiscriminateUnion<Value, "tag", "TmStr">,
      ) => ({ tag: "TmBool", val: x.val === y.val }),
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
};

export function lookupInStdLib(
  varName: string,
): (ReturnType<typeof STD_LIB[keyof typeof STD_LIB]>) | undefined {
  return STD_LIB[varName]?.() || undefined;
}
