"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Library } from "lucide-react"
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks"
import { selectHasSeenPreloader, setHasSeenPreloader } from "@/lib/redux/slices/uiSlice"
import { Progress } from "@/components/ui/progress"

export function InitialPreloader() {
    const [progress, setProgress] = useState(0)
    const [isComplete, setIsComplete] = useState(false)
    const hasSeen = useAppSelector(selectHasSeenPreloader)
    const dispatch = useAppDispatch()

    useEffect(() => {
        if (hasSeen) return

        // Prevent scrolling while preloader is active
        document.body.style.overflow = "hidden"

        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval)
                    return 100
                }
                // Random increment for a more organic feel
                const increment = Math.floor(Math.random() * 5) + 1
                return Math.min(prev + increment, 100)
            })
        }, 80)

        return () => {
            clearInterval(interval)
            document.body.style.overflow = "unset"
        }
    }, [hasSeen])

    useEffect(() => {
        if (progress === 100) {
            const timer = setTimeout(() => {
                setIsComplete(true)
            }, 500) // Small pause at 100%
            return () => clearTimeout(timer)
        }
    }, [progress])

    if (hasSeen) return null

    return (
        <AnimatePresence
            onExitComplete={() => {
                dispatch(setHasSeenPreloader(true))
                document.body.style.overflow = "unset"
            }}
        >
            {!isComplete && (
                <motion.div
                    key="preloader"
                    initial={{ y: 0 }}
                    animate={{ y: 0 }}
                    exit={{
                        y: "-100%",
                        transition: {
                            duration: 0.8,
                            ease: [0.76, 0, 0.24, 1], // Custom cubic bezier for smooth lift
                        }
                    }}
                    className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-background"
                >
                    <div className="flex flex-col items-center space-y-10 w-72">
                        {/* Logo Animation */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="relative"
                        >
                            <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full animate-pulse" />
                            <div className="p-8 rounded-full bg-primary/5 border border-primary/10 relative backdrop-blur-xl">
                                <Library className="h-20 w-20 text-primary" />
                            </div>
                        </motion.div>

                        {/* Progress Section */}
                        <div className="w-full space-y-6">
                            <div className="flex flex-col items-center space-y-2">
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-sm font-bold tracking-[0.2em] text-primary uppercase"
                                >
                                    ISP Library
                                </motion.span>
                                <div className="flex items-center justify-center space-x-2 text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                                    <span>Hydrating Database</span>
                                    <span className="h-1 w-1 bg-primary/40 rounded-full" />
                                    <span>{progress}%</span>
                                </div>
                            </div>

                            <div className="relative pt-1">
                                <Progress value={progress} className="h-[2px] bg-primary/10" />
                                <motion.div
                                    className="absolute inset-0 bg-primary/20 blur-sm h-[2px]"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {/* Welcome Text */}
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-xs text-muted-foreground/60 font-light italic"
                        >
                            Preparing your reading experience...
                        </motion.p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
