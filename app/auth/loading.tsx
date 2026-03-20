import { Loader2, Library } from "lucide-react"

export default function RootLoading() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] w-full items-center justify-center space-y-4 bg-background/50 backdrop-blur-sm">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-16 w-16 rounded-full border-4 border-primary/20 animate-pulse" />
        <div className="p-4 rounded-full bg-primary/10 relative">
          <Library className="h-8 w-8 text-primary animate-pulse" />
        </div>
      </div>
      <div className="flex items-center space-x-2 text-muted-foreground animate-in fade-in duration-500">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm font-medium tracking-wide">Loading Library...</span>
      </div>
    </div>
  )
}
