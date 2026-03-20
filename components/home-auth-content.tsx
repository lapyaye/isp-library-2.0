'use client'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppSelector } from "@/lib/redux/hooks"
import { selectUser, selectIsAuthenticated } from "@/lib/redux/slices/authSlice"

export function HomeHeroButtons() {
    const session = useAppSelector(selectUser)
    const isAuthenticated = useAppSelector(selectIsAuthenticated)

    return (
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated && session.isAdmin ? (
                <Button size="lg" asChild variant="default" className="text-secondary-foreground">
                    <Link href="/admin">Go to Admin Dashboard</Link>
                </Button>
            ) : (
                <Button size="lg" asChild variant="default" className="text-secondary-foreground">
                    <Link href="/books" className="gap-2">
                        Browse Collection
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </Button>
            )}

            {!isAuthenticated && (
                <Button variant="outline" size="lg" asChild>
                    <Link href="/auth/sign-up">Create Account</Link>
                </Button>
            )}
        </div>
    )
}

export function HomeHeroButtonsSkeleton() {
    return (
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Skeleton className="h-11 w-44 rounded-md" />
        </div>
    )
}

export function HomeCTASection() {
    const session = useAppSelector(selectUser)
    const isAuthenticated = useAppSelector(selectIsAuthenticated)

    return (
        <section className="py-20">
            <div className="container mx-auto px-4">
                <Card className="bg-primary text-primary-foreground border-0">
                    <CardContent className="p-12 text-center">
                        <h2 className="text-3xl font-bold mb-4 text-balance">
                            {!isAuthenticated ? "Ready to Start Reading?" :
                                session.isAdmin ? "Ready to Manage and Track Borrowed Books?" : "Ready to Start Reading?"}
                        </h2>
                        <p className="mb-8 text-primary-foreground/80 max-w-xl mx-auto">
                            {!isAuthenticated ? "Join our library today and get access to thousands of books. Track your reading, discover new authors, and more." :
                                session.isAdmin ? "Manage your library and borrowed books from users" : "Manage your borrowed books and keep track of your reading progress."}
                        </p>
                        <Button size="lg" variant="outline" className="text-primary dark:text-primary-foreground" asChild>
                            {!isAuthenticated ? <Link href="/auth/sign-up">Get Your Library Card</Link> :
                                session.isAdmin ? <Link href="/admin">Go to Admin Dashboard</Link> : <Link href="/my-books">My Books</Link>}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </section>
    )
}

export function HomeCTASectionSkeleton() {
    return (
        <section className="py-20">
            <div className="container mx-auto px-4">
                <Skeleton className="h-80 w-full rounded-2xl" />
            </div>
        </section>
    )
}
