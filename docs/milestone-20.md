# Milestone 20

Added differential testing that sends identical source through parse, lower, static
check and either tree interpreter or bytecode/VM. Arithmetic/precedence, shadowing,
assignment loops, branches, short circuit, for lowering and examples/loop.nit
produce exactly equal output. This validates independent execution machinery while
sharing specified primitive operations. Full check:all passes. Next M21 match.
