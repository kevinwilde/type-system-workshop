# Type Inference

The general idea is to

- first, assign "to be determined" types and generate constraints involving those types
- then, unify all of the constraints. If you run into a contradiction (i.e. some constraint that cannot be solved) while unifying, the program is not well-typed.

Let's discuss in more detail what each of these mean.

## Assigning types and generating constraints

Given a term, we can assign it a type and generate constraints for that term. Specifically,

| Term                                           | Assigned Type      | Constraints                                                                                                         |
| ---------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| TmInt                                          | `TyInt`            |                                                                                                                     |
| TmStr                                          | `TyStr`            |                                                                                                                     |
| TmBool                                         | `TyBool`           |                                                                                                                     |
| TmVar                                          | Look up in Context |                                                                                                                     |
| TmEmpty                                        | `(Listof T1)`      |                                                                                                                     |
| TmCons<br />`(cons <car_1> <cdr_2>)`           | `(Listof T1)`      | `(Listof T1)` must be `T2` where `T1` is the type of `car` and `T2` is type of `cdr`                                |
| TmIf<br />`(if <cond_1> <then_2> <else_3>)`    | `T2`               | <ul><li>Type of condition `T1` must be bool</li><li>Type of then term `T2` must be type of else term `T3`</li></ul> |
| TmLet<br />`(let <name> <value_1> <body_2>`)   | `T2`               |                                                                                                                     |
| TmAbs<br />`(lambda (<params_1>...) <body_2>)` | `(-> T1... T2)`    |                                                                                                                     |
| TmApp<br />`(<func_1> <args_2>...)`            | `T3`               | `T1` must be `(-> T2... T3)`                                                                                        |

## Unifying constraints
