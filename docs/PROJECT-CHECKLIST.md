# چک‌لیست انطباق پروژه NITLang

این سند نیازمندی‌های فایل `project.pdf` را به پیاده‌سازی، تست و مثال اجرایی
متصل می‌کند. شماره صفحه‌ها مطابق PDF شانزده‌صفحه‌ای ارائه‌شده است. معیار وضعیت
در این جدول، رفتار قابل اجرا و تست‌شده است؛ صرف وجود نام یک قابلیت کافی نیست.

## نتیجه کلی

- [x] تمام قابلیت‌های فنی اجباری PDF در Tree-Walk Interpreter پیاده‌سازی شده‌اند.
- [x] subset اجباری Bytecode/VM پیاده‌سازی و با Interpreter مقایسه شده است.
- [x] دو extension مستقل، Type Inference و Pattern Matching، وجود دارند.
- [x] خطاهای زبان در سه گروه Syntax، Type و Runtime گزارش می‌شوند.
- [x] تست‌ها برنامه واقعی NITLang را از lexer تا runtime اجرا می‌کنند و خروجی
      hard-codeشده در خود interpreter وجود ندارد.
- [x] source code، تست‌ها، مثال‌ها، README، راهنمای اجرا و گزارش طراحی موجودند.
- [ ] `CONTRIBUTIONS.md` فقط در صورت دونفره بودن گروه لازم است. پروژه فعلی این
      فایل را ندارد؛ برای تحویل انفرادی نیازی به آن نیست.

## معماری و Front-End

### دریافت فایل و اجرای کامل برنامه، صفحات ۲ و ۳

- [x] CLI فایل `.nit` را می‌خواند و فرمان‌های `run`، `check`، `ast`،
      `core-ast`، `bytecode` و `vm` را ارائه می‌کند.
- مسیر اجرا: `src/cli/main.ts` و `src/cli/cli.ts`.
- orchestration مراحل در `src/pipeline.ts` است: `check` ابتدا parse، desugar،
  resolve و type-check را انجام می‌دهد؛ `run` فقط نتیجه checked را به Interpreter
  می‌دهد و `runVm` نیز بعد از همان بررسی‌ها compile و execute می‌کند.
- تست شاهد: `tests/cli.test.ts` و `tests/cli-process.test.ts` واقعاً process مربوط
  به CLI را اجرا و exit code، stdout و stderr را بررسی می‌کنند.

### Lexer، Parser و AST، صفحات ۲ و ۳

- [x] Lexer دستی، Parser دارای precedence و source span کامل پیاده‌سازی شده‌اند.
- [x] Surface AST و Core AST دو مدل جدا هستند.
- فایل‌ها: `src/frontend/lexer.ts`، `src/frontend/parser.ts`،
  `src/frontend/precedence.ts`، `src/ast/surface/index.ts` و
  `src/ast/core/index.ts`.
- تست شاهد: `tests/lexer.test.ts`، `tests/parser.test.ts`، fixtureهای
  `tests/fixtures` و تست‌های source location در `tests/source-file.test.ts`.

## قابلیت‌های پایه زبان

### انواع پایه و عملگرها، صفحات ۳ و ۴

- [x] `int`، `bool` و `string` به‌صورت tagged value مستقل وجود دارند.
- [x] عملگرهای `+ - * / == != < > <= >=` و `not` با type check و بدون coercion
      زبان میزبان اجرا می‌شوند.
- [x] precedence ثابت است؛ ضرب و تقسیم از جمع و تفریق و آن‌ها از comparison
      قوی‌ترند.
- [x] تقسیم بر صفر و overflow به Runtime Error کنترل‌شده تبدیل می‌شوند.
- فایل‌ها: `src/semantic/types/index.ts`، `src/runtime/values.ts`،
  `src/runtime/primitive-operations.ts` و `src/frontend/precedence.ts`.
- تست شاهد: `tests/primitive-operations.test.ts` مقادیر مرزی، تمام عملگرها،
  ناسازگاری نوع، overflow و تقسیم بر صفر را پوشش می‌دهد.
- مثال: `examples/01-basics.nit`.

### متغیر، Binding و Scope، صفحات ۴ و ۵

- [x] `let` با annotation اختیاری، assignment و shadowing پیاده‌سازی شده است.
- [x] استفاده از نام تعریف‌نشده و تعریف تکراری در یک scope، Type Error است.
- [x] scope از نوع lexical/static است و resolver هر identifier را به binding ID
      مشخص متصل می‌کند؛ بنابراین نام‌های مشابه در scopeهای مختلف مستقل‌اند.
