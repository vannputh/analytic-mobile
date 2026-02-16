export type WorkspaceType = "media" | "food"

export interface SchemaDefinition {
  tableName: string
  description: string
  columns: ColumnDefinition[]
  exampleQueries: ExampleQuery[]
}

export interface ColumnDefinition {
  name: string
  type: string
  description: string
  example?: string
}

export interface ExampleQuery {
  question: string
  sql: string
  explanation: string
}

export const MEDIA_SCHEMA: SchemaDefinition = {
  tableName: "media_entries",
  description: "Tracks movies, TV shows, books, games, podcasts, and theatre performances",
  columns: [
    {
      name: "id",
      type: "UUID",
      description: "Unique identifier",
    },
    {
      name: "title",
      type: "TEXT",
      description: "Title of the media",
      example: "Inception",
    },
    {
      name: "medium",
      type: "TEXT",
      description: "Type of media",
      example: "Movie, TV Show, Book, Game, Podcast, Theatre",
    },
    {
      name: "type",
      type: "TEXT",
      description: "Sub-type or format",
      example: "Feature Film, Documentary, Action, Fiction",
    },
    {
      name: "genre",
      type: "TEXT[]",
      description: "Array of genres",
      example: '["Sci-Fi", "Thriller"]',
    },
    {
      name: "status",
      type: "TEXT",
      description: "Viewing/completion status",
      example: "Finished, Watching, On Hold, Dropped, Plan to Watch",
    },
    {
      name: "my_rating",
      type: "NUMERIC",
      description: "User's personal rating (0-10)",
      example: "8.5",
    },
    {
      name: "average_rating",
      type: "NUMERIC",
      description: "Average public rating",
      example: "8.8",
    },
    {
      name: "price",
      type: "NUMERIC",
      description: "Cost paid for the media",
      example: "14.99",
    },
    {
      name: "start_date",
      type: "DATE",
      description: "Date started watching/reading/playing",
      example: "2026-01-15",
    },
    {
      name: "finish_date",
      type: "DATE",
      description: "Date finished",
      example: "2026-02-10",
    },
    {
      name: "last_watched_at",
      type: "TIMESTAMP",
      description: "Last time the user interacted with this media",
      example: "2026-02-10 14:30:00",
    },
    {
      name: "platform",
      type: "TEXT",
      description: "Platform/service used",
      example: "Netflix, Steam, Kindle, Cinema",
    },
    {
      name: "language",
      type: "TEXT[]",
      description: "Languages (audio or subtitles)",
      example: '["English", "Spanish"]',
    },
    {
      name: "episodes",
      type: "INTEGER",
      description: "Total number of episodes (for TV shows)",
      example: "10",
    },
    {
      name: "episodes_watched",
      type: "INTEGER",
      description: "Number of episodes watched",
      example: "5",
    },
    {
      name: "season",
      type: "TEXT",
      description: "Season identifier",
      example: "Season 1",
    },
    {
      name: "length",
      type: "TEXT",
      description: "Duration or length",
      example: "148 min, 12h 30m",
    },
    {
      name: "imdb_id",
      type: "TEXT",
      description: "IMDb identifier",
      example: "tt1375666",
    },
    {
      name: "created_at",
      type: "TIMESTAMP",
      description: "Record creation timestamp",
    },
    {
      name: "updated_at",
      type: "TIMESTAMP",
      description: "Record last update timestamp",
    },
  ],
  exampleQueries: [
    {
      question: "How much did I spend from Jan 26 to Feb 26?",
      sql: `SELECT SUM(price) as total_spent FROM media_entries WHERE start_date >= '2026-01-26' AND start_date <= '2026-02-26' AND price IS NOT NULL`,
      explanation: "Sum all prices for media started in the date range",
    },
    {
      question: "What movies did I watch in 2025?",
      sql: `SELECT title, start_date, my_rating FROM media_entries WHERE medium = 'Movie' AND EXTRACT(YEAR FROM start_date::date) = 2025 ORDER BY start_date DESC`,
      explanation: "List all movies with their start dates in 2025",
    },
    {
      question: "Average rating by genre",
      sql: `SELECT UNNEST(genre) as genre, ROUND(AVG(my_rating)::numeric, 2) as avg_rating, COUNT(*) as count FROM media_entries WHERE my_rating IS NOT NULL AND genre IS NOT NULL GROUP BY genre ORDER BY avg_rating DESC`,
      explanation: "Unnest genre array and calculate average rating per genre",
    },
    {
      question: "How many movies did I watch in 2025?",
      sql: `SELECT COUNT(*) as count FROM media_entries WHERE medium = 'Movie' AND EXTRACT(YEAR FROM start_date::date) = 2025`,
      explanation: "Count movies started in 2025",
    },
    {
      question: "Total spent on games",
      sql: `SELECT SUM(price) as total_spent FROM media_entries WHERE medium = 'Game' AND price IS NOT NULL`,
      explanation: "Sum prices for all games",
    },
    {
      question: "What did I watch last week?",
      sql: `SELECT title, medium, start_date FROM media_entries WHERE start_date >= CURRENT_DATE - INTERVAL '7 days' ORDER BY start_date DESC`,
      explanation: "Get media started in the last 7 days",
    },
    {
      question: "Show me all movies rated above 8",
      sql: `SELECT title, my_rating, start_date FROM media_entries WHERE medium = 'Movie' AND my_rating > 8 ORDER BY my_rating DESC, start_date DESC`,
      explanation: "List highly rated movies",
    },
    {
      question: "Average rating by medium",
      sql: `SELECT medium, ROUND(AVG(my_rating)::numeric, 2) as avg_rating, COUNT(*) as count FROM media_entries WHERE my_rating IS NOT NULL AND medium IS NOT NULL GROUP BY medium ORDER BY avg_rating DESC`,
      explanation: "Calculate average rating for each media type",
    },
    {
      question: "What's on my watchlist?",
      sql: `SELECT title, medium, platform FROM media_entries WHERE status = 'Plan to Watch' ORDER BY created_at DESC LIMIT 20`,
      explanation: "List media marked as plan to watch",
    },
    {
      question: "How many hours did I spend watching TV this month?",
      sql: `SELECT SUM(CASE WHEN length LIKE '%h%' THEN CAST(SPLIT_PART(SPLIT_PART(length, 'h', 1), ' ', -1) AS INTEGER) * 60 + COALESCE(CAST(SPLIT_PART(SPLIT_PART(length, 'm', 1), ' ', -1) AS INTEGER), 0) WHEN length LIKE '%min%' THEN CAST(SPLIT_PART(length, ' min', 1) AS INTEGER) ELSE 0 END) / 60.0 as total_hours FROM media_entries WHERE medium = 'TV Show' AND EXTRACT(YEAR FROM start_date::date) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(MONTH FROM start_date::date) = EXTRACT(MONTH FROM CURRENT_DATE)`,
      explanation: "Parse length field and sum hours for TV shows this month",
    },
  ],
}

