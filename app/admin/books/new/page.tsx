import AddBookForm from "@/components/add-book-form"
import BookCsvImport from "@/components/book-csv-import"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AddBooksPage() {
    return (
        <div className="container mx-auto max-w-3xl px-4 py-8">
            <h1 className="mb-6 text-2xl font-semibold">Add Books</h1>
            <Tabs defaultValue="single">
                <TabsList>
                    <TabsTrigger value="single">Single</TabsTrigger>
                    <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
                </TabsList>
                <TabsContent value="single">
                    <Card>
                        <CardHeader><CardTitle>New book</CardTitle></CardHeader>
                        <CardContent><AddBookForm /></CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="bulk">
                    <Card>
                        <CardHeader><CardTitle>Import from CSV</CardTitle></CardHeader>
                        <CardContent><BookCsvImport /></CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
