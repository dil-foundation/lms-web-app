import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    })
  }

  try {
    console.log('💰 [Process Refund] Function invoked');
    
    // Initialize Supabase client with user auth for validation
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
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('❌ [Process Refund] User auth failed:', userError);
      throw new Error('Unauthorized')
    }
    console.log('✅ [Process Refund] User authenticated:', user.id);

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      console.error('❌ [Process Refund] User is not an admin');
      throw new Error('Unauthorized: Admin access required')
    }
    console.log('✅ [Process Refund] User is admin');

    // Parse request body
    const { paymentId, reason } = await req.json()
    console.log('📝 [Process Refund] Payment ID:', paymentId);
    console.log('📝 [Process Refund] Reason:', reason);

    if (!paymentId) {
      throw new Error('Payment ID is required')
    }

    // Initialize admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('course_payments')
      .select('*, user:profiles(email, first_name, last_name), course:courses(title)')
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      console.error('❌ [Process Refund] Payment not found:', paymentError);
      throw new Error('Payment not found')
    }

    // Check if payment can be refunded
    if (payment.status !== 'completed') {
      throw new Error(`Cannot refund payment with status: ${payment.status}`)
    }

    if (!payment.stripe_payment_intent_id) {
      throw new Error('No Stripe payment intent ID found')
    }

    console.log('💳 [Process Refund] Payment found:', payment.id);
    console.log('💳 [Process Refund] Stripe Payment Intent:', payment.stripe_payment_intent_id);

    // Initialize Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured')
    }
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Create refund in Stripe
    console.log('🔄 [Process Refund] Creating refund in Stripe...');
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      reason: 'requested_by_customer', // Stripe accepts: duplicate, fraudulent, requested_by_customer
      metadata: {
        refund_reason: reason || 'Admin refund',
        refunded_by: user.id,
        payment_id: paymentId,
      },
    })

    console.log('✅ [Process Refund] Stripe refund created:', refund.id);

    // Update payment record in database
    // Note: The webhook will also update this, but we do it here for immediate feedback
    const { error: updateError } = await supabaseAdmin
      .from('course_payments')
      .update({
        status: 'refunded',
        updated_at: new Date().toISOString(),
        metadata: {
          ...(payment.metadata || {}),
          refund_id: refund.id,
          refund_reason: reason,
          refunded_at: new Date().toISOString(),
          refunded_by: user.id,
        },
      })
      .eq('id', paymentId)

    if (updateError) {
      console.error('⚠️ [Process Refund] Error updating payment record:', updateError);
      // Don't throw error here as the refund was already processed in Stripe
      // The webhook will update the status
    } else {
      console.log('✅ [Process Refund] Payment record updated');
    }

    // Note: We intentionally do NOT revoke course access on refund
    // This allows students to:
    // 1. Continue viewing course content they already paid for once
    // 2. Purchase the course again if they want to in the future
    // The refunded status in course_payments table tracks the refund
    console.log('📚 [Process Refund] Keeping course access - student can still view content and re-purchase');

    // Send notification email (optional)
    try {
      const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          to: payment.user?.email || payment.customer_email,
          subject: 'Refund Processed',
          html: `
            <h2>Your refund has been processed</h2>
            <p>We've processed a refund for your purchase of <strong>${payment.course?.title || 'a course'}</strong>.</p>
            <p><strong>Amount:</strong> $${(payment.amount / 100).toFixed(2)}</p>
            <p><strong>Refund ID:</strong> ${refund.id}</p>
            <p>The refund should appear in your account within 5-10 business days.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          `,
        }),
      });

      if (emailResponse.ok) {
        console.log('✅ [Process Refund] Notification email sent');
      } else {
        console.error('⚠️ [Process Refund] Error sending notification email:', await emailResponse.text());
      }
    } catch (emailError) {
      console.error('⚠️ [Process Refund] Error sending notification email:', emailError);
      // Don't throw error - email is optional
    }

    // Note: Push notification will be sent by webhook when Stripe confirms the refund
    console.log('📬 [Process Refund] Notification will be sent via webhook after Stripe confirms refund');

    return new Response(
      JSON.stringify({
        success: true,
        refund: {
          id: refund.id,
          amount: refund.amount,
          status: refund.status,
        },
        message: 'Refund processed successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ [Process Refund] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred while processing the refund',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

