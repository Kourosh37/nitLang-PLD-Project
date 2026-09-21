func requirePositive(value:int):int = {
  if value < 1 then {
    throw "expected a positive value"
  }
  return value
}

try {
  print(requirePositive(0))
} catch problem {
  print(problem)
}

print(requirePositive(3))
