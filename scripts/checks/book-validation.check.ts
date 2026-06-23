import assert from "node:assert"
import { bookSchema, bookImportRowSchema } from "../../lib/validation/book"

// bookSchema: title required
assert.strictEqual(bookSchema.safeParse({}).success, false)
assert.strictEqual(bookSchema.safeParse({ title: "" }).success, false)

// bookSchema: numbers coerced (incl. Myanmar), blanks -> null
const ok = bookSchema.safeParse({
  title: "Test", published_year: "၂၀၁၇", price: "5000", authorName: "  U Aung  ", language: "",
})
assert.strictEqual(ok.success, true)
assert.strictEqual(ok.data!.published_year, 2017)
assert.strictEqual(ok.data!.price, 5000)
assert.strictEqual(ok.data!.authorName, "U Aung")   // trimmed
assert.strictEqual(ok.data!.language, null)          // empty -> null

// import row: title required, author/publisher keys present
assert.strictEqual(bookImportRowSchema.safeParse({ title: "" }).success, false)
const row = bookImportRowSchema.safeParse({ title: "B", author: "A", publisher: "P", price: "၁၀၀" })
assert.strictEqual(row.success, true)
assert.strictEqual(row.data!.price, 100)
console.log("OK book-validation")
