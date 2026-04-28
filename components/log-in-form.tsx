"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Library, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useLoginMutation, useLogoutMutation } from "@/lib/redux/services/libraryApi"
import { useAppDispatch } from "@/lib/redux/hooks"
import { logout as reduxLogout } from "@/lib/redux/slices/authSlice"

const formSchema = z.object({
    email: z.string().email({
        message: "Please enter a valid email address.",
    }).refine((email) => email.endsWith("@ispmyanmar.com"), {
        message: "Only ispmyanmar email addresses are allowed.",
    }),
    password: z.string().min(8, {
        message: "Password must be at least 8 characters long.",
    }),
})

export default function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get("callbackUrl") || "/"
    const sessionExpired = searchParams.get("sessionExpired") === "true"
    const [error, setError] = useState<string | null>(null)
    const [login, { isLoading }] = useLoginMutation()
    const [logoutApi] = useLogoutMutation()
    const dispatch = useAppDispatch()

    // This useEffect is used to handle the sessionExpired 
    // which is set to true when the refresh token expires
    // This is used to show a toast and clear the state and redirect to login
    // when the refresh token expires
    useEffect(() => {
        if (sessionExpired) {
            toast.error("Session expired. Please sign in again.", {
                classNames: {
                    icon: 'text-red-500',
                }
            })
            // Clear client side state
            dispatch(reduxLogout())

            // Clear server side state (cookies, DB)
            logoutApi()

            // Remove the sessionExpired param so we don't show the toast again on refresh
            const url = new URL(window.location.href)
            url.searchParams.delete("sessionExpired")
            window.history.replaceState({}, "", url)
        }
    }, [sessionExpired, dispatch, logoutApi])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setError(null)

        login({
            email: values.email,
            password: values.password,
        }).unwrap().then((data) => {
            window.location.href = callbackUrl
            toast.success("Login successful!", {
                classNames: {
                    icon: 'text-green-500',
                }
            })
        }, (error) => {
            toast.error(error.data.error)
            setError(error.data.error)
        })

    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="you@ispmyanmar.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end">
                    <Link href="/auth/forgot-password" className="text-xs text-muted-foreground hover:text-primary hover:underline">
                        Forgot Password?
                    </Link>
                </div>

                {error && (
                    <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 rounded-md">
                        {error}
                    </div>
                )}

                <Button type="submit" className="w-full active:scale-98" disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                        </>
                    ) : (
                        "Sign In"
                    )}
                </Button>
            </form>
        </Form>
    )
}
