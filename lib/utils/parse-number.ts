/**
 * Parse a numeric value from a string, supporting Myanmar (Burmese) digits.
 * Returns the first numeric block found, or null when none.
 */
export function parseNumberValue(val: string): number | null {
  if (!val || val.trim() === "") return null

  const myanmarToEnglishMap: Record<string, string> = {
    "၀": "0", "၁": "1", "၂": "2", "၃": "3", "၄": "4",
    "၅": "5", "၆": "6", "၇": "7", "၈": "8", "၉": "9",
  }

  let englishVal = ""
  for (const char of val) {
    englishVal += myanmarToEnglishMap[char] !== undefined ? myanmarToEnglishMap[char] : char
  }

  const match = englishVal.match(/[0-9]+(\.[0-9]+)?/)
  if (match && match[0]) return Number(match[0])
  return null
}
