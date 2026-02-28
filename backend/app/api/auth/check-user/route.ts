import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'
import type { CheckUserRequest, CheckUserResponse } from "@analytics/contracts"

// This route checks if a user exists in Supabase Auth and their approval status
export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as CheckUserRequest

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Use service role key to access auth.users table
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      const missingVars = []
      if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
      if (!supabaseServiceRoleKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY')
      
      console.error(`Missing required environment variables: ${missingVars.join(', ')}`)
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: `Missing environment variables: ${missingVars.join(', ')}. Please check your .env.local file.`
        },
        { status: 500 }
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check if user exists by email
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) {
      console.error('Error checking user:', error)
      return NextResponse.json(
        { error: 'Failed to check user' },
        { status: 500 }
      )
    }

    // Check if email exists in the users list (case-insensitive)
    const normalizedEmail = email.toLowerCase().trim()
    const authUser = data.users.find(user => 
      user.email?.toLowerCase().trim() === normalizedEmail
    )

    if (!authUser) {
      const payload: CheckUserResponse = { exists: false }
      return NextResponse.json(payload)
    }

    // User exists in auth, now check their profile status
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('status')
      .eq('user_id', authUser.id)
      .single()

    if (profileError) {
      // User exists in auth but no profile yet (shouldn't happen with our flow)
      console.error('Profile not found for user:', authUser.id)
      const payload: CheckUserResponse = { 
        exists: true, 
        approved: false,
        status: 'unknown'
      }
      return NextResponse.json(payload)
    }

    // Return user existence and approval status
    const payload: CheckUserResponse = { 
      exists: true, 
      approved: profile.status === 'approved',
      status: profile.status
    }
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Error in check-user route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
