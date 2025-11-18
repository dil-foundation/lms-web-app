// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Export Blocked Users Function")

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

    console.log('🔍 export-blocked-users function: Fetching all blocked users');

    // Query all currently blocked users (no pagination)
    const { data: blockedUsers, error: blockedUsersError } = await supabaseAdmin
      .from('blocked_users')
      .select('*')
      .eq('is_active', true)
      .gte('blocked_until', new Date().toISOString())
      .order('blocked_at', { ascending: false });

    if (blockedUsersError) {
      console.error('❌ export-blocked-users function: Query error:', blockedUsersError);
      return new Response(JSON.stringify({ error: blockedUsersError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Format the data for export
    const exportData = blockedUsers.map((user: any) => ({
      id: user.id,
      email: user.email,
      ip_address: user.ip_address || 'N/A',
      block_reason: user.block_reason,
      blocked_at: user.blocked_at,
      blocked_until: user.blocked_until,
      attempts_count: user.attempts_count || 0,
      metadata: JSON.stringify(user.metadata || {}),
    }));

    console.log(`✅ export-blocked-users function: Returning ${exportData.length} blocked users`);

    return new Response(JSON.stringify({ users: exportData, count: exportData.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('❌ export-blocked-users function: Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
