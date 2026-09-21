# Milestone 13

Added explicit ClassValue/ObjectValue/BoundMethodValue representations. Construction
allocates each field as an uninitialized Store location, binds this, invokes init,
checks all fields initialized, and returns object identity. Member access distinguishes
field reads and bound methods; field writes update locations. Static checking validates
members, constructors, method arguments/results and field assignment. Tests cover
aliasing, identity, init/methods and invalid construction. Full check:all passed.
Next M14 inheritance. Professor question: why are fields not JS properties? Store
locations make mutation/reference behavior uniform and observable in the model.
