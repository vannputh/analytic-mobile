import { useMemo } from "react"
import { MusicEntry } from "@/lib/database.types"
import { startOfMonth } from "date-fns/startOfMonth"
import { subMonths } from "date-fns/subMonths"
import { format } from "date-fns/format"

export function useMusicMetrics(music: MusicEntry[]) {
    return useMemo(() => {
        const totalEntries = music.length

        // Total listening time (approximate based on duration * listen count)
        // Assuming listen_count is total plays.
        const totalMinutesListened = music.reduce((sum, item) => {
            return sum + ((item.duration_minutes || 0) * (item.listen_count || 1))
        }, 0)

        const averageRating =
            music.reduce((sum, item) => sum + (item.my_rating || 0), 0) / (music.filter(m => m.my_rating).length || 1)

        // Music by Status
        const countByStatus = music.reduce((acc, item) => {
            const status = item.status || "Unknown"
            acc[status] = (acc[status] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        // Music by Type
        const countByType = music.reduce((acc, item) => {
            const type = item.type || "Unknown"
            acc[type] = (acc[type] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        // Music by Platform
        const countByPlatform = music.reduce((acc, item) => {
            const p = item.platform || "Unknown"
            acc[p] = (acc[p] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        // Music by Genre
        const countByGenre = music.reduce((acc, item) => {
            if (item.genre && Array.isArray(item.genre)) {
                item.genre.forEach(g => {
                    acc[g] = (acc[g] || 0) + 1
                })
            }
            return acc
        }, {} as Record<string, number>)

        // Top Artists (by number of entries)
        const artistCounts = music.reduce((acc, item) => {
            if (item.artist) {
                acc[item.artist] = (acc[item.artist] || 0) + 1
            }
            return acc
        }, {} as Record<string, number>)

        const topArtists = Object.entries(artistCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, value]) => ({ name, value }))

        return {
            totalEntries,
            totalMinutesListened,
            averageRating,
            countByStatus,
            countByType,
            countByPlatform,
            countByGenre,
            topArtists
        }
    }, [music])
}
