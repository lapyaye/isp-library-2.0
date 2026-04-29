"use client"

import { useEffect } from "react";
import { Library, Loader2 } from "lucide-react";

export default function AccountConfirmSuccess() {

    useEffect(() => {
        const timer = setTimeout(() => {
            // Using window.location.href forces a full browser reload 
            // while navigating to the home page.
            window.location.href = "/";
        }, 3000);

        // Cleanup the timer if the user leaves the page early
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6 bg-background/50 backdrop-blur-sm">
            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-6">
                    <div className="flex justify-center mb-2">
                        <div className="p-4 rounded-full bg-primary/10 animate-in zoom-in duration-500">
                            <Library className="h-10 w-10 text-primary" />
                        </div>
                    </div>

                    <div className="flex flex-col text-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">Account Confirmed!</h1>
                        <p className="text-muted-foreground">Welcome to the ISP Library community.</p>
                    </div>

                    <div className="flex flex-col items-center gap-4 pt-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Redirecting to Home Page...</span>
                        </div>

                        {/* Fallback link in case redirect fails or user is impatient */}
                        <a
                            href="/"
                            className="text-xs text-primary underline underline-offset-4 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                        >
                            Click here if you aren't redirected in 3 seconds!
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}