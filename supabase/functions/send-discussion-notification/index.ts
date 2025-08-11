import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get Google OAuth token for Firebase Cloud Messaging
async function getGoogleAuthToken() {
  try {
    const privateKeyRaw = Deno.env.get("FIREBASE_PRIVATE_KEY")!;
    const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL")!;

    if (!privateKeyRaw || !clientEmail) {
      throw new Error("Missing Firebase credentials in environment variables.");
    }

    // Fix private key formatting
    const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

    // Create JWT for Google OAuth
    const now = Math.floor(Date.now() / 1000);
    const jwt = await create(
      { alg: "RS256", typ: "JWT" },
      {
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        iss: clientEmail,
        iat: now,
        exp: now + 3600,
      },
      privateKey
    );

    // Exchange JWT for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("OAuth token request failed:", errorText);
      throw new Error(`Failed to get OAuth token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error("Error getting Google OAuth token:", error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { record } = await req.json();

    if (!record || !record.id || !record.title) {
        throw new Error("Invalid or missing 'record' in request body.");
    }
    
    const discussionId = record.id;
    const discussionTitle = record.title;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: participants, error: participantsError } = await supabaseAdmin
      .from("discussion_participants")
      .select("role")
      .eq("discussion_id", discussionId);

    if (participantsError) throw participantsError;
    const roles = participants.map((p) => p.role);

    if (roles.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No participants to notify." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .in('role', roles);
    if (usersError) throw usersError;
    const userIds = users.map(user => user.id);

    if (userIds.length === 0) {
        return new Response(JSON.stringify({ success: true, message: "No users to notify." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const { data: tokensResult, error: tokensError } = await supabaseAdmin.rpc('get_fcm_tokens_for_users', { user_ids: userIds });
    if (tokensError) throw tokensError;
    const tokens = tokensResult.map((t: any) => t.token);

    if (tokens && tokens.length > 0) {
      const accessToken = await getGoogleAuthToken();
      const projectId = Deno.env.get("FIREBASE_PROJECT_ID")!;
      
      if (!projectId) {
        throw new Error("FIREBASE_PROJECT_ID environment variable is not set");
      }
      
      const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

      for (const token of tokens) {
        const message = {
          message: {
            token: token,
            notification: {
              title: "New Discussion Created",
              body: `A new discussion "${discussionTitle}" has been started.`,
            },
            data: {
              discussionId: discussionId,
              discussionTitle: discussionTitle,
              type: "new_discussion"
            }
          }
        };
        
        try {
          const fcmResponse = await fetch(fcmEndpoint, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
          });

          if (!fcmResponse.ok) {
            const errorBody = await fcmResponse.text();
            console.error(`Failed to send notification. Status: ${fcmResponse.status}, Body: ${errorBody}`);
          }
        } catch (error) {
          console.error(`Failed to send notification:`, error.message);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("An error occurred in the function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
