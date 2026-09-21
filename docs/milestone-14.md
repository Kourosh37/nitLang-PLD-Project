# Milestone 14

Added nominal single inheritance and class subtyping. Parents must be earlier class
declarations; self/unknown parents fail statically. Field/method tables inherit,
field redeclaration is rejected, and override parameters are invariant with
covariant results through centralized assignability. Runtime construction includes
inherited fields and init/method lookup walks the parent chain. Full check:all
passes. Next M15 focused dynamic dispatch. No super syntax is provided.
