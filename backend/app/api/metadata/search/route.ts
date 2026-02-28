import { NextRequest, NextResponse } from "next/server";
import { searchOMDB } from "@/lib/services/omdb";
import type { MetadataSearchItem, MetadataSearchResponse } from "@analytics/contracts";

// Extended TMDB search types
interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
  media_type?: string;
  overview?: string;
}

interface TMDBSearchResponse {
  results?: TMDBSearchResult[];
  total_results?: number;
}

async function searchTMDBMulti(query: string, apiKey: string): Promise<MetadataSearchItem[]> {
  try {
    const url = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=1`;
    const response = await fetch(url);
    
    if (!response.ok) return [];
    
    const data: TMDBSearchResponse = await response.json();
    
    if (!data.results || data.results.length === 0) return [];
    
    // Filter only movies and TV shows, map to our format
    return data.results
      .filter(item => item.media_type === "movie" || item.media_type === "tv")
      .slice(0, 8) // Limit to top 8 results
      .map(item => ({
        id: `tmdb_${item.media_type}_${item.id}`,
        title: item.title || item.name || "Unknown",
        year: item.release_date?.substring(0, 4) || item.first_air_date?.substring(0, 4) || null,
        poster_url: item.poster_path 
          ? `https://image.tmdb.org/t/p/w200${item.poster_path}` 
          : null,
        media_type: item.media_type === "movie" ? "movie" : "tv",
      }));
  } catch (error) {
    console.error("TMDB search error:", error);
    return [];
  }
}

async function searchOMDBFallback(query: string, apiKey: string): Promise<MetadataSearchItem[]> {
  try {
    const results = await searchOMDB(query, apiKey);
    
    if (!results || results.length === 0) return [];
    
    return results
      .slice(0, 8) // Limit to top 8 results
      .map(item => ({
        id: `omdb_${item.imdbID}`,
        title: item.Title || "Unknown",
        year: item.Year || null,
        poster_url: item.Poster && item.Poster !== "N/A" ? item.Poster : null,
        media_type: item.Type === "series" ? "tv" : "movie",
        imdb_id: item.imdbID,
      }));
  } catch (error) {
    console.error("OMDB search error:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { results: [] },
        { status: 200 }
      );
    }
    
    const tmdbApiKey = process.env.TMDB_API_KEY;
    const omdbApiKey = process.env.OMDB_API_KEY;
    
    if (!tmdbApiKey && !omdbApiKey) {
      return NextResponse.json(
        { 
          error: "TMDB_API_KEY or OMDB_API_KEY must be configured",
          results: []
        },
        { status: 500 }
      );
    }
    
    let results: MetadataSearchItem[] = [];
    
    // Try TMDB first (preferred)
    if (tmdbApiKey) {
      results = await searchTMDBMulti(query.trim(), tmdbApiKey);
    }
    
    // Fallback to OMDB if TMDB returned no results
    if (results.length === 0 && omdbApiKey) {
      results = await searchOMDBFallback(query.trim(), omdbApiKey);
    }
    
    const payload: MetadataSearchResponse = { results }
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Failed to search", results: [] },
      { status: 500 }
    );
  }
}
