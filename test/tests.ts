import { Lexer } from "../lexer.ts";
import { createAST } from "../parser.ts";
import { evaluate } from "../interpreter.ts";
import { prettyPrint, printType, printValue } from "../utils.ts";
import { typeCheck } from "../typechecker.ts";

function assertResult(program: string, expectedResult: string) {
  const lexer = new Lexer(program);
  const ast = createAST(lexer);
  const _ = typeCheck(ast);
  const actualResult = printValue(evaluate(ast));
  const success = actualResult === expectedResult;
  if (!success) {
    console.log("AST:");
    console.log(prettyPrint(ast));
    console.log("Actual result:");
    console.log(actualResult);
    console.log("Expected result:");
    console.log(expectedResult);
    throw new Error("Test failed");
  }
}

function assertType(program: string, expectedType: string) {
  const lexer = new Lexer(program);
  const ast = createAST(lexer);
  const actualType = printType(typeCheck(ast));
  const success = actualType === expectedType;
  if (!success) {
    console.log("AST:");
    console.log(prettyPrint(ast));
    console.log("Actual type:");
    console.log(actualType);
    console.log("Expected type:");
    console.log(expectedType);
    throw new Error("Test failed");
  }
}

function expectTypeError(program: string) {
  const lexer = new Lexer(program);
  const ast = createAST(lexer);
  let res;
  try {
    res = typeCheck(ast);
  } catch (e) {
    // success
    return;
  }
  console.log("Actual result:");
  console.log(prettyPrint(res));
  console.log(`Expected type error`);
  throw new Error("Test failed: expected type error but got none");
}

Deno.test("defining a variable (int)", () => {
  let program = "(let x 1 x)";
  assertType(program, "int");
  assertResult(program, `1`);
});

Deno.test("defining a variable (string)", () => {
  let program = `(let x "hello" x)`;
  assertType(program, "str");
  assertResult(program, `"hello"`);
});

Deno.test("defining a variable (bool)", () => {
  let program = "(let x #t x)";
  assertType(program, "bool");
  assertResult(program, `#t`);
  program = "(let x #f x)";
  assertType(program, "bool");
  assertResult(program, `#f`);
});

Deno.test("not", () => {
  let program = "(let x #t (not x))";
  assertType(program, "bool");
  assertResult(program, `#f`);
  program = "(let x #f (not x))";
  assertType(program, "bool");
  assertResult(program, `#t`);
});

Deno.test("and", () => {
  let program = "(let x #t (and (not x) x))";
  assertType(program, "bool");
  assertResult(program, `#f`);
  program = "(let x #f (and (not x) #t))";
  assertType(program, "bool");
  assertResult(program, `#t`);
});

Deno.test("or", () => {
  let program = "(let x #t (or (not x) x))";
  assertType(program, "bool");
  assertResult(program, `#t`);
  program = "(let x #t (or (not x) #f))";
  assertType(program, "bool");
  assertResult(program, `#f`);
});

Deno.test("=", () => {
  let program = "=";
  assertType(program, "(-> int int bool)");

  program = "(= 2 2)";
  assertType(program, "bool");
  assertResult(program, `#t`);
  program = "(= 2 3)";
  assertType(program, "bool");
  assertResult(program, `#f`);
});

Deno.test("calling a function (with type ann)", () => {
  let program = "((lambda (x:bool) x) #t)";
  assertType(program, "bool");
  assertResult(program, `#t`);
});

Deno.test("[TypeError] calling a function", () => {
  let program = "((lambda (x:bool) x) 1)";
  expectTypeError(program);
});

Deno.test("calling a function with multiple args (with type ann)", () => {
  let program = " ((lambda (x:bool y:bool) x) #t #f)";
  assertType(program, "bool");
  assertResult(program, `#t`);
  program = " ((lambda (x:bool y:bool) y) #t #f)";
  assertType(program, "bool");
  assertResult(program, `#f`);
});

Deno.test("[TypeError] calling a function with multiple args", () => {
  let program = " ((lambda (x:bool y:bool) x) #t 2)";
  expectTypeError(program);
  program = " ((lambda (x:bool y:bool) x) 2 #t)";
  expectTypeError(program);
});

Deno.test("[TypeError] calling a function with wrong number of args", () => {
  let program = " ((lambda (x:bool y:bool) x) #t)";
  expectTypeError(program);
  program = " ((lambda (x:bool y:bool) x) #t #f #t)";
  expectTypeError(program);
});

Deno.test("conditionals (with type ann)", () => {
  let program = "((lambda (x:bool y:int z:int) (if x y z)) #t 1 2)";
  assertType(program, "int");
  assertResult(program, `1`);
  program = "((lambda (x:bool y:int z:int) (if x y z)) #f 1 2)";
  assertType(program, "int");
  assertResult(program, `2`);
  program =
    "((lambda (x:bool fn1:(-> int int int) fn2:(-> int int int)) (if x fn1 fn2)) #f + -)";
  assertType(program, "(-> int int int)");
});

