import { Suspense } from "react"
import { getEbooks } from "@/lib/ebooks"
import { EbookBrowse } from "@/components/ebook-browse"
import { Skeleton } from "@/components/ui/skeleton"
import type { Ebook } from "@/lib/ebooks/types"

export default async function EbooksPage() {
  let ebooks: Ebook[]
  try {
    ebooks = await getEbooks()
  } catch (err) {
    console.error("[ebooks] getEbooks failed:", err)
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Ebooks</h1>
        <p className="text-muted-foreground">
          Ebooks are temporarily unavailable. Please try again later.
        </p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Ebooks</h1>
        <p className="text-muted-foreground">Browse and read ebooks from our collection.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-10 w-full max-w-md" />}>
        <EbookBrowse ebooks={ebooks} />
      </Suspense>
    </div>
  )
}