- فایل‌ها: `src/semantic/resolver.ts`،
  `src/semantic/symbols/symbol-table.ts`، `src/runtime/environment.ts` و
  `src/interpreter/interpreter.ts`.
- تست شاهد: تست‌های shadowing و undefined binding در `tests/execution.test.ts`،
  `tests/differential.test.ts` و `tests/stress.test.ts`.

### Control Flow، صفحات ۵ و ۸

- [x] `if/then/else`، `while/do` و `for/in/range` اجرا می‌شوند.
- [x] شرط `if` و `while` الزاماً `bool` است.
- [x] `and` و `or` short-circuit هستند.
- فایل‌ها: nodeهای control flow در دو AST، بررسی نوع در
  `src/semantic/type-checker.ts` و اجرا در `src/interpreter/interpreter.ts`.
- تست شاهد: `tests/execution.test.ts` و `tests/differential.test.ts`.
- مثال قابل اجرا با هر دو backend: `examples/02-control-flow.nit`.

### Function، Recursion، Lambda و Closure، صفحات ۵ تا ۷

- [x] تعریف و فراخوانی تابع، کنترل تعداد/نوع argument و نوع return وجود دارد.
- [x] recursion با binding کردن نام تابع پیش از ساخت closure پشتیبانی می‌شود.
- [x] lambda یک value مرتبه‌اول است و می‌تواند نگه‌داری، return و فراخوانی شود.
- [x] closure محیط lexical را با locationها نگه می‌دارد، نه snapshot مقدار؛ در
      نتیجه mutation بعدی نیز از داخل closure دیده می‌شود.
- فایل‌ها: `src/runtime/closure.ts`، `src/runtime/environment.ts`، بخش call در
  `src/interpreter/interpreter.ts` و بررسی signature در
  `src/semantic/type-checker.ts`.
- تست شاهد: تست‌های named functions، lambdas و closures در
  `tests/execution.test.ts` و depth limit در `tests/stress.test.ts`.
- مثال: `examples/03-functions-closures.nit`.

### List، Map و Higher-Order Function، صفحات ۶ و ۷

- [x] list همگن با نوع `List<T>` و literalهای خالی/غیرخالی وجود دارد.
- [x] builtin چندریختی `map` callback را برای هر عضو، به‌ترتیب، اجرا می‌کند.
- [x] ناسازگاری نوع اعضا یا callback قبل از اجرا رد می‌شود.
- فایل‌ها: `src/runtime/values.ts`، `src/semantic/type-checker.ts` و builtinهای
  `src/interpreter/interpreter.ts`.
- تست شاهد: بخش lists/map در `tests/execution.test.ts`.
- مثال: `examples/04-lists-map.nit`.

### Memory، Reference و Mutation، صفحه ۷

- [x] چهار مفهوم value، binding، reference و memory location در مدل runtime
      جدا هستند.
- [x] `ref a` همان location متغیر `a` را ذخیره می‌کند و `r := value` مقدار آن
      location را تغییر می‌دهد. `r = otherRef` خود reference را جایگزین می‌کند.
- مدل حافظه: `Environment` نگاشت binding ID به `Location` و `Store` نگاشت
  `Location` به `RuntimeValue` است.
- فایل‌ها: `src/runtime/location.ts`، `src/runtime/environment.ts`،
  `src/runtime/store.ts` و `src/runtime/values.ts`.
- تست شاهد: `tests/memory.test.ts` و بخش references در
  `tests/execution.test.ts`.
- مثال: `examples/05-references.nit`.

## مراحل میانی و سیستم نوع

### Desugaring، صفحه ۸

- [x] Surface Language و Core Language جدا هستند.
- [x] `for` به block، binding، `while` و assignment پایین آورده می‌شود.
- [x] `and` و `or` به conditional expression تنبل پایین آورده می‌شوند؛ evaluator
      برای این sugarها case مستقل ندارد.
- [x] شناسه‌های تولیدشده hygienic هستند و با نام‌های برنامه برخورد نمی‌کنند.
- فایل: `src/desugar/desugar.ts`.
- تست شاهد: `tests/desugar.test.ts` ساختار Core AST، ارزیابی یک‌باره bounds و
  hygiene را بررسی می‌کند.

### Static Type Checking، صفحات ۸ و ۹

