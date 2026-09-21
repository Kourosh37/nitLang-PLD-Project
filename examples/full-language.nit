func fact(n:int):int = {
    if n == 0 then { return 1 } else { return n * fact(n - 1) }
}

func makeCounter(start:int) = {
    let value = start
    return lambda (step:int) -> value + step
}

class Base {
    let value:int
    func init(value:int) = { this.value = value }
    func label():string = { return "base" }
    func describe():string = { return this.label() }
}

class Derived extends Base {
    func label():string = { return "derived" }
    func doubled():int = { return this.value * 2 }
}

let object:Base = new Derived(7)
print(object.describe())
print(fact(5))

let add = makeCounter(10)
let values = map(lambda (x:int) -> add(x), [1, 2, 3])
print(values)

let original = 4
let alias = ref original
{
    let original = 100
    alias := original
}
print(original)

let sum = 0
for i in range(0, 4) { sum = sum + i }
print(sum)

func failAt(value:int):int = {
    if value == 2 then { throw "two" }
    return value
}
let i = 0
while i < 3 do {
    try { print(failAt(i)) } catch error { print(error) }
    i = i + 1
}

print(match object.label() {
    "derived" => true;
    _ => false
})
