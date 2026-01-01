import { NextRequest, NextResponse } from "next/server";

// OMDB API (free tier: 1000 requests/day)
// TMDB API (free tier: 40 requests/10 seconds)
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

// TMDB API interfaces
interface TMDBMovieResponse {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  genres?: Array<{ id: number; name: string }>;
  runtime?: number;
  vote_average?: number;
  vote_count?: number;
  imdb_id?: string;
  spoken_languages?: Array<{ iso_639_1: string; name: string }>;
}

interface TMDBTVResponse {
  id: number;
  name: string;
  first_air_date?: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  genres?: Array<{ id: number; name: string }>;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  vote_average?: number;
  vote_count?: number;
  seasons?: Array<{
    id: number;
    name: string;
    season_number: number;
    episode_count: number;
    air_date?: string;
    overview?: string;
    poster_path?: string;
  }>;
  external_ids?: {
    imdb_id?: string;
  };
  spoken_languages?: Array<{ iso_639_1: string; name: string }>;
}

interface TMDBSearchResponse {
  results?: Array<{
    id: number;
    title?: string;
    name?: string;
    release_date?: string;
    first_air_date?: string;
    poster_path?: string;
    media_type: string;
  }>;
  total_results?: number;
}

interface TMDBFindResponse {
  movie_results?: Array<{ id: number }>;
  tv_results?: Array<{ id: number }>;
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

/**
 * Fetch movie data from TMDB API
 */
async function fetchTMDBMovie(tmdbId: number, apiKey: string): Promise<TMDBMovieResponse | null> {
  try {
    const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&append_to_response=external_ids`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("TMDB movie fetch error:", error);
    return null;
  }
}

/**
 * Fetch TV show data from TMDB API
 */
async function fetchTMDBTV(tmdbId: number, apiKey: string): Promise<TMDBTVResponse | null> {
  try {
    const url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}&append_to_response=external_ids`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("TMDB TV fetch error:", error);
    return null;
  }
}

/**
 * Search TMDB by title
 */
async function searchTMDB(
  title: string,
  apiKey: string,
  type?: string,
  year?: string
): Promise<{ movieId?: number; tvId?: number } | null> {
  try {
    const isTV = type === "series" || type === "tv";
    
    if (isTV) {
      // Search TV shows
      const params = new URLSearchParams({
        api_key: apiKey,
        query: title,
      });
      if (year) params.append("first_air_date_year", year);
      
      const url = `https://api.themoviedb.org/3/search/tv?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const data: TMDBSearchResponse = await response.json();
      
      if (data.results && data.results.length > 0) {
        return { tvId: data.results[0].id };
      }
    } else {
      // Search movies
      const params = new URLSearchParams({
        api_key: apiKey,
        query: title,
      });
      if (year) params.append("year", year);
      
      const url = `https://api.themoviedb.org/3/search/movie?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const data: TMDBSearchResponse = await response.json();
      
      if (data.results && data.results.length > 0) {
        return { movieId: data.results[0].id };
      }
    }
    
    return null;
  } catch (error) {
    console.error("TMDB search error:", error);
    return null;
  }
}

/**
 * Find TMDB ID by IMDb ID
 */
async function findTMDBByIMDb(imdbId: string, apiKey: string): Promise<{ movieId?: number; tvId?: number } | null> {
  try {
    const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${apiKey}&external_source=imdb_id`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data: TMDBFindResponse = await response.json();
    
    if (data.movie_results && data.movie_results.length > 0) {
      return { movieId: data.movie_results[0].id };
    }
    if (data.tv_results && data.tv_results.length > 0) {
      return { tvId: data.tv_results[0].id };
    }
    
    return null;
  } catch (error) {
    console.error("TMDB find by IMDb error:", error);
    return null;
  }
}

/**
 * Format runtime in minutes to readable format
 */
function formatRuntime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
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
    const source = searchParams.get("source"); // "omdb", "tmdb", or undefined (both)

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
        const imageUrl = volumeInfo.imageLinks.large || 
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

    // For movies and TV shows, use both OMDB and TMDB APIs for more accurate data
    const omdbApiKey = process.env.OMDB_API_KEY;
    const tmdbApiKey = process.env.TMDB_API_KEY;

    if (!omdbApiKey && !tmdbApiKey) {
      return NextResponse.json(
        {
          error: "OMDB_API_KEY or TMDB_API_KEY must be configured",
          info: "Get free API keys from http://www.omdbapi.com/apikey.aspx and https://www.themoviedb.org/settings/api",
        },
        { status: 500 }
      );
    }

    // Determine which sources to use
    const useOMDB = !source || source === "omdb";
    const useTMDB = !source || source === "tmdb";

    // Fetch from OMDB and/or TMDB based on source parameter
    let omdbData: OMDBResponse | null = null;
    let tmdbMovieData: TMDBMovieResponse | null = null;
    let tmdbTVData: TMDBTVResponse | null = null;
    let tmdbId: { movieId?: number; tvId?: number } | null = null;

    // Step 1: Find TMDB ID (if using TMDB)
    if (useTMDB && tmdbApiKey) {
      try {
        if (isImdbId && imdbIdParam) {
          // Find TMDB ID by IMDb ID
          tmdbId = await findTMDBByIMDb(imdbIdParam.trim(), tmdbApiKey);
        } else if (title) {
          // Search TMDB by title
          const searchYear: string | undefined = year ?? undefined;
          const searchType: string | undefined = type ?? undefined;
          tmdbId = await searchTMDB(title, tmdbApiKey, searchType, searchYear);
        }
      } catch (error) {
        console.error("TMDB search error:", error);
      }
    }

    // Step 2: Fetch from TMDB if we have an ID
    if (useTMDB && tmdbApiKey && tmdbId) {
      try {
        if (tmdbId.movieId) {
          tmdbMovieData = await fetchTMDBMovie(tmdbId.movieId, tmdbApiKey);
        } else if (tmdbId.tvId) {
          tmdbTVData = await fetchTMDBTV(tmdbId.tvId, tmdbApiKey);
        }
      } catch (error) {
        console.error("TMDB fetch error:", error);
      }
    }

    // Step 3: Fetch from OMDB (if using OMDB)
    if (useOMDB && omdbApiKey) {
      try {
        const params = new URLSearchParams({
          apikey: omdbApiKey,
          plot: "short",
        });

        if (isImdbId && imdbIdParam) {
          // Search by IMDb ID
          params.append("i", imdbIdParam.trim());
        } else if (title) {
          // Search by title
          params.append("t", title);
        } else {
          // If no title or IMDb ID, we can't search OMDB
          if (!tmdbMovieData && !tmdbTVData) {
            return NextResponse.json(
              { error: "Title or IMDb ID is required" },
              { status: 400 }
            );
          }
        }

        if (type && (type === "movie" || type === "series")) {
          params.append("type", type);
        }

        if (year) {
          params.append("y", year);
        }

        if (params.has("i") || params.has("t")) {
          const omdbUrl = `https://www.omdbapi.com/?${params.toString()}`;
          const response = await fetch(omdbUrl);
          omdbData = await response.json();
        }
      } catch (error) {
        console.error("OMDB fetch error:", error);
      }
    }

    // If OMDB direct search fails, try fuzzy search (only for title searches, not IMDb ID)
    if (omdbApiKey && omdbData && omdbData.Response === "False" && !isImdbId && title) {
      try {
        // Use search endpoint to find matches
        const searchParams = new URLSearchParams({
          apikey: omdbApiKey,
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
            const params = new URLSearchParams({
              apikey: omdbApiKey,
              t: bestMatch.Title,
              plot: "short",
            });

            if (type && (type === "movie" || type === "series")) {
              params.append("type", type);
            }

            if (year) {
              params.append("y", year);
            }

            const omdbUrl = `https://www.omdbapi.com/?${params.toString()}`;
            const response = await fetch(omdbUrl);
            omdbData = await response.json();
          }
        }
      } catch (error) {
        console.error("OMDB fuzzy search error:", error);
      }
    }

    // Check if we have any data
    const hasOMDBData = omdbData && omdbData.Response === "True";
    const hasTMDBData = tmdbMovieData !== null || tmdbTVData !== null;

    if (!hasOMDBData && !hasTMDBData) {
      return NextResponse.json(
        { error: "Media not found" },
        { status: 404 }
      );
    }

    // Use OMDB data as base (or construct from TMDB if OMDB unavailable)
    const data = hasOMDBData ? omdbData : null;

    // Calculate episode count and runtime for TV shows
    let episodeCount: number | null = null;
    let seasonInfo: string | null = null;
    let totalRuntime: string | null = null;
    let seasonEpisodes: number | null = null;
    let seasonNumber: string | null = null;
    let seasonTotalLength: string | null = null;

    const isTVShow = (data?.Type?.toLowerCase() === "series" || data?.Type?.toLowerCase() === "episode") || tmdbTVData !== null;

    if (isTVShow) {
      // Use TMDB for accurate episode count (preferred)
      if (tmdbTVData) {
        episodeCount = tmdbTVData.number_of_episodes || null;
        const seasons = tmdbTVData.number_of_seasons || null;
        if (seasons) {
          seasonInfo = seasons === 1 ? "1 season" : `${seasons} seasons`;
        }

        // Calculate total runtime: episode_count * average_episode_runtime
        if (episodeCount && tmdbTVData.episode_run_time && tmdbTVData.episode_run_time.length > 0) {
          // Use average episode runtime (TMDB provides array, use first or average)
          const avgEpisodeRuntime = tmdbTVData.episode_run_time[0] || 
            Math.round(tmdbTVData.episode_run_time.reduce((a, b) => a + b, 0) / tmdbTVData.episode_run_time.length);
          const totalMinutes = episodeCount * avgEpisodeRuntime;
          totalRuntime = formatRuntime(totalMinutes);
        }
      } else if (data && data.totalSeasons) {
        // Fallback to OMDB if TMDB unavailable
        const seasons = parseInt(data.totalSeasons);
        seasonInfo = seasons === 1 ? "1 season" : `${seasons} seasons`;
        // OMDB doesn't provide accurate episode count, so we'll try to get it from season data
      }

      // If season is specified, fetch season-specific data
      if (season) {
        const seasonMatch = season.match(/\d+/);
        const seasonNum = seasonMatch ? seasonMatch[0] : season;
        seasonNumber = `Season ${seasonNum}`;

        // Try TMDB first for season data
        if (tmdbTVData && tmdbTVData.seasons) {
          const seasonData = tmdbTVData.seasons.find(s => s.season_number === parseInt(seasonNum));
          if (seasonData) {
            seasonEpisodes = seasonData.episode_count;
            
            // Calculate season runtime
            if (seasonEpisodes && tmdbTVData.episode_run_time && tmdbTVData.episode_run_time.length > 0) {
              const avgEpisodeRuntime = tmdbTVData.episode_run_time[0] || 
                Math.round(tmdbTVData.episode_run_time.reduce((a, b) => a + b, 0) / tmdbTVData.episode_run_time.length);
              const seasonMinutes = seasonEpisodes * avgEpisodeRuntime;
              seasonTotalLength = formatRuntime(seasonMinutes);
            }
          }
        }

        // Fallback to OMDB for season data if TMDB didn't provide it
        if (seasonEpisodes === null && omdbApiKey && data) {
          try {
            const seasonParams = new URLSearchParams({
              apikey: omdbApiKey,
              Season: seasonNum,
            });
            
            // Use IMDb ID if available, otherwise use title
            if (isImdbId && imdbIdParam) {
              seasonParams.append("i", imdbIdParam.trim());
            } else if (data.imdbID && data.imdbID !== "N/A") {
              seasonParams.append("i", data.imdbID);
            } else if (title) {
              seasonParams.append("t", title);
            } else if (data.Title) {
              seasonParams.append("t", data.Title);
            }

            const seasonUrl = `https://www.omdbapi.com/?${seasonParams.toString()}`;
            const seasonResponse = await fetch(seasonUrl);
            const seasonData: OMDBResponse = await seasonResponse.json();

            if (seasonData.Response === "True" && seasonData.Episodes) {
              seasonEpisodes = seasonData.Episodes.length;
              
              // Fetch runtime for each episode to calculate total length
              let totalMinutes = 0;
              const episodePromises = seasonData.Episodes.map(async (episode) => {
                try {
                  const episodeParams = new URLSearchParams({
                    apikey: omdbApiKey,
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
                seasonTotalLength = formatRuntime(totalMinutes);
              }
            }
          } catch (err) {
            console.error("Failed to fetch season data:", err);
          }
        }
      }
    }

    // Merge data from OMDB and TMDB, preferring more accurate sources
    const metadata: {
      title: string | null;
      poster_url: string | null;
      genre: string | string[] | null;
      language: string | null;
      average_rating: number | null;
      length: string | null;
      type: string | null;
      episodes: number | null;
      season: string | null;
      year: string | null;
      plot: string | null;
      imdb_id: string | null;
    } = {
      title: null,
      poster_url: null,
      genre: null,
      language: null,
      average_rating: null,
      length: null,
      type: null,
      episodes: null,
      season: null,
      year: null,
      plot: null,
      imdb_id: null,
    };

    // Title: Prefer TMDB, fallback to OMDB
    if (tmdbMovieData) {
      metadata.title = tmdbMovieData.title;
      metadata.year = tmdbMovieData.release_date?.substring(0, 4) || null;
      metadata.plot = tmdbMovieData.overview || null;
      metadata.average_rating = tmdbMovieData.vote_average ? parseFloat((tmdbMovieData.vote_average).toFixed(1)) : null;
      metadata.genre = tmdbMovieData.genres?.map(g => g.name) || null;
      metadata.language = tmdbMovieData.spoken_languages?.[0]?.name || null;
      metadata.imdb_id = tmdbMovieData.imdb_id || null;
      metadata.length = tmdbMovieData.runtime ? formatRuntime(tmdbMovieData.runtime) : null;
      metadata.type = "Movie";
      if (tmdbMovieData.poster_path) {
        metadata.poster_url = `https://image.tmdb.org/t/p/w500${tmdbMovieData.poster_path}`;
      }
    } else if (tmdbTVData) {
      metadata.title = tmdbTVData.name;
      metadata.year = tmdbTVData.first_air_date?.substring(0, 4) || null;
      metadata.plot = tmdbTVData.overview || null;
      metadata.average_rating = tmdbTVData.vote_average ? parseFloat((tmdbTVData.vote_average).toFixed(1)) : null;
      metadata.genre = tmdbTVData.genres?.map(g => g.name) || null;
      metadata.language = tmdbTVData.spoken_languages?.[0]?.name || null;
      metadata.imdb_id = tmdbTVData.external_ids?.imdb_id || null;
      metadata.type = "TV Show";
      metadata.episodes = seasonEpisodes !== null ? seasonEpisodes : episodeCount;
      metadata.season = seasonNumber || seasonInfo;
      // Use season length if available, otherwise use total runtime
      metadata.length = seasonTotalLength || totalRuntime;
      if (tmdbTVData.poster_path) {
        metadata.poster_url = `https://image.tmdb.org/t/p/w500${tmdbTVData.poster_path}`;
      }
    } else if (data) {
      // Fallback to OMDB data
      metadata.title = data.Title || null;
      metadata.year = data.Year || null;
      metadata.plot = data.Plot || null;
      metadata.average_rating = data.imdbRating && data.imdbRating !== "N/A" ? parseFloat(data.imdbRating) : null;
      metadata.genre = data.Genre && data.Genre !== "N/A" ? data.Genre : null;
      metadata.language = data.Language && data.Language !== "N/A" ? data.Language : null;
      metadata.imdb_id = data.imdbID && data.imdbID !== "N/A" ? data.imdbID : null;
      metadata.type = mapOMDBType(data.Type);
      metadata.poster_url = data.Poster && data.Poster !== "N/A" ? data.Poster : null;
      
      if (isTVShow) {
        metadata.episodes = seasonEpisodes !== null ? seasonEpisodes : episodeCount;
        metadata.season = seasonNumber || seasonInfo;
        metadata.length = seasonTotalLength || totalRuntime || (data.Runtime && data.Runtime !== "N/A" ? data.Runtime : null);
      } else {
        metadata.length = data.Runtime && data.Runtime !== "N/A" ? data.Runtime : null;
      }
    }

    // Merge/override with OMDB data if available (for ratings, which OMDB has from IMDb)
    if (data && data.imdbRating && data.imdbRating !== "N/A") {
      const omdbRating = parseFloat(data.imdbRating);
      // Prefer OMDB rating if it exists (it's IMDb rating, more reliable)
      if (!metadata.average_rating || omdbRating > 0) {
        metadata.average_rating = omdbRating;
      }
    }

    // Merge poster if OMDB has better quality
    if (data && data.Poster && data.Poster !== "N/A" && !metadata.poster_url) {
      metadata.poster_url = data.Poster;
    }

    // Merge genre if available from OMDB
    if (data && data.Genre && data.Genre !== "N/A") {
      if (!metadata.genre) {
        metadata.genre = data.Genre;
      } else if (Array.isArray(metadata.genre)) {
        // Merge genres, avoiding duplicates
        const omdbGenres = data.Genre.split(",").map(g => g.trim());
        const merged = [...new Set([...metadata.genre, ...omdbGenres])];
        metadata.genre = merged;
      }
    }

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

