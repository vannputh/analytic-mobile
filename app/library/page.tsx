import { Suspense } from 'react'
import { getEntries } from '@/lib/actions'
import { DataTable } from '@/components/data-table'
import { ManualEntryForm } from '@/components/manual-entry-form'
import { UploadModal } from '@/components/upload-modal'
import { Sidebar } from '@/components/sidebar'
import { Skeleton } from '@/components/ui/skeleton'

async function LibraryContent() {
  const entriesResult = await getEntries()
  const entries = entriesResult.success ? entriesResult.data : []

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-serif tracking-tight">
            Library
          </h1>
          <p className="text-muted-foreground mt-2">
            Browse and manage your entire media collection
          </p>
        </div>
        <div className="flex gap-2">
          <ManualEntryForm />
          <UploadModal />
        </div>
      </div>

      <div className="mt-8">
        <DataTable data={entries} />
      </div>
    </>
  )
}

function LibrarySkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <Skeleton className="h-96" />
    </div>
  )
}

export default function LibraryPage() {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      
      <main className="flex-1 ml-64">
        <div className="container max-w-7xl mx-auto p-8">
          <Suspense fallback={<LibrarySkeleton />}>
            <LibraryContent />
          </Suspense>
        </div>
      </main>
    </div>
  )
}


