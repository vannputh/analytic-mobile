import { getBookEntries } from "@/lib/book-actions"
import { BookAnalyticsClient } from "@/components/analytics/BookAnalyticsClient"
import { PageHeader } from "@/components/page-header"
import { Metadata } from "next"

// Revalidate every 60 seconds for fresh data while allowing caching
export const revalidate = 60

export const metadata: Metadata = {
    title: "Book Analytics - Media Review",
    description: "Analyze your reading habits.",
}

export default async function BookAnalyticsPage() {
    const { data: books, error } = await getBookEntries({ limit: 10000 })

    if (error) {
        return <div>Error loading books: {error}</div>
    }

    return (
        <div className="min-h-screen bg-background">
            <PageHeader title="Analytics" />
            <main className="p-4 sm:p-6">
                <BookAnalyticsClient books={books || []} />
            </main>
        </div>
    )
}
