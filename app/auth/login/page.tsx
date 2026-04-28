import { Library } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import LogInForm from "@/components/log-in-form"
import Link from "next/link"


export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center p-6 bg-background/50 backdrop-blur-sm">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex justify-center mb-2">
            <div className="p-3 rounded-full bg-primary/10">
              <Library className="h-8 w-8 text-primary" />
            </div>
          </div>
          <Card className="border-border shadow-lg">
            <CardHeader className="text-center space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Welcome Back</CardTitle>
              <CardDescription>Sign in to your library account</CardDescription>
            </CardHeader>
            <CardContent>
              <LogInForm />
            </CardContent>
            <CardFooter className="flex justify-center">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/auth/sign-up" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