- [x] type checker همیشه پیش از هر side effect اجرا می‌شود.
- [x] assignment، arithmetic، comparison، condition، list، function/method
      arguments، return و constructor بررسی می‌شوند.
- [x] یک خطای static مانع تمام outputهای برنامه می‌شود.
- فایل‌ها: `src/semantic/type-checker.ts`، `src/semantic/assignability.ts` و
  `src/pipeline.ts`.
- تست شاهد: `tests/execution.test.ts` برای هر خانواده هم حالت معتبر و هم حالت
  نامعتبر دارد؛ تست «static errors prevent every side effect» ترتیب phaseها را
  نیز ثابت می‌کند.

## برنامه‌سازی شی‌گرا

### Class، Object و Constructor، صفحات ۹ و ۱۰

- [x] field تایپ‌دار، `this`، method، `init` و `new` پیاده‌سازی شده‌اند.
- [x] fieldهای object location مستقل دارند و پیش از مقداردهی دارای sentinel
      `UNINITIALIZED` هستند؛ خواندن یا باقی‌ماندن field مقداردهی‌نشده Runtime Error
      کنترل‌شده ایجاد می‌کند.
- فایل‌ها: `src/runtime/class.ts`، `src/runtime/store.ts`،
  `src/interpreter/interpreter.ts` و `src/semantic/type-checker.ts`.
- تست شاهد: بخش class/object در `tests/execution.test.ts`.

### Inheritance، Override و Dynamic Dispatch، صفحه ۱۰

- [x] single inheritance، inherited field/method و subtype assignment وجود دارد.
- [x] override از نظر parameter و return بررسی می‌شود.
- [x] method lookup از class واقعی object شروع می‌شود؛ بنابراین متغیر با نوع
      `Animal` که object از `Dog` دارد، override مربوط به `Dog` را اجرا می‌کند.
- فایل‌ها: `src/runtime/class.ts` و lookup method در
  `src/interpreter/interpreter.ts`.
- تست شاهد: تست‌های single inheritance و سه سطح dynamic dispatch در
  `tests/execution.test.ts`.
- مثال: `examples/06-classes.nit`.

## Exception و راهبرد ارزیابی

### Exception Handling، صفحات ۱۰ و ۱۱

- [x] `throw`، `try/catch`، propagation بین functionها و nearest handler وجود دارد.
- [x] throw بدون handler به Runtime Error کنترل‌شده و بدون host stack trace تبدیل
      می‌شود.
- [x] خطاهای runtime مانند division by zero با exception زبان اشتباه گرفته
      نمی‌شوند و catch آن‌ها را نمی‌گیرد.
- فایل‌ها: `src/runtime/completion.ts`، `src/interpreter/interpreter.ts` و تبدیل
  uncaught throw در `src/pipeline.ts`.
- تست شاهد: بخش exceptions در `tests/execution.test.ts` و process error در
  `tests/cli-process.test.ts`.
- مثال: `examples/07-exceptions.nit`.

### Eager / Call-by-Value، صفحه ۱۱

- [x] راهبرد اصلی eager است: callee و سپس argumentها از چپ به راست ارزیابی و
      value حاصل در location تازه parameter ذخیره می‌شود.
- فایل: مسیر `call` در `src/interpreter/interpreter.ts`.
- شواهد رفتاری: تست ترتیب list/map و once-only evaluation در
  `tests/execution.test.ts`.
- Lazy Evaluation انتخاب نشده و الزام اجباری نیست.

## Bytecode و Virtual Machine، صفحات ۱۱ و ۱۲

- [x] compiler مستقل Core AST را به bytecode تبدیل می‌کند.
- [x] VM stack-based همان bytecode را اجرا می‌کند.
- [x] subset اجباری literal، arithmetic، comparison، variable، assignment،
      print، conditional jump و loop کامل است.
- instruction set در `src/bytecode/instruction.ts` تعریف شده است:
  `CONST`، `DEFINE`، `LOAD`، `STORE`، `UNARY`، `BINARY`، `JUMP`،
  `JUMP_IF_FALSE`، `ENTER_SCOPE`، `EXIT_SCOPE`، `POP`، `PRINT` و `HALT`.
- compiler و disassembler: `src/bytecode/compiler.ts` و
  `src/bytecode/chunk.ts`؛ executor: `src/vm/vm.ts`.
