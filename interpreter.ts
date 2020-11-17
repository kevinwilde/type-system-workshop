import { Term } from "./parser.ts";
import { lookupInStdLib } from "./stdlib.ts";
import { DiscriminateUnion, assertNever } from "./utils.ts";

export function evaluate(ast: Term) {
  return interpretInEnv(ast, []);
}

type Environment = { name: string; value: Value }[];

export type Value =
  | { tag: "TmBool"; val: boolean }
  | { tag: "TmInt"; val: number }
  | { tag: "TmStr"; val: string }
  // | { tag: "TmEmpty" }
  // | { tag: "TmCons"; car: Value; cdr: Value }
  | { tag: "TmClosure"; params: string[]; body: Term; env: Environment }
  | { tag: "TmStdlibFun"; impl: (...args: Value[]) => Value };

function interpretInEnv(term: Term, env: Environment): Value {
  switch (term.tag) {
    case "TmBool":
    case "TmInt":
    case "TmStr":
      return term;
    case "TmAbs":
      return {
        tag: "TmClosure",
        params: term.params.map((p) => p.name),
        body: term.body,
        env,
      };
    case "TmVar":
      return lookupInEnv(term.name, env);
    case "TmIf": {
      const condResult = interpretInEnv(term.cond, env);
      if (condResult.tag !== "TmBool") {
        // Should never happen as it's already be handled by typechecker
        throw new Error(
          `Expected condition to be a boolean expression but got ${condResult.tag}`,
        );
      }
      return interpretInEnv(condResult.val ? term.then : term.else, env);
    }
    case "TmLet": {
      let value;
      if (term.val.tag === "TmAbs") {
        // Special case to enable recursion
        const func = term.val;
        const closureEnvEntry: DiscriminateUnion<
          Value,
          "tag",
          "TmClosure"
        > = {
          tag: "TmClosure",
          params: func.params.map((p) => p.name),
          body: func.body,
          env: null as any,
        };
        // Add an entry to the Environment for this closure assigned to the name
        // of the let term we are evaluationg
        const closureEnv = [
          { name: term.name, value: closureEnvEntry },
          ...env,
        ];
        // Point the env for the closure back at the env we just created,
        // forming a circular reference to allow recursion
        closureEnvEntry.env = closureEnv;
        // Now interpret the val of the let term (the function we're creating)
        value = interpretInEnv(term.val, closureEnv);
      } else {
        value = interpretInEnv(term.val, env);
      }
      const newEnv = [{ name: term.name, value }, ...env];
      return interpretInEnv(term.body, newEnv);
    }
    case "TmApp": {
      const closure = interpretInEnv(term.func, env);
      const args = term.args.map((a) => interpretInEnv(a, env));
      if (closure.tag === "TmClosure") {
        // // Handled by typechecker
        // if (closure.params.length !== args.length) {
        //   throw new RuntimeError(
        //     `Incorrect number of arguments. Expected ${closure.params.length} but got ${args.length}`,
        //     term.term.args[term.term.args.length - 1].info,
        //   );
        // }
        const newEnv = closure.params.map((paramName, index) => ({
          name: paramName,
          value: args[index],
        })).concat(closure.env);
        return interpretInEnv(closure.body, newEnv);
      } else if (closure.tag === "TmStdlibFun") {
        // // Handled by typechecker
        // if (closure.type.paramTypes.length !== args.length) {
        //   throw new RuntimeError(
        //     `Incorrect number of arguments. Expected ${closure.type.paramTypes.length} but got ${args.length}`,
        //     term.term.args[term.term.args.length - 1].info,
        //   );
        // }
        // for (let i = 0; i < args.length; i++) {
        //   if (args[i].tag !== closure.type.paramTypes[i].tag) {
        //     throw new RuntimeError(
        //       `TypeError: Expected ${closure.type.paramTypes[i].tag} but got ${
        //         args[i].tag
        //       }`,
        //       term.term.args[i].info,
        //     );
        //   }
        // }
        return closure.impl(...args);
      } else {
        throw new Error("cannot call a non function");
      }
    }
    default:
      return assertNever(term);
  }
}

function lookupInEnv(varName: string, env: Environment) {
  const envResult = env.filter((item) => item.name == varName)[0];
  if (envResult) return envResult.value;
  const stdlibValue = lookupInStdLib(varName);
  if (stdlibValue) return stdlibValue;
  throw new Error(`unbound variable: ${varName}`);
}
