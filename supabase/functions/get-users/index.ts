// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Hello from Functions!")

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { page, rowsPerPage, searchTerm, roleFilter } = await req.json();
    console.log('🔍 get-users function: Params received:', { page, rowsPerPage, searchTerm, roleFilter });
    const from = (page - 1) * rowsPerPage;
    const to = from + rowsPerPage - 1;

    let query = supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email, role, grade, teacher_id, created_at, updated_at, last_active_at, avatar_url', { count: 'exact' });

    if (roleFilter && roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }

    if (searchTerm) {
      const searchParts = searchTerm.split(' ').filter((part: string) => part);
      if (searchParts.length > 1) {
        query = query.ilike('first_name', `%${searchParts[0]}%`);
        query = query.ilike('last_name', `%${searchParts[1]}%`);
      } else {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }
    }

    const { data: profiles, error: profilesError, count } = await query.range(from, to);
    console.log('🔍 get-users function: Query result - count:', count, 'profiles:', profiles?.length);
    console.log('🔍 get-users function: First profile sample:', profiles?.[0]);
    if (profilesError) {
      console.error('❌ get-users function: Profile query error:', profilesError);
      // Return empty result instead of throwing error
      return new Response(JSON.stringify({ users: [], count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    if (!profiles) {
      console.log('⚠️ get-users function: No profiles returned');
      return new Response(JSON.stringify({ users: [], count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const userIds = profiles.map((p: any) => p.id);
    const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1, // We fetch all corresponding users, not ideal but listUsers is limited
      perPage: userIds.length,
    });
    
    // This is a workaround as listUsers doesn't allow filtering by IDs.
    // We filter manually after fetching a potentially larger list.
    const relevantAuthUsers = authUsers.users.filter((u: any) => userIds.includes(u.id));

    if (authUsersError) {
      // Return empty result instead of throwing error
      return new Response(JSON.stringify({ users: [], count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const authUsersMap = new Map(relevantAuthUsers.map((u: any) => [u.id, u]));

    const combinedUsers = profiles.map((p: any) => {
      const authUser = authUsersMap.get(p.id);
      return {
        ...p,
        email_confirmed_at: authUser ? authUser.email_confirmed_at : null,
        // Use last_active_at from profiles table (falls back to last_sign_in_at if null)
        last_active_at: p.last_active_at || (authUser ? authUser.last_sign_in_at : null),
      };
    });

    return new Response(JSON.stringify({ users: combinedUsers, count: count }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-users' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
