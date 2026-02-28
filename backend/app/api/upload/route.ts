import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/api/request-auth'
import type { UploadResponse } from "@analytics/contracts"

// Allowed image MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request)
    if (!auth.success) return auth.response
    const { supabase, user } = auth.context

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Generate filename from title if provided, otherwise use original filename
    const fileExt = file.name.split('.').pop()
    let baseFileName: string
    
    if (title && title.trim()) {
      // Sanitize title for use as filename
      // Remove special characters, replace spaces with hyphens, limit length
      baseFileName = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
        .substring(0, 100) // Limit length to 100 characters
      
      // If title was completely removed by sanitization, fall back to timestamp
      if (!baseFileName) {
        baseFileName = `image-${Date.now()}`
      }
    } else {
      // Use original filename (sanitized) or fallback
      const originalName = file.name.replace(/\.[^/.]+$/, '') // Remove extension
      baseFileName = originalName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100) || `image-${Date.now()}`
    }
    
    // Add timestamp to ensure uniqueness
    const fileName = `${user.id}/${baseFileName}-${Date.now()}.${fileExt}`
    // Storage bucket name
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'images'

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false, // Don't overwrite existing files
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      
      // Provide more specific error messages
      if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
        return NextResponse.json(
          { error: `Storage bucket "${bucketName}" not found. Please create it in your Supabase Dashboard.` },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    const payload: UploadResponse = {
      success: true,
      url: urlData.publicUrl,
      path: uploadData.path,
      fileName: file.name,
      size: file.size,
      type: file.type,
    }

    return NextResponse.json(payload, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
