// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Export Login Attempts Function")

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Verify the user is admin or super_user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Check user role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_user')) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const { searchTerm } = await req.json();
    console.log('🔍 export-login-attempts function: Params:', { searchTerm });

    // Query all login attempts (no pagination, no time filter - matches UI behavior)
    let query = supabaseAdmin
      .from('login_attempts')
      .select('*')
      .order('attempt_time', { ascending: false });

    if (searchTerm) {
      query = query.ilike('email', `%${searchTerm}%`);
    }

    const { data: loginAttempts, error: loginAttemptsError } = await query;

    if (loginAttemptsError) {
      console.error('❌ export-login-attempts function: Query error:', loginAttemptsError);
      return new Response(JSON.stringify({ error: loginAttemptsError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Format the data for export
    const exportData = loginAttempts.map((attempt: any) => ({
      id: attempt.id,
      email: attempt.email,
      ip_address: attempt.ip_address || 'N/A',
      user_agent: attempt.user_agent || 'N/A',
      attempt_time: attempt.attempt_time,
      success: attempt.success ? 'Success' : 'Failed',
      failure_reason: attempt.failure_reason || 'N/A',
      metadata: JSON.stringify(attempt.metadata || {}),
    }));

    console.log(`✅ export-login-attempts function: Returning ${exportData.length} login attempts`);

    return new Response(JSON.stringify({ attempts: exportData, count: exportData.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('❌ export-login-attempts function: Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
