"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useImportBooksMutation } from "@/lib/redux/services/libraryApi"
import type { ImportResult } from "@/lib/validation/book"

const TEMPLATE_COLUMNS =
    "title, author, publisher, language, place_of_publication, published_year, edition, price, class_number, source, notes"

export default function BookCsvImport() {
    const [csv, setCsv] = useState<string>("")
    const [fileName, setFileName] = useState<string>("")
    const [preview, setPreview] = useState<ImportResult | null>(null)
    const [importBooks, { isLoading }] = useImportBooksMutation()

    const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const text = await file.text()
        setCsv(text)
        setFileName(file.name)
        setPreview(null)
    }

    const runDryRun = async () => {
        try {
            const result = await importBooks({ csv, dryRun: true }).unwrap()
            setPreview(result)
        } catch (err: any) {
            toast.error(err?.data?.error || "Failed to read CSV")
        }
    }

    const commit = async () => {
        try {
            const result = await importBooks({ csv, dryRun: false }).unwrap()
            toast.success(`Imported ${result.created ?? 0} book(s)${result.failed ? `, ${result.failed} skipped` : ""}`)
            setPreview(null)
            setCsv("")
            setFileName("")
        } catch (err: any) {
            toast.error(err?.data?.error || "Import failed")
        }
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                CSV columns (only <code>title</code> required): <code>{TEMPLATE_COLUMNS}</code>.
                Author and publisher are matched by name and created if new.
            </p>

            <div className="flex flex-wrap items-center gap-3">
                <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={onFile}
                    className="block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
                />
                <Button type="button" variant="secondary" onClick={runDryRun} disabled={!csv || isLoading}>
                    {isLoading && !preview ? "Checking..." : "Preview"}
                </Button>
            </div>

            {fileName && <p className="text-xs text-muted-foreground">Selected: {fileName}</p>}

            {preview && (
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-sm">
                        <Badge variant="outline">Parsed: {preview.parsed ?? 0}</Badge>
                        <Badge variant="default">Valid: {preview.valid ?? 0}</Badge>
                        <Badge variant={preview.failed ? "destructive" : "outline"}>
                            Failed: {preview.failed}
                        </Badge>
                    </div>

                    {preview.preview && preview.preview.length > 0 && (
                        <div className="max-h-72 overflow-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Author</TableHead>
                                        <TableHead>Publisher</TableHead>
                                        <TableHead>Year</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {preview.preview.map((r, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{r.title}</TableCell>
                                            <TableCell>{r.author ?? "—"}</TableCell>
                                            <TableCell>{r.publisher ?? "—"}</TableCell>
                                            <TableCell>{r.published_year ?? "—"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {preview.errors.length > 0 && (
                        <div className="max-h-48 overflow-auto rounded-md border border-destructive/40 p-3">
                            <p className="mb-1 text-sm font-medium text-destructive">Row errors</p>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                                {preview.errors.map((e, i) => (
                                    <li key={i}>Row {e.row}: {e.message}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <Button
                        type="button"
                        onClick={commit}
                        disabled={isLoading || (preview.valid ?? 0) === 0}
                    >
                        {isLoading ? "Importing..." : `Import ${preview.valid ?? 0} valid row(s)`}
                    </Button>
                </div>
            )}
        </div>
    )
}