Deno.test("[TypeError] conditionals (with type ann)", () => {
  let program = "((lambda (x: bool y: int z : int) (if x y z)) 1 2 3)";
  expectTypeError(program);
  program = `((lambda (x: bool y :int z:int) (if x y z)) #f 1 "hi")`;
  expectTypeError(program);
  program =
    "((lambda (x:bool fn1:(-> int int int) fn2:(-> int int int)) (if x fn1 fn2)) #f + string-concat)";
  expectTypeError(program);
});

Deno.test("addition (with type ann)", () => {
  let program = " (let plus (lambda (x: int y :int) (+ x y)) (plus 2 3))";
  assertType(program, "int");
  assertResult(program, `5`);
});

Deno.test("[TypeError] stdlib function", () => {
  let program = `(+ "hi" 3)`;
  expectTypeError(program);
  program = `(+ 3 "hi")`;
  expectTypeError(program);
});

Deno.test("[TypeError] using stdlib function (with type ann)", () => {
  let program = `(let plus (lambda (x:int y:int) (+ x y)) (plus "hi" 3))`;
  expectTypeError(program);
  program = `(let plus (lambda (x:int y:int) (+ x y)) (plus 3 "hi"))`;
  expectTypeError(program);
});

Deno.test("subtraction (with type ann)", () => {
  let program = " (let minus (lambda (x:int y:int) (- x y)) (minus 2 3))";
  assertType(program, "int");
  assertResult(program, `-1`);
});

Deno.test("conditional with equality (with type ann)", () => {
  let program =
    "((lambda (w:int x:int y:int z:int) (if (= w x) y z)) 42 42 1 2)";
  assertType(program, "int");
  assertResult(program, `1`);
  program = "((lambda (w:int x:int y:int z:int) (if (= w x) y z)) 42 43 1 2)";
  assertType(program, "int");
  assertResult(program, `2`);
});

Deno.test("string-length", () => {
  let program = `(string-length "hello")`;
  assertType(program, `int`);
  assertResult(program, `5`);
});

Deno.test("string-concat", () => {
  let program = `(let x (string-concat "hello" "world") x)`;
  assertType(program, "str");
  assertResult(program, `"helloworld"`);
});

Deno.test("closure (with type ann)", () => {
  let program = `
  (let addN
    (lambda (N:int) (lambda (x:int) (+ x N)))
    (let add1
         (addN 1)
         (add1 42)))
  `;
  assertType(program, "int");
  assertResult(program, `43`);
});

Deno.test("[TypeError] closure (with type ann)", () => {
  let program = `
  (let addN
    (lambda (N:int) (lambda (x:int) (+ x N)))
    (let add1
         (addN "hi")
         (add1 42)))
  `;
  expectTypeError(program);
  program = `
  (let addN
    (lambda (N:int) (lambda (x:int) (+ x N)))
    (let add1
         (addN 1)
         (add1 "hi")))
  `;
  expectTypeError(program);
  program = `
  (let addN
    (lambda (N:int) (lambda (x:int) (string-concat x N)))
    (let add1
         (addN 1)
         (add1 42)))
  `;
  expectTypeError(program);
});

Deno.test("closure not fooled by later shadow - maintains env where defined (with type ann)", () => {
  let program = `
  (let add1
      (let x 1 (lambda (y:int) (+ x y)))
      (let x 2 (add1 42)))
  `;
  assertType(program, "int");
  assertResult(program, `43`);
  // Even when shadow changes the type
  program = `
  (let add1
      (let x 1 (lambda (y:int) (+ x y)))
      (let x "hi" (add1 42)))
  `;
  assertType(program, "int");
  assertResult(program, `43`);
});

Deno.test("shadowing (with type ann)", () => {
  let program = `
  (let add2
      (let x 1 (let x 2 (lambda (y:int) (+ x y))))
      (add2 42))
  `;
  assertType(program, "int");
  assertResult(program, `44`);
  // Even when shadow changes the type
  program = `
  (let add2
      (let x "hi" (let x 2 (lambda (y:int) (+ x y))))
      (add2 42))
  `;
  assertType(program, "int");
  assertResult(program, `44`);
});

Deno.test("first class functions (with type ann)", () => {
  let program = `
  (let doTwice
      (lambda (f : (-> int int) x: int) (f (f x)))
      (let add1
          (lambda (x:int) (+ x 1))
          (doTwice add1 5)))
  `;
  assertType(program, "int");
  assertResult(program, `7`);
});

Deno.test("[TypeError] first class functions (with type ann)", () => {
  let program = `
  (let doTwice
      (lambda (f : (-> int  int) x: int) (f (f x)))
      (let add1
          (lambda (x:int) (+ x 1))
          (doTwice add1 "hi")))
  `;
  expectTypeError(program);
  program = `
  (let doTwice
      (lambda (f : (-> int  int) x: int) (f (f x)))
      (let add1
          (lambda (x:str) (string-concat x "world"))
          (doTwice add1 "hi")))
  `;
  expectTypeError(program);
});

