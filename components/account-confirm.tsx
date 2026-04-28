"use client"
import { Button } from "@/components/ui/button";
import { ApiResponse, SessionUser } from "@/lib/db/types";
import { useAppDispatch } from "@/lib/redux/hooks";
import { setCredentials } from "@/lib/redux/slices/authSlice";
import { Library, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function AccountConfirm() {
    const [isLoading, setIsLoading] = useState(false)
    const [isError, setIsError] = useState(false)
    const searchParams = useSearchParams()
    const dispatch = useAppDispatch()
    const token = searchParams.get("token")
    const router = useRouter();
    const handleConfirm = async () => {
        setIsLoading(true)
        try {
            const response = await fetch("/api/auth/account-confirm", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ token }),
            });

            const data: ApiResponse<SessionUser> = await response.json();

            if (data.success) {
                toast.success("Account confirmed successfully", {
                    classNames: {
                        icon: 'text-green-500',
                    }
                });
                dispatch(setCredentials({
                    user: data.user,
                    accessToken: data.accessToken,
                }))
                router.push("/auth/account-confirm-success");
            } else {
                setIsError(true)
                toast.error("Error confirming account", {
                    classNames: {
                        icon: 'text-red-500',
                    }
                });
            }
        } catch (error) {
            console.error("Error confirming account:", error)
        } finally {
            setIsLoading(false)
        }
    }

    if (!token) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] mt-6 w-full justify-center p-6 bg-background/50 backdrop-blur-sm">
                <div className="w-full max-w-sm">
                    <div className="flex flex-col gap-6">
                        <div className="flex justify-center mb-2">
                            <div className="p-3 rounded-full bg-primary/10">
                                <Library className="h-8 w-8 text-primary" />
                            </div>
                        </div>
                        <div className="flex flex-col justify-center text-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">Invalid Link</h1>
                            <p className="text-muted-foreground">The link you are trying to access is invalid or has expired. Please request a new link.</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (isError) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] mt-6 w-full justify-center p-6 bg-background/50 backdrop-blur-sm">
                <div className="w-full max-w-sm">
                    <div className="flex flex-col gap-6">
                        <div className="flex justify-center mb-2">
                            <div className="p-3 rounded-full bg-primary/10">
                                <Library className="h-8 w-8 text-primary" />
                            </div>
                        </div>
                        <div className="flex flex-col justify-center text-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">Error Confirming Account</h1>
                            <p className="text-muted-foreground">Something went wrong. Please try again later.</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-[calc(100vh-4rem)] mt-6 w-full justify-center p-6 bg-background/50 backdrop-blur-sm">
            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-6">
                    <div className="flex justify-center mb-2">
                        <div className="p-3 rounded-full bg-primary/10">
                            <Library className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <div className="flex flex-col justify-center text-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">Confirm your account</h1>
                        <p className="text-muted-foreground">Confirm your account to get access to all features</p>
                    </div>
                    <div className="flex justify-center">
                        <Button onClick={handleConfirm} disabled={isLoading}>
                            {
                                isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Confirming...
                                    </>
                                ) : (
                                    "Confirm"
                                )
                            }
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}