'use client'

import { useState, useEffect } from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MediaEntry } from '@/types/database'
import { ArrowUpDown, ChevronLeft, ChevronRight, Eye, Search } from 'lucide-react'
import { SafeImage } from '@/components/ui/safe-image'
import { getUserPreference, setUserPreference } from '@/lib/user-preferences'
import { STATUS_OPTIONS, MEDIUM_OPTIONS } from '@/lib/types'

interface DataTableProps {
  data: MediaEntry[]
}

export function DataTable({ data }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnsLoaded, setColumnsLoaded] = useState(false)

  const columns: ColumnDef<MediaEntry>[] = [
    {
      accessorKey: 'poster_url',
      header: '',
      cell: ({ row }) => {
        const poster = row.getValue('poster_url') as string
        return poster && poster !== 'N/A' ? (
          <div className="relative w-10 h-14 group">
            <SafeImage
              src={poster}
              alt={row.getValue('title')}
              fill
              className="object-cover rounded-sm"
              sizes="40px"
              fallbackElement={
                <div className="w-10 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-sm flex items-center justify-center absolute inset-0">
                  <Eye className="h-4 w-4 text-zinc-400" />
                </div>
              }
            />
          </div >
        ) : (
          <div className="w-10 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-sm flex items-center justify-center">
            <Eye className="h-4 w-4 text-zinc-400" />
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'title',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        return (
          <div className="font-medium max-w-xs truncate">
            {row.getValue('title')}
          </div>
        )
      },
    },
    {
      accessorKey: 'medium',
      header: 'Medium',
      cell: ({ row }) => {
        const medium = row.getValue('medium') as string
        return medium ? (
          <Badge variant="outline" className="font-normal">
            {medium}
          </Badge>
        ) : null
      },
      filterFn: (row, id, value) => {
        const rowValue = row.getValue(id) as string
        if (!value) return true
        return rowValue === value
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        const variants = {
          'Finished': 'default',
          'In Progress': 'secondary',
          'On Hold': 'outline',
          'Dropped': 'destructive',
        } as const

        return status ? (
          <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
            {status}
          </Badge>
        ) : null
      },
      filterFn: (row, id, value) => {
        const rowValue = row.getValue(id) as string
        if (!value) return true
        return rowValue === value
      },
    },
    {
      accessorKey: 'my_rating',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            My Rating
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const rating = row.getValue('my_rating') as number
        return rating ? (
          <div className="font-medium">
            ★ {rating.toFixed(1)}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
    {
      accessorKey: 'average_rating',
      header: 'IMDB',
      cell: ({ row }) => {
        const rating = row.getValue('average_rating') as number
        return rating ? (
          <div className="text-sm text-muted-foreground">
            {rating.toFixed(1)}
          </div>
        ) : null
      },
    },
    {
      accessorKey: 'platform',
      header: 'Platform',
      cell: ({ row }) => {
        const platform = row.getValue('platform') as string
        return platform ? (
          <span className="text-sm">{platform}</span>
        ) : null
      },
    },
    {
      accessorKey: 'finish_date',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Finished
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = row.getValue('finish_date') as string
        return date ? (
          <span className="text-sm text-muted-foreground">
            {new Date(date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </span>
        ) : null
      },
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => {
        const price = row.getValue('price') as number
        return price ? (
          <span className="text-sm">${price.toFixed(2)}</span>
        ) : null
      },
    },
  ]

  // Load column visibility from Supabase
  useEffect(() => {
    async function loadColumns() {
      const saved = await getUserPreference<Record<string, boolean>>("data-table-visible-columns")
      if (saved && typeof saved === 'object') {
        setColumnVisibility(saved)
      }
      setColumnsLoaded(true)
    }
    loadColumns()
  }, [])

  // Save column visibility to Supabase
  useEffect(() => {
    if (!columnsLoaded) return // Don't save until we've loaded initial state
    
    async function saveColumns() {
      await setUserPreference("data-table-visible-columns", columnVisibility)
    }
    saveColumns()
  }, [columnVisibility, columnsLoaded])

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
      columnVisibility: columnsLoaded ? columnVisibility : {},
    },
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search titles..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={(table.getColumn('status')?.getFilterValue() as string) ?? 'all'}
          onValueChange={(value) =>
            table.getColumn('status')?.setFilterValue(value === 'all' ? undefined : value)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={(table.getColumn('medium')?.getFilterValue() as string) ?? 'all'}
          onValueChange={(value) =>
            table.getColumn('medium')?.setFilterValue(value === 'all' ? undefined : value)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Media" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Media</SelectItem>
            {MEDIUM_OPTIONS.map((medium) => (
              <SelectItem key={medium} value={medium}>
                {medium}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No entries found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          of {table.getFilteredRowModel().rows.length} entries
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-sm">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

