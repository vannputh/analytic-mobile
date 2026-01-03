// Google Books API service module for book metadata

export interface GoogleBooksVolume {
    id: string;
    volumeInfo: {
        title: string;
        subtitle?: string;
        authors?: string[];
        publishedDate?: string;
        description?: string;
        imageLinks?: {
            thumbnail?: string;
            smallThumbnail?: string;
            medium?: string;
            large?: string;
        };
        categories?: string[];
        language?: string;
        averageRating?: number;
        ratingsCount?: number;
        pageCount?: number;
        industryIdentifiers?: Array<{
            type: string;
            identifier: string;
        }>;
    };
}

interface GoogleBooksResponse {
    items?: GoogleBooksVolume[];
    totalItems: number;
}

/**
 * Detects if a string is an ISBN and normalizes it
 */
export function detectAndNormalizeISBN(input: string): string | null {
    const cleaned = input.replace(/[^0-9X]/g, '');

    // Check for ISBN-13 (13 digits, starting with 978 or 979)
    if (/^(978|979)\d{10}$/.test(cleaned)) {
        return cleaned;
    }

    // Check for ISBN-10 (10 digits, may end with X)
    if (/^\d{9}[\dX]$/.test(cleaned)) {
        return cleaned;
    }

    return null;
}

export async function searchBookByISBN(isbn: string, apiKey: string): Promise<GoogleBooksVolume | null> {
    try {
        const params = new URLSearchParams({
            q: `isbn:${isbn}`,
            key: apiKey,
        });

        const url = `https://www.googleapis.com/books/v1/volumes?${params.toString()}`;
        const response = await fetch(url);
        const data: GoogleBooksResponse = await response.json();

        if (data.items && data.items.length > 0) {
            return data.items[0];
        }
        return null;
    } catch (error) {
        console.error("Google Books ISBN search error:", error);
        return null;
    }
}

export async function searchBookByTitle(
    title: string,
    apiKey: string,
    year?: string
): Promise<GoogleBooksVolume[]> {
    try {
        let query = `intitle:${encodeURIComponent(title)}`;
        if (year) {
            query += ` ${year}`;
        }

        const params = new URLSearchParams({
            q: query,
            key: apiKey,
            maxResults: "5",
        });

        const url = `https://www.googleapis.com/books/v1/volumes?${params.toString()}`;
        const response = await fetch(url);
        const data: GoogleBooksResponse = await response.json();

        return data.items || [];
    } catch (error) {
        console.error("Google Books title search error:", error);
        return [];
    }
}

export function findBestBookMatch(
    searchQuery: string,
    results: GoogleBooksVolume[],
    requestedYear?: string | null
): GoogleBooksVolume | null {
    if (results.length === 0) return null;

    const queryLower = searchQuery.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
    const queryYear = requestedYear || queryLower.match(/\b(19|20)\d{2}\b/)?.[0];

    const scoredResults = results.map(volume => {
        let score = 0;
        const titleLower = volume.volumeInfo.title.toLowerCase();
        const titleWords = titleLower.split(/\s+/).filter(w => w.length > 0);

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

        // Year matching
        if (queryYear && volume.volumeInfo.publishedDate) {
            const publishedYear = volume.volumeInfo.publishedDate.match(/\d{4}/)?.[0];
            if (publishedYear === queryYear) score += 200;
        }

        // Prefer results with more metadata
        if (volume.volumeInfo.imageLinks) score += 20;
        if (volume.volumeInfo.averageRating) score += 10;
        if (volume.volumeInfo.description) score += 10;

        return { volume, score };
    });

    scoredResults.sort((a, b) => b.score - a.score);
    return scoredResults[0]?.volume || null;
}

export function getBookCoverUrl(imageLinks?: GoogleBooksVolume['volumeInfo']['imageLinks']): string | null {
    if (!imageLinks) return null;

    const imageUrl = imageLinks.large || imageLinks.medium || imageLinks.thumbnail || imageLinks.smallThumbnail;
    if (!imageUrl) return null;

    try {
        const url = new URL(imageUrl);
        url.protocol = 'https:';
        url.searchParams.delete('edge');

        const currentZoom = url.searchParams.get('zoom');
        if (!currentZoom || parseInt(currentZoom) < 5) {
            url.searchParams.set('zoom', '5');
        }

        return url.toString();
    } catch (e) {
        return imageUrl.replace(/http:/g, 'https:').replace(/&edge=curl/g, '');
    }
}

export function extractISBN(identifiers?: GoogleBooksVolume['volumeInfo']['industryIdentifiers']): string | null {
    if (!identifiers || identifiers.length === 0) return null;

    const isbn13 = identifiers.find(id => id.type === "ISBN_13");
    const isbn10 = identifiers.find(id => id.type === "ISBN_10");
    return isbn13?.identifier || isbn10?.identifier || null;
}
