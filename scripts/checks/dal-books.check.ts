import assert from "node:assert"
import { createBook, bulkCreateBooks, getPublishers } from "../../lib/db/client"
import { prisma, pool } from "../../lib/prisma"

async function main() {
  const stamp = Date.now()
  const book = await createBook({
    title: `Check Book ${stamp}`,
    authorName: `Check Author ${stamp}`,
    publisherName: `Check Pub ${stamp}`,
    published_year: 2020,
    price: 1234,
  })
  assert.ok(book, "createBook returned a book")
  assert.strictEqual(book!.author_name, `Check Author ${stamp}`)
  assert.strictEqual(book!.published_year, 2020)

  const pubs = await getPublishers()
  assert.ok(pubs.some((p) => p.name === `Check Pub ${stamp}`), "publisher visible")

  // Bulk: two rows sharing one new author -> author created once
  const res = await bulkCreateBooks([
    { title: `Bulk A ${stamp}`, author: `Shared Auth ${stamp}`, publisher: null,
      language: null, place_of_publication: null, published_year: 1999,
      edition: null, price: null, class_number: null, source: null, notes: null },
    { title: `Bulk B ${stamp}`, author: `Shared Auth ${stamp}`, publisher: null,
      language: null, place_of_publication: null, published_year: null,
      edition: null, price: null, class_number: null, source: null, notes: null },
  ])
  assert.strictEqual(res.created, 2)
  const sharedAuthors = await prisma.author.findMany({ where: { name: `Shared Auth ${stamp}` } })
  assert.strictEqual(sharedAuthors.length, 1, "shared author created exactly once")

  console.log("OK dal-books")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