- تست شاهد: `tests/bytecode.test.ts`، `tests/vm.test.ts` و
  `tests/differential.test.ts`. تست‌های differential خروجی VM و Interpreter را
  روی یک source یکسان مقایسه می‌کنند.
- مثال: `examples/02-control-flow.nit` با فرمان‌های `bytecode` و `vm`.
- قابلیت‌های پیشرفته عمداً خارج از subset VM هستند و با diagnostic کنترل‌شده رد
  می‌شوند؛ PDF اجرای Class و Exception روی VM را الزامی نکرده است.

## Formal Semantics، صفحه ۱۲

نماد `ρ` محیط bindingها، `σ` store و `v` یک RuntimeValue است. داوری
`<e, ρ, σ> ⇓ <v, σ'>` یعنی expression `e` در محیط و store داده‌شده با value و
store جدید پایان می‌یابد.

### Operational Semantics

```text
[INT]    <n, ρ, σ> ⇓ <Int(n), σ>

         ρ(x) = l        σ(l) = v
[VAR]    -------------------------
         <x, ρ, σ> ⇓ <v, σ>

         <e1, ρ, σ> ⇓ <Int(n1), σ1>
         <e2, ρ, σ1> ⇓ <Int(n2), σ2>
         n = checked(n1 + n2)
[ADD]    --------------------------------
         <e1 + e2, ρ, σ> ⇓ <Int(n), σ2>

         <c, ρ, σ> ⇓ <Bool(true), σ1>
         <s1, ρ, σ1> ⇓ σ2
[IF-T]   --------------------------------
         <if c then s1 else s2, ρ, σ> ⇓ σ2

         <f, ρ, σ> ⇓ <Closure(params, body, ρc), σ1>
         args در σ1 از چپ به راست به values ارزیابی می‌شوند
         locations تازه ساخته و ρcall = bind(params, values, ρc)
         <body, ρcall, σargs> ⇓ <return v, σfinal>
[CALL]   ------------------------------------------------------
         <f(args), ρ, σ> ⇓ <v, σfinal>
```

این قواعد مستقیماً با `Environment`، `Store`، primitive operations و closure
در runtime منطبق‌اند. نمونه‌های arithmetic و closure در
`tests/formal-examples.test.ts` از pipeline واقعی اجرا می‌شوند.

### Denotational Semantics

برای expressionهای پایه، تابع معنا به‌شکل زیر تعریف می‌شود:

```text
E[n](ρ, σ)       = Int(n)
E[true](ρ, σ)    = Bool(true)
E[x](ρ, σ)       = σ(ρ(x))
E[e1 + e2](ρ, σ) = checkedAdd(E[e1](ρ, σ), E[e2](ρ, σ))
E[not e](ρ, σ)   = Bool(not unboxBool(E[e](ρ, σ)))
```

`checkedAdd` تنها `Int` می‌پذیرد و overflow را به Runtime Error تبدیل می‌کند؛
این همان قرارداد `src/runtime/primitive-operations.ts` است.

## Hoare Logic، صفحه ۱۲

### مثال اول: Assignment

```text
Precondition:  { x = 4 }
Program:       x = x + 3
Postcondition: { x = 7 }
```

با قاعده assignment، پس‌شرط `x = 7` را با جایگزینی `x + 3` به‌دست می‌آوریم:
`x + 3 = 7`، که از پیش‌شرط `x = 4` نتیجه می‌شود. اجرای واقعی همین مثال در
`tests/hoare-examples.test.ts` مقدار `7` را چاپ می‌کند.

### مثال دوم: Loop فاکتوریل

```text
Precondition:  { n = N ∧ N >= 0 ∧ result = 1 }
Program:       while n > 0 do { result = result * n; n = n - 1 }
Invariant:     { result * n! = N! ∧ n >= 0 }
Postcondition: { result = N! ∧ n = 0 }
```

Invariant پیش از loop برقرار است. هر iteration با ضرب `result` در `n` و سپس
کاهش `n` آن را حفظ می‌کند. هنگام خروج، شرط `n <= 0` همراه invariant و
`n >= 0` نتیجه می‌دهد `n = 0`؛ پس `result = N!`. تست واقعی برای `N = 5` خروجی
`120` و `0` را در `tests/hoare-examples.test.ts` بررسی می‌کند.

## Advanced Extensions، صفحه ۱۳

### Extension اول: Type Inference

- [x] نوع `let` بدون annotation از initializer استنتاج می‌شود.
- [x] نوع return تابع غیرrecursive از returnها و نوع lambda از body استنتاج
      می‌شود؛ common ancestor برای class resultها محاسبه می‌شود.
