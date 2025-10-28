-- Migration: Update admin-only functions to include super_user role
-- This migration updates database functions that were checking for 'admin' role only
-- to also allow 'super_user' role to access admin functionalities.

-- =====================================================
-- 1. Update get_recent_access_logs function
-- =====================================================
CREATE OR REPLACE FUNCTION "public"."get_recent_access_logs"("limit_count" integer DEFAULT 50, "offset_count" integer DEFAULT 0) 
RETURNS TABLE("id" "uuid", "user_email" "text", "action" character varying, "ip_address" "inet", "location" "text", "status" character varying, "metadata" "jsonb", "created_at" timestamp with time zone)
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Try to get current user role, but don't fail if we can't access profiles
  BEGIN
    SELECT p.role INTO current_user_role 
    FROM profiles p
    WHERE p.id = auth.uid();
  EXCEPTION
    WHEN OTHERS THEN
      -- If we can't access profiles, deny access
      current_user_role := NULL;
  END;
  
  -- Allow admins and super_users to access this function
  IF current_user_role NOT IN ('admin', 'super_user') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Return paginated results with metadata
  RETURN QUERY
  SELECT 
    al.id,
    al.user_email,
    al.action,
    al.ip_address,
    al.location,
    al.status,
    al.metadata,
    al.created_at
  FROM access_logs al
  ORDER BY al.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

COMMENT ON FUNCTION "public"."get_recent_access_logs"("limit_count" integer, "offset_count" integer) IS 'Get recent access logs with pagination. Admin or super_user role required.';


