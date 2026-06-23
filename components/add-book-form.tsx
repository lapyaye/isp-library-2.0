"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Combobox } from "@/components/ui/combobox"
import { bookFormSchema, type BookFormValues, type BookCreateInput } from "@/lib/validation/book"
import { parseNumberValue } from "@/lib/utils/parse-number"
import {
    useGetAuthorsQuery,
    useGetPublishersQuery,
    useAddBookMutation,
} from "@/lib/redux/services/libraryApi"

export default function AddBookForm() {
    const { data: authors = [] } = useGetAuthorsQuery()
    const { data: publishers = [] } = useGetPublishersQuery()
    const [addBook, { isLoading }] = useAddBookMutation()

    const form = useForm<BookFormValues>({
        resolver: zodResolver(bookFormSchema),
        defaultValues: {
            title: "",
            authorName: "",
            publisherName: "",
            language: "",
            place_of_publication: "",
            published_year: "",
            edition: "",
            price: "",
            class_number: "",
            source: "",
            notes: "",
        },
    })

    const onSubmit = async (values: BookFormValues) => {
        const payload: BookCreateInput = {
            title: values.title,
            authorName: values.authorName || null,
            publisherName: values.publisherName || null,
            language: values.language || null,
            place_of_publication: values.place_of_publication || null,
            published_year: parseNumberValue(values.published_year || ""),
            edition: values.edition || null,
            price: parseNumberValue(values.price || ""),
            class_number: values.class_number || null,
            source: values.source || null,
            notes: values.notes || null,
        }
        try {
            const book = await addBook(payload).unwrap()
            toast.success(`Added "${book.title}"`)
            form.reset()
        } catch (err: any) {
            toast.error(err?.data?.error || "Failed to add book")
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title *</FormLabel>
                            <FormControl>
                                <Input placeholder="Book title" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="authorName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Author</FormLabel>
                                <FormControl>
                                    <Combobox
                                        options={authors.map((a) => ({ value: a.author_id, label: a.name }))}
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Select or add author"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="publisherName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Publisher</FormLabel>
                                <FormControl>
                                    <Combobox
                                        options={publishers.map((p) => ({ value: p.publisher_id, label: p.name }))}
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Select or add publisher"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="language"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Language</FormLabel>
                                <FormControl><Input placeholder="e.g. Burmese" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="place_of_publication"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Place of publication</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="published_year"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Published year</FormLabel>
                                <FormControl><Input placeholder="e.g. 2017 or ၂၀၁၇" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="edition"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Edition</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Price</FormLabel>
                                <FormControl><Input placeholder="e.g. 5000" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="class_number"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Class number</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="source"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Source</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl><Textarea rows={3} {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                    {isLoading ? "Adding..." : "Add Book"}
                </Button>
            </form>
        </Form>
    )
}
