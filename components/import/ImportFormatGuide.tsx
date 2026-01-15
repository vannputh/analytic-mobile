"use client"

export function ImportFormatGuide() {
    return (
        <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">Column format</summary>
            <div className="mt-2 p-3 bg-muted rounded font-mono">
                <p className="mb-1"><strong>Required:</strong> title</p>
                <p><strong>Optional:</strong> medium, type, season, language, status, rating, start_date, finish_date, platform, episodes, length, genre, price, poster_url</p>
            </div>
        </details>
    )
}
