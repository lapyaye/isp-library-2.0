import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, Search, CreditCard, BarChart3, CalendarClock, RotateCw, BookHeart, MapPin, ShieldCheck } from "lucide-react"
import {
  HomeHeroButtons,
  HomeCTASection,
} from "@/components/home-auth-content"

export default function HomePage() {
  const features = [
    {
      icon: Search,
      title: "Smart Search",
      description: "Search books by title, author, or publication year with instant results.",
    },
    {
      icon: BookOpen,
      title: "Easy Borrowing",
      description: "Borrow books with a single click and manage your reading list.",
    },
    {
      icon: CreditCard,
      title: "Library Card",
      description: "Generate your digital library card with all your borrowed books.",
    },
    {
      icon: BarChart3,
      title: "Analytics",
      description: "View insights about the library collection with beautiful charts.",
    },
  ]

  return (
    <div className="flex flex-col">
      {/* Hero Section - Static Shell */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]" />
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl text-balance">
              Your
              <span className="text-primary/80"> Library </span>
              from ISP Community
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground text-pretty">
              Discover, borrow, and track books effortlessly. Our digital library management system brings the joy of
              reading to your fingertips.
            </p>
            <HomeHeroButtons />
          </div>
        </div>
      </section>

      {/* Features Section - Static Shell */}
      <section className="py-20 bg-primary/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Everything You Need</h2>
            <p className="mt-3 text-muted-foreground">Powerful features to enhance your library experience</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="group hover:shadow-lg transition-shadow border-border">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Rules and Regulations Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]" />
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Library Rules & Regulations</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              To ensure a great experience for all members, please adhere to the following guidelines.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Rule 1 */}
            <div className="flex gap-4 p-6 rounded-xl bg-background border border-border shadow-sm">
              <div className="shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CalendarClock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">1. Borrow Period</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  The maximum borrow period for books is <span className="font-semibold text-foreground text-nowrap">two (2) weeks (14 days)</span>.
                </p>
              </div>
            </div>

            {/* Rule 2 */}
            <div className="flex gap-4 p-6 rounded-xl bg-background border border-border shadow-sm">
              <div className="shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <RotateCw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">2. Renewal</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  A one-time renewal for an additional 14 days may be granted if the book isn't requested by others. Requests must be submitted <span className="font-semibold text-foreground">prior to the due date</span>.
                </p>
              </div>
            </div>

            {/* Rule 3 */}
            <div className="flex gap-4 p-6 rounded-xl bg-background border border-border shadow-sm">
              <div className="shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <BookHeart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">3. User Responsibility for Book Care</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Borrowers are responsible for maintaining books in good condition. <span className="font-semibold text-foreground">Writing, highlighting, folding pages, or causing any other damage</span> to the books is strictly prohibited. In the event of loss or damage, the borrower must replace the book.
                </p>
              </div>
            </div>

            {/* Rule 4 */}
            <div className="flex gap-4 p-6 rounded-xl bg-background border border-border shadow-sm">
              <div className="shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">4. Return Policy</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Books must be returned on or before the due date at the <span className="font-semibold text-foreground">designated return location</span> only.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 p-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 text-center lg:w-1/2 lg:mx-auto">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Official Policy of ISP-Myanmar Library
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <HomeCTASection />
    </div>
  )
}
