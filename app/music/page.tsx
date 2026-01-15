import { getMusicEntries } from "@/lib/music-actions"
import { MusicTable } from "@/components/music-table"
import { PageHeader } from "@/components/page-header"
import { Metadata } from "next"

// Revalidate every 60 seconds for fresh data while allowing caching
export const revalidate = 60

export const metadata: Metadata = {
    title: "Music - Media Review",
    description: "Track your listening habits and music library.",
}

export default async function MusicPage() {
    const { data: music, error } = await getMusicEntries({ limit: 1000 })

    if (error) {
        return <div>Error loading music: {error}</div>
    }

    return (
        <div className="min-h-screen bg-background">
            <PageHeader title="Entries" />
            <main className="p-4 sm:p-6">
                <MusicTable data={music || []} />
            </main>
        </div>
    )
}
