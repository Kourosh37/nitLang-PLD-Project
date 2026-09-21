func factorial(n:int):int = {
  if n == 0 then {
    return 1
  } else {
    return n * factorial(n - 1)
  }
}

func makeAdder(base:int):Fn(int) -> int = {
  return lambda (value:int) -> base + value
}

let addTen = makeAdder(10)
print(factorial(5))
print(addTen(7))
