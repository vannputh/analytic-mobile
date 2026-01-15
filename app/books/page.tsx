import { getBookEntries } from "@/lib/book-actions"
import { BookTable } from "@/components/book-table"
import { PageHeader } from "@/components/page-header"
import { Metadata } from "next"

// Revalidate every 60 seconds for fresh data while allowing caching
export const revalidate = 60

export const metadata: Metadata = {
    title: "Books - Media Review",
    description: "Track your reading progress and library.",
}

export default async function BooksPage() {
    const { data: books, error } = await getBookEntries({ limit: 1000 })

    if (error) {
        return <div>Error loading books: {error}</div>
    }

    return (
        <div className="min-h-screen bg-background">
            <PageHeader title="Entries" />
            <main className="p-4 sm:p-6">
                <BookTable data={books || []} />
            </main>
        </div>
    )
}
