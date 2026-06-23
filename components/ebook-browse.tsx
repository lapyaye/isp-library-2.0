"use client"

import { useCallback, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Book, Calendar, Check, ChevronsUpDown, Eye, Layers, Library, Search, User, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { EbookPreviewModal } from "@/components/ebook-preview-modal"
import { cn } from "@/lib/utils"
import { filterAndPaginate, uniqueAuthors, uniqueYears } from "@/lib/ebooks/browse"
import type { Ebook } from "@/lib/ebooks/types"

const PAGE_SIZE = 24

export function EbookBrowse({ ebooks }: { ebooks: Ebook[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState("")
  const [author, setAuthor] = useState("")
  const [authorOpen, setAuthorOpen] = useState(false)
  const [year, setYear] = useState<number | null>(null)
  const [page, setPage] = useState(1)

  const authors = useMemo(() => uniqueAuthors(ebooks), [ebooks])
  const years = useMemo(() => uniqueYears(ebooks), [ebooks])

  const result = useMemo(
    () => filterAndPaginate(ebooks, query, author, year, page, PAGE_SIZE),
    [ebooks, query, author, year, page],
  )

  const selectAuthor = useCallback((value: string) => {
    setAuthor(value)
    setAuthorOpen(false)
    setPage(1)
  }, [])

  const selectYear = useCallback((value: string) => {
    setYear(value === "all" ? null : Number(value))
    setPage(1)
  }, [])

  const selectedId = searchParams.get("book")
  const selectedEbook = useMemo(
    () => (selectedId ? ebooks.find((e) => e.id === selectedId) ?? null : null),
    [ebooks, selectedId],
  )

  const openBook = useCallback(
    (id: string) => {
      router.push(`${pathname}?book=${encodeURIComponent(id)}`, { scroll: false })
    },
    [router, pathname],
  )

  const closeBook = useCallback(() => {
    router.push(pathname, { scroll: false })
  }, [router, pathname])

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Search by title, author, or publisher…"
            className="pl-9"
            aria-label="Search ebooks"
          />
        </div>

        <div className="flex items-center gap-2">
          <Popover open={authorOpen} onOpenChange={setAuthorOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={authorOpen}
                aria-label="Filter by author"
                className="w-full justify-between sm:w-64"
              >
                <span className="truncate">{author || "All authors"}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search authors…" />
                <CommandList>
                  <CommandEmpty>No authors found.</CommandEmpty>
                  <CommandGroup>
                    {authors.map((a) => (
                      <CommandItem key={a} value={a} onSelect={() => selectAuthor(a)}>
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            author === a ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="truncate">{a}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {author && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Clear author filter"
              onClick={() => selectAuthor("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Select value={year === null ? "all" : String(year)} onValueChange={selectYear}>
          <SelectTrigger className="w-full sm:w-36" aria-label="Filter by year">
            <SelectValue placeholder="All years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {result.totalResults} ebook{result.totalResults === 1 ? "" : "s"}
      </p>

      {result.items.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">No ebooks match your search.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {result.items.map((ebook) => (
            <Card
              key={ebook.id}
              onClick={() => openBook(ebook.id)}
              className="group overflow-hidden flex flex-row h-full cursor-pointer transition-all duration-300 shadow-xs hover:shadow-sm border-border/40"
            >
              {/* Visual sidebar */}
              <div className="w-2 bg-primary/20 group-hover:bg-primary transition-colors shrink-0" />

              <div className="flex-1 flex flex-row items-center p-4 gap-6">
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest opacity-80">
                      <Library className="h-3 w-3" />
                      <span>Catalog Record</span>
                    </div>
                    <CardTitle className="leading-8 font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                      {ebook.title}
                    </CardTitle>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <User className="h-3.5 w-3.5 opacity-60 shrink-0" />
                      <span className="truncate">{ebook.author || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 opacity-60 shrink-0" />
                      <span>{ebook.year || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Book className="h-3.5 w-3.5 opacity-60 shrink-0" />
                      <span className="truncate">{ebook.publisher || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Layers className="h-3.5 w-3.5 opacity-60 shrink-0" />
                      <span className="truncate">{ebook.edition || "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 border-l border-border/50 pl-6 h-full flex items-center">
                  <Button
                    variant="ghost"
                    aria-label={ebook.available ? "Preview ebook" : "Preview unavailable"}
                    onClick={(e) => {
                      e.stopPropagation()
                      openBook(ebook.id)
                    }}
                    className={cn(
                      "rounded-full h-12 w-12 p-0 hover:bg-primary dark:hover:bg-primary/80 hover:text-white border border-transparent transition-all",
                      !ebook.available && "opacity-40",
                    )}
                  >
                    <Eye className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {result.totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  setPage((p) => Math.max(1, p - 1))
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-4 text-sm">
                Page {result.page} of {result.totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  setPage((p) => Math.min(result.totalPages, p + 1))
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <EbookPreviewModal ebook={selectedEbook} open={selectedEbook !== null} onClose={closeBook} />
    </div>
  )
}
