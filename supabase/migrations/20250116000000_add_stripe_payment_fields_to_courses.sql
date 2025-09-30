-- Add Stripe payment fields to courses table
-- This migration adds payment_type and course_price fields for Stripe integration

-- Add payment_type column (free or paid)
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'free' 
CHECK (payment_type IN ('free', 'paid'));

-- Add course_price column (in USD cents for precision)
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS course_price INTEGER DEFAULT 0 
CHECK (course_price >= 0);

-- Add comments for the new columns
COMMENT ON COLUMN public.courses.payment_type IS 'Payment type for the course: free or paid';
COMMENT ON COLUMN public.courses.course_price IS 'Course price in USD cents (e.g., 999 = $9.99)';

-- Create index for performance on payment_type queries
CREATE INDEX IF NOT EXISTS idx_courses_payment_type ON public.courses (payment_type) WHERE payment_type = 'paid';

-- Create index for performance on course_price queries
CREATE INDEX IF NOT EXISTS idx_courses_course_price ON public.courses (course_price) WHERE course_price > 0;

-- Update existing courses to have default values
UPDATE public.courses 
SET payment_type = 'free', course_price = 0 
WHERE payment_type IS NULL OR course_price IS NULL;

-- Create a function to get course pricing information
CREATE OR REPLACE FUNCTION public.get_course_pricing_info(course_id_param UUID)
RETURNS TABLE(
    course_id UUID,
    title TEXT,
    payment_type TEXT,
    course_price_cents INTEGER,
    course_price_dollars NUMERIC(10,2),
    is_free BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as course_id,
        c.title,
        c.payment_type,
        c.course_price as course_price_cents,
        ROUND(c.course_price / 100.0, 2) as course_price_dollars,
        (c.payment_type = 'free' OR c.course_price = 0) as is_free
    FROM public.courses c
    WHERE c.id = course_id_param;
END;
$$;

-- Grant permissions for the new function
GRANT EXECUTE ON FUNCTION public.get_course_pricing_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_pricing_info(UUID) TO anon;

-- Create a function to update course pricing
CREATE OR REPLACE FUNCTION public.update_course_pricing(
    course_id_param UUID,
    payment_type_param TEXT,
    course_price_cents_param INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    course_exists BOOLEAN;
BEGIN
    -- Validate payment_type
    IF payment_type_param NOT IN ('free', 'paid') THEN
        RAISE EXCEPTION 'Invalid payment_type. Must be "free" or "paid"';
    END IF;
    
    -- Validate course_price
    IF course_price_cents_param < 0 THEN
        RAISE EXCEPTION 'Course price cannot be negative';
    END IF;
    
    -- If payment_type is 'free', set price to 0
    IF payment_type_param = 'free' THEN
        course_price_cents_param := 0;
    END IF;
    
    -- Check if course exists and user has permission to update
    SELECT EXISTS(
        SELECT 1 FROM public.courses c
        JOIN public.course_members cm ON c.id = cm.course_id
        WHERE c.id = course_id_param 
        AND cm.user_id = auth.uid()
        AND cm.role = 'teacher'
    ) INTO course_exists;
    
    IF NOT course_exists THEN
        RAISE EXCEPTION 'Course not found or insufficient permissions';
    END IF;
    
    -- Update the course
    UPDATE public.courses 
    SET 
        payment_type = payment_type_param,
        course_price = course_price_cents_param,
        updated_at = NOW()
    WHERE id = course_id_param;
    
    RETURN TRUE;
END;
$$;

-- Grant permissions for the update function
GRANT EXECUTE ON FUNCTION public.update_course_pricing(UUID, TEXT, INTEGER) TO authenticated;

-- Add RLS policy for course pricing (if needed)
-- This allows teachers to update pricing for their own courses
CREATE POLICY "Teachers can update course pricing" ON public.courses
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.course_members cm
        WHERE cm.course_id = courses.id
        AND cm.user_id = auth.uid()
        AND cm.role = 'teacher'
    )
);

-- Add comments for the functions
COMMENT ON FUNCTION public.get_course_pricing_info(UUID) IS 'Returns pricing information for a course including formatted price in dollars';
COMMENT ON FUNCTION public.update_course_pricing(UUID, TEXT, INTEGER) IS 'Updates course pricing information with validation';
