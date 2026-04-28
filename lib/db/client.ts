// Database Client - Prisma-backed data access layer

import { prisma } from "@/lib/prisma"
import {
    Book,
    BorrowedBook,
    SessionUser,
    UserProfile,
    Author,
    AuthorBooks,
} from "./types"
import type {
    Author as PrismaAuthor,
    User as PrismaUser,
    Book as PrismaBook,
    Publisher as PrismaPublisher,
    BorrowedBook as PrismaBorrowedBook,
    BorrowStatus,
} from "@/lib/generated/prisma/client"

// ─── Books ──────────────────────────────────────────────

/**
 * Get all books with author and publisher data
 */
export async function getBooks(): Promise<Book[]> {
    const books = await prisma.book.findMany({
        include: { author: true, publisher: true },
        orderBy: { created_at: "desc" },
    })
    return books.map((b: PrismaBook & { author: PrismaAuthor | null; publisher: PrismaPublisher | null }) => ({
        id: b.id,
        book_id: b.book_id,
        title: b.title,
        author_name: b.author?.name ?? null,
        author_id: b.author_id ?? null,
        language: b.language,
        publisher_name: b.publisher?.name ?? null,
        publisher_id: b.publisher_id ?? null,
        place_of_publication: b.place_of_publication,
        published_year: b.published_year,
        edition: b.edition,
        price: b.price,
        class_number: b.class_number,
        source: b.source,
        notes: b.notes,
        created_at: b.created_at.toISOString(),
    }))
}

/**
 * Get a single book by book_id
 */
export async function getBook(id: string): Promise<Book | null> {
    try {
        const b = await prisma.book.findFirst({
            where: { book_id: id },
            include: { author: true, publisher: true },
        })
        if (!b) return null
        return {
            id: b.id,
            book_id: b.book_id,
            title: b.title,
            author_name: b.author?.name ?? null,
            author_id: b.author_id ?? null,
            language: b.language,
            publisher_name: b.publisher?.name ?? null,
            publisher_id: b.publisher_id ?? null,
            place_of_publication: b.place_of_publication,
            published_year: b.published_year,
            edition: b.edition,
            price: b.price,
            class_number: b.class_number,
            source: b.source,
            notes: b.notes,
            created_at: b.created_at.toISOString(),
        }
    } catch {
        return null
    }
}

// ─── Authors ────────────────────────────────────────────

/**
 * Get all authors
 */
export async function getAuthors(): Promise<Author[]> {
    const authors = await prisma.author.findMany({
        include: { books: true }
    })
    return authors.map((a: PrismaAuthor & { books: PrismaBook[] }) => ({
        id: a.id,
        author_id: a.author_id,
        name: a.name,
        books: a.books.map(b => b.book_id)
    }))
}

/**
 * Get author by author_id
 */
export async function getAuthorById(id: string): Promise<AuthorBooks | null> {
    try {
        const author = await prisma.author.findFirst({
            where: { id },
            include: {
                books: {
                    include: {
                        publisher: true
                    }
                }
            }
        })
        if (!author) return null
        return {
            id: author.id,
            author_id: author.author_id,
            name: author.name,
            books: author.books.map(b => ({
                id: b.id,
                book_id: b.book_id,
                title: b.title,
                author_name: author.name ?? null,
                author_id: author.author_id ?? null,
                language: b.language,
                publisher_name: b.publisher?.name ?? null,
                publisher_id: b.publisher_id ?? null,
                place_of_publication: b.place_of_publication,
                published_year: b.published_year,
                edition: b.edition,
                price: b.price,
                class_number: b.class_number,
                source: b.source,
                notes: b.notes,
                created_at: b.created_at.toISOString(),
            }))
        }
    } catch {
        return null
    }
}

/**
 * Get books by author ID (the internal UUID)
 */
export async function getBooksByAuthorId(authorId: string): Promise<Book[]> {
    try {
        const books = await prisma.book.findMany({
            where: {
                author: { id: authorId },
            },
            include: { author: true, publisher: true },
        })
        return books.map((b: PrismaBook & { author: PrismaAuthor | null; publisher: PrismaPublisher | null }) => ({
            id: b.id,
            book_id: b.book_id,
            title: b.title,
            author_name: b.author?.name ?? null,
            author_id: b.author_id ?? null,
            language: b.language,
            publisher_name: b.publisher?.name ?? null,
            publisher_id: b.publisher_id ?? null,
            place_of_publication: b.place_of_publication,
            published_year: b.published_year,
            edition: b.edition,
            price: b.price,
            class_number: b.class_number,
            source: b.source,
            notes: b.notes,
            created_at: b.created_at.toISOString(),
        }))
    } catch {
        return []
    }
}

// ─── Users ──────────────────────────────────────────────

/**
 * Get user by email (for login)
 */
export async function getUserByEmail(email: string): Promise<PrismaUser | null> {
    try {
        return await prisma.user.findUnique({ where: { email } })
    } catch {
        return null
    }
}

/**
 * Get all users
 */
export async function getAllUsers(): Promise<UserProfile[]> {
    try {
        const users = await prisma.user.findMany({
            include: { borrow_books: true },
        })
        return users.map((u: PrismaUser & { borrow_books: PrismaBorrowedBook[] }) => ({
            id: u.id,
            user_id: u.user_id,
            username: u.username,
            email: u.email,
            is_admin: u.is_admin,
            borrow_books: u.borrow_books.map((bb: PrismaBorrowedBook) => bb.borrow_id),
            created_at: u.created_at.toISOString(),
            updated_at: u.updated_at.toISOString(),
        }))
    } catch {
        return []
    }
}

/**
 * Get user by ID
 */
