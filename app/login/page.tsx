"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { LoginForm, OtpForm, SignupForm, AuthToggle } from "@/components/auth"

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<"login" | "signup">("login")
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
    } else if (error === "not_approved") {
      toast.error("Your account is pending approval. Please wait for admin approval.")
    }
  }, [searchParams])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error("Please enter your email address")
      return
    }

    setLoading(true)

    try {
      // Check if user already exists
      const apiUrl = `${window.location.origin}/api/auth/check-user`
      const checkResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const contentType = checkResponse.headers.get("content-type")
      const isJson = contentType?.includes("application/json")

      if (checkResponse.ok && isJson) {
        const checkData = await checkResponse.json()
        
        if (checkData.exists) {
          if (checkData.approved === false) {
            toast.error("Your request is already pending approval.")
          } else {
            toast.error("This email is already registered. Please use the login option.")
          }
          setLoading(false)
          return
        }
      }

      // Create auth user and send OTP for email verification
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?signup=true`,
        },
      })

      if (error) throw error

      setEmailSent(true)
      toast.success("Check your email! Enter the verification code to complete your request.")
    } catch (error) {
      console.error("Signup error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to send verification code")
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error("Please enter your email address")
      return
    }

    setLoading(true)

    try {
      // Check if user exists and is approved
      const apiUrl = `${window.location.origin}/api/auth/check-user`
      const checkResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const contentType = checkResponse.headers.get("content-type")
      const isJson = contentType?.includes("application/json")

      if (!checkResponse.ok) {
        let errorMessage = "Failed to verify user"
        let errorDetails: string | undefined
        try {
          if (isJson) {
            const errorData = await checkResponse.json()
            errorMessage = errorData.error || errorMessage
            errorDetails = errorData.details
          } else {
            const text = await checkResponse.text()
            console.error("Non-JSON error response:", text.substring(0, 200))
            errorMessage = checkResponse.statusText || errorMessage
          }
        } catch (parseError) {
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
        toast.error("This email is not registered. Please request access first.")
        setLoading(false)
        return
      }

      if (checkData.approved === false) {
        if (checkData.status === 'pending') {
          toast.error("Your account is pending approval. Please wait for admin approval.")
        } else if (checkData.status === 'rejected') {
          toast.error("Your access request was rejected. Please contact the administrator.")
        } else {
          toast.error("Your account is not approved. Please contact the administrator.")
        }
        setLoading(false)
        return
      }

      // User exists and is approved, proceed with sending magic link
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

    if (!otpCode || otpCode.length < 6 || otpCode.length > 12) {
      toast.error("Please enter a valid verification code")
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

      if (mode === "signup") {
        // For signup, create the user profile with pending status
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Insert user profile
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: user.id,
              email: user.email!,
              status: 'pending',
            })

          if (profileError) {
            console.error("Profile creation error:", profileError)
            // Sign out the user since we couldn't create the profile
            await supabase.auth.signOut()
            toast.error("Failed to create profile. Please try again.")
            setLoading(false)
            return
          }

          // Sign out after creating the profile
          await supabase.auth.signOut()
          toast.success("Access requested! Please wait for admin approval. You'll receive an email once approved.")
          
          // Reset form
          setEmail("")
          setOtpCode("")
          setEmailSent(false)
          setMode("login")
        }
      } else {
        // For login, redirect to the app
      toast.success("Login successful!")
      const redirectTo = searchParams.get("redirect") || "/media"
      router.push(redirectTo)
      }
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
      const isSignup = mode === "signup"
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: isSignup 
            ? `${window.location.origin}/auth/callback?signup=true`
            : `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
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

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login")
    setEmailSent(false)
    setOtpCode("")
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">
            {mode === "login" ? "Login" : "Request Access"}
          </CardTitle>
          <CardDescription>
            {emailSent
              ? `We sent a code to ${email}`
              : mode === "login"
              ? "Enter your email to receive a magic link and code"
              : "Request access to the application"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!emailSent ? (
            <>
              {mode === "login" ? (
                <LoginForm
                  email={email}
                  onEmailChange={setEmail}
                  onSubmit={handleLogin}
                  loading={loading}
                />
              ) : (
                <SignupForm
                  email={email}
                  onEmailChange={setEmail}
                  onSubmit={handleSignup}
                  loading={loading}
                />
              )}
              <AuthToggle mode={mode} onToggle={toggleMode} />
            </>
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

