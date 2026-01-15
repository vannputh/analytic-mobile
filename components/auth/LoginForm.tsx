"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Loader2 } from "lucide-react"

interface LoginFormProps {
    email: string
    onEmailChange: (email: string) => void
    onSubmit: (e: React.FormEvent) => void
    loading: boolean
}

export function LoginForm({ email, onEmailChange, onSubmit, loading }: LoginFormProps) {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    disabled={loading}
                    required
                />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                    </>
                ) : (
                    <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Magic Link
                    </>
                )}
            </Button>
        </form>
    )
}
