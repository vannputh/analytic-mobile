"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KeyRound, ArrowLeft, RefreshCw, Loader2 } from "lucide-react"

interface OtpFormProps {
    otpCode: string
    onOtpChange: (code: string) => void
    onSubmit: (e: React.FormEvent) => void
    loading: boolean
    onResend: () => void
    onBack: () => void
}

export function OtpForm({
    otpCode,
    onOtpChange,
    onSubmit,
    loading,
    onResend,
    onBack
}: OtpFormProps) {
    return (
        <div className="space-y-4">
            <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="otp">Verification Code</Label>
                    <Input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="123456"
                        value={otpCode}
                        onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, ""))}
                        disabled={loading}
                        className="text-center text-2xl tracking-widest font-mono"
                        autoComplete="one-time-code"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                        Enter the 6-digit code from your email, or click the magic link
                    </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading || otpCode.length !== 6}>
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                        </>
                    ) : (
                        <>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Verify Code
                        </>
                    )}
                </Button>
            </form>
            <div className="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={onBack}
                    disabled={loading}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Different Email
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={onResend}
                    disabled={loading}
                >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Code
                </Button>
            </div>
        </div>
    )
}
