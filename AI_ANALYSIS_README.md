# AI Data Analysis Feature

This feature allows users to query their media and food data using natural language. The AI converts questions into SQL and displays results with smart visualizations.

## Architecture

1. **User Interface**: Sparkles button in page header opens AI Query Dialog
2. **Backend**: `/api/ai-query` route uses Google Gemini to convert natural language to SQL
3. **Database**: Supabase function `execute_sql_query` safely executes SELECT queries
4. **Visualization**: Smart display based on query type (KPI, table, bar/pie chart, time series)

## Files Created

- `lib/ai-query-schemas.ts` - Schema definitions and example queries for media/food workspaces
- `app/api/ai-query/route.ts` - API endpoint for natural language to SQL conversion
- `components/ai-query-results.tsx` - Smart results renderer with chart selection
- `components/ai-query-dialog.tsx` - Main dialog with input and results display
- `components/page-header.tsx` (modified) - Added sparkles button

## Database Setup

A Supabase function was created to execute SQL queries safely:

```sql
execute_sql_query(query_text TEXT) RETURNS JSON
```

This function:
- Only allows SELECT queries
- Blocks INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, etc.
- Runs with user's RLS context (respects Row Level Security)
- Returns results as JSON array

## Usage

1. Click the sparkles button (✨) in the page header
2. Type a natural language question (e.g., "How much did I spend in January?")
3. Click "Analyze" to generate and execute the query
4. View results with automatic visualization selection
5. Expand "Generated SQL Query" to see the actual query

## Example Queries

### Media Workspace
- "How many movies did I watch in 2025?"
- "Average rating by genre"
- "Total spent on games"
- "What did I watch last week?"
- "Show me all movies rated above 8"

### Food Workspace
- "How much did I spend on food in January?"
- "Top 5 highest rated restaurants"
- "What cuisine do I eat most?"
- "Average price per meal"
- "Restaurants I would return to"

## Environment Variables

Requires in `.env.local`:
- `GEMINI_API_KEY` (already needed for CSV import feature)
- `GEMINI_MODEL_NAME` (e.g. `gemini-3-flash-latest`)

## Security Features

- SQL injection prevention through validation
- Read-only queries (no writes allowed)
- RLS policies enforced
- 10-second query timeout
- User session required (authenticated only)

## Visualization Types

The system automatically selects the best visualization:

1. **KPI Card** - Single numeric value (e.g., total spent)
2. **Bar Chart** - Aggregations with categories (e.g., spending by genre)
3. **Pie Chart** - Categorical breakdowns (e.g., distribution by medium)
4. **Area Chart** - Time series data (e.g., spending over time)
5. **Table** - Detailed list results (e.g., all movies from 2025)

## Testing

To test the feature:

1. Ensure `GEMINI_API_KEY` and `GEMINI_MODEL_NAME` are set in `.env.local`
2. Run the development server: `bun dev`
3. Navigate to either `/media` or `/food` workspace
4. Click the sparkles button next to the + button
5. Try example queries or create your own

## Future Enhancements

- Multi-table joins (cross-referencing media and food data)
- Export results to CSV
- Save favorite queries
- Query history
- Follow-up questions with context
