// Lexer fixture: syntax and runtime validation arrive in later milestones.
class Counter {
    let value:int
    func init(start:int) = { this.value = start }
}
let count = new Counter(007)
let alias = ref count
let double = lambda (x:int) -> x * 2
let values = map(double, [1, 2, 3])
if true and not false then {
    print("quote: \" and slash: \\")
}
for index in range(0, 5) { print(index) }
try { throw "sample" } catch error { print(error) }
