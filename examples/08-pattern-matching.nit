func category(value:int):string = {
  return match value {
    0 => "zero";
    1 => "one";
    _ => "many"
  }
}

print(category(0))
print(category(8))
print(match true {
  true => "enabled";
  false => "disabled"
})
