-- Fix the unique constraint issue that's preventing multiple specific users per role
-- The existing constraint prevents us from inserting multiple rows with the same (discussion_id, role)
-- We need to allow multiple rows per role (for specific users), but prevent exact duplicates

-- Drop the old unique constraint
ALTER TABLE public.discussion_participants
DROP CONSTRAINT IF EXISTS discussion_participants_discussion_id_role_key;

-- Add a new unique constraint that allows multiple users per role
-- but prevents duplicate (discussion_id, role, user_id) combinations
-- We use COALESCE to handle NULL user_id values (which means "all users of this role")
CREATE UNIQUE INDEX IF NOT EXISTS idx_discussion_participants_unique
ON public.discussion_participants(
  discussion_id,
  role,
  COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- This allows:
-- ✓ Multiple rows: (disc1, 'teacher', user1), (disc1, 'teacher', user2), (disc1, 'teacher', user3)
-- ✓ Role-based row: (disc1, 'student', NULL)
-- ✗ Prevents duplicate: (disc1, 'teacher', user1) inserted twice
-- ✗ Prevents duplicate: (disc1, 'student', NULL) inserted twice
