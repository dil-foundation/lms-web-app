import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔍 [Verify Payment] Function invoked');
    
    // Initialize Supabase client with user auth for validation
    console.log('📦 [Verify Payment] Initializing Supabase client (user auth)');
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
    console.log('👤 [Verify Payment] Getting user from auth header');
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('❌ [Verify Payment] User auth failed:', userError);
      throw new Error('Unauthorized')
    }
    console.log('✅ [Verify Payment] User authenticated:', user.id);

    // Initialize admin client for database operations (bypasses RLS)
    console.log('📦 [Verify Payment] Initializing admin client for database operations');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    console.log('✅ [Verify Payment] Admin client initialized');

    // Parse request body
    console.log('📝 [Verify Payment] Parsing request body');
    const { courseId } = await req.json()
    console.log('📚 [Verify Payment] Course ID:', courseId);

    if (!courseId) {
      console.error('❌ [Verify Payment] Course ID is missing');
      throw new Error('Course ID is required')
    }

    // Get course details
    console.log('📚 [Verify Payment] Fetching course details');
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select('id, title, payment_type, course_price')
      .eq('id', courseId)
      .single()

    console.log('📊 [Verify Payment] Course query result:', { course, error: courseError });

    if (courseError || !course) {
      console.error('❌ [Verify Payment] Course not found:', courseError);
      throw new Error('Course not found')
    }

    console.log('✅ [Verify Payment] Course found:', {
      title: course.title,
      payment_type: course.payment_type,
      price: course.course_price
    });

    // If course is free, return access granted
    if (course.payment_type === 'free' || course.course_price === 0) {
      console.log('ℹ️ [Verify Payment] Course is free, granting access');
      return new Response(
        JSON.stringify({
          hasAccess: true,
          reason: 'free_course',
          course: {
            id: course.id,
            title: course.title,
            paymentType: course.payment_type,
            price: course.course_price,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Check if user has completed payment (use admin to bypass RLS)
    console.log('🔍 [Verify Payment] Checking payment status for user:', user.id);
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('course_payments')
      .select('id, status, amount, completed_at')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    console.log('💳 [Verify Payment] Payment check result:', { 
      hasPayment: !!payment, 
      error: paymentError?.code 
    });

    if (paymentError && paymentError.code !== 'PGRST116') {
      console.error('❌ [Verify Payment] Payment query error:', paymentError);
      throw paymentError
    }

    const hasAccess = !!payment

    // Check if user is enrolled (as backup check, use admin to bypass RLS)
    console.log('🔍 [Verify Payment] Checking enrollment status');
    const { data: enrollment } = await supabaseAdmin
      .from('course_members')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single()

    console.log('📊 [Verify Payment] Enrollment check result:', { 
      isEnrolled: !!enrollment 
    });

    const isEnrolled = !!enrollment

    const result = {
      hasAccess: hasAccess || isEnrolled,
      hasPaid: hasAccess,
      isEnrolled,
      reason: hasAccess ? 'payment_completed' : isEnrolled ? 'enrolled' : 'no_payment',
      course: {
        id: course.id,
        title: course.title,
        paymentType: course.payment_type,
        price: course.course_price,
      },
      payment: payment ? {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        completedAt: payment.completed_at,
      } : null,
    };

    console.log('✅ [Verify Payment] Verification complete:', {
      hasAccess: result.hasAccess,
      hasPaid: result.hasPaid,
      isEnrolled: result.isEnrolled,
      reason: result.reason
    });

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ [Verify Payment] Fatal error:', error);
    console.error('📋 [Verify Payment] Error details:', {
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

