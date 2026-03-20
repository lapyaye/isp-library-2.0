"use client"

import { Button } from "@/components/ui/button"
import { useLogoutMutation } from "@/lib/redux/services/libraryApi"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function SignOutButton() {

  const router = useRouter()
  const [logout] = useLogoutMutation()

  const handleSignOut = async () => {
    try {
      await logout().unwrap();
      toast.success("Sign out successful!", {
        classNames: {
          icon: 'text-red-500',
        }
      })
      window.location.href = "/auth/login";
      // router.push("/auth/login")
      // router.refresh()
    } catch (error) {
      toast.error("Failed to sign out. Please try again.", {
        classNames: {
          icon: 'text-red-500',
        }
      });
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignOut} className="cursor-pointer">
      Sign Out
    </Button>
  )
}
