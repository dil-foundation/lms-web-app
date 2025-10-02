-- Create course_payments table to track Stripe payments
-- This migration creates tables and functions for handling course payments via Stripe

-- Create course_payments table
CREATE TABLE IF NOT EXISTS public.course_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    stripe_session_id TEXT UNIQUE NOT NULL,
    stripe_payment_intent_id TEXT,
    amount INTEGER NOT NULL, -- Amount in cents
    currency TEXT DEFAULT 'usd',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method TEXT,
    customer_email TEXT,
    customer_name TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMPTZ,
    CONSTRAINT unique_user_course_payment UNIQUE (user_id, course_id, stripe_session_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_payments_user_id ON public.course_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_payments_course_id ON public.course_payments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_payments_status ON public.course_payments(status);
CREATE INDEX IF NOT EXISTS idx_course_payments_stripe_session_id ON public.course_payments(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_course_payments_stripe_payment_intent_id ON public.course_payments(stripe_payment_intent_id);

-- Enable RLS
ALTER TABLE public.course_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payments" ON public.course_payments
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments" ON public.course_payments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Teachers can view payments for their courses" ON public.course_payments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.course_members cm
        WHERE cm.course_id = course_payments.course_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'teacher'
    )
);

-- Function to check if user has paid for a course
CREATE OR REPLACE FUNCTION public.has_user_paid_for_course(
    user_id_param UUID,
    course_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    has_paid BOOLEAN;
    is_free BOOLEAN;
BEGIN
    -- Check if course is free
    SELECT (payment_type = 'free' OR course_price = 0)
    INTO is_free
    FROM public.courses
    WHERE id = course_id_param;
    
    -- If course is free, return true
    IF is_free THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user has a completed payment for this course
    SELECT EXISTS(
        SELECT 1 FROM public.course_payments
        WHERE user_id = user_id_param
        AND course_id = course_id_param
        AND status = 'completed'
    ) INTO has_paid;
    
    RETURN has_paid;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.has_user_paid_for_course(UUID, UUID) TO authenticated;

-- Function to get user's payment status for a course
CREATE OR REPLACE FUNCTION public.get_course_payment_status(
    user_id_param UUID,
    course_id_param UUID
)
RETURNS TABLE(
    has_paid BOOLEAN,
    payment_id UUID,
    payment_status TEXT,
    amount_cents INTEGER,
    currency TEXT,
    payment_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_free BOOLEAN;
BEGIN
    -- Check if course is free
    SELECT (payment_type = 'free' OR course_price = 0)
    INTO is_free
    FROM public.courses
    WHERE id = course_id_param;
    
    -- If course is free, return paid status
    IF is_free THEN
        RETURN QUERY
        SELECT 
            TRUE as has_paid,
            NULL::UUID as payment_id,
            'free'::TEXT as payment_status,
            0 as amount_cents,
            'usd'::TEXT as currency,
            NULL::TIMESTAMPTZ as payment_date;
        RETURN;
    END IF;
    
    -- Return payment information
    RETURN QUERY
    SELECT 
        (cp.status = 'completed') as has_paid,
        cp.id as payment_id,
        cp.status as payment_status,
        cp.amount as amount_cents,
        cp.currency,
        cp.completed_at as payment_date
    FROM public.course_payments cp
    WHERE cp.user_id = user_id_param
    AND cp.course_id = course_id_param
    ORDER BY cp.created_at DESC
    LIMIT 1;
    
    -- If no payment record exists, return unpaid status
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            FALSE as has_paid,
            NULL::UUID as payment_id,
            'unpaid'::TEXT as payment_status,
            0 as amount_cents,
            'usd'::TEXT as currency,
            NULL::TIMESTAMPTZ as payment_date;
    END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_course_payment_status(UUID, UUID) TO authenticated;

-- Add comments
COMMENT ON TABLE public.course_payments IS 'Stores Stripe payment records for course purchases';
COMMENT ON FUNCTION public.has_user_paid_for_course(UUID, UUID) IS 'Checks if a user has paid for a specific course';
COMMENT ON FUNCTION public.get_course_payment_status(UUID, UUID) IS 'Returns detailed payment status for a user and course';

