import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId } = await req.json()

    if (!userId) {
      throw new Error("User ID is required.")
    }

    console.log(`Starting deletion process for user: ${userId}`)

    // Step 1: Delete from profiles table first (this will cascade to all related tables)
    console.log(`Deleting profile for user: ${userId}`)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error(`Profile deletion error:`, profileError)
      throw new Error(`Database error deleting user: ${profileError.message}`)
    }

    console.log(`Profile deleted successfully for user: ${userId}`)

    // Step 2: Delete from auth.users (this handles auth-related cleanup)
    console.log(`Deleting auth user: ${userId}`)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error(`Auth deletion error:`, authError)
      // If auth deletion fails but profile was deleted, we should log this
      // but not necessarily fail the entire operation since the user data is gone
      console.warn(`Auth user deletion failed, but profile was deleted: ${authError.message}`)
    } else {
      console.log(`Auth user deleted successfully: ${userId}`)
    }

    return new Response(JSON.stringify({ message: "User deleted successfully." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error(`User deletion failed:`, error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
