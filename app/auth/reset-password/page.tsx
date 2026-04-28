import ResetPasswordForm from "@/components/reset-password";
import { Library } from "lucide-react";

export default function Page() {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center p-6 bg-background/50 backdrop-blur-sm">
            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-6">
                    <div className="flex justify-center mb-2">
                        <div className="p-3 rounded-full bg-primary/10">
                            <Library className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <ResetPasswordForm />
                </div>
            </div>
        </div>
    )
}
