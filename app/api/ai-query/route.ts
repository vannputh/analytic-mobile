import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/supabase/server"
import { buildSystemPrompt, buildActionPrompt, shouldUseActionMode, WorkspaceType } from "@/lib/ai-query-schemas"
import { normalizeGeminiError } from "@/lib/gemini-errors"

export interface AIQueryRequest {
  query: string
  workspace: WorkspaceType
}

export interface MediaAction {
  type: "create" | "update" | "delete"
  id?: string // Required for update/delete
  data?: Partial<{
    title: string
    medium: string
    type: string
    status: string
    genre: string[]
    platform: string
    my_rating: number
    start_date: string
    finish_date: string
    language: string[]
    episodes: number
    episodes_watched: number
    price: number
  }>
}

export interface AIQueryResponse {
  success: boolean
  type?: "query" | "action"
  // Query mode fields
  sql?: string
  explanation?: string
  data?: any[]
  metadata?: {
    visualizationType: "kpi" | "table" | "bar" | "pie" | "line" | "area"
    columnCount: number
    rowCount: number
    columns: string[]
    columnTypes: Record<string, string>
  }
  // Action mode fields
  intent?: string
  actions?: MediaAction[]
  error?: string
}

// Validate SQL is read-only
function validateSQL(sql: string): { valid: boolean; error?: string } {
  const sqlUpper = sql.toUpperCase()

  // Check for dangerous operations
  const dangerousOperations = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "CREATE",
    "TRUNCATE",
    "GRANT",
    "REVOKE",
    "EXECUTE",
  ]

  for (const op of dangerousOperations) {
    if (sqlUpper.includes(op)) {
      return {
        valid: false,
        error: `SQL contains forbidden operation: ${op}. Only SELECT queries are allowed.`,
      }
    }
  }

  // Must start with SELECT (after trimming whitespace)
  if (!sqlUpper.trim().startsWith("SELECT")) {
    return {
      valid: false,
      error: "Query must start with SELECT",
    }
  }

  return { valid: true }
}

// Determine visualization type based on query results
function determineVisualizationType(
  data: any[],
  columns: string[]
): "kpi" | "table" | "bar" | "pie" | "line" | "area" {
  if (data.length === 0) {
    return "table"
  }

  // Single value (KPI)
  if (data.length === 1 && columns.length === 1) {
    const value = data[0][columns[0]]
    if (typeof value === "number") {
      return "kpi"
    }
  }

  // Check for date/time columns (time series)
  const hasDateColumn = columns.some((col) =>
    ["date", "month", "year", "visit_date", "start_date", "finish_date", "created_at"].includes(
      col.toLowerCase()
    )
  )

  // Check for aggregation patterns (count, sum, avg, etc.)
  const hasAggregation = columns.some((col) =>
    ["count", "total", "sum", "avg", "average", "min", "max"].some((agg) =>
      col.toLowerCase().includes(agg)
    )
  )

  // Time series data
  if (hasDateColumn && data.length > 1 && hasAggregation) {
    return "area"
  }

  // Grouped aggregation (e.g., count by genre, sum by medium)
  if (hasAggregation && data.length <= 20 && columns.length === 2) {
    // Use pie for categorical breakdowns with a numeric value
    return "pie"
  }

  // Bar chart for aggregations with more rows or multiple dimensions
  if (hasAggregation && data.length > 2) {
    return "bar"
  }

  // Default to table for detailed data
  return "table"
}

