-- Add UPDATE policy for admins to process refunds
CREATE POLICY "Admins can update payments for refunds" ON public.course_payments
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Add comment
COMMENT ON POLICY "Admins can update payments for refunds" ON public.course_payments 
IS 'Allows admins to update payment records, primarily for processing refunds';

