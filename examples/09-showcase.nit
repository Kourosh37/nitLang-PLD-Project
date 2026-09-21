func fibonacci(n:int):int = {
  if n < 2 then {
    return n
  } else {
    return fibonacci(n - 1) + fibonacci(n - 2)
  }
}

class Reporter {
  let prefix:string

  func init(prefix:string) = {
    this.prefix = prefix
  }

  func status(ok:bool):string = {
    return match ok {
      true => "ready";
      false => "failed"
    }
  }
}

let reporter = new Reporter("NITLang")
let values = map(lambda (n:int) -> fibonacci(n), [0, 1, 2, 3, 4, 5, 6])
let completed = false
let completion = ref completed

try {
  print(values)
  completion := true
} catch problem {
  print(problem)
}

print(reporter.prefix)
print(reporter.status(completed))