// Infer column types from data
function inferColumnTypes(data: any[]): Record<string, string> {
  if (data.length === 0) return {}

  const firstRow = data[0]
  const types: Record<string, string> = {}

  for (const [key, value] of Object.entries(firstRow)) {
    if (value === null || value === undefined) {
      types[key] = "unknown"
    } else if (typeof value === "number") {
      types[key] = "number"
    } else if (typeof value === "boolean") {
      types[key] = "boolean"
    } else if (typeof value === "string") {
      // Check if it's a date string
      const dateRegex = /^\d{4}-\d{2}-\d{2}/
      if (dateRegex.test(value)) {
        types[key] = "date"
      } else {
        types[key] = "string"
      }
    } else if (Array.isArray(value)) {
      types[key] = "array"
    } else {
      types[key] = "object"
    }
  }

  return types
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AIQueryRequest

    if (!body.query || typeof body.query !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid query field" },
        { status: 400 }
      )
    }

    if (!body.workspace || !["media", "food"].includes(body.workspace)) {
      return NextResponse.json(
        { success: false, error: "Invalid workspace. Must be 'media' or 'food'" },
        { status: 400 }
      )
    }

    // Check Gemini API key
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Gemini API key not configured" },
        { status: 500 }
      )
    }

    // Determine if this is an action request or query request
    const isActionMode = shouldUseActionMode(body.query)

    // Generate response using Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const systemPrompt = isActionMode 
      ? buildActionPrompt(body.workspace)
      : buildSystemPrompt(body.workspace)

    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: systemPrompt,
    })

    const result = await model.generateContent(body.query)
    const response = result.response

    // Safe text extraction (response.text() throws if blocked/empty)
    let text: string
    try {
      text = response.text()
    } catch (textError) {
      console.error("Gemini response not usable (blocked or empty):", textError)
      return NextResponse.json(
        {
          success: false,
          error:
            "The AI response was blocked or empty. Try rephrasing your question or check your API key and model access.",
        },
        { status: 500 }
      )
    }

    if (!text?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "The AI returned an empty response. Please try rephrasing your question.",
        },
        { status: 500 }
      )
    }

    // Parse JSON response
    let jsonString = text.trim()

    // Try to extract JSON from code blocks if wrapped
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

    let parsed: any
    try {
      parsed = JSON.parse(jsonString)
    } catch (parseError) {
      console.error("Failed to parse AI response:", text.substring(0, 500))
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse AI response. Please try rephrasing your question.",
        },
        { status: 500 }
      )
    }

    // Handle action mode response
    if (isActionMode || parsed.type === "action") {
      if (!parsed.actions || !Array.isArray(parsed.actions)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action response structure. Please try rephrasing your request.",
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        type: "action",
        intent: parsed.intent || "Perform actions",
        actions: parsed.actions,
      })
    }

    // Handle query mode response
    if (!parsed.sql || !parsed.explanation) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid AI response structure. Please try rephrasing your question.",
        },
        { status: 500 }
      )
    }

    // Validate SQL
    const validation = validateSQL(parsed.sql)
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          sql: parsed.sql,
        },
        { status: 400 }
      )
    }

    // Execute SQL query using Supabase
    const supabase = await createClient()

    // Use Supabase's rpc function to execute raw SQL
    // This requires a database function to be created in Supabase
    const { data: queryData, error: queryError } = await supabase.rpc("execute_sql_query", {
      query_text: parsed.sql,
    })

    if (queryError) {
      console.error("SQL execution error:", queryError)
      return NextResponse.json(
        {
          success: false,
          error: `Query execution failed: ${queryError.message}. Please ensure the 'execute_sql_query' function is created in your Supabase database.`,
          sql: parsed.sql,
          explanation: parsed.explanation,
        },
        { status: 500 }
      )
    }

    // Process results
    const resultData: Record<string, unknown>[] = Array.isArray(queryData) ? (queryData as Record<string, unknown>[]) : []
    const columns = resultData.length > 0 ? Object.keys(resultData[0]) : []
    const columnTypes = inferColumnTypes(resultData)
    const visualizationType = determineVisualizationType(resultData, columns)

    return NextResponse.json({
      success: true,
      type: "query",
      sql: parsed.sql,
      explanation: parsed.explanation,
      data: resultData,
      metadata: {
        visualizationType,
        columnCount: columns.length,
        rowCount: resultData.length,
        columns,
        columnTypes,
      },
    })
  } catch (error) {
    console.error("AI query error:", error)
    const { message, statusCode } = normalizeGeminiError(error)
    return NextResponse.json(
      { success: false, error: message },
      { status: statusCode && statusCode >= 400 && statusCode < 600 ? statusCode : 500 }
    )
  }
}
