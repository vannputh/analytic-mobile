# Media Review

A comprehensive media tracking and analytics application built with Next.js, React, and Supabase. Track movies, TV shows, podcasts, and live theatre performances with detailed analytics, filtering, and metadata integration. Also includes a food & drinks tracking workspace with restaurant reviews and dining analytics.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
  - [System Architecture](#system-architecture)
  - [Application Architecture](#application-architecture)
  - [Data Flow](#data-flow)
  - [Authentication & Authorization](#authentication--authorization)
  - [State Management](#state-management)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Routes](#api-routes)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
- [Development](#development)
- [Performance Optimizations](#performance-optimizations)
- [Security Considerations](#security-considerations)
- [Deployment](#deployment)
- [Scripts](#scripts)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Overview

Media Review is a full-stack web application that allows users to track and analyze their media consumption and dining experiences. The application is built with a modern tech stack focusing on performance, user experience, and scalability.

### Key Capabilities

- **Media Tracking**: Track movies, TV shows, books, games, podcasts, and live theatre
- **Food & Drinks Tracking**: Track restaurant visits, meals, and dining experiences
- **Analytics Dashboard**: Comprehensive analytics with charts, KPIs, and trends
- **AI-Powered Queries**: Natural language queries using Google Gemini AI
- **Metadata Integration**: Automatic metadata fetching from OMDB and other sources
- **Batch Operations**: Bulk import, batch editing, and batch metadata fetching
- **User Management**: Admin panel for user approval and management

## Features

### 📊 Media Tracking

- **Multiple Media Types**: Track Movies, TV Shows, Books, Games, Podcasts, and Live Theatre
- **Rich Metadata**: Store title, genre, language, ratings, dates, prices, platforms, and more
- **Status Management**: Track status (Finished, Watching, On Hold, Dropped, Plan to Watch) with history
- **Episode Tracking**: Track individual episodes watched with timestamps
- **Custom Ratings**: Personal ratings alongside average ratings from external sources
- **Date Tracking**: Start and finish dates for each entry
- **Poster Images**: Automatic poster/image fetching and display
- **IMDB Integration**: Link entries to IMDB for additional metadata

### 🍽️ Food & Drinks Tracking

- **Restaurant Tracking**: Track restaurant visits with location, cuisine, and ratings
- **Meal Details**: Record items ordered, prices, and dining dates
- **Photo Gallery**: Upload and manage photos of meals and restaurants
- **Calendar View**: Visual calendar view of dining history
- **Return Visits**: Track which restaurants you'd return to
- **Cuisine Analytics**: Analyze dining patterns by cuisine type

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
- **Workspace-specific Analytics**: Separate analytics for media and food workspaces

### 🤖 AI-Powered Features

- **Natural Language Queries**: Ask questions in plain English (e.g., "How many movies did I watch in 2025?")
- **Smart SQL Generation**: AI converts questions to SQL queries automatically
- **Intelligent Visualizations**: Automatic chart selection based on query results
- **Action Mode**: AI can execute actions like updating entries or batch operations
- **Safe Execution**: SQL queries are validated and executed safely with RLS context

### 🔍 Advanced Filtering & Search

- **Multi-criteria Filtering**: Filter by type, status, medium, platform, language, genre, and date ranges
- **Full-text Search**: Search across titles and other fields
- **URL-based Filters**: Shareable filtered views via URL parameters
- **Column Customization**: Show/hide table columns with persistent preferences
- **Sorting**: Multi-column sorting with direction control
- **Persistent Filters**: Filters persist across page reloads

### 📝 Entry Management

- **Manual Entry**: Comprehensive form for adding new entries
- **CSV Import**: Bulk import entries from CSV files with field mapping
- **Batch Editing**: Edit multiple entries simultaneously
- **Entry Editing**: Inline editing with dialog forms
- **Entry Deletion**: Safe deletion with confirmation
- **Status History**: Track status changes over time with timeline view
- **Metadata Override**: Selective field override when fetching metadata

### 🎨 User Experience

- **Dark/Light Mode**: Theme toggle with system preference detection
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Toast Notifications**: User-friendly feedback for all actions
- **Loading States**: Clear loading indicators during operations
- **Error Handling**: Graceful error handling with user-friendly messages
- **Skeleton Screens**: Loading placeholders for better perceived performance
- **Image Optimization**: Automatic image optimization and lazy loading

### 👥 User Management

- **Authentication**: Email/password authentication via Supabase Auth
- **User Approval System**: Admin-controlled user approval workflow
- **Admin Panel**: Manage users, approve/reject requests, and view system stats
- **Profile Management**: User profiles with preferences and settings
- **Row Level Security**: Data isolation between users via RLS policies

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   React UI   │  │  Next.js App │  │   TanStack   │    │
│  │  Components  │  │     Router    │  │    Table     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└───────────────────────┬───────────────────────────────────┘
                        │ HTTPS
                        │
┌───────────────────────▼───────────────────────────────────┐
│                    Next.js Server                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   API Routes │  │   Middleware │  │ Server       │    │
│  │              │  │   (Auth)     │  │ Actions      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└───────────────────────┬───────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
│   Supabase   │ │   OMDB API  │ │  Gemini AI│
│  PostgreSQL  │ │             │ │           │
│  + Storage   │ │             │ │           │
└──────────────┘ └─────────────┘ └───────────┘
```

### Application Architecture

The application follows a **layered architecture** with clear separation of concerns:

#### 1. **Presentation Layer** (`app/`, `components/`)
- **Pages**: Next.js App Router pages (`app/*/page.tsx`)
- **Components**: Reusable React components organized by feature
- **UI Components**: Base UI components from Radix UI primitives
- **Client Components**: Interactive components marked with `"use client"`

#### 2. **Business Logic Layer** (`lib/`, `hooks/`)
- **Server Actions**: Server-side data mutations (`lib/actions.ts`)
- **Custom Hooks**: React hooks for data fetching and state management
- **Utilities**: Helper functions for parsing, filtering, and formatting
- **Type Definitions**: TypeScript types and interfaces

#### 3. **Data Access Layer** (`lib/supabase/`)
- **Supabase Clients**: Browser and server-side Supabase clients
- **Database Types**: Auto-generated TypeScript types from database schema
- **Query Builders**: Reusable query patterns

#### 4. **API Layer** (`app/api/`)
- **REST Endpoints**: API routes for external integrations
- **Authentication**: Auth callback handlers
- **File Upload**: Image upload handling
- **Metadata Fetching**: External API integrations

### Data Flow

#### Reading Data

```
User Action → React Component → Custom Hook → Supabase Client → PostgreSQL
                                                                    │
                                                                    ▼
User Interface ← React State ← Hook State ← Query Result ← Database Response
```

**Example: Loading Media Entries**
1. User navigates to `/media`
2. `MediaPage` component mounts
3. `useMediaEntries` hook fetches data via Supabase client
4. Data flows back through hook state to component
5. Component renders with data

#### Writing Data

```
User Action → Form Component → Server Action → Supabase Client → PostgreSQL
                                                                    │
                                                                    ▼
Toast Notification ← Optimistic Update ← Success Response ← Database Update
```

**Example: Creating an Entry**
1. User fills form and clicks "Save"
2. Form calls `createEntry` server action
3. Server action validates data and inserts into database
4. Success response triggers UI update and toast notification
5. Component refetches data to show new entry

#### Authentication Flow

```
Login Request → Middleware → Supabase Auth → User Profile Check → Session Cookie
                                                                    │
                                                                    ▼
Redirect to App ← Approval Check ← Profile Status ← Database Query
```

### Authentication & Authorization

#### Authentication Flow

1. **User Login**:
   - User enters email on login page
   - System checks if user exists via `/api/auth/check-user`
   - If exists, Supabase Auth sends magic link
   - User clicks link, redirected to `/auth/callback`

2. **Callback Processing**:
   - Middleware validates session
   - Checks user profile status (`pending`, `approved`, `rejected`)
   - Only approved users can access the app
   - Session cookie is set

3. **Session Management**:
   - Middleware validates session on every request
   - Unauthenticated users redirected to `/login`
   - Session refreshed automatically by Supabase

#### Authorization Model

- **Row Level Security (RLS)**: All database tables have RLS policies
- **User Isolation**: Users can only access their own data
- **Admin Routes**: Protected by middleware checking `is_admin` flag
- **Approval System**: Users must be approved before accessing the app

#### Security Features

- **Service Role Key**: Used server-side only, never exposed to client
- **RLS Policies**: Database-level security ensuring data isolation
- **SQL Injection Prevention**: Parameterized queries via Supabase
- **XSS Protection**: React's built-in escaping, sanitized inputs
- **CSRF Protection**: SameSite cookies, secure session handling

### State Management

The application uses a **hybrid state management approach**:

#### 1. **Server State** (Supabase)
- Fetched via custom hooks (`useMediaEntries`, `useFoodMetrics`)
- Cached in React Query-like pattern (manual implementation)
- Refetched on mutations or manual refresh

#### 2. **Client State** (React State)
- Form state: Managed by React Hook Form
- UI state: Modal open/close, filters, selections
- URL state: Filters and search params via `nuqs` (URL query state)

#### 3. **Persistent State**
- **LocalStorage**: Theme preference, column preferences
- **URL Params**: Filters and search queries (shareable)
- **Database**: User preferences stored in `user_preferences` table

#### 4. **State Flow Pattern**

```typescript
// Example: Filter state
URL Params → useMediaFilters hook → Filtered Data → Component Render
     ↑                                              │
     └──────────────────────────────────────────────┘
              (User updates filters)
```

## Tech Stack

### Core Framework

- **Next.js 16.1.1**: React framework with App Router
  - Server Components for better performance
  - Server Actions for mutations
  - Built-in API routes
  - Image optimization
  - Automatic code splitting

- **React 19.2.3**: UI library
  - Server Components
  - Client Components for interactivity
  - Concurrent features

- **TypeScript 5.7.2**: Type safety and developer experience

### Database & Backend

- **Supabase**: Backend-as-a-Service
  - **PostgreSQL**: Relational database
  - **Supabase Auth**: Authentication service
  - **Supabase Storage**: File storage for images
  - **Row Level Security**: Database-level access control
  - **Real-time Subscriptions**: (Available but not currently used)

### UI & Styling

- **Tailwind CSS 3.4.17**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
  - Dialog, Dropdown, Select, Popover, Tabs, etc.
- **Lucide React**: Icon library
- **Sonner**: Toast notification library
- **class-variance-authority**: Component variant management
- **tailwind-merge**: Tailwind class merging utility

### Forms & Validation

- **React Hook Form**: Form state management
- **Zod**: Schema validation (used in some forms)

### Data Display

- **TanStack Table (React Table) 8.21.3**: Powerful table component
  - Sorting, filtering, column visibility
  - Virtual scrolling support
- **Recharts 3.6.0**: Charting library
  - Bar charts, pie charts, area charts, line charts

### Data Processing

- **date-fns 4.1.0**: Date manipulation and formatting
- **PapaParse 5.4.1**: CSV parsing for imports

### AI Integration

- **Google Generative AI (@google/generative-ai)**: 
  - Natural language to SQL conversion
  - AI-powered actions and queries

### Image Processing

- **next/image**: Optimized image component
- **react-easy-crop**: Image cropping functionality
- **heic-to**: HEIC image format conversion

### Other Libraries

- **nuqs**: URL query state management (for shareable filters)
- **cmdk**: Command palette component
- **embla-carousel-react**: Carousel component

### Development Tools

- **ESLint**: Code linting
- **TypeScript**: Type checking
- **PostCSS**: CSS processing
- **Turbopack**: Fast bundler (Next.js default)

## Getting Started

### Prerequisites

- **Node.js 18+** or **Bun** (recommended)
- A **Supabase account** and project
- (Optional) **OMDB API key** for metadata fetching
- (Optional) **Google Gemini API key** for AI features

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd media-review
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

   **Minimal install** (production dependencies only):
   ```bash
   bun install --production
   ```
   This keeps `node_modules` smaller (~450 MB vs ~515 MB with dev tools).

3. **Set up environment variables**:
   
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase Configuration (Required)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # External APIs (Optional)
   OMDB_API_KEY=your_omdb_api_key
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL_NAME=gemini-1.5-pro
   
   # Google Maps (Optional, for food workspace)
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
   ```

   **Important**: 
   - The `SUPABASE_SERVICE_ROLE_KEY` is required for user authentication checks
   - Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
   - Find it in Supabase project settings under "API" → "Service Role Key"

4. **Set up the database**:
   
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Run database migrations to create tables:
     - `media_entries`
     - `media_status_history`
     - `food_entries`
     - `user_profiles`
     - `user_preferences`
   - Enable Row Level Security (RLS) on all tables
   - Create RLS policies for user data isolation
   - Set up the `execute_sql_query` function for AI queries

5. **Run the development server**:
   ```bash
   bun run dev
   ```

6. **Open the application**:
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser

## Configuration

### Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Public Supabase project URL used by the browser client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anonymous public key for the Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-side key for privileged Supabase calls (never expose in browser) |
| `OMDB_API_KEY` | ❌ | Enables metadata lookup for movies and TV shows via OMDB |
| `GOOGLE_GENERATIVE_AI_API_KEY` | ❌ | Legacy Google AI key (deprecated, use GEMINI_API_KEY) |
| `GEMINI_API_KEY` | ❌ | Google Gemini API key for AI-powered queries |
| `GEMINI_MODEL_NAME` | ❌ | Gemini model name (default: `gemini-1.5-pro`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | ❌ | Google Maps API key for restaurant location features |

### Supabase Setup

#### Database Tables

1. **media_entries**: Main table for media tracking
2. **media_status_history**: History of status changes
3. **food_entries**: Restaurant and meal tracking
4. **user_profiles**: User approval and admin status
5. **user_preferences**: User-specific preferences

#### Row Level Security (RLS)

Enable RLS on all tables and create policies:

```sql
-- Example: Media entries RLS policy
CREATE POLICY "Users can only see their own entries"
ON media_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own entries"
ON media_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own entries"
ON media_entries FOR UPDATE
USING (auth.uid() = user_id);
```

#### Database Functions

Create the `execute_sql_query` function for AI queries:

```sql
CREATE OR REPLACE FUNCTION execute_sql_query(query_text TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow SELECT queries
  IF NOT (query_text ~* '^\s*SELECT') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;
  
  -- Block dangerous keywords
  IF query_text ~* '(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)' THEN
    RAISE EXCEPTION 'Query contains forbidden keywords';
  END IF;
  
  -- Execute query and return JSON
  RETURN (SELECT json_agg(row_to_json(t)) FROM (
    EXECUTE query_text
  ) t);
END;
$$;
```

### Next.js Configuration

Key configurations in `next.config.ts`:

- **Turbopack**: Enabled for faster development
- **Image Optimization**: Remote patterns configured for Supabase and TMDB
- **Package Optimization**: Tree-shaking for large libraries
- **Server Actions**: Body size limit set to 10MB for file uploads
- **Redirects**: Legacy route redirects (`/movies` → `/media`)

## Project Structure

```
media-review/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth-related routes
│   │   ├── login/                # Login page
│   │   └── auth/                  # Auth callbacks
│   │       └── callback/          # OAuth callback handler
│   ├── admin/                     # Admin panel
│   │   ├── page.tsx               # Admin dashboard
│   │   ├── users/                 # User management
│   │   └── requests/              # Approval requests
│   ├── api/                       # API routes
│   │   ├── auth/                  # Authentication endpoints
│   │   │   └── check-user/        # User existence check
│   │   ├── metadata/              # Metadata fetching
│   │   │   └── search/             # Metadata search
│   │   ├── omdb/                  # OMDB integration
│   │   ├── upload/                 # File upload handler
│   │   ├── ai-query/               # AI query endpoint
│   │   ├── execute-actions/        # AI action execution
│   │   ├── clean-data/             # Data cleaning utilities
│   │   └── maps/                   # Google Maps integration
│   ├── food/                      # Food workspace
│   │   ├── page.tsx               # Food entries list
│   │   ├── analytics/             # Food analytics
│   │   └── layout.tsx              # Food workspace layout
│   ├── media/                     # Media workspace
│   │   ├── page.tsx               # Media entries list
│   │   ├── analytics/             # Media analytics
│   │   └── add/                   # Add/edit entry
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Landing page
│   └── globals.css                # Global styles
├── components/                     # React components
│   ├── admin/                     # Admin components
│   │   ├── AdminLayout.tsx
│   │   ├── UsersTable.tsx
│   │   └── RequestsTable.tsx
│   ├── analytics/                 # Analytics components
│   │   ├── AnalyticsCharts.tsx
│   │   ├── GlobalFilterBar.tsx
│   │   ├── KPIGrid.tsx
│   │   ├── FoodAnalyticsCharts.tsx
│   │   └── GenericAnalyticsDashboard.tsx
│   ├── auth/                      # Auth components
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── OtpForm.tsx
│   ├── charts/                    # Chart components
│   │   ├── SimpleBarChart.tsx
│   │   ├── SimplePieChart.tsx
│   │   └── AreaChartBase.tsx
│   ├── filter-components/         # Filter UI components
│   │   ├── MultiSelect.tsx
│   │   └── DateRangePicker.tsx
│   ├── form-inputs/               # Form input components
│   │   ├── RatingInput.tsx
│   │   ├── StarRatingInput.tsx
│   │   ├── MultiSelectInput.tsx
│   │   └── PlaceImageUpload.tsx
│   ├── import/                    # CSV import components
│   │   ├── ImportFileUpload.tsx
│   │   ├── ImportPreviewTable.tsx
│   │   └── ImportFormatGuide.tsx
│   ├── landing/                   # Landing page components
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── media/                     # Media-specific components
│   │   ├── forms/                 # Form sections
│   │   ├── WatchingSection.tsx
│   │   └── WatchedDiaryTable.tsx
│   ├── shared/                    # Shared components
│   │   ├── EntityTable.tsx
│   │   ├── BatchEditDialog.tsx
│   │   └── StatusHistoryTimeline.tsx
│   ├── ui/                        # Base UI components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── ... (other Radix UI wrappers)
│   ├── ai-query-dialog.tsx        # AI query interface
│   ├── ai-query-results.tsx       # AI results display
│   ├── authenticated-layout.tsx   # Main app layout
│   ├── food-add-dialog.tsx        # Food entry dialog
│   ├── media-details-dialog.tsx    # Media entry dialog
│   ├── media-table.tsx            # Media table component
│   ├── page-header.tsx            # Page header with actions
│   └── theme-provider.tsx         # Theme context provider
├── hooks/                         # Custom React hooks
│   ├── useMediaEntries.ts         # Media entries data fetching
│   ├── useMediaMetrics.ts         # Media analytics calculations
│   ├── useMediaFilters.ts         # Filter state management
│   ├── useFoodMetrics.ts          # Food analytics calculations
│   ├── useColumnPreferences.ts    # Column visibility preferences
│   ├── useFileUpload.ts           # File upload handling
│   └── useBatchMetadataFetch.ts  # Batch metadata fetching
├── lib/                           # Utility functions and types
│   ├── actions.ts                 # Server actions
│   ├── admin-actions.ts           # Admin server actions
│   ├── database.types.ts          # Database type definitions
│   ├── filter-types.ts            # Filter logic and types
│   ├── parsing-utils.ts           # Data parsing utilities
│   ├── types.ts                   # Type definitions and constants
│   ├── ai-query-schemas.ts        # AI query schemas
│   └── supabase/                  # Supabase client setup
│       ├── client.ts              # Browser client
│       └── server.ts              # Server client
├── middleware.ts                  # Next.js middleware (auth)
├── next.config.ts                 # Next.js configuration
├── tailwind.config.ts             # Tailwind CSS configuration
├── postcss.config.mjs             # PostCSS configuration
├── eslint.config.mjs              # ESLint configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Dependencies and scripts
└── README.md                      # This file
```

## Database Schema

### media_entries

Main table for media tracking entries.

| Column | Type | Description |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `user_id` | uuid | Foreign key to auth.users |
| `title` | text | Entry title (required) |
| `medium` | text | Movie, TV Show, Book, Game, Podcast, Live Theatre |
| `type` | text | Documentary, Variety, Reality, Scripted Live Action, Animation, Special, Audio |
| `status` | text | Finished, Watching, On Hold, Dropped, Plan to Watch |
| `genre` | text[] | Array of genres |
| `language` | text[] | Array of languages |
| `platform` | text | Streaming platform or source |
| `start_date` | date | When user started consuming |
| `finish_date` | date | When user finished |
| `my_rating` | numeric | User's personal rating |
| `average_rating` | numeric | Average rating from external source |
| `rating` | numeric | General rating field |
| `price` | numeric | Cost of the media |
| `length` | text | Duration or length |
| `episodes` | integer | Total episodes (for TV shows) |
| `episodes_watched` | integer | Episodes watched |
| `episode_history` | jsonb | Array of episode watch records |
| `last_watched_at` | timestamp | Last episode watch time |
| `poster_url` | text | URL to poster image |
| `imdb_id` | text | IMDB identifier |
| `season` | text | Season information |
| `time_taken` | text | Time taken to complete |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

### media_status_history

Tracks status changes over time.

| Column | Type | Description |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `media_entry_id` | uuid | Foreign key to media_entries |
| `user_id` | uuid | Foreign key to auth.users |
| `old_status` | text | Previous status |
| `new_status` | text | New status |
| `changed_at` | timestamp | When status changed |
| `notes` | text | Optional notes about the change |
| `created_at` | timestamp | Creation timestamp |

### food_entries

Restaurant and meal tracking.

| Column | Type | Description |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `user_id` | uuid | Foreign key to auth.users |
| `restaurant_name` | text | Restaurant name |
| `cuisine` | text[] | Array of cuisine types |
| `location` | text | Restaurant location |
| `date` | date | Visit date |
| `rating` | numeric | User rating |
| `price` | numeric | Total cost |
| `items_ordered` | text[] | Array of items ordered |
| `would_return` | boolean | Would visit again |
| `notes` | text | Additional notes |
| `images` | text[] | Array of image URLs |
| `place_id` | text | Google Places ID |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

### user_profiles

User approval and admin status.

| Column | Type | Description |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `user_id` | uuid | Foreign key to auth.users (unique) |
| `email` | text | User email |
| `status` | text | pending, approved, rejected |
| `is_admin` | boolean | Admin flag |
| `requested_at` | timestamp | When user requested access |
| `approved_at` | timestamp | When approved |
| `approved_by` | uuid | Admin who approved |
| `rejection_reason` | text | Reason for rejection |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

### user_preferences

User-specific preferences.

| Column | Type | Description |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `user_id` | uuid | Foreign key to auth.users |
| `preference_key` | text | Preference name |
| `preference_value` | jsonb | Preference value (JSON) |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

### Database Functions

#### execute_sql_query(query_text TEXT)

Safely executes SELECT queries for AI features.

- Only allows SELECT queries
- Blocks INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, etc.
- Runs with user's RLS context
- Returns results as JSON array

#### is_admin()

Checks if current user is an admin.

- Returns boolean
- Uses RLS context

## API Routes

### `/api/auth/check-user`

**Method**: POST  
**Purpose**: Check if user exists and their approval status

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "exists": true,
  "approved": true,
  "isAdmin": false
}
```

### `/api/metadata`

**Method**: GET  
**Purpose**: Fetch metadata for media entries

**Query Parameters**:
- `title`: Media title
- `medium`: Media type (Movie, TV Show, etc.)
- `year`: Release year (optional)

**Response**: Metadata object with title, poster, ratings, etc.

### `/api/metadata/search`

**Method**: GET  
**Purpose**: Search for media by title

**Query Parameters**:
- `query`: Search query
- `medium`: Media type filter

**Response**: Array of search results

### `/api/omdb`

**Method**: GET  
**Purpose**: Direct OMDB API integration

**Query Parameters**: Standard OMDB API parameters

### `/api/upload`

**Method**: POST  
**Purpose**: Upload images to Supabase Storage

**Request**: FormData with image file

**Response**: Object with image URL

### `/api/ai-query`

**Method**: POST  
**Purpose**: Convert natural language to SQL and execute

**Request Body**:
```json
{
  "query": "How many movies did I watch in 2025?",
  "workspace": "media"
}
```

**Response**: Query results with visualization suggestions

### `/api/execute-actions`

**Method**: POST  
**Purpose**: Execute AI-generated actions

**Request Body**:
```json
{
  "actions": [...],
  "workspace": "media"
}
```

**Response**: Execution results

### `/api/clean-data`

**Method**: POST  
**Purpose**: Clean and normalize data

**Request Body**: Data to clean

**Response**: Cleaned data

### `/api/maps/place-details`

**Method**: GET  
**Purpose**: Get Google Places details

**Query Parameters**:
- `place_id`: Google Places ID

**Response**: Place details object

## Core Concepts

### Entries and Status History

Each media entry represents a single item (book, movie, etc.). Status changes are stored in a separate history table (`media_status_history`) so you can visualize progress and trends over time. When an entry's status is updated:

1. The main `media_entries` record is updated
2. A new row is inserted into `media_status_history`
3. The UI updates to reflect the change
4. Analytics recalculate automatically

### Analytics Pipeline

The analytics dashboard uses a **client-side aggregation** approach:

1. **Data Fetching**: Raw entries fetched from Supabase
2. **Filtering**: Global filters applied to base dataset
3. **Aggregation**: Metrics calculated in `useMediaMetrics` hook:
   - **Counts**: Items by medium, status, platform, language, genre, type
   - **Totals**: Time spent, pages read, money spent
   - **Averages**: Ratings by medium and overall
   - **Trends**: Monthly breakdowns for charts
4. **Visualization**: Charts rendered using Recharts

Global filters affect the base dataset before aggregation, ensuring all KPIs and charts stay synchronized.

### Metadata Enrichment

Metadata fetch flows allow pulling external data and selectively applying it:

1. **Fetch**: User triggers metadata fetch (OMDB, MyDramaList, etc.)
2. **Retrieve**: External API called with title/year
3. **Override Dialog**: User selects which fields to override
4. **Apply**: Selected fields merged into entry form
5. **Save**: Entry saved with enriched data

The "Smart Override" flow ensures you can keep your own values while still using fetched posters, plot summaries, or runtime details.

### Workspace System

The application supports multiple **workspaces**:

- **Media Workspace** (`/media`): Movies, TV shows, books, games, etc.
- **Food Workspace** (`/food`): Restaurant visits and dining experiences

Each workspace has:
- Separate data tables
- Independent analytics
- Workspace-specific components
- Shared UI patterns

### Episode Tracking

For TV shows, the application tracks individual episodes:

- **Episode History**: JSON array of `{ episode: number, watched_at: timestamp }`
- **Progress Tracking**: `episodes_watched` count
- **Last Watched**: `last_watched_at` timestamp
- **Visual Timeline**: Episode watch history displayed in timeline

## Usage

### Adding Media Entries

1. Navigate to the **Media** workspace (`/media`)
2. Click the **"+"** button in the header
3. Enter the title and select the medium type
4. Optionally click **"Fetch Metadata"** to pull data from OMDB
5. Review fetched data and select fields to override
6. Fill in additional details (genre, language, dates, ratings, etc.)
7. Click **"Save"** to create the entry

### Importing from CSV

1. Navigate to the **Media** workspace
2. Click **"Import"** in the header
3. Upload a CSV file or paste CSV data
4. Map CSV columns to database fields
5. Preview the data and adjust mappings if needed
6. Click **"Import Entries"** to bulk import

**CSV Format Tips**:
- Include at least `title`, `medium`, and `status` columns
- Dates should be in `YYYY-MM-DD` format
- Arrays (genres, languages) can be comma-separated
- Ratings should be numeric values

### Viewing Analytics

1. Navigate to **Analytics** (`/media/analytics` or `/food/analytics`)
2. Use the **Global Filter Bar** to filter data:
   - Select mediums, statuses, platforms, etc.
   - Set date ranges
   - Apply multiple filters simultaneously
3. View **KPI Cards** at the top:
   - Total items, time spent, money spent, average ratings
4. Explore **Charts**:
   - Spending trends over time
   - Time consumption by month
   - Rating distributions
   - Counts by various dimensions

### Using AI Queries

1. Click the **✨ (Sparkles)** button in the page header
2. Type a natural language question:
   - "How many movies did I watch in 2025?"
   - "Average rating by genre"
   - "Total spent on games"
3. Click **"Analyze"** to generate and execute the query
4. View results with automatic visualization
5. Expand **"Generated SQL Query"** to see the actual SQL

### Managing Entries

#### List View
- **Sort**: Click column headers to sort
- **Filter**: Use filter bar or column filters
- **Search**: Use search box for full-text search
- **Columns**: Click column selector to show/hide columns

#### Edit Entry
1. Click the **edit** button on any entry
2. Modify fields in the dialog
3. Click **"Save"** to update

#### Batch Edit
1. Select multiple entries using checkboxes
2. Click **"Batch Edit"** button
3. Modify common fields
4. Click **"Save"** to update all selected entries

#### Delete Entry
1. Click the **delete** button on an entry
2. Confirm deletion in the dialog
3. Entry is permanently removed

### Episode Tracking (TV Shows)

1. Open a TV show entry
2. Navigate to the **"Watching"** tab
3. Click **"Mark Episode Watched"**
4. Select episode number and date
5. Episode is added to watch history
6. View timeline of watched episodes

### Food Tracking

1. Navigate to **Food** workspace (`/food`)
2. Click **"+"** to add a restaurant visit
3. Enter restaurant name and location
4. Select cuisine types
5. Add items ordered and price
6. Upload photos (optional)
7. Set rating and "Would Return" flag
8. Save the entry

### Admin Functions

1. Navigate to **Admin** panel (`/admin`)
2. View **User Requests** tab:
   - See pending approval requests
   - Approve or reject users
   - Add rejection reasons
3. View **Users** tab:
   - See all users
   - Grant/revoke admin status
   - View user activity

## Development

### Development Workflow

1. **Start Development Server**:
   ```bash
   bun run dev
   ```

2. **Make Changes**:
   - Edit files in `app/`, `components/`, `lib/`, or `hooks/`
   - Changes hot-reload automatically

3. **Test Changes**:
   - Navigate to affected pages
   - Test functionality
   - Check browser console for errors

4. **Build for Production**:
   ```bash
   bun run build
   ```

5. **Run Production Build**:
   ```bash
   bun run start
   ```

### Code Organization

#### Component Structure

```typescript
// Component file structure
"use client" // If using hooks or interactivity

import { useState } from "react"
import { ComponentProps } from "./types"

interface ComponentProps {
  // Props interface
}

export function Component({ prop }: ComponentProps) {
  // Component logic
  return (
    // JSX
  )
}
```

#### Server Actions

```typescript
// lib/actions.ts
"use server"

import { createServerClient } from "@/lib/supabase/server"

export async function createEntry(data: CreateEntryInput) {
  const supabase = await createServerClient()
  // Server-side logic
  return { success: true, data }
}
```

#### Custom Hooks

```typescript
// hooks/useMediaEntries.ts
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export function useMediaEntries() {
  const [entries, setEntries] = useState([])
  // Hook logic
  return { entries, loading, error }
}
```

### TypeScript Best Practices

- **Use Database Types**: Import types from `lib/database.types.ts`
- **Define Interfaces**: Create interfaces for component props
- **Type Server Actions**: Use `ActionResponse<T>` for server action returns
- **Avoid `any`**: Use `unknown` and type guards instead

### Styling Guidelines

- **Tailwind First**: Use Tailwind utility classes
- **Component Variants**: Use `class-variance-authority` for component variants
- **Dark Mode**: Use `dark:` prefix for dark mode styles
- **Responsive**: Use responsive prefixes (`sm:`, `md:`, `lg:`)

### Testing Considerations

While the project doesn't currently include automated tests, consider:

- **Unit Tests**: Test utility functions and hooks
- **Integration Tests**: Test API routes and server actions
- **E2E Tests**: Test critical user flows
- **Component Tests**: Test UI components in isolation

## Performance Optimizations

### Code Splitting

- **Dynamic Imports**: Heavy components loaded on demand
  ```typescript
  const Dialog = dynamic(() => import("@/components/dialog"))
  ```
- **Route-based Splitting**: Next.js automatically splits by route
- **Library Optimization**: Configured in `next.config.ts` for tree-shaking

### Image Optimization

- **next/image**: Automatic image optimization
- **Lazy Loading**: Images load as they enter viewport
- **Format Conversion**: AVIF and WebP formats supported
- **Sizing**: Responsive image sizes configured

### Data Fetching

- **Server Components**: Fetch data on server when possible
- **Client-side Caching**: Manual cache in hooks
- **Optimistic Updates**: Update UI before server confirmation
- **Debouncing**: Search and filter inputs debounced

### Bundle Size

- **Tree Shaking**: Unused code eliminated
- **Package Optimization**: Large libraries optimized in config
- **Code Splitting**: Routes and components split automatically
- **Minification**: Production builds minified

### Database Queries

- **Selective Fields**: Only fetch needed columns
- **Indexing**: Database indexes on frequently queried fields
- **Pagination**: Consider pagination for large datasets
- **RLS Efficiency**: RLS policies optimized for performance

## Security Considerations

### Authentication Security

- **Service Role Key**: Never exposed to client
- **Session Management**: Secure cookie handling
- **Magic Links**: Passwordless authentication via Supabase
- **Session Refresh**: Automatic token refresh

### Data Security

- **Row Level Security**: Database-level access control
- **User Isolation**: Users can only access their own data
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Prevention**: Parameterized queries only

### API Security

- **Rate Limiting**: Consider rate limiting for API routes
- **CORS**: Configured via Next.js headers
- **Input Sanitization**: Sanitize user inputs
- **Error Messages**: Don't expose sensitive info in errors

### File Upload Security

- **File Type Validation**: Only allow image types
- **Size Limits**: 10MB limit configured
- **Storage Isolation**: Files stored per user
- **Virus Scanning**: Consider adding virus scanning

### Environment Variables

- **Never Commit**: `.env.local` in `.gitignore`
- **Public Prefix**: Only `NEXT_PUBLIC_*` vars exposed to client
- **Secret Management**: Use secure secret management in production

## Deployment

### Build Process

1. **Install Dependencies**:
   ```bash
   bun install --production
   ```

2. **Build Application**:
   ```bash
   bun run build
   ```

3. **Start Production Server**:
   ```bash
   bun run start
   ```

### Environment Setup

Set environment variables in your hosting platform:

- **Vercel**: Use Environment Variables in project settings
- **Netlify**: Use Site settings → Environment variables
- **Other Platforms**: Follow platform-specific instructions

### Database Migration

1. **Create Migration Files**: SQL files for schema changes
2. **Run Migrations**: Execute in Supabase SQL editor
3. **Test Migrations**: Test in development first
4. **Backup**: Always backup before migrations

### Supabase Configuration

1. **Enable RLS**: Ensure RLS is enabled on all tables
2. **Set Policies**: Configure RLS policies for production
3. **Storage Buckets**: Create storage buckets for file uploads
4. **API Keys**: Rotate keys periodically

### Monitoring

Consider setting up:

- **Error Tracking**: Sentry, LogRocket, etc.
- **Analytics**: Vercel Analytics, Google Analytics
- **Performance Monitoring**: Web Vitals tracking
- **Database Monitoring**: Supabase dashboard metrics

## Scripts

- `bun run dev` - Start development server (with hot reload)
- `bun run build` - Build production bundle
- `bun run start` - Start production server
- `bun run lint` - Run ESLint

## Troubleshooting

### Common Issues

#### Blank Analytics or Missing Data

**Symptoms**: Analytics page shows no data or incorrect metrics

**Solutions**:
1. Check RLS policies allow reads for authenticated user
2. Verify entries table is populated
3. Check browser console for errors
4. Verify filters aren't excluding all data
5. Check `useMediaMetrics` hook calculations

#### Metadata Fetch Errors

**Symptoms**: "Failed to fetch metadata" errors

**Solutions**:
1. Verify `OMDB_API_KEY` is set in `.env.local`
2. Check OMDB API key is valid
3. Check rate limits (OMDB has daily limits)
4. Verify network connectivity
5. Check API endpoint URLs

#### Upload Issues

**Symptoms**: Image uploads fail or don't appear

**Solutions**:
1. Verify Supabase storage bucket exists
2. Check storage bucket permissions
3. Verify file size is under 10MB
4. Check file type is allowed (jpg, png, webp, etc.)
5. Check Supabase storage policies

#### Auth Errors

**Symptoms**: Login fails or users can't access app

**Solutions**:
1. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
2. Check user profile exists in `user_profiles` table
3. Verify user status is `approved`
4. Check middleware is running correctly
5. Verify Supabase Auth is configured

#### Build Errors

**Symptoms**: `bun run build` fails

**Solutions**:
1. Check TypeScript errors: `bunx tsc --noEmit`
2. Verify all environment variables are set
3. Check for missing dependencies
4. Clear `.next` folder and rebuild
5. Check Node.js/Bun version compatibility

#### Performance Issues

**Symptoms**: Slow page loads or laggy interactions

**Solutions**:
1. Check bundle size in build output
2. Verify images are optimized
3. Check database query performance
4. Enable React DevTools Profiler
5. Check network tab for slow requests

### Debugging Tips

1. **Browser Console**: Check for JavaScript errors
2. **Network Tab**: Inspect API requests and responses
3. **React DevTools**: Inspect component state and props
4. **Supabase Logs**: Check Supabase dashboard for database errors
5. **Next.js Logs**: Check server logs for server-side errors

### Getting Help

1. **Check Documentation**: Review this README and code comments
2. **Search Issues**: Check GitHub issues for similar problems
3. **Supabase Docs**: Consult [Supabase documentation](https://supabase.com/docs)
4. **Next.js Docs**: Consult [Next.js documentation](https://nextjs.org/docs)

## Contributing

Contributions are welcome! Please follow these guidelines:

### Development Setup

1. Fork the repository
2. Clone your fork
3. Create a feature branch: `git checkout -b feature/amazing-feature`
4. Make your changes
5. Test thoroughly
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Style

- Follow existing code style
- Use TypeScript for type safety
- Add comments for complex logic
- Keep components focused and small
- Use meaningful variable names

### Commit Messages

- Use clear, descriptive messages
- Reference issues when applicable
- Follow conventional commits format

### Pull Request Process

1. Ensure code builds without errors
2. Test all affected functionality
3. Update documentation if needed
4. Request review from maintainers
5. Address feedback promptly

## License

See [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
- Database powered by [Supabase](https://supabase.com/)
- Metadata from [OMDB API](https://www.omdbapi.com/)
- AI powered by [Google Gemini](https://ai.google.dev/)
- Icons from [Lucide](https://lucide.dev/)
- Charts from [Recharts](https://recharts.org/)

---

**Last Updated**: February 2026
