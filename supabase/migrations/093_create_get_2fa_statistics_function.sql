-- Migration: Create get_2fa_statistics function
-- This function returns 2FA adoption statistics based on actual user completion

-- Create the get_2fa_statistics function
CREATE OR REPLACE FUNCTION get_2fa_statistics()
RETURNS TABLE (
  total_users INTEGER,
  users_with_2fa INTEGER,
  users_without_2fa INTEGER,
  two_fa_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE two_factor_setup_completed_at IS NOT NULL) as with_2fa,
      COUNT(*) FILTER (WHERE two_factor_setup_completed_at IS NULL) as without_2fa
    FROM profiles
  )
  SELECT 
    total::INTEGER,
    with_2fa::INTEGER,
    without_2fa::INTEGER,
    CASE 
      WHEN total > 0 THEN ROUND((with_2fa::NUMERIC / total::NUMERIC) * 100, 2)
      ELSE 0
    END as percentage
  FROM stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_2fa_statistics() TO authenticated;

-- Status message
DO $$ BEGIN
  RAISE NOTICE 'Migration 093: Created get_2fa_statistics function successfully';
END $$;