- محدودیت طراحی: parameterها annotation می‌خواهند و recursion به return type
  صریح نیاز دارد تا inference قابل تصمیم باقی بماند.
- فایل: `src/semantic/type-checker.ts`.
- تست شاهد: تست‌های binding، function return inference و invalid mixed returns در
  `tests/execution.test.ts`.

### Extension دوم: Pattern Matching

- [x] `match` برای `int`، `bool` و `string` با literal pattern و wildcard `_`
      وجود دارد.
- [x] scrutinee یک بار ارزیابی می‌شود و exhaustiveness، duplicate/unreachable
      arm و سازگاری نوع نتیجه‌ها به‌صورت static بررسی می‌شوند.
- فایل‌ها: ASTها، `src/frontend/parser.ts`، `src/semantic/type-checker.ts` و
  `src/interpreter/interpreter.ts`.
- تست شاهد: بخش pattern matching در `tests/execution.test.ts`.
- مثال: `examples/08-pattern-matching.nit`.

## Error Handling، صفحات ۱۳ و ۱۴

- [x] `DiagnosticCategory` دقیقاً شامل `Syntax Error`، `Type Error` و
      `Runtime Error` است.
- [x] خطاهای عادی برنامه در مرز pipeline به diagnostic ساخت‌یافته با source span
      تبدیل می‌شوند؛ CLI context و caret چاپ می‌کند و host stack trace نشان نمی‌دهد.
- فایل‌ها: `src/diagnostics/diagnostic.ts`، `src/pipeline.ts` و
  `src/cli/cli.ts`.
- تست شاهد: `tests/diagnostic.test.ts`، `tests/cli-process.test.ts` و حالت‌های
  نامعتبر متعدد در تمام suite.

## Testing و فایل‌های تحویلی، صفحات ۱۴ و ۱۵

- [x] Normal execution: `tests/execution.test.ts` و `tests/examples.test.ts`.
- [x] Boundary cases: safe integer limits، overflow، malformed input و nesting
      limits در `tests/primitive-operations.test.ts`، `tests/lexer.test.ts` و
      `tests/parser.test.ts`.
- [x] Scope shadowing، recursion، closure، type error، division by zero، OOP،
      inheritance، exception، VM و extensions همگی تست اختصاصی دارند.
- [x] برنامه‌های صحیح و غلط از متن NITLang واقعی عبور می‌کنند؛ testها result
      pipeline را assert می‌کنند، نه branch ویژه‌ای در interpreter.
- [x] نه مثال شماره‌گذاری‌شده در `examples` تمام خانواده‌های قابلیت را پوشش
      می‌دهند و توسط `tests/examples.test.ts` اجرا می‌شوند.
- [x] `README.md` نقطه شروع کوتاه است؛ `docs/RUNBOOK.md` معماری، اجرا، CLI و
      ارائه را پوشش می‌دهد؛ `docs/LANGUAGE.md` قواعد، تصمیم‌ها، مدل نوع، OOP، VM و
      محدودیت‌ها را ثبت می‌کند؛ این سند formal semantics، Hoare logic و نگاشت کامل
      خواسته‌های صورت پروژه را تکمیل می‌کند.

فرمان پذیرش نهایی پروژه:

```sh
bun run check:all
```

این فرمان formatting، TypeScript strict type checking و کل suite را اجرا می‌کند.
در زمان تهیه این چک‌لیست نتیجه برابر با ۳۰۴ تست موفق و صفر تست ناموفق بود.

## آمادگی ارائه، صفحات ۱۵ و ۱۶

- [x] مسیر نمایش مرحله‌ای با `ast`، `core-ast`، `bytecode`، `run` و `vm` در
      `docs/RUNBOOK.md` آمده است.
- [x] `tests/stress.test.ts` نام‌ها، مقادیر و ترکیب قابلیت‌ها را تغییر می‌دهد تا
      وابستگی به مثال‌های PDF یا خروجی hard-codeشده آشکار شود.
- [x] `tests/differential.test.ts` برنامه‌های تازه را با دو backend اجرا و نتیجه
      را مقایسه می‌کند.
- [x] محدودیت‌های عمدی زبان و VM در `docs/LANGUAGE.md` ثبت شده‌اند تا در ارائه
      مرز قابلیت اجباری و انتخاب طراحی روشن باشد.
