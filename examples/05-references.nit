let score = 10
let scoreReference:Ref<int> = ref score

scoreReference := 25
print(score)

let other = 4
let otherReference = ref other
scoreReference = otherReference
scoreReference := 9

print(score)
print(other)
