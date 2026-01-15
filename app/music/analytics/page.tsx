import { getMusicEntries } from "@/lib/music-actions"
import { MusicAnalyticsClient } from "@/components/analytics/MusicAnalyticsClient"
import { PageHeader } from "@/components/page-header"
import { Metadata } from "next"

// Revalidate every 60 seconds for fresh data while allowing caching
export const revalidate = 60

export const metadata: Metadata = {
    title: "Music Analytics - Media Review",
    description: "Analyze your listening habits.",
}

export default async function MusicAnalyticsPage() {
    const { data: music, error } = await getMusicEntries({ limit: 10000 })

    if (error) {
        return <div>Error loading music: {error}</div>
    }

    return (
        <div className="min-h-screen bg-background">
            <PageHeader title="Analytics" />
            <main className="p-4 sm:p-6">
                <MusicAnalyticsClient music={music || []} />
            </main>
        </div>
    )
}
