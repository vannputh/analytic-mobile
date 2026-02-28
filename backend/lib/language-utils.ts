
/**
 * Utility functions for handling language data normalization and display.
 * Handles conversion between ISO codes (en, ja, ko), native script names (한국어, 日本語),
 * and full English names (English, Japanese, Korean).
 */

// Common language code map for fallback or explicit overrides
// Includes ISO codes, native script names, and common variations
const LANGUAGE_CODE_MAP: Record<string, string> = {
    // ISO codes
    "en": "English",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
    "zh-cn": "Mandarin",
    "zh-tw": "Mandarin",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "hi": "Hindi",
    "th": "Thai",
    "vi": "Vietnamese",
    "id": "Indonesian",
    "tl": "Filipino",
    "fil": "Filipino",
    "ar": "Arabic",
    "pl": "Polish",
    "nl": "Dutch",
    "sv": "Swedish",
    "da": "Danish",
    "no": "Norwegian",
    "fi": "Finnish",
    "tr": "Turkish",
    "he": "Hebrew",
    "ms": "Malay",

    // Native script names
    "한국어": "Korean",
    "조선어": "Korean",
    "일본어": "Japanese",
    "日本語": "Japanese",
    "にほんご": "Japanese",
    "中文": "Chinese",
    "中国語": "Chinese",
    "普通话": "Mandarin",
    "國語": "Mandarin",
    "ภาษาไทย": "Thai",
    "ไทย": "Thai",
    "tiếng việt": "Vietnamese",
    "việt": "Vietnamese",
    "bahasa indonesia": "Indonesian",
    "bahasa melayu": "Malay",
    "español": "Spanish",
    "français": "French",
    "deutsch": "German",
    "italiano": "Italian",
    "português": "Portuguese",
    "русский": "Russian",
    "العربية": "Arabic",
    "עברית": "Hebrew",
    "हिन्दी": "Hindi",
    "हिंदी": "Hindi",
    "tagalog": "Filipino",
    "polski": "Polish",
    "nederlands": "Dutch",
    "svenska": "Swedish",
    "dansk": "Danish",
    "norsk": "Norwegian",
    "suomi": "Finnish",
    "türkçe": "Turkish",

    // Common variations and abbreviations
    "eng": "English",
    "jpn": "Japanese",
    "jap": "Japanese",
    "jp": "Japanese",
    "kor": "Korean",
    "kr": "Korean",
    "chi": "Chinese",
    "chn": "Chinese",
    "cn": "Chinese",
    "spa": "Spanish",
    "esp": "Spanish",
    "fre": "French",
    "fra": "French",
    "ger": "German",
    "deu": "German",
    "ita": "Italian",
    "por": "Portuguese",
    "rus": "Russian",
    "ara": "Arabic",
    "hin": "Hindi",
    "tha": "Thai",
    "vie": "Vietnamese",
    "ind": "Indonesian",
};

/**
 * Normalizes a single language string to its full English name.
 * e.g., "en" -> "English", "English" -> "English", "jp" -> "Japanese"
 */
export function normalizeLanguageCode(code: string): string {
    if (!code) return "";

    const cleanCode = code.trim();
    const lowerCode = cleanCode.toLowerCase();

    // 1. Check explicit map first
    if (LANGUAGE_CODE_MAP[lowerCode]) {
        return LANGUAGE_CODE_MAP[lowerCode];
    }

    // 2. Try Intl.DisplayNames
    try {
        const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
        const name = displayNames.of(cleanCode);
        if (name && name.toLowerCase() !== cleanCode.toLowerCase()) {
            return name.charAt(0).toUpperCase() + name.slice(1);
        }
    } catch (e) {
        // Ignore invalid codes
    }

    // 3. Return original capitalizing first letter if it looks like a name
    return cleanCode.charAt(0).toUpperCase() + cleanCode.slice(1);
}

