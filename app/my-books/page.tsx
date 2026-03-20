"use client"

import { MyBooksContent } from "@/components/my-books-content"
import { LibraryCard } from "@/components/library-card"
import { useAppSelector } from "@/lib/redux/hooks"
import { selectUser } from "@/lib/redux/slices/authSlice"
import { useGetBorrowedBooksByUserIdQuery } from "@/lib/redux/services/libraryApi"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

export default function MyBooksPage() {
  const user = useAppSelector(selectUser)

  const { data: books, isLoading, isError } = useGetBorrowedBooksByUserIdQuery(user.user_id, {
    skip: !user.user_id,
  })

  const borrowed = books?.filter((book) => book.status === "borrowed")
  const overDue = borrowed?.filter((book) => book.due_date < new Date().toISOString())
  const returned = books?.filter((book) => book.status === "returned")

  if (isLoading) {
    <div className="container mx-auto px-4 py-12 space-y-8">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
      </div>

      {/* Borrowed Books Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Books</h1>
          <p className="text-muted-foreground">Manage your borrowed books and view your library card</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Failed to load books</h2>
          <p className="text-muted-foreground">Something went wrong while fetching your borrowed books. Please try again later.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <h1 className="text-3xl font-bold mb-2">My Books</h1>
          <div className="flex-1 text-center md:text-left space-y-2 self-center">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <Badge variant="default" className="bg-amber-700 w-fit mx-auto md:mx-0 font-bold px-3 py-1">
                {`${borrowed?.length || 0} Borrowed`}
              </Badge>
              <Badge variant="destructive" className="w-fit mx-auto md:mx-0 font-bold px-3 py-1">
                {`${overDue?.length || 0} Overdue`}
              </Badge>
              <Badge variant="default" className="w-fit mx-auto md:mx-0 font-bold px-3 py-1">
                {`${returned?.length || 0} Returned`}
              </Badge>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground">Manage your borrowed books and download your library card.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <MyBooksContent borrowed={borrowed || []} overDue={overDue || []} returned={returned || []} />
        </div>
        <div className="lg:col-span-1">
          <LibraryCard
            user={user}
            borrowedCount={borrowed?.length || 0}
            memberSince={user.created_at}
          />
        </div>
      </div>
    </div>
  )
}

