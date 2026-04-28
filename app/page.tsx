import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, Search, CreditCard, BarChart3 } from "lucide-react"
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

      {/* CTA Section */}
      <HomeCTASection />
    </div>
  )
}
