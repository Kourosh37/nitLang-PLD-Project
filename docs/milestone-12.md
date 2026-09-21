# Milestone 12

ReferenceValue contains an existing Location; `ref identifier` never copies its
value. The checker requires mutable resolved variables and invariant Ref element
types. Reference assignment writes through the stored target; ordinary assignment
to a Ref variable changes which ReferenceValue its own cell contains. Tests cover
aliasing, rebinding, shadowing and invalid targets/types. Full check:all passed.
Next M13 objects. Professor question: is this JavaScript object reference behavior?
No: aliasing is explicitly defined in the NITLang Environment/Store model.
