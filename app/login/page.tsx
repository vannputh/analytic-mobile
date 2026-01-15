"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { LoginForm, OtpForm } from "@/components/auth"

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [emailSent, setEmailSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const error = searchParams.get("error")
    if (error === "auth_failed") {
      toast.error("Authentication failed. Please try again.")
    } else if (error === "unauthorized") {
      toast.error("Access denied. This account is not authorized.")
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error("Please enter your email address")
      return
    }

    setLoading(true)

    try {
      // First, check if user exists
      // Use absolute URL to avoid issues with relative paths
      const apiUrl = `${window.location.origin}/api/auth/check-user`
      const checkResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      // Check content type before parsing
      const contentType = checkResponse.headers.get("content-type")
      const isJson = contentType?.includes("application/json")

      if (!checkResponse.ok) {
        // Try to parse error message, but handle empty responses
        let errorMessage = "Failed to verify user"
        let errorDetails: string | undefined
        try {
          if (isJson) {
            const errorData = await checkResponse.json()
            errorMessage = errorData.error || errorMessage
            errorDetails = errorData.details
          } else {
            // If not JSON, read as text to see what we got
            const text = await checkResponse.text()
            console.error("Non-JSON error response:", text.substring(0, 200))
            errorMessage = checkResponse.statusText || errorMessage
          }
        } catch (parseError) {
          // If response is not JSON, use status text
          errorMessage = checkResponse.statusText || errorMessage
        }
        console.error("Check user failed:", {
          status: checkResponse.status,
          statusText: checkResponse.statusText,
          url: apiUrl,
          contentType,
          details: errorDetails,
        })
        const fullErrorMessage = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage
        throw new Error(fullErrorMessage)
      }

      if (!isJson) {
        const text = await checkResponse.text()
        console.error("Expected JSON but got:", text.substring(0, 200))
        throw new Error("Invalid response format from server")
      }

      const checkData = await checkResponse.json()

      if (!checkData.exists) {
        toast.error("This email is not registered. Please contact the administrator.")
        setLoading(false)
        return
      }

      // User exists, proceed with sending magic link
      const redirectTo = searchParams.get("redirect") || "/"
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      })

      if (error) throw error

      setEmailSent(true)
      toast.success("Check your email! You can click the magic link or enter the code below.")
    } catch (error) {
      console.error("Login error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to send magic link")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter the 6-digit code")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "email",
      })

      if (error) throw error

      toast.success("Login successful!")
      const redirectTo = searchParams.get("redirect") || "/"
      router.push(redirectTo)
    } catch (error) {
      console.error("OTP verification error:", error)
      toast.error(error instanceof Error ? error.message : "Invalid code. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setLoading(true)
    setOtpCode("")

    try {
      const redirectTo = searchParams.get("redirect") || "/"
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      })

      if (error) throw error

      toast.success("New code sent! Check your email.")
    } catch (error) {
      console.error("Resend error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to resend code")
    } finally {
      setLoading(false)
    }
  }

  const handleBackToEmail = () => {
    setEmailSent(false)
    setOtpCode("")
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            {emailSent
              ? `We sent a code to ${email}`
              : "Enter your email to receive a magic link and code"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!emailSent ? (
            <LoginForm
              email={email}
              onEmailChange={setEmail}
              onSubmit={handleLogin}
              loading={loading}
            />
          ) : (
            <OtpForm
              otpCode={otpCode}
              onOtpChange={setOtpCode}
              onSubmit={handleVerifyOtp}
              loading={loading}
              onResend={handleResend}
              onBack={handleBackToEmail}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm font-mono">Loading...</p>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}

