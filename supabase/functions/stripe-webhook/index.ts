import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'stripe-signature, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  console.log('🎣 [Webhook] Stripe webhook invoked');
  console.log('📋 [Webhook] Request method:', req.method);
  console.log('📋 [Webhook] Request headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ [Webhook] CORS preflight handled');
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }
  
  try {
    // Initialize Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    console.log('🔑 [Webhook] Environment check:', {
      hasStripeKey: !!stripeKey,
      hasWebhookSecret: !!webhookSecret
    });
    
    if (!stripeKey) {
      console.error('❌ [Webhook] STRIPE_SECRET_KEY is not set');
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })
    console.log('✅ [Webhook] Stripe initialized');

    // Initialize Supabase client with service role key for admin operations
    console.log('📦 [Webhook] Initializing Supabase client with service role');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the signature from headers
    const signature = req.headers.get('stripe-signature')
    console.log('📝 [Webhook] Signature exists:', !!signature);
    if (!signature) {
      console.error('❌ [Webhook] No signature provided');
      throw new Error('No signature provided')
    }

    // Get raw body for signature verification
    const body = await req.text()
    console.log('📦 [Webhook] Body length:', body.length);
    
    // Verify webhook signature (if webhook secret is configured)
    let event: Stripe.Event
    
    if (webhookSecret) {
      console.log('🔐 [Webhook] Verifying webhook signature...');
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
        console.log('✅ [Webhook] Signature verified');
      } catch (err) {
        console.error('❌ [Webhook] Signature verification failed:', err.message)
        return new Response(
          JSON.stringify({ error: 'Webhook signature verification failed' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } else {
      // For testing without webhook secret
      console.warn('⚠️ [Webhook] STRIPE_WEBHOOK_SECRET not set - skipping signature verification')
      event = JSON.parse(body)
    }

    console.log('🎯 [Webhook] Received event type:', event.type);
    console.log('📋 [Webhook] Event ID:', event.id);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('💰 [Webhook] Processing checkout.session.completed');
        console.log('📋 [Webhook] Session ID:', session.id);
        console.log('📋 [Webhook] Payment Intent:', session.payment_intent);
        console.log('📋 [Webhook] Payment Status:', session.payment_status);

        // Extract metadata
        const courseId = session.metadata?.course_id
        const userId = session.metadata?.user_id || session.client_reference_id
        
        console.log('🔍 [Webhook] Metadata:', {
          courseId,
          userId,
          metadata: session.metadata
        });

        if (!courseId || !userId) {
          console.error('❌ [Webhook] Missing course_id or user_id in session metadata');
          console.error('📋 [Webhook] Available data:', {
            metadata: session.metadata,
            client_reference_id: session.client_reference_id
          });
          break
        }

        console.log('✅ [Webhook] Valid metadata found:', { courseId, userId });

        // Update payment record to completed
        console.log('💾 [Webhook] Updating payment record to completed...');
        const updateData = {
          status: 'completed',
          stripe_payment_intent_id: session.payment_intent as string,
          payment_method: session.payment_method_types?.[0] || 'card',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        console.log('📝 [Webhook] Update data:', updateData);

        const { data: updatedPayment, error: updateError } = await supabaseClient
          .from('course_payments')
          .update(updateData)
          .eq('stripe_session_id', session.id)
          .select()

        if (updateError) {
          console.error('❌ [Webhook] Error updating payment record:', updateError)
          console.error('📋 [Webhook] Error details:', {
            message: updateError.message,
            code: updateError.code,
            details: updateError.details
          });
          break
        }

        console.log('✅ [Webhook] Payment record updated:', updatedPayment);
        console.log('📊 [Webhook] Updated count:', updatedPayment?.length || 0);

        // Check if user is already enrolled in the course
        console.log('🔍 [Webhook] Checking existing enrollment...');
        const { data: existingEnrollment, error: enrollCheckError } = await supabaseClient
          .from('course_members')
          .select('id')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .single()

        console.log('📊 [Webhook] Enrollment check result:', {
          exists: !!existingEnrollment,
          error: enrollCheckError?.code
        });

        if (!existingEnrollment) {
          // Enroll user in the course
          console.log('📝 [Webhook] Enrolling user in course...');
          const enrollmentData = {
            user_id: userId,
            course_id: courseId,
            role: 'student',
            enrolled_at: new Date().toISOString(),
          };
          console.log('📋 [Webhook] Enrollment data:', enrollmentData);

          const { data: enrolledData, error: enrollError } = await supabaseClient
            .from('course_members')
            .insert(enrollmentData)
            .select()

          if (enrollError) {
            console.error('❌ [Webhook] Error enrolling user in course:', enrollError)
            console.error('📋 [Webhook] Enrollment error details:', {
              message: enrollError.message,
              code: enrollError.code,
              details: enrollError.details
            });
          } else {
            console.log('✅ [Webhook] User enrolled in course successfully:', enrolledData)
          }
        } else {
          console.log('ℹ️ [Webhook] User already enrolled in course')
        }

        // Send in-app notification and email to user
        try {
          console.log('📧 [Webhook] Preparing notifications...');
          const { data: course } = await supabaseClient
            .from('courses')
            .select('title, subtitle')
            .eq('id', courseId)
            .single()

          const { data: userProfile } = await supabaseClient
            .from('profiles')
            .select('email, first_name, last_name')
            .eq('id', userId)
            .single()

          console.log('👤 [Webhook] User profile:', {
            email: userProfile?.email,
            name: `${userProfile?.first_name} ${userProfile?.last_name}`
          });

          if (course) {
            // Send in-app notification
            await supabaseClient.from('notifications').insert({
              user_id: userId,
              title: 'Course Purchase Successful',
              message: `You have successfully purchased "${course.title}". You can now access all course content.`,
              type: 'info',
              notification_type: 'course_enrollment',
              action_url: `/dashboard/courses/${courseId}`,
              read: false,
            })
            console.log('✅ [Webhook] In-app notification sent');

            // Send email confirmation
            if (userProfile?.email) {
              try {
                console.log('📧 [Webhook] Sending payment confirmation email to:', userProfile.email);
                
                const appUrl = Deno.env.get('APP_URL') || 'http://localhost:8080';
                const appName = Deno.env.get('APP_NAME') || 'DIL LMS';
                const noReplyEmail = 'noreply@dil.org';
                
                const userName = userProfile.first_name 
                  ? `${userProfile.first_name} ${userProfile.last_name || ''}`.trim()
                  : 'Student';
                
                const amountPaid = (session.amount_total || 0) / 100;
                const currency = (session.currency || 'usd').toUpperCase();
                
                // Format the email HTML
                const emailHtml = `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>Payment Confirmation</title>
                      <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
                        .header h1 { margin: 0; font-size: 28px; }
                        .content { padding: 30px; }
                        .success-badge { background: #10b981; color: white; display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
                        .course-info { background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }
                        .course-title { font-size: 20px; font-weight: bold; color: #667eea; margin: 0 0 10px 0; }
                        .payment-details { background: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0; }
                        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                        .detail-label { font-weight: 600; color: #6b7280; }
                        .detail-value { color: #111827; }
                        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
                        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
                        .footer a { color: #667eea; text-decoration: none; }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <div class="header">
                          <h1>🎉 Payment Successful!</h1>
                        </div>
                        <div class="content">
                          <p>Hi ${userName},</p>
                          <div class="success-badge">✓ Payment Confirmed</div>
                          <p>Thank you for your purchase! Your payment has been successfully processed, and you now have full access to your course.</p>
                          
                          <div class="course-info">
                            <h2 class="course-title">${course.title}</h2>
                            ${course.subtitle ? `<p style="color: #6b7280; margin: 0;">${course.subtitle}</p>` : ''}
                          </div>
                          
                          <div class="payment-details">
                            <h3 style="margin-top: 0; color: #111827;">Payment Details</h3>
                            <div class="detail-row">
                              <span class="detail-label">Transaction ID:</span>
                              <span class="detail-value">${session.id}</span>
                            </div>
                            <div class="detail-row">
                              <span class="detail-label">Amount Paid:</span>
                              <span class="detail-value">${currency} ${amountPaid.toFixed(2)}</span>
                            </div>
                            <div class="detail-row">
                              <span class="detail-label">Payment Method:</span>
                              <span class="detail-value">${session.payment_method_types?.[0] || 'Card'}</span>
                            </div>
                            <div class="detail-row" style="border-bottom: none;">
                              <span class="detail-label">Date:</span>
                              <span class="detail-value">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                          </div>
                          
                          <p>You can start learning right away! Click the button below to access your course:</p>
                          
                          <div style="text-align: center;">
                            <a href="${appUrl}/dashboard/courses/${courseId}/content" class="button">Start Learning Now →</a>
                          </div>
                          
                          <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                            Thank you for choosing ${appName}. We hope you enjoy your learning experience!
                          </p>
                        </div>
                        <div class="footer">
                          <p style="margin: 0 0 10px 0;">
                            <strong>${appName}</strong>
                          </p>
                          <p style="margin: 0;">
                            <a href="${appUrl}">Visit Dashboard</a> | 
                            <a href="${appUrl}/dashboard/courses">My Courses</a>
                          </p>
                          <p style="margin: 15px 0 0 0; font-size: 12px;">
                            This is an automated message from ${noReplyEmail}. Please do not reply to this email.
                          </p>
                          <p style="margin: 5px 0 0 0; font-size: 12px;">
                            © ${new Date().getFullYear()} ${appName}. All rights reserved.
                          </p>
                        </div>
                      </div>
                    </body>
                  </html>
                `;

                // Send email via send-email edge function
                try {
                  console.log('📧 [Webhook] Calling send-email function...');
                  
                  const supabaseUrl = Deno.env.get('SUPABASE_URL');
                  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
                  
                  const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${serviceRoleKey}`,
                    },
                    body: JSON.stringify({
                      to: userProfile.email,
                      subject: `Payment Confirmed - ${course.title}`,
                      html: emailHtml,
                      from: noReplyEmail,
                      fromName: appName,
                    }),
                  });

                  if (!emailResponse.ok) {
                    const errorData = await emailResponse.text();
                    console.error('❌ [Webhook] Email service error:', errorData);
                  } else {
                    const result = await emailResponse.json();
                    console.log('✅ [Webhook] Email sent successfully:', result);
                  }
                } catch (emailSendError) {
                  console.error('❌ [Webhook] Failed to send email:', emailSendError.message);
                  // Don't fail the webhook if email fails
                }
              } catch (emailError) {
                console.error('❌ [Webhook] Error preparing email:', emailError);
                // Don't fail the webhook for email errors
              }
            }
          }
        } catch (notifError) {
          console.error('❌ [Webhook] Error sending notifications:', notifError)
          // Don't fail the webhook for notification errors
        }

        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('Checkout session expired:', session.id)

        // Update payment record to failed
        await supabaseClient
          .from('course_payments')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
            metadata: {
              error: 'Session expired',
            },
          })
          .eq('stripe_session_id', session.id)

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment failed:', paymentIntent.id)

        // Update payment record
        await supabaseClient
          .from('course_payments')
          .update({
            status: 'failed',
            stripe_payment_intent_id: paymentIntent.id,
            updated_at: new Date().toISOString(),
            metadata: {
              error: paymentIntent.last_payment_error?.message || 'Payment failed',
            },
          })
          .eq('stripe_payment_intent_id', paymentIntent.id)

        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        console.log('Charge refunded:', charge.id)

        // Update payment record to refunded
        await supabaseClient
          .from('course_payments')
          .update({
            status: 'refunded',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', charge.payment_intent as string)

        // Note: You might want to revoke course access here
        // or mark it differently in your course_members table

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    console.log('✅ [Webhook] Webhook processed successfully');
    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ [Webhook] Fatal error processing webhook:', error)
    console.error('📋 [Webhook] Error details:', {
      message: error.message,
      stack: error.stack
    });
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

