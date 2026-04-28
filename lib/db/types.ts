// Application Types (cleaned up from Baserow-specific types)

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
    success: boolean
    user: T
    accessToken: string
    error?: string
}

export interface ApiReturnResponse<T> {
    success: boolean
    data: T
    error?: string
}

/**
 * Session user (stored in cookie/localStorage)
 */
export interface SessionUser {
    id: string
    user_id: string
    email: string
    username: string
    isAdmin: boolean
    isVerified?: boolean
    created_at: string
    updated_at?: string
}

/**
 * Frontend types
 */
export interface AuthorBooks {
    id: string
    author_id: string
    name: string
    books?: Book[]
}

export interface Author {
    id: string
    author_id: string
    name: string
    books?: string[]
}

export interface Publisher {
    id: string
    publisher_id: string
    name: string
}

export interface Book {
    id: string
    book_id: string
    title: string
    author_name: string | null
    language: string | null
    author_id?: string | null
    publisher_name: string | null
    publisher_id?: string | null
    place_of_publication: string | null
    published_year: number | null
    edition: string | null
    price: number | null
    class_number: string | null
    source: string | null
    notes: string | null
    created_at: string
}

export interface BorrowedBook {
    id: string
    borrow_id: string
    book_id: string | null
    title: string | null
    user_id: string | null
    username: string | null
    email: string | null
    author_id?: string | null
    author_name: string | null
    publisher_id?: string | null
    publisher_name?: string | null
    borrowed_at: string
    due_date: string
    returned_at: string
    status: "borrowed" | "returned" | "overdue"
}

export interface UserProfile {
    id: string
    user_id: string
    username: string
    email: string
    is_admin: boolean
    borrow_books: string[] | null
    created_at?: string
    updated_at?: string
}
