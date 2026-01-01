'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { parseCSVText, validateEntry } from '@/lib/csv-utils'
import { batchUploadEntries, CreateEntryInput } from '@/lib/actions'
import { useToast } from '@/hooks/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

export function UploadModal() {
  const [open, setOpen] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [parsedData, setParsedData] = useState<Partial<CreateEntryInput>[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsing' | 'uploading' | 'success' | 'error'>('idle')
  const { toast } = useToast()

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvText(text)
    }
    reader.readAsText(file)
  }

  const handleParse = () => {
    if (!csvText.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide CSV data to parse',
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)
    setUploadStatus('parsing')

    try {
      const result = parseCSVText(csvText)
      
      // Validate each entry
      const validationErrors: string[] = []
      const validEntries: Partial<CreateEntryInput>[] = []

      result.data.forEach((entry, index) => {
        const entryErrors = validateEntry(entry)
        if (entryErrors.length > 0) {
          validationErrors.push(`Row ${index + 1}: ${entryErrors.join(', ')}`)
        } else {
          validEntries.push(entry)
        }
      })

      setParsedData(validEntries)
      setErrors([...result.errors, ...validationErrors])
      
      if (validEntries.length > 0) {
        toast({
          title: 'Parsing Complete',
          description: `Successfully parsed ${validEntries.length} entries${validationErrors.length > 0 ? ` (${validationErrors.length} errors)` : ''}`,
        })
      } else {
        toast({
          title: 'Parsing Failed',
          description: 'No valid entries found',
          variant: 'destructive',
        })
      }
      
      setUploadStatus('idle')
    } catch (error) {
      toast({
        title: 'Parsing Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
      setUploadStatus('error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUpload = async () => {
    if (parsedData.length === 0) {
      toast({
        title: 'No Data',
        description: 'Please parse data before uploading',
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)
    setUploadStatus('uploading')

    try {
      const result = await batchUploadEntries(parsedData as CreateEntryInput[])

      if (result.success) {
        toast({
          title: 'Upload Successful',
          description: `Successfully uploaded ${result.count} entries`,
        })
        setUploadStatus('success')
        
        // Reset after success
        setTimeout(() => {
          setCsvText('')
          setParsedData([])
          setErrors([])
          setUploadStatus('idle')
          setOpen(false)
        }, 2000)
      } else {
        toast({
          title: 'Upload Failed',
          description: result.error || 'Unknown error',
          variant: 'destructive',
        })
        setUploadStatus('error')
      }
    } catch (error) {
      toast({
        title: 'Upload Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
      setUploadStatus('error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = () => {
    setCsvText('')
    setParsedData([])
    setErrors([])
    setUploadStatus('idle')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Batch Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">Smart Batch Upload</DialogTitle>
          <DialogDescription>
            Upload CSV files or paste data directly. We'll automatically map and clean your data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <label htmlFor="file-upload" className="text-sm font-medium">
              Upload CSV File
            </label>
            <div className="flex gap-2">
              <input
                id="file-upload"
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-zinc-950 file:text-white hover:file:bg-zinc-800"
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-2">
            <label htmlFor="csv-text" className="text-sm font-medium">
              Or Paste Data
            </label>
            <Textarea
              id="csv-text"
              placeholder="Paste your CSV data here...&#10;Example:&#10;Title, Medium, Status, My Rating&#10;Inception, Movie, Finished, 9.5"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="font-mono text-xs min-h-[150px]"
              disabled={isProcessing}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleParse} 
              disabled={!csvText.trim() || isProcessing}
              className="gap-2"
            >
              {uploadStatus === 'parsing' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Parse Data
            </Button>

            <Button 
              onClick={handleUpload} 
              disabled={parsedData.length === 0 || isProcessing}
              variant="default"
              className="gap-2"
            >
              {uploadStatus === 'uploading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload {parsedData.length > 0 && `(${parsedData.length})`}
            </Button>

            <Button 
              onClick={handleReset} 
              disabled={isProcessing}
              variant="outline"
            >
              Reset
            </Button>
          </div>

          {/* Status */}
          {uploadStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-md">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-800 dark:text-green-200">
                Upload successful! Redirecting...
              </span>
            </div>
          )}

          {/* Preview */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Preview ({parsedData.length} entries)</h3>
                {errors.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.length} errors
                  </Badge>
                )}
              </div>
              <ScrollArea className="h-[200px] border rounded-md p-4">
                <div className="space-y-2">
                  {parsedData.slice(0, 10).map((entry, index) => (
                    <div key={index} className="text-sm border-b pb-2 last:border-0">
                      <div className="font-medium">{entry.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {entry.medium && <Badge variant="outline" className="mr-2">{entry.medium}</Badge>}
                        {entry.status && <Badge variant="secondary" className="mr-2">{entry.status}</Badge>}
                        {entry.my_rating && <span>★ {entry.my_rating}/10</span>}
                      </div>
                    </div>
                  ))}
                  {parsedData.length > 10 && (
                    <div className="text-xs text-muted-foreground text-center pt-2">
                      + {parsedData.length - 10} more entries...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-red-600 dark:text-red-400">Errors & Warnings</h3>
              <ScrollArea className="h-[120px] border border-red-200 dark:border-red-900 rounded-md p-3 bg-red-50 dark:bg-red-950/20">
                <div className="space-y-1">
                  {errors.map((error, index) => (
                    <div key={index} className="text-xs text-red-700 dark:text-red-300">
                      • {error}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}






