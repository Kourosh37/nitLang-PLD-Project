// This complete example runs identically on the interpreter and VM.
let total = 0

for i in range(0, 6) {
  if i != 3 then {
    total = total + i
  }
}

while total < 15 do {
  total = total + 1
}

print(total)
print(total == 15 or false)
