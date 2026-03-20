import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Library, User, Calendar, BookOpen, Download } from "lucide-react"
import { useRef, useCallback } from "react"
import { toPng } from "html-to-image"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { SessionUser, UserProfile } from "@/lib/db/types"


interface LibraryCardProps {
  user: SessionUser | UserProfile | undefined
  borrowedCount: number
  memberSince: string
}

export function LibraryCard({ user, borrowedCount, memberSince }: LibraryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleDownload = useCallback(() => {
    if (cardRef.current === null) {
      return
    }

    toPng(cardRef.current, {
      cacheBust: true, // to prevent missing parts of the card when downloaded by disabling cache
      pixelRatio: 2, // for good resolution
    })
      .then((dataUrl: string) => {
        const link = document.createElement("a")
        link.download = `library-card-${user?.username}.png`
        link.href = dataUrl
        link.click()
        toast.success("Library card downloaded successfully", {
          classNames: {
            icon: 'text-green-500',
          }
        })
      })
      .catch((err: Error) => {
        console.error("Error downloading library card:", err)
        toast.error("Error downloading library card", {
          classNames: {
            icon: 'text-red-500',
          }
        })
      })

  }, [cardRef, user])

  const memberDate = new Date(memberSince || new Date()).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  // Generate a simple card number from email
  const cardNumber = (user?.email || "guest@example.com")
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
    .toString()
    .padStart(8, "0")
    .slice(0, 8)


  return (
    <div className="space-y-4">
      <div ref={cardRef}>
        <Card className="bg-linear-to-br from-library-card to-library-card/90 text-primary-foreground border-0 shadow-xl overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Library className="h-8 w-8" />
              <span className="text-sm font-medium opacity-80 uppercase tracking-wider">Member Card</span>
            </div>
            <CardTitle className="text-xl mt-4 font-bold">ISP Library</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="font-roboto-mono text-2xl tracking-[0.2em]">{cardNumber.match(/.{1,4}/g)?.join(" ")}</div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary-foreground/20">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold opacity-70 mb-1">
                  <User className="h-3 w-3" />
                  Member
                </div>
                <p className="text-sm">{user?.username}</p>
                <p className="text-sm">{user?.email}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold opacity-70 mb-1">
                  <Calendar className="h-3 w-3" />
                  Since
                </div>
                <p className="text-sm font-semibold">{memberDate}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-primary-foreground/20">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 opacity-80" />
                <span className="text-sm font-medium">Currently Borrowed</span>
              </div>
              <span className="text-2xl font-black">{borrowedCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <Button onClick={handleDownload} variant="outline" className="flex items-center justify-center gap-2 group mx-auto hover:bg-primary/40 dark:hover:bg-primary/20">
        <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
        Download Library Card
      </Button>
    </div>
  )
}