-- =====================================================
-- 2. Update get_users_with_mfa_status function
-- =====================================================
CREATE OR REPLACE FUNCTION "public"."get_users_with_mfa_status"("search_term" "text" DEFAULT NULL::"text", "page_number" integer DEFAULT 1, "page_size" integer DEFAULT 10) 
RETURNS TABLE("id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "role" "text", "mfa_enabled" boolean, "created_at" timestamp with time zone, "total_count" bigint)
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public', 'auth'
AS $$
DECLARE
  offset_val INTEGER;
  total_count_val BIGINT;
  current_user_role TEXT;
BEGIN
  -- Set offset for pagination
  offset_val := (page_number - 1) * page_size;
  
  -- Check if current user is admin or super_user
  SELECT p.role INTO current_user_role 
  FROM profiles p
  WHERE p.id = auth.uid();
  
  -- Allow admins and super_users to access this function
  IF current_user_role NOT IN ('admin', 'super_user') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Get total count
  SELECT COUNT(*) INTO total_count_val
  FROM profiles p
  WHERE (search_term IS NULL OR 
         p.email ILIKE '%' || search_term || '%' OR
         p.first_name ILIKE '%' || search_term || '%' OR
         p.last_name ILIKE '%' || search_term || '%');
  
  -- Return paginated results with MFA status
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.role::TEXT,
    CASE 
      WHEN p.two_factor_setup_completed_at IS NOT NULL THEN true
      ELSE false
    END as mfa_enabled,
    p.created_at,
    total_count_val as total_count
  FROM profiles p
  WHERE (search_term IS NULL OR 
         p.email ILIKE '%' || search_term || '%' OR
         p.first_name ILIKE '%' || search_term || '%' OR
         p.last_name ILIKE '%' || search_term || '%')
  ORDER BY p.created_at DESC
  LIMIT page_size
  OFFSET offset_val;
END;
$$;

COMMENT ON FUNCTION "public"."get_users_with_mfa_status"("search_term" "text", "page_number" integer, "page_size" integer) IS 'Get users with their MFA status. Admin or super_user role required.';


-- =====================================================
-- 3. Update admin_disable_mfa_for_user function
-- =====================================================
CREATE OR REPLACE FUNCTION "public"."admin_disable_mfa_for_user"("target_user_id" "uuid") 
RETURNS "jsonb"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  admin_user_id UUID;
  admin_role TEXT;
  target_user_email TEXT;
  admin_user_email TEXT;
  result JSONB;
  factors_removed INTEGER := 0;
BEGIN
  -- Get the current user (admin)
  admin_user_id := auth.uid();
  
  -- Check if current user is an admin or super_user
  SELECT role INTO admin_role 
  FROM profiles 
  WHERE id = admin_user_id;
  
  IF admin_role NOT IN ('admin', 'super_user') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied. Only administrators can disable MFA for users.'
    );
  END IF;
  
  -- Get user emails for logging
  SELECT email INTO target_user_email FROM profiles WHERE id = target_user_id;
  SELECT email INTO admin_user_email FROM profiles WHERE id = admin_user_id;
  
  -- COMPLETELY REMOVE ALL MFA FACTORS from auth.mfa_factors table
  DELETE FROM auth.mfa_factors 
  WHERE user_id = target_user_id;
  
  GET DIAGNOSTICS factors_removed = ROW_COUNT;
  
  -- Update the target user's metadata to indicate MFA is completely disabled
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'mfa_enabled', 'false',
        'mfa_disabled_by_admin', 'true',
        'mfa_disabled_at', now()::text,
        'mfa_factors_removed', 'true'
      )
  WHERE id = target_user_id;
  
  -- Also update the profiles table metadata and clear MFA-related fields
  UPDATE profiles 
  SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || 
      jsonb_build_object(
        'mfa_enabled', false,
        'mfa_disabled_by_admin', true,
        'mfa_disabled_at', now()::text
      ),
    two_factor_setup_completed_at = NULL,
    mfa_reset_required = false,
    mfa_reset_requested_at = NULL,
    two_factor_backup_codes = NULL,
    updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Log the action
  INSERT INTO access_logs (user_id, user_email, action, ip_address, user_agent, status, metadata)
  VALUES (
    admin_user_id,
    admin_user_email,
    'Admin Disabled MFA for User',
    NULL,
    'admin_dashboard_edge_function',
    'success',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'target_user_email', target_user_email,
      'admin_user_id', admin_user_id,
      'admin_user_email', admin_user_email,
      'admin_role', admin_role,
      'factors_removed', factors_removed,
      'timestamp', now()::text
    )
  );
  
  -- Return success response
  result := jsonb_build_object(
    'success', true,
    'message', 'MFA completely disabled and factors removed',
    'target_user_id', target_user_id,
    'target_user_email', target_user_email,
    'admin_user_id', admin_user_id,
    'admin_user_email', admin_user_email,
    'factors_removed', factors_removed,
    'note', 'User will now be prompted to set up MFA again if required for their role'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    INSERT INTO access_logs (user_id, user_email, action, ip_address, user_agent, status, metadata)
    VALUES (
      admin_user_id,
      admin_user_email,
      'Admin MFA Disable Failed',
      NULL,
      'admin_dashboard_edge_function',
      'failed',
      jsonb_build_object(
        'target_user_id', target_user_id,
        'error', SQLERRM,
        'timestamp', now()::text
      )
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to disable MFA',
      'details', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION "public"."admin_disable_mfa_for_user"("target_user_id" "uuid") IS 'Completely disables MFA for a user by removing all factors and updating metadata. Admin or super_user role required.';


-- =====================================================
-- 4. Update admin_enable_mfa_for_user function
-- =====================================================
CREATE OR REPLACE FUNCTION "public"."admin_enable_mfa_for_user"("target_user_id" "uuid") 
RETURNS "jsonb"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  admin_user_id UUID;
  admin_role TEXT;
  target_user_email TEXT;
  admin_user_email TEXT;
  result JSONB;
BEGIN
  -- Get the current user (admin)
  admin_user_id := auth.uid();
  
  -- Check if current user is an admin or super_user
  SELECT role INTO admin_role 
  FROM profiles 
  WHERE id = admin_user_id;
  
  IF admin_role NOT IN ('admin', 'super_user') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied. Only administrators can enable MFA for users.'
    );
  END IF;
  
  -- Get user emails for logging
  SELECT email INTO target_user_email FROM profiles WHERE id = target_user_id;
  SELECT email INTO admin_user_email FROM profiles WHERE id = admin_user_id;
  
  -- Update the target user's metadata to indicate MFA is enabled
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'mfa_enabled', 'true',
        'mfa_enabled_by_admin', 'true',
        'mfa_enabled_at', now()::text
      )
  WHERE id = target_user_id;
  
  -- Also update the profiles table metadata and timestamp
  UPDATE profiles 
  SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || 
      jsonb_build_object(
        'mfa_enabled', true,
        'mfa_enabled_by_admin', true,
        'mfa_enabled_at', now()::text
      ),
    updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Log the action
  INSERT INTO access_logs (user_id, user_email, action, status, metadata)
  VALUES (
    admin_user_id,
    admin_user_email,
    'admin_enable_mfa_for_user',
    'success',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'target_user_email', target_user_email,
      'admin_user_id', admin_user_id,
      'admin_user_email', admin_user_email,
      'admin_role', admin_role,
      'timestamp', now()::text
    )
  );
  
  -- Return success response
  result := jsonb_build_object(
    'success', true,
    'message', 'MFA enabled successfully',
    'target_user_id', target_user_id,
    'target_user_email', target_user_email,
    'admin_user_id', admin_user_id,
    'admin_user_email', admin_user_email,
    'note', 'User will be prompted to set up MFA on next login'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    INSERT INTO access_logs (user_id, user_email, action, status, metadata)
    VALUES (
      admin_user_id,
      admin_user_email,
      'admin_enable_mfa_error',
      'failed',
      jsonb_build_object(
        'target_user_id', target_user_id,
        'error', SQLERRM,
        'timestamp', now()::text
      )
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to enable MFA',
      'details', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION "public"."admin_enable_mfa_for_user"("target_user_id" "uuid") IS 'Admin function to enable MFA for a user - updates both auth.users and profiles.metadata. Admin or super_user role required.';


-- =====================================================
-- 5. Update add_quiz_member function
-- =====================================================
CREATE OR REPLACE FUNCTION "public"."add_quiz_member"("input_quiz_id" "uuid", "input_user_id" "uuid", "input_role" "text") 
RETURNS "jsonb"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if user has permission to add members
  IF NOT EXISTS (
    SELECT 1 FROM public.standalone_quizzes sq
    WHERE sq.id = input_quiz_id
    AND (
      sq.author_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'super_user')
      )
    )
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to add quiz members';
  END IF;

  -- Insert or update quiz member
  INSERT INTO public.quiz_members (quiz_id, user_id, role)
  VALUES (input_quiz_id, input_user_id, input_role)
  ON CONFLICT (quiz_id, user_id)
  DO UPDATE SET 
    role = input_role,
    updated_at = timezone('utc'::text, now())
  RETURNING jsonb_build_object(
    'id', id,
    'quiz_id', quiz_id,
    'user_id', user_id,
    'role', role,
    'created_at', created_at
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION "public"."add_quiz_member"("input_quiz_id" "uuid", "input_user_id" "uuid", "input_role" "text") IS 'Adds a member to a quiz. Requires quiz author or admin/super_user role.';


-- =====================================================
-- 6. Update approve_submission function
-- =====================================================
CREATE OR REPLACE FUNCTION "public"."approve_submission"("course_id_in" "uuid") 
RETURNS "void"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  is_admin_user BOOLEAN;
  target_published_id uuid;
BEGIN
  -- Verify that the user performing this action is an admin or super_user
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_user')) INTO is_admin_user;
  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Only admins can approve course submissions.';
  END IF;

  -- Locate the currently published course (if any) associated with the same course_id
  SELECT id INTO target_published_id
  FROM public.courses
  WHERE course_id = (SELECT course_id FROM public.courses WHERE id = course_id_in)
    AND status = 'Published'
  LIMIT 1;

  IF target_published_id IS NOT NULL THEN
    -- Archive the existing published course
    UPDATE public.courses
    SET status = 'Archived',
        updated_at = now()
    WHERE id = target_published_id;
  END IF;

  -- Set the submitted course as the new published course
  UPDATE public.courses
  SET status = 'Published',
      updated_at = now()
  WHERE id = course_id_in;
END;
$$;

COMMENT ON FUNCTION "public"."approve_submission"("course_id_in" "uuid") IS 'Approves a course submission and archives the existing published version. Admin or super_user role required.';

