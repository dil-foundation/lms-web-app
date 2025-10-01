import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 [Checkout] Function invoked');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ [Checkout] CORS preflight handled');
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('📋 [Checkout] Starting checkout session creation');
    
    // Initialize Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    console.log('🔑 [Checkout] Stripe key exists:', !!stripeKey);
    if (!stripeKey) {
      console.error('❌ [Checkout] STRIPE_SECRET_KEY is not set');
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })
    console.log('✅ [Checkout] Stripe initialized');

    // Initialize Supabase client with user auth for validation
    console.log('📦 [Checkout] Initializing Supabase client (user auth)');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from auth header
    console.log('👤 [Checkout] Getting user from auth header');
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('❌ [Checkout] User auth failed:', userError);
      throw new Error('Unauthorized')
    }
    console.log('✅ [Checkout] User authenticated:', user.id);

    // Initialize admin client for database operations (bypasses RLS)
    console.log('📦 [Checkout] Initializing admin client for database operations');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    console.log('✅ [Checkout] Admin client initialized');

    // Parse request body
    console.log('📝 [Checkout] Parsing request body');
    const { courseId } = await req.json()
    console.log('📚 [Checkout] Course ID:', courseId);

    if (!courseId) {
      console.error('❌ [Checkout] Course ID is missing');
      throw new Error('Course ID is required')
    }

    // Get course details
    console.log('📚 [Checkout] Fetching course details for:', courseId);
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select('id, title, subtitle, payment_type, course_price')
      .eq('id', courseId)
      .single()

    console.log('📊 [Checkout] Course query result:', { course, error: courseError });

    if (courseError || !course) {
      console.error('❌ [Checkout] Course not found:', courseError);
      throw new Error('Course not found')
    }

    console.log('✅ [Checkout] Course found:', {
      title: course.title,
      payment_type: course.payment_type,
      price: course.course_price
    });

    // Check if course is paid
    if (course.payment_type !== 'paid' || course.course_price <= 0) {
      console.error('❌ [Checkout] Course is free:', {
        payment_type: course.payment_type,
        price: course.course_price
      });
      throw new Error('This course is free')
    }

    // Check if user already paid for this course (use admin to bypass RLS)
    console.log('🔍 [Checkout] Checking existing payments for user:', user.id);
    const { data: existingPayment, error: paymentCheckError } = await supabaseAdmin
      .from('course_payments')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('status', 'completed')
      .single()

    console.log('💳 [Checkout] Existing payment check:', { 
      existingPayment, 
      error: paymentCheckError?.code 
    });

    if (existingPayment) {
      console.warn('⚠️ [Checkout] User already paid for this course');
      throw new Error('You have already purchased this course')
    }

    // Get user profile for customer details
    console.log('👤 [Checkout] Fetching user profile');
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single()

    const customerEmail = profile?.email || user.email || ''
    const customerName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : ''
    console.log('✅ [Checkout] Customer details:', { customerEmail, customerName });

    // Determine success and cancel URLs
    const origin = req.headers.get('origin') || 'http://localhost:8080'
    const successUrl = `${origin}/dashboard/courses/${courseId}?payment=success`
    const cancelUrl = `${origin}/dashboard/courses/${courseId}?payment=cancelled`
    console.log('🔗 [Checkout] Redirect URLs:', { successUrl, cancelUrl });

    // Create Stripe Checkout Session
    console.log('💳 [Checkout] Creating Stripe checkout session...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: course.title,
              description: course.subtitle || 'Online Course',
            },
            unit_amount: course.course_price, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      client_reference_id: user.id, // Store user ID for webhook
      metadata: {
        course_id: courseId,
        user_id: user.id,
        course_title: course.title,
      },
    })

    console.log('✅ [Checkout] Stripe session created:', {
      sessionId: session.id,
      url: session.url
    });

    // Create pending payment record using admin client (bypasses RLS)
    console.log('💾 [Checkout] Creating payment record in database...');
    const paymentRecord = {
      user_id: user.id,
      course_id: courseId,
      stripe_session_id: session.id,
      amount: course.course_price,
      currency: 'usd',
      status: 'pending',
      customer_email: customerEmail,
      customer_name: customerName,
      metadata: {
        course_title: course.title,
        session_url: session.url,
      },
    };
    console.log('📝 [Checkout] Payment record data:', paymentRecord);
    console.log('🔐 [Checkout] Using admin client to bypass RLS...');

    const { data: insertedPayment, error: paymentError } = await supabaseAdmin
      .from('course_payments')
      .insert(paymentRecord)
      .select()
      .single()

    if (paymentError) {
      console.error('❌ [Checkout] Error creating payment record:', paymentError)
      console.error('📋 [Checkout] Payment error details:', {
        message: paymentError.message,
        code: paymentError.code,
        details: paymentError.details,
        hint: paymentError.hint
      });
      // Don't throw - the session is already created
    } else {
      console.log('✅ [Checkout] Payment record created:', insertedPayment);
    }

    console.log('🎉 [Checkout] Checkout session creation complete');
    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ [Checkout] Fatal error:', error)
    console.error('📋 [Checkout] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

