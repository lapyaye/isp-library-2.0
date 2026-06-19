import "server-only"
import { JWT } from "google-auth-library"

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly"

function getJwtClient(): JWT {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  if (!email || !rawKey) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")
  }
  // Hosts differ in how they store the key:
  //   - dotenv strips the surrounding quotes from `.env`, leaving literal "\n".
  //   - Vercel/other dashboards keep any quotes the value was pasted with.
  // Strip surrounding quotes + whitespace, then convert literal "\n" to real
  // newlines, so the same value works in both places (no-op when already clean).
  const key = rawKey
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n")
  return new JWT({ email, key, scopes: [SHEETS_SCOPE] })
}

// Fetches the configured range and returns raw rows (header row excluded by the range).
export async function fetchEbookRows(): Promise<string[][]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID
  const range = process.env.GOOGLE_SHEET_RANGE ?? "Ebooks!A2:F"
  if (!spreadsheetId) throw new Error("Missing GOOGLE_SHEET_ID")

  const client = getJwtClient()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`
  const res = await client.fetch(url)
  const data = res.data as { values?: string[][] }
  return data.values ?? []
}
