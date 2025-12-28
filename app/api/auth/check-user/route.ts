import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This route checks if a user exists in Supabase Auth
// Only existing users should be able to receive magic links
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Use service role key to access auth.users table
    // This should be set in your environment variables as SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing Supabase service role key')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check if user exists by email
    // Note: We list users and filter by email since Supabase Admin API
    // doesn't have a direct "get user by email" method
    // For a personal app with manually added users, this is acceptable
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
    const userExists = data.users.some(user => 
      user.email?.toLowerCase().trim() === normalizedEmail
    )

    return NextResponse.json({ exists: userExists })
  } catch (error) {
    console.error('Error in check-user route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