export const FOOD_SCHEMA: SchemaDefinition = {
  tableName: "food_entries",
  description: "Tracks restaurant visits, meals, and food experiences",
  columns: [
    {
      name: "id",
      type: "UUID",
      description: "Unique identifier",
    },
    {
      name: "name",
      type: "TEXT",
      description: "Restaurant or establishment name",
      example: "Blue Hill",
    },
    {
      name: "branch",
      type: "TEXT",
      description: "Branch or location identifier",
      example: "Manhattan",
    },
    {
      name: "visit_date",
      type: "DATE",
      description: "Date of visit",
      example: "2026-02-10",
    },
    {
      name: "category",
      type: "TEXT",
      description: "Restaurant category",
      example: "Restaurant, Cafe, Bar, Food Truck",
    },
    {
      name: "cuisine_type",
      type: "TEXT[]",
      description: "Array of cuisine types",
      example: '["Italian", "French"]',
    },
    {
      name: "dining_type",
      type: "TEXT",
      description: "Type of dining experience",
      example: "Fine Dining, Casual, Fast Food, Takeout",
    },
    {
      name: "overall_rating",
      type: "NUMERIC",
      description: "Overall experience rating (0-10)",
      example: "8.5",
    },
    {
      name: "food_rating",
      type: "NUMERIC",
      description: "Food quality rating (0-10)",
      example: "9.0",
    },
    {
      name: "ambiance_rating",
      type: "NUMERIC",
      description: "Ambiance rating (0-10)",
      example: "8.0",
    },
    {
      name: "service_rating",
      type: "NUMERIC",
      description: "Service quality rating (0-10)",
      example: "7.5",
    },
    {
      name: "value_rating",
      type: "NUMERIC",
      description: "Value for money rating (0-10)",
      example: "6.0",
    },
    {
      name: "total_price",
      type: "NUMERIC",
      description: "Total cost of the visit",
      example: "75.50",
    },
    {
      name: "currency",
      type: "TEXT",
      description: "Currency code",
      example: "USD, EUR, GBP",
    },
    {
      name: "price_level",
      type: "TEXT",
      description: "Price range indicator",
      example: "$, $$, $$$, $$$$",
    },
    {
      name: "favorite_item",
      type: "TEXT",
      description: "User's favorite dish from this visit",
      example: "Truffle Pasta",
    },
    {
      name: "would_return",
      type: "BOOLEAN",
      description: "Whether user would visit again",
      example: "true, false",
    },
    {
      name: "address",
      type: "TEXT",
      description: "Street address",
    },
    {
      name: "neighborhood",
      type: "TEXT",
      description: "Neighborhood name",
      example: "Greenwich Village",
    },
    {
      name: "city",
      type: "TEXT",
      description: "City name",
      example: "New York",
    },
    {
      name: "country",
      type: "TEXT",
      description: "Country name",
      example: "USA",
    },
    {
      name: "tags",
      type: "TEXT[]",
      description: "Custom tags",
      example: '["romantic", "outdoor seating"]',
    },
    {
      name: "notes",
      type: "TEXT",
      description: "Additional notes",
    },
    {
      name: "created_at",
      type: "TIMESTAMP",
      description: "Record creation timestamp",
    },
    {
      name: "updated_at",
      type: "TIMESTAMP",
      description: "Record last update timestamp",
    },
  ],
  exampleQueries: [
    {
      question: "How much did I spend on food in January?",
      sql: `SELECT SUM(total_price) as total_spent FROM food_entries WHERE EXTRACT(YEAR FROM visit_date::date) = 2026 AND EXTRACT(MONTH FROM visit_date::date) = 1 AND total_price IS NOT NULL`,
      explanation: "Sum all spending in January 2026",
    },
    {
      question: "Top 5 highest rated restaurants",
      sql: `SELECT name, overall_rating, total_price, visit_date FROM food_entries WHERE overall_rating IS NOT NULL ORDER BY overall_rating DESC, visit_date DESC LIMIT 5`,
      explanation: "Get top 5 restaurants by rating",
    },
    {
      question: "What cuisine do I eat most?",
      sql: `SELECT UNNEST(cuisine_type) as cuisine, COUNT(*) as count FROM food_entries WHERE cuisine_type IS NOT NULL GROUP BY cuisine ORDER BY count DESC`,
      explanation: "Count visits by cuisine type",
    },
    {
      question: "Average price per meal",
      sql: `SELECT ROUND(AVG(total_price)::numeric, 2) as avg_price FROM food_entries WHERE total_price IS NOT NULL`,
      explanation: "Calculate average meal cost",
    },
    {
      question: "Restaurants I would return to",
      sql: `SELECT name, branch, overall_rating, visit_date FROM food_entries WHERE would_return = true ORDER BY overall_rating DESC, visit_date DESC`,
      explanation: "List restaurants marked for return",
    },
    {
      question: "How much did I spend from Jan 26 to Feb 26?",
      sql: `SELECT SUM(total_price) as total_spent FROM food_entries WHERE visit_date >= '2026-01-26' AND visit_date <= '2026-02-26' AND total_price IS NOT NULL`,
      explanation: "Sum spending in date range",
    },
    {
      question: "Most expensive restaurants",
      sql: `SELECT name, total_price, visit_date FROM food_entries WHERE total_price IS NOT NULL ORDER BY total_price DESC LIMIT 10`,
      explanation: "List most expensive meals",
    },
    {
      question: "Average rating by cuisine",
      sql: `SELECT UNNEST(cuisine_type) as cuisine, ROUND(AVG(overall_rating)::numeric, 2) as avg_rating, COUNT(*) as count FROM food_entries WHERE overall_rating IS NOT NULL AND cuisine_type IS NOT NULL GROUP BY cuisine ORDER BY avg_rating DESC`,
      explanation: "Calculate average rating per cuisine type",
    },
    {
      question: "Where did I eat last month?",
      sql: `SELECT name, visit_date, overall_rating FROM food_entries WHERE visit_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND visit_date < DATE_TRUNC('month', CURRENT_DATE) ORDER BY visit_date DESC`,
      explanation: "List all restaurants visited last month",
    },
    {
      question: "Spending by month this year",
      sql: `SELECT TO_CHAR(visit_date, 'Month') as month, SUM(total_price) as total_spent FROM food_entries WHERE EXTRACT(YEAR FROM visit_date::date) = EXTRACT(YEAR FROM CURRENT_DATE) AND total_price IS NOT NULL GROUP BY TO_CHAR(visit_date, 'Month'), EXTRACT(MONTH FROM visit_date) ORDER BY EXTRACT(MONTH FROM visit_date)`,
      explanation: "Sum spending per month for current year",
    },
  ],
}

