# Formal semantics

This document describes the implemented checked Core language. Surface `for`,
`and`, `or`, grouping and empty statements are lowered first. Static checking is
a premise of execution; rules below do not repeat every type premise.

## Domains and judgments

- rho: Environment, mapping resolved binding IDs to Locations
- sigma: Store, mapping Locations to RuntimeValues
- `<e, rho, sigma> ⇓ <v, sigma'>`: expression e evaluates to value v and store sigma'
- `<s, rho, sigma> ⇓ <k, sigma'>`: statement s completes with k = Normal,
  Return(v), or Throw(v)
- `rho[b ↦ l]`: environment extended with binding b at location l
- `sigma[l ↦ v]`: store with cell l updated to v

Arguments and subexpressions evaluate left to right. A fresh location is written
`l fresh(sigma)`. Runtime faults yield a Diagnostic rather than a language Throw.

## Literals, variables and arithmetic

```text
----------------------------- [Literal]
<literal(v), rho, sigma> ⇓ <v, sigma>

rho(b) = l    sigma(l) = v
----------------------------- [Variable]
<b, rho, sigma> ⇓ <v, sigma>

<e1,rho,sigma> ⇓ <int(n1),sigma1>
<e2,rho,sigma1> ⇓ <int(n2),sigma2>
n = checkedInt(n1 + n2)
------------------------------------------------ [Add]
<e1 + e2,rho,sigma> ⇓ <int(n),sigma2>
```

Subtraction/multiplication are analogous. Division additionally requires n2 != 0
and truncates toward zero. `checkedInt` faults outside the symmetric safe-integer
range. Relational operators require int operands and yield bool. Equality requires
compatible primitive types (or class-related object identities). No host coercion
or truthiness is a premise.

## Bindings and assignment

```text
<e,rho,sigma> ⇓ <v,sigma1>    l fresh(sigma1)
------------------------------------------------ [Let]
<let b=e,rho,sigma> ⇓ <Normal,sigma1[l↦v]>
with subsequent statements evaluated under rho[b↦l]

rho(b)=l    <e,rho,sigma> ⇓ <v,sigma1>
------------------------------------------------ [Assign]
<b=e,rho,sigma> ⇓ <Normal,sigma1[l↦v]>
```

Implementation processes a block sequentially with one child Environment. A let
initializer runs before the new binding is defined. Assignment resolves its cell
before evaluating the right side. A ReferenceValue contains l; write-through uses
the same final store update without allocating another cell.

## Conditional and loop

```text
<c,rho,sigma> ⇓ <bool(true),sigma1>
<t,rho,sigma1> ⇓ <k,sigma2>
--------------------------------------- [IfTrue]
<if c then t else f,rho,sigma> ⇓ <k,sigma2>

<c,rho,sigma> ⇓ <bool(false),sigma1>
<f,rho,sigma1> ⇓ <k,sigma2>
--------------------------------------- [IfFalse]
<if c then t else f,rho,sigma> ⇓ <k,sigma2>
```

Only the selected branch evaluates. A while with false condition completes Normal.
With true condition, execute a fresh-scope body; Return/Throw propagate immediately.
On Normal, apply the while rule recursively to the resulting store. This matches
the tree interpreter. Lowered and/or uses conditional expressions, explaining
short circuit without separate evaluator rules.

## Closures and calls

A closure is `closure(params,body,rho_def)`. Its defining Environment is retained,
not copied values.

```text
<callee,rho,sigma0> ⇓ <closure(p1..pn,body,rho_def),sigma1>
<a1,rho,sigma1> ⇓ <v1,sigma2> ... <an,rho,sigma_n> ⇓ <vn,sigma_(n+1)>
l1..ln fresh    rho_call = rho_def[p1↦l1]...[pn↦ln]
sigma_args = sigma_(n+1)[l1↦v1]...[ln↦vn]
<body,rho_call,sigma_args> ⇓ <Return(v),sigma_final>
---------------------------------------------------------------- [CallReturn]
<callee(a1..an),rho,sigma0> ⇓ <v,sigma_final>
```

Normal completion returns void; Throw propagates. Named recursion allocates the
function location before storing its closure, so rho_def resolves the same binding.
Methods are bound closures with an additional read-only `this` cell containing the
receiver. Lookup starts at the receiver's runtime class.

## Exceptions

Throw(e) evaluates e and completes Throw(v). Sequential/block/call/loop rules
propagate Throw unchanged. Try evaluates its body; Normal and Return pass through.
On Throw(v), allocate the catch binding in a child environment and evaluate the
catch body. Runtime diagnostics are outside this completion relation and cannot
be caught by language try/catch.

## Denotational example

For side-effect-free integer expressions, let `E[[e]] : Environment × Store -> Int`:

```text
E[[n]](rho,sigma) = n
E[[x]](rho,sigma) = intPayload(sigma(rho(x)))
E[[e1 + e2]](rho,sigma) = checkedInt(E[[e1]](rho,sigma) + E[[e2]](rho,sigma))
```

Thus with sigma(rho(x)) = int(4), `E[[x + 3]](rho,sigma) = 7`. This restricted
denotation intentionally excludes effects; the big-step judgments model store
changes and evaluation order.
