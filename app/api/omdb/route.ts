import { NextRequest, NextResponse } from 'next/server'

const OMDB_API_KEY = process.env.OMDB_API_KEY

export interface OMDBResponse {
  Title: string
  Year: string
  Rated: string
  Released: string
  Runtime: string
  Genre: string
  Director: string
  Writer: string
  Actors: string
  Plot: string
  Language: string
  Country: string
  Awards: string
  Poster: string
  Ratings: Array<{ Source: string; Value: string }>
  Metascore: string
  imdbRating: string
  imdbVotes: string
  imdbID: string
  Type: string
  totalSeasons?: string
  Response: string
  Error?: string
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const title = searchParams.get('title')
    const year = searchParams.get('year')
    const type = searchParams.get('type') // movie, series, episode

    if (!title) {
      return NextResponse.json(
        { error: 'Title parameter is required' },
        { status: 400 }
      )
    }

    if (!OMDB_API_KEY) {
      return NextResponse.json(
        { error: 'OMDB API key not configured' },
        { status: 500 }
      )
    }

    // Build OMDB API URL
    const omdbUrl = new URL('http://www.omdbapi.com/')
    omdbUrl.searchParams.set('apikey', OMDB_API_KEY)
    omdbUrl.searchParams.set('t', title)
    
    if (year) {
      omdbUrl.searchParams.set('y', year)
    }
    
    if (type) {
      omdbUrl.searchParams.set('type', type)
    }

    const response = await fetch(omdbUrl.toString())
    const data: OMDBResponse = await response.json()

    if (data.Response === 'False') {
      return NextResponse.json(
        { error: data.Error || 'Movie not found' },
        { status: 404 }
      )
    }

    // Transform OMDB data to our format
    const transformedData = {
      title: data.Title,
      year: data.Year,
      poster_url: data.Poster !== 'N/A' ? data.Poster : null,
      average_rating: data.imdbRating !== 'N/A' ? parseFloat(data.imdbRating) : null,
      imdb_id: data.imdbID,
      medium: mapOMDBTypeToMedium(data.Type),
      type: data.Genre !== 'N/A' ? data.Genre : null,
      language: data.Language !== 'N/A' ? data.Language.split(',')[0].trim() : null,
      length: data.Runtime !== 'N/A' ? data.Runtime : null,
      totalSeasons: data.totalSeasons,
      plot: data.Plot !== 'N/A' ? data.Plot : null,
      director: data.Director !== 'N/A' ? data.Director : null,
      actors: data.Actors !== 'N/A' ? data.Actors : null,
    }

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error('OMDB API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch movie data' },
      { status: 500 }
    )
  }
}

function mapOMDBTypeToMedium(omdbType: string): string {
  const typeMap: Record<string, string> = {
    movie: 'Movie',
    series: 'TV Show',
    episode: 'TV Show',
  }
  return typeMap[omdbType.toLowerCase()] || 'Movie'
}









