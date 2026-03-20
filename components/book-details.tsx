"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Calendar, User, ArrowLeft, CheckCircle, AlertCircle, Ban, Globe, MapPinCheckInside, BookIcon } from "lucide-react"
import { useBorrowBookMutation } from "@/lib/redux/services/libraryApi"
import { Book, BorrowedBook, SessionUser } from "@/lib/db/types"
import { toast } from "sonner"

export function BookDetails({
  book,
  borrowedBook,
  hasBorrowed,
  currentBorrowedByUser,
  checkBookBorrowed,
  user
}: { book: Book | undefined, borrowedBook: BorrowedBook | null, hasBorrowed: boolean, currentBorrowedByUser: number, checkBookBorrowed?: BorrowedBook | null, user: SessionUser | null }) {

  const router = useRouter()

  const [borrowBook, { isLoading: isBorrowing }] = useBorrowBookMutation()

  const maxBorrowsPerPeriod = +process.env.MAX_BORROWS_PER_PERIOD! || 2
  const isBookBorrowed = !!checkBookBorrowed

  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const hasReachedBorrowLimit = currentBorrowedByUser >= maxBorrowsPerPeriod

  const handleBorrow = async () => {
    if (user?.isAdmin) {
      setMessage({
        type: "error",
        text: "Administrators cannot borrow books.",
      })
      return
    }

    if (hasReachedBorrowLimit) {
      setMessage({
        type: "error",
        text: `You have reached the limit of ${maxBorrowsPerPeriod} books.`,
      })
      return
    }

    setMessage(null)

    if (!book?.book_id || !user?.user_id) {
      setMessage({
        type: "error",
        text: `Missing info. BookID: ${book?.book_id}, UserID: ${user?.id}`
      })
      return
    }

    try {
      toast.success("Book borrowed successfully", {
        classNames: {
          icon: 'text-green-500',
        }
      })

      await borrowBook({
        bookId: book.book_id,
        userId: user.user_id,
        authorId: book.author_id ?? "",
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      }).unwrap()
    } catch (err) {
      toast.error("Failed to borrow book. Please try again.", {
        classNames: {
          icon: 'text-red-500',
        }
      })
    }
  }

  const renderBorrowAction = () => {
    if (user?.isAdmin) {
      return (
        <Badge variant="destructive" className="text-white p-2 cursor-not-allowed">
          <Ban className="h-4 w-4 mr-1.5" />
          Admins Cannot Borrow
        </Badge>
      )
    }

    if (hasBorrowed || isBookBorrowed) {
      return (
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-primary border-primary cursor-not-allowed">
            <CheckCircle className="h-4 w-4 mr-1.5" />
            Currently Borrowed
          </Badge>
        </div>
      )
    }

    if (hasReachedBorrowLimit) {
      return (
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-destructive p-2 cursor-not-allowed mr-2">
            <Ban className="h-4 w-4 mr-1.5" />
            Borrow Limit Reached
          </Badge>
          <Button variant="destructive">
            <Link href="/my-books">
              Return Books
            </Link>
          </Button>
        </div>
      )
    }

    if (book?.book_id && !isBookBorrowed) {
      return (
        <Button variant="default" className="hover:bg-primary/80" onClick={handleBorrow} disabled={isBorrowing}>
          {isBorrowing ? "Borrowing..." : "Borrow"}
        </Button>
      )
    }

    return (
      <Badge variant="destructive" className="cursor-not-allowed">
        <AlertCircle className="h-4 w-4 mr-1.5" />
        Not Available
      </Badge>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/books">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Books
        </Link>
      </Button>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card className="overflow-hidden border-border hidden md:block">
            <div className="aspect-3/4 bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <BookOpen className="h-24 w-24 text-primary/40" />
            </div>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-foreground mb-4 leading-8">{book?.title}</h1>
            {book?.author_name && (
              <Link
                href={`/authors/${book.author_id}`}
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <User className="h-5 w-5" />
                <p className="font-semibold text-foreground flex items-center gap-2">{book.author_name}</p>
              </Link>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {book?.published_year && (
              <Badge variant="outline" className="text-sm p-2">
                <Calendar className="h-4 w-4 mr-1.5" />
                {book?.published_year}
              </Badge>
            )}
            {
              book?.language && (
                <Badge variant="outline" className="text-sm p-2">
                  <Globe className="h-4 w-4 mr-1.5" />
                  {book?.language}
                </Badge>
              )
            }
            {
              book?.publisher_name && (
                <Badge variant="outline" className="text-sm p-2">
                  <BookIcon className="h-4 w-4 mr-1.5" />
                  {book?.publisher_name}
                </Badge>
              )
            }
            {
              book?.place_of_publication && (
                <Badge variant="outline" className="text-sm p-2">
                  <MapPinCheckInside className="h-4 w-4 mr-1.5" />
                  {book?.place_of_publication}
                </Badge>
              )
            }
          </div>

          <Card className="border-border">
            <CardContent className="p-4">
              <h2 className="font-semibold mb-2 text-foreground">Your Borrowing Status</h2>
              <p className="text-sm text-muted-foreground">
                Books borrowed:{" "}
                <span className="font-medium text-foreground">{currentBorrowedByUser}</span> / {maxBorrowsPerPeriod}
              </p>
              <div className="w-48 h-2 bg-primary/20 rounded-full mt-2">
                <div
                  className={`h-2 rounded-full transition-all overflow-clip ${hasReachedBorrowLimit ? "bg-destructive" : "bg-primary"}`}
                  style={{
                    width: `${(currentBorrowedByUser >= 2 ? 2 : currentBorrowedByUser) / maxBorrowsPerPeriod * 100}%`,
                  }}
                />
              </div>
              {hasReachedBorrowLimit && (
                <p className="text-xs text-destructive mt-2">
                  You can only borrow {maxBorrowsPerPeriod} books per period.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <h2 className="font-semibold mb-3 text-foreground">Borrow the book</h2>
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div>
                  {
                    (hasBorrowed && borrowedBook?.user_id === user?.user_id) && <p className="text-sm text-muted-foreground mb-3">
                      This book is currently borrowed by you.
                    </p>
                  }

                  {
                    (isBookBorrowed && checkBookBorrowed?.user_id !== user?.user_id) && <p className="text-sm text-muted-foreground mb-3">
                      This book is currently borrowed by other user.
                    </p>
                  }

                  {(!hasReachedBorrowLimit && !hasBorrowed && !isBookBorrowed) && <p className="text-sm text-muted-foreground mb-3">
                    This book is currently available for borrowing.
                  </p>}

                  {hasReachedBorrowLimit && <p className="text-sm text-destructive mb-3">
                    You have reached your borrowing limit. Please return a book.
                  </p>}
                </div>

                {renderBorrowAction()}
              </div>

              {message && (
                <div
                  className={`message mt-4 p-3 rounded-lg text-sm ${message.type === "success" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                    }`}
                >
                  {message.text}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <h2 className="font-semibold mb-2 text-foreground">Description</h2>
              <p className="text-muted-foreground leading-relaxed">{book?.notes || "No description available."}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
