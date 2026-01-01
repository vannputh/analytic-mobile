'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function ManualEntryForm() {
  const router = useRouter()

  return (
    <Button 
      onClick={() => router.push('/add')}
      className="gap-2"
    >
      <Plus className="h-4 w-4" />
      Add Entry
    </Button>
  )
}



