import type React from "react"
import type { Metadata } from "next"
import { Inter, Manrope, Roboto_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
// import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Header } from "@/components/header"
import { ThemeProvider } from "@/components/theme-provider"
import { InitialPreloader } from "@/components/initial-preloader"

import { getSession } from "@/lib/db/auth"
import ReduxProvider from "@/lib/redux/provider"

const _inter = Inter({ subsets: ["latin"] })
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});
const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "ISP Library",
  description: "Search books, borrow titles, and track your reading with our modern library management system.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getSession()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <link
          rel="icon"
          href="https://ispmyanmar.com/wp-content/uploads/2024/03/cropped-favicon-2024-32x32.png"
          sizes="32x32"
        />
        <link
          rel="icon"
          href="https://ispmyanmar.com/wp-content/uploads/2024/03/cropped-favicon-2024-192x192.png"
          sizes="192x192"
        />
        <link
          rel="apple-touch-icon"
          href="https://ispmyanmar.com/wp-content/uploads/2024/03/cropped-favicon-2024-180x180.png"
        />
      </head>
      <body className="font-manrope antialiased bg-background text-foreground">
        {/* user={session} is to use session data in provider for next login; so the user dont have to login again after refresh*/}
        <ReduxProvider user={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem={true}
            storageKey="theme"
            disableTransitionOnChange={false}
          >
            <InitialPreloader />
            <Header />
            <main>{children}</main>
            <Toaster position="top-right" />
          </ThemeProvider>
        </ReduxProvider>
      </body>
    </html>
  )
}
