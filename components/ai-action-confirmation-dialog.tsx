"use client"

import { useState } from "react"
import { Check, X, Loader2, Plus, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ValidatedAction } from "@/lib/ai-action-parser"
import { toast } from "sonner"

interface AIActionConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  intent: string
  validatedActions: ValidatedAction[]
  onConfirm: (selectedActions: ValidatedAction[]) => Promise<void>
  onEdit?: (action: ValidatedAction, index: number) => void
}

export function AIActionConfirmationDialog({
  open,
  onOpenChange,
  intent,
  validatedActions,
  onConfirm,
  onEdit,
}: AIActionConfirmationDialogProps) {
  const [selectedActionIndexes, setSelectedActionIndexes] = useState<Set<number>>(
    new Set(validatedActions.map((_, idx) => idx).filter(idx => validatedActions[idx].validation.valid))
  )
  const [isExecuting, setIsExecuting] = useState(false)

  const toggleAction = (index: number) => {
    const newSet = new Set(selectedActionIndexes)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setSelectedActionIndexes(newSet)
  }

  const selectAll = () => {
    const validIndexes = validatedActions
      .map((_, idx) => idx)
      .filter(idx => validatedActions[idx].validation.valid)
    setSelectedActionIndexes(new Set(validIndexes))
  }

  const deselectAll = () => {
    setSelectedActionIndexes(new Set())
  }

  const handleConfirm = async () => {
    const selectedActions = Array.from(selectedActionIndexes)
      .map(idx => validatedActions[idx])
      .filter(va => va.validation.valid)

    if (selectedActions.length === 0) {
      toast.error("Please select at least one valid action")
      return
    }

    setIsExecuting(true)
    try {
      await onConfirm(selectedActions)
      onOpenChange(false)
    } catch (error) {
      console.error("Error executing actions:", error)
      toast.error(error instanceof Error ? error.message : "Failed to execute actions")
    } finally {
      setIsExecuting(false)
    }
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case "create":
        return <Plus className="h-3 w-3" />
      case "update":
        return <Edit className="h-3 w-3" />
      case "delete":
        return <Trash2 className="h-3 w-3" />
      default:
        return null
    }
  }

  const getActionBadgeVariant = (type: string): "default" | "secondary" | "destructive" => {
    switch (type) {
      case "create":
        return "default"
      case "update":
        return "secondary"
      case "delete":
        return "destructive"
      default:
        return "default"
    }
  }

  const validCount = validatedActions.filter(va => va.validation.valid).length
  const selectedCount = selectedActionIndexes.size

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono">Confirm Actions</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {intent} - Review and select actions to execute
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selection controls */}
          <div className="flex items-center justify-between border-b pb-3">
            <div className="text-sm font-mono text-muted-foreground">
              {selectedCount} of {validCount} actions selected
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={selectedCount === validCount}
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={deselectAll}
                disabled={selectedCount === 0}
              >
                Deselect All
              </Button>
            </div>
          </div>

          {/* Actions list */}
          <div className="space-y-3">
            {validatedActions.map((validatedAction, index) => {
              const { action, matchedEntry, validation } = validatedAction
              const isSelected = selectedActionIndexes.has(index)
              const isValid = validation.valid

              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    !isValid ? "border-destructive/50 bg-destructive/5" : "border-border"
                  } ${isSelected && isValid ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleAction(index)}
                      disabled={!isValid || isExecuting}
                      className="mt-1"
                    />

                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      {/* Action header */}
                      <div className="flex items-center gap-2">
                        <Badge variant={getActionBadgeVariant(action.type)} className="gap-1">
                          {getActionIcon(action.type)}
                          {action.type.toUpperCase()}
                        </Badge>
                        <span className="font-mono text-sm font-semibold">
                          {action.data?.title}
                        </span>
                        
                        {/* Edit button for create actions */}
                        {action.type === "create" && onEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(validatedAction, index)}
                            disabled={isExecuting}
                            className="ml-auto h-7 text-xs"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>

                      {/* Action details */}
                      {action.data && Object.keys(action.data).length > 1 && (
                        <div className="text-xs font-mono text-muted-foreground space-y-1 ml-1">
                          {Object.entries(action.data)
                            .filter(([key]) => key !== "title")
                            .map(([key, value]) => (
                              <div key={key}>
                                <span className="text-foreground/70">{key}:</span>{" "}
                                {Array.isArray(value) ? value.join(", ") : String(value)}
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Matched entry info for updates/deletes */}
                      {matchedEntry && (action.type === "update" || action.type === "delete") && (
                        <div className="text-xs font-mono text-muted-foreground border-l-2 border-primary/30 pl-2">
                          <div className="flex items-center gap-1">
                            <Check className="h-3 w-3 text-green-600" />
                            <span>Matched: {matchedEntry.title}</span>
                          </div>
                          {action.type === "update" && matchedEntry.status && (
                            <div className="text-muted-foreground/70">
                              Current status: {matchedEntry.status}
                              {action.data?.status && ` → ${action.data.status}`}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Validation errors */}
                      {validation.errors.length > 0 && (
                        <div className="space-y-1">
                          {validation.errors.map((error, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-1 text-xs font-mono text-destructive"
                            >
                              <X className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{error}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Validation warnings */}
                      {validation.warnings.length > 0 && (
                        <div className="space-y-1">
                          {validation.warnings.map((warning, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-1 text-xs font-mono text-yellow-600"
                            >
                              <span className="text-yellow-600 flex-shrink-0">⚠</span>
                              <span>{warning}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExecuting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={selectedCount === 0 || isExecuting}
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                Confirm {selectedCount > 0 && `(${selectedCount})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
