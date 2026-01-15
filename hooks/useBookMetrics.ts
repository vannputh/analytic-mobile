import { useMemo } from "react"
import { BookEntry } from "@/lib/database.types"
import { startOfMonth } from "date-fns/startOfMonth"
import { subMonths } from "date-fns/subMonths"
import { format } from "date-fns/format"
import { parseISO } from "date-fns/parseISO"
import { isValid } from "date-fns/isValid"
import { parse } from "date-fns/parse"
import { startOfYear } from "date-fns/startOfYear"
import { eachMonthOfInterval } from "date-fns/eachMonthOfInterval"
import { endOfYear } from "date-fns/endOfYear"

export function useBookMetrics(books: BookEntry[]) {
    return useMemo(() => {
        const totalBooks = books.length
        const finishedBooks = books.filter(b => b.status === "Finished")
        const finishedCount = finishedBooks.length

        // Total pages read
        const totalPagesRead = books.reduce((sum, book) => {
            // Only count pages if status is finished, or maybe we want total pages of all books? 
            // Typically "Total Pages Read" implies finished books or pages read so far.
            // For simplicity, let's count pages of finished books + pages of current books if we tracked progress (which we don't, only total pages).
            // So let's stick to finished books pages.
            if (book.status === "Finished") {
                return sum + (book.pages || 0)
            }
            return sum
        }, 0)

        const averageRating =
            finishedBooks.reduce((sum, book) => sum + (book.my_rating || 0), 0) / (finishedCount || 1)

        // Books by Status
        const countByStatus = books.reduce((acc, book) => {
            const status = book.status || "Unknown"
            acc[status] = (acc[status] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        // Books by Format
        const countByFormat = books.reduce((acc, book) => {
            const fmt = book.format || "Unknown"
            acc[fmt] = (acc[fmt] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        // Books by Genre
        const countByGenre = books.reduce((acc, book) => {
            if (book.genre && Array.isArray(book.genre)) {
                book.genre.forEach(g => {
                    acc[g] = (acc[g] || 0) + 1
                })
            }
            return acc
        }, {} as Record<string, number>)

        // Books finished per month (Last 12 months)
        const last12Months = Array.from({ length: 12 }, (_, i) => {
            const d = subMonths(new Date(), i)
            return format(d, "MMM yyyy")
        }).reverse()

        const booksPerMonth = last12Months.reduce((acc, month) => {
            acc[month] = 0
            return acc
        }, {} as Record<string, number>)

        finishedBooks.forEach(book => {
            if (book.finish_date) {
                // Check if valid date
                const d = new Date(book.finish_date)
                if (!isNaN(d.getTime())) {
                    const key = format(d, "MMM yyyy")
                    if (booksPerMonth[key] !== undefined) {
                        booksPerMonth[key]++
                    }
                }
            }
        })

        // Pages read over time (Last 12 months)
        const pagesPerMonth = last12Months.reduce((acc, month) => {
            acc[month] = 0
            return acc
        }, {} as Record<string, number>)

        finishedBooks.forEach(book => {
            if (book.finish_date && book.pages) {
                const d = new Date(book.finish_date)
                if (!isNaN(d.getTime())) {
                    const key = format(d, "MMM yyyy")
                    if (pagesPerMonth[key] !== undefined) {
                        pagesPerMonth[key] += book.pages
                    }
                }
            }
        })

        return {
            totalBooks,
            finishedCount,
            totalPagesRead,
            averageRating,
            countByStatus,
            countByFormat,
            countByGenre,
            booksPerMonth: Object.entries(booksPerMonth).map(([name, value]) => ({ name, value: value as number })),
            pagesPerMonth: Object.entries(pagesPerMonth).map(([name, value]) => ({ name, value: value as number })),
        }
    }, [books])
}
