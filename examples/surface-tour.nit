// Milestone 3: inspect with `bun run nitlang ast examples/surface-tour.nit`.
func makeAdder(x:int) = {
    return lambda (y:int) -> x + y
}
let addFive = makeAdder(5)
let doubled = map(lambda (x:int) -> x * 2, [1, 2, 3])
let counter = 0
let alias = ref counter
alias := 10

class Point {
    let x:int
    let y:int
    func init(a:int, b:int) = { this.x = a; this.y = b }
    func move(dx:int, dy:int) = {
        this.x = this.x + dx
        this.y = this.y + dy
    }
}
class ColoredPoint extends Point {
    func describe():string = { return "point" }
}
let p:Point = new ColoredPoint(2, 3)
p.move(1, 1)
for i in range(0, 3) {
    if i >= 1 and i != 2 then { print(addFive(i)) } else { print(i) }
}
while counter > 0 do { counter = counter - 1 }
try { throw "example" } catch problem { print(problem) }
