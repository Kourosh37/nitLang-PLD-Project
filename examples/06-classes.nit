class Shape {
  let name:string

  func init(name:string) = {
    this.name = name
  }

  func describe():string = {
    return this.name
  }

  func label():string = {
    return "shape"
  }
}

class Circle extends Shape {
  func label():string = {
    return "circle"
  }

  func fullLabel():string = {
    return this.describe()
  }
}

let shape:Shape = new Circle("unit circle")
print(shape.label())
print(shape.describe())
print(shape == shape)
