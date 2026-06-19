import { prisma, pool } from "../lib/prisma"
import * as bcrypt from "bcryptjs"

async function main() {
    console.log("🌱 Starting database seed...")

    // ─── Users ──────────────────────────────────────────
    const adminPassword = await bcrypt.hash("admin123", 10)
    const userPassword = await bcrypt.hash("user1234", 10)

    const admin = await prisma.user.upsert({
        where: { email: "admin@library.com" },
        update: {},
        create: {
            username: "Admin",
            email: "admin@library.com",
            password: adminPassword,
            is_admin: true,
            is_verified: true,
        },
    })
    console.log(`  ✔ Admin user created: ${admin.email}`)

    const regularUser = await prisma.user.upsert({
        where: { email: "user@library.com" },
        update: {},
        create: {
            username: "John Doe",
            email: "user@library.com",
            password: userPassword,
            is_admin: false,
            is_verified: true,
        },
    })
    console.log(`  ✔ Regular user created: ${regularUser.email}`)

    // ─── Authors ────────────────────────────────────────
    const authors = await Promise.all([
        prisma.author.upsert({
            where: { author_id: "author-001" },
            update: {},
            create: { author_id: "author-001", name: "George Orwell" },
        }),
        prisma.author.upsert({
            where: { author_id: "author-002" },
            update: {},
            create: { author_id: "author-002", name: "Harper Lee" },
        }),
        prisma.author.upsert({
            where: { author_id: "author-003" },
            update: {},
            create: { author_id: "author-003", name: "F. Scott Fitzgerald" },
        }),
        prisma.author.upsert({
            where: { author_id: "author-004" },
            update: {},
            create: { author_id: "author-004", name: "Jane Austen" },
        }),
        prisma.author.upsert({
            where: { author_id: "author-005" },
            update: {},
            create: { author_id: "author-005", name: "Mark Twain" },
        }),
    ])
    console.log(`  ✔ ${authors.length} authors created`)

    // ─── Publishers ─────────────────────────────────────
    const publishers = await Promise.all([
        prisma.publisher.upsert({
            where: { publisher_id: "pub-001" },
            update: {},
            create: { publisher_id: "pub-001", name: "Secker & Warburg" },
        }),
        prisma.publisher.upsert({
            where: { publisher_id: "pub-002" },
            update: {},
            create: { publisher_id: "pub-002", name: "J.B. Lippincott & Co." },
        }),
        prisma.publisher.upsert({
            where: { publisher_id: "pub-003" },
            update: {},
            create: { publisher_id: "pub-003", name: "Charles Scribner's Sons" },
        }),
        prisma.publisher.upsert({
            where: { publisher_id: "pub-004" },
            update: {},
            create: { publisher_id: "pub-004", name: "T. Egerton" },
        }),
        prisma.publisher.upsert({
            where: { publisher_id: "pub-005" },
            update: {},
            create: { publisher_id: "pub-005", name: "Chatto & Windus" },
        }),
    ])
    console.log(`  ✔ ${publishers.length} publishers created`)

    // ─── Books ──────────────────────────────────────────
    const books = await Promise.all([
        prisma.book.upsert({
            where: { book_id: "book-001" },
            update: {},
            create: {
                book_id: "book-001",
                title: "1984",
                language: "English",
                place_of_publication: "London",
                published_year: 1949,
                edition: "1st",
                price: 12.99,
                class_number: "823.912",
                source: "Purchase",
                notes: "Classic dystopian novel",
                author_id: authors[0].id,
                publisher_id: publishers[0].id,
            },
        }),
        prisma.book.upsert({
            where: { book_id: "book-002" },
            update: {},
            create: {
                book_id: "book-002",
                title: "Animal Farm",
                language: "English",
                place_of_publication: "London",
                published_year: 1945,
                edition: "1st",
                price: 9.99,
                class_number: "823.912",
                source: "Purchase",
                notes: "Political satire",
                author_id: authors[0].id,
                publisher_id: publishers[0].id,
            },
        }),
        prisma.book.upsert({
            where: { book_id: "book-003" },
            update: {},
            create: {
                book_id: "book-003",
                title: "To Kill a Mockingbird",
                language: "English",
                place_of_publication: "Philadelphia",
                published_year: 1960,
                edition: "1st",
                price: 14.99,
                class_number: "813.54",
                source: "Donation",
                notes: "Pulitzer Prize winner",
                author_id: authors[1].id,
                publisher_id: publishers[1].id,
            },
        }),
        prisma.book.upsert({
            where: { book_id: "book-004" },
            update: {},
            create: {
                book_id: "book-004",
                title: "The Great Gatsby",
                language: "English",
                place_of_publication: "New York",
                published_year: 1925,
                edition: "1st",
                price: 11.99,
                class_number: "813.52",
                source: "Purchase",
                notes: "Jazz Age classic",
                author_id: authors[2].id,
                publisher_id: publishers[2].id,
            },
        }),
        prisma.book.upsert({
            where: { book_id: "book-005" },
            update: {},
            create: {
                book_id: "book-005",
                title: "Pride and Prejudice",
                language: "English",
                place_of_publication: "London",
                published_year: 1813,
                edition: "1st",
                price: 10.99,
                class_number: "823.7",
                source: "Purchase",
                notes: "Classic romance novel",
                author_id: authors[3].id,
                publisher_id: publishers[3].id,
            },
        }),
        prisma.book.upsert({
            where: { book_id: "book-006" },
            update: {},
            create: {
                book_id: "book-006",
                title: "Adventures of Huckleberry Finn",
                language: "English",
                place_of_publication: "New York",
                published_year: 1884,
                edition: "1st",
                price: 8.99,
                class_number: "813.4",
                source: "Donation",
                notes: "American literary classic",
                author_id: authors[4].id,
                publisher_id: publishers[4].id,
            },
        }),
    ])
    console.log(`  ✔ ${books.length} books created`)

    console.log("\n✅ Seed completed successfully!")
    console.log("\n📋 Test credentials:")
    console.log("   Admin: admin@library.com / admin123")
    console.log("   User:  user@library.com / user1234")
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
        await pool.end()
    })