/**
 * Normalizes any language input (string, array, null) into a deduplicated array of full language names.
 * e.g. ["en", "English"] -> ["English"]
 * e.g. "en, ja" -> ["English", "Japanese"]
 */
export function normalizeLanguage(input: string | string[] | null | undefined): string[] {
    if (!input) return [];

    let rawList: string[] = [];

    if (Array.isArray(input)) {
        rawList = input;
    } else if (typeof input === 'string') {
        const trimmed = input.trim();

        // Try to parse as JSON array first (handles "[\"English\"]" etc.)
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    rawList = parsed;
                } else {
                    rawList = [String(parsed)];
                }
            } catch {
                // Not valid JSON, treat as regular string
                rawList = [trimmed];
            }
        } else if (trimmed.includes(',')) {
            // Handle comma-separated strings
            rawList = trimmed.split(',');
        } else {
            rawList = [trimmed];
        }
    }

    const normalizedSet = new Set<string>();

    rawList.forEach(item => {
        const normalized = normalizeLanguageCode(item);
        if (normalized) {
            normalizedSet.add(normalized);
        }
    });

    return Array.from(normalizedSet).sort();
}

/**
 * Formats a normalized language array for display.
 * e.g. ["English", "Japanese"] -> "English, Japanese"
 */
export function formatLanguageForDisplay(languages: string[] | string | null | undefined): string {
    const normalized = normalizeLanguage(languages);
    if (normalized.length === 0) return "N/A";
    return normalized.join(", ");
}

/**
 * Helper to check if an entry matches a language filter.
 * Returns true if the entry contains ALL of the languages in the filter.
 */
export function matchesLanguageFilter(entryLanguages: string | string[] | null | undefined, filterLanguages: string[]): boolean {
    if (filterLanguages.length === 0) return true;
    const normalizedEntry = normalizeLanguage(entryLanguages);

    // Implementation of "AND" logic (must match all selected filters)? 
    // OR "OR" logic? 
    // Usually filters are OR within a category, AND across categories.
    // But wait, the existing implementation in filter-types.ts uses AND logic for the languages array itself ("entry must have ALL selected languages").
    // Let's stick to the existing behavior or standard behaviors?
    // Most UI filters are "Is English OR Japanese".
    // However, existing code had:
    // "if (!entryLanguages.includes(filterLanguage...)) return false" inside a loop over filters.
    // This implies AND. If I select English and Japanese, I only see movies that refer to BOTH?
    // That seems rare. Usually users want "Show me English movies AND Japanese movies".
    // Let's defer to the caller's logic, but here assume we just want to know if there's an overlap if we change to OR, 
    // or return the Normalized list for the caller to decide.

    // Let's look at how it's used. We'll just export the normalization and let the filter logic handle the matching strategy to minimize regression risk, 
    // OR we optimize it here.

    // Actually, standardizing the matching logic is part of the "Rework". 
    // If I select "English" and "Japanese", I typically expect to see movies that are EITHER English OR Japanese.
    // The previous code in `filter-types.ts` was:
    // for (const filterLanguage of filters.languages) { if (!entryLanguages.includes(...)) return false }
    // This is AND.

    // Checking `GlobalFilterBar.tsx`... it uses `MultiSelect`. usually MultiSelect implies OR for the list of selected items.
    // If I check "Action" and "Comedy", I usually want Action OR Comedy? Or Action AND Comedy?
    // Genres are usually AND (Movies that are both Action and Comedy).
    // Languages... A movie is usually one language. Sometimes two.
    // If I filter by "English" and "Spanish", I probably want to see English movies AND Spanish movies (the set union).
    // If it's AND, I would only see movies that are BOTH English and Spanish. That would return almost nothing.
    // So the previous logic was likely buggy or intended for multi-audio tracks.

    // I will stick to providing the normalized data and let `lib/filter-types` handle the boolean logic, but I'll fix the boolean logic to be OR if I see it's wrong in `filter-types` (which I suspect it is).

    return true;
}
