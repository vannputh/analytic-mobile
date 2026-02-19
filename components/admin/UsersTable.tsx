"use client"

import { UserProfile } from "@/lib/database.types"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Shield } from "lucide-react"

interface UsersTableProps {
  users: UserProfile[]
}

export function UsersTable({ users }: UsersTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'rejected':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground font-mono text-sm">No users found</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Mobile card view */}
      <div className="sm:hidden space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="border rounded-lg p-3 bg-card/40 flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs text-muted-foreground uppercase">Email</span>
              </div>
              <Badge variant={getStatusColor(user.status)} className="font-mono text-[10px] px-1.5 py-0">
                {user.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs break-all">
                {user.email}
              </span>
              {user.is_admin && (
                <Shield className="h-3 w-3 text-primary shrink-0" />
              )}
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="font-mono">
                Role: {user.is_admin ? "Admin" : "User"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span className="font-mono">
                Requested: {new Date(user.requested_at).toLocaleDateString()}
              </span>
              <span className="font-mono">
                Approved: {user.approved_at ? new Date(user.approved_at).toLocaleDateString() : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="border rounded-lg overflow-x-auto hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono text-xs uppercase">Email</TableHead>
              <TableHead className="font-mono text-xs uppercase">Status</TableHead>
              <TableHead className="font-mono text-xs uppercase">Role</TableHead>
              <TableHead className="font-mono text-xs uppercase">Requested</TableHead>
              <TableHead className="font-mono text-xs uppercase">Approved</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-mono text-sm">
                  <div className="flex items-center gap-2">
                    {user.email}
                    {user.is_admin && (
                      <Shield className="h-3 w-3 text-primary" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(user.status)} className="font-mono text-xs">
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {user.is_admin ? 'Admin' : 'User'}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {new Date(user.requested_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {user.approved_at ? new Date(user.approved_at).toLocaleDateString() : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
