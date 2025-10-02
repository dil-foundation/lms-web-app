import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  subject: string
  html: string
  from?: string
  fromName?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📧 [SendEmail] Function invoked');
    
    // Security: Verify the request has proper authorization
    const authHeader = req.headers.get('authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!authHeader || !authHeader.includes('Bearer')) {
      console.error('❌ [SendEmail] Missing authorization header');
      throw new Error('Unauthorized: Missing authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    if (token !== serviceRoleKey) {
      console.error('❌ [SendEmail] Invalid authorization token');
      throw new Error('Unauthorized: Invalid token');
    }
    
    console.log('✅ [SendEmail] Authorization verified');
    
    // Check for Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.error('❌ [SendEmail] RESEND_API_KEY not configured');
      throw new Error(
        'RESEND_API_KEY is required. Sign up for free at https://resend.com (3,000 emails/month)\n' +
        'Then set: supabase secrets set RESEND_API_KEY="re_your_api_key"'
      );
    }
    
    console.log('✅ [SendEmail] Using Resend API');
    
    // Parse request body
    const emailRequest: EmailRequest = await req.json();
    console.log('📨 [SendEmail] Email request:', {
      to: emailRequest.to,
      subject: emailRequest.subject,
      hasHtml: !!emailRequest.html,
      htmlLength: emailRequest.html?.length
    });

    // Validate request
    if (!emailRequest.to || !emailRequest.subject || !emailRequest.html) {
      throw new Error('Missing required fields: to, subject, html');
    }

    const defaultFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
    const defaultFromName = Deno.env.get('RESEND_FROM_NAME') || 'DIL LMS';
    const fromEmail = emailRequest.from || defaultFromEmail;
    const fromName = emailRequest.fromName || defaultFromName;

    console.log('📤 [SendEmail] Sending via Resend API...');
    console.log('📧 [SendEmail] From:', `${fromName} <${fromEmail}>`);
    
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: emailRequest.to,
        subject: emailRequest.subject,
        html: emailRequest.html,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error('❌ [SendEmail] Resend API error:', errorData);
      throw new Error(`Resend API error: ${errorData}`);
    }

    const resendData = await resendResponse.json();
    
    console.log('✅ [SendEmail] Email sent successfully via Resend');
    console.log('📧 [SendEmail] Message ID:', resendData.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        to: emailRequest.to,
        subject: emailRequest.subject,
        messageId: resendData.id,
        provider: 'resend'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ [SendEmail] Error:', error);
    console.error('📋 [SendEmail] Error details:', {
      message: error.message,
      stack: error.stack
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send email',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})

