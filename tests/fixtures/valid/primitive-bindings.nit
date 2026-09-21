let count:int = 10
let enabled:bool = true
let title:string = "NITLang"
{
    let count = count + 2
    let enabled = not enabled
    {
        let title = "inner"
        print(title)
    }
    print(count)
    print(enabled)
}
print(count)
print(title)
