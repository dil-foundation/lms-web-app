import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ThumbnailRequest {
  courseId: string;
  title: string;
  description?: string;
  prompt: string;
  style: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { courseId, title, description, prompt, style }: ThumbnailRequest = await req.json()

    if (!courseId || !title || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: courseId, title, prompt' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found')
    }

    // Call OpenAI DALL-E API
    const openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1792x1024', // 16:9 aspect ratio
        quality: 'standard',
        style: 'natural'
      })
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const openaiData = await openaiResponse.json()
    const imageUrl = openaiData.data[0].url

    if (!imageUrl) {
      throw new Error('No image URL returned from OpenAI')
    }

    // Download the image and upload to Supabase Storage
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error('Failed to download generated image')
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' })

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `course-thumbnails/${courseId}/${timestamp}-${style}.png`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('dil-lms')
      .upload(filename, imageBlob, {
        contentType: 'image/png',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Storage upload error: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('dil-lms')
      .getPublicUrl(filename)

    const publicUrl = urlData.publicUrl

    // Save thumbnail record to database
    const { error: dbError } = await supabaseClient
      .from('course_thumbnails')
      .insert({
        course_id: courseId,
        title: title,
        description: description,
        prompt: prompt,
        style: style,
        image_url: filename,
        public_url: publicUrl,
        generated_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('Database error:', dbError)
      // Don't fail the request if database save fails
    }

    // Update course with new thumbnail
    const { error: updateError } = await supabaseClient
      .from('courses')
      .update({ 
        image_url: filename,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId)

    if (updateError) {
      console.error('Course update error:', updateError)
      // Don't fail the request if course update fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: publicUrl,
        filename: filename,
        prompt: prompt
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in generate-course-thumbnail:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
