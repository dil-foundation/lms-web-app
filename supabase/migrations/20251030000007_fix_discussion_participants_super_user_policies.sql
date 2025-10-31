-- Migration: Fix discussion_participants RLS policies to include super_user access
-- Issue: Super users cannot create discussions due to missing super_user in discussion_participants policies
-- Date: 2025-10-30
-- 
-- Root Cause: The discussion_participants table policies only allow 'admin' and 'teacher' roles.
-- When super_user creates a discussion, the system tries to insert into discussion_participants
-- but gets blocked by the INSERT policy that doesn't include 'super_user'.

-- ============================================
-- DISCUSSION_PARTICIPANTS TABLE - Fix all RLS policies
-- ============================================

-- 1. Fix Insert Policy: Add 'super_user' to the existing array check
-- Current: get_current_user_role() = ANY (ARRAY['admin', 'teacher'])
-- Fixed: get_current_user_role() = ANY (ARRAY['admin', 'super_user', 'teacher'])
DROP POLICY IF EXISTS "Participants: Insert Access Policy" ON public.discussion_participants;
CREATE POLICY "Participants: Insert Access Policy" 
ON public.discussion_participants 
FOR INSERT 
TO authenticated 
WITH CHECK (
  public.get_current_user_role() = ANY (ARRAY['admin'::text, 'super_user'::text, 'teacher'::text])
);

-- 2. Fix Delete Policy: Add 'super_user' to existing role check pattern
-- Current: Only 'admin' or discussion creators can delete
-- Fixed: 'admin', 'super_user', or discussion creators can delete
DROP POLICY IF EXISTS "Participants: Delete Access Policy" ON public.discussion_participants;
CREATE POLICY "Participants: Delete Access Policy" 
ON public.discussion_participants 
FOR DELETE 
TO authenticated 
USING (
  (
    SELECT role::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  ) IN ('admin', 'super_user') 
  OR EXISTS (
    SELECT 1 FROM public.discussions d 
    WHERE d.id = discussion_participants.discussion_id 
    AND d.creator_id = auth.uid()
  )
);

-- 3. Fix Update Policy: Add 'super_user' to existing role check pattern
-- Current: Only 'admin' or discussion creators can update
-- Fixed: 'admin', 'super_user', or discussion creators can update
DROP POLICY IF EXISTS "Participants: Update Access Policy" ON public.discussion_participants;
CREATE POLICY "Participants: Update Access Policy" 
ON public.discussion_participants 
FOR UPDATE 
TO authenticated 
USING (
  (
    SELECT role::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  ) IN ('admin', 'super_user') 
  OR EXISTS (
    SELECT 1 FROM public.discussions d 
    WHERE d.id = discussion_participants.discussion_id 
    AND d.creator_id = auth.uid()
  )
);

-- 4. View Policy is already permissive (allows true), so no change needed
-- But let's make it explicit for clarity
DROP POLICY IF EXISTS "Participants: View Access Policy" ON public.discussion_participants;
CREATE POLICY "Participants: View Access Policy" 
ON public.discussion_participants 
FOR SELECT 
TO authenticated 
USING (true);

-- Add comments explaining the updated policies
COMMENT ON POLICY "Participants: Insert Access Policy" ON public.discussion_participants IS 
'Allow admins, super_users, and teachers to create discussion participants. Updated to include super_user role.';

COMMENT ON POLICY "Participants: Delete Access Policy" ON public.discussion_participants IS 
'Allow users with elevated privileges (admin/super_user) and discussion creators to delete participants.';

COMMENT ON POLICY "Participants: Update Access Policy" ON public.discussion_participants IS 
'Allow users with elevated privileges (admin/super_user) and discussion creators to update participants.';

COMMENT ON POLICY "Participants: View Access Policy" ON public.discussion_participants IS 
'Allow all authenticated users to view discussion participants.';

-- Log the changes made
INSERT INTO access_logs (user_email, action, status, metadata) 
VALUES (
  'system', 
  'Migration: Fix Discussion Participants Super User Policies',
  'success',
  jsonb_build_object(
    'migration', '20251030000007_fix_discussion_participants_super_user_policies',
    'description', 'Updated all discussion_participants policies to include super_user access',
    'timestamp', now()::text,
    'tables_affected', ARRAY['discussion_participants'],
    'policies_updated', ARRAY['Insert', 'Delete', 'Update', 'View'],
    'issue_fixed', 'Super users can now create discussions without RLS policy violations'
  )
);