export async function getUserByUserId(id: string): Promise<UserProfile | null> {
    try {
        const user = await prisma.user.findUnique({ where: { user_id: id }, include: { borrow_books: true } })
        if (!user) return null
        return {
            id: user.id,
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            is_admin: user.is_admin,
            borrow_books: user.borrow_books.map((bb: PrismaBorrowedBook) => bb.borrow_id),
            created_at: user.created_at.toISOString(),
            updated_at: user.updated_at.toISOString(),
        }
    } catch {
        return null
    }
}

/**
 * Get user by internal ID
 */
export async function getUserById(id: string): Promise<SessionUser | null> {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                user_id: true,
                email: true,
                username: true,
                is_admin: true,
                is_verified: true,
                created_at: true,
                updated_at: true
            }
        })
        if (!user) return null
        return {
            id: user.id,
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            isAdmin: user.is_admin,
            isVerified: user.is_verified,
            created_at: user.created_at.toISOString(),
            updated_at: user.updated_at.toISOString(),
        }
    } catch {
        return null
    }
}

// ─── Borrowed Books ─────────────────────────────────────

function mapBorrowedBook(bb: {
    id: string
    borrow_id: string
    borrowed_at: Date
    due_date: Date
    returned_at: Date | null
    status: string
    book_id: string | null
    user_id: string | null
    author_id: string | null
    book?: { book_id: string; title: string; publisher_id: string | null; publisher?: { publisher_id: string; name: string } | null } | null
    user?: { user_id: string; username: string; email: string } | null
    author?: { author_id: string; name: string, id: string } | null
}): BorrowedBook {
    return {
        id: bb.id,
        borrow_id: bb.borrow_id,
        book_id: bb.book?.book_id ?? null,
        title: bb.book?.title ?? null,
        user_id: bb.user?.user_id ?? null,
        username: bb.user?.username ?? null,
        email: bb.user?.email ?? null,
        author_id: bb.author?.id ?? null,
        author_name: bb.author?.name ?? null,
        publisher_id: bb.book?.publisher?.publisher_id ?? null,
        publisher_name: bb.book?.publisher?.name ?? null,
        borrowed_at: bb.borrowed_at.toISOString(),
        due_date: bb.due_date.toISOString(),
        returned_at: bb.returned_at?.toISOString() ?? "",
        status: bb.status as "borrowed" | "returned" | "overdue",
    }
}

const borrowInclude = {
    book: {
        include: { publisher: true },
    },
    user: true,
    author: true,
} as const

export async function getAllBorrowRecords(): Promise<BorrowedBook[]> {
    try {
        const records = await prisma.borrowedBook.findMany({
            include: borrowInclude,
        })
        return records.map(mapBorrowedBook)
    } catch {
        return []
    }
}

/**
 * Get borrowed books for a user
 */
export async function getBorrowedBooksByUserId(userId: string): Promise<BorrowedBook[]> {
    try {
        const records = await prisma.borrowedBook.findMany({
            where: { user: { user_id: userId } },
            include: borrowInclude,
        })
        return records.map(mapBorrowedBook)
    } catch {
        return []
    }
}

export async function getAllBooksByStatus(status: BorrowStatus): Promise<BorrowedBook[]> {
    try {
        const records = await prisma.borrowedBook.findMany({
            where: { status },
            include: borrowInclude,
        })
        return records.map(mapBorrowedBook)
    } catch {
        return []
    }
}

export async function checkBookBorrowedByUser(bookId: string): Promise<BorrowedBook | null> {
    try {
        const record = await prisma.borrowedBook.findFirst({
            where: {
                book: { book_id: bookId },
                status: "borrowed",
            },
            include: borrowInclude,
        })
        return record ? mapBorrowedBook(record) : null
    } catch {
        return null
    }
}

/**
 * Create a borrow record
 */
export async function createBorrowRecord(data: {
    bookId: string
    userId: string
    authorId: string
    publisherId: string
    dueDate: string
}): Promise<BorrowedBook | null> {
    try {
        // Look up internal IDs from the public-facing IDs
        const book = await prisma.book.findFirst({ where: { book_id: data.bookId } })
        const user = await prisma.user.findFirst({ where: { user_id: data.userId } })

        if (!book || !user) return null

        const record = await prisma.borrowedBook.create({
            data: {
                borrowed_at: new Date(),
                due_date: new Date(data.dueDate),
                status: "borrowed",
                book_id: book.id,
                user_id: user.id,
                author_id: data.authorId,
            },
            include: borrowInclude,
        })
        return mapBorrowedBook(record)
    } catch {
        return null
    }
}

/**
 * Update a borrow record (e.g., mark as returned)
 */
export async function updateBorrowRecord(
    id: string,
    data: Partial<{
        returned_at: string
        status: "borrowed" | "returned" | "overdue"
    }>
): Promise<BorrowedBook | null> {
    try {
        const record = await prisma.borrowedBook.update({
            where: { id },
            data: {
                ...(data.returned_at && { returned_at: new Date(data.returned_at) }),
                ...(data.status && { status: data.status }),
            },
            include: borrowInclude,
        })
        return mapBorrowedBook(record)
    } catch {
        return null
    }
}

/**
 * Create a new user (for sign-up)
 */
export async function createUser(data: {
    email: string
    hashedPassword: string
    username: string
}): Promise<SessionUser | null> {
    try {
        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: data.hashedPassword,
                username: data.username,
                is_admin: false,
            },
        })
        return {
            id: user.id,
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            isAdmin: user.is_admin,
            created_at: user.created_at.toISOString(),
            updated_at: user.updated_at.toISOString(),
        }
    } catch {
        return null
    }
}

/**
 * Update a user's password
 */
export async function updateUserPassword(userId: string, hashedPassword: string): Promise<boolean> {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        })
        return true
    } catch {
        return false
    }
}
