-- Fix offline learning policies (run this if you get policy already exists errors)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own offline progress" ON public.offline_content_progress;
DROP POLICY IF EXISTS "Users can insert own offline progress" ON public.offline_content_progress;
DROP POLICY IF EXISTS "Users can update own offline progress" ON public.offline_content_progress;
DROP POLICY IF EXISTS "Admins and teachers can view all offline progress" ON public.offline_content_progress;

-- Recreate policies
CREATE POLICY "Users can view own offline progress" ON public.offline_content_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own offline progress" ON public.offline_content_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own offline progress" ON public.offline_content_progress
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins and teachers can view all offline progress" ON public.offline_content_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'teacher')
        )
    );
