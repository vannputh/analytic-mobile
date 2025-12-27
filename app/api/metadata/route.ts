import { NextRequest, NextResponse } from "next/server";

// OMDB API (free tier: 1000 requests/day)
// You can also use TMDB API - both are popular choices
// For OMDB: Get free API key from http://www.omdbapi.com/apikey.aspx
// For TMDB: Get free API key from https://www.themoviedb.org/settings/api
// Google Books API: Get free API key from https://console.cloud.google.com/apis/credentials

interface OMDBResponse {
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

interface OMDBSearchResponse {
  Search?: Array<{
    Title: string;
    Year: string;
    imdbID: string;
    Type: string;
    Poster: string;
  }>;
  totalResults?: string;
  Response: string;
  Error?: string;
}

interface OMDBEpisodeResponse {
  Runtime?: string;
  Response: string;
  Error?: string;
}

interface GoogleBooksVolume {
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
 * Supports ISBN-10 (10 digits, may end with X) and ISBN-13 (13 digits starting with 978 or 979)
 * Returns the normalized ISBN (digits only) or null if not an ISBN
 */
function detectAndNormalizeISBN(input: string): string | null {
  // Remove all non-alphanumeric characters (keep digits and X)
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const title = searchParams.get("title");
    const imdbIdParam = searchParams.get("imdb_id"); // For direct IMDb ID searches
    const type = searchParams.get("type"); // movie, series, episode
    const medium = searchParams.get("medium"); // Movie, TV Show, Book, etc.
    const year = searchParams.get("year");
    const season = searchParams.get("season"); // Season number (e.g., "1", "2")

    // Check if imdb_id is provided (could be ISBN or IMDb ID)
    const inputISBN = imdbIdParam ? detectAndNormalizeISBN(imdbIdParam) : null;
    const isImdbId = imdbIdParam && !inputISBN && imdbIdParam.trim().startsWith("tt");
    
    if (!title && !imdbIdParam) {
      return NextResponse.json(
        { error: "Title or IMDb ID/ISBN is required" },
        { status: 400 }
      );
    }

    // Check if input is an ISBN (auto-detect books by ISBN)
    const normalizedTitle = title?.trim() || "";
    const titleISBN = title ? detectAndNormalizeISBN(normalizedTitle) : null;
    const finalISBN = inputISBN || titleISBN;
    const isBook = medium === "Book" || finalISBN !== null;

    // If medium is Book or input is an ISBN, use Google Books API
    if (isBook) {
      const googleApiKey = process.env.GOOGLE_BOOK_API_KEY;

      if (!googleApiKey) {
        return NextResponse.json(
          {
            error: "GOOGLE_BOOK_API_KEY not configured",
            info: "Get a free API key from https://console.cloud.google.com/apis/credentials and add it to your .env file",
          },
          { status: 500 }
        );
      }
      
      let googleBooksUrl: string;
      let bestMatch: GoogleBooksVolume | null = null;

      if (finalISBN) {
        // Search by ISBN directly (more accurate)
        const googleBooksParams = new URLSearchParams({
          q: `isbn:${finalISBN}`,
          key: googleApiKey,
        });
        googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?${googleBooksParams.toString()}`;
        
        const response = await fetch(googleBooksUrl);
        const data: GoogleBooksResponse = await response.json();

        if (data.items && data.items.length > 0) {
          // When searching by ISBN, the first result should be the exact match
          bestMatch = data.items[0];
        }
      } else {
        // Search by title
        const searchTitle = normalizedTitle || "";
        if (!searchTitle) {
          return NextResponse.json(
            { error: "Title is required for book search" },
            { status: 400 }
          );
        }
        
        const googleBooksParams = new URLSearchParams({
          q: `intitle:${encodeURIComponent(searchTitle)}`,
          key: googleApiKey,
          maxResults: "5",
        });

        if (year) {
          googleBooksParams.set("q", `intitle:${encodeURIComponent(searchTitle)} ${year}`);
        }

        googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?${googleBooksParams.toString()}`;
        const response = await fetch(googleBooksUrl);
        const data: GoogleBooksResponse = await response.json();

        if (!data.items || data.items.length === 0) {
          return NextResponse.json(
            { error: "Book not found" },
            { status: 404 }
          );
        }

        // Find the best match
        bestMatch = findBestBookMatch(searchTitle, data.items, year);
      }
      
      if (!bestMatch) {
        return NextResponse.json(
          { error: "Book not found" },
          { status: 404 }
        );
      }

      const volumeInfo = bestMatch.volumeInfo;
      
      // Extract year from publishedDate
      let bookYear = year || null;
      if (volumeInfo.publishedDate) {
        const yearMatch = volumeInfo.publishedDate.match(/\d{4}/);
        if (yearMatch) {
          bookYear = yearMatch[0];
        }
      }

      // Get the best available image (prefer higher quality, clean up URL)
      let posterUrl = null;
      if (volumeInfo.imageLinks) {
        // Prefer larger images, fall back to smaller ones
        let imageUrl = volumeInfo.imageLinks.large || 
                      volumeInfo.imageLinks.medium || 
                      volumeInfo.imageLinks.thumbnail || 
                      volumeInfo.imageLinks.smallThumbnail || 
                      null;
        
        if (imageUrl) {
          // Clean up the image URL: ensure https, remove edge=curl, optimize zoom
          try {
            const url = new URL(imageUrl);
            url.protocol = 'https:';
            
            // Remove edge=curl parameter if present
            url.searchParams.delete('edge');
            
            // Set zoom to 5 for better quality (if not already set or if it's a low value)
            const currentZoom = url.searchParams.get('zoom');
            if (!currentZoom || parseInt(currentZoom) < 5) {
              url.searchParams.set('zoom', '5');
            }
            
            posterUrl = url.toString();
          } catch (e) {
            // If URL parsing fails, just use the original URL with basic cleanup
            posterUrl = imageUrl
              .replace(/http:/g, 'https:')
              .replace(/&edge=curl/g, '');
          }
        }
      }

      // Format page count
      let length = null;
      if (volumeInfo.pageCount && volumeInfo.pageCount > 0) {
        length = `${volumeInfo.pageCount} pages`;
      }

      // Get average rating (Google Books uses 0-5 scale, convert to 0-10)
      let averageRating = null;
      if (volumeInfo.averageRating !== undefined && volumeInfo.averageRating !== null) {
        // Convert from Google Books 0-5 scale to 0-10 scale (multiply by 2)
        averageRating = parseFloat((volumeInfo.averageRating * 2).toFixed(1));
      }

      // Extract ISBN from industryIdentifiers (prefer ISBN_13, fall back to ISBN_10)
      let isbn = null;
      if (volumeInfo.industryIdentifiers && volumeInfo.industryIdentifiers.length > 0) {
        // Look for ISBN_13 first, then ISBN_10
        const isbn13 = volumeInfo.industryIdentifiers.find(id => id.type === "ISBN_13");
        const isbn10 = volumeInfo.industryIdentifiers.find(id => id.type === "ISBN_10");
        isbn = isbn13?.identifier || isbn10?.identifier || null;
      }

      // Format genre as array (categories from Google Books)
      let genre = null;
      if (volumeInfo.categories && volumeInfo.categories.length > 0) {
        genre = volumeInfo.categories.map(cat => cat.trim()).filter(Boolean);
      }

      // Map Google Books data to our format
      const metadata = {
        title: volumeInfo.title + (volumeInfo.subtitle ? `: ${volumeInfo.subtitle}` : ""),
        poster_url: posterUrl,
        genre: genre,
        language: volumeInfo.language || null,
        average_rating: averageRating,
        length: length,
        type: "Book",
        episodes: null,
        season: null,
        year: bookYear,
        plot: volumeInfo.description || null,
        imdb_id: isbn, // Store ISBN in imdb_id field for books
      };

      return NextResponse.json(metadata);
    }

    // For movies and TV shows, use OMDB API
    // You need to set OMDB_API_KEY in your .env file
    // Get your free key from: http://www.omdbapi.com/apikey.aspx
    const apiKey = process.env.OMDB_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "OMDB_API_KEY not configured",
          info: "Get a free API key from http://www.omdbapi.com/apikey.aspx and add it to your .env file",
        },
        { status: 500 }
      );
    }

    // If IMDb ID is provided, search by IMDb ID directly (more accurate)
    let params = new URLSearchParams({
      apikey: apiKey,
      plot: "short",
    });

    if (isImdbId && imdbIdParam) {
      // Search by IMDb ID
      params.append("i", imdbIdParam.trim());
    } else if (title) {
      // Search by title
      params.append("t", title);
    } else {
      return NextResponse.json(
        { error: "Title or IMDb ID is required" },
        { status: 400 }
      );
    }

    if (type && (type === "movie" || type === "series")) {
      params.append("type", type);
    }

    if (year) {
      params.append("y", year);
    }

    let omdbUrl = `https://www.omdbapi.com/?${params.toString()}`;
    let response = await fetch(omdbUrl);
    let data: OMDBResponse = await response.json();

    // If direct search fails, try fuzzy search (only for title searches, not IMDb ID)
    if (data.Response === "False" && !isImdbId && title) {
      // Use search endpoint to find matches
      const searchParams = new URLSearchParams({
        apikey: apiKey,
        s: title,
      });

      if (type && (type === "movie" || type === "series")) {
        searchParams.append("type", type);
      }

      const searchUrl = `https://www.omdbapi.com/?${searchParams.toString()}`;
      const searchResponse = await fetch(searchUrl);
      const searchData: OMDBSearchResponse = await searchResponse.json();

      if (searchData.Response === "True" && searchData.Search && searchData.Search.length > 0) {
        // Find the best match
        const bestMatch = findBestMatch(title, searchData.Search, type);
        
        if (bestMatch) {
          // Fetch full details using the matched title
          params = new URLSearchParams({
            apikey: apiKey,
            t: bestMatch.Title,
            plot: "short",
          });

          if (type && (type === "movie" || type === "series")) {
            params.append("type", type);
          }

          if (year) {
            params.append("y", year);
          }

          omdbUrl = `https://www.omdbapi.com/?${params.toString()}`;
          response = await fetch(omdbUrl);
          data = await response.json();

          if (data.Response === "False") {
            return NextResponse.json(
              { error: data.Error || "Media not found" },
              { status: 404 }
            );
          }
        } else {
          return NextResponse.json(
            { error: "Media not found" },
            { status: 404 }
          );
        }
      } else {
        return NextResponse.json(
          { error: data.Error || "Media not found" },
          { status: 404 }
        );
      }
    }

    // If season is specified, fetch season-specific data
    let seasonEpisodes = null;
    let seasonNumber = null;
    let seasonTotalLength = null;
    
    if (season && data.Type?.toLowerCase() === "series") {
      // Extract season number from "Season 1" or just "1"
      const seasonMatch = season.match(/\d+/);
      const seasonNum = seasonMatch ? seasonMatch[0] : season;
      
      const seasonParams = new URLSearchParams({
        apikey: apiKey,
        Season: seasonNum,
      });
      
      // Use IMDb ID if available, otherwise use title
      if (isImdbId && imdbIdParam) {
        seasonParams.append("i", imdbIdParam.trim());
      } else if (title) {
        seasonParams.append("t", title);
      }

      try {
        const seasonUrl = `https://www.omdbapi.com/?${seasonParams.toString()}`;
        const seasonResponse = await fetch(seasonUrl);
        const seasonData: OMDBResponse = await seasonResponse.json();

        if (seasonData.Response === "True" && seasonData.Episodes) {
          seasonEpisodes = seasonData.Episodes.length;
          seasonNumber = `Season ${seasonNum}`;
          
          // Fetch runtime for each episode to calculate total length
          let totalMinutes = 0;
          const episodePromises = seasonData.Episodes.map(async (episode) => {
            try {
              const episodeParams = new URLSearchParams({
                apikey: apiKey,
                i: episode.imdbID,
              });
              const episodeUrl = `https://www.omdbapi.com/?${episodeParams.toString()}`;
              const episodeResponse = await fetch(episodeUrl);
              const episodeData: OMDBEpisodeResponse = await episodeResponse.json();
              
              if (episodeData.Response === "True" && episodeData.Runtime && episodeData.Runtime !== "N/A") {
                // Parse runtime (e.g., "60 min" or "60")
                const runtimeMatch = episodeData.Runtime.match(/(\d+)/);
                if (runtimeMatch) {
                  return parseInt(runtimeMatch[1]);
                }
              }
              return 0;
            } catch (err) {
              console.error(`Failed to fetch episode ${episode.imdbID}:`, err);
              return 0;
            }
          });
          
          // Wait for all episode requests with small delays to avoid rate limiting
          const runtimes = await Promise.all(
            episodePromises.map((promise, index) => 
              index === 0 ? promise : new Promise<number>(resolve => 
                setTimeout(() => promise.then(resolve), index * 100)
              )
            )
          );
          
          totalMinutes = runtimes.reduce((sum, minutes) => sum + minutes, 0);
          
          if (totalMinutes > 0) {
            // Format as "Xh Ym" or "X min"
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            if (hours > 0) {
              seasonTotalLength = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
            } else {
              seasonTotalLength = `${totalMinutes} min`;
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch season data:", err);
        // Continue without season data
      }
    }

    // Map OMDB data to our format
    const metadata = {
      title: data.Title,
      poster_url: data.Poster && data.Poster !== "N/A" ? data.Poster : null,
      genre: data.Genre && data.Genre !== "N/A" ? data.Genre : null,
      language: data.Language && data.Language !== "N/A" ? data.Language : null,
      average_rating: data.imdbRating && data.imdbRating !== "N/A" ? parseFloat(data.imdbRating) : null,
      length: seasonTotalLength || (data.Runtime && data.Runtime !== "N/A" ? data.Runtime : null),
      type: mapOMDBType(data.Type),
      episodes: seasonEpisodes !== null ? seasonEpisodes : (data.totalSeasons ? parseInt(data.totalSeasons) * 10 : null),
      season: seasonNumber || (data.totalSeasons ? `${data.totalSeasons} seasons` : null),
      year: data.Year,
      plot: data.Plot,
      imdb_id: data.imdbID && data.imdbID !== "N/A" ? data.imdbID : null,
    };

    return NextResponse.json(metadata);
  } catch (error) {
    console.error("Metadata fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}

function mapOMDBType(omdbType?: string): string | null {
  if (!omdbType) return null;
  
  const typeMap: Record<string, string> = {
    movie: "Movie",
    series: "TV Show",
    episode: "TV Show",
  };

  return typeMap[omdbType.toLowerCase()] || null;
}

function findBestMatch(
  searchQuery: string,
  results: Array<{ Title: string; Year: string; imdbID: string; Type: string; Poster: string }>,
  requestedType?: string | null
): { Title: string; Year: string; imdbID: string; Type: string; Poster: string } | null {
  if (results.length === 0) return null;

  const queryLower = searchQuery.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
  
  // Extract number from query (e.g., "2" from "doctor strange 2")
  const queryNumber = queryLower.match(/\b(\d+)\b/)?.[1];
  
  // Score each result
  const scoredResults = results.map(result => {
    let score = 0;
    const titleLower = result.Title.toLowerCase();
    const titleWords = titleLower.split(/\s+/).filter(w => w.length > 0);
    
    // Type match bonus
    if (requestedType) {
      const requestedTypeLower = requestedType.toLowerCase();
      const resultTypeLower = result.Type.toLowerCase();
      if (requestedTypeLower === resultTypeLower) {
        score += 100;
      }
    }
    
    // Exact title match (highest priority)
    if (titleLower === queryLower) {
      score += 1000;
    }
    
    // Check if query words appear in title
    let matchingWords = 0;
    queryWords.forEach(qWord => {
      if (titleWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))) {
        matchingWords++;
      }
    });
    score += matchingWords * 50;
    
    // Number matching bonus (for sequels like "doctor strange 2")
    if (queryNumber) {
      const titleNumber = titleLower.match(/\b(\d+)\b/)?.[1];
      if (titleNumber === queryNumber) {
        score += 200;
      }
      
      // Also check for roman numerals or sequel indicators
      const sequelIndicators = ['ii', 'iii', 'iv', 'v', '2', '3', '4', '5'];
      const queryHasNumber = sequelIndicators.some(ind => queryLower.includes(ind));
      if (queryHasNumber) {
        // Check if title has sequel indicators
        const hasSequelInTitle = sequelIndicators.some(ind => titleLower.includes(ind));
        if (hasSequelInTitle) {
          score += 150;
        }
      }
    }
    
    // Check for common sequel words
    const sequelWords = ['multiverse', 'madness', 'sequel', 'returns', 'reborn', 'awakening'];
    if (queryLower.includes('2') || queryLower.includes('ii')) {
      sequelWords.forEach(word => {
        if (titleLower.includes(word)) {
          score += 100;
        }
      });
    }
    
    // Prefer more recent results (if year is close)
    const currentYear = new Date().getFullYear();
    const resultYear = parseInt(result.Year);
    if (!isNaN(resultYear)) {
      // Prefer results from the last 20 years
      if (resultYear >= currentYear - 20) {
        score += 10;
      }
    }
    
    return { result, score };
  });
  
  // Sort by score (highest first) and return the best match
  scoredResults.sort((a, b) => b.score - a.score);
  return scoredResults[0]?.result || null;
}

function findBestBookMatch(
  searchQuery: string,
  results: GoogleBooksVolume[],
  requestedYear?: string | null
): GoogleBooksVolume | null {
  if (results.length === 0) return null;

  const queryLower = searchQuery.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
  
  // Extract year from query if present
  const queryYear = requestedYear || queryLower.match(/\b(19|20)\d{2}\b/)?.[0];
  
  // Score each result
  const scoredResults = results.map(volume => {
    let score = 0;
    const titleLower = volume.volumeInfo.title.toLowerCase();
    const titleWords = titleLower.split(/\s+/).filter(w => w.length > 0);
    
    // Exact title match (highest priority)
    if (titleLower === queryLower) {
      score += 1000;
    }
    
    // Check if query words appear in title
    let matchingWords = 0;
    queryWords.forEach(qWord => {
      if (titleWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))) {
        matchingWords++;
      }
    });
    score += matchingWords * 50;
    
    // Year matching bonus
    if (queryYear && volume.volumeInfo.publishedDate) {
      const publishedYear = volume.volumeInfo.publishedDate.match(/\d{4}/)?.[0];
      if (publishedYear === queryYear) {
        score += 200;
      }
    }
    
    // Prefer results with more metadata (images, ratings, etc.)
    if (volume.volumeInfo.imageLinks) {
      score += 20;
    }
    if (volume.volumeInfo.averageRating) {
      score += 10;
    }
    if (volume.volumeInfo.description) {
      score += 10;
    }
    
    return { volume, score };
  });
  
  // Sort by score (highest first) and return the best match
  scoredResults.sort((a, b) => b.score - a.score);
  return scoredResults[0]?.volume || null;
}

