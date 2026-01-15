import { MediaEntryInsert } from "@/lib/database.types"
import { differenceInDays } from "date-fns/differenceInDays"
import { parseISO } from "date-fns/parseISO"
import { isValid } from "date-fns/isValid"

export interface ParsedRow {
    title?: string
    type?: string
    season?: string
    language?: string
    status?: string
    rating?: string | number
    start_date?: string
    finish_date?: string
    time_taken?: string
    platform?: string
    medium?: string
    episodes?: string | number
    length?: string
    genre?: string
    price?: string | number
    poster_url?: string
    [key: string]: unknown
}

export function transformCleanedData(data: any[]): MediaEntryInsert[] {
    return data
        .filter((row: any) => row.title)
        .map((row: any) => {
            // Handle my_rating - check multiple possible field names
            const myRating = row.my_rating ?? row["my rating"] ?? row["My Rating"] ?? row["MY_RATING"] ?? null
            // Parse rating if it's a string
            const parsedMyRating = myRating !== null && myRating !== undefined
                ? (typeof myRating === "string" ? parseFloat(myRating) : myRating)
                : null

            // Format season - normalize to "Season X" format if it's a number
            let formattedSeason = row.season || null
            if (formattedSeason) {
                const seasonStr = String(formattedSeason).trim()
                // If it's just a number, format as "Season X"
                const seasonNum = parseInt(seasonStr)
                if (!isNaN(seasonNum) && seasonStr === String(seasonNum)) {
                    formattedSeason = `Season ${seasonNum}`
                } else if (seasonStr.toLowerCase() === "n/a" || seasonStr === "-" || seasonStr === "") {
                    formattedSeason = null
                }
            }

            // Auto-calculate time_taken if both dates are present
            let calculatedTimeTaken = row.time_taken || null
            if ((!calculatedTimeTaken || calculatedTimeTaken.trim() === "") && row.start_date && row.finish_date) {
                try {
                    const start = parseISO(row.start_date)
                    const finish = parseISO(row.finish_date)
                    if (isValid(start) && isValid(finish)) {
                        const days = differenceInDays(finish, start)
                        if (days >= 0) {
                            // Add 1 to make it inclusive (same day = 1 day)
                            const totalDays = days + 1
                            calculatedTimeTaken = totalDays === 1 ? "1 day" : `${totalDays} days`
                        }
                    }
                } catch (error) {
                    // Invalid date format, keep original time_taken
                }
            }

            return {
                title: row.title || "",
                type: row.type || null,
                season: formattedSeason,
                language: row.language && Array.isArray(row.language) ? row.language :
                    row.language ? row.language.split(",").map((l: string) => l.trim()).filter(Boolean) : null,
                status: row.status || null,
                my_rating: parsedMyRating,
                rating: row.rating ?? null,
                average_rating: row.average_rating ?? null,
                start_date: row.start_date || null,
                finish_date: row.finish_date || null,
                time_taken: calculatedTimeTaken,
                platform: row.platform || null,
                medium: row.medium || null,
                episodes: row.episodes ? parseInt(row.episodes.toString()) : null,
                length: row.length || null,
                genre: row.genre && Array.isArray(row.genre) ? row.genre :
                    row.genre ? row.genre.split(",").map((g: string) => g.trim()).filter(Boolean) : null,
                price: row.price ? parseFloat(row.price.toString()) : null,
                poster_url: row.poster_url || null,
                imdb_id: row.imdb_id || null,
            }
        })
}
