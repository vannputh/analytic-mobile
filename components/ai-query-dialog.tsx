"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AIQueryResults } from "@/components/ai-query-results"
import { AIActionConfirmationDialog } from "@/components/ai-action-confirmation-dialog"
import { WorkspaceType } from "@/lib/ai-query-schemas"
import { validateActions, ValidatedAction } from "@/lib/ai-action-parser"
import { MediaAction } from "@/lib/ai-action-parser"
import { MediaEntry } from "@/lib/database.types"
import { toast } from "sonner"

const MediaDetailsDialog = dynamic(
  () => import("@/components/media-details-dialog").then(m => m.MediaDetailsDialog),
  { ssr: false }
)

interface AIQueryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspace: WorkspaceType
}

interface QueryResult {
  sql: string
  explanation: string
  data: any[]
  metadata: {
    visualizationType: "kpi" | "table" | "bar" | "pie" | "line" | "area"
    columnCount: number
    rowCount: number
    columns: string[]
    columnTypes: Record<string, string>
  }
}

interface ActionResult {
  intent: string
  actions: MediaAction[]
}

const MEDIA_EXAMPLES = [
  "How many movies did I watch in 2025?",
  "Add Dune Part 3 to planned",
  "Mark Inception as finished with 9/10",
  "Show me all movies rated above 8",
]

const FOOD_EXAMPLES = [
  "How much did I spend in January?",
  "Add Blue Hill to my list",
  "Top 5 highest rated restaurants",
  "Delete McDonald's from my list",
]

