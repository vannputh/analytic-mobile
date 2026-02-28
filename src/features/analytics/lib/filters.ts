import type { FoodEntry, MediaEntry } from "@/src/shared/types/database"

export interface MediaFilterState {
  dateFrom: string
  dateTo: string
  genres: string[]
  mediums: string[]
  languages: string[]
  platforms: string[]
  statuses: string[]
  types: string[]
}

export interface FoodFilterState {
  dateFrom: string
  dateTo: string
  categories: string[]
  cuisineTypes: string[]
  itemCategories: string[]
  priceLevels: string[]
  diningTypes: string[]
  cities: string[]
  minRating: number | null
  wouldReturn: boolean | null
}

export const defaultMediaFilters: MediaFilterState = {
  dateFrom: "",
  dateTo: "",
  genres: [],
  mediums: [],
  languages: [],
  platforms: [],
  statuses: [],
  types: []
}

export const defaultFoodFilters: FoodFilterState = {
  dateFrom: "",
  dateTo: "",
  categories: [],
  cuisineTypes: [],
  itemCategories: [],
  priceLevels: [],
  diningTypes: [],
  cities: [],
  minRating: null,
  wouldReturn: null
}

export function normalizeLanguage(language: string[] | string | null): string[] {
  if (!language) return []
  if (Array.isArray(language)) return language.map((value) => value.trim()).filter(Boolean)
  return language
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
}

export function applyMediaFilters(entries: MediaEntry[], filters: MediaFilterState): MediaEntry[] {
  return entries.filter((entry) => {
    const finishDate = entry.finish_date || entry.start_date || ""

    if (filters.dateFrom && (!finishDate || finishDate < filters.dateFrom)) return false
    if (filters.dateTo && (!finishDate || finishDate > filters.dateTo)) return false
    if (filters.mediums.length > 0 && (!entry.medium || !filters.mediums.includes(entry.medium))) return false
    if (filters.platforms.length > 0 && (!entry.platform || !filters.platforms.includes(entry.platform))) return false
    if (filters.statuses.length > 0 && (!entry.status || !filters.statuses.includes(entry.status))) return false
    if (filters.types.length > 0 && (!entry.type || !filters.types.includes(entry.type))) return false

    if (filters.languages.length > 0) {
      const languages = normalizeLanguage(entry.language)
      if (!filters.languages.every((lang) => languages.includes(lang))) return false
    }

    if (filters.genres.length > 0) {
      const genres = (entry.genre ?? []).map((genre) => genre.toLowerCase().trim())
      if (!filters.genres.every((genre) => genres.includes(genre.toLowerCase().trim()))) return false
    }

    return true
  })
}

export function applyFoodFilters(entries: FoodEntry[], filters: FoodFilterState): FoodEntry[] {
  return entries.filter((entry) => {
    if (filters.dateFrom && entry.visit_date < filters.dateFrom) return false
    if (filters.dateTo && entry.visit_date > filters.dateTo) return false

    if (filters.itemCategories.length > 0) {
      const categories = (entry.items_ordered ?? []).flatMap((item) =>
        item.categories?.length ? item.categories : item.category ? [item.category] : []
      )
      if (!filters.itemCategories.some((category) => categories.includes(category))) return false
    }

    if (filters.cities.length > 0 && (!entry.city || !filters.cities.includes(entry.city))) return false
    if (filters.categories.length > 0 && (!entry.category || !filters.categories.includes(entry.category))) return false
    if (filters.priceLevels.length > 0 && (!entry.price_level || !filters.priceLevels.includes(entry.price_level))) return false
    if (filters.diningTypes.length > 0 && (!entry.dining_type || !filters.diningTypes.includes(entry.dining_type))) return false

    if (filters.cuisineTypes.length > 0) {
      const cuisines = entry.cuisine_type ?? []
      if (!filters.cuisineTypes.some((cuisine) => cuisines.includes(cuisine))) return false
    }

    if (filters.minRating !== null && (!entry.overall_rating || entry.overall_rating < filters.minRating)) return false
    if (filters.wouldReturn !== null && entry.would_return !== filters.wouldReturn) return false

    return true
  })
}

export function extractMediaFilterOptions(entries: MediaEntry[]) {
  const genres = new Set<string>()
  const mediums = new Set<string>()
  const languages = new Set<string>()
  const platforms = new Set<string>()
  const statuses = new Set<string>()
  const types = new Set<string>()

  for (const entry of entries) {
    if (entry.medium) mediums.add(entry.medium)
    if (entry.platform) platforms.add(entry.platform)
    if (entry.status) statuses.add(entry.status)
    if (entry.type) types.add(entry.type)
    for (const language of normalizeLanguage(entry.language)) languages.add(language)
    for (const genre of entry.genre ?? []) genres.add(genre)
  }

  return {
    genres: Array.from(genres).sort(),
    mediums: Array.from(mediums).sort(),
    languages: Array.from(languages).sort(),
    platforms: Array.from(platforms).sort(),
    statuses: Array.from(statuses).sort(),
    types: Array.from(types).sort()
  }
}

export function extractFoodFilterOptions(entries: FoodEntry[]) {
  const categories = new Set<string>()
  const cuisineTypes = new Set<string>()
  const itemCategories = new Set<string>()
  const priceLevels = new Set<string>()
  const diningTypes = new Set<string>()
  const cities = new Set<string>()

  for (const entry of entries) {
    if (entry.category) categories.add(entry.category)
    if (entry.price_level) priceLevels.add(entry.price_level)
    if (entry.dining_type) diningTypes.add(entry.dining_type)
    if (entry.city) cities.add(entry.city)

    for (const cuisine of entry.cuisine_type ?? []) cuisineTypes.add(cuisine)
    for (const item of entry.items_ordered ?? []) {
      for (const category of item.categories ?? (item.category ? [item.category] : [])) {
        itemCategories.add(category)
      }
    }
  }

  return {
    categories: Array.from(categories).sort(),
    cuisineTypes: Array.from(cuisineTypes).sort(),
    itemCategories: Array.from(itemCategories).sort(),
    priceLevels: Array.from(priceLevels).sort(),
    diningTypes: Array.from(diningTypes).sort(),
    cities: Array.from(cities).sort()
  }
}
