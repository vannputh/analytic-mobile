export type WorkspaceType = "media" | "food"
export type UserProfileStatus = "pending" | "approved" | "rejected"
export type CheckUserStatus = UserProfileStatus | "unknown"
export type MetadataSource = "tmdb" | "omdb"
export type AdminUsersStatusFilter = "all" | UserProfileStatus

export interface ApiErrorResponse {
  success?: false
  error: string
}

export interface CheckUserRequest {
  email: string
}

export interface CheckUserResponse {
  exists: boolean
  approved?: boolean
  status?: CheckUserStatus
}

export interface MetadataLookupRequest {
  title?: string
  imdb_id?: string
  type?: "movie" | "series" | "episode"
  medium?: string
  year?: string
  season?: string
  source?: MetadataSource
}

export interface MetadataResponse {
  title: string | null
  poster_url: string | null
  genre: string[] | string | null
  language: string[] | string | null
  average_rating: number | null
  length: string | null
  type: string | null
  episodes: number | null
  season: string | null
  year: string | null
  plot: string | null
  imdb_id: string | null
  content_type?: string | null
  price?: number | null
}

export interface MetadataSearchRequest {
  q: string
}

export interface MetadataSearchItem {
  id: string
  title: string
  year: string | null
  poster_url: string | null
  media_type: "movie" | "tv"
  imdb_id?: string
}

export interface MetadataSearchResponse {
  results: MetadataSearchItem[]
  error?: string
}

export interface MapsPlaceDetailsRequest {
  url: string
}

export interface MapsPlaceDetailsResponse {
  name: string
  address: string
  website: string
  priceLevel: string | null
  neighborhood: string | null
  city: string | null
  country: string | null
  googleMapsUrl: string
  photos: string[] | null
}

export interface CleanedMediaEntry {
  title: string
  medium: string | null
  type: string | null
  season: string | null
  episodes: number | null
  length: string | null
  price: number | null
  status: string | null
  my_rating: number | null
  average_rating: number | null
  platform: string | null
  language: string | string[] | null
  start_date: string | null
  finish_date: string | null
  genre: string[] | string | null
  poster_url: string | null
  imdb_id: string | null
}

export interface CleanDataRequest {
  csvData: string
}

export interface CleanDataResponse {
  success: boolean
  data: CleanedMediaEntry[]
  errors: string[]
  rawCount: number
  error?: string
}

export interface UploadResponse {
  success: boolean
  url: string
  path: string
  fileName: string
  size: number
  type: string
  error?: string
}

export interface AdminApproveRequest {
  userId: string
}

export interface AdminRejectRequest {
  userId: string
  reason?: string
}

export interface UserProfileSummary {
  id: string
  user_id: string
  email: string
  status: UserProfileStatus
  is_admin: boolean
  requested_at: string
  approved_at: string | null
  approved_by?: string | null
  rejection_reason: string | null
  created_at?: string
  updated_at?: string
}

export interface AdminCountsSummary {
  total: number
  pending: number
  approved: number
  rejected: number
  admin: number
}

export interface AdminRequestsResponse {
  success: boolean
  data: UserProfileSummary[]
  error?: string
}

export interface AdminUsersResponse {
  success: boolean
  data: UserProfileSummary[]
  status: AdminUsersStatusFilter
  query: string
  counts: AdminCountsSummary
  error?: string
}

export interface AdminStatsResponse {
  success: boolean
  data: AdminCountsSummary
  error?: string
}

export interface AdminMutationResponse {
  success: boolean
  error?: string
}

export interface MediaActionData {
  title?: string
  medium?: string
  type?: string
  status?: string
  genre?: string[]
  platform?: string
  my_rating?: number
  start_date?: string
  finish_date?: string
  language?: string[]
  episodes?: number
  episodes_watched?: number
  price?: number
  poster_url?: string
  imdb_id?: string
  average_rating?: number
  year?: string
  plot?: string
  season?: string
  length?: string
}

export interface MediaAction {
  type: "create" | "update" | "delete"
  id?: string
  data?: MediaActionData
}

export interface ActionValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface MatchedMediaEntrySummary {
  id: string
  title: string
  status: string | null
}

export interface ValidatedMediaAction {
  action: MediaAction
  matchedEntry?: MatchedMediaEntrySummary | null
  validation: ActionValidationResult
}

export interface AIQueryRequest {
  query: string
  workspace: WorkspaceType
}

export interface AIQueryMetadata {
  visualizationType: "kpi" | "table" | "bar" | "pie" | "line" | "area"
  columnCount: number
  rowCount: number
  columns: string[]
  columnTypes: Record<string, string>
}

export interface AIQueryResponse {
  success: boolean
  type?: "query" | "action"
  sql?: string
  explanation?: string
  data?: Record<string, unknown>[]
  metadata?: AIQueryMetadata
  intent?: string
  actions?: MediaAction[]
  error?: string
}

export interface ExecuteActionsRequest {
  actions: MediaAction[]
}

export interface ExecuteActionResult {
  success: boolean
  action: MediaAction
  error?: string
  entryId?: string
}

export interface ExecuteActionsResponse {
  success: boolean
  results: ExecuteActionResult[]
  summary: {
    total: number
    succeeded: number
    failed: number
  }
  error?: string
}
