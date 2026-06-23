"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, BookMarked, Search, BarChart3, Library, Shield, Users, Menu, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useAppSelector } from "@/lib/redux/hooks"
import { selectUser } from "@/lib/redux/slices/authSlice"
import { cn } from "@/lib/utils"

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const user = useAppSelector(selectUser)
  const isAdmin = user?.isAdmin || false

  const routes = [
    {
      href: "/books",
      label: "Browse Books",
      icon: Search,
      active: pathname === "/books",
      show: true,
    },
    {
      href: "/ebooks",
      label: "Ebooks",
      icon: BookMarked,
      active: pathname === "/ebooks",
      show: true,
    },
    {
      href: "/authors",
      label: "Authors",
      icon: Users,
      active: pathname === "/authors",
      show: true,
    },
    {
      href: "/analytics",
      label: "Analytics",
      icon: BarChart3,
      active: pathname === "/analytics",
      show: true,
    },
    {
      href: "/my-books",
      label: "My Books",
      icon: BookOpen,
      active: pathname === "/my-books",
      show: !!user.user_id && !isAdmin,
    },
    {
      href: "/admin",
      label: "Admin",
      icon: Shield,
      active: pathname === "/admin" || pathname.startsWith("/admin/"),
      show: !!isAdmin,
    },
    {
      href: "/admin/books/new",
      label: "Add Book",
      icon: Plus,
      active: pathname === "/admin/books/new",
      show: !!isAdmin,
    },
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle mobile menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0">
        <SheetHeader className="text-left py-4">
          <Link
            href="/"
            className="flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            <Library className="h-6 w-6 text-pink-600 dark:text-pink-400" />
            <SheetTitle className="text-xl font-semibold text-pink-700 dark:text-pink-300">ISP Library</SheetTitle>
          </Link>
        </SheetHeader>
        <div className="flex flex-col gap-4 py-4 pl-1 pr-6">
          {routes.filter(r => r.show).map((route) => (
            <Link
              key={route.href}
              href={route.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 text-sm font-medium px-3 py-2 rounded-md transition-colors",
                route.active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-primary/50 hover:text-foreground"
              )}
            >
              <route.icon className="h-4 w-4" />
              {route.label}
            </Link>
          ))}
          {!user.user_id && (
            <div className="flex flex-col gap-2 mt-4 px-3 border-t pt-6">
              <Button asChild variant="outline" className="w-full justify-center">
                <Link href="/auth/login" onClick={() => setOpen(false)}>
                  Sign In
                </Link>
              </Button>
              <Button asChild className="w-full justify-center">
                <Link href="/auth/sign-up" onClick={() => setOpen(false)}>
                  Get Started
                </Link>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
