"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Papa from "papaparse"
import { supabase } from "@/lib/supabase"
import { MediaEntryInsert } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CheckCircle2, AlertCircle, Loader2, Upload, ArrowLeft, FileText, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { differenceInDays, parseISO, isValid } from "date-fns"

interface ParsedRow {
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

export default function ImportPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [pastedData, setPastedData] = useState("")
  const [cleaning, setCleaning] = useState(false)
  const [importing, setImporting] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 })
  const [cleanedData, setCleanedData] = useState<MediaEntryInsert[]>([])
  const [previewData, setPreviewData] = useState<MediaEntryInsert[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [importResults, setImportResults] = useState<{
    success: number
    failed: number
  } | null>(null)

  // Timer for cleaning progress
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (cleaning) {
      setElapsedSeconds(0)
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      setElapsedSeconds(0)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [cleaning])

  // Debounce cleaning when pastedData changes
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    if (pastedData.trim()) {
      debounceTimeoutRef.current = setTimeout(() => {
        parseAndCleanData(pastedData)
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, 1500)
    } else {
      setCleanedData([])
      setPreviewData([])
      setTotalRows(0)
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [pastedData])

  async function parseAndCleanData(data: string) {
    if (!data.trim()) return

    setPastedData(data)
    setImportResults(null)
    setCleaning(true)
    setCleanedData([])
    setPreviewData([])

    try {
      // First parse the CSV to get raw data
      const parseResult = await new Promise<ParsedRow[]>((resolve, reject) => {
        Papa.parse(data, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data as ParsedRow[]),
          error: (error: Error) => reject(error),
        })
      })

      if (parseResult.length === 0) {
        toast.error("No data found in CSV")
        setCleaning(false)
        return
      }

      // Convert to CSV format for Gemini
      const csvString = Papa.unparse(parseResult)

      // Send to Gemini for cleaning
      const response = await fetch("/api/clean-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ csvData: csvString }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to clean data")
      }

      const result = await response.json()

      if (!result.success || !result.data) {
        throw new Error("Invalid response from AI")
      }

      // Convert cleaned data to MediaEntryInsert format
      const cleaned: MediaEntryInsert[] = result.data
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

      setCleanedData(cleaned)
      setTotalRows(cleaned.length)
      setPreviewData(cleaned.slice(0, 10))

      if (result.errors && result.errors.length > 0) {
        toast.warning(`Cleaned ${cleaned.length} rows. ${result.errors.length} rows had issues.`)
      } else {
        toast.success(`Cleaned ${cleaned.length} rows with AI`)
      }
    } catch (error) {
      console.error("Clean data error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to clean data")
    } finally {
      setCleaning(false)
    }
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      parseAndCleanData(text)
    }
    reader.onerror = () => {
      toast.error("Failed to read file")
    }
    reader.readAsText(file)
  }

  async function importData() {
    if (cleanedData.length === 0) return

    setImporting(true)
    let successCount = 0
    let failedCount = 0
    let updatedCount = 0

    try {
      // Process entries one by one to check for duplicates
      for (const entry of cleanedData) {
        try {
          // Check if entry exists (by title and season)
          let query = supabase
            .from("media_entries")
            .select("id")
            .eq("title", entry.title)

          if (entry.season) {
            query = query.eq("season", entry.season)
          } else {
            query = query.is("season", null)
          }

          const { data: existing } = await query.maybeSingle()

          if (existing) {
            // Update existing entry
            const { error: updateError } = await supabase
              .from("media_entries")
              .update(entry)
              .eq("id", existing.id)

            if (updateError) {
              console.error("Update error:", updateError)
              failedCount++
            } else {
              updatedCount++
            }
          } else {
            // Insert new entry
            const { error: insertError } = await supabase
              .from("media_entries")
              .insert(entry)

            if (insertError) {
              console.error("Insert error:", insertError)
              failedCount++
            } else {
              successCount++
            }
          }
        } catch (err) {
          console.error("Entry processing error:", err)
          failedCount++
        }
      }

      setImportResults({ success: successCount + updatedCount, failed: failedCount })

      if (successCount > 0 || updatedCount > 0) {
        const message = updatedCount > 0
          ? `Imported ${successCount} new entries, updated ${updatedCount} existing entries`
          : `Imported ${successCount} entries`
        toast.success(message)
        // Redirect to analytics after successful import
        setTimeout(() => {
          router.push("/analytics")
        }, 1500)
      }
      if (failedCount > 0) {
        toast.error(`Failed to import ${failedCount} entries`)
      }
    } catch (error) {
      console.error("Import error:", error)
      toast.error("Failed to import data")
    } finally {
      setImporting(false)
    }
  }

  async function batchFetchMetadata() {
    if (cleanedData.length === 0) return

    setFetching(true)
    setFetchProgress({ current: 0, total: cleanedData.length })

    const updatedData = [...cleanedData]
    let successCount = 0
    let failedCount = 0

    try {
      // Fetch metadata for each item sequentially to avoid rate limiting
      for (let i = 0; i < updatedData.length; i++) {
        const entry = updatedData[i]

        // Skip if already has most metadata fields
        if (entry.poster_url && entry.genre && entry.average_rating) {
          setFetchProgress({ current: i + 1, total: updatedData.length })
          continue
        }

        if (!entry.title?.trim()) {
          setFetchProgress({ current: i + 1, total: updatedData.length })
          continue
        }

        try {
          // Build URL with title and season if provided
          let url = `/api/metadata?title=${encodeURIComponent(entry.title.trim())}`

          // Pass medium parameter for books (Google Books API)
          if (entry.medium === "Book") {
            url += `&medium=${encodeURIComponent(entry.medium)}`
          } else if (entry.medium) {
            // Map medium values to OMDB type for movies and TV shows
            const typeMap: Record<string, string> = {
              "Movie": "movie",
              "TV Show": "series",
            }
            const omdbType = typeMap[entry.medium]
            if (omdbType) {
              url += `&type=${omdbType}`
            }
          }

          if (entry.season) {
            url += `&season=${encodeURIComponent(entry.season)}`
          }

          const response = await fetch(url)

          if (response.ok) {
            const meta = await response.json()

            // Update title with the correct full title from metadata
            if (meta.title) updatedData[i].title = meta.title

            // Update entry with fetched metadata (only if field is empty)
            if (meta.type && !entry.type) updatedData[i].type = meta.type
            if (meta.genre && !entry.genre) updatedData[i].genre = Array.isArray(meta.genre) ? meta.genre : meta.genre.split(",").map((g: string) => g.trim()).filter(Boolean)
            if (meta.language && !entry.language) updatedData[i].language = Array.isArray(meta.language) ? meta.language : meta.language.split(",").map((l: string) => l.trim()).filter(Boolean)
            if (meta.average_rating && !entry.average_rating) updatedData[i].average_rating = meta.average_rating
            if (meta.length && !entry.length) updatedData[i].length = meta.length
            if (meta.episodes && !entry.episodes) updatedData[i].episodes = meta.episodes
            if (meta.poster_url && !entry.poster_url) updatedData[i].poster_url = meta.poster_url
            // Only update season if it wasn't already set (preserve user's season input)
            if (meta.season && !entry.season) updatedData[i].season = meta.season
            if (meta.imdb_id && !entry.imdb_id) updatedData[i].imdb_id = meta.imdb_id

            successCount++
          } else {
            failedCount++
          }
        } catch (err) {
          console.error(`Failed to fetch metadata for "${entry.title}":`, err)
          failedCount++
        }

        setFetchProgress({ current: i + 1, total: updatedData.length })

        // Small delay to avoid rate limiting (OMDB free tier: 1000 requests/day)
        if (i < updatedData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      setCleanedData(updatedData)
      setPreviewData(updatedData.slice(0, 10))

      if (successCount > 0) {
        toast.success(`Fetched metadata for ${successCount} items${failedCount > 0 ? `, ${failedCount} failed` : ""}`)
      } else if (failedCount > 0) {
        toast.error(`Failed to fetch metadata for ${failedCount} items`)
      }
    } catch (error) {
      console.error("Batch fetch error:", error)
      toast.error("Failed to batch fetch metadata")
    } finally {
      setFetching(false)
      setFetchProgress({ current: 0, total: 0 })
    }
  }

  function clearData() {
    setPastedData("")
    setCleanedData([])
    setPreviewData([])
    setTotalRows(0)
    setImportResults(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/analytics")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-sm font-mono uppercase tracking-wider">Import Data</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* File Upload */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload CSV
          </Button>
          <span className="text-sm text-muted-foreground self-center">or paste below</span>
        </div>

        {/* Paste Area */}
        <div className="relative">
          <Textarea
            placeholder="Paste CSV/TSV data here (include headers)..."
            value={pastedData}
            onChange={(e) => setPastedData(e.target.value)}
            className="min-h-[150px] font-mono text-xs"
            disabled={cleaning}
          />
          {cleaning && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  AI cleaning data...
                </p>
                <p className="text-[10px] font-mono text-muted-foreground/70">
                  {elapsedSeconds}s
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            onClick={importData}
            disabled={cleaning || importing || fetching || cleanedData.length === 0}
          >
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Import {totalRows > 0 && `(${totalRows})`}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={batchFetchMetadata}
            disabled={cleaning || importing || fetching || cleanedData.length === 0}
          >
            {fetching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching {fetchProgress.current}/{fetchProgress.total}...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Batch Fetch Metadata
              </>
            )}
          </Button>

          <Button variant="outline" onClick={clearData} disabled={!pastedData || fetching}>
            Clear
          </Button>

          {importResults && (
            <div className="flex items-center gap-4 text-sm font-mono">
              {importResults.success > 0 && (
                <span className="flex items-center gap-1.5 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {importResults.success}
                </span>
              )}
              {importResults.failed > 0 && (
                <span className="flex items-center gap-1.5 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {importResults.failed}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Preview */}
        {previewData.length > 0 && (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">Medium</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Rating</TableHead>
                  <TableHead className="text-xs">Genre</TableHead>
                  <TableHead className="text-xs">Platform</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium text-xs">{row.title || "-"}</TableCell>
                    <TableCell className="text-xs">{row.medium || row.type || "-"}</TableCell>
                    <TableCell className="text-xs">{row.status || "-"}</TableCell>
                    <TableCell className="text-xs">
                      {row.my_rating ?? row.rating ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.genre && Array.isArray(row.genre)
                        ? row.genre.join(", ")
                        : row.genre || "-"}
                    </TableCell>
                    <TableCell className="text-xs">{row.platform || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalRows > 10 && (
              <div className="p-2 text-xs text-muted-foreground border-t font-mono">
                Showing 10 of {totalRows} rows
              </div>
            )}
          </div>
        )}

        {/* Format Guide */}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">Column format</summary>
          <div className="mt-2 p-3 bg-muted rounded font-mono">
            <p className="mb-1"><strong>Required:</strong> title</p>
            <p><strong>Optional:</strong> medium, type, season, language, status, rating, start_date, finish_date, platform, episodes, length, genre, price, poster_url</p>
          </div>
        </details>
      </div>
    </main>
  )
}
