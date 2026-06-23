"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface ComboboxProps {
    options: { value: string; label: string }[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    emptyText?: string
}

export function Combobox({
    options,
    value,
    onChange,
    placeholder = "Select...",
    emptyText = "No results.",
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")

    const trimmed = query.trim()
    const showCreate =
        trimmed.length > 0 &&
        !options.some((o) => o.label.toLowerCase() === trimmed.toLowerCase())

    const select = (name: string) => {
        onChange(name)
        setOpen(false)
        setQuery("")
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                >
                    <span className={cn(!value && "text-muted-foreground")}>
                        {value || placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                <Command>
                    <CommandInput
                        placeholder="Search or type new..."
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList>
                        <CommandEmpty>{emptyText}</CommandEmpty>
                        {showCreate && (
                            <CommandGroup>
                                <CommandItem value={`__create__${trimmed}`} onSelect={() => select(trimmed)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create &quot;{trimmed}&quot;
                                </CommandItem>
                            </CommandGroup>
                        )}
                        <CommandGroup>
                            {options.map((o) => (
                                <CommandItem key={o.value} value={o.label} onSelect={() => select(o.label)}>
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === o.label ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {o.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