export function getSchemaForWorkspace(workspace: WorkspaceType): SchemaDefinition {
  return workspace === "media" ? MEDIA_SCHEMA : FOOD_SCHEMA
}

export function buildSystemPrompt(workspace: WorkspaceType): string {
  const schema = getSchemaForWorkspace(workspace)

  const columnsDescription = schema.columns
    .map(
      (col) =>
        `  - ${col.name} (${col.type}): ${col.description}${col.example ? ` | Example: ${col.example}` : ""}`
    )
    .join("\n")

  const examplesDescription = schema.exampleQueries
    .map(
      (ex, idx) =>
        `Example ${idx + 1}:
  Question: "${ex.question}"
  SQL: ${ex.sql}
  Explanation: ${ex.explanation}`
    )
    .join("\n\n")

  return `You are a SQL query generator for a ${workspace} tracking application. Your job is to convert natural language questions into valid PostgreSQL queries.

DATABASE SCHEMA:
Table: ${schema.tableName}
Description: ${schema.description}

Columns:
${columnsDescription}

RULES:
1. Only generate SELECT queries - no INSERT, UPDATE, DELETE, DROP, ALTER, CREATE
2. Always use proper date handling with PostgreSQL date functions
3. When filtering by date ranges, use BETWEEN or >= and <= operators
4. For array columns (genre, language, cuisine_type, tags), use UNNEST() to expand them in GROUP BY queries
5. Always handle NULL values appropriately with IS NULL or IS NOT NULL
6. Use ROUND() for numeric aggregations to 2 decimal places
7. Include appropriate ORDER BY clauses for better results
8. Limit results to reasonable amounts (e.g., LIMIT 20 for lists unless specifically asked for more)
9. Use EXTRACT(YEAR FROM date_column::date) for year filtering
10. Use EXTRACT(MONTH FROM date_column::date) for month filtering
11. For "last week", use CURRENT_DATE - INTERVAL '7 days'
12. For "this month", use EXTRACT(MONTH FROM date_column::date) = EXTRACT(MONTH FROM CURRENT_DATE)
13. When asked about spending or cost, always filter WHERE price/total_price IS NOT NULL
14. The current year is 2026

EXAMPLE QUERIES:
${examplesDescription}

OUTPUT FORMAT:
Return ONLY a JSON object with this exact structure:
{
  "sql": "the SQL query here",
  "explanation": "brief explanation of what the query does"
}

CRITICAL JSON REQUIREMENTS:
- Return ONLY valid JSON, no markdown code blocks
- All property names must be double-quoted
- All string values must be double-quoted and properly escaped
- Ensure all special characters in strings are properly escaped
- Return the complete JSON object starting with { and ending with }

IMPORTANT: Return ONLY the raw JSON object. No markdown formatting, no code blocks, no explanations before or after.`
}

