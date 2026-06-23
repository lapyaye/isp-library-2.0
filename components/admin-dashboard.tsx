"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Users, Clock, CheckCircle, Loader2, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AdminBorrowGrid } from "@/components/admin-borrow-grid"
import { useGetAllBorrowRecordsQuery } from "@/lib/redux/services/libraryApi"
import { BorrowedBook } from "@/lib/db/types"

export function AdminDashboard() {
    const { data: borrowedBooks, isLoading, isError } = useGetAllBorrowRecordsQuery(undefined, {
        pollingInterval: 15000,
        skipPollingIfUnfocused: true,
        refetchOnFocus: true,
        refetchOnReconnect: true,
    })

    // Calculate stats
    const stats = useMemo(() => {
        if (!borrowedBooks) return {
            totalBorrowed: 0,
            currentlyBorrowed: 0,
            returned: 0,
            overdue: 0,
            uniqueUsers: 0
        }

        const totalBorrowed = borrowedBooks.length
        const currentlyBorrowed = borrowedBooks.filter((book: BorrowedBook) => book.status === "borrowed").length
        const returned = borrowedBooks.filter((book: BorrowedBook) => book.status === "returned").length
        const overdue = borrowedBooks.filter((book: BorrowedBook) => {
            if (book.status !== "borrowed") return false
            return new Date(book.due_date) < new Date()
        }).length

        const uniqueUsers = new Set(borrowedBooks.map((book: BorrowedBook) => book.user_id)).size

        return { totalBorrowed, currentlyBorrowed, returned, overdue, uniqueUsers }
    }, [borrowedBooks])

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-muted-foreground animate-pulse">Loading dashboard data...</p>
            </div>
        )
    }

    if (isError) {
        return (
            <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-muted/20">
                <p className="text-muted-foreground text-lg">Failed to load admin data. Please try again later.</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-pink-700 dark:text-pink-500 mb-2">Admin Dashboard</h1>
                <p className="text-muted-foreground">Track and manage all book borrowing activities</p>
            </div>

            <div className="mb-6">
                <Button asChild>
                    <Link href="/admin/books/new">+ Add Book</Link>
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Borrowed</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalBorrowed}</div>
                        <p className="text-xs text-muted-foreground">All time records</p>
                    </CardContent>
                </Card>

                <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Returned</CardTitle>
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{stats.returned}</div>
                        <p className="text-xs text-muted-foreground">Completed returns</p>
                    </CardContent>
                </Card>

                <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Currently Borrowed</CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{stats.currentlyBorrowed}</div>
                        <p className="text-xs text-muted-foreground">Books out now</p>
                    </CardContent>
                </Card>

                <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                        <Clock className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
                        <p className="text-xs text-muted-foreground">Past due date</p>
                    </CardContent>
                </Card>

                <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <Link href={`admin/details/users`} title="view details">
                            <div className="group flex items-center justify-between">
                                <div>
                                    <div className="text-2xl font-bold text-primary">{stats.uniqueUsers}</div>
                                    <p className="text-xs text-muted-foreground">Unique borrowers</p>
                                </div>
                                <div className="p-2 rounded-full bg-primary/25 group-hover:bg-primary group-hover:text-white transition-all">
                                    <ArrowRight className="h-4 w-4 transition-transform" />
                                </div>
                            </div>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Borrow Records Grid */}
            <Card className="border-border/40 shadow-lg">
                <CardHeader>
                    <CardTitle>All Borrow Records</CardTitle>
                    <CardDescription>Complete history of all book borrowing activities</CardDescription>
                </CardHeader>
                <CardContent>
                    <AdminBorrowGrid borrowedBooks={borrowedBooks || []} />
                </CardContent>
            </Card>
        </div>
    )
}
