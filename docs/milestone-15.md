# Milestone 15

Dynamic dispatch is validated explicitly across three inheritance levels. Static
member checking uses the declared receiver type, while the runtime bound-method
lookup begins at ObjectValue.classValue and walks upward. Consequently an inherited
base method calling `this.speak()` selects the most-derived override. Inherited
methods also access the same field-location map. Full check:all passes.

Professor question: why not select the method from the variable's static class?
Static type controls availability/signature; runtime class controls behavior, which
is the defining rule of overriding. Next M16 exceptions.
