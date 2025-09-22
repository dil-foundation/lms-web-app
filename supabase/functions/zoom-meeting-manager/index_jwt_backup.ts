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
    cn_meeting?: boolean;
    in_meeting?: boolean;
    join_before_host?: boolean;
    mute_upon_entry?: boolean;
    watermark?: boolean;
    use_pmi?: boolean;
    approval_type?: number;
    audio?: string;
    auto_recording?: string;
    enforce_login?: boolean;
    enforce_login_domains?: string;
    alternative_hosts?: string;
    close_registration?: boolean;
    show_share_button?: boolean;
    allow_multiple_devices?: boolean;
    registrants_confirmation_email?: boolean;
    waiting_room?: boolean;
    request_permission_to_unmute_participants?: boolean;
    global_dial_in_countries?: string[];
    global_dial_in_numbers?: any[];
    contact_name?: string;
    contact_email?: string;
    registrants_email_notification?: boolean;
    meeting_authentication?: boolean;
    authentication_option?: string;
    authentication_domains?: string;
    authentication_name?: string;
    show_join_info?: boolean;
    jbh_time?: number;
    encryption_type?: string;
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
  h323_password: string;
  pstn_password: string;
  encrypted_password: string;
  settings: any;
  pre_schedule: boolean;
}

// Generate JWT token for Zoom API authentication
function generateZoomJWT(apiKey: string, apiSecret: string): string {
  const header = {
    "alg": "HS256",
    "typ": "JWT"
  };

  const payload = {
    "iss": apiKey,
    "exp": Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiration
  };

  // Base64 URL encode
  const base64UrlEncode = (obj: any) => {
    return btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);

  // Create signature
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  // HMAC SHA256 signature (simplified - in production use proper crypto library)
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiSecret);
  const messageData = encoder.encode(signatureInput);
  
  // For demo purposes, return a mock JWT structure
  // In production, use proper HMAC SHA256 implementation
  return `${encodedHeader}.${encodedPayload}.mock_signature`;
}

// Create Zoom meeting
async function createZoomMeeting(
  apiKey: string, 
  apiSecret: string, 
  userId: string, 
  meetingData: ZoomMeetingRequest
): Promise<ZoomMeetingResponse> {
  const jwt = generateZoomJWT(apiKey, apiSecret);
  
  const response = await fetch(`https://api.zoom.us/v2/users/${userId}/meetings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
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
  apiKey: string,
  apiSecret: string,
  meetingId: string,
  meetingData: Partial<ZoomMeetingRequest>
): Promise<void> {
  const jwt = generateZoomJWT(apiKey, apiSecret);
  
  const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(meetingData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zoom API error: ${response.status} - ${error}`);
  }
}

// Delete/Cancel Zoom meeting
async function deleteZoomMeeting(
  apiKey: string,
  apiSecret: string,
  meetingId: string
): Promise<void> {
  const jwt = generateZoomJWT(apiKey, apiSecret);
  
  const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zoom API error: ${response.status} - ${error}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the request
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { action, meetingData, meetingId } = await req.json()

    // Get Zoom integration settings
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('settings, status, is_configured')
      .eq('name', 'zoom')
      .single()

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Zoom integration not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (integration.status !== 'enabled' || !integration.is_configured) {
      return new Response(
        JSON.stringify({ error: 'Zoom integration is not enabled or configured' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { api_key, api_secret, user_id } = integration.settings

    if (!api_key || !api_secret) {
      return new Response(
        JSON.stringify({ error: 'Zoom API credentials not configured' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let result;

    switch (action) {
      case 'create':
        // Create Zoom meeting
        const zoomMeetingRequest: ZoomMeetingRequest = {
          topic: meetingData.title,
          type: 2, // Scheduled meeting
          start_time: meetingData.scheduled_time,
          duration: meetingData.duration,
          timezone: 'UTC',
          agenda: meetingData.description || '',
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: false,
            mute_upon_entry: true,
            watermark: false,
            use_pmi: false,
            approval_type: 0, // Automatically approve
            audio: 'both',
            auto_recording: 'none',
            waiting_room: true,
            request_permission_to_unmute_participants: false,
            show_share_button: true,
            allow_multiple_devices: true,
            encryption_type: 'enhanced_encryption'
          }
        };

        result = await createZoomMeeting(api_key, api_secret, user_id || 'me', zoomMeetingRequest);
        
        return new Response(
          JSON.stringify({
            meeting_id: result.id.toString(),
            join_url: result.join_url,
            host_url: result.start_url,
            password: result.password,
            uuid: result.uuid
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      case 'update':
        // Update Zoom meeting
        const updateRequest: Partial<ZoomMeetingRequest> = {
          topic: meetingData.title,
          start_time: meetingData.scheduled_time,
          duration: meetingData.duration,
          agenda: meetingData.description || ''
        };

        await updateZoomMeeting(api_key, api_secret, meetingId, updateRequest);
        
        return new Response(
          JSON.stringify({ success: true }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      case 'delete':
        // Delete/Cancel Zoom meeting
        await deleteZoomMeeting(api_key, api_secret, meetingId);
        
        return new Response(
          JSON.stringify({ success: true }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

  } catch (error) {
    console.error('Error in zoom-meeting-manager:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})