export function AIQueryDialog({ open, onOpenChange, workspace }: AIQueryDialogProps) {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [actionResult, setActionResult] = useState<ActionResult | null>(null)
  const [validatedActions, setValidatedActions] = useState<ValidatedAction[]>([])
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSQL, setShowSQL] = useState(false)
  const [editingAction, setEditingAction] = useState<{
    action: ValidatedAction
    index: number
  } | null>(null)
  const [showMediaDialog, setShowMediaDialog] = useState(false)

  const examples = workspace === "media" ? MEDIA_EXAMPLES : FOOD_EXAMPLES

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!query.trim()) {
      toast.error("Please enter a question or request")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setActionResult(null)

    try {
      const response = await fetch("/api/ai-query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query.trim(),
          workspace,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to process query")
        toast.error(data.error || "Failed to process query")
        return
      }

      // Handle action response
      if (data.type === "action") {
        setActionResult({
          intent: data.intent,
          actions: data.actions,
        })

        // Validate actions
        const validated = await validateActions(data.actions)
        setValidatedActions(validated)
        
        // Show confirmation dialog
        setShowConfirmation(true)
        return
      }

      // Handle query response
      setResult({
        sql: data.sql,
        explanation: data.explanation,
        data: data.data,
        metadata: data.metadata,
      })

      // Show success message based on result count
      if (data.metadata.rowCount === 0) {
        toast.info("No results found for this query")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleExampleClick = (example: string) => {
    setQuery(example)
    setResult(null)
    setActionResult(null)
    setError(null)
  }

  const handleReset = () => {
    setQuery("")
    setResult(null)
    setActionResult(null)
    setError(null)
    setShowSQL(false)
    setShowConfirmation(false)
  }

  const handleConfirmActions = async (selectedActions: ValidatedAction[]) => {
    try {
      const response = await fetch("/api/execute-actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actions: selectedActions.map(va => va.action),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        toast.error(`Failed to execute actions: ${data.error || "Unknown error"}`)
        return
      }

      const { summary } = data
      
      if (summary.succeeded > 0) {
        toast.success(`Successfully executed ${summary.succeeded} action${summary.succeeded > 1 ? 's' : ''}`)
      }
      
      if (summary.failed > 0) {
        toast.error(`${summary.failed} action${summary.failed > 1 ? 's' : ''} failed`)
      }

      // Close confirmation dialog and reset
      setShowConfirmation(false)
      handleReset()
      
      // Trigger a refresh of the media list (the parent component should handle this)
      // by closing and reopening the dialog
      setTimeout(() => {
        onOpenChange(false)
      }, 500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      toast.error(errorMessage)
      throw err
    }
  }

  const handleEditAction = (action: ValidatedAction, index: number) => {
    setEditingAction({ action, index })
    setShowMediaDialog(true)
    setShowConfirmation(false) // Hide confirmation while editing
  }

  const handleMediaDialogSuccess = (updatedEntry: MediaEntry) => {
    if (!editingAction) return

    // Update the action data with edited values
    const updatedActions = [...validatedActions]
    updatedActions[editingAction.index] = {
      ...updatedActions[editingAction.index],
      action: {
        ...updatedActions[editingAction.index].action,
        data: {
          title: updatedEntry.title,
          medium: updatedEntry.medium || undefined,
          type: updatedEntry.type || undefined,
          status: updatedEntry.status || undefined,
          genre: updatedEntry.genre || undefined,
          platform: updatedEntry.platform || undefined,
          my_rating: updatedEntry.my_rating || undefined,
          start_date: updatedEntry.start_date || undefined,
          finish_date: updatedEntry.finish_date || undefined,
          language: updatedEntry.language || undefined,
          episodes: updatedEntry.episodes || undefined,
          episodes_watched: updatedEntry.episodes_watched || undefined,
          price: updatedEntry.price || undefined,
          poster_url: updatedEntry.poster_url || undefined,
          imdb_id: updatedEntry.imdb_id || undefined,
          average_rating: updatedEntry.average_rating || undefined,
          season: updatedEntry.season || undefined,
          length: updatedEntry.length || undefined,
        }
      }
    }

    setValidatedActions(updatedActions)
    setShowMediaDialog(false)
    setShowConfirmation(true) // Return to confirmation
    setEditingAction(null)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">
              AI Assistant
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Ask questions or manage your {workspace} entries
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Query Input Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="query" className="text-sm font-mono">
                  Message
                </Label>
                <Textarea
                  id="query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`e.g., "${examples[0]}"`}
                  className="min-h-[100px] font-mono text-sm"
                  disabled={loading}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit" disabled={loading || !query.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>

                {(result || error) && (
                  <Button type="button" variant="outline" onClick={handleReset}>
                    Clear
                  </Button>
                )}
              </div>
            </form>

            {/* Example Queries */}
            {!result && !error && !loading && (
              <div className="flex flex-wrap gap-2">
                {examples.map((example, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleExampleClick(example)}
                    className="text-xs font-mono"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm font-mono text-destructive">{error}</p>
              </div>
            )}

            {/* Results Display */}
            {result && (
              <div className="space-y-4">
                {/* SQL Query (Collapsible) */}
                <div className="rounded-lg border bg-muted/30 p-3">
                  <button
                    type="button"
                    onClick={() => setShowSQL(!showSQL)}
                    className="flex w-full items-center justify-between text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>Generated SQL Query</span>
                    {showSQL ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  {showSQL && (
                    <pre className="mt-2 overflow-x-auto rounded bg-background p-3 text-xs font-mono">
                      {result.sql}
                    </pre>
                  )}
                </div>

                {/* Results Visualization */}
                {result.data.length > 0 ? (
                  <AIQueryResults
                    data={result.data}
                    metadata={result.metadata}
                    explanation={result.explanation}
                  />
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-sm font-mono text-muted-foreground">
                      No results found for this query
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      {actionResult && (
        <AIActionConfirmationDialog
          open={showConfirmation}
          onOpenChange={setShowConfirmation}
          intent={actionResult.intent}
          validatedActions={validatedActions}
          onConfirm={handleConfirmActions}
          onEdit={handleEditAction}
        />
      )}

      {/* Media Details Dialog for Editing */}
      {editingAction && (
        <MediaDetailsDialog
          open={showMediaDialog}
          onOpenChange={(open) => {
            setShowMediaDialog(open)
            if (!open) {
              setShowConfirmation(true) // Return to confirmation if closed
              setEditingAction(null)
            }
          }}
          entry={{
            id: "",
            title: editingAction.action.action.data?.title || "",
            medium: editingAction.action.action.data?.medium || null,
            type: editingAction.action.action.data?.type || null,
            status: editingAction.action.action.data?.status || null,
            genre: editingAction.action.action.data?.genre || null,
            platform: editingAction.action.action.data?.platform || null,
            my_rating: editingAction.action.action.data?.my_rating || null,
            start_date: editingAction.action.action.data?.start_date || null,
            finish_date: editingAction.action.action.data?.finish_date || null,
            language: editingAction.action.action.data?.language || null,
            episodes: editingAction.action.action.data?.episodes || null,
            episodes_watched: editingAction.action.action.data?.episodes_watched || null,
            price: editingAction.action.action.data?.price || null,
            poster_url: editingAction.action.action.data?.poster_url || null,
            imdb_id: editingAction.action.action.data?.imdb_id || null,
            average_rating: editingAction.action.action.data?.average_rating || null,
            season: editingAction.action.action.data?.season || null,
            length: editingAction.action.action.data?.length || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: "",
          } as MediaEntry}
          onSuccess={handleMediaDialogSuccess}
        />
      )}
    </>
  )
}
