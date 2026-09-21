# Hoare logic examples

Hoare triples `{P} S {Q}` below state partial correctness: if precondition P holds
and S terminates normally without a diagnostic/throw, postcondition Q holds.
Variables denote values stored at their resolved locations.

## Example 1: assignment

Precondition: `x = 4`

```nitlang
x = x + 3
```

Postcondition: `x = 7`

Assignment axiom: `{Q[x <- E]} x = E {Q}`. Choose Q as `x = 7` and E as `x + 3`.
Substitution gives precondition `x + 3 = 7`, equivalent here to `x = 4`.
The right side reads the original cell value, then assignment writes 7 to the
same location. Safe-integer checking succeeds, establishing the triple.

## Example 2: factorial loop

Precondition: `n = N and N >= 0 and result = 1`

```nitlang
while n > 0 do {
    result = result * n
    n = n - 1
}
```

Postcondition: `result = N! and n = 0`

Use loop invariant `I: result * n! = N! and n >= 0`.

Initialization: before the loop, `result * n! = 1 * N! = N!`, and n is nonnegative.

Preservation: assume I and guard `n > 0`. After `result = result * n`, call the
new value result'. After `n = n - 1`, call the new value n'. Then
`result' * n'! = (result * n) * (n - 1)! = result * n! = N!`, and n' >= 0.

Exit: I and `not (n > 0)` together with n >= 0 imply n = 0. Therefore
`result * 0! = result = N!`, proving the postcondition.

Termination for total correctness follows from variant n over nonnegative ints:
each iteration decreases it by one and the guard stops at zero. The proof assumes
N! remains within NITLang's checked int range; otherwise execution reports overflow
and the normal-termination premise does not hold.

## Conditional rule reminder

For `{P and b} S1 {Q}` and `{P and not b} S2 {Q}`, infer
`{P} if b then S1 else S2 {Q}`. NITLang requires b to have bool type; the rule
does not use numeric/string truthiness.
