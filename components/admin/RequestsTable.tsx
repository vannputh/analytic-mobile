"use client"

import { useState } from "react"
import { UserProfile } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Check, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { approveUser, rejectUser } from "@/lib/admin-actions"
import { ApprovalDialog } from "./ApprovalDialog"

interface RequestsTableProps {
  requests: UserProfile[]
  onUpdate: () => void
}

export function RequestsTable({ requests, onUpdate }: RequestsTableProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<"approve" | "reject">("approve")

  const handleApprove = async (userId: string) => {
    setDialogMode("approve")
    setSelectedUserId(userId)
    setDialogOpen(true)
  }

  const handleReject = async (userId: string) => {
    setDialogMode("reject")
    setSelectedUserId(userId)
    setDialogOpen(true)
  }

  const confirmApprove = async () => {
    if (!selectedUserId) return
    
    setLoading(selectedUserId)
    try {
      const result = await approveUser(selectedUserId)
      
      if (result.success) {
        toast.success("User approved successfully")
        onUpdate()
      } else {
        toast.error(result.error || "Failed to approve user")
      }
    } catch (error) {
      toast.error("An error occurred")
      console.error(error)
    } finally {
      setLoading(null)
      setDialogOpen(false)
      setSelectedUserId(null)
    }
  }

  const confirmReject = async (reason?: string) => {
    if (!selectedUserId) return
    
    setLoading(selectedUserId)
    try {
      const result = await rejectUser(selectedUserId, reason)
      
      if (result.success) {
        toast.success("User rejected")
        onUpdate()
      } else {
        toast.error(result.error || "Failed to reject user")
      }
    } catch (error) {
      toast.error("An error occurred")
      console.error(error)
    } finally {
      setLoading(null)
      setDialogOpen(false)
      setSelectedUserId(null)
    }
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground font-mono text-sm">No pending requests</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile card view */}
      <div className="sm:hidden space-y-2">
        {requests.map((request) => (
          <div
            key={request.id}
            className="border rounded-lg p-3 bg-card/40 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted-foreground uppercase">Email</span>
              <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                {request.status}
              </Badge>
            </div>
            <div className="font-mono text-xs break-all">
              {request.email}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Requested: {new Date(request.requested_at).toLocaleDateString()}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <Button
                size="sm"
                variant="default"
                onClick={() => handleApprove(request.user_id)}
                disabled={loading === request.user_id}
                className="font-mono text-xs flex-1 min-w-[100px]"
              >
                {loading === request.user_id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Approve
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleReject(request.user_id)}
                disabled={loading === request.user_id}
                className="font-mono text-xs flex-1 min-w-[100px]"
              >
                <X className="h-3 w-3 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="border rounded-lg overflow-x-auto hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono text-xs uppercase">Email</TableHead>
              <TableHead className="font-mono text-xs uppercase">Requested</TableHead>
              <TableHead className="font-mono text-xs uppercase">Status</TableHead>
              <TableHead className="font-mono text-xs uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-mono text-sm">{request.email}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {new Date(request.requested_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApprove(request.user_id)}
                      disabled={loading === request.user_id}
                      className="font-mono text-xs"
                    >
                      {loading === request.user_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(request.user_id)}
                      disabled={loading === request.user_id}
                      className="font-mono text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ApprovalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        onConfirm={dialogMode === "approve" ? confirmApprove : confirmReject}
      />
    </>
  )
}