export function buildActionPrompt(workspace: WorkspaceType): string {
  const schema = getSchemaForWorkspace(workspace)
  const tableName = schema.tableName

  return `You are an AI assistant that helps users manage their ${workspace} tracking data. You can understand natural language requests to add, update, or delete entries.

DATABASE SCHEMA:
Table: ${tableName}
${schema.description}

Available fields for ${workspace} entries:
${schema.columns
  .filter(col => !['id', 'created_at', 'updated_at', 'user_id'].includes(col.name))
  .map(col => `  - ${col.name} (${col.type}): ${col.description}${col.example ? ` | Example: ${col.example}` : ""}`)
  .join('\n')}

VALID STATUS VALUES: ${workspace === 'media' ? 'Finished, Watching, Currently Watching, On Hold, Dropped, Plan to Watch, Planned' : 'N/A'}
VALID MEDIUM VALUES: ${workspace === 'media' ? 'Movie, TV Show, Book, Game, Podcast, Live Theatre' : 'N/A'}
VALID PLATFORM VALUES: ${workspace === 'media' ? 'Netflix, Hulu, Disney+, Amazon Prime, HBO Max, Apple TV+, YouTube, Spotify, Audible, Steam, PlayStation, Xbox, Nintendo, Other' : 'N/A'}

YOUR TASK:
Analyze the user's request and determine what actions they want to perform. Return a JSON response with the intent and a list of actions.

ACTION TYPES:
1. CREATE - Add new entries to the database
2. UPDATE - Modify existing entries (requires matching by title)
3. DELETE - Remove entries (requires matching by title)

EXAMPLE REQUESTS AND RESPONSES:

Example 1: Adding to planned
Request: "Add these films to planned: Dune Part 3, The Batman 2, Avatar 3"
Response:
{
  "type": "action",
  "intent": "Add films to planned watchlist",
  "actions": [
    {"type": "create", "data": {"title": "Dune Part 3", "status": "Planned", "medium": "Movie"}},
    {"type": "create", "data": {"title": "The Batman 2", "status": "Planned", "medium": "Movie"}},
    {"type": "create", "data": {"title": "Avatar 3", "status": "Planned", "medium": "Movie"}}
  ]
}

Example 2: Updating status
Request: "Mark Inception as finished with 9/10 rating"
Response:
{
  "type": "action",
  "intent": "Update Inception to finished status with rating",
  "actions": [
    {"type": "update", "data": {"title": "Inception", "status": "Finished", "my_rating": 9}}
  ]
}

Example 3: Mixed operations
Request: "Add Tenet to planned, and mark Interstellar as finished"
Response:
{
  "type": "action",
  "intent": "Add new film and update existing film",
  "actions": [
    {"type": "create", "data": {"title": "Tenet", "status": "Planned", "medium": "Movie"}},
    {"type": "update", "data": {"title": "Interstellar", "status": "Finished"}}
  ]
}

Example 4: Delete
Request: "Delete The Room from my list"
Response:
{
  "type": "action",
  "intent": "Delete The Room entry",
  "actions": [
    {"type": "delete", "data": {"title": "The Room"}}
  ]
}

RULES FOR ACTIONS:
1. For CREATE actions:
   - Always include "title" (required)
   - Include "status" if mentioned or implied (e.g., "add to planned" = status "Planned")
   - Include "medium" if known or can be inferred (default to "Movie" for films)
   - Include other fields if mentioned (rating, genre, platform, etc.)

2. For UPDATE actions:
   - Always include "title" to identify the entry
   - Include only the fields that should be changed
   - Use exact status values: "Finished", "Watching", "Currently Watching", "On Hold", "Dropped", "Plan to Watch", "Planned"

3. For DELETE actions:
   - Only include "title" to identify what to delete

4. Rating values should be numbers 0-10 (not strings)
5. Dates should be in ISO format YYYY-MM-DD
6. Genre and language should be arrays of strings
7. For TV shows, include episodes info if mentioned

OUTPUT FORMAT:
Return ONLY a JSON object with this structure:
{
  "type": "action",
  "intent": "brief description of what the user wants",
  "actions": [
    {"type": "create|update|delete", "data": {...}}
  ]
}

CRITICAL:
- Return ONLY valid JSON
- No markdown code blocks, no explanations
- Ensure all strings are properly quoted
- Use exact field names from the schema
- Return the complete JSON starting with { and ending with }`
}

export function shouldUseActionMode(query: string): boolean {
  const actionKeywords = [
    'add', 'create', 'new',
    'update', 'change', 'modify', 'mark', 'set',
    'delete', 'remove',
    'to planned', 'to plan to watch', 'to watchlist',
    'as finished', 'as watching', 'as dropped', 'as on hold'
  ]
  
  const queryLower = query.toLowerCase()
  return actionKeywords.some(keyword => queryLower.includes(keyword))
}