Deno.test("first class function with stdlib (with type ann)", () => {
  let program = `
  (let doTwice
      (lambda (f:(-> int int int) x:int y:int) (f x (f x y)))
      (doTwice + 5 8))
  `;
  assertType(program, "int");
  assertResult(program, `18`);
  program = `
  (let doTwice
      (lambda (f:(-> str str str) x:str y:str) (f x (f x y)))
      (doTwice string-concat "Be" " Rhexa"))
  `;
  assertType(program, "str");
  assertResult(program, `"BeBe Rhexa"`);
});

Deno.test("[TypeError] first class functions (with type ann)", () => {
  let program = `
  (let doTwice
    (lambda (f:(-> int int int) x:int y:int) (f x (f x y)))
    (doTwice string-concat 5 8))
  `;
  expectTypeError(program);
  program = `
  (let doTwice
    (lambda (f:(-> int int int) x:int y:int) (f x (f x y)))
    (doTwice + 5 "hi"))
  `;
  expectTypeError(program);
  program = `
  (let doTwice
    (lambda (f:(-> str str str) x:str y:str) (f x (f x y)))
    (doTwice + "Be" " Rhexa"))
  `;
  expectTypeError(program);
  program = `
  (let doTwice
    (lambda (f:(-> str str str) x:str y:str) (f x (f x y)))
    (doTwice string-concat 2 " Rhexa"))
  `;
  expectTypeError(program);
});

//// Recursive functions
// Deno.test("naive factorial (with type ann)", () => {
//   const g = `
//     (lambda (n: int)
//       (if (= n 0)
//           1
//           (* n (factorial (- n 1)))))
//   `;
//   let program = `(let factorial ${g} factorial)`;
//   assertType(program, `(-> int int)`);
//   // program = `(let factorial ${g} (factorial 0))`;
//   // assertResult(program, `1`);
//   // program = `(let factorial ${g} (factorial 1))`;
//   // assertResult(program, `1`);
//   // program = `(let factorial ${g} (factorial 2))`;
//   // assertResult(program, `2`);
//   // program = `(let factorial ${g} (factorial 3))`;
//   // assertResult(program, `6`);
//   // program = `(let factorial ${g} (factorial 4))`;
//   // assertResult(program, `24`);
// });

// Deno.test("recursive function that takes int returns str", () => {
//   const g = `
//     (lambda (n: int)
//       (if (= n 0)
//           ""
//           (string-concat "a" (a-n-times (- n 1)))))
//   `;
//   let program = `(let a-n-times ${g} a-n-times)`;
//   assertType(program, "(-> int str)");
//   program = `(let a-n-times ${g} (a-n-times 0))`;
//   assertType(program, "str");
//   assertResult(program, `""`);
//   program = `(let a-n-times ${g} (a-n-times 1))`;
//   assertResult(program, `"a"`);
//   program = `(let a-n-times ${g} (a-n-times 2))`;
//   assertResult(program, `"aa"`);
//   program = `(string-concat (let a-n-times ${g} (a-n-times 2)) "b")`;
//   assertResult(program, `"aab"`);
// });

// Deno.test("naive fibonacci", () => {
//   const g = `
//     (lambda (n:int)
//       (if (= n 0)
//           0
//           (if (= n 1)
//             1
//             (+ (fibonacci (- n 1)) (fibonacci (- n 2))))))
//   `;
//   let program = `(let fibonacci ${g} fibonacci)`;
//   assertType(program, "(-> int int)");
//   program = `(let fibonacci ${g} (fibonacci 0))`;
//   assertType(program, "int");
//   assertResult(program, `0`);
//   program = `(let fibonacci ${g} (fibonacci 1))`;
//   assertResult(program, `1`);
//   program = `(let fibonacci ${g} (fibonacci 2))`;
//   assertResult(program, `1`);
//   program = `(let fibonacci ${g} (fibonacci 3))`;
//   assertResult(program, `2`);
//   program = `(let fibonacci ${g} (fibonacci 4))`;
//   assertResult(program, `3`);
//   program = `(let fibonacci ${g} (fibonacci 5))`;
//   assertResult(program, `5`);
//   // Naive algorithm too slow
//   // program = `(let fibonacci ${g} (fibonacci 50))`;
//   // assertResult(program, `12586269025`);
//   program = `(let fibonacci ${g} (+ (fibonacci 5) (fibonacci 6)))`;
//   assertType(program, "int");
//   assertResult(program, `13`);
// });

// Deno.test("smart fibonacci", () => {
//   let fib = (arg: number) => (`
//     (let smart-fib
//       (lambda (n: int)
//           (let helper
//             (lambda (i: int prev1: int prev2: int)
//                     (if (= i n)
//                         prev2
//                         (helper (+ i 1) (+ prev1 prev2) prev1)))
//             (helper 0 1 0)))
//       (smart-fib ${arg}))
//   `);
//   let program = fib(0);
//   assertType(program, "int");
//   assertResult(program, `0`);
//   program = fib(1);
//   assertResult(program, `1`);
//   program = fib(2);
//   assertResult(program, `1`);
//   program = fib(3);
//   assertResult(program, `2`);
//   program = fib(4);
//   assertResult(program, `3`);
//   program = fib(5);
//   assertResult(program, `5`);
//   program = fib(50);
//   assertResult(program, `12586269025`);
//   program = fib(`"hi"` as any);
//   expectTypeError(program);
// });
