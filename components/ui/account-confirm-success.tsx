import { Library } from "lucide-react";
import Link from "next/link";
import { Button } from "./button";

export default function AccountConfirmSuccess() {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] mt-6 w-full justify-center p-6 bg-background/50 backdrop-blur-sm">
            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-6">
                    <div className="flex justify-center mb-2">
                        <div className="p-3 rounded-full bg-primary/10">
                            <Library className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <div className="flex flex-col justify-center text-center gap-5">
                        <h1 className="text-2xl font-bold tracking-tight">Account confirmed successfully</h1>
                        <p className="text-muted-foreground">You can now browse the library</p>
                        <div className="flex justify-center">
                            <Button asChild>
                                <Link href="/books">Browse Library</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}