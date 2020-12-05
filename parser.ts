import { Lexer } from "./lexer.ts";
import { Type } from "./typechecker.ts";
import { assertNever } from "./utils.ts";

export type Term = (
  | { tag: "TmBool"; val: boolean }
  | { tag: "TmInt"; val: number }
  | { tag: "TmStr"; val: string }
  | { tag: "TmVar"; name: string }
  | { tag: "TmIf"; cond: Term; then: Term; else: Term }
  // | { tag: "TmEmpty" }
  // | { tag: "TmCons"; car: Term; cdr: Term }
  | { tag: "TmLet"; name: string; val: Term; body: Term }
  | { tag: "TmAbs"; params: { name: string; typeAnn: Type }[]; body: Term }
  | { tag: "TmApp"; func: Term; args: Term[] }
);

export function createAST(lexer: Lexer): Term {
  const cur = lexer.nextToken();
  if (!cur) throw new Error("eof");
  switch (cur.tag) {
    case "RPAREN":
    case "COLON":
    case "ARROW":
    case "LET":
    case "IF":
    case "AND":
    case "OR":
    case "LAMBDA":
      throw new Error(`Unexpected token: ${cur.tag}`);
    case "BOOL":
      return { tag: "TmBool", val: cur.val };
    case "INT":
      return { tag: "TmInt", val: cur.val };
    case "STR":
      return { tag: "TmStr", val: cur.val };
    case "IDEN":
      return { tag: "TmVar", name: cur.name };
    case "LPAREN": {
      const body = parseParenBody(lexer);
      lexer.consumeToken("RPAREN");
      return body;
    }
    default:
      return assertNever(cur);
  }
}

function parseParenBody(lexer: Lexer): Term {
  let nextToken = lexer.peek();
  if (!nextToken) throw new Error("eof");
  switch (nextToken.tag) {
    case "RPAREN":
    case "COLON":
    case "ARROW":
    case "BOOL":
    case "INT":
    case "STR":
      throw new Error(`Unexpected token: ${nextToken.tag}`);
    case "LAMBDA": {
      lexer.consumeToken("LAMBDA");
      const params = parseFunctionParams(lexer);
      const body = createAST(lexer);
      return { tag: "TmAbs", params, body };
    }
    case "LET": {
      lexer.consumeToken("LET");
      const varName = lexer.consumeToken("IDEN");
      const val = createAST(lexer);
      const body = createAST(lexer);
      return { tag: "TmLet", name: varName.name, val, body };
    }
    case "IF": {
      lexer.consumeToken("IF");
      const condTerm = createAST(lexer);
      const thenTerm = createAST(lexer);
      const elseTerm = createAST(lexer);
      return { tag: "TmIf", cond: condTerm, then: thenTerm, else: elseTerm };
    }
    case "AND": {
      lexer.consumeToken("AND");
      const cond1 = createAST(lexer);
      const cond2 = createAST(lexer);
      return {
        tag: "TmIf",
        cond: cond1,
        then: cond2,
        else: { tag: "TmBool", val: false },
      };
    }
    case "OR": {
      lexer.consumeToken("OR");
      const cond1 = createAST(lexer);
      const cond2 = createAST(lexer);
      return {
        tag: "TmIf",
        cond: cond1,
        then: { tag: "TmBool", val: true },
        else: cond2,
      };
    }
    case "LPAREN":
    case "IDEN": {
      const func = createAST(lexer);
      const args = [];
      while (lexer.peek() && lexer.peek()?.tag !== "RPAREN") {
        args.push(createAST(lexer));
      }
      return { tag: "TmApp", func, args };
    }
    default:
      return assertNever(nextToken);
  }
}

function parseFunctionParams(lexer: Lexer) {
  lexer.consumeToken("LPAREN");
  const params = [];
  while (lexer.peek() && lexer.peek()?.tag !== "RPAREN") {
    const iden = lexer.consumeToken("IDEN");
    lexer.consumeToken("COLON");
    const typeAnn = parseTypeAnn(lexer);
    params.push({ name: iden.name, typeAnn });
  }
  lexer.consumeToken("RPAREN");
  return params;
}

function parseTypeAnn(lexer: Lexer): Type {
  const cur = lexer.nextToken();
  if (!cur) {
    throw new Error("eof");
  }
  switch (cur.tag) {
    case "RPAREN":
    case "COLON":
    case "ARROW":
    case "LET":
    case "IF":
    case "AND":
    case "OR":
    case "LAMBDA":
    case "INT":
    case "BOOL":
    case "STR":
      throw new Error(`Unexpected token: ${cur.tag}`);
    case "IDEN": {
      switch (cur.name) {
        case "bool":
          return { tag: "TyBool" };
        case "int":
          return { tag: "TyInt" };
        case "str":
          return { tag: "TyStr" };
        default:
          throw new Error(`Unknown type: ${cur.name}`);
      }
    }
    case "LPAREN": {
      lexer.consumeToken("ARROW");
      const funcTypes = [];
      while (lexer.peek() && lexer.peek()?.tag !== "RPAREN") {
        funcTypes.push(parseTypeAnn(lexer));
      }
      lexer.consumeToken("RPAREN");
      if (funcTypes.length === 0) {
        throw new Error(
          `Unexpected token: expected function return type but got RPAREN`,
        );
      }
      const paramTypes = funcTypes.slice(0, funcTypes.length - 1);
      const returnType = funcTypes[funcTypes.length - 1];
      return { tag: "TyArrow", paramTypes, returnType };
    }
    default:
      return assertNever(cur);
  }
}
