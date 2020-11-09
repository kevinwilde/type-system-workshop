# Tokens and terms for our language

Let's define the tokens for our language (which our lexer will output and parser will consume) and terms (which our parser will output and typechecker and interpreter will both consume). The tokens follow from the syntax defined previously, and the terms follow pretty much one-to-one with the grammar we defined.

## Tokens

Our lexer will consume the source code and translate it into a sequence of these tokens.

```typescript
type Token =
  | { tag: "LPAREN" }
  | { tag: "RPAREN" }
  | { tag: "COLON" }
  | { tag: "ARROW" }
  | { tag: "LET" }
  | { tag: "IF" }
  | { tag: "AND" }
  | { tag: "OR" }
  | { tag: "LAMBDA" }
  | { tag: "EMPTY" }
  | { tag: "BOOL"; val: boolean }
  | { tag: "INT"; val: number }
  | { tag: "STR"; val: string }
  | { tag: "IDEN"; name: string };
```

In a more serious implementation, we would also want to include source information (such as line and column number) with each token so that we can point back to the source code when there is an error. For simplicity, we are not going to have this.

## Terms

Our parser will consume the (flat) sequence of tokens produced by the lexer and produce a tree of these terms.

```typescript
type Term =
  | { tag: "TmInt"; val: number }
  | { tag: "TmStr"; val: string }
  | { tag: "TmBool"; val: boolean }
  | { tag: "TmVar"; name: string }
  | { tag: "TmEmpty" }
  | { tag: "TmCons"; car: Term; cdr: Term }
  | { tag: "TmIf"; cond: Term; then: Term; else: Term }
  | { tag: "TmLet"; name: string; val: Term; body: Term }
  | {
      tag: "TmAbs";
      params: { name: string; typeAnn: Type | null }[];
      body: Term;
    }
  | { tag: "TmApp"; func: Term; args: Term[] };
```

Notice how this corresponds almost one-to-one with the grammar we defined:

```
<expression> =
  | <int>
  | <string>
  | <boolean>
  | <id>
  | empty
  | (and <expression> <expression>)
  | (or <expression> <expression>)
  | (cons <expression> <expression>)
  | (if <expression> <expression> <expression>)
  | (let <id> <expression> <expression>)
  | (lambda (<id>:<type> ...) <expression>)
  | (<expression> <expression> ...)
```

You may notice that we don't have terms for `and` and `or`. This was done because both of these expressions can be translated into an equivalent `if` expression. Specifically,

`(and expr1 expr2)` is equivalent to `(if expr1 expr2 #f)`

and

`(or expr1 expr2)` is equivalent to `(if expr1 #t expr2)`

> Side note: The evaluation semantics of `and` and `or` where the second expression is only evaluated when necessary is also the reason why `and` and `or` cannot be implemented as functions in the standard library. Arguments to functions are all evaluated before the body of the function. More on this when we talk about the interpreter.

This allows us to provide more convenient semantics to the programmer without increasing the complexity of our typechecker or interpreter since they are unaware of `and` and `or` expressions. A less obvious example is that we could also eliminate the `"TmLet"` term since `let` expressions can be translated into an equivalent "TmApp" expression. However, TODO explain why we might choose to not do this
