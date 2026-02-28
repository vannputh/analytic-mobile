import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/src/shared/api/supabase"
import type { MediaEntry, MediaStatusHistory } from "@/src/shared/types/database"

export function useMediaEntries() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["media-entries"],
    queryFn: async (): Promise<MediaEntry[]> => {
      const { data, error } = await supabase
        .from("media_entries")
        .select("*")
        .neq("medium", "Book")
        .order("created_at", { ascending: false })

      if (error) throw error
      return data ?? []
    }
  })

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<MediaEntry> & { title: string }) => {
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData.user?.id
      if (!userId) throw new Error("Not authenticated")

      const { data, error } = await supabase
        .from("media_entries")
        .insert({ ...payload, user_id: userId } as MediaEntry)
        .select("*")
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-entries"] })
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<MediaEntry> }) => {
      let previousStatus: string | null = null
      if (typeof payload.status === "string") {
        const { data: existing, error: existingError } = await supabase
          .from("media_entries")
          .select("status")
          .eq("id", id)
          .single()

        if (!existingError) {
          previousStatus = (existing?.status as string | null) ?? null
        }
      }

      const { data, error } = await supabase
        .from("media_entries")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single()

      if (error) throw error

      if (typeof payload.status === "string" && payload.status !== previousStatus) {
        const { data: authData } = await supabase.auth.getUser()
        const userId = authData.user?.id

        if (userId) {
          await supabase.from("media_status_history").insert({
            media_entry_id: id,
            old_status: previousStatus,
            new_status: payload.status,
            user_id: userId
          })
        }
      }

      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-entries"] })
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("media_entries").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-entries"] })
  })

  const statusHistoryQuery = useMutation({
    mutationFn: async (mediaEntryId: string): Promise<MediaStatusHistory[]> => {
      const { data, error } = await supabase
        .from("media_status_history")
        .select("*")
        .eq("media_entry_id", mediaEntryId)
        .order("changed_at", { ascending: false })
        .limit(100)

      if (error) throw error
      return (data ?? []) as MediaStatusHistory[]
    }
  })

  return {
    ...query,
    createEntry: createMutation.mutateAsync,
    updateEntry: updateMutation.mutateAsync,
    deleteEntry: deleteMutation.mutateAsync,
    getStatusHistory: statusHistoryQuery.mutateAsync,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending
  }
}
