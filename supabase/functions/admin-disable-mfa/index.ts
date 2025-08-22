import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔐 Edge function started - admin-disable-mfa')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔐 CORS preflight request handled')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔐 Creating Supabase client...')
    
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    console.log('🔐 Getting user from auth token...')
    
    // Get the user making the request
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      console.log('🔐 User authentication failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔐 User authenticated:', user.id)

    // Check if the user is an admin
    console.log('🔐 Checking admin role...')
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      console.log('🔐 Admin check failed:', profileError, 'Role:', profile?.role)
      return new Response(
        JSON.stringify({ error: 'Access denied. Only administrators can disable MFA for users.' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔐 Admin role confirmed')

    // Get the target user ID from the request body
    console.log('🔐 Parsing request body...')
    const body = await req.json()
    console.log('🔐 Request body:', body)
    
    const { targetUserId } = body

    if (!targetUserId) {
      console.log('🔐 No target user ID provided')
      return new Response(
        JSON.stringify({ error: 'Target user ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔐 Target user ID:', targetUserId)

    // Use the database function to disable MFA
    console.log('🔐 Calling database function to disable MFA...')
    
    const { data: result, error: functionError } = await supabaseClient.rpc('admin_disable_mfa_for_user', {
      target_user_id: targetUserId
    })

    if (functionError) {
      console.log('🔐 Database function error:', functionError)
      return new Response(
        JSON.stringify({ error: 'Failed to disable MFA', details: functionError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔐 Database function result:', result)

    if (!result.success) {
      console.log('🔐 Database function returned failure:', result.error)
      return new Response(
        JSON.stringify({ error: result.error, details: result.details }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔐 Edge function completed successfully')
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'MFA disabled successfully',
        note: 'MFA factors will be removed on next user login'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('🔐 Edge function error:', error)
    console.error('🔐 Error stack:', error.stack)
    console.error('🔐 Error message:', error.message)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
