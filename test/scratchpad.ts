import { Lexer } from "../lexer.ts";
import { createAST } from "../parser.ts";
import { evaluate } from "../interpreter.ts";
import { typeCheck } from "../typechecker.ts";

/// Test
function printTestCase(program: string) {
  console.log("=========================================================");
  const lexer = new Lexer(program);
  const ast = createAST(lexer);
  // console.log(prettyPrint(ast));
  const _ = typeCheck(ast);
  console.log((evaluate(ast)));
  console.log("=========================================================");
}

function printErrorTestCase(program: string) {
  console.log("=========================================================");
  try {
    const lexer = new Lexer(program);
    const ast = createAST(lexer);
    // console.log(prettyPrint(ast));
    const _ = typeCheck(ast);
    console.log((evaluate(ast)));
    throw new Error("Program didn't error");
  } catch (e) {
    // console.log(e.stack);
    console.log("Pass", e.message);
  }
  console.log("=========================================================");
}

printTestCase("(let x 1 x)");
// printTestCase("  (let y (lambda (x) (succ x)) y)");
printTestCase("  (let y (lambda (x:int) (+ 1 x)) y)");
printTestCase("  (let y (lambda (x:int z:int) (+ z x)) y)");
printTestCase("  ((lambda (x:bool) x) #t)");
printTestCase("  ((lambda (x:bool y:bool) x) #t #f)");
printTestCase("  ((lambda (x:bool y:bool) y) #t #f)");
printTestCase("  ((lambda (x:bool y:int z:int) (if x y z)) #t 1 2)");
printTestCase("  ((lambda (x:bool y:int z:int) (if x y z)) #f 1 2)");
printTestCase(`  (let plus (lambda (x:int y:int) (+ x y)) (plus 2 3))`);
printTestCase(`  (let sub (lambda (x:int y:int) (- x y)) (sub 2 3))`);
printTestCase(
  `(let addN
        (lambda (N:int) (lambda (x:int) (+ x N)))
        (let add1
             (addN 1)
             (add1 42)))`,
);

printErrorTestCase("(let x");
printErrorTestCase("((lambda (x: bool) x) 1)");
printErrorTestCase("(if 1 2 3)");
printErrorTestCase("(if #t #f 3)");
printErrorTestCase(`(let plus (lambda (x:int y:int) (+ x y)) (plus 3))`);
printErrorTestCase(`(let plus (lambda (x:int y:int) (+ x y)) (plus "hi" 3))`);
printErrorTestCase(`(let plus (lambda (x:int y:int) (+ y)) (plus 2 3))`);
printErrorTestCase(`(let plus (lambda (x:int y:int) (+ "hi" y)) (plus 2 3))`);
printErrorTestCase(
  `(let do-num-op (lambda (op) (op 2 3)) (do-num-op string-concat))`,
);
