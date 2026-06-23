import assert from "node:assert"
import { parseNumberValue } from "../../lib/utils/parse-number"

assert.strictEqual(parseNumberValue("5000"), 5000)
assert.strictEqual(parseNumberValue("၂၀၁၇"), 2017)        // Myanmar digits
assert.strictEqual(parseNumberValue("၅၀၀၀"), 5000)
assert.strictEqual(parseNumberValue("12.5"), 12.5)
assert.strictEqual(parseNumberValue("၃၇၈.၁"), 378.1)       // Myanmar decimal
assert.strictEqual(parseNumberValue("2017 Edition"), 2017) // embedded
assert.strictEqual(parseNumberValue(""), null)
assert.strictEqual(parseNumberValue("   "), null)
assert.strictEqual(parseNumberValue("abc"), null)
console.log("OK parse-number")
