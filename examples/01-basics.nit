// Values, inference, annotations, operators, assignment, and shadowing.
let answer:int = 40 + 2
let greeting = "hello\nNITLang"
let ready = answer == 42 and not false
print(answer)
print(greeting)
print(ready)

{
  let answer = 7
  answer = answer * 3
  print(answer)
}

print(answer)
