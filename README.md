# Media Review

A comprehensive media tracking and analytics application built with Next.js, React, and Supabase. Track movies, TV shows, books, games, podcasts, and live theatre performances with detailed analytics, filtering, and metadata integration.

## Features

### 📊 Media Tracking
- **Multiple Media Types**: Track Movies, TV Shows, Books, Games, Podcasts, and Live Theatre
- **Rich Metadata**: Store title, genre, language, ratings, dates, prices, platforms, and more
- **Status Management**: Track status (Finished, Watching, On Hold, Dropped, Plan to Watch) with history
- **Custom Ratings**: Personal ratings alongside average ratings from external sources
- **Date Tracking**: Start and finish dates for each entry
- **Poster Images**: Automatic poster/image fetching and display

### 📈 Analytics Dashboard
- **KPI Metrics**: Total items, time spent, pages read, money spent, average ratings
- **Visual Charts**: 
  - Spending trends by month and medium
  - Time consumption (minutes/hours) by month
  - Reading volume (pages) by month
  - Rating distributions
  - Counts by medium, language, genre, platform, status, and type
- **Global Filtering**: Filter analytics across all metrics simultaneously
- **Time-based Analysis**: Monthly breakdowns for all metrics

### 🔍 Advanced Filtering & Search
- **Multi-criteria Filtering**: Filter by type, status, medium, platform, language, genre, and date ranges
- **Full-text Search**: Search across titles and other fields
- **URL-based Filters**: Shareable filtered views via URL parameters
- **Column Customization**: Show/hide table columns with persistent preferences
- **Sorting**: Multi-column sorting with direction control

### 📝 Entry Management
- **Manual Entry**: Comprehensive form for adding new entries
- **CSV Import**: Bulk import entries from CSV files with field mapping
- **Batch Editing**: Edit multiple entries simultaneously
- **Entry Editing**: Inline editing with dialog forms
- **Entry Deletion**: Safe deletion with confirmation
- **Status History**: Track status changes over time

### 🔗 Metadata Integration
- **OMDB Integration**: Fetch movie and TV show metadata automatically
- **MyDramaList Support**: Integration for Asian drama content
- **Smart Override**: Choose which fields to override when fetching metadata
- **Poster Fetching**: Automatic poster image retrieval

### 🎨 User Experience
- **Dark/Light Mode**: Theme toggle with system preference detection
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Toast Notifications**: User-friendly feedback for all actions
- **Loading States**: Clear loading indicators during operations
- **Error Handling**: Graceful error handling with user-friendly messages

## Tech Stack

- **Framework**: Next.js 16.1.1 (App Router)
- **UI Library**: React 19.2.3
- **Language**: TypeScript 5.7.2
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS 3.4.17
- **UI Components**: Radix UI primitives
- **Forms**: React Hook Form with Zod validation
- **Tables**: TanStack Table (React Table)
- **Charts**: Recharts
- **Date Handling**: date-fns
- **Icons**: Lucide React
- **State Management**: React hooks and URL state (nuqs)
- **AI Integration**: Google Generative AI

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A Supabase account and project
- (Optional) OMDB API key for metadata fetching

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd media-review
```

2. Install dependencies:
```bash
bun install
```

### Minimal install (smaller `node_modules`)

If you only need to run the built application or specific scripts and don't require the full linting and tooling setup, you can install only production dependencies:

```bash
bun install --production
```

This keeps `node_modules` smaller (in this project, roughly **450 MB** with production deps only vs **~515 MB** with full dev tooling, exact numbers will vary by platform and versions). To restore the full developer experience, run `bun install` again.

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OMDB_API_KEY=your_omdb_api_key (optional)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key (optional)
```

**Note:** The `SUPABASE_SERVICE_ROLE_KEY` is required for the user authentication check. You can find it in your Supabase project settings under "API" → "Service Role Key" (keep this secret and never expose it to the client).

4. Set up the database:
   - Create a Supabase project
   - Run the database migrations to create the `media_entries` and `media_status_history` tables
   - Ensure Row Level Security (RLS) policies are configured for your use case

5. Run the development server:
```bash
bun run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
media-review/
├── app/                    # Next.js app router pages
│   ├── add/               # Add/edit entry page
│   ├── analytics/         # Analytics dashboard
│   ├── entries/           # Entries list view
│   ├── import/            # CSV import page
│   ├── library/           # Library view
│   ├── list/              # List view
│   ├── login/             # Authentication
│   └── api/               # API routes
│       ├── auth/          # Authentication endpoints
│       ├── metadata/      # Metadata fetching
│       ├── omdb/          # OMDB integration
│       └── upload/        # File upload
├── components/              # React components
│   ├── analytics/         # Analytics-specific components
│   ├── ui/                # Reusable UI components
│   ├── data-table.tsx     # Data table component
│   ├── filters.tsx        # Filter components
│   ├── media-card-grid.tsx # Card grid view
│   └── media-table.tsx    # Table view component
├── hooks/                 # Custom React hooks
│   └── useMediaMetrics.ts # Media metrics calculations
├── lib/                   # Utility functions and types
│   ├── actions.ts         # Server actions
│   ├── database.types.ts  # Database type definitions
│   ├── filter-types.ts    # Filter logic
│   ├── parsing-utils.ts   # Data parsing utilities
│   ├── supabase/          # Supabase client setup
│   └── types.ts           # Type definitions
└── types/                 # TypeScript type definitions
```

## Usage

### Adding Entries

1. Navigate to the **Add** page
2. Enter the title and select the medium type
3. Optionally fetch metadata from OMDB or other sources
4. Fill in additional details (genre, language, dates, ratings, etc.)
5. Save the entry

### Importing from CSV

1. Navigate to the **Import** page
2. Upload a CSV file
3. Map CSV columns to database fields
4. Preview and adjust the data
5. Import the entries

### Viewing Analytics

1. Navigate to the **Analytics** page
2. Use the global filter bar to filter data
3. View KPIs and charts
4. Explore trends and distributions

### Managing Entries

- **List View**: View all entries in a sortable, filterable table
- **Library View**: Browse entries in a card grid layout
- **Edit**: Click the edit button on any entry
- **Batch Edit**: Select multiple entries and edit them together
- **Delete**: Remove entries with confirmation

## Database Schema

### media_entries
- `id` (uuid, primary key)
- `title` (text, required)
- `medium` (text): Movie, TV Show, Book, Game, Podcast, Live Theatre
- `type` (text): Documentary, Variety, Reality, Scripted Live Action, Animation, Special, Audio
- `status` (text): Finished, In Progress, On Hold, Dropped, Plan to Watch
- `genre` (text array)
- `language` (text array)
- `platform` (text)
- `start_date` (date)
- `finish_date` (date)
- `my_rating` (numeric)
- `average_rating` (numeric)
- `rating` (numeric)
- `price` (numeric)
- `length` (text)
- `episodes` (integer)
- `poster_url` (text)
- `imdb_id` (text)
- `season` (text)
- `time_taken` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### media_status_history
- `id` (uuid, primary key)
- `media_entry_id` (uuid, foreign key)
- `old_status` (text)
- `new_status` (text)
- `changed_at` (timestamp)
- `notes` (text)
- `created_at` (timestamp)

## Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run lint` - Run ESLint

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

See [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
- Database powered by [Supabase](https://supabase.com/)
- Metadata from [OMDB API](https://www.omdbapi.com/)
