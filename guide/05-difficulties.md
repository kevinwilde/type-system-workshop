# Difficulties in current implementation

## Lists

In our current implementation, it is not possible to write a function whose argument type(s) can vary. This makes it difficult to implement generic list functions. For example,

- `cons` is a function which takes an element of type `X` and a list of `X`s and returns a new list of `X`s. Ex. `(cons 1 (cons 2 empty))`, `(cons "hi" (cons "bye" empty))`
- `car` is a function which takes a list of `X`s and returns the first item in the list. Ex. `(car (cons 1 (cons 2 empty))) -> 1`, `(car (cons "hi" (cons "bye" empty))) -> "hi"`
- `cdr` is a function which takes a list of `X`s and returns a new list excluding the first item. Ex. `(cdr (cons 1 (cons 2 empty))) -> (cons 2 empty)`, `(cdr (cons "hi" (cons "bye" empty))) -> (cons "bye" empty)`
- `empty?` is a function which takes a list of `X`s and returns a boolean indicating whether the list is empty or not. Ex. `(empty? (cons 2 empty)) -> #f`, `(empty? empty) -> #t`

### Solutions for difficulties with Lists

What we need is some sort of polymorphism.

> "Type systems that allow a single piece of code to be used with multiple types
> are collectively known as polymorphic systems" (Pierce 340).

- _Parametric polymorphism_: think of generics in Java or TypeScript. Ex. `car<T>(List<T> list): T` takes a list of elements of type `T` and returns a type `T`. You "instantiate" the type variable with a concrete type at the place where you call this function.
- _Ad-hoc polymorphism_: most common example is "overloading" -- when a single function name is associated with multiple implementations that each have a different type signature and the compiler (or runtime system) chooses which implementation to call based on the types of the arguments you pass
- _Subtype polymorphism_: using subtypes to allow functions which accept a generic type to be called with more specific "child" types. Ex. usage of `interface{}` in go since go does not have parametric polymorphism ("generics")

## Recursive functions

Our current implementation is not able to typecheck recursive functions. Let's examine this code as an example:

```
(let factorial
    (lambda (n: int)
        (if (= n 0)
            1
            (* n (factorial (- n 1)))))
  (factorial 5))
```

This defines a recursive factorial function, and then tries to call it with `5`. As our typechecker evaluates a let expression `(let name value body)`, the sequence it goes through is to

1. determine the type of the value of the let expression
2. add a new entry to the Context, associating the name `factorial` with the type determined in step 1
3. determine the type of the body of the let expression using the updated Context

The problem we run into is in step 1. At this point, the name `factorial` is not in the Context yet, since we haven't yet determined its type. So in our current implementation, it looks like the call to `(factorial (- n 1))` in the value of the let expression is referencing some undefined variable `factorial`.

### A solution

There are a variety of ways to approach this issue, but one way we could solve it is by adding `factorial` to the Context before step 1, with some "to be determined" type. Unfortunately, we don't currently have a way to represent a "to be determined" type.

Representing a "to be determined" type sounds familiar, though, doesn't it? This is exactly the problem that type inference solves! We are given a program without type annotations, and need to determine the types of various terms within the program in order to say whether the program typechecks or not. We initially assign a "to be determined" type to function arguments, and methodically determine what those types must be.

Even better, this will also solve the difficulties we had with lists! When we determine the types of the expressions in the program, we will not need to constrain the type of a function's argument(s) to a single concrete type. Instead, the type can vary depending on how it's being called. For example, this program will successfully typecheck:

```
(let list-contains
  (lambda (lst val)
    (if (empty? lst)
      #f
      (if (= (car lst) val)
        #t
        (list-contains (cdr lst) val))))
  (and
    (list-contains (cons 1 (cons 2 empty)) 2)
    (list-contains (cons "hello" (cons "world" empty)) "world")))
```

The typechecker will determine that

- the overall result of this expression is a boolean
- the type of the `list-contains` function is `(-> (Listof 'a) 'a bool)`. That is, it is a function which takes two arguments, a `(Listof 'a)` and an `'a`, and returns a `bool`.
- it is called first with a `(Listof int)` and `int` and then called with a `(Listof str)` and `str`.

The typechecker would correctly reject this program:

```
...<same as above>...
    (list-contains (cons "hello" (cons "world" empty)) 3)))
```

since we are trying to call `list-contains` with a `(Listof str)` and an `int`.
