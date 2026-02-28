import { backendFetch } from "@/src/shared/api/backend"

export interface UploadResponse {
  success: boolean
  url: string
  path: string
  fileName: string
  size: number
  type: string
}

interface UploadAssetInput {
  uri: string
  fileName?: string | null
  mimeType?: string | null
  title?: string | null
}

function guessMimeType(fileName: string): string {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".webp")) return "image/webp"
  if (lower.endsWith(".gif")) return "image/gif"
  return "image/jpeg"
}

export async function uploadAssetToBackend(input: UploadAssetInput): Promise<UploadResponse> {
  const fallbackName = `image-${Date.now()}.jpg`
  const fileName = input.fileName?.trim() || input.uri.split("/").pop() || fallbackName
  const mimeType = input.mimeType || guessMimeType(fileName)

  const formData = new FormData()
  formData.append(
    "file",
    {
      uri: input.uri,
      name: fileName,
      type: mimeType
    } as unknown as Blob
  )

  if (input.title?.trim()) {
    formData.append("title", input.title.trim())
  }

  return backendFetch<UploadResponse>("/api/upload", {
    method: "POST",
    body: formData
  })
}
