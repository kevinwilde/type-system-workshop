# type-system-workshop

## Set up

1. [Install deno](https://deno.land/manual/getting_started/installation)

2. If you are using VS Code, add [this extension](https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno). If you use some other editor, there are more instructions [here](https://deno.land/manual/getting_started/setup_your_environment) about setting up your environment.

3. Clone this repo

```
git clone https://github.com/kevinwilde/type-system-workshop.git
```

## Commands

Run tests:

```
deno test test/tests.ts
```

Run a source file:

```
deno run  --allow-read index.ts <path/to/file>
```

## Workshop format

- ~25 mins: overview of the programming language we are building
- ~25 mins: implementing a typechecker that relies on type annotations
- ~20 mins: discussing type inference and how the algorithm will work
- ~50 mins: implementing the typechecker with inference

## Checkpoints

Everything we're going to be implementing is already available in different branches on this repo. This is here in case you need it or miss something at any point, but don't look now since these are the "answer key."

[Spoilers]

- [Type checker relying on type annotations](https://github.com/kevinwilde/type-system-workshop/compare/01-no-inference-start-point...02-no-inference-stop-point)
- [Changes for type inference](https://github.com/kevinwilde/type-system-workshop/compare/02-no-inference-stop-point...03-inference-start-point), i.e. new test cases, changes in lexer/parser to make type annotations optional
- [Type checker with inference](https://github.com/kevinwilde/type-system-workshop/compare/03-inference-start-point...04-inference-completed?diff=split)

## References

The syntax of our language is mostly based on racket.

The implementation of the type checker is heavily aided by [_Types and Programming Languages_](https://books.google.com/books/about/Types_and_Programming_Languages.html?id=ti6zoAC9Ph8C) by Benjamin C. Pierce.

The implementations of the parser and interpreter include ideas from [Northwestern's Programming Languages course](https://users.cs.northwestern.edu/~robby/courses/321-2015-fall/) by Robby Findler and [University of Washington's Programming Languages course](https://www.coursera.org/learn/programming-languages-part-b) by Dan Grossman available on Coursera.
