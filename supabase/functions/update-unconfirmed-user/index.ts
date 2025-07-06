import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers to allow requests from your web app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // This is needed to handle CORS preflight requests.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Function invoked. Processing request...");
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )
    console.log("Supabase admin client initialized.");

    // Get the user ID and new metadata from the request body
    const { userId, password, metadata } = await req.json()
    console.log("Received data:", { userId, metadata });

    if (!userId || !metadata || !password) {
      console.error("Missing userId, password, or metadata in the request body.");
      return new Response(JSON.stringify({ error: 'Missing userId, password, or metadata' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Update the user's metadata
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        password: password,
        user_metadata: metadata 
      }
    )

    if (authError) {
      console.error("Error updating user metadata:", authError.message);
      throw authError
    }
    console.log("Successfully updated auth.users metadata:", authData);

    // Also update the public.profiles table
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(metadata)
      .eq('id', userId)

    if (profileError) {
      console.error("Error updating profiles table:", profileError.message);
      throw profileError;
    }
    console.log("Successfully updated profiles table:", profileData);

    return new Response(JSON.stringify({ user: authData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Caught an exception:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}) 