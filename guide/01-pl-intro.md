# Programming Language Implementation Intro

The programming language we are creating consists of the following pieces:

1. Lexer
2. Parser
3. Type checker
4. Interpreter

The _lexer_ takes the source code as input and produces a sequence of tokens.

The _parser_ takes the sequence of tokens as input and produces an Abstract Syntax Tree (AST).

The _type checker_ takes the AST as input and either returns or fails.

The _interpreter_ takes the AST as input and evaluates it, returning the result.

```
                                                            ------------------------------------
                                                           |                                    |
                  -------                   --------       |        -------------               v      -------------
Source code ---> | Lexer | --- Tokens ---> | Parser | --- AST ---> | Typechecker | --(success)--  --> | Interpreter |
                  -------                   --------                -------------    \                 -------------
                                                                                    (fail)
                                                                                       \
                                                                                        X
```

```typescript
import { Lexer } from "./lexer";
import { createAST } from "./parser";
import { typeCheck } from "./typechecker";
import { evaluate } from "./interpreter";
import { print } from "./utils";

function executeProgram(program: string) {
  const lexer = new Lexer(program);
  const ast = createAST(lexer);
  const _ = typeCheck(ast);
  print(evaluate(ast));
}
```
