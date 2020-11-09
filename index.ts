import { Lexer } from "./lexer.ts";
import { createAST } from "./parser.ts";
import { evaluate } from "./interpreter.ts";
import { printValue } from "./utils.ts";
import { typeCheck } from "./typechecker.ts";
import { existsSync } from "https://deno.land/std/fs/exists.ts";
import { readFileStrSync } from "https://deno.land/std/fs/read_file_str.ts";

function executeProgram(program: string) {
  const lexer = new Lexer(program);
  const ast = createAST(lexer);
  const _ = typeCheck(ast);
  console.log(printValue((evaluate(ast))));
}

function main() {
  const args = Deno.args;
  if (args.length !== 1) {
    console.error("Usage: pass file name of file to run");
    return;
  }
  const sourceFile = args[0];
  if (!existsSync(sourceFile)) {
    console.error(`File not found: ${sourceFile}`);
  }
  const program = readFileStrSync(sourceFile);
  executeProgram(program);
}

main();
