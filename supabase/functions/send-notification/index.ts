import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Notification types supported by this function
type NotificationType = 
  | "new_discussion"
  | "new_message"
  | "message_deleted"
  | "conversation_deleted";

interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  targetUsers?: string[]; // User IDs to notify
  targetRoles?: string[]; // Roles to notify
  targetDiscussionId?: string; // For discussion-specific notifications
}

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

// Get user IDs based on different targeting options
async function getTargetUserIds(
  supabaseAdmin: any,
  payload: NotificationPayload
): Promise<string[]> {
  let userIds: string[] = [];

  // If specific users are provided, use them
  if (payload.targetUsers && payload.targetUsers.length > 0) {
    userIds = payload.targetUsers;
  }
  // If roles are provided, get users with those roles
  else if (payload.targetRoles && payload.targetRoles.length > 0) {
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .in('role', payload.targetRoles);
    
    if (usersError) throw usersError;
    userIds = users.map(user => user.id);
  }
  // If discussion ID is provided, get participants
  else if (payload.targetDiscussionId) {
    const { data: participants, error: participantsError } = await supabaseAdmin
      .from("discussion_participants")
      .select("role")
      .eq("discussion_id", payload.targetDiscussionId);

    if (participantsError) throw participantsError;
    const roles = participants.map((p: any) => p.role);

    if (roles.length > 0) {
      const { data: users, error: usersError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .in('role', roles);
      
      if (usersError) throw usersError;
      userIds = users.map(user => user.id);
    }
  }

  return userIds;
}

// Send FCM notifications
async function sendFCMNotifications(
  tokens: string[],
  payload: NotificationPayload,
  accessToken: string,
  projectId: string,
  supabaseAdmin: any
) {
  const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const appUrl = Deno.env.get("APP_URL") || "https://dil-dev.lms-staging.com/";
  const appLogo = Deno.env.get("APP_LOGO") || "https://yfaiauooxwvekdimfeuu.supabase.co/storage/v1/object/public/dil-lms-public/dil-logo.png";

  const invalidTokens: string[] = [];

  for (const token of tokens) {
    const message = {
      message: {
        token: token,
        data: {
          type: payload.type,
          title: payload.title,
          body: payload.body,
          image: appLogo,
          url: appUrl,
          ...payload.data
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
        
        // Check if token is invalid
        if (fcmResponse.status === 404) {
          try {
            const errorData = JSON.parse(errorBody);
            if (errorData.error?.details?.[0]?.errorCode === "UNREGISTERED") {
              invalidTokens.push(token);
              console.log(`Token is invalid (UNREGISTERED): ${token.substring(0, 20)}...`);
            }
          } catch (parseError) {
            console.error("Failed to parse error response:", parseError);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to send notification:`, error.message);
    }
  }

  // Remove invalid tokens from database
  if (invalidTokens.length > 0) {
    try {
      const { error: deleteError } = await supabaseAdmin
        .from('fcm_tokens')
        .delete()
        .in('token', invalidTokens);
      
      if (deleteError) {
        console.error("Failed to delete invalid tokens:", deleteError);
      } else {
        console.log(`Removed ${invalidTokens.length} invalid tokens from database`);
      }
    } catch (error) {
      console.error("Error removing invalid tokens:", error);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();

    // Validate required fields
    if (!payload.type || !payload.title || !payload.body) {
      throw new Error("Missing required fields: type, title, and body are required.");
    }

    // Validate targeting options
    const hasTargeting = payload.targetUsers || payload.targetRoles || payload.targetDiscussionId;
    if (!hasTargeting) {
      throw new Error("Must provide at least one targeting option: targetUsers, targetRoles, or targetDiscussionId.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check admin settings for notification preferences
    const { data: adminSettings, error: settingsError } = await supabaseAdmin.rpc('get_admin_settings');
    if (settingsError) {
      console.error("Error fetching admin settings:", settingsError);
      // Continue with default behavior if settings can't be fetched
    }

    const settings = adminSettings && adminSettings.length > 0 ? adminSettings[0] : {
      system_notifications: true,
      push_notifications: false
    };

    // If system notifications are disabled, skip all notifications
    if (!settings.system_notifications) {
      console.log("System notifications are disabled, skipping notification");
      return new Response(JSON.stringify({ success: true, message: "Notifications skipped - system notifications disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get target user IDs
    const userIds = await getTargetUserIds(supabaseAdmin, payload);

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No users to notify." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create notifications in database for all target users (always save to database)
    const notificationPromises = userIds.map(userId => 
      supabaseAdmin
        .from('notifications')
        .insert({
          user_id: userId,
          title: payload.title,
          message: payload.body,
          type: 'info', // Default type, can be enhanced later
          notification_type: payload.type,
          read: false,
          action_url: payload.data?.url || null,
          action_data: payload.data || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
    );

    // Wait for all notifications to be created
    await Promise.all(notificationPromises);

    // Send FCM notifications only if push notifications are enabled
    if (settings.push_notifications) {
      const { data: tokensResult, error: tokensError } = await supabaseAdmin.rpc('get_fcm_tokens_for_users', { user_ids: userIds });
      if (tokensError) {
        console.error("Error fetching FCM tokens:", tokensError);
      } else {
        const tokens = tokensResult.map((t: any) => t.token);
        
        if (tokens && tokens.length > 0) {
          try {
            const accessToken = await getGoogleAuthToken();
            const projectId = Deno.env.get("FIREBASE_PROJECT_ID")!;
            
            if (!projectId) {
              throw new Error("FIREBASE_PROJECT_ID environment variable is not set");
            }
            
            await sendFCMNotifications(tokens, payload, accessToken, projectId, supabaseAdmin);
          } catch (error) {
            console.error("Error sending FCM notifications:", error);
            // Don't fail the entire request if FCM fails
          }
        }
      }
    } else {
      console.log("Push notifications are disabled, skipping FCM notifications");
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
