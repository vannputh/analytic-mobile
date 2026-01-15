// OMDB API service module for movie and TV show metadata

export interface OMDBResponse {
    Title?: string;
    Year?: string;
    Type?: string;
    Poster?: string;
    imdbRating?: string;
    imdbID?: string;
    Genre?: string;
    Runtime?: string;
    totalSeasons?: string;
    Season?: string;
    Episodes?: Array<{
        Title: string;
        Released: string;
        Episode: string;
        imdbRating: string;
        imdbID: string;
    }>;
    Plot?: string;
    Language?: string;
    Response: string;
    Error?: string;
}

export interface OMDBSearchResult {
    Title: string;
    Year: string;
    imdbID: string;
    Type: string;
    Poster: string;
}

interface OMDBSearchResponse {
    Search?: OMDBSearchResult[];
    totalResults?: string;
    Response: string;
    Error?: string;
}

interface OMDBEpisodeResponse {
    Runtime?: string;
    Response: string;
    Error?: string;
}

export async function fetchOMDBByTitle(
    title: string,
    apiKey: string,
    options?: { type?: string; year?: string }
): Promise<OMDBResponse | null> {
    try {
        const params = new URLSearchParams({
            apikey: apiKey,
            t: title,
            plot: "short",
        });

        if (options?.type && (options.type === "movie" || options.type === "series")) {
            params.append("type", options.type);
        }
        if (options?.year) {
            params.append("y", options.year);
        }

        const url = `https://www.omdbapi.com/?${params.toString()}`;
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error("OMDB fetch error:", error);
        return null;
    }
}

export async function fetchOMDBByIMDbId(imdbId: string, apiKey: string): Promise<OMDBResponse | null> {
    try {
        const params = new URLSearchParams({
            apikey: apiKey,
            i: imdbId,
            plot: "short",
        });

        const url = `https://www.omdbapi.com/?${params.toString()}`;
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error("OMDB fetch by IMDb ID error:", error);
        return null;
    }
}

export async function searchOMDB(
    query: string,
    apiKey: string,
    type?: string
): Promise<OMDBSearchResult[]> {
    try {
        const params = new URLSearchParams({
            apikey: apiKey,
            s: query,
        });

        if (type && (type === "movie" || type === "series")) {
            params.append("type", type);
        }

        const url = `https://www.omdbapi.com/?${params.toString()}`;
        const response = await fetch(url);
        const data: OMDBSearchResponse = await response.json();

        if (data.Response === "True" && data.Search) {
            return data.Search;
        }
        return [];
    } catch (error) {
        console.error("OMDB search error:", error);
        return [];
    }
}

export async function fetchOMDBSeason(
    imdbId: string,
    seasonNumber: string,
    apiKey: string
): Promise<OMDBResponse | null> {
    try {
        const params = new URLSearchParams({
            apikey: apiKey,
            i: imdbId,
            Season: seasonNumber,
        });

        const url = `https://www.omdbapi.com/?${params.toString()}`;
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error("OMDB season fetch error:", error);
        return null;
    }
}

export async function fetchOMDBEpisodeRuntime(imdbId: string, apiKey: string): Promise<number> {
    try {
        const params = new URLSearchParams({
            apikey: apiKey,
            i: imdbId,
        });
        const url = `https://www.omdbapi.com/?${params.toString()}`;
        const response = await fetch(url);
        const data: OMDBEpisodeResponse = await response.json();

        if (data.Response === "True" && data.Runtime && data.Runtime !== "N/A") {
            const match = data.Runtime.match(/(\d+)/);
            if (match) return parseInt(match[1]);
        }
        return 0;
    } catch (err) {
        console.error(`Failed to fetch episode ${imdbId}:`, err);
        return 0;
    }
}

export function mapOMDBType(omdbType?: string): string | null {
    if (!omdbType) return null;

    const typeMap: Record<string, string> = {
        movie: "Movie",
        series: "TV Show",
        episode: "TV Show",
    };

    return typeMap[omdbType.toLowerCase()] || null;
}

export function findBestOMDBMatch(
    searchQuery: string,
    results: OMDBSearchResult[],
    requestedType?: string | null
): OMDBSearchResult | null {
    if (results.length === 0) return null;

    const queryLower = searchQuery.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
    const queryNumber = queryLower.match(/\b(\d+)\b/)?.[1];

    const scoredResults = results.map(result => {
        let score = 0;
        const titleLower = result.Title.toLowerCase();
        const titleWords = titleLower.split(/\s+/).filter(w => w.length > 0);

        // Type match bonus
        if (requestedType) {
            if (requestedType.toLowerCase() === result.Type.toLowerCase()) {
                score += 100;
            }
        }

        // Exact title match
        if (titleLower === queryLower) score += 1000;

        // Word matching
        let matchingWords = 0;
        queryWords.forEach(qWord => {
            if (titleWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))) {
                matchingWords++;
            }
        });
        score += matchingWords * 50;

        // Number matching for sequels
        if (queryNumber) {
            const titleNumber = titleLower.match(/\b(\d+)\b/)?.[1];
            if (titleNumber === queryNumber) score += 200;
        }

        // Prefer recent results
        const currentYear = new Date().getFullYear();
        const resultYear = parseInt(result.Year);
        if (!isNaN(resultYear) && resultYear >= currentYear - 20) {
            score += 10;
        }

        return { result, score };
    });

    scoredResults.sort((a, b) => b.score - a.score);
    return scoredResults[0]?.result || null;
}
