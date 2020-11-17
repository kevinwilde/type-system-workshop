# Grammar for our language

For simplicity, every program will be a single expression.

The grammar for our language will be:

```
Note: ... signifies zero or more of the item which precedes it

<expression> =
  | <int>
  | <string>
  | <boolean>
  | <id>
  | empty:<type>
  | (and <expression> <expression>)
  | (or <expression> <expression>)
  | (cons <expression> <expression>)
  | (if <expression> <expression> <expression>)
  | (let <id> <expression> <expression>)
  | (lambda (<id>:<type> ...) <expression>)
  | (<expression> <expression> ...)

<type> =
  | int
  | str
  | bool
  | (Listof <type>)
  | (-> (<type> ...) <type>)
```

Although this is the complete grammar, there are additional rules that the type system will enforce. For example:

- `<id>` must refer to a variable which is in scope
- the two arguments to both `and` and `or` must have type boolean
- the 2nd expression passed to `cons` must be a cons expression with the same element type or `empty`
- the 1st expression passed to `if` must be a boolean and the 2nd and 3rd expressions must have the same type
- the 1st expression in `(<expression> ...)` must be a function, the number of remaining expressions should match the number of arguments this function expects, and the types of those arguments should match the types expected by the function

Examples:

`42`

`"hello"`

`#t`

`x` <- undefined variable

`empty:int`

`(and #t #f)`

`(or #t #f)`

`(and #t 42)` <- TypeError: expected type boolean but got type int

`(or "hello" #f)` <- TypeError: expected type boolean but got type string

`(cons 42 empty)`

`(cons 42 (cons 43 empty))`

`(cons 42 (cons "hello" empty))` <- TypeError: element types should match

`(if #t "hello" "goodbye")`

`(if #t "hello" 42)` <- TypeError: 2nd and 3rd expressions should have same type

`(if 42 "hello" "goodbye")` <- TypeError: 1st expression should be boolean

`(let x 42 (+ x 1))` <- where + is defined as a function in std lib

`(lambda (x:int) (+ x 1))`

`((lambda (x:int) (+ x 1)) 42)`

`((lambda (x:int) (+ x 1)) 42 100)` <- TypeError: wrong number of arguments

`((lambda (x:int) (+ x 1)) "hello")` <- TypeError: argument 1 expected type int but got type string

```
(let add1 (lambda (x:int) (+ x 1))
  (add1 42))
```
