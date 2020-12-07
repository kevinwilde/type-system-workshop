# Grammar for our language

For simplicity, every program will be a single expression.

The grammar for our language will be:

```
Note: ... signifies zero or more of the item which precedes it

<expression> =
  | <bool>
  | <int>
  | <str>
  | <id>
  | (and <expression> <expression>)
  | (or <expression> <expression>)
  | (if <expression> <expression> <expression>)
  | empty
  | (cons <expression> <expression>)
  | (let <id> <expression> <expression>)
  | (lambda (<id>:<type> ...) <expression>)
  | (<expression> <expression> ...)

<type> =
  | bool
  | int
  | str
  | (Listof <type>)
  | (-> <type> ... <type>)
```

| Case                                          | Examples                                                                                                                                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `<bool>`                                      | <ul><li>`#t`</li><li>`#f`</li></ul>                                                                                                                                                                                                        |
| `<int>`                                       | <ul><li>`0`</li><li>`1`</li><li>`42`</li></ul>                                                                                                                                                                                             |
| `<str>`                                       | <ul><li>`"hello"`</li><li>`"world"`</li></ul>                                                                                                                                                                                              |
| `<id>`                                        | <ul><li>`x`</li><li>`y`</li><li>`my-var`</li><li>`+`</li><li>`string-concat`</li><li>`empty?`</li></ul>                                                                                                                                    |
| `(and <expression> <expression>)`             | <ul><li>`(and #t #f)`</li><li>`(and (> x 1) (< x 5))`</li></ul>                                                                                                                                                                            |
| `(or <expression> <expression>)`              | <ul><li>`(or #t #f)`</li><li>`(or (< x 10) (> x 50))`</li></ul>                                                                                                                                                                            |
| `(if <expression> <expression> <expression>)` | <ul><li>`(if #t 1 0)`</li><li>`(if (< x 10) "small" "big")`</li></ul>                                                                                                                                                                      |
| `empty`                                       | `empty`                                                                                                                                                                                                                                    |
| `(cons <expression> <expression>)`            | <ul><li>`(cons 1 empty)`</li><li>(cons 2 (cons 1 empty))</li><li>(cons "hello" (cons "world" empty))</li></ul>                                                                                                                             |
| `(let <id> <expression> <expression>)`        | <ul><li>`(let x 1 (+ x 1))`</li><li>`(let x 2 (cons x empty))`</li></ul>                                                                                                                                                                   |
| `(lambda (<id>:<type> ...) <expression>)`     | <ul><li>`(lambda (x:int) (+ x 1))`</li><li>`(lambda (x:bool y:int z:int) (if x y z))`</li><li>`(lambda (x:int) (if (> x 0) "positive" (if (= x 0) "zero" "negative")))`</li></ul>                                                          |
| `(<expression> <expression> ...)`             | <ul><li>`(+ x 1)`</li><li>`((lambda (x:int) (+ x 1)) 42)`</li><li>`((lambda (x:int y:int) (+ x y)) 42 43)`</li><li><pre>(let multiply-by-two<br>&nbsp;&nbsp;(lambda (x:int) (\* x 2))<br>&nbsp;&nbsp;(multiply-by-two 42))</pre></li></ul> |

Although this is the complete grammar, there are additional rules that the type system will need to enforce. The examples in the table above are all well-typed programs. They conform to the grammar as well as the typing rules. However, it is possible to write a program which satisfies the grammar but has a type error.

Some examples of rules the type system will enforce are:

- `<id>` must refer to a variable which is in scope
- the two arguments to both `and` and `or` must have type boolean
- the 2nd expression passed to `cons` must be a cons expression with the same element type or `empty`
- the 1st expression passed to `if` must be a boolean and the 2nd and 3rd expressions must have the same type
- the 1st expression in `(<expression> ...)` must be a function, the number of remaining expressions should match the number of arguments this function expects, and the types of those arguments should match the types expected by the function

Examples of programs that conform to the grammar but have a type error are:

- `x` <- TypeError: undefined variable
- `(and #t 42)` <- TypeError: expected type boolean but got type int
- `(or "hello" #f)` <- TypeError: expected type boolean but got type string
- `(if #t "hello" 42)` <- TypeError: 2nd and 3rd expressions should have same type
- `(if 42 "hello" "goodbye")` <- TypeError: 1st expression should be boolean
- `(cons 42 (cons "hello" empty))` <- TypeError: element types should match
- `((lambda (x:int) (+ x 1)) 42 100)` <- TypeError: wrong number of arguments
- `((lambda (x:int) (+ x 1)) "hello")` <- TypeError: argument 1 expected type int but got type string
