import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface RequestBody {
  messages: OpenAIMessage[]
  model?: string
  temperature?: number
  max_tokens?: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get the authorization header
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the user token
    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user has admin role for reports access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'teacher'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const body: RequestBody = await req.json()
    const { messages, model = 'gpt-4', temperature = 0.7, max_tokens = 1000 } = body

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        stream: false,
      }),
    })

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text()
      console.error('OpenAI API error:', errorData)
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API request failed',
          details: errorData 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const openAIData = await openAIResponse.json()
    const assistantMessage = openAIData.choices?.[0]?.message?.content

    if (!assistantMessage) {
      return new Response(
        JSON.stringify({ error: 'No response from OpenAI' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log the interaction for analytics (optional)
    try {
      await supabase
        .from('ai_report_interactions')
        .insert({
          user_id: user.id,
          query: messages[messages.length - 1]?.content || '',
          response: assistantMessage,
          tokens_used: openAIData.usage?.total_tokens || 0,
          model_used: model,
          created_at: new Date().toISOString()
        })
    } catch (logError) {
      console.error('Failed to log interaction:', logError)
      // Don't fail the request if logging fails
    }

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        response: assistantMessage,
        usage: openAIData.usage,
        model: model
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in reports-assistant function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
