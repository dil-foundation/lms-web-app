import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, role, firstName, lastName, grade, teacherId, redirectTo } = await req.json();

    const userMetaData: { [key: string]: any } = {
      role,
      first_name: firstName,
      last_name: lastName,
      password_setup_required: true,
    };

    if (role === 'student' && grade) {
      userMetaData.grade = grade;
    } else if (role === 'teacher' && teacherId) {
      userMetaData.teacher_id = teacherId;
    }

    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: userMetaData,
      redirectTo: redirectTo,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ message: `Invitation sent to ${email}` }), {
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
