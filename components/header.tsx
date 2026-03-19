"use client"
import Link from "next/link"
import { BookOpen, Search, BarChart3, Library, Shield, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserNav } from "@/components/user-nav"
import { MobileNav } from "@/components/mobile-nav"
import { useAppSelector } from "@/lib/redux/hooks"
import { selectUser } from "@/lib/redux/slices/authSlice"
import { ThemeToggle } from "@/components/theme-toggle"

export function Header() {
  const user = useAppSelector(selectUser)
  const isAdmin = user?.isAdmin ?? false

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left Side: Logo & Mobile Nav */}
        <div className="flex items-center gap-2">
          <MobileNav />
          <Link href="/" className="flex items-center gap-2">
            <Library className="h-6 w-6 text-pink-600 dark:text-pink-500" />
            <span className="text-xl font-semibold text-pink-700 dark:text-pink-500 hidden sm:inline-block">ISP Library</span>
          </Link>
        </div>

        {/* Center: Desktop Nav */}
        <div className="hidden md:flex flex-1 justify-center">
          <nav className="flex items-center gap-6">
            <Link
              href="/books"
              className="flex items-center shrink-0 gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Search className="h-4 w-4" />
              Browse Books
            </Link>
            <Link
              href="/authors"
              className="flex items-center shrink-0 gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Users className="h-4 w-4" />
              Authors
            </Link>
            <Link
              href="/analytics"
              className="flex items-center shrink-0 gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Link>
            {user.user_id && !isAdmin && (
              <Link
                href="/my-books"
                className="flex items-center shrink-0 gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                My Books
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center shrink-0 gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
          </nav>
        </div>

        {/* Right Side: Auth */}
        <div className="flex items-center justify-end gap-3">
          <ThemeToggle />
          {user.user_id ? (
            <UserNav />
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/sign-up">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}