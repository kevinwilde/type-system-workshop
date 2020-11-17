# Difficulties in current implementation

## Lists

In our current implementation, it is not possible to write a function whose argument type(s) can vary. This makes it difficult to implement generic list functions. For example,

- `cons` is a function which takes an element of type `X` and a list of `X`s and returns a new list of `X`s. Ex. `(cons 1 (cons 2 empty))`, `(cons "hi" (cons "bye" empty))`
- `car` is a function which takes a list of `X`s and returns the first item in the list. Ex. `(car (cons 1 (cons 2 empty))) -> 1`, `(car (cons "hi" (cons "bye" empty))) -> "hi"`
- `cdr` is a function which takes a list of `X`s and returns a new list excluding the first item. Ex. `(cdr (cons 1 (cons 2 empty))) -> (cons 2 empty)`, `(cdr (cons "hi" (cons "bye" empty))) -> (cons "bye" empty)`
- `empty?` is a function which takes a list of `X`s and returns a boolean indicating whether the list is empty or not. Ex. `(empty? (cons 2 empty)) -> #f`, `(empty? empty) -> #t`

What we need is some sort of polymorphism.

> "Type systems that allow a single piece of code to be used with multiple types
> are collectively known as polymorphic systems" (Pierce 340).

### Approaches

- _Parametric polymorphism_: think of generics in Java or TypeScript. Ex. `car<T>(List<T> list): T` takes a list of elements of type `T` and returns a type `T`. You "instantiate" the type variable with a concrete type at the place where you call this function.
- _Ad-hoc polymorphism_: most common example is "overloading" -- when a single function name is associated with multiple implementations that each have a different type signature and the compiler (or runtime system) chooses which implementation to call based on the types of the arguments you pass
- _Subtype polymorphism_: using subtypes to allow functions which accept a generic type to be called with more specific "child" types. Ex. usage of `interface{}` in go since go does not have parametric polymorphism ("generics")

## Recursive functions
