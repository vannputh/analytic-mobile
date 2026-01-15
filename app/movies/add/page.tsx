"use client"

import { Suspense, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Loader2, Save, Upload } from "lucide-react"
import { toast } from "sonner"
import { useMediaMetadata } from "@/hooks/useMediaMetadata"
import { useMediaForm } from "@/hooks/useMediaForm"
import { MetadataOverrideDialog } from "@/components/movies/MetadataOverrideDialog"
import { BasicDetailsSection } from "@/components/movies/forms/BasicDetailsSection"
import { ClassificationSection } from "@/components/movies/forms/ClassificationSection"
import { MediaDetailsSection } from "@/components/movies/forms/MediaDetailsSection"
import { RatingSection } from "@/components/movies/forms/RatingSection"
import { DatesSection } from "@/components/movies/forms/DatesSection"
import { PosterSection } from "@/components/movies/forms/PosterSection"

function AddPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const entryId = searchParams.get("id")
  const returnTo = searchParams.get("returnTo")

  const { fetchMetadata, fetching: fetchingMetadata, fetchingSource, detectISBN, detectIMDbID } = useMediaMetadata()

  const {
    formData,
    setFormData,
    loading,
    fetching,
    uploadingImage,
    genreInput,
    languageInput,
    dropdownOptions,
    setDropdownOptions,
    showNewInput,
    setShowNewInput,
    newValue,
    setNewValue,
    handleGenreChange,
    handleLanguageChange,
    handleImageUpload,
    handleSubmit,
    // Metadata dialog state
    showOverrideDialog,
    setShowOverrideDialog,
    pendingMetadata,
    setPendingMetadata,
    overrideFields,
    setOverrideFields,
    applyMetadata,
    handleConfirmOverride,
    handleCancelOverride
  } = useMediaForm(entryId)

  // Handle metadata fetching interaction
  const handleFetchMetadata = async (source: "omdb" | "tmdb") => {
    try {
      const metadata = await fetchMetadata(source, {
        title: formData.title || undefined,
        imdb_id: formData.imdb_id || undefined,
        medium: formData.medium || undefined,
        season: formData.season || undefined
      })

      // Check if there's existing data that would be overwritten
      const hasExistingData =
        formData.title ||
        formData.poster_url ||
        formData.genre ||
        formData.language ||
        formData.average_rating !== null ||
        formData.length ||
        formData.episodes !== null ||
        formData.imdb_id

      if (hasExistingData) {
        // Show confirmation dialog with field selection
        setPendingMetadata(metadata)

        // Initialize override fields
        const hasGenre = formData.genre && (Array.isArray(formData.genre) ? formData.genre.length > 0 : true)
        const hasLanguage = formData.language && (Array.isArray(formData.language) ? formData.language.length > 0 : true)

        setOverrideFields({
          title: !!metadata.title && !!formData.title,
          poster_url: !!metadata.poster_url && !!formData.poster_url,
          genre: !!metadata.genre && !!hasGenre,
          language: !!metadata.language && !!hasLanguage,
          average_rating: metadata.average_rating !== null && formData.average_rating !== null,
          length: !!metadata.length,
          episodes: metadata.episodes !== null && formData.episodes !== null,
          imdb_id: !!metadata.imdb_id && !!formData.imdb_id,
        })
        setShowOverrideDialog(true)
        return
      }

      // No existing data, apply directly
      applyMetadata(metadata)
      toast.success(`Metadata fetched successfully from ${source.toUpperCase()}`)
    } catch (error) {
      console.error("Error fetching metadata:", error)
      toast.error(error instanceof Error ? error.message : "Failed to fetch metadata")
    }
  }

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm font-mono">Loading entry...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={entryId ? "Edit Entry" : "Add Entry"} />

      {/* Form */}
      <main className="max-w-4xl mx-auto p-6">
        <form onSubmit={(e) => handleSubmit(e, returnTo)} className="space-y-6">
          <BasicDetailsSection
            title={formData.title || null}
            onChange={(val) => setFormData({ ...formData, title: val })}
            onFetchMetadata={handleFetchMetadata}
            fetchingMetadata={fetchingMetadata}
            fetchingSource={fetchingSource}
            imdbId={formData.imdb_id || null}
            detectISBN={detectISBN}
            detectIMDbID={detectIMDbID}
          />

          <ClassificationSection
            formData={formData as any}
            setFormData={setFormData as any}
            dropdownOptions={dropdownOptions}
            setDropdownOptions={setDropdownOptions as any}
            showNewInput={showNewInput}
            setShowNewInput={setShowNewInput as any}
            newValue={newValue}
            setNewValue={setNewValue as any}
            genreInput={genreInput}
            handleGenreChange={handleGenreChange}
            languageInput={languageInput}
            handleLanguageChange={handleLanguageChange}
          />

          <MediaDetailsSection
            formData={formData as any}
            setFormData={setFormData as any}
            dropdownOptions={dropdownOptions}
            setDropdownOptions={setDropdownOptions as any}
            showNewInput={showNewInput}
            setShowNewInput={setShowNewInput as any}
            newValue={newValue}
            setNewValue={setNewValue as any}
            detectISBN={detectISBN}
          />

          <RatingSection
            formData={formData as any}
            setFormData={setFormData as any}
          />

          <DatesSection
            formData={formData as any}
            setFormData={setFormData as any}
          />

          <PosterSection
            formData={formData as any}
            setFormData={setFormData as any}
            handleImageUpload={handleImageUpload}
            uploadingImage={uploadingImage}
          />

          {/* Submit Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {entryId ? "Update Entry" : "Create Entry"}
                </>
              )}
            </Button>
            {!entryId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/import")}
                disabled={loading}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/movies/analytics")}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </main>

      <MetadataOverrideDialog
        open={showOverrideDialog}
        onOpenChange={setShowOverrideDialog}
        pendingMetadata={pendingMetadata}
        currentData={formData}
        overrideFields={overrideFields}
        onOverrideFieldsChange={setOverrideFields}
        onConfirm={() => handleConfirmOverride(fetchingSource === "omdb" ? "OMDB" : "TMDB")}
        onCancel={handleCancelOverride}
      />
    </div>
  )
}

export default function AddPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm font-mono">Loading...</p>
        </div>
      </div>
    }>
      <AddPageContent />
    </Suspense>
  )
}
