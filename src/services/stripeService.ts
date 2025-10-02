import { supabase } from '@/integrations/supabase/client';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51SDUpw0KynFsc1sQZBPbuh7OJ9TE2BxgDRD3VRHzvEcWT81SHCLuVF4reL82jodQalATaJLOlPr4QQptFxRgNyFU00I1Iaxx5A');

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface PaymentVerificationResponse {
  hasAccess: boolean;
  hasPaid: boolean;
  isEnrolled: boolean;
  reason: string;
  course: {
    id: string;
    title: string;
    paymentType: string;
    price: number;
  };
  payment?: {
    id: string;
    status: string;
    amount: number;
    completedAt: string;
  };
}

class StripeService {
  /**
   * Create a Stripe checkout session for a course
   */
  async createCheckoutSession(courseId: string): Promise<CheckoutSessionResponse> {
    console.log('🛒 [StripeService] Creating checkout session for course:', courseId);
    
    try {
      console.log('📡 [StripeService] Invoking create-checkout-session edge function...');
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { courseId },
      });

      console.log('📊 [StripeService] Edge function response:', { data, error });

      if (error) {
        console.error('❌ [StripeService] Edge function error:', error);
        throw new Error(error.message || 'Failed to create checkout session');
      }

      console.log('✅ [StripeService] Checkout session created:', data);
      return data;
    } catch (error) {
      console.error('❌ [StripeService] Fatal error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Redirect to Stripe checkout
   */
  async redirectToCheckout(courseId: string): Promise<void> {
    console.log('🔄 [StripeService] Redirecting to checkout for course:', courseId);
    
    try {
      const { sessionId, url } = await this.createCheckoutSession(courseId);

      console.log('🔗 [StripeService] Received checkout URL:', url);
      console.log('🎫 [StripeService] Session ID:', sessionId);

      if (url) {
        console.log('➡️ [StripeService] Redirecting to Stripe checkout...');
        // Redirect to Stripe hosted checkout page
        window.location.href = url;
      } else {
        console.error('❌ [StripeService] No checkout URL returned');
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('❌ [StripeService] Error redirecting to checkout:', error);
      throw error;
    }
  }

  /**
   * Verify if user has paid for a course
   */
  async verifyPayment(courseId: string): Promise<PaymentVerificationResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { courseId },
      });

      if (error) {
        throw new Error(error.message || 'Failed to verify payment');
      }

      return data;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }

  /**
   * Check if Stripe integration is enabled
   */
  async isStripeEnabled(): Promise<boolean> {
    try {
      // Try both 'Stripe' and 'stripe' to handle case sensitivity
      let { data, error } = await supabase
        .from('integrations')
        .select('status, is_configured')
        .eq('name', 'Stripe')
        .single();

      // If not found, try lowercase
      if (error && error.code === 'PGRST116') {
        const result = await supabase
          .from('integrations')
          .select('status, is_configured')
          .eq('name', 'stripe')
          .single();
        data = result.data;
        error = result.error;
      }

      if (!error && data) {
        return data.status === 'enabled' && data.is_configured;
      }

      return false;
    } catch (error) {
      console.error('Error checking Stripe integration:', error);
      return false;
    }
  }

  /**
   * Get course pricing information
   */
  async getCoursePricing(courseId: string) {
    try {
      const { data, error } = await supabase
        .rpc('get_course_pricing_info', { course_id_param: courseId });

      if (error) {
        throw error;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error getting course pricing:', error);
      throw error;
    }
  }

  /**
   * Check if user has paid for a course (database check)
   */
  async hasUserPaidForCourse(courseId: string): Promise<boolean> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        return false;
      }

      const { data, error } = await supabase
        .rpc('has_user_paid_for_course', {
          user_id_param: session.session.user.id,
          course_id_param: courseId,
        });

      if (error) {
        console.error('Error checking payment status:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error checking payment status:', error);
      return false;
    }
  }

  /**
   * Get user's payment status for a course
   */
  async getCoursePaymentStatus(courseId: string) {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        return null;
      }

      const { data, error } = await supabase
        .rpc('get_course_payment_status', {
          user_id_param: session.session.user.id,
          course_id_param: courseId,
        });

      if (error) {
        throw error;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    }
  }

  /**
   * Format price from cents to dollars
   */
  formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export default new StripeService();

