import { NextRequest, NextResponse } from "next/server";
import {
  fetchTMDBMovie,
  fetchTMDBTV,
  searchTMDB,
  findTMDBByIMDb,
  formatRuntime,
  getTMDBPosterUrl,
  TMDBMovieResponse,
  TMDBTVResponse
} from "@/lib/services/tmdb";
import {
  fetchOMDBByTitle,
  fetchOMDBByIMDbId,
  searchOMDB,
  findBestOMDBMatch,
  mapOMDBType,
  OMDBResponse
} from "@/lib/services/omdb";
import { normalizeLanguageCode, normalizeLanguage } from "@/lib/language-utils";
import { classifyWithGemini } from "@/lib/services/ai-classifier";
import type { MetadataResponse } from "@analytics/contracts";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const title = searchParams.get("title");
    const imdbIdParam = searchParams.get("imdb_id"); // For direct IMDb ID searches
    const type = searchParams.get("type"); // movie, series, episode
    const medium = searchParams.get("medium"); // Movie, TV Show, etc.
    const year = searchParams.get("year");
    const season = searchParams.get("season"); // Season number (e.g., "1", "2")
    const source = searchParams.get("source"); // "omdb", "tmdb", or undefined (both)

    // Check if imdb_id is provided
    const isImdbId = imdbIdParam && imdbIdParam.trim().startsWith("tt");

    if (!title && !imdbIdParam) {
      return NextResponse.json(
        { error: "Title or IMDb ID is required" },
        { status: 400 }
      );
    }

    // --- MOVIE / TV SHOW FLOW ---

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

    const useOMDB = !source || source === "omdb";
    const useTMDB = !source || source === "tmdb";

    let omdbData: OMDBResponse | null = null;
    let tmdbMovieData: TMDBMovieResponse | null = null;
    let tmdbTVData: TMDBTVResponse | null = null;
    let tmdbId: { movieId?: number; tvId?: number } | null = null;

    // Step 1: Find TMDB ID (if using TMDB)
    if (useTMDB && tmdbApiKey) {
      if (isImdbId && imdbIdParam) {
        tmdbId = await findTMDBByIMDb(imdbIdParam.trim(), tmdbApiKey);
      } else if (title) {
        tmdbId = await searchTMDB(title, tmdbApiKey, type || undefined, year || undefined);
      }
    }

    // Step 2: Fetch from TMDB if we have an ID
    if (useTMDB && tmdbApiKey && tmdbId) {
      if (tmdbId.movieId) {
        tmdbMovieData = await fetchTMDBMovie(tmdbId.movieId, tmdbApiKey);
      } else if (tmdbId.tvId) {
        tmdbTVData = await fetchTMDBTV(tmdbId.tvId, tmdbApiKey);
      }
    }

    // Step 3: Fetch from OMDB (if using OMDB)
    if (useOMDB && omdbApiKey) {
      if (isImdbId && imdbIdParam) {
        omdbData = await fetchOMDBByIMDbId(imdbIdParam.trim(), omdbApiKey);
      } else if (title) {
        const options = {
          type: (type === "movie" || type === "series") ? type : undefined,
          year: year || undefined
        };
        omdbData = await fetchOMDBByTitle(title, omdbApiKey, options);

        // If direct title search fails, try fuzzy search
        if ((!omdbData || omdbData.Response === "False") && !isImdbId) {
          const searchResults = await searchOMDB(title, omdbApiKey, options.type);
          if (searchResults.length > 0) {
            const bestMatch = findBestOMDBMatch(title, searchResults, options.type);
            if (bestMatch) {
              omdbData = await fetchOMDBByTitle(bestMatch.Title, omdbApiKey, options);
            }
          }
        }
      } else {
        // No title or ID, and no TMDB data found
        if (!tmdbMovieData && !tmdbTVData) {
          return NextResponse.json(
            { error: "Title or IMDb ID is required" },
            { status: 400 }
          );
        }
      }
    }

    // Check if we have any data
    const hasOMDBData = omdbData && omdbData.Response === "True";
    const hasTMDBData = tmdbMovieData !== null || tmdbTVData !== null;

    if (!hasOMDBData && !hasTMDBData) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    // Base data source
    const data = hasOMDBData ? omdbData : null;

    // Process TV Show Logic
    const isTVShow = (data?.Type?.toLowerCase() === "series" || data?.Type?.toLowerCase() === "episode") || tmdbTVData !== null;

    let episodeCount: number | null = null;
    let seasonInfo: string | null = null;
    let totalRuntime: string | null = null;
    let seasonEpisodes: number | null = null;
    let seasonNumber: string | null = null;
    let seasonTotalLength: string | null = null;

    if (isTVShow) {
      if (tmdbTVData) {
        episodeCount = tmdbTVData.number_of_episodes || null;
        if (tmdbTVData.number_of_seasons) {
          seasonInfo = tmdbTVData.number_of_seasons === 1 ? "1 season" : `${tmdbTVData.number_of_seasons} seasons`;
        }

        // Calculate total runtime
        if (episodeCount && tmdbTVData.episode_run_time && tmdbTVData.episode_run_time.length > 0) {
          const avgEpisodeRuntime = tmdbTVData.episode_run_time[0] ||
            Math.round(tmdbTVData.episode_run_time.reduce((a, b) => a + b, 0) / tmdbTVData.episode_run_time.length);
          totalRuntime = formatRuntime(episodeCount * avgEpisodeRuntime);
        }
      } else if (data && data.totalSeasons) {
        const seasons = parseInt(data.totalSeasons);
        seasonInfo = seasons === 1 ? "1 season" : `${seasons} seasons`;
      }

      // Specific Season Logic
      if (season) {
        const seasonMatch = season.match(/\d+/);
        const seasonNum = seasonMatch ? seasonMatch[0] : season;
        seasonNumber = `Season ${seasonNum}`;

        if (tmdbTVData && tmdbTVData.seasons) {
          const seasonData = tmdbTVData.seasons.find(s => s.season_number === parseInt(seasonNum));
          if (seasonData) {
            seasonEpisodes = seasonData.episode_count;
            // Calculate season runtime
            if (seasonEpisodes && tmdbTVData.episode_run_time && tmdbTVData.episode_run_time.length > 0) {
              const avgEpisodeRuntime = tmdbTVData.episode_run_time[0] ||
                Math.round(tmdbTVData.episode_run_time.reduce((a, b) => a + b, 0) / tmdbTVData.episode_run_time.length);
              seasonTotalLength = formatRuntime(seasonEpisodes * avgEpisodeRuntime);
            }
          }
        }
      }
    }

    // Construct final metadata object
    const metadata: MetadataResponse = {
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
      content_type: null,
      price: null,
    };

    if (tmdbMovieData) {
      metadata.title = tmdbMovieData.title;
      metadata.year = tmdbMovieData.release_date?.substring(0, 4) || null;
      metadata.plot = tmdbMovieData.overview || null;
      metadata.average_rating = tmdbMovieData.vote_average ? parseFloat((tmdbMovieData.vote_average).toFixed(1)) : null;
      metadata.genre = tmdbMovieData.genres?.map(g => g.name) || null;
      metadata.language = tmdbMovieData.spoken_languages?.length
        ? normalizeLanguage(tmdbMovieData.spoken_languages.map((l) => l.name || l.iso_639_1 || "")).join(", ")
        : null;
      metadata.imdb_id = tmdbMovieData.imdb_id || null;
      metadata.length = tmdbMovieData.runtime ? formatRuntime(tmdbMovieData.runtime) : null;
      metadata.type = "Movie";
      metadata.poster_url = getTMDBPosterUrl(tmdbMovieData.poster_path);
    } else if (tmdbTVData) {
      metadata.title = tmdbTVData.name;
      metadata.year = tmdbTVData.first_air_date?.substring(0, 4) || null;
      metadata.plot = tmdbTVData.overview || null;
      metadata.average_rating = tmdbTVData.vote_average ? parseFloat((tmdbTVData.vote_average).toFixed(1)) : null;
      metadata.genre = tmdbTVData.genres?.map(g => g.name) || null;
      metadata.language = tmdbTVData.spoken_languages?.length
        ? normalizeLanguage(tmdbTVData.spoken_languages.map((l) => l.name || l.iso_639_1 || "")).join(", ")
        : null;
      metadata.imdb_id = tmdbTVData.external_ids?.imdb_id || null;
      metadata.type = "TV Show";
      metadata.episodes = seasonEpisodes !== null ? seasonEpisodes : episodeCount;
      metadata.season = seasonNumber || seasonInfo;
      metadata.length = seasonTotalLength || totalRuntime;
      metadata.poster_url = getTMDBPosterUrl(tmdbTVData.poster_path);
    } else if (data) {
      // Fallback to OMDB
      metadata.title = data.Title || null;
      metadata.year = data.Year || null;
      metadata.plot = data.Plot || null;
      metadata.average_rating = data.imdbRating && data.imdbRating !== "N/A" ? parseFloat(data.imdbRating) : null;
      metadata.genre = data.Genre && data.Genre !== "N/A" ? data.Genre : null;
      metadata.language =
        data.Language && data.Language !== "N/A"
          ? normalizeLanguage(data.Language).join(", ")
          : null;
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

    // Merge/Overlay OMDB data if available (often has better ratings or genres)
    if (data) {
      // Rating
      if (data.imdbRating && data.imdbRating !== "N/A") {
        const omdbRating = parseFloat(data.imdbRating);
        if (!metadata.average_rating || omdbRating > 0) {
          metadata.average_rating = omdbRating;
        }
      }

      // Poster
      if (data.Poster && data.Poster !== "N/A" && !metadata.poster_url) {
        metadata.poster_url = data.Poster;
      }

      // Genre
      if (data.Genre && data.Genre !== "N/A") {
        if (!metadata.genre) {
          metadata.genre = data.Genre;
        } else if (Array.isArray(metadata.genre)) {
          const omdbGenres = data.Genre.split(",").map(g => g.trim());
          const merged = [...new Set([...metadata.genre, ...omdbGenres])];
          metadata.genre = merged;
        }
      }
    }

    // --- LOGIC-BASED AUTOFILL ---
    
    // 1. Determine content_type from genres
    let needsAIClassification = false;
    
    if (metadata.genre) {
      const genres = Array.isArray(metadata.genre) ? metadata.genre : metadata.genre.split(",").map((g: string) => g.trim());
      const genresLower = genres.map((g: string) => g.toLowerCase());
      
      // Map genres to content type
      if (genresLower.includes("documentary")) {
        metadata.content_type = "Documentary";
      } else if (genresLower.includes("animation") || genresLower.includes("anime")) {
        metadata.content_type = "Animation";
      } else if (genresLower.includes("reality") || genresLower.includes("game-show")) {
        metadata.content_type = "Reality";
      } else if (genresLower.includes("talk-show") || genresLower.includes("variety") || genresLower.includes("news")) {
        metadata.content_type = "Variety";
      } else {
        metadata.content_type = "Scripted Live Action";
      }
    } else {
      // No genres available, might need AI
      needsAIClassification = true;
    }

    // 2. Gemini AI Fallback (if needed and available)
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (needsAIClassification && geminiApiKey && metadata.title) {
      try {
        const classification = await classifyWithGemini({
          title: metadata.title,
          plot: metadata.plot || undefined,
          genres: Array.isArray(metadata.genre) ? metadata.genre : (metadata.genre ? [metadata.genre] : undefined),
          year: metadata.year || undefined,
          type: metadata.type || undefined,
        }, geminiApiKey);

        if (classification) {
          if (classification.content_type && !metadata.content_type) {
            metadata.content_type = classification.content_type;
          }
          if (classification.medium && !metadata.type) {
            metadata.type = classification.medium;
          }
          if (classification.suggested_genres && (!metadata.genre || (Array.isArray(metadata.genre) && metadata.genre.length === 0))) {
            metadata.genre = classification.suggested_genres;
          }
        }
      } catch (error) {
        console.error("AI classification failed, continuing without it:", error);
        // Continue without AI classification, don't fail the request
      }
    }

    // Fallback if still no content_type
    if (!metadata.content_type) {
      metadata.content_type = "Scripted Live Action";
    }

    // 3. Set season default based on medium/type
    if (metadata.type === "Movie" && !metadata.season) {
      metadata.season = "1";
    } else if (metadata.type === "TV Show" && !metadata.season) {
      // For TV shows, if we don't have season info, default to "Season 1"
      metadata.season = "Season 1";
    }

    // 4. Auto-fill episodes for movies
    if (metadata.type === "Movie" && !metadata.episodes) {
      metadata.episodes = 1;
    }

    // 5. Ensure price defaults to 0
    metadata.price = 0;

    return NextResponse.json(metadata);
  } catch (error) {
    console.error("Metadata fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}
