"use client"

import { useMemo } from "react"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useGetBooksQuery, useGetAuthorsQuery } from "@/lib/redux/services/libraryApi"
import { Loader2, Users, BookOpen, Globe2, Building2, BookMarked } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

const COLORS = ["#FF6900", "#00AC92", "#FE9900", "#7AB7AF", "#ec4899", "#06b6d4"]

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="border border-border rounded-xl shadow-xl p-3 backdrop-blur-md bg-card/95">
      {label && <p className="text-sm font-semibold text-foreground mb-1.5">{label}</p>}
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm font-medium">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
          <span className="text-muted-foreground">{entry.name || entry.dataKey}:</span>
          <span className="text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export function AnalyticsCharts({ebooksCount}: {ebooksCount: number}) {
  const { data: books, isLoading: booksLoading, isError: booksError } = useGetBooksQuery()
  const { data: authors, isLoading: authorsLoading } = useGetAuthorsQuery()
  const isMobile = useIsMobile()

  const processedData = useMemo(() => {
    if (!books) return null

    const languageCounts: Record<string, number> = {}
    books.forEach((book) => {
      if (book.language) {
        languageCounts[book.language] = (languageCounts[book.language] || 0) + 1
      }
    })
    const languageData = Object.entries(languageCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    const authorBookCounts: Record<string, number> = {}
    books.forEach((book) => {
      if (book.author_name) {
        authorBookCounts[book.author_name] = (authorBookCounts[book.author_name] || 0) + 1
      }
    })
    const authorData = Object.entries(authorBookCounts)
      .map(([name, books]) => ({ name, books }))
      .sort((a, b) => b.books - a.books)
      .slice(0, 20) // Top 20 authors

    const publisherCounts: Record<string, number> = {}
    books.forEach((book) => {
      if (book.publisher_name) {
        publisherCounts[book.publisher_name] = (publisherCounts[book.publisher_name] || 0) + 1
      }
    })
    const publisherData = Object.entries(publisherCounts).length

    const top7Publisher = Object.entries(publisherCounts).map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7)

    return { languageData, authorData, publisherData, top7Publisher, totalBooks: books.length }
  }, [books])

  if (booksLoading || authorsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Analyzing collection data...</p>
      </div>
    )
  }

  if (booksError || !processedData) {
    return (
      <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-muted/20">
        <p className="text-muted-foreground text-lg font-medium">Failed to load analytics data. Please try again later.</p>
      </div>
    )
  }

  const { languageData, authorData, publisherData, top7Publisher, totalBooks } = processedData

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Collection Overview */}
        <Card className="lg:col-span-2 border-border/40 bg-card/50 backdrop-blur-sm shadow-lg shadow-primary/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold">Collection Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="relative group p-6 rounded-2xl bg-primary/25 border border-primary/20 hover:bg-primary/30 transition-colors">
                <BookOpen className="h-8 w-8 text-primary/40 absolute top-4 right-4 group-hover:scale-110 transition-transform" />
                <p className="text-3xl font-black text-primary tracking-tight">{totalBooks}</p>
                <p className="text-xs font-bold text-primary/60 uppercase tracking-widest mt-2">Total Books</p>
              </div>
              <div className="relative group p-6 rounded-2xl bg-primary/10 border border-primary/15 hover:bg-primary/15 transition-colors">
                <Users className="h-8 w-8 text-primary/80 absolute top-4 right-4 group-hover:scale-110 transition-transform" />
                <p className="text-3xl font-black text-primary tracking-tight">{authors?.length || authorData.length}</p>
                <p className="text-xs font-bold text-primary/60 uppercase tracking-widest mt-2">Authors</p>
              </div>
              <div className="relative group p-6 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors">
                <Globe2 className="h-8 w-8 text-orange-400 absolute top-4 right-4 group-hover:scale-110 transition-transform" />
                <p className="text-3xl font-black text-orange-500 tracking-tight">{languageData.length}</p>
                <p className="text-xs font-bold text-orange-600/60 dark:text-orange-400/60 uppercase tracking-widest mt-2">Languages</p>
              </div>
              <div className="relative group p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors">
                <Building2 className="h-8 w-8 text-amber-400 absolute top-4 right-4 group-hover:scale-110 transition-transform" />
                <p className="text-3xl font-black text-amber-500 tracking-tight">{publisherData}</p>
                <p className="text-xs font-bold text-amber-600/60 dark:text-amber-400/60 uppercase tracking-widest mt-2">Publishers</p>
              </div>
              <div className="relative group p-6 rounded-2xl bg-teal-50 dark:bg-amber-950/20 border border-teal-200 dark:border-teal-800/30 hover:bg-teal-100 dark:hover:bg-amber-900/40 transition-colors">
                <BookMarked className="h-8 w-8 text-teal-400 absolute top-4 right-4 group-hover:scale-110 transition-transform" />
                <p className="text-3xl font-black text-teal-500 tracking-tight">{ebooksCount}</p>
                <p className="text-xs font-bold text-teal-600/60 dark:text-teal-400/60 uppercase tracking-widest mt-2">Ebooks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Books by Language Pie Chart */}
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-600">
                <Globe2 className="h-4 w-4" />
              </div>
              <CardTitle className="text-lg font-bold">Books by Language</CardTitle>
            </div>
            <CardDescription>Linguistic diversity of our collection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={languageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 60 : 100}
                    outerRadius={isMobile ? 100 : 150}
                    paddingAngle={1}
                    dataKey="value"
                    stroke="none"
                  >
                    {languageData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="focus:outline-none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" iconType="circle" iconSize={12} wrapperStyle={{
                    fontSize: '13px',
                    fontFamily: 'manrope',
                  }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Publishers Bar Chart */}
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                <Building2 className="h-4 w-4" />
              </div>
              <CardTitle className="text-xl font-bold">Top Publishers</CardTitle>
            </div>
            <CardDescription>Major publishing houses represented in our collection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top7Publisher} margin={isMobile ? { top: 10, right: 10, left: 10, bottom: 10 } : { top: 10, right: 30, left: 10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 11, fontWeight: 500 }} angle={isMobile ? -45 : -25} textAnchor="end" height={isMobile ? 80 : 60} hide={isMobile} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 500 }} hide={isMobile} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" barSize={50} fill="#16a34a" radius={[4, 4, 0, 0]} name="Books">
                    {top7Publisher.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Authors Bar Chart */}
        <Card className="lg:col-span-2 border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                <Users className="h-4 w-4" />
              </div>
              <CardTitle className="text-lg font-bold">Top Authors</CardTitle>
            </div>
            <CardDescription>Most prolific contributors in our collection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[700px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={authorData} layout="vertical" margin={isMobile ? { left: 10, right: 0 } : { left: 100, right: 90 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fontWeight: 500 }} hide={isMobile} />
                  <YAxis type="category" dataKey="name" width={isMobile ? 100 : 150} tick={{ fontSize: 11, fontWeight: 500 }} hide={isMobile} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="books" fill="#2563eb" radius={[0, 4, 4, 0]} name="Books" barSize={40}>
                    {authorData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
