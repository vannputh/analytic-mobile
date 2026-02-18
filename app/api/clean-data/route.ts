import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { normalizeGeminiError } from "@/lib/gemini-errors"

const SYSTEM_INSTRUCTION = `You are a strict data cleaner for a media tracking application. Your job is to normalize messy CSV data into a clean, structured JSON format.

RULES:
1. Normalize all dates to YYYY-MM-DD format
2. Convert ratings like "5/10" or "8.5/10" to plain numeric values (5.0, 8.5)
3. Strip all currency symbols from prices, output as plain numbers
4. Parse durations into standardized format: "X min" or "Xh Ym" (e.g., "2h" becomes "120 min", "1:30" becomes "90 min")
5. Normalize medium values to one of: Movie, TV Show, Game, Podcast
6. Normalize status values to one of: Finished, Watching, On Hold, Dropped, Plan to Watch
7. Genre should be an array of strings. Split comma-separated genres and trim whitespace
8. If a field is empty or "N/A" or "-", set it to null
9. Trim all string values
10. Preserve the original title exactly as given

OUTPUT FORMAT:
Return a JSON object with structure:
{
  "entries": [
    {
      "title": "string",
      "medium": "string | null",
      "type": "string | null",
      "season": "string | null",
      "episodes": "number | null",
      "length": "string | null",
      "price": "number | null",
      "status": "string | null",
      "my_rating": "number | null",
      "average_rating": "number | null",
      "platform": "string | null",
      "language": "string | null",
      "start_date": "string | null",
      "finish_date": "string | null",
      "genre": ["string"] | null,
      "poster_url": "string | null",
      "imdb_id": "string | null"
    }
  ],
  "errors": ["string"] // List any rows that couldn't be parsed
}

CRITICAL JSON REQUIREMENTS:
- Return ONLY valid JSON, no markdown code blocks
- All property names must be double-quoted
- All string values must be double-quoted and properly escaped
- No trailing commas
- No comments
- Ensure all special characters in strings are properly escaped (quotes, newlines, etc.)
- If a field value contains quotes, escape them with backslash: \"
- Return the complete JSON object starting with { and ending with }

IMPORTANT: Return ONLY the raw JSON object. No markdown formatting, no code blocks, no explanations before or after.`

export async function POST(request: NextRequest) {
  try {
    const { csvData } = await request.json()

    if (!csvData || typeof csvData !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid csvData field" },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      )
    }

    const modelName = process.env.GEMINI_MODEL_NAME
    if (!modelName) {
      return NextResponse.json(
        { error: "Gemini model name not configured (GEMINI_MODEL_NAME)" },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_INSTRUCTION,
    })

    const prompt = `Clean and normalize the following CSV data:\n\n${csvData}`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Extract JSON from response (handle potential markdown wrapping)
    let jsonString = text.trim()

    // Try to extract JSON from code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonString = jsonMatch[1].trim()
    } else {
      // Try to find JSON object boundaries
      const startIdx = jsonString.indexOf("{")
      const lastIdx = jsonString.lastIndexOf("}")
      if (startIdx !== -1 && lastIdx !== -1 && lastIdx > startIdx) {
        jsonString = jsonString.substring(startIdx, lastIdx + 1)
      }
    }

    // Try to repair common JSON issues
    function repairJSON(str: string): string {
      // Remove trailing commas before } or ]
      str = str.replace(/,(\s*[}\]])/g, "$1")
      // Fix unescaped quotes in strings (basic attempt)
      // This is tricky, so we'll be conservative
      return str
    }

    let parsed: any
    try {
      // First try direct parse
      parsed = JSON.parse(jsonString)
    } catch (parseError) {
      // Try repairing common issues
      try {
        const repaired = repairJSON(jsonString)
        parsed = JSON.parse(repaired)
      } catch (repairError) {
        // Log the problematic JSON for debugging
        console.error("Failed to parse JSON. Response length:", jsonString.length)
        console.error("First 500 chars:", jsonString.substring(0, 500))
        console.error("Last 500 chars:", jsonString.substring(Math.max(0, jsonString.length - 500)))

        // Try to extract just the entries array as a last resort
        const entriesMatch = jsonString.match(/"entries"\s*:\s*\[([\s\S]*?)\](?:\s*[,}])/)
        if (entriesMatch) {
          try {
            const entriesJson = `[${entriesMatch[1]}]`
            const entries = JSON.parse(entriesJson)
            parsed = { entries, errors: [] }
          } catch {
            throw new SyntaxError(
              `Failed to parse JSON response. Original error: ${parseError instanceof Error ? parseError.message : "Unknown"}`
            )
          }
        } else {
          throw new SyntaxError(
            `Failed to parse JSON response. Original error: ${parseError instanceof Error ? parseError.message : "Unknown"}`
          )
        }
      }
    }

    if (!parsed.entries || !Array.isArray(parsed.entries)) {
      throw new Error("Invalid response structure from AI: missing entries array")
    }

    return NextResponse.json({
      success: true,
      data: parsed.entries,
      errors: parsed.errors || [],
      rawCount: parsed.entries.length,
    })
  } catch (error) {
    console.error("Clean data error:", error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON" },
        { status: 500 }
      )
    }

    const { message, statusCode } = normalizeGeminiError(error)
    return NextResponse.json(
      { error: message },
      { status: statusCode && statusCode >= 400 && statusCode < 600 ? statusCode : 500 }
    )
  }
}

