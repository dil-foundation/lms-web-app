import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ZoomMeetingRequest {
  topic: string;
  type: number; // 1 = instant, 2 = scheduled
  start_time?: string; // ISO 8601 format
  duration: number; // in minutes
  timezone?: string;
  password?: string;
  agenda?: string;
  settings?: {
    host_video?: boolean;
    participant_video?: boolean;
    join_before_host?: boolean;
    mute_upon_entry?: boolean;
    waiting_room?: boolean;
    auto_recording?: string;
  };
}

interface ZoomMeetingResponse {
  uuid?: string;
  id: number;
  host_id: string;
  host_email: string;
  topic: string;
  type: number;
  status: string;
  start_time: string;
  duration: number;
  timezone: string;
  agenda: string;
  created_at: string;
  start_url: string;
  join_url: string;
  password: string;
  settings: any;
}

// Get OAuth token for Zoom API authentication
async function getZoomOAuthToken(accountId: string, clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'account_credentials',
      account_id: accountId,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OAuth token error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Create Zoom meeting
async function createZoomMeeting(
  accountId: string,
  clientId: string,
  clientSecret: string,
  userId: string, 
  meetingData: ZoomMeetingRequest
): Promise<ZoomMeetingResponse> {
  const accessToken = await getZoomOAuthToken(accountId, clientId, clientSecret);
  
  const response = await fetch(`https://api.zoom.us/v2/users/${userId}/meetings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(meetingData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zoom API error: ${response.status} - ${error}`);
  }

  return await response.json();
}

// Update Zoom meeting
async function updateZoomMeeting(
  accountId: string,
  clientId: string,
  clientSecret: string,
  meetingId: string,
  meetingData: Partial<ZoomMeetingRequest>
): Promise<void> {
  const accessToken = await getZoomOAuthToken(accountId, clientId, clientSecret);
  
  const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(meetingData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zoom API error: ${response.status} - ${error}`);
  }
}

// Delete Zoom meeting
async function deleteZoomMeeting(
  accountId: string,
  clientId: string,
  clientSecret: string,
  meetingId: string
): Promise<void> {
  const accessToken = await getZoomOAuthToken(accountId, clientId, clientSecret);
  
  const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zoom API error: ${response.status} - ${error}`);
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get Zoom credentials from integrations table
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('settings')
      .eq('name', 'zoom')
      .eq('status', 'enabled')
      .single()

    if (integrationError || !integration) {
      throw new Error('Zoom integration not configured')
    }

    const { account_id, client_id, client_secret, user_id } = integration.settings

    if (!account_id || !client_id || !client_secret || !user_id) {
      throw new Error('Missing Zoom credentials')
    }

    const { action, meetingData, meetingId } = await req.json()

    let result

    switch (action) {
      case 'create':
        const zoomMeetingData: ZoomMeetingRequest = {
          topic: meetingData.title || 'Meeting',
          type: 2, // Scheduled meeting
          start_time: meetingData.scheduled_time,
          duration: meetingData.duration || 60,
          timezone: 'UTC',
          agenda: meetingData.description || '',
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: true,
            mute_upon_entry: true,
            waiting_room: false,
            auto_recording: 'none'
          }
        }

        const meeting = await createZoomMeeting(account_id, client_id, client_secret, user_id, zoomMeetingData)
        
        result = {
          meeting_id: meeting.id.toString(),
          join_url: meeting.join_url,
          host_url: meeting.start_url,
          password: meeting.password
        }
        break

      case 'update':
        await updateZoomMeeting(account_id, client_id, client_secret, meetingId, meetingData)
        result = { success: true }
        break

      case 'delete':
        await deleteZoomMeeting(account_id, client_id, client_secret, meetingId)
        result = { success: true }
        break

      default:
        throw new Error('Invalid action')
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Zoom Meeting Manager Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
