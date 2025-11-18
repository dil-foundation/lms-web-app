// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Export Access Logs Function")

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
    console.log('🔍 export-access-logs function: Search term:', searchTerm);

    // Query all access logs (no pagination)
    let query = supabaseAdmin
      .from('access_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (searchTerm) {
      query = query.or(`user_email.ilike.%${searchTerm}%,action.ilike.%${searchTerm}%`);
    }

    const { data: accessLogs, error: accessLogsError } = await query;

    if (accessLogsError) {
      console.error('❌ export-access-logs function: Query error:', accessLogsError);
      return new Response(JSON.stringify({ error: accessLogsError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Format the data for export (excluding IP address, user agent, and location)
    const exportData = accessLogs.map((log: any) => ({
      id: log.id,
      user_id: log.user_id || 'N/A',
      user_email: log.user_email || 'N/A',
      action: log.action,
      status: log.status,
      metadata: JSON.stringify(log.metadata || {}),
      created_at: log.created_at,
    }));

    console.log(`✅ export-access-logs function: Returning ${exportData.length} access logs`);

    return new Response(JSON.stringify({ logs: exportData, count: exportData.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('❌ export-access-logs function: Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
