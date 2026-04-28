"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { User, Search, Book, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useGetAuthorsQuery } from "@/lib/redux/services/libraryApi"
import { Skeleton } from "./ui/skeleton"
import { Avatar, AvatarFallback } from "./ui/avatar"

export function AuthorsList() {
    const { data: authors, isLoading, isError } = useGetAuthorsQuery()
    const [searchTerm, setSearchTerm] = useState("")

    const filteredAuthors = useMemo(() => {
        if (!authors) return []

        return authors.filter((author) =>
            searchTerm ? author.name.toLowerCase().includes(searchTerm.toLowerCase()) : true
        ).sort((a, b) => (b.books?.length || 0) - (a.books?.length || 0))
    }, [authors, searchTerm])

    if (isLoading) {
        return (
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-full md:w-80 rounded-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <Skeleton key={i} className="h-48 w-full rounded-2xl" />
                    ))}
                </div>
            </div>
        )
    }

    if (isError) {
        return (
            <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-muted/20">
                <p className="text-muted-foreground text-lg">Failed to load authors. Please try again later.</p>
            </div>
        )
    }

    return (
        <div className="space-y-10">
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                <div className="space-y-1 w-full lg:w-auto text-center lg:text-left">
                    <h1 className="text-3xl font-black tracking-tight text-foreground">Authors</h1>
                    <p className="text-muted-foreground text-base">Browse our collection of {authors?.length || 0} distinguished writers.</p>
                </div>
                <div className="relative w-full lg:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Search authors..."
                        className="pl-12 rounded-full h-12 border-border/60 bg-muted/30 focus-visible:ring-primary/20 transition-all font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAuthors.map((author) => (
                    <Link key={author.id} href={`/authors/${author.id}`}>
                        <Card className="group relative h-full hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden bg-card/50 backdrop-blur-sm">
                            {/* Decorative background element */}
                            <div className="absolute top-0 right-0 -tr-4 translate-x-12 -translate-y-12 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />

                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-14 w-14 border-2 border-primary/10 group-hover:border-primary/30 transition-all">
                                        <AvatarFallback className="bg-primary text-primary-foreground">
                                            <User className="h-7 w-7" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors leading-6">
                                            {author.name}
                                        </CardTitle>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 font-medium">
                                            <Book className="h-3.5 w-3.5 text-primary/60" />
                                            <span>{author.books?.length || 0} {author.books?.length === 1 ? "Book" : "Books"}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                                    <span className="text-xs font-bold text-black/80 uppercase tracking-widest">View Profile</span>
                                    <div className="p-2 rounded-full bg-primary/5 group-hover:bg-primary dark:group-hover:bg-primary/80 group-hover:text-white transition-all">
                                        <ArrowRight className="h-4 w-4 transition-transform" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {filteredAuthors.length === 0 && (
                <div className="text-center py-24 border-2 border-dashed rounded-3xl">
                    <User className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-xl font-bold">No authors found</h3>
                    <p className="text-muted-foreground">Try adjusting your search terms</p>
                    <Button
                        variant="outline"
                        className="mt-2 text-primary"
                        onClick={() => setSearchTerm("")}
                    >
                        Clear search
                    </Button>
                </div>
            )}
        </div>
    )
}
