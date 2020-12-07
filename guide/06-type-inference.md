# Type Inference

The general idea is to

- first, assign "to be determined" types and generate constraints involving those types
- then, unify all of the constraints. If you run into a contradiction (i.e. some constraint that cannot be solved) while unifying, the program is not well-typed.

Let's discuss in more detail what each of these mean.

## Assigning types and generating constraints

Given a term, we can assign it a type and generate constraints for that term. Specifically,

| Term                                           | Assigned Type      | Constraints                                                                                                               |
| ---------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| TmInt                                          | `TyInt`            |                                                                                                                           |
| TmStr                                          | `TyStr`            |                                                                                                                           |
| TmBool                                         | `TyBool`           |                                                                                                                           |
| TmVar                                          | Look up in Context |                                                                                                                           |
| TmEmpty                                        | `(Listof T1)`      |                                                                                                                           |
| TmCons<br />`(cons <car_1> <cdr_2>)`           | `(Listof T1)`      | `(Listof T1)` must match `T2` where `T1` is the type of `car` and `T2` is type of `cdr`                                   |
| TmIf<br />`(if <cond_1> <then_2> <else_3>)`    | `T2`               | <ul><li>Type of condition `T1` must match bool</li><li>Type of then term `T2` must match type of else term `T3`</li></ul> |
| TmLet<br />`(let <name> <value_1> <body_2>`)   | `T2`               |                                                                                                                           |
| TmAbs<br />`(lambda (<params_1>...) <body_2>)` | `(-> T1... T2)`    |                                                                                                                           |
| TmApp<br />`(<func_1> <args_2>...)`            | `T3`               | `T1` must match `(-> T2... T3)`                                                                                           |

You'll notice that certain terms, such as `TmInt`, can immediately be assigned a known type. Others are assigned a "to be determined" type, represented above as `T1`, `T2`, etc.

## Unifying constraints

Once we have assigned types and generated constraints in the form of "Type A must match Type B", we need to "unify" those constraints. There are two cases to consider:

1. If Type A or Type B is a "to be determined" type, then replace all instances of it in the remaining constraints with the type it must match. For example, given the constraint "`T1` must match `(Listof int)`", we should replace any further instances of `T1` in other constraints with `(Listof int)`.

2. Otherwise, verify that the constraint is not a contradiction and deduce any new constraints. For example,

- given the constraint "`(Listof T2)` must match `(Listof int)`" we can verify that these are both `TyList` so there is no contradiction and can deduce a new constraint "`T2` must match `int`".
- given the constraint "`(-> int T3)` must match `(-> T4 T5)`" we can verify that these are both `TyArrow` and have one argument so there is no contradiction and can deduce two new constraints "`int` must match `T4`" and "`T3` must match `T5`".
- given the constraint "`bool` must match `int`" we fail because this is a contradiction.

### Visual example

https://docs.google.com/presentation/d/1_MlBOa6sGNDq-2Qcv2HHHsLWKJJ2Cvg83DzMRee4Y8A/

### Implementation hints

- Stash/commit your changes and check out the branch `03-inference-start-point`
- This is a depth-first tree traversal. Although looking at the example might give the impression that it will require a lot of effort to build the tree or attach types to nodes in the tree, that will not be the case in our implementation. Depth-first traversals can be accomplished quite elegantly with recursion.
