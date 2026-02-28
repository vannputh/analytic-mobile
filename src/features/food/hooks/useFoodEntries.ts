import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/src/shared/api/supabase"
import type { FoodEntry, FoodEntryImage } from "@/src/shared/types/database"

function toDateKey(value: string): string {
  return value.slice(0, 10)
}

function mapEntriesWithPrimaryImage(rows: Array<Record<string, unknown>>): FoodEntry[] {
  return rows.map((row) => {
    const foodEntryImages = Array.isArray(row.food_entry_images)
      ? (row.food_entry_images as Array<{ image_url?: unknown; is_primary?: unknown }>)
      : []

    const primary = foodEntryImages.find((img) => img?.is_primary === true) ?? foodEntryImages[0]

    const base = row as unknown as FoodEntry
    const next = { ...base, primary_image_url: typeof primary?.image_url === "string" ? primary.image_url : null }
    return next
  })
}

function buildMonthGroup(entries: FoodEntry[], year: number, month: number): Record<string, FoodEntry[]> {
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`
  const nextMonthDate = month === 12 ? new Date(year + 1, 0, 1) : new Date(year, month, 1)
  const monthEndExclusive = nextMonthDate.toISOString().slice(0, 10)

  const grouped: Record<string, FoodEntry[]> = {}
  for (const entry of entries) {
    const visitDate = entry.visit_date
    if (!visitDate || visitDate < monthStart || visitDate >= monthEndExclusive) continue
    const key = toDateKey(visitDate)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(entry)
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  return grouped
}

export function useFoodEntries() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["food-entries"],
    queryFn: async (): Promise<FoodEntry[]> => {
      const { data, error } = await supabase
        .from("food_entries")
        .select("*, food_entry_images(image_url, is_primary)")
        .order("visit_date", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) throw error
      return mapEntriesWithPrimaryImage((data ?? []) as Array<Record<string, unknown>>)
    }
  })

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<FoodEntry> & { name: string }) => {
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData.user?.id
      if (!userId) throw new Error("Not authenticated")

      const { data, error } = await supabase
        .from("food_entries")
        .insert({ ...payload, user_id: userId } as FoodEntry)
        .select("*")
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["food-entries"] })
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<FoodEntry> }) => {
      const { data, error } = await supabase
        .from("food_entries")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["food-entries"] })
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("food_entries").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["food-entries"] })
  })

  const addImageMutation = useMutation({
    mutationFn: async (payload: Omit<FoodEntryImage, "id" | "created_at" | "user_id">) => {
      if (payload.is_primary) {
        const { error: unsetError } = await supabase
          .from("food_entry_images")
          .update({ is_primary: false })
          .eq("food_entry_id", payload.food_entry_id)

        if (unsetError) throw unsetError
      }

      const { data, error } = await supabase
        .from("food_entry_images")
        .insert(payload)
        .select("*")
        .single()

      if (error) throw error
      return data as FoodEntryImage
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["food-entries"] })
  })

  const setPrimaryImageMutation = useMutation({
    mutationFn: async ({ imageId, foodEntryId }: { imageId: string; foodEntryId: string }) => {
      const { error: unsetError } = await supabase
        .from("food_entry_images")
        .update({ is_primary: false })
        .eq("food_entry_id", foodEntryId)

      if (unsetError) throw unsetError

      const { error: setError } = await supabase
        .from("food_entry_images")
        .update({ is_primary: true })
        .eq("id", imageId)

      if (setError) throw setError
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["food-entries"] })
  })

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase
        .from("food_entry_images")
        .delete()
        .eq("id", imageId)

      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["food-entries"] })
  })

  const entryImagesQuery = useMutation({
    mutationFn: async (foodEntryId: string): Promise<FoodEntryImage[]> => {
      const { data, error } = await supabase
        .from("food_entry_images")
        .select("*")
        .eq("food_entry_id", foodEntryId)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true })

      if (error) throw error
      return (data ?? []) as FoodEntryImage[]
    }
  })

  const groupedByMonthQuery = useMutation({
    mutationFn: async ({ year, month }: { year: number; month: number }) => {
      const entries = query.data ?? []
      return buildMonthGroup(entries, year, month)
    }
  })

  return {
    ...query,
    createEntry: createMutation.mutateAsync,
    updateEntry: updateMutation.mutateAsync,
    deleteEntry: deleteMutation.mutateAsync,
    addEntryImage: addImageMutation.mutateAsync,
    setPrimaryEntryImage: setPrimaryImageMutation.mutateAsync,
    deleteEntryImage: deleteImageMutation.mutateAsync,
    getEntryImages: entryImagesQuery.mutateAsync,
    getEntriesByMonth: groupedByMonthQuery.mutateAsync,
    updating: updateMutation.isPending,
    addingImage: addImageMutation.isPending,
    settingPrimaryImage: setPrimaryImageMutation.isPending,
    deletingImage: deleteImageMutation.isPending
  }
}
