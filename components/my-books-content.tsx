"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { BorrowedBook, Book, Author } from "@/lib/db/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Calendar, CheckCircle, Clock, AlertTriangle } from "lucide-react"
import { useReturnBookMutation } from "@/lib/redux/services/libraryApi"
import { toast } from "sonner"
import { selectUser } from "@/lib/redux/slices/authSlice"
import { useAppSelector } from "@/lib/redux/hooks"

interface MyBooksContentProps {
  borrowed: BorrowedBook[]
  overDue: BorrowedBook[]
  returned: BorrowedBook[]
}

export function MyBooksContent({ borrowed, overDue, returned }: MyBooksContentProps) {
  const user = useAppSelector(selectUser);

  const router = useRouter()
  const [returningId, setReturningId] = useState<string | null>(null)

  const currentBooks = borrowed.sort((a, b) => new Date(a.borrowed_at).getTime() - new Date(b.borrowed_at).getTime())
  const returnedBooks = returned.sort((a, b) => new Date(b.returned_at).getTime() - new Date(a.returned_at).getTime())
  const overdueBooks = overDue.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())

  const [returnBook] = useReturnBookMutation()

  const handleReturn = async (borrowedBook: BorrowedBook) => {
    setReturningId(borrowedBook.id)
    toast.success("Book returned successfully", {
      classNames: {
        icon: 'text-green-500',
      }
    })

    returnBook({ borrowId: borrowedBook.id, userId: borrowedBook.user_id, bookId: borrowedBook.book_id || "" }).unwrap().then((data) => {
      // do nothing if it returns successfully
      router.refresh()
    }, (error) => {
      console.error("Error returning book:", error)
      toast.error("Failed to return book", {
        classNames: {
          icon: 'text-red-500',
        }
      })
    }).finally(() => {
      setReturningId(null)
    })
  }

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date()

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Borrowed Books</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="current">
          <TabsList className="mb-4">
            <TabsTrigger value="current">Current ({currentBooks.length})</TabsTrigger>
            <TabsTrigger value="overdue">Overdue ({overDue.length})</TabsTrigger>
            <TabsTrigger value="returned">Returned ({returnedBooks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-4">
            {currentBooks.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No books currently borrowed</p>
                {!user?.isAdmin &&
                  <Button asChild className="mt-4">
                    <Link href="/books">Browse Books</Link>
                  </Button>
                }
              </div>
            ) : (
              currentBooks.map((item) => (
                <div key={item.id} className="flex flex-col md:flex-row gap-4 p-4 border border-border rounded-lg">
                  <div className="h-24 w-16 bg-primary/20 rounded flex items-center justify-center shrink-0">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                      <Link
                        href={`/books/${item.book_id}`}
                      >
                        {item.title}
                      </Link>
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 hover:text-amber-600 transition-colors">
                      <Link
                        href={`/authors/${item.author_id}`}
                      >
                        {item.author_name}
                      </Link>
                    </p>
                    <div className="flex flex-col md:flex-row gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1 text-primary">
                        <Calendar className="h-3.5 w-3.5" />
                        Borrowed: {formatDate(item.borrowed_at)}
                      </span>
                      <span
                        className={`flex items-center gap-1 ${isOverdue(item.due_date) ? "text-destructive" : "text-amber-600"
                          }`}
                      >
                        {isOverdue(item.due_date) ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : (
                          <Clock className="h-3.5 w-3.5" />
                        )}
                        Due: {formatDate(item.due_date)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    {isOverdue(item.due_date) && <Badge variant="destructive">Overdue</Badge>}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReturn(item)}
                      disabled={returningId === item.id}
                    >
                      {returningId === item.id ? "Returning..." : "Return"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="overdue" className="space-y-4">
            {overdueBooks.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No overdue books yet</p>
              </div>
            ) : (
              overdueBooks.map((item) => (
                <div key={item.id} className="flex flex-col md:flex-row gap-4 p-4 border border-border rounded-lg opacity-75">
                  <div className="h-24 w-16 bg-linear-to-br from-destructive/20 to-destructive/5 rounded flex items-center justify-center shrink-0">
                    <BookOpen className="h-6 w-6 text-destructive/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                      <Link
                        href={`/books/${item.book_id}`}
                      >
                        {item.title}
                      </Link>
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 hover:text-amber-600 transition-colors">
                      <Link
                        href={`/authors/${item.author_id}`}
                      >
                        {item.author_name}
                      </Link>
                    </p>
                    <div className="flex flex-col md:flex-row gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex text-primary items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Borrowed: {formatDate(item.borrowed_at)}
                      </span>
                      <span
                        className={`flex items-center gap-1 ${isOverdue(item.due_date) ? "text-destructive" : "text-muted-foreground"
                          }`}
                      >
                        {isOverdue(item.due_date) ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : (
                          <Clock className="h-3.5 w-3.5" />
                        )}
                        Due: {formatDate(item.due_date)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    {isOverdue(item.due_date) && <Badge variant="destructive">Overdue</Badge>}
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleReturn(item)}
                      disabled={returningId === item.id}
                    >
                      {returningId === item.id ? "Returning..." : "Return Now"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="returned" className="space-y-4">
            {returnedBooks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No returned books yet</p>
              </div>
            ) : (
              returnedBooks.map((item) => (
                <div key={item.id} className="flex flex-col md:flex-row gap-4 p-4 border border-border rounded-lg opacity-75">
                  <div className="h-24 w-16 bg-linear-to-br from-primary/20 to-primary/5 rounded flex items-center justify-center shrink-0">
                    <BookOpen className="h-6 w-6 text-primary/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                      <Link
                        href={`/books/${item.book_id}`}
                      >
                        {item.title}
                      </Link>
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 hover:text-amber-600 transition-colors">
                      <Link
                        href={`/authors/${item.author_id}`}
                      >
                        {item.author_name}
                      </Link>
                    </p>
                    <div className="flex flex-col md:flex-row gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Borrowed: {formatDate(item.borrowed_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Returned: {formatDate(item.returned_at || "")}
                      </span>
                    </div>
                  </div>
                  <Badge variant="destructive" className="self-end">Returned</Badge>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
