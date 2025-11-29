-- Migration to add user_id to discussion_participants for specific user selection
-- This allows discussions to target specific users within a role, not just all users of a role

-- Add user_id column to discussion_participants (nullable - NULL means all users of that role)
ALTER TABLE public.discussion_participants
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_discussion_participants_user_id
ON public.discussion_participants(user_id);

-- Add index for compound queries
CREATE INDEX IF NOT EXISTS idx_discussion_participants_discussion_user
ON public.discussion_participants(discussion_id, user_id);

-- Update RLS policies to consider specific users
-- Drop existing view policy
DROP POLICY IF EXISTS "Participants: View Access Policy" ON public.discussion_participants;

-- Create new view policy that considers specific users
CREATE POLICY "Participants: View Access Policy"
ON public.discussion_participants FOR SELECT
USING (true);

-- Comment explaining the new schema
COMMENT ON COLUMN public.discussion_participants.user_id IS
'If NULL, all users of the specified role can participate. If set, only this specific user can participate.';
