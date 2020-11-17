# Typechecker Introduction

The focus of this session will be on the implementation of the typechecker. First, we will implement a typechecker that relies on explicit annotations added by the programmer. Then, we will implement a separate typechecker that infers the type of function arguments. It will still be a full typechecker, but will not require any annotations to be added by the programmer.

Start on the branch `01-no-inference` and open the `typechecker.ts` file. This is where we'll be making changes. You'll notice that the list type is commented out and similarly, the terms for `empty` and `cons` are commented out in `parser.ts`. We'll come back to lists after we complete the rest.

## Implementation notes

- Remember that the typechecker takes in the AST that is produced by the parser.
- The signature for the `typeCheck` function is there for you. It receives one argument, a `Term`, and will return the resulting `Type` of this term or throw an error if the program does not type check.
- In my implementation, I'll be using a switch statement on `term.tag` and have a different case for each kind of Term.
- A few of the cases are extremely simple.
