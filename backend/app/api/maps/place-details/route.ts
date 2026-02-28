import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api/request-auth";
import type { MapsPlaceDetailsRequest, MapsPlaceDetailsResponse } from "@analytics/contracts";

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAuthenticatedUser(request);
        if (!auth.success) return auth.response;

        const { url } = (await request.json()) as MapsPlaceDetailsRequest;

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "GOOGLE_MAPS_API_KEY is not configured" },
                { status: 500 }
            );
        }

        // 1. Expand short URLs if necessary
        let fullUrl = url;
        let redirectCount = 0;
        const maxRedirects = 5;

        while ((fullUrl.includes("goo.gl") || fullUrl.includes("maps.app.goo.gl")) && redirectCount < maxRedirects) {
            try {
                const response = await fetch(fullUrl, {
                    method: "HEAD",
                    redirect: "manual",
                });
                const location = response.headers.get("location");
                if (location) {
                    fullUrl = location.startsWith('http') ? location : new URL(location, fullUrl).href;
                    redirectCount++;
                } else {
                    break;
                }
            } catch (error) {
                console.error("Error expanding short URL:", error);
                break;
            }
        }

        // 2. Extract info from URL
        let placeId: string | null = null;
        let query: string | null = null;
        let coords: { lat: number; lng: number } | null = null;
        let searchStrategy: "id" | "query" = "query";

        try {
            const urlObj = new URL(fullUrl);

            // Check for place_id or ftid
            const idParam = urlObj.searchParams.get("place_id") || urlObj.searchParams.get("ftid");
            if (idParam) {
                placeId = idParam;
                searchStrategy = "id";
            }

            // Extract coordinates from URL if present (e.g., @11.5834349,104.8813013)
            const coordMatch = fullUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (coordMatch) {
                coords = {
                    lat: parseFloat(coordMatch[1]),
                    lng: parseFloat(coordMatch[2])
                };
            }

            // If no Place ID, look for query in path
            if (!placeId) {
                // regex for /maps/place/Name/ or /maps/search/Name/
                // Catch both "place" and "search" paths, avoid capturing coordinates
                const placeRegex = /\/maps\/(?:place|search)\/([^\/@?]+)/;
                const match = fullUrl.match(placeRegex);

                if (match && match[1]) {
                    const captured = match[1];
                    query = decodeURIComponent(captured).replace(/\+/g, " ");
                    searchStrategy = "query";
                }
            }

            // Fallback to q/query param if no path match
            if (!placeId && !query && searchStrategy !== "id") {
                const qParam = urlObj.searchParams.get("q") || urlObj.searchParams.get("query");
                if (qParam) {
                    query = qParam;
                    searchStrategy = "query";
                }
            }

        } catch (e) {
            console.error("URL parsing error:", e);
        }

        if (!placeId && !query && !coords) {
            return NextResponse.json({ error: "Could not identify place from URL" }, { status: 404 });
        }

        // 3. Call Google Places API
        let placeData = null;

        if (searchStrategy === "id" && placeId) {
            const placeDetailsUrl = `https://places.googleapis.com/v1/places/${placeId}`;

            const response = await fetch(placeDetailsUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'id,displayName,formattedAddress,priceLevel,websiteUri,location,addressComponents,photos'
                }
            });

            if (response.ok) {
                placeData = await response.json();
            }
        }

        if (!placeData && (query || coords)) {
            const textSearchUrl = `https://places.googleapis.com/v1/places:searchText`;

            const searchBody: any = {
                maxResultCount: 1
            };

            if (query) {
                searchBody.textQuery = query;
            } else if (coords) {
                searchBody.textQuery = "restaurant"; // Fallback if we only have coords
            }

            // Critical: Add location bias if we have coordinates from the URL
            if (coords) {
                searchBody.locationBias = {
                    circle: {
                        center: {
                            latitude: coords.lat,
                            longitude: coords.lng
                        },
                        radius: 500.0 // 500 meters radius
                    }
                };
            }

            const response = await fetch(textSearchUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.priceLevel,places.websiteUri,places.location,places.addressComponents,places.photos'
                },
                body: JSON.stringify(searchBody)
            });

            const data = await response.json();
            if (data.places && data.places.length > 0) {
                placeData = data.places[0];
            }
        }

        if (!placeData) {
            return NextResponse.json({ error: "Could not identify place from URL or search returned no results" }, { status: 404 });
        }

        // 4. Transform response
        // Google Places API v1 response structure
        // priceLevel is enum: PRICE_LEVEL_UNSPECIFIED, PRICE_LEVEL_FREE, PRICE_LEVEL_INEXPENSIVE, PRICE_LEVEL_MODERATE, PRICE_LEVEL_EXPENSIVE, PRICE_LEVEL_VERY_EXPENSIVE

        const priceLevelMap: Record<string, string> = {
            "PRICE_LEVEL_INEXPENSIVE": "1", // $
            "PRICE_LEVEL_MODERATE": "2",    // $$
            "PRICE_LEVEL_EXPENSIVE": "3",   // $$$
            "PRICE_LEVEL_VERY_EXPENSIVE": "4" // $$$$
        };

        // Extract address components
        let neighborhood = null;
        let city = null;
        let country = null;

        if (placeData.addressComponents) {
            for (const comp of placeData.addressComponents) {
                const types = comp.types;
                if (!types || !Array.isArray(types)) continue;

                if (types.includes("sublocality") || types.includes("neighborhood")) {
                    neighborhood = comp.longText;
                }
                if (types.includes("locality")) {
                    city = comp.longText;
                }
                if (types.includes("country")) {
                    country = comp.longText;
                }
            }
        }

        // Build photo URLs if photos are available
        // Google Places API v1 returns photos with a 'name' field like "places/ChIJ.../photos/AXCi2Q..."
        // We need to use the Media API endpoint to get the actual image
        const photoUrls: string[] = [];
        if (placeData.photos && Array.isArray(placeData.photos)) {
            for (const photo of placeData.photos.slice(0, 5)) { // Limit to 5 photos
                if (photo.name) {
                    // Construct the photo URL using the Places API media endpoint
                    const photoUrl = `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=800&key=${apiKey}`;
                    photoUrls.push(photoUrl);
                }
            }
        }

        const payload: MapsPlaceDetailsResponse = {
            name: placeData.displayName?.text || "",
            address: placeData.formattedAddress || "",
            website: placeData.websiteUri || "",
            priceLevel: priceLevelMap[placeData.priceLevel] || null,
            neighborhood,
            city,
            country: country || "Cambodia", // Default/Fallback
            googleMapsUrl: placeData.googleMapsUri || url,
            photos: photoUrls.length > 0 ? photoUrls : null,
        };

        return NextResponse.json(payload);

    } catch (error) {
        console.error("Maps API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
