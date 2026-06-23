import { prisma, pool } from "../lib/prisma"
import * as fs from "fs"
import * as path from "path"
import { parse } from "csv-parse"
import { parseNumberValue } from "../lib/utils/parse-number"

// Utility to parse CSV into an array of objects
function loadCSV<T>(filePath: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      console.warn(`[SKIP] File not found: ${filePath}`)
      return resolve([])
    }

    const results: T[] = []
    fs.createReadStream(filePath)
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        })
      )
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error))
  })
}

async function main() {
  console.log("🌱 Starting Bulk Database Seed...")

  // Maps to hold legacy ID -> internal UUID
  const authorMap = new Map<string, string>()
  const publisherMap = new Map<string, string>()

  // 1. Seed Authors (Bulk Insert)
  const authorsFile = path.join(__dirname, "data", "authors.csv")
  const authorsData = await loadCSV<{ author_id: string; name: string }>(authorsFile)

  if (authorsData.length > 0) {
    console.log(`Bulk inserting ${authorsData.length} authors...`)

    // Filter out invalid rows mapped to Prisma schema format
    const authorsToInsert = authorsData
      .filter((row) => row.author_id && row.name)
      .map((row) => ({
        author_id: row.author_id,
        name: row.name,
      }))

    const authorResult = await prisma.author.createMany({
      data: authorsToInsert,
      skipDuplicates: true,
    })
    console.log(`✅ Inserted ${authorResult.count} new authors.`)

    // Fetch them all back to build the map for relationships
    const allAuthors = await prisma.author.findMany({
      select: { id: true, author_id: true }
    })
    allAuthors.forEach(a => authorMap.set(a.author_id, a.id))
  }

  // 2. Seed Publishers (Bulk Insert)
  const publishersFile = path.join(__dirname, "data", "publishers.csv")
  const publishersData = await loadCSV<{ publisher_id: string; name: string }>(publishersFile)

  if (publishersData.length > 0) {
    console.log(`Bulk inserting ${publishersData.length} publishers...`)

    const publishersToInsert = publishersData
      .filter((row) => row.publisher_id && row.name)
      .map((row) => ({
        publisher_id: row.publisher_id,
        name: row.name,
      }))

    const publisherResult = await prisma.publisher.createMany({
      data: publishersToInsert,
      skipDuplicates: true,
    })
    console.log(`✅ Inserted ${publisherResult.count} new publishers.`)

    // Fetch them all back to build the map
    const allPublishers = await prisma.publisher.findMany({
      select: { id: true, publisher_id: true }
    })
    allPublishers.forEach(p => publisherMap.set(p.publisher_id, p.id))
  }

  // 3. Seed Books (Bulk Insert)
  const booksFile = path.join(__dirname, "data", "books.csv")
  const booksData = await loadCSV<any>(booksFile)

  if (booksData.length > 0) {
    console.log(`Bulk inserting ${booksData.length} books...`)

    const booksToInsert = booksData
      .filter((row) => row.book_id && row.title)
      .map((row) => {
        const internalAuthorId = row.author_id ? authorMap.get(row.author_id) : null
        const internalPublisherId = row.publisher_id ? publisherMap.get(row.publisher_id) : null

        const publishedYear = parseNumberValue(row.published_year)
        const price = parseNumberValue(row.price)
        const edition = row.edition?.trim() || null

        return {
          book_id: String(row.book_id),
          title: row.title,
          language: row.language || null,
          place_of_publication: row.place_of_publication || null,
          published_year: publishedYear !== null ? Number(publishedYear) : null,
          edition: edition,
          price: price !== null ? Number(price) : null,
          class_number: row.class_number || null,
          source: row.source || null,
          notes: row.notes || null,
          author_id: internalAuthorId,
          publisher_id: internalPublisherId,
        }
      })

    const bookResult = await prisma.book.createMany({
      data: booksToInsert,
      skipDuplicates: true,
    })
    console.log(`✅ Inserted ${bookResult.count} new books.`)
  }

  console.log("🎉 Database bulk seeding complete!")
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
