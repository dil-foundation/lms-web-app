

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'student',
    'teacher',
    'admin'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."contact_priority" AS ENUM (
    'high',
    'medium',
    'low'
);


ALTER TYPE "public"."contact_priority" OWNER TO "postgres";


CREATE TYPE "public"."course_member_role" AS ENUM (
    'teacher',
    'student'
);


ALTER TYPE "public"."course_member_role" OWNER TO "postgres";


CREATE TYPE "public"."faq_priority" AS ENUM (
    'high',
    'medium',
    'low'
);


ALTER TYPE "public"."faq_priority" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_quiz_member"("input_quiz_id" "uuid", "input_user_id" "uuid", "input_role" "text") RETURNS "jsonb"
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
        WHERE id = auth.uid() AND role = 'admin'
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


ALTER FUNCTION "public"."add_quiz_member"("input_quiz_id" "uuid", "input_user_id" "uuid", "input_role" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_quiz_member"("input_quiz_id" "uuid", "input_user_id" "uuid", "input_role" "text") IS 'Adds a member to a quiz';



CREATE OR REPLACE FUNCTION "public"."admin_disable_mfa_for_user"("target_user_id" "uuid") RETURNS "jsonb"
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
  
  -- Check if current user is an admin
  SELECT role INTO admin_role 
  FROM profiles 
  WHERE id = admin_user_id;
  
  IF admin_role != 'admin' THEN
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


ALTER FUNCTION "public"."admin_disable_mfa_for_user"("target_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_disable_mfa_for_user"("target_user_id" "uuid") IS 'Completely disables MFA for a user by removing all factors and updating metadata';



CREATE OR REPLACE FUNCTION "public"."admin_enable_mfa_for_user"("target_user_id" "uuid") RETURNS "jsonb"
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
  
  -- Check if current user is an admin
  SELECT role INTO admin_role 
  FROM profiles 
  WHERE id = admin_user_id;
  
  IF admin_role != 'admin' THEN
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


ALTER FUNCTION "public"."admin_enable_mfa_for_user"("target_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_enable_mfa_for_user"("target_user_id" "uuid") IS 'Admin function to enable MFA for a user - updates both auth.users and profiles.metadata';



CREATE OR REPLACE FUNCTION "public"."admin_get_users_with_mfa_status"("search_term" "text" DEFAULT NULL::"text", "page_number" integer DEFAULT 1, "page_size" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "role" "text", "mfa_enabled" boolean, "created_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  offset_val INTEGER;
  total_count_val BIGINT;
BEGIN
  -- Calculate offset
  offset_val := (page_number - 1) * page_size;

  -- Get total count for pagination
  SELECT COUNT(*) INTO total_count_val
  FROM profiles p
  WHERE (
    search_term IS NULL 
    OR search_term = ''
    OR LOWER(p.first_name) LIKE '%' || LOWER(search_term) || '%'
    OR LOWER(p.last_name) LIKE '%' || LOWER(search_term) || '%'
    OR LOWER(p.email) LIKE '%' || LOWER(search_term) || '%'
    OR LOWER(p.first_name || ' ' || p.last_name) LIKE '%' || LOWER(search_term) || '%'
  );

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.role::TEXT,
    CASE 
      -- Check if user has MFA enabled in auth.users metadata
      WHEN EXISTS (
        SELECT 1 FROM auth.users u 
        WHERE u.id = p.id 
        AND (
          u.raw_app_meta_data->>'mfa_enabled' = 'true'
          OR u.raw_user_meta_data->>'mfa_enabled' = 'true'
        )
      ) THEN true
      -- Also check if user has verified MFA factors
      WHEN EXISTS (
        SELECT 1 FROM auth.mfa_factors mf
        WHERE mf.user_id = p.id 
        AND mf.status = 'verified'
        AND mf.factor_type = 'totp'
      ) THEN true
      ELSE false
    END as mfa_enabled,
    p.created_at,
    total_count_val
  FROM profiles p
  WHERE (
    search_term IS NULL 
    OR search_term = ''
    OR LOWER(p.first_name) LIKE '%' || LOWER(search_term) || '%'
    OR LOWER(p.last_name) LIKE '%' || LOWER(search_term) || '%'
    OR LOWER(p.email) LIKE '%' || LOWER(search_term) || '%'
    OR LOWER(p.first_name || ' ' || p.last_name) LIKE '%' || LOWER(search_term) || '%'
  )
  ORDER BY p.created_at DESC
  LIMIT page_size
  OFFSET offset_val;
END;
$$;


ALTER FUNCTION "public"."admin_get_users_with_mfa_status"("search_term" "text", "page_number" integer, "page_size" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_get_users_with_mfa_status"("search_term" "text", "page_number" integer, "page_size" integer) IS 'Admin function to get users with MFA status - requires service role access for full auth.users table access';



CREATE OR REPLACE FUNCTION "public"."approve_submission"("course_id_in" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  is_admin_user BOOLEAN;
  target_published_id uuid;
BEGIN
  -- Verify that the user performing this action is an admin.
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') INTO is_admin_user;
  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Only admins can approve course submissions.';
  END IF;

  -- Verify the course is actually under review.
  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = course_id_in AND status = 'Under Review') THEN
    RAISE EXCEPTION 'Course is not under review.';
  END IF;

  -- Check if this draft is an update to an existing published course.
  SELECT published_course_id INTO target_published_id FROM public.courses WHERE id = course_id_in;

  IF target_published_id IS NULL THEN
    -- This is a new course. Mark it as 'Published'.
    UPDATE public.courses
    SET
      status = 'Published',
      review_feedback = NULL
    WHERE id = course_id_in;
  ELSE
    -- This is an update to an existing course. Use the 'publish_draft' function.
    PERFORM publish_draft(course_id_in, target_published_id);
  END IF;
END;
$$;


ALTER FUNCTION "public"."approve_submission"("course_id_in" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_cleanup_expired_blocks"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Only run cleanup if this is a new insert or update that affects is_active
    -- This prevents the trigger from running recursively
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.is_active IS DISTINCT FROM NEW.is_active)) THEN
        -- Use a separate transaction to avoid conflicts
        PERFORM pg_notify('cleanup_expired_blocks', 'cleanup_needed');
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."auto_cleanup_expired_blocks"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."block_user"("p_email" "text", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_block_reason" "text" DEFAULT 'Too many failed login attempts'::"text", "p_block_hours" integer DEFAULT 24, "p_attempts_count" integer DEFAULT 0) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    block_id UUID;
BEGIN
    -- Insert or update blocked user record
    INSERT INTO blocked_users (
        email,
        ip_address,
        block_reason,
        blocked_until,
        attempts_count,
        metadata
    ) VALUES (
        p_email,
        p_ip_address,
        p_block_reason,
        NOW() + INTERVAL '1 hour' * p_block_hours,
        p_attempts_count,
        jsonb_build_object(
            'blocked_at', NOW(),
            'block_duration_hours', p_block_hours
        )
    )
    ON CONFLICT (email) 
    DO UPDATE SET
        ip_address = EXCLUDED.ip_address,
        block_reason = EXCLUDED.block_reason,
        blocked_until = EXCLUDED.blocked_until,
        attempts_count = EXCLUDED.attempts_count,
        is_active = TRUE,
        metadata = EXCLUDED.metadata
    RETURNING id INTO block_id;
    
    RETURN block_id;
END;
$$;


ALTER FUNCTION "public"."block_user"("p_email" "text", "p_ip_address" "inet", "p_block_reason" "text", "p_block_hours" integer, "p_attempts_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bulk_link_quizzes_to_course"("course_id" "uuid", "quiz_ids" "uuid"[], "link_type" "text" DEFAULT 'standalone'::"text", "is_required" boolean DEFAULT true) RETURNS TABLE("quiz_id" "uuid", "success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  quiz_id uuid;
  link_count integer;
BEGIN
  FOREACH quiz_id IN ARRAY quiz_ids
  LOOP
    BEGIN
      -- Check if quiz exists and is published
      IF NOT EXISTS (
        SELECT 1 FROM public.standalone_quizzes 
        WHERE id = quiz_id AND status = 'published'
      ) THEN
        RETURN QUERY SELECT quiz_id, false, 'Quiz not found or not published'::text;
        CONTINUE;
      END IF;
      
      -- Check if already linked
      IF EXISTS (
        SELECT 1 FROM public.quiz_course_links 
        WHERE quiz_id = bulk_link_quizzes_to_course.quiz_id AND course_id = bulk_link_quizzes_to_course.course_id
      ) THEN
        RETURN QUERY SELECT quiz_id, false, 'Quiz already linked to this course'::text;
        CONTINUE;
      END IF;
      
      -- Get next position
      SELECT COALESCE(MAX(position), 0) + 1 INTO link_count
      FROM public.quiz_course_links 
      WHERE course_id = bulk_link_quizzes_to_course.course_id;
      
      -- Insert link
      INSERT INTO public.quiz_course_links (quiz_id, course_id, link_type, position, is_required)
      VALUES (quiz_id, bulk_link_quizzes_to_course.course_id, link_type, link_count, is_required);
      
      RETURN QUERY SELECT quiz_id, true, 'Successfully linked'::text;
      
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT quiz_id, false, 'Error: ' || SQLERRM::text;
    END;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."bulk_link_quizzes_to_course"("course_id" "uuid", "quiz_ids" "uuid"[], "link_type" "text", "is_required" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."bulk_link_quizzes_to_course"("course_id" "uuid", "quiz_ids" "uuid"[], "link_type" "text", "is_required" boolean) IS 'Bulk links multiple quizzes to a course';



CREATE OR REPLACE FUNCTION "public"."calculate_quiz_final_score"("submission_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  total_score NUMERIC(10,2) := 0;
  total_questions INTEGER := 0;
  auto_graded_score NUMERIC(10,2) := 0;
  auto_graded_count INTEGER := 0;
  text_answer_score NUMERIC(10,2) := 0;
  text_answer_count INTEGER := 0;
BEGIN
  -- Get auto-graded questions score
  SELECT 
    COALESCE(SUM(CASE WHEN qs.results->>qq.id::text = 'true' THEN 100 ELSE 0 END), 0),
    COUNT(*)
  INTO auto_graded_score, auto_graded_count
  FROM quiz_questions qq
  JOIN quiz_submissions qs ON qs.lesson_content_id = qq.lesson_content_id
  WHERE qs.id = submission_id 
  AND qq.question_type IN ('single_choice', 'multiple_choice');
  
  -- Get text answer questions score
  SELECT 
    COALESCE(SUM(tag.grade), 0),
    COUNT(*)
  INTO text_answer_score, text_answer_count
  FROM text_answer_grades tag
  WHERE tag.quiz_submission_id = submission_id;
  
  -- Calculate total
  total_score := auto_graded_score + text_answer_score;
  total_questions := auto_graded_count + text_answer_count;
  
  -- Return average score
  IF total_questions > 0 THEN
    RETURN ROUND(total_score / total_questions, 2);
  ELSE
    RETURN 0;
  END IF;
END;
$$;


ALTER FUNCTION "public"."calculate_quiz_final_score"("submission_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_delete_course"("course_id_to_check" "uuid") RETURNS TABLE("can_delete" boolean, "reason" "text", "student_count" bigint, "progress_count" bigint, "submission_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH course_stats AS (
        SELECT 
            c.id,
            c.title,
            COUNT(DISTINCT cm.user_id) FILTER (WHERE cm.role = 'student') as student_count,
            COUNT(DISTINCT ucip.id) as progress_count,
            COUNT(DISTINCT as2.id) as submission_count
        FROM public.courses c
        LEFT JOIN public.course_members cm ON c.id = cm.course_id
        LEFT JOIN public.user_content_item_progress ucip ON c.id = ucip.course_id
        LEFT JOIN public.assignment_submissions as2 ON as2.assignment_id IN (
            SELECT clc.id 
            FROM public.course_lesson_content clc
            JOIN public.course_lessons cl ON clc.lesson_id = cl.id
            JOIN public.course_sections cs ON cl.section_id = cs.id
            WHERE cs.course_id = c.id
        )
        WHERE c.id = course_id_to_check
        GROUP BY c.id, c.title
    )
    SELECT 
        CASE 
            WHEN cs.student_count = 0 AND cs.progress_count = 0 AND cs.submission_count = 0 THEN true
            ELSE false
        END as can_delete,
        CASE 
            WHEN cs.student_count > 0 THEN 'Course has enrolled students'
            WHEN cs.progress_count > 0 THEN 'Course has student progress data'
            WHEN cs.submission_count > 0 THEN 'Course has student submissions'
            ELSE 'Course can be safely deleted'
        END as reason,
        COALESCE(cs.student_count, 0) as student_count,
        COALESCE(cs.progress_count, 0) as progress_count,
        COALESCE(cs.submission_count, 0) as submission_count
    FROM course_stats cs;
END;
$$;


ALTER FUNCTION "public"."can_delete_course"("course_id_to_check" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_delete_course"("course_id_to_check" "uuid") IS 'Checks if a course can be safely deleted by examining student data and progress';



CREATE OR REPLACE FUNCTION "public"."can_retry_quiz"("p_user_id" "uuid", "p_lesson_content_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_retry_settings JSONB;
    current_attempts INTEGER;
    last_attempt TIMESTAMPTZ;
    last_score NUMERIC(5,2);
    cooldown_hours NUMERIC;
    retry_threshold NUMERIC(5,2);
    max_retries INTEGER;
    can_retry BOOLEAN := false;
    retry_reason TEXT := '';
    result JSONB;
BEGIN
    -- Get retry settings from the lesson content
    SELECT clc.retry_settings INTO v_retry_settings
    FROM course_lesson_content clc
    WHERE clc.id = p_lesson_content_id;
    
    -- If no retry settings found, use defaults
    IF v_retry_settings IS NULL THEN
        v_retry_settings := '{"allowRetries": false, "maxRetries": 2, "retryCooldownHours": 1, "retryThreshold": 70}'::jsonb;
    END IF;
    
    -- Check if retries are allowed
    IF NOT COALESCE((v_retry_settings->>'allowRetries')::boolean, false) THEN
        RETURN jsonb_build_object(
            'canRetry', false,
            'reason', 'Retries are not enabled for this quiz'
        );
    END IF;
    
    -- Get current attempt count (using the new attempt_number field)
    SELECT COALESCE(MAX(qs.attempt_number), 0)
    INTO current_attempts
    FROM quiz_submissions qs
    WHERE qs.user_id = p_user_id
    AND qs.lesson_content_id = p_lesson_content_id;
    
    -- Get retry settings
    max_retries := COALESCE((v_retry_settings->>'maxRetries')::integer, 2);
    retry_threshold := COALESCE((v_retry_settings->>'retryThreshold')::numeric, 70);
    cooldown_hours := COALESCE((v_retry_settings->>'retryCooldownHours')::numeric, 1);
    
    -- Check if max retries exceeded
    IF current_attempts >= max_retries THEN
        RETURN jsonb_build_object(
            'canRetry', false,
            'reason', 'Maximum number of retries exceeded',
            'currentAttempts', current_attempts,
            'maxRetries', max_retries
        );
    END IF;
    
    -- Get the latest attempt details
    SELECT qs.submitted_at, COALESCE(qs.score, qs.manual_grading_score, 0)
    INTO last_attempt, last_score
    FROM quiz_submissions qs
    WHERE qs.user_id = p_user_id
    AND qs.lesson_content_id = p_lesson_content_id
    AND qs.is_latest_attempt = true;
    
    -- If no previous attempts, allow retry
    IF last_attempt IS NULL THEN
        RETURN jsonb_build_object(
            'canRetry', true,
            'currentAttempts', current_attempts,
            'maxRetries', max_retries,
            'retryThreshold', retry_threshold
        );
    END IF;
    
    -- Check if score is above retry threshold
    IF last_score >= retry_threshold THEN
        RETURN jsonb_build_object(
            'canRetry', false,
            'reason', 'Score is above retry threshold',
            'currentScore', last_score,
            'retryThreshold', retry_threshold
        );
    END IF;
    
    -- Check cooldown period
    IF last_attempt > (now() - (cooldown_hours || ' hours')::interval) THEN
        RETURN jsonb_build_object(
            'canRetry', false,
            'reason', 'Cooldown period not yet expired',
            'retryAfter', last_attempt + (cooldown_hours || ' hours')::interval,
            'currentAttempts', current_attempts,
            'maxRetries', max_retries,
            'retryThreshold', retry_threshold
        );
    END IF;
    
    -- If we get here, retry is allowed
    RETURN jsonb_build_object(
        'canRetry', true,
        'currentAttempts', current_attempts,
        'maxRetries', max_retries,
        'retryThreshold', retry_threshold
    );
END;
$$;


ALTER FUNCTION "public"."can_retry_quiz"("p_user_id" "uuid", "p_lesson_content_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_retry_quiz"("p_user_id" "uuid", "p_lesson_content_id" "uuid") IS 'Updated to remove teacher approval logic - retries are now automatic when conditions are met';



CREATE OR REPLACE FUNCTION "public"."check_login_security"("p_email" "text", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text") RETURNS TABLE("can_proceed" boolean, "is_blocked" boolean, "block_reason" "text", "blocked_until" timestamp with time zone, "failed_attempts" integer, "max_attempts" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    max_attempts_setting INTEGER;
    failed_count INTEGER;
    block_status RECORD;
BEGIN
    -- Get max login attempts from security settings, default to 5 if not found
    SELECT CAST(setting_value AS INTEGER) INTO max_attempts_setting
    FROM security_settings 
    WHERE setting_key = 'max_login_attempts';
    
    -- Default to 5 if not found
    max_attempts_setting := COALESCE(max_attempts_setting, 5);
    
    -- Check if user is currently blocked
    SELECT * INTO block_status
    FROM check_user_blocked(p_email, p_ip_address);
    
    -- Get failed attempts count for last 24 hours
    failed_count := get_failed_login_attempts(p_email, 24);
    
    RETURN QUERY
    SELECT 
        NOT block_status.is_blocked AND failed_count < max_attempts_setting,
        block_status.is_blocked,
        block_status.block_reason,
        block_status.blocked_until,
        failed_count,
        max_attempts_setting;
END;
$$;


ALTER FUNCTION "public"."check_login_security"("p_email" "text", "p_ip_address" "inet", "p_user_agent" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_mfa_requirement"("user_role" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  setting_key_var TEXT;
  setting_value_var TEXT;
  mfa_required BOOLEAN := FALSE;
  user_id_var UUID;
  mfa_factors_removed_by_admin BOOLEAN := FALSE;
BEGIN
  -- Get current user ID
  user_id_var := auth.uid();
  
  -- Check if MFA factors were removed by admin (but don't bypass role requirements)
  SELECT (raw_app_meta_data->>'mfa_factors_removed_by_admin')::boolean INTO mfa_factors_removed_by_admin
  FROM auth.users 
  WHERE id = user_id_var;
  
  -- Construct the setting key based on role
  setting_key_var := 'two_factor_auth_enabled_' || user_role || 's';
  
  -- Get the setting value from security_settings
  SELECT setting_value INTO setting_value_var
  FROM security_settings
  WHERE setting_key = setting_key_var;
  
  -- Check if MFA is required for this role (regardless of admin removal)
  IF setting_value_var = 'true' THEN
    mfa_required := TRUE;
  END IF;
  
  RETURN mfa_required;
END;
$$;


ALTER FUNCTION "public"."check_mfa_requirement"("user_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_standalone_quiz_manual_grading_required"("input_quiz_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  has_text_questions BOOLEAN;
  question_count INTEGER;
BEGIN
  -- Count total questions
  SELECT COUNT(*) INTO question_count
  FROM standalone_quiz_questions 
  WHERE standalone_quiz_questions.quiz_id = input_quiz_id;
  
  -- Check if has text answer questions
  SELECT EXISTS (
    SELECT 1 
    FROM standalone_quiz_questions 
    WHERE standalone_quiz_questions.quiz_id = input_quiz_id 
    AND question_type = 'text_answer'
  ) INTO has_text_questions;
  
  -- Log debug information
  PERFORM log_debug_message('Quiz ID: ' || input_quiz_id || 
    ', Total Questions: ' || question_count || 
    ', Has Text Questions: ' || has_text_questions);
  
  RETURN has_text_questions;
END;
$$;


ALTER FUNCTION "public"."check_standalone_quiz_manual_grading_required"("input_quiz_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_blocked"("p_email" "text", "p_ip_address" "inet" DEFAULT NULL::"inet") RETURNS TABLE("is_blocked" boolean, "block_reason" "text", "blocked_until" timestamp with time zone, "attempts_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bu.is_active AND bu.blocked_until > NOW(),
        bu.block_reason,
        bu.blocked_until,
        bu.attempts_count
    FROM blocked_users bu
    WHERE bu.email = p_email
    AND bu.is_active = TRUE
    AND bu.blocked_until > NOW();
    
    -- If no rows returned, return default values
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE, 0;
    END IF;
END;
$$;


ALTER FUNCTION "public"."check_user_blocked"("p_email" "text", "p_ip_address" "inet") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_status"("user_email" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  is_confirmed boolean;
begin
  select email_confirmed_at is not null
  into is_confirmed
  from auth.users
  where email = user_email;

  return coalesce(is_confirmed, false);
end;
$$;


ALTER FUNCTION "public"."check_user_status"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_sessions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RETURN cleaned_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_iris_chat_logs"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM iris_chat_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_iris_chat_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_login_records"("p_days_to_keep" integer DEFAULT 30) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old login attempts
    DELETE FROM login_attempts 
    WHERE attempt_time < NOW() - INTERVAL '1 day' * p_days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete expired blocked users
    DELETE FROM blocked_users 
    WHERE blocked_until < NOW() AND is_active = FALSE;
    
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_login_records"("p_days_to_keep" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_manual_grading"("submission_id" "uuid", "teacher_id" "uuid", "manual_score" numeric, "manual_feedback" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE quiz_submissions 
  SET 
    manual_grading_completed = TRUE,
    manual_grading_score = manual_score,
    manual_grading_feedback = manual_feedback,
    manual_grading_completed_at = NOW(),
    manual_grading_completed_by = teacher_id,
    score = manual_score  -- Update the main score field
  WHERE id = submission_id;
  
  -- Verify the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz submission with id % not found', submission_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."complete_manual_grading"("submission_id" "uuid", "teacher_id" "uuid", "manual_score" numeric, "manual_feedback" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_manual_grading_v2"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Save individual grades
  PERFORM save_text_answer_grades(submission_id, teacher_id, grades_data);
  
  -- Calculate and update final score
  UPDATE quiz_submissions 
  SET 
    manual_grading_score = calculate_quiz_final_score(submission_id),
    score = calculate_quiz_final_score(submission_id)
  WHERE id = submission_id;
END;
$$;


ALTER FUNCTION "public"."complete_manual_grading_v2"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_standalone_quiz_manual_grading"("input_attempt_id" "uuid", "input_teacher_id" "uuid", "grades_data" "jsonb", "overall_feedback" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  attempt_quiz_id UUID;
  total_questions INTEGER;
  text_answer_questions INTEGER;
  auto_graded_score NUMERIC := 0;
  total_score NUMERIC := 0;
  final_score NUMERIC := 0;
  grade_item JSONB;
  question_points NUMERIC;
  grade_percentage NUMERIC;
  earned_points NUMERIC;
  update_count INTEGER;
BEGIN
  -- Debug: Log function start
  RAISE NOTICE 'Starting manual grading completion for attempt: %', input_attempt_id;
  
  -- First get the quiz ID from the attempt
  SELECT quiz_id INTO attempt_quiz_id
  FROM standalone_quiz_attempts
  WHERE id = input_attempt_id;
  
  -- Then get question counts for this quiz
  SELECT 
    COUNT(*) as total_questions,
    COUNT(CASE WHEN question_type = 'text_answer' THEN 1 END) as text_answer_questions
  INTO 
    total_questions,
    text_answer_questions
  FROM standalone_quiz_questions
  WHERE quiz_id = attempt_quiz_id;

  -- Debug: Log the question details
  RAISE NOTICE 'Question details - total_questions: %, text_answer_questions: %', 
    total_questions, text_answer_questions;

  -- Calculate score from auto-graded questions (non-text answers)
  IF total_questions > text_answer_questions THEN
    SELECT COALESCE(SUM(
      CASE 
        WHEN (sqa.results->>sqq.id::text)::jsonb->>'is_correct' = 'true' 
        THEN sqq.points 
        ELSE 0 
      END
    ), 0)
    INTO auto_graded_score
    FROM standalone_quiz_attempts sqa
    JOIN standalone_quiz_questions sqq ON sqq.quiz_id = sqa.quiz_id
    WHERE sqa.id = input_attempt_id 
    AND sqq.question_type != 'text_answer';
  END IF;

  -- Debug: Log auto-graded score
  RAISE NOTICE 'Auto-graded score: %', auto_graded_score;

  -- Process individual text answer grades
  FOR grade_item IN SELECT * FROM jsonb_array_elements(grades_data)
  LOOP
    -- Get question points for this text answer question
    SELECT points INTO question_points
    FROM standalone_quiz_questions
    WHERE id = (grade_item->>'question_id')::UUID;
    
    -- The grade is already in points (0 to question_points), not percentage
    earned_points := (grade_item->>'grade')::NUMERIC;
    
    -- Add to total score
    total_score := total_score + earned_points;
    
    -- Debug: Log each grade calculation
    RAISE NOTICE 'Question %: grade=%, question_points=%, earned_points=%', 
      grade_item->>'question_id', earned_points, question_points, earned_points;
    
    -- Insert/update the grade record
    -- Convert points to percentage for storage: (earned_points / question_points) * 100
    INSERT INTO standalone_quiz_text_answer_grades (
      attempt_id, question_id, grade, feedback, graded_by, graded_at
    ) VALUES (
      input_attempt_id,
      (grade_item->>'question_id')::UUID,
      (earned_points / question_points) * 100,
      COALESCE(grade_item->>'feedback', ''),
      input_teacher_id,
      NOW()
    )
    ON CONFLICT (attempt_id, question_id)
    DO UPDATE SET
      grade = EXCLUDED.grade,
      feedback = EXCLUDED.feedback,
      graded_by = EXCLUDED.graded_by,
      graded_at = EXCLUDED.graded_at,
      updated_at = NOW();
  END LOOP;

  -- Debug: Log total score
  RAISE NOTICE 'Total manual grading score (points): %', total_score;

  -- Calculate final score percentage
  IF total_questions > 0 THEN
    final_score := ((auto_graded_score + total_score) / (SELECT SUM(points) FROM standalone_quiz_questions WHERE quiz_id = attempt_quiz_id)) * 100;
  ELSE
    final_score := 0;
  END IF;

  -- Debug: Log final score
  RAISE NOTICE 'Final calculated score: %', final_score;

  -- Debug: Log the exact UPDATE statement values
  RAISE NOTICE 'About to update attempt % with: manual_grading_completed=TRUE, manual_grading_score=%, score=%, manual_grading_completed_by=%', 
    input_attempt_id, final_score, final_score, input_teacher_id;

  -- Update the results array with correct earned_points for text answer questions
  -- This ensures the frontend displays correct/incorrect counts properly
  DECLARE
    updated_results JSONB;
    result_item JSONB;
    grade_item JSONB;
    question_points NUMERIC;
    grade_percentage NUMERIC;
    earned_points NUMERIC;
    result_index INTEGER;
  BEGIN
    -- Get current results
    SELECT results INTO updated_results
    FROM standalone_quiz_attempts
    WHERE id = input_attempt_id;
    
    -- Update each result item
    FOR result_item IN SELECT * FROM jsonb_array_elements(updated_results)
    LOOP
      -- Check if this is a text answer question that was graded
      FOR grade_item IN SELECT * FROM jsonb_array_elements(grades_data)
      LOOP
        IF (result_item->>'question_id')::UUID = (grade_item->>'question_id')::UUID THEN
          -- Get question points
          SELECT points INTO question_points
          FROM standalone_quiz_questions
          WHERE id = (grade_item->>'question_id')::UUID;
          
          -- The grade is already in points (0 to question_points), not percentage
          -- So we can use it directly as earned_points
          earned_points := (grade_item->>'grade')::NUMERIC;
          
          -- Find the index of this result item
          SELECT ordinality - 1 INTO result_index
          FROM jsonb_array_elements(updated_results) WITH ORDINALITY
          WHERE value = result_item;
          
          -- Update the earned_points for this question
          updated_results := jsonb_set(
            updated_results,
            ARRAY[result_index::text, 'earned_points'],
            to_jsonb(earned_points)
          );
          
          -- Debug: Log the update
          RAISE NOTICE 'Updated earned_points for question %: % (grade: % points out of % total points)', 
            grade_item->>'question_id', earned_points, earned_points, question_points;
        END IF;
      END LOOP;
    END LOOP;
    
    -- Update the results array
    UPDATE standalone_quiz_attempts 
    SET results = updated_results
    WHERE id = input_attempt_id;
    
    RAISE NOTICE 'Updated results array with correct earned_points';
  END;

  -- Try the update with explicit error handling
  BEGIN
    UPDATE standalone_quiz_attempts 
    SET 
      manual_grading_completed = TRUE,
      manual_grading_score = final_score,
      manual_grading_feedback = overall_feedback,
      manual_grading_completed_at = NOW(),
      manual_grading_completed_by = input_teacher_id,
      score = final_score
    WHERE id = input_attempt_id;
    
    -- Get the number of rows updated
    GET DIAGNOSTICS update_count = ROW_COUNT;
    
    -- Debug: Log update result
    RAISE NOTICE 'Updated % rows for attempt_id: %', update_count, input_attempt_id;
    
    -- Verify the update
    IF update_count = 0 THEN
      RAISE EXCEPTION 'Error updating attempt %: Failed to update attempt % - no rows were updated. Attempt exists but UPDATE failed. Check constraints or triggers.', 
        input_attempt_id, input_attempt_id;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Error updating attempt %: %', input_attempt_id, SQLERRM;
  END;

  -- Debug: Log successful completion
  RAISE NOTICE 'Manual grading completed successfully for attempt: %', input_attempt_id;
END;
$$;


ALTER FUNCTION "public"."complete_standalone_quiz_manual_grading"("input_attempt_id" "uuid", "input_teacher_id" "uuid", "grades_data" "jsonb", "overall_feedback" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."complete_standalone_quiz_manual_grading"("input_attempt_id" "uuid", "input_teacher_id" "uuid", "grades_data" "jsonb", "overall_feedback" "text") IS 'Completes manual grading for standalone quiz attempts. Calculates correct points earned based on grade percentage and question points.';



CREATE OR REPLACE FUNCTION "public"."create_message_status_records"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Insert status records for all participants in the conversation
  INSERT INTO message_status (message_id, user_id, status)
  SELECT NEW.id, cp.user_id, 
    CASE 
      WHEN cp.user_id = NEW.sender_id THEN 'read'
      ELSE 'sent'
    END
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id 
    AND cp.left_at IS NULL;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_message_status_records"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_quiz_attempt"("p_user_id" "uuid", "p_lesson_content_id" "uuid", "p_answers" "jsonb", "p_results" "jsonb", "p_score" numeric, "p_retry_reason" "text" DEFAULT NULL::"text", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    next_attempt_number INTEGER;
    retry_settings JSONB;
    requires_approval BOOLEAN;
    attempt_id UUID;
    result JSONB;
BEGIN
    -- Get next attempt number
    SELECT COALESCE(MAX(attempt_number), 0) + 1
    INTO next_attempt_number
    FROM public.quiz_attempts
    WHERE user_id = p_user_id AND lesson_content_id = p_lesson_content_id;
    
    -- Get retry settings
    SELECT clc.retry_settings INTO retry_settings
    FROM public.course_lesson_content clc
    WHERE clc.id = p_lesson_content_id;
    
    requires_approval := COALESCE((retry_settings->>'requireTeacherApproval')::boolean, false);
    
    -- Create the attempt
    INSERT INTO public.quiz_attempts (
        user_id,
        lesson_content_id,
        attempt_number,
        answers,
        results,
        score,
        retry_reason,
        teacher_approval_required,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_lesson_content_id,
        next_attempt_number,
        p_answers,
        p_results,
        p_score,
        p_retry_reason,
        requires_approval AND next_attempt_number > 1,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO attempt_id;
    
    -- If approval required, create a retry request
    IF requires_approval AND next_attempt_number > 1 THEN
        INSERT INTO public.quiz_retry_requests (
            user_id,
            lesson_content_id,
            current_attempt_id,
            request_reason
        ) VALUES (
            p_user_id,
            p_lesson_content_id,
            attempt_id,
            COALESCE(p_retry_reason, 'Retry request')
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'attemptId', attempt_id,
        'attemptNumber', next_attempt_number,
        'requiresApproval', requires_approval AND next_attempt_number > 1
    );
END;
$$;


ALTER FUNCTION "public"."create_quiz_attempt"("p_user_id" "uuid", "p_lesson_content_id" "uuid", "p_answers" "jsonb", "p_results" "jsonb", "p_score" numeric, "p_retry_reason" "text", "p_ip_address" "inet", "p_user_agent" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_quiz_attempt"("p_user_id" "uuid", "p_lesson_content_id" "uuid", "p_answers" "jsonb", "p_results" "jsonb", "p_score" numeric, "p_retry_reason" "text", "p_ip_address" "inet", "p_user_agent" "text") IS 'Creates a new quiz attempt with retry tracking';



CREATE OR REPLACE FUNCTION "public"."create_quiz_submission_with_attempt_tracking"("p_user_id" "uuid", "p_lesson_content_id" "uuid", "p_lesson_id" "uuid", "p_course_id" "uuid", "p_answers" "jsonb", "p_results" "jsonb", "p_score" numeric, "p_manual_grading_required" boolean DEFAULT false, "p_manual_grading_completed" boolean DEFAULT false, "p_retry_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("submission_id" "uuid", "attempt_number" integer, "is_latest_attempt" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_attempt_number INTEGER;
  new_submission_id UUID;
BEGIN
  -- Get the next attempt number for this user/lesson combination
  SELECT COALESCE(MAX(qs.attempt_number), 0) + 1
  INTO new_attempt_number
  FROM quiz_submissions qs
  WHERE qs.user_id = p_user_id 
  AND qs.lesson_content_id = p_lesson_content_id;
  
  -- Mark all previous attempts as not latest
  UPDATE quiz_submissions 
  SET is_latest_attempt = false
  WHERE user_id = p_user_id 
  AND lesson_content_id = p_lesson_content_id;
  
  -- Insert the new submission
  INSERT INTO quiz_submissions (
    user_id,
    lesson_content_id,
    lesson_id,
    course_id,
    answers,
    results,
    score,
    manual_grading_required,
    manual_grading_completed,
    attempt_number,
    is_latest_attempt,
    retry_reason
  ) VALUES (
    p_user_id,
    p_lesson_content_id,
    p_lesson_id,
    p_course_id,
    p_answers,
    p_results,
    p_score,
    p_manual_grading_required,
    p_manual_grading_completed,
    new_attempt_number,
    true, -- This is always the latest attempt
    p_retry_reason
  ) RETURNING id INTO new_submission_id;
  
  -- Return the submission details
  RETURN QUERY SELECT new_submission_id, new_attempt_number, true;
END;
$$;


ALTER FUNCTION "public"."create_quiz_submission_with_attempt_tracking"("p_user_id" "uuid", "p_lesson_content_id" "uuid", "p_lesson_id" "uuid", "p_course_id" "uuid", "p_answers" "jsonb", "p_results" "jsonb", "p_score" numeric, "p_manual_grading_required" boolean, "p_manual_grading_completed" boolean, "p_retry_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_session"("p_user_id" "uuid", "p_session_token" "text", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text", "p_location" "text" DEFAULT NULL::"text", "p_session_duration_hours" integer DEFAULT 24) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    session_id UUID;
BEGIN
    -- Deactivate any existing sessions for this user
    UPDATE user_sessions 
    SET is_active = FALSE 
    WHERE user_id = p_user_id AND is_active = TRUE;
    
    -- Create new session
    INSERT INTO user_sessions (
        user_id,
        session_token,
        ip_address,
        user_agent,
        location,
        expires_at
    ) VALUES (
        p_user_id,
        p_session_token,
        p_ip_address,
        p_user_agent,
        p_location,
        NOW() + (p_session_duration_hours || ' hours')::INTERVAL
    ) RETURNING id INTO session_id;
    
    RETURN session_id;
END;
$$;


ALTER FUNCTION "public"."create_user_session"("p_user_id" "uuid", "p_session_token" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_location" "text", "p_session_duration_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_status_record"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Insert user status record if it doesn't exist
  INSERT INTO user_status (user_id, status, last_seen_at)
  VALUES (NEW.user_id, 'offline', NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_user_status_record"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deactivate_session"("p_session_token" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE user_sessions 
    SET is_active = FALSE
    WHERE session_token = p_session_token;
    
    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."deactivate_session"("p_session_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_engagement_metrics"("teacher_id" "uuid", "time_range" "text" DEFAULT 'alltime'::"text") RETURNS TABLE("debug_info" "text", "count_value" integer, "details" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  start_date TIMESTAMP;
BEGIN
  -- Set date range based on time_range parameter
  CASE time_range
    WHEN '7days' THEN
      start_date := NOW() - INTERVAL '7 days';
    WHEN '30days' THEN
      start_date := NOW() - INTERVAL '30 days';
    WHEN '3months' THEN
      start_date := NOW() - INTERVAL '3 months';
    WHEN '6months' THEN
      start_date := NOW() - INTERVAL '6 months';
    WHEN '1year' THEN
      start_date := NOW() - INTERVAL '1 year';
    ELSE -- alltime
      start_date := '2020-01-01'::TIMESTAMP;
  END CASE;

  RETURN QUERY
  WITH teacher_courses AS (
    SELECT DISTINCT cm.course_id
    FROM course_members cm
    WHERE cm.user_id = teacher_id AND cm.role = 'teacher'
  ),
  student_enrollments AS (
    SELECT DISTINCT cm.user_id
    FROM course_members cm
    JOIN teacher_courses tc ON cm.course_id = tc.course_id
    WHERE cm.role = 'student'
  ),
  course_lessons AS (
    SELECT cl.id, cl.section_id, cl.type
    FROM course_lessons cl
    JOIN course_sections cs ON cl.section_id = cs.id
    JOIN teacher_courses tc ON cs.course_id = tc.course_id
  ),
  progress_data AS (
    SELECT 
      ucp.user_id,
      ucp.updated_at,
      ucp.completed_at,
      ucp.progress_seconds
    FROM user_course_progress ucp
    JOIN course_lessons cl ON ucp.lesson_id = cl.id
  )
  SELECT 'teacher_courses'::TEXT, COUNT(*)::INTEGER, 'Courses where teacher is a member'::TEXT
  FROM teacher_courses
  
  UNION ALL
  
  SELECT 'enrolled_students'::TEXT, COUNT(*)::INTEGER, 'Students enrolled in teacher courses'::TEXT
  FROM student_enrollments
  
  UNION ALL
  
  SELECT 'course_lessons'::TEXT, COUNT(*)::INTEGER, 'Lessons in teacher courses'::TEXT
  FROM course_lessons
  
  UNION ALL
  
  SELECT 'progress_records'::TEXT, COUNT(*)::INTEGER, 'Total progress records'::TEXT
  FROM progress_data
  
  UNION ALL
  
  SELECT 'recent_activity'::TEXT, COUNT(DISTINCT user_id)::INTEGER, 'Students with recent activity'::TEXT
  FROM progress_data
  WHERE updated_at >= start_date
  
  UNION ALL
  
  SELECT 'completed_lessons'::TEXT, COUNT(DISTINCT user_id)::INTEGER, 'Students with completed lessons'::TEXT
  FROM progress_data
  WHERE completed_at IS NOT NULL
  
  UNION ALL
  
  SELECT 'time_spent'::TEXT, COUNT(DISTINCT user_id)::INTEGER, 'Students who spent time on lessons'::TEXT
  FROM progress_data
  WHERE progress_seconds > 0
  
  UNION ALL
  
  SELECT 'engagement_activity'::TEXT, COUNT(DISTINCT user_id)::INTEGER, 'Students with any engagement activity'::TEXT
  FROM progress_data
  WHERE updated_at >= start_date
     OR (completed_at IS NOT NULL AND completed_at >= start_date)
     OR progress_seconds > 0;
END;
$$;


ALTER FUNCTION "public"."debug_engagement_metrics"("teacher_id" "uuid", "time_range" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_teacher_data"("teacher_id" "uuid") RETURNS TABLE("data_type" "text", "count_value" integer, "details" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 'teacher_courses'::TEXT, COUNT(*)::INTEGER, 'Courses where teacher is a member'::TEXT
  FROM course_members cm
  WHERE cm.user_id = teacher_id AND cm.role = 'teacher'
  
  UNION ALL
  
  SELECT 'total_students'::TEXT, COUNT(DISTINCT cm.user_id)::INTEGER, 'Students in teacher courses'::TEXT
  FROM course_members cm
  JOIN course_members cm_teacher ON cm.course_id = cm_teacher.course_id
  WHERE cm_teacher.user_id = teacher_id AND cm_teacher.role = 'teacher' AND cm.role = 'student'
  
  UNION ALL
  
  SELECT 'course_lessons'::TEXT, COUNT(*)::INTEGER, 'Lessons in teacher courses'::TEXT
  FROM course_lessons cl
  JOIN course_sections cs ON cl.section_id = cs.id
  JOIN course_members cm ON cs.course_id = cm.course_id
  WHERE cm.user_id = teacher_id AND cm.role = 'teacher'
  
  UNION ALL
  
  SELECT 'user_progress'::TEXT, COUNT(*)::INTEGER, 'User progress records'::TEXT
  FROM user_course_progress ucp
  JOIN course_lessons cl ON ucp.lesson_id = cl.id
  JOIN course_sections cs ON cl.section_id = cs.id
  JOIN course_members cm ON cs.course_id = cm.course_id
  WHERE cm.user_id = teacher_id AND cm.role = 'teacher'
  
  UNION ALL
  
  SELECT 'assignment_submissions'::TEXT, COUNT(*)::INTEGER, 'Assignment submissions'::TEXT
  FROM assignment_submissions as2
  JOIN course_lessons cl ON as2.assignment_id = cl.id
  JOIN course_sections cs ON cl.section_id = cs.id
  JOIN course_members cm ON cs.course_id = cm.course_id
  WHERE cm.user_id = teacher_id AND cm.role = 'teacher';
END;
$$;


ALTER FUNCTION "public"."debug_teacher_data"("teacher_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."disable_mfa_for_user"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  factor_record RECORD;
BEGIN
  -- Check if the current user is an admin
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Only administrators can disable MFA for users.';
  END IF;

  -- First, remove all MFA factors for the user
  -- Note: We can't directly delete from auth.mfa_factors due to RLS,
  -- so we'll use the Supabase MFA API through a service function
  -- For now, we'll update the metadata and let the frontend handle factor removal
  
  -- Update the user's metadata to indicate MFA is disabled
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"mfa_enabled": "false", "mfa_disabled_by_admin": "true"}'::jsonb
  WHERE id = user_id;
  
  -- Also update the profiles table if needed
  UPDATE profiles 
  SET updated_at = NOW()
  WHERE id = user_id;
  
  -- Log the action for audit purposes
  INSERT INTO access_logs (user_id, action, details, ip_address, user_agent)
  VALUES (
    auth.uid(),
    'disable_mfa_for_user',
    jsonb_build_object(
      'target_user_id', user_id,
      'target_user_email', (SELECT email FROM profiles WHERE id = user_id),
      'admin_user_id', auth.uid(),
      'admin_user_email', (SELECT email FROM profiles WHERE id = auth.uid())
    ),
    'admin_action',
    'admin_dashboard'
  );
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."disable_mfa_for_user"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."duplicate_standalone_quiz"("original_quiz_id" "uuid", "new_title" "text", "new_author_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_quiz_id uuid;
  question_record RECORD;
  option_record RECORD;
BEGIN
  -- Create new quiz
  INSERT INTO public.standalone_quizzes (
    title, description, instructions, time_limit_minutes, max_attempts, 
    passing_score, shuffle_questions, shuffle_options, show_correct_answers,
    show_results_immediately, allow_retake, retry_settings, status, 
    visibility, tags, difficulty_level, estimated_duration_minutes, author_id
  )
  SELECT 
    new_title, description, instructions, time_limit_minutes, max_attempts,
    passing_score, shuffle_questions, shuffle_options, show_correct_answers,
    show_results_immediately, allow_retake, retry_settings, 'draft',
    'private', tags, difficulty_level, estimated_duration_minutes, new_author_id
  FROM public.standalone_quizzes
  WHERE id = original_quiz_id
  RETURNING id INTO new_quiz_id;

  -- Duplicate questions
  FOR question_record IN 
    SELECT * FROM public.standalone_quiz_questions 
    WHERE quiz_id = original_quiz_id 
    ORDER BY position
  LOOP
    INSERT INTO public.standalone_quiz_questions (
      quiz_id, question_text, question_type, position, points, explanation,
      math_expression, math_tolerance, math_hint, math_allow_drawing, is_required
    )
    VALUES (
      new_quiz_id, question_record.question_text, question_record.question_type,
      question_record.position, question_record.points, question_record.explanation,
      question_record.math_expression, question_record.math_tolerance,
      question_record.math_hint, question_record.math_allow_drawing, question_record.is_required
    )
    RETURNING id INTO question_record.id;

    -- Duplicate options
    FOR option_record IN 
      SELECT * FROM public.standalone_question_options 
      WHERE question_id = question_record.id 
      ORDER BY position
    LOOP
      INSERT INTO public.standalone_question_options (
        question_id, option_text, is_correct, position
      )
      VALUES (
        question_record.id, option_record.option_text, option_record.is_correct, option_record.position
      );
    END LOOP;
  END LOOP;

  RETURN new_quiz_id;
END;
$$;


ALTER FUNCTION "public"."duplicate_standalone_quiz"("original_quiz_id" "uuid", "new_title" "text", "new_author_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."duplicate_standalone_quiz"("original_quiz_id" "uuid", "new_title" "text", "new_author_id" "uuid") IS 'Creates a copy of an existing quiz';



CREATE OR REPLACE FUNCTION "public"."evaluate_math_expression"("user_expression" "text", "correct_expression" "text", "tolerance" numeric DEFAULT 0.01) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result JSONB;
BEGIN
  -- This is a placeholder function - actual math evaluation will be done in the application
  -- The database stores the expressions and the app handles the mathematical evaluation
  result := jsonb_build_object(
    'user_expression', user_expression,
    'correct_expression', correct_expression,
    'tolerance', tolerance,
    'evaluation_pending', true
  );
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."evaluate_math_expression"("user_expression" "text", "correct_expression" "text", "tolerance" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_old_secure_links"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE secure_links 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' AND expiry < NOW();
END;
$$;


ALTER FUNCTION "public"."expire_old_secure_links"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fix_all_manual_grading_flags"() RETURNS TABLE("attempt_id" "uuid", "quiz_id" "uuid", "quiz_title" "text", "was_incorrect" boolean, "now_correct" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH attempts_to_fix AS (
    SELECT 
      sqa.id as attempt_id,
      sqa.quiz_id,
      sq.title as quiz_title,
      sqa.manual_grading_required as current_required,
      check_standalone_quiz_manual_grading_required(sqa.quiz_id) as should_require
    FROM standalone_quiz_attempts sqa
    JOIN standalone_quizzes sq ON sq.id = sqa.quiz_id
    WHERE sqa.manual_grading_required != check_standalone_quiz_manual_grading_required(sqa.quiz_id)
  )
  UPDATE standalone_quiz_attempts 
  SET 
    manual_grading_required = atf.should_require,
    manual_grading_completed = NOT atf.should_require,
    score = CASE 
      WHEN atf.should_require THEN NULL 
      ELSE standalone_quiz_attempts.score 
    END
  FROM attempts_to_fix atf
  WHERE standalone_quiz_attempts.id = atf.attempt_id
  RETURNING 
    standalone_quiz_attempts.id as attempt_id,
    standalone_quiz_attempts.quiz_id,
    (SELECT title FROM standalone_quizzes WHERE id = standalone_quiz_attempts.quiz_id) as quiz_title,
    atf.current_required as was_incorrect,
    atf.should_require as now_correct;
END;
$$;


ALTER FUNCTION "public"."fix_all_manual_grading_flags"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fix_all_manual_grading_flags"() IS 'Fix all quiz attempts that have incorrect manual grading flags';



CREATE OR REPLACE FUNCTION "public"."force_mfa_reset_for_user"("target_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  factors_removed INTEGER := 0;
  result JSONB;
BEGIN
  -- Check if user exists and has mfa_reset_required flag
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = target_user_id AND mfa_reset_required = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found or MFA reset not required'
    );
  END IF;

  -- Remove all MFA factors for the user
  DELETE FROM auth.mfa_factors 
  WHERE user_id = target_user_id;
  
  GET DIAGNOSTICS factors_removed = ROW_COUNT;

  -- Update user metadata to clear MFA flags
  UPDATE auth.users 
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object(
    'mfa_enabled', 'false',
    'mfa_reset_required', 'false',
    'mfa_factors_removed_by_backup_code', 'true',
    'mfa_removed_at', now()::text
  )
  WHERE id = target_user_id;

  -- Update profile to clear reset flags
  UPDATE profiles 
  SET 
    mfa_reset_required = false,
    mfa_reset_requested_at = null,
    two_factor_setup_completed_at = null
  WHERE id = target_user_id;



  result := jsonb_build_object(
    'success', true,
    'factors_removed', factors_removed,
    'message', 'MFA factors removed successfully. User will be prompted to set up MFA again if required for their role.'
  );

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."force_mfa_reset_for_user"("target_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."force_mfa_reset_for_user"("target_user_id" "uuid") IS 'Removes all MFA factors for a user who used a backup code and marks them for fresh MFA setup';



CREATE OR REPLACE FUNCTION "public"."get_2fa_statistics"() RETURNS TABLE("total_users" integer, "users_with_2fa" integer, "users_without_2fa" integer, "two_fa_percentage" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_2fa_statistics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_sessions"() RETURNS TABLE("user_id" "uuid", "user_email" "text", "ip_address" "inet", "location" "text", "last_activity" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Clean up expired sessions first
    UPDATE user_sessions 
    SET is_active = FALSE 
    WHERE expires_at < NOW() AND is_active = TRUE;
    
    RETURN QUERY
    SELECT 
        us.user_id,
        u.email,
        us.ip_address,
        us.location,
        us.last_activity,
        us.created_at
    FROM user_sessions us
    LEFT JOIN auth.users u ON us.user_id = u.id
    WHERE us.is_active = TRUE 
    AND us.expires_at > NOW()
    ORDER BY us.last_activity DESC;
END;
$$;


ALTER FUNCTION "public"."get_active_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_sessions_count"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    active_count INTEGER;
BEGIN
    -- Clean up expired sessions first
    UPDATE user_sessions 
    SET is_active = FALSE 
    WHERE expires_at < NOW() AND is_active = TRUE;
    
    -- Count active sessions
    SELECT COUNT(*) INTO active_count
    FROM user_sessions 
    WHERE is_active = TRUE 
    AND expires_at > NOW();
    
    RETURN COALESCE(active_count, 0);
END;
$$;


ALTER FUNCTION "public"."get_active_sessions_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_assessments_data"("search_query" "text" DEFAULT ''::"text", "course_filter_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "title" "text", "course" "text", "course_id" "uuid", "type" "text", "due_date" timestamp with time zone, "submissions" bigint, "graded" bigint, "avg_score" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH all_courses AS (
    SELECT c.id, c.title
    FROM courses c
    WHERE c.status = 'Published'
      AND (course_filter_id IS NULL OR c.id = course_filter_id)
  ),
  assessments AS (
    SELECT
      clc.id,
      clc.title,
      ac.title AS course,
      ac.id AS course_id,
      clc.content_type AS type,
      clc.due_date
    FROM course_lesson_content clc
    JOIN course_lessons cl ON clc.lesson_id = cl.id
    JOIN course_sections cs ON cl.section_id = cs.id
    JOIN all_courses ac ON cs.course_id = ac.id
    WHERE clc.content_type IN ('assignment', 'quiz')
      AND (search_query = '' OR clc.title ILIKE '%' || search_query || '%')
  ),
  quiz_stats AS (
    SELECT
      a.id,
      COUNT(qs.id) AS submissions,
      COUNT(qs.id) AS graded,
      COALESCE(AVG(qs.score), 0)::NUMERIC AS avg_score
    FROM assessments a
    JOIN quiz_submissions qs ON a.id = qs.lesson_content_id
    WHERE a.type = 'quiz'
    GROUP BY a.id
  ),
  assignment_stats AS (
    SELECT
      a.id,
      COUNT(asub.id) AS submissions,
      COUNT(CASE WHEN asub.status = 'graded' THEN 1 END) AS graded,
      COALESCE(AVG(asub.grade), 0)::NUMERIC AS avg_score
    FROM assessments a
    JOIN assignment_submissions asub ON a.id = asub.assignment_id
    WHERE a.type = 'assignment'
    GROUP BY a.id
  )
  SELECT
    a.id,
    a.title,
    a.course,
    a.course_id,
    a.type,
    a.due_date,
    COALESCE(qs.submissions, asub.submissions, 0) AS submissions,
    COALESCE(qs.graded, asub.graded, 0) AS graded,
    COALESCE(qs.avg_score, asub.avg_score, 0) AS avg_score
  FROM assessments a
  LEFT JOIN quiz_stats qs ON a.id = qs.id AND a.type = 'quiz'
  LEFT JOIN assignment_stats asub ON a.id = asub.id AND a.type = 'assignment'
  ORDER BY a.due_date DESC NULLS LAST, a.title;
END;
$$;


ALTER FUNCTION "public"."get_admin_assessments_data"("search_query" "text", "course_filter_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_admin_assessments_data"("search_query" "text", "course_filter_id" "uuid") IS 'Get all assessments across all courses for admin view with statistics';



CREATE OR REPLACE FUNCTION "public"."get_admin_course_analytics"() RETURNS TABLE("course_id" "uuid", "course_title" "text", "enrolled_students" integer, "completed_students" integer, "in_progress_students" integer, "completion_rate" integer, "average_score" integer, "total_assignments" integer, "completed_assignments" integer, "last_activity" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH course_enrollments AS (
    SELECT
      c.id as course_id,
      c.title as course_title,
      COUNT(CASE WHEN cm.role = 'student' THEN 1 END) as enrolled_students
    FROM public.courses c
    LEFT JOIN public.course_members cm ON c.id = cm.course_id
    WHERE c.status = 'Published'
    GROUP BY c.id, c.title
  ),
  course_content_totals AS (
    SELECT
      cs.course_id,
      COUNT(clc.id) AS total_content_items
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    JOIN public.courses c ON cs.course_id = c.id
    WHERE c.status = 'Published'
    GROUP BY cs.course_id
  ),
  student_progress_by_course AS (
    SELECT
      cm.course_id,
      cm.user_id,
      cct.total_content_items,
      COUNT(ucip.id) AS completed_content_items
    FROM public.course_members cm
    JOIN course_content_totals cct ON cm.course_id = cct.course_id
    LEFT JOIN public.user_content_item_progress ucip ON cm.user_id = ucip.user_id
      AND cm.course_id = ucip.course_id
      AND ucip.status = 'completed'
    WHERE cm.role = 'student'
    GROUP BY cm.course_id, cm.user_id, cct.total_content_items
  ),
  course_completion_stats AS (
    SELECT
      spc.course_id,
      COUNT(*) as total_students,
      COUNT(CASE WHEN spc.completed_content_items = spc.total_content_items THEN 1 END) as completed_students,
      COUNT(CASE WHEN spc.completed_content_items > 0 AND spc.completed_content_items < spc.total_content_items THEN 1 END) as in_progress_students,
      AVG(CASE 
        WHEN spc.total_content_items > 0 THEN (spc.completed_content_items::decimal / spc.total_content_items) * 100
        ELSE 0 
      END)::integer as avg_completion_rate
    FROM student_progress_by_course spc
    GROUP BY spc.course_id
  ),
  course_assignments AS (
    SELECT
      cs.course_id,
      COUNT(clc.id) as total_assignments
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    JOIN public.courses c ON cs.course_id = c.id
    WHERE c.status = 'Published'
      AND clc.content_type = 'assignment'
    GROUP BY cs.course_id
  ),
  course_submissions AS (
    SELECT
      cs.course_id,
      COUNT(asub.id) as completed_assignments,
      AVG(asub.grade)::integer as avg_score
    FROM public.assignment_submissions asub
    JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    JOIN public.courses c ON cs.course_id = c.id
    WHERE c.status = 'Published'
      AND asub.grade IS NOT NULL
    GROUP BY cs.course_id
  ),
  course_last_activity AS (
    SELECT
      ucip.course_id,
      MAX(ucip.updated_at) as last_activity
    FROM public.user_content_item_progress ucip
    JOIN public.courses c ON ucip.course_id = c.id
    WHERE c.status = 'Published'
    GROUP BY ucip.course_id
  )
  SELECT
    ce.course_id::uuid,
    ce.course_title::text,
    ce.enrolled_students::integer,
    COALESCE(ccs.completed_students, 0)::integer as completed_students,
    COALESCE(ccs.in_progress_students, 0)::integer as in_progress_students,
    COALESCE(ccs.avg_completion_rate, 0)::integer as completion_rate,
    COALESCE(cs.avg_score, 0)::integer as average_score,
    COALESCE(ca.total_assignments, 0)::integer as total_assignments,
    COALESCE(cs.completed_assignments, 0)::integer as completed_assignments,
    COALESCE(cla.last_activity, NOW())::timestamp with time zone as last_activity
  FROM course_enrollments ce
  LEFT JOIN course_completion_stats ccs ON ce.course_id = ccs.course_id
  LEFT JOIN course_assignments ca ON ce.course_id = ca.course_id
  LEFT JOIN course_submissions cs ON ce.course_id = cs.course_id
  LEFT JOIN course_last_activity cla ON ce.course_id = cla.course_id
  ORDER BY ce.enrolled_students DESC, ce.course_title
  LIMIT 10;
END;
$$;


ALTER FUNCTION "public"."get_admin_course_analytics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_course_analytics_with_filters"("filter_country_id" "uuid" DEFAULT NULL::"uuid", "filter_region_id" "uuid" DEFAULT NULL::"uuid", "filter_city_id" "uuid" DEFAULT NULL::"uuid", "filter_project_id" "uuid" DEFAULT NULL::"uuid", "filter_board_id" "uuid" DEFAULT NULL::"uuid", "filter_school_id" "uuid" DEFAULT NULL::"uuid", "filter_class_id" "uuid" DEFAULT NULL::"uuid", "filter_grade" "text" DEFAULT NULL::"text") RETURNS TABLE("course_id" "uuid", "course_title" "text", "enrolled_students" bigint, "completed_students" bigint, "completion_rate" numeric, "average_score" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH course_enrollments AS (
    SELECT 
      c.id as course_id,
      c.title as course_title,
      COUNT(DISTINCT cm.user_id) as enrolled_students,
      COUNT(DISTINCT CASE WHEN ucp.completed_at IS NOT NULL THEN cm.user_id END) as completed_students,
      CASE 
        WHEN COUNT(DISTINCT cm.user_id) > 0 
        THEN ROUND((COUNT(DISTINCT CASE WHEN ucp.completed_at IS NOT NULL THEN cm.user_id END)::NUMERIC / COUNT(DISTINCT cm.user_id)::NUMERIC) * 100, 2)
        ELSE 0 
      END as completion_rate
    FROM public.courses c
    LEFT JOIN public.course_members cm ON c.id = cm.course_id AND cm.role = 'student'
    LEFT JOIN public.user_content_item_progress ucp ON cm.user_id = ucp.user_id AND c.id = ucp.course_id
    LEFT JOIN public.profiles p ON cm.user_id = p.id AND p.role = 'student'
    LEFT JOIN public.class_students cs ON p.id = cs.student_id
    LEFT JOIN public.classes cl ON cs.class_id = cl.id
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON cl.board_id = b.id
    LEFT JOIN public.projects pr ON b.project_id = pr.id
    LEFT JOIN public.cities ci ON pr.city_id = ci.id
    LEFT JOIN public.regions r ON ci.region_id = r.id
    LEFT JOIN public.countries co ON r.country_id = co.id
    WHERE c.status = 'Published'
      AND (
        -- When no filters are applied, show all published courses
        (filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
         AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL 
         AND filter_class_id IS NULL AND filter_grade IS NULL)
        -- When filters are applied, check hierarchy
        OR (filter_country_id IS NULL OR co.id = filter_country_id)
        AND (filter_region_id IS NULL OR r.id = filter_region_id)
        AND (filter_city_id IS NULL OR ci.id = filter_city_id)
        AND (filter_project_id IS NULL OR pr.id = filter_project_id)
        AND (filter_board_id IS NULL OR b.id = filter_board_id)
        AND (filter_school_id IS NULL OR s.id = filter_school_id)
        AND (filter_class_id IS NULL OR cl.id = filter_class_id)
        AND (filter_grade IS NULL OR cl.grade = filter_grade)
      )
      -- Also filter courses by their class_ids and school_ids arrays
      AND (filter_class_id IS NULL OR filter_class_id = ANY(c.class_ids))
      AND (filter_school_id IS NULL OR filter_school_id = ANY(c.school_ids))
      AND (filter_grade IS NULL OR EXISTS (
        SELECT 1 FROM classes cl2 
        WHERE cl2.id = ANY(c.class_ids) 
        AND cl2.grade = filter_grade
      ))
    GROUP BY c.id, c.title
  ),
  course_scores AS (
    SELECT 
      c.id as course_id,
      AVG(COALESCE(qs.score, 0))::NUMERIC as average_score
    FROM public.courses c
    LEFT JOIN public.course_members cm ON c.id = cm.course_id AND cm.role = 'student'
    LEFT JOIN public.quiz_submissions qs ON cm.user_id = qs.user_id AND c.id = qs.course_id
    LEFT JOIN public.profiles p ON cm.user_id = p.id AND p.role = 'student'
    LEFT JOIN public.class_students cs ON p.id = cs.student_id
    LEFT JOIN public.classes cl ON cs.class_id = cl.id
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON cl.board_id = b.id
    LEFT JOIN public.projects pr ON b.project_id = pr.id
    LEFT JOIN public.cities ci ON pr.city_id = ci.id
    LEFT JOIN public.regions r ON ci.region_id = r.id
    LEFT JOIN public.countries co ON r.country_id = co.id
    WHERE c.status = 'Published'
      AND (
        -- When no filters are applied, show all published courses
        (filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
         AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL 
         AND filter_class_id IS NULL AND filter_grade IS NULL)
        -- When filters are applied, check hierarchy
        OR (filter_country_id IS NULL OR co.id = filter_country_id)
        AND (filter_region_id IS NULL OR r.id = filter_region_id)
        AND (filter_city_id IS NULL OR ci.id = filter_city_id)
        AND (filter_project_id IS NULL OR pr.id = filter_project_id)
        AND (filter_board_id IS NULL OR b.id = filter_board_id)
        AND (filter_school_id IS NULL OR s.id = filter_school_id)
        AND (filter_class_id IS NULL OR cl.id = filter_class_id)
        AND (filter_grade IS NULL OR cl.grade = filter_grade)
      )
      -- Also filter courses by their class_ids and school_ids arrays
      AND (filter_class_id IS NULL OR filter_class_id = ANY(c.class_ids))
      AND (filter_school_id IS NULL OR filter_school_id = ANY(c.school_ids))
      AND (filter_grade IS NULL OR EXISTS (
        SELECT 1 FROM classes cl2 
        WHERE cl2.id = ANY(c.class_ids) 
        AND cl2.grade = filter_grade
      ))
    GROUP BY c.id
  )
  SELECT 
    ce.course_id,
    ce.course_title,
    ce.enrolled_students,
    ce.completed_students,
    ce.completion_rate,
    COALESCE(cs.average_score, 0) as average_score
  FROM course_enrollments ce
  LEFT JOIN course_scores cs ON ce.course_id = cs.course_id
  ORDER BY ce.enrolled_students DESC, ce.completion_rate DESC
  LIMIT 20;
END;
$$;


ALTER FUNCTION "public"."get_admin_course_analytics_with_filters"("filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_dashboard_stats"("time_range" "text") RETURNS TABLE("total_users" integer, "total_teachers" integer, "total_students" integer, "total_admins" integer, "total_courses" integer, "active_courses" integer, "completed_assignments" integer, "active_discussions" integer, "avg_engagement" integer, "new_users_this_month" integer, "course_completion_rate" integer, "total_logins" integer, "active_users_percentage" integer, "course_engagement_percentage" integer, "discussion_participation_percentage" integer, "assignment_completion_percentage" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  start_date TIMESTAMP;
  end_date TIMESTAMP;
BEGIN
  -- Set date range based on time_range parameter
  CASE time_range
    WHEN '7days' THEN
      start_date := NOW() - INTERVAL '7 days';
    WHEN '30days' THEN
      start_date := NOW() - INTERVAL '30 days';
    WHEN '3months' THEN
      start_date := NOW() - INTERVAL '3 months';
    WHEN '6months' THEN
      start_date := NOW() - INTERVAL '6 months';
    WHEN '1year' THEN
      start_date := NOW() - INTERVAL '1 year';
    ELSE -- alltime
      start_date := '2020-01-01'::TIMESTAMP;
  END CASE;
  
  end_date := NOW();

  RETURN QUERY
  WITH user_counts AS (
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN role = 'teacher' THEN 1 END) as total_teachers,
      COUNT(CASE WHEN role = 'student' THEN 1 END) as total_students,
      COUNT(CASE WHEN role = 'admin' THEN 1 END) as total_admins,
      COUNT(CASE WHEN created_at BETWEEN start_date AND end_date THEN 1 END) as new_users_in_period
    FROM profiles
  ),
  course_counts AS (
    SELECT 
      COUNT(*) as total_courses,
      COUNT(CASE WHEN status = 'Published' THEN 1 END) as active_courses
    FROM courses
  ),
  assignment_stats AS (
    SELECT 
      COUNT(*) as completed_assignments
    FROM assignment_submissions
    WHERE status = 'graded' AND submitted_at BETWEEN start_date AND end_date
  ),
  discussion_stats AS (
    SELECT 
      COUNT(DISTINCT d.id) as active_discussions
    FROM discussions d
    JOIN discussion_replies dr ON d.id = dr.discussion_id
    WHERE dr.created_at BETWEEN start_date AND end_date
  ),
  engagement_stats AS (
    SELECT 
      COUNT(DISTINCT ucp.user_id) as active_users,
      COUNT(DISTINCT CASE WHEN ucp.completed_at IS NOT NULL AND ucp.completed_at BETWEEN start_date AND end_date THEN ucp.user_id END) as users_with_completions,
      COUNT(DISTINCT CASE WHEN ucp.status IN ('in_progress', 'completed') THEN ucp.user_id END) as users_with_activity
    FROM user_content_item_progress ucp
    WHERE ucp.updated_at BETWEEN start_date AND end_date
  ),
  course_completion_stats AS (
    WITH course_content_counts AS (
      SELECT 
        c.id as course_id, 
        count(clc.id) as total_items
      FROM public.courses c
      JOIN public.course_sections cs ON cs.course_id = c.id
      JOIN public.course_lessons cl ON cl.section_id = cs.id
      JOIN public.course_lesson_content clc ON clc.lesson_id = cl.id
      WHERE c.status = 'Published'
      GROUP BY c.id
    ),
    user_course_completions AS (
      SELECT 
        user_id, 
        course_id, 
        count(id) as completed_items
      FROM public.user_content_item_progress
      WHERE completed_at IS NOT NULL
      GROUP BY user_id, course_id
    ),
    enrollment_progress AS (
      SELECT 
        cm.user_id,
        cm.course_id,
        COALESCE(ucc.completed_items, 0) as completed_items,
        GREATEST(ccc.total_items, 1) as total_items
      FROM public.course_members cm
      JOIN (SELECT DISTINCT user_id FROM public.user_content_item_progress WHERE updated_at BETWEEN start_date AND end_date) as active_users ON cm.user_id = active_users.user_id
      JOIN course_content_counts ccc ON cm.course_id = ccc.course_id
      LEFT JOIN user_course_completions ucc ON cm.user_id = ucc.user_id AND cm.course_id = ucc.course_id
      WHERE cm.role = 'student'
    )
    SELECT
      COALESCE(AVG( (ep.completed_items::DECIMAL * 100) / ep.total_items ), 0) as rate
    FROM enrollment_progress ep
  )
  SELECT 
    uc.total_users::INTEGER,
    uc.total_teachers::INTEGER,
    uc.total_students::INTEGER,
    uc.total_admins::INTEGER,
    cc.total_courses::INTEGER,
    cc.active_courses::INTEGER,
    COALESCE(as2.completed_assignments, 0)::INTEGER as completed_assignments,
    COALESCE(ds.active_discussions, 0)::INTEGER as active_discussions,
    CASE 
      WHEN uc.total_users > 0 THEN
        ROUND((es.active_users::DECIMAL / uc.total_users) * 100)::INTEGER
      ELSE 0
    END as avg_engagement,
    uc.new_users_in_period::INTEGER as new_users_this_month,
    ROUND(ccs.rate)::INTEGER as course_completion_rate,
    uc.total_users::INTEGER as total_logins, -- Using total users as proxy for now
    CASE 
      WHEN uc.total_users > 0 THEN 
        ROUND((es.active_users::DECIMAL / uc.total_users) * 100)::INTEGER
      ELSE 0 
    END as active_users_percentage,
    CASE 
      WHEN uc.total_users > 0 THEN 
        ROUND((es.users_with_activity::DECIMAL / uc.total_users) * 100)::INTEGER
      ELSE 0 
    END as course_engagement_percentage,
    CASE 
      WHEN uc.total_users > 0 THEN 
        ROUND((ds.active_discussions::DECIMAL / uc.total_users) * 100)::INTEGER
      ELSE 0 
    END as discussion_participation_percentage,
    CASE 
      WHEN uc.total_users > 0 THEN 
        ROUND((as2.completed_assignments::DECIMAL / uc.total_users) * 100)::INTEGER
      ELSE 0 
    END as assignment_completion_percentage
  FROM user_counts uc
  CROSS JOIN course_counts cc
  CROSS JOIN assignment_stats as2
  CROSS JOIN discussion_stats ds
  CROSS JOIN engagement_stats es
  CROSS JOIN course_completion_stats ccs;
END;
$$;


ALTER FUNCTION "public"."get_admin_dashboard_stats"("time_range" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_dashboard_stats_with_filters"("time_range" "text" DEFAULT '30days'::"text", "filter_country_id" "uuid" DEFAULT NULL::"uuid", "filter_region_id" "uuid" DEFAULT NULL::"uuid", "filter_city_id" "uuid" DEFAULT NULL::"uuid", "filter_project_id" "uuid" DEFAULT NULL::"uuid", "filter_board_id" "uuid" DEFAULT NULL::"uuid", "filter_school_id" "uuid" DEFAULT NULL::"uuid", "filter_class_id" "uuid" DEFAULT NULL::"uuid", "filter_grade" "text" DEFAULT NULL::"text") RETURNS TABLE("total_users" integer, "total_teachers" integer, "total_students" integer, "total_admins" integer, "total_courses" integer, "active_courses" integer, "completed_assignments" integer, "active_discussions" integer, "avg_engagement" integer, "new_users_this_month" integer, "course_completion_rate" integer, "total_logins" integer, "active_users_percentage" integer, "course_engagement_percentage" integer, "discussion_participation_percentage" integer, "assignment_completion_percentage" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  date_start TIMESTAMP;
  date_end TIMESTAMP;
BEGIN
  -- Set date range based on time_range parameter
  CASE time_range
    WHEN '7days' THEN
      date_start := NOW() - INTERVAL '7 days';
    WHEN '30days' THEN
      date_start := NOW() - INTERVAL '30 days';
    WHEN '3months' THEN
      date_start := NOW() - INTERVAL '3 months';
    WHEN '6months' THEN
      date_start := NOW() - INTERVAL '6 months';
    WHEN '1year' THEN
      date_start := NOW() - INTERVAL '1 year';
    ELSE -- alltime
      date_start := '2020-01-01'::TIMESTAMP;
  END CASE;
  
  date_end := NOW();

  RETURN QUERY
  WITH user_counts AS (
    SELECT 
      COUNT(DISTINCT p.id) as total_users,
      COUNT(DISTINCT CASE WHEN p.role = 'teacher' THEN p.id END) as total_teachers,
      COUNT(DISTINCT CASE WHEN p.role = 'student' THEN p.id END) as total_students,
      COUNT(DISTINCT CASE WHEN p.role = 'admin' THEN p.id END) as total_admins,
      COUNT(DISTINCT CASE WHEN p.created_at BETWEEN date_start AND date_end THEN p.id END) as new_users_in_period
    FROM profiles p
    LEFT JOIN class_students cs ON p.id = cs.student_id AND p.role = 'student'
    LEFT JOIN class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
    LEFT JOIN classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN schools s ON cl.school_id = s.id
    LEFT JOIN boards b ON cl.board_id = b.id
    LEFT JOIN projects pr ON b.project_id = pr.id
    LEFT JOIN cities c ON pr.city_id = c.id
    LEFT JOIN regions r ON c.region_id = r.id
    LEFT JOIN countries co ON r.country_id = co.id
    WHERE 
      (filter_country_id IS NULL OR co.id = filter_country_id)
      AND (filter_region_id IS NULL OR r.id = filter_region_id)
      AND (filter_city_id IS NULL OR c.id = filter_city_id)
      AND (filter_project_id IS NULL OR pr.id = filter_project_id)
      AND (filter_board_id IS NULL OR b.id = filter_board_id)
      AND (filter_school_id IS NULL OR s.id = filter_school_id)
      AND (filter_class_id IS NULL OR cl.id = filter_class_id)
      AND (filter_grade IS NULL OR cl.grade = filter_grade)
      -- Include users who are not in any class (admins, etc.)
      OR (p.role = 'admin' AND filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
          AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL AND filter_class_id IS NULL AND filter_grade IS NULL)
  ),
  course_counts AS (
    SELECT 
      COUNT(*) as total_courses,
      COUNT(CASE WHEN c.status = 'Published' THEN 1 END) as active_courses
    FROM courses c
    WHERE 
      -- When no filters are applied, show all courses
      (filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
       AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL 
       AND filter_class_id IS NULL AND filter_grade IS NULL)
      -- When filters are applied, check hierarchy
      OR EXISTS (
        SELECT 1 FROM classes cl 
        LEFT JOIN schools s ON cl.school_id = s.id
        LEFT JOIN boards b ON s.board_id = b.id
        LEFT JOIN projects pr ON b.project_id = pr.id
        LEFT JOIN cities ci ON pr.city_id = ci.id
        LEFT JOIN regions r ON ci.region_id = r.id
        LEFT JOIN countries co ON r.country_id = co.id
        WHERE cl.id = ANY(c.class_ids)
          AND (filter_country_id IS NULL OR co.id = filter_country_id)
          AND (filter_region_id IS NULL OR r.id = filter_region_id)
          AND (filter_city_id IS NULL OR ci.id = filter_city_id)
          AND (filter_project_id IS NULL OR pr.id = filter_project_id)
          AND (filter_board_id IS NULL OR b.id = filter_board_id)
          AND (filter_school_id IS NULL OR s.id = filter_school_id)
          AND (filter_class_id IS NULL OR cl.id = filter_class_id)
          AND (filter_grade IS NULL OR cl.grade = filter_grade)
      )
      -- Also include courses that match school filters directly
      OR (filter_school_id IS NOT NULL AND filter_school_id = ANY(c.school_ids))
  ),
  assignment_stats AS (
    SELECT 
      COUNT(*) as completed_assignments
    FROM assignment_submissions asub
    JOIN profiles p ON asub.user_id = p.id
    LEFT JOIN class_students cs ON p.id = cs.student_id AND p.role = 'student'
    LEFT JOIN class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
    LEFT JOIN classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN schools s ON cl.school_id = s.id
    LEFT JOIN boards b ON cl.board_id = b.id
    LEFT JOIN projects pr ON b.project_id = pr.id
    LEFT JOIN cities c ON pr.city_id = c.id
    LEFT JOIN regions r ON c.region_id = r.id
    LEFT JOIN countries co ON r.country_id = co.id
    WHERE asub.status = 'graded' 
      AND asub.submitted_at BETWEEN date_start AND date_end
      AND (
        (filter_country_id IS NULL OR co.id = filter_country_id)
        AND (filter_region_id IS NULL OR r.id = filter_region_id)
        AND (filter_city_id IS NULL OR c.id = filter_city_id)
        AND (filter_project_id IS NULL OR pr.id = filter_project_id)
        AND (filter_board_id IS NULL OR b.id = filter_board_id)
        AND (filter_school_id IS NULL OR s.id = filter_school_id)
        AND (filter_class_id IS NULL OR cl.id = filter_class_id)
        AND (filter_grade IS NULL OR cl.grade = filter_grade)
        -- Include assignments from users not in any class (admins, etc.)
        OR (p.role = 'admin' AND filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
            AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL AND filter_class_id IS NULL AND filter_grade IS NULL)
      )
  ),
  discussion_stats AS (
    SELECT 
      COUNT(DISTINCT d.id) as active_discussions
    FROM discussions d
    JOIN discussion_replies dr ON d.id = dr.discussion_id
    JOIN profiles p ON dr.user_id = p.id
    LEFT JOIN class_students cs ON p.id = cs.student_id AND p.role = 'student'
    LEFT JOIN class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
    LEFT JOIN classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN schools s ON cl.school_id = s.id
    LEFT JOIN boards b ON cl.board_id = b.id
    LEFT JOIN projects pr ON b.project_id = pr.id
    LEFT JOIN cities c ON pr.city_id = c.id
    LEFT JOIN regions r ON c.region_id = r.id
    LEFT JOIN countries co ON r.country_id = co.id
    WHERE dr.created_at BETWEEN date_start AND date_end
      AND (
        (filter_country_id IS NULL OR co.id = filter_country_id)
        AND (filter_region_id IS NULL OR r.id = filter_region_id)
        AND (filter_city_id IS NULL OR c.id = filter_city_id)
        AND (filter_project_id IS NULL OR pr.id = filter_project_id)
        AND (filter_board_id IS NULL OR b.id = filter_board_id)
        AND (filter_school_id IS NULL OR s.id = filter_school_id)
        AND (filter_class_id IS NULL OR cl.id = filter_class_id)
        AND (filter_grade IS NULL OR cl.grade = filter_grade)
        -- Include discussions from users not in any class (admins, etc.)
        OR (p.role = 'admin' AND filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
            AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL AND filter_class_id IS NULL AND filter_grade IS NULL)
      )
  ),
  engagement_stats AS (
    SELECT 
      COUNT(DISTINCT ucp.user_id) as active_users,
      COUNT(DISTINCT CASE WHEN ucp.completed_at IS NOT NULL AND ucp.completed_at BETWEEN date_start AND date_end THEN ucp.user_id END) as users_with_completions,
      COUNT(DISTINCT CASE WHEN ucp.status IN ('in_progress', 'completed') THEN ucp.user_id END) as users_with_activity
    FROM user_content_item_progress ucp
    JOIN profiles p ON ucp.user_id = p.id
    LEFT JOIN class_students cs ON p.id = cs.student_id AND p.role = 'student'
    LEFT JOIN class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
    LEFT JOIN classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN schools s ON cl.school_id = s.id
    LEFT JOIN boards b ON cl.board_id = b.id
    LEFT JOIN projects pr ON b.project_id = pr.id
    LEFT JOIN cities c ON pr.city_id = c.id
    LEFT JOIN regions r ON c.region_id = r.id
    LEFT JOIN countries co ON r.country_id = co.id
    WHERE ucp.updated_at BETWEEN date_start AND date_end
      AND (
        (filter_country_id IS NULL OR co.id = filter_country_id)
        AND (filter_region_id IS NULL OR r.id = filter_region_id)
        AND (filter_city_id IS NULL OR c.id = filter_city_id)
        AND (filter_project_id IS NULL OR pr.id = filter_project_id)
        AND (filter_board_id IS NULL OR b.id = filter_board_id)
        AND (filter_school_id IS NULL OR s.id = filter_school_id)
        AND (filter_class_id IS NULL OR cl.id = filter_class_id)
        AND (filter_grade IS NULL OR cl.grade = filter_grade)
        -- Include engagement from users not in any class (admins, etc.)
        OR (p.role = 'admin' AND filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
            AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL AND filter_class_id IS NULL AND filter_grade IS NULL)
      )
  ),
  course_completion_stats AS (
    WITH course_content_counts AS (
      SELECT 
        c.id as course_id, 
        count(clc.id) as total_items
      FROM public.courses c
      JOIN public.course_sections cs ON cs.course_id = c.id
      JOIN public.course_lessons cl ON cl.section_id = cs.id
      JOIN public.course_lesson_content clc ON clc.lesson_id = cl.id
      LEFT JOIN schools s ON s.id = ANY(c.school_ids)
      LEFT JOIN boards b ON s.board_id = b.id
      LEFT JOIN projects pr ON b.project_id = pr.id
      LEFT JOIN cities ci ON pr.city_id = ci.id
      LEFT JOIN regions r ON ci.region_id = r.id
      LEFT JOIN countries co ON r.country_id = co.id
      WHERE c.status = 'Published'
        AND (filter_country_id IS NULL OR co.id = filter_country_id)
        AND (filter_region_id IS NULL OR r.id = filter_region_id)
        AND (filter_city_id IS NULL OR ci.id = filter_city_id)
        AND (filter_project_id IS NULL OR pr.id = filter_project_id)
        AND (filter_board_id IS NULL OR b.id = filter_board_id)
        AND (filter_school_id IS NULL OR filter_school_id = ANY(c.school_ids))
        AND (filter_class_id IS NULL OR filter_class_id = ANY(c.class_ids))
        AND (filter_grade IS NULL OR EXISTS (
          SELECT 1 FROM classes cl2 
          WHERE cl2.id = ANY(c.class_ids) 
          AND cl2.grade = filter_grade
        ))
      GROUP BY c.id
    ),
    user_course_completions AS (
      SELECT 
        ucp.user_id, 
        ucp.course_id, 
        count(ucp.id) as completed_items
      FROM public.user_content_item_progress ucp
      JOIN profiles p ON ucp.user_id = p.id
      LEFT JOIN class_students cs ON p.id = cs.student_id AND p.role = 'student'
      LEFT JOIN class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
      LEFT JOIN classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
      LEFT JOIN schools s ON cl.school_id = s.id
      LEFT JOIN boards b ON cl.board_id = b.id
      LEFT JOIN projects pr ON b.project_id = pr.id
      LEFT JOIN cities c ON pr.city_id = c.id
      LEFT JOIN regions r ON c.region_id = r.id
      LEFT JOIN countries co ON r.country_id = co.id
      WHERE ucp.completed_at IS NOT NULL
        AND (
          (filter_country_id IS NULL OR co.id = filter_country_id)
          AND (filter_region_id IS NULL OR r.id = filter_region_id)
          AND (filter_city_id IS NULL OR c.id = filter_city_id)
          AND (filter_project_id IS NULL OR pr.id = filter_project_id)
          AND (filter_board_id IS NULL OR b.id = filter_board_id)
          AND (filter_school_id IS NULL OR s.id = filter_school_id)
          AND (filter_class_id IS NULL OR cl.id = filter_class_id)
          AND (filter_grade IS NULL OR cl.grade = filter_grade)
          -- Include completions from users not in any class (admins, etc.)
          OR (p.role = 'admin' AND filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
              AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL AND filter_class_id IS NULL AND filter_grade IS NULL)
        )
      GROUP BY ucp.user_id, ucp.course_id
    ),
    enrollment_progress AS (
      SELECT 
        cm.user_id,
        cm.course_id,
        COALESCE(ucc.completed_items, 0) as completed_items,
        GREATEST(ccc.total_items, 1) as total_items
      FROM public.course_members cm
      JOIN profiles p ON cm.user_id = p.id
      LEFT JOIN class_students cs ON p.id = cs.student_id AND p.role = 'student'
      LEFT JOIN class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
      LEFT JOIN classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
      LEFT JOIN schools s ON cl.school_id = s.id
      LEFT JOIN boards b ON cl.board_id = b.id
      LEFT JOIN projects pr ON b.project_id = pr.id
      LEFT JOIN cities c ON pr.city_id = c.id
      LEFT JOIN regions r ON c.region_id = r.id
      LEFT JOIN countries co ON r.country_id = co.id
      JOIN course_content_counts ccc ON cm.course_id = ccc.course_id
      LEFT JOIN user_course_completions ucc ON cm.user_id = ucc.user_id AND cm.course_id = ucc.course_id
      WHERE cm.role = 'student'
        AND (
          (filter_country_id IS NULL OR co.id = filter_country_id)
          AND (filter_region_id IS NULL OR r.id = filter_region_id)
          AND (filter_city_id IS NULL OR c.id = filter_city_id)
          AND (filter_project_id IS NULL OR pr.id = filter_project_id)
          AND (filter_board_id IS NULL OR b.id = filter_board_id)
          AND (filter_school_id IS NULL OR s.id = filter_school_id)
          AND (filter_class_id IS NULL OR cl.id = filter_class_id)
          AND (filter_grade IS NULL OR cl.grade = filter_grade)
          -- Include enrollments from users not in any class (admins, etc.)
          OR (p.role = 'admin' AND filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
              AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL AND filter_class_id IS NULL AND filter_grade IS NULL)
        )
    )
    SELECT
      COALESCE(AVG( LEAST( (ep.completed_items::DECIMAL * 100) / ep.total_items, 100) ), 0) as rate
    FROM enrollment_progress ep
  )
  SELECT 
    uc.total_users::INTEGER,
    uc.total_teachers::INTEGER,
    uc.total_students::INTEGER,
    uc.total_admins::INTEGER,
    cc.total_courses::INTEGER,
    cc.active_courses::INTEGER,
    COALESCE(as2.completed_assignments, 0)::INTEGER as completed_assignments,
    COALESCE(ds.active_discussions, 0)::INTEGER as active_discussions,
    CASE 
      WHEN uc.total_users > 0 THEN
        ROUND((es.active_users::DECIMAL / uc.total_users) * 100)::INTEGER
      ELSE 0
    END as avg_engagement,
    uc.new_users_in_period::INTEGER as new_users_this_month,
    ROUND(ccs.rate)::INTEGER as course_completion_rate,
    uc.total_users::INTEGER as total_logins, -- Using total users as proxy for now
    CASE 
      WHEN uc.total_users > 0 THEN 
        ROUND((es.active_users::DECIMAL / uc.total_users) * 100)::INTEGER
      ELSE 0 
    END as active_users_percentage,
    CASE 
      WHEN uc.total_users > 0 THEN 
        ROUND((es.users_with_activity::DECIMAL / uc.total_users) * 100)::INTEGER
      ELSE 0 
    END as course_engagement_percentage,
    CASE 
      WHEN uc.total_users > 0 THEN 
        ROUND((ds.active_discussions::DECIMAL / uc.total_users) * 100)::INTEGER
      ELSE 0 
    END as discussion_participation_percentage,
    CASE 
      WHEN uc.total_users > 0 THEN 
        ROUND((as2.completed_assignments::DECIMAL / uc.total_users) * 100)::INTEGER
      ELSE 0 
    END as assignment_completion_percentage
  FROM user_counts uc
  CROSS JOIN course_counts cc
  CROSS JOIN assignment_stats as2
  CROSS JOIN discussion_stats ds
  CROSS JOIN engagement_stats es
  CROSS JOIN course_completion_stats ccs;
END;
$$;


ALTER FUNCTION "public"."get_admin_dashboard_stats_with_filters"("time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_admin_dashboard_stats_with_filters"("time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") IS 'Returns comprehensive admin dashboard statistics with optional filtering by location and school hierarchy. 
Parameters: time_range (7days|30days|3months|6months|1year|alltime), and optional UUID filters for filter_country_id, filter_region_id, filter_city_id, filter_project_id, filter_board_id, filter_school_id, filter_class_id, and filter_grade (1-12). 
Returns 16 metrics including user counts, course stats, engagement rates, and completion percentages.';



CREATE OR REPLACE FUNCTION "public"."get_admin_engagement_trends_data"("p_time_range" "text") RETURNS TABLE("period_label" "text", "active_users" bigint, "courses_accessed" bigint, "discussions" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_interval INTERVAL;
    v_format TEXT;
BEGIN
    -- Determine date range and interval
    CASE p_time_range
        WHEN '7days' THEN
            v_start_date := NOW()::DATE - INTERVAL '6 days';
            v_end_date := NOW()::DATE;
            v_interval := '1 day';
            v_format := 'Dy'; -- Short day name (e.g., 'Mon')
        WHEN '30days' THEN
            v_start_date := DATE_TRUNC('week', NOW() - INTERVAL '3 weeks');
            v_end_date := NOW()::DATE;
            v_interval := '1 week';
            v_format := 'WW'; -- Week number
        WHEN '3months' THEN
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '2 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon'; -- Short month name (e.g., 'Jan')
        WHEN '6months' THEN
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '5 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon';
        WHEN '1year' THEN
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '11 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon';
        ELSE -- alltime
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '11 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon';
    END CASE;

    RETURN QUERY
    -- Generate a series of periods for the chart
    WITH time_periods AS (
        SELECT 
            -- For weeks, we need a custom label
            CASE 
                WHEN p_time_range = '30days' THEN 'Week ' || TO_CHAR(period_start, v_format)
                ELSE TO_CHAR(period_start, v_format)
            END as label,
            period_start,
            period_start + v_interval AS period_end
        FROM generate_series(v_start_date, v_end_date, v_interval) AS period_start
    ),
    -- Get aggregated data from user progress
    progress_data AS (
        SELECT
            DATE_TRUNC(
                CASE WHEN v_interval = '1 day' THEN 'day' WHEN v_interval = '1 week' THEN 'week' ELSE 'month' END, 
                ucp.updated_at
            )::DATE AS period_start,
            COUNT(DISTINCT ucp.user_id) AS active_users,
            COUNT(DISTINCT ucp.course_id) AS courses_accessed
        FROM public.user_content_item_progress ucp
        WHERE ucp.updated_at >= v_start_date
        GROUP BY 1
    ),
    -- Get aggregated data from discussions
    discussion_data AS (
        SELECT
            DATE_TRUNC(
                CASE WHEN v_interval = '1 day' THEN 'day' WHEN v_interval = '1 week' THEN 'week' ELSE 'month' END, 
                d.created_at
            )::DATE AS period_start,
            COUNT(DISTINCT d.id) AS discussions
        FROM public.discussions d
        WHERE d.created_at >= v_start_date
        GROUP BY 1
    )
    -- Join all data together
    SELECT
        tp.label,
        COALESCE(pd.active_users, 0) as active_users,
        COALESCE(pd.courses_accessed, 0) as courses_accessed,
        COALESCE(dd.discussions, 0) as discussions
    FROM time_periods tp
    LEFT JOIN progress_data pd ON tp.period_start = pd.period_start
    LEFT JOIN discussion_data dd ON tp.period_start = dd.period_start
    ORDER BY tp.period_start;

END;
$$;


ALTER FUNCTION "public"."get_admin_engagement_trends_data"("p_time_range" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_engagement_trends_data_with_filters"("p_time_range" "text" DEFAULT '7days'::"text", "filter_country_id" "uuid" DEFAULT NULL::"uuid", "filter_region_id" "uuid" DEFAULT NULL::"uuid", "filter_city_id" "uuid" DEFAULT NULL::"uuid", "filter_project_id" "uuid" DEFAULT NULL::"uuid", "filter_board_id" "uuid" DEFAULT NULL::"uuid", "filter_school_id" "uuid" DEFAULT NULL::"uuid", "filter_class_id" "uuid" DEFAULT NULL::"uuid", "filter_grade" "text" DEFAULT NULL::"text") RETURNS TABLE("period_label" "text", "active_users" bigint, "courses_accessed" bigint, "discussions" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  date_start DATE;
  date_end DATE;
BEGIN
  -- Calculate date range based on time_range parameter
  date_end := CURRENT_DATE;
  
  CASE p_time_range
    WHEN '7days' THEN
      date_start := date_end - INTERVAL '7 days';
    WHEN '30days' THEN
      date_start := date_end - INTERVAL '30 days';
    WHEN '3months' THEN
      date_start := date_end - INTERVAL '3 months';
    WHEN '6months' THEN
      date_start := date_end - INTERVAL '6 months';
    WHEN '1year' THEN
      date_start := date_end - INTERVAL '1 year';
    ELSE
      date_start := date_end - INTERVAL '7 days';
  END CASE;

  RETURN QUERY
  WITH time_periods AS (
    SELECT period_date FROM (
      SELECT generate_series(date_start, date_end, '1 day'::INTERVAL)::DATE as period_date
      WHERE p_time_range = '7days'
      UNION ALL
      SELECT generate_series(date_start, date_end, '7 days'::INTERVAL)::DATE as period_date
      WHERE p_time_range = '30days'
      UNION ALL
      SELECT DATE_TRUNC('month', generate_series(date_start, date_end, '1 month'::INTERVAL))::DATE as period_date
      WHERE p_time_range IN ('3months', '6months', '1year')
      UNION ALL
      SELECT generate_series(date_start, date_end, '1 day'::INTERVAL)::DATE as period_date
      WHERE p_time_range NOT IN ('7days', '30days', '3months', '6months', '1year')
    ) t
  ),
  active_users_data AS (
    SELECT 
      tp.period_date,
      COUNT(DISTINCT ucip.user_id) as active_users
    FROM time_periods tp
    LEFT JOIN public.user_content_item_progress ucip ON 
      CASE 
        WHEN p_time_range IN ('3months', '6months', '1year') THEN
          DATE_TRUNC('month', ucip.updated_at)::DATE = tp.period_date
        ELSE
          DATE(ucip.updated_at) = tp.period_date
      END
    LEFT JOIN public.profiles p ON ucip.user_id = p.id
    LEFT JOIN public.class_students cs ON p.id = cs.student_id AND p.role = 'student'
    LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
    LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON cl.board_id = b.id
    LEFT JOIN public.projects pr ON b.project_id = pr.id
    LEFT JOIN public.cities c ON pr.city_id = c.id
    LEFT JOIN public.regions r ON c.region_id = r.id
    LEFT JOIN public.countries co ON r.country_id = co.id
    WHERE 
      (filter_country_id IS NULL OR co.id = filter_country_id)
      AND (filter_region_id IS NULL OR r.id = filter_region_id)
      AND (filter_city_id IS NULL OR c.id = filter_city_id)
      AND (filter_project_id IS NULL OR pr.id = filter_project_id)
      AND (filter_board_id IS NULL OR b.id = filter_board_id)
      AND (filter_school_id IS NULL OR s.id = filter_school_id)
      AND (filter_class_id IS NULL OR cl.id = filter_class_id)
      AND (filter_grade IS NULL OR cl.grade = filter_grade)
      -- Include users who are not in any class (admins, etc.)
      OR (p.role = 'admin' AND filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
          AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL AND filter_class_id IS NULL AND filter_grade IS NULL)
    GROUP BY tp.period_date
  ),
  courses_accessed_data AS (
    SELECT 
      tp.period_date,
      COUNT(DISTINCT ucip.course_id) as courses_accessed
    FROM time_periods tp
    LEFT JOIN public.user_content_item_progress ucip ON 
      CASE 
        WHEN p_time_range IN ('3months', '6months', '1year') THEN
          DATE_TRUNC('month', ucip.updated_at)::DATE = tp.period_date
        ELSE
          DATE(ucip.updated_at) = tp.period_date
      END
    LEFT JOIN public.profiles p ON ucip.user_id = p.id
    LEFT JOIN public.class_students cs ON p.id = cs.student_id AND p.role = 'student'
    LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
    LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON cl.board_id = b.id
    LEFT JOIN public.projects pr ON b.project_id = pr.id
    LEFT JOIN public.cities c ON pr.city_id = c.id
    LEFT JOIN public.regions r ON c.region_id = r.id
    LEFT JOIN public.countries co ON r.country_id = co.id
    WHERE 
      (filter_country_id IS NULL OR co.id = filter_country_id)
      AND (filter_region_id IS NULL OR r.id = filter_region_id)
      AND (filter_city_id IS NULL OR c.id = filter_city_id)
      AND (filter_project_id IS NULL OR pr.id = filter_project_id)
      AND (filter_board_id IS NULL OR b.id = filter_board_id)
      AND (filter_school_id IS NULL OR s.id = filter_school_id)
      AND (filter_class_id IS NULL OR cl.id = filter_class_id)
      AND (filter_grade IS NULL OR cl.grade = filter_grade)
      -- Include users who are not in any class (admins, etc.)
      OR (p.role = 'admin' AND filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
          AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL AND filter_class_id IS NULL AND filter_grade IS NULL)
    GROUP BY tp.period_date
  ),
  discussions_data AS (
    SELECT 
      tp.period_date,
      COUNT(DISTINCT d.id) as discussions
    FROM time_periods tp
    LEFT JOIN public.discussions d ON 1=1
    LEFT JOIN public.discussion_replies dr ON d.id = dr.discussion_id
      AND CASE 
        WHEN p_time_range IN ('3months', '6months', '1year') THEN
          DATE_TRUNC('month', dr.created_at)::DATE = tp.period_date
        ELSE
          DATE(dr.created_at) = tp.period_date
      END
    LEFT JOIN public.profiles p ON dr.user_id = p.id
    LEFT JOIN public.class_students cs ON p.id = cs.student_id AND p.role = 'student'
    LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
    LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON cl.board_id = b.id
    LEFT JOIN public.projects pr ON b.project_id = pr.id
    LEFT JOIN public.cities c ON pr.city_id = c.id
    LEFT JOIN public.regions r ON c.region_id = r.id
    LEFT JOIN public.countries co ON r.country_id = co.id
    WHERE 
      (filter_country_id IS NULL OR co.id = filter_country_id)
      AND (filter_region_id IS NULL OR r.id = filter_region_id)
      AND (filter_city_id IS NULL OR c.id = filter_city_id)
      AND (filter_project_id IS NULL OR pr.id = filter_project_id)
      AND (filter_board_id IS NULL OR b.id = filter_board_id)
      AND (filter_school_id IS NULL OR s.id = filter_school_id)
      AND (filter_class_id IS NULL OR cl.id = filter_class_id)
      AND (filter_grade IS NULL OR cl.grade = filter_grade)
      -- Include discussions from users not in any class (admins, etc.)
      OR (p.role = 'admin' AND filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
          AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL AND filter_class_id IS NULL AND filter_grade IS NULL)
    GROUP BY tp.period_date
  )
  SELECT 
    CASE p_time_range
      WHEN '7days' THEN
        TO_CHAR(au.period_date, 'Dy')
      WHEN '30days' THEN
        'Week ' || EXTRACT(WEEK FROM au.period_date)::TEXT
      WHEN '3months' THEN
        TO_CHAR(au.period_date, 'Mon')
      WHEN '6months' THEN
        TO_CHAR(au.period_date, 'Mon')
      WHEN '1year' THEN
        TO_CHAR(au.period_date, 'Mon')
      ELSE
        TO_CHAR(au.period_date, 'Dy')
    END as period_label,
    COALESCE(au.active_users, 0) as active_users,
    COALESCE(ca.courses_accessed, 0) as courses_accessed,
    COALESCE(dd.discussions, 0) as discussions
  FROM active_users_data au
  LEFT JOIN courses_accessed_data ca ON au.period_date = ca.period_date
  LEFT JOIN discussions_data dd ON au.period_date = dd.period_date
  ORDER BY au.period_date;
END;
$$;


ALTER FUNCTION "public"."get_admin_engagement_trends_data_with_filters"("p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_platform_stats_with_filters"("filter_country_id" "uuid" DEFAULT NULL::"uuid", "filter_region_id" "uuid" DEFAULT NULL::"uuid", "filter_city_id" "uuid" DEFAULT NULL::"uuid", "filter_project_id" "uuid" DEFAULT NULL::"uuid", "filter_board_id" "uuid" DEFAULT NULL::"uuid", "filter_school_id" "uuid" DEFAULT NULL::"uuid", "filter_class_id" "uuid" DEFAULT NULL::"uuid", "filter_grade" "text" DEFAULT NULL::"text") RETURNS TABLE("stat_name" "text", "stat_value" bigint, "stat_color" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH course_stats AS (
    SELECT 
      c.status,
      COUNT(*) as course_count
    FROM public.courses c
    WHERE 
      -- When no filters are applied, show all courses
      (filter_country_id IS NULL AND filter_region_id IS NULL AND filter_city_id IS NULL 
       AND filter_project_id IS NULL AND filter_board_id IS NULL AND filter_school_id IS NULL 
       AND filter_class_id IS NULL AND filter_grade IS NULL)
      -- When filters are applied, check hierarchy
      OR EXISTS (
        SELECT 1 FROM public.classes cl 
        LEFT JOIN public.schools s ON cl.school_id = s.id
        LEFT JOIN public.boards b ON s.board_id = b.id
        LEFT JOIN public.projects pr ON b.project_id = pr.id
        LEFT JOIN public.cities ci ON pr.city_id = ci.id
        LEFT JOIN public.regions r ON ci.region_id = r.id
        LEFT JOIN public.countries co ON r.country_id = co.id
        WHERE cl.id = ANY(c.class_ids)
          AND (filter_country_id IS NULL OR co.id = filter_country_id)
          AND (filter_region_id IS NULL OR r.id = filter_region_id)
          AND (filter_city_id IS NULL OR ci.id = filter_city_id)
          AND (filter_project_id IS NULL OR pr.id = filter_project_id)
          AND (filter_board_id IS NULL OR b.id = filter_board_id)
          AND (filter_school_id IS NULL OR s.id = filter_school_id)
          AND (filter_class_id IS NULL OR cl.id = filter_class_id)
          AND (filter_grade IS NULL OR cl.grade = filter_grade)
      )
      -- Also include courses that match school filters directly
      OR (filter_school_id IS NOT NULL AND filter_school_id = ANY(c.school_ids))
    GROUP BY c.status
  ),
  assignment_stats AS (
    SELECT 
      COUNT(*) as completed_assignments
    FROM public.assignment_submissions asub
    JOIN public.profiles p ON asub.user_id = p.id
    LEFT JOIN public.class_students cs ON p.id = cs.student_id AND p.role = 'student'
    LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id AND p.role = 'teacher'
    LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON s.board_id = b.id
    LEFT JOIN public.projects pr ON b.project_id = pr.id
    LEFT JOIN public.cities ci ON pr.city_id = ci.id
    LEFT JOIN public.regions r ON ci.region_id = r.id
    LEFT JOIN public.countries co ON r.country_id = co.id
    WHERE 
      asub.status = 'completed'
      -- Apply location and hierarchy filters
      AND (filter_country_id IS NULL OR co.id = filter_country_id)
      AND (filter_region_id IS NULL OR r.id = filter_region_id)
      AND (filter_city_id IS NULL OR ci.id = filter_city_id)
      AND (filter_project_id IS NULL OR pr.id = filter_project_id)
      AND (filter_board_id IS NULL OR b.id = filter_board_id)
      AND (filter_school_id IS NULL OR s.id = filter_school_id)
      AND (filter_class_id IS NULL OR cl.id = filter_class_id)
      AND (filter_grade IS NULL OR cl.grade = filter_grade)
      -- Include assignments from users not in any class (admins, etc.)
      OR (p.role = 'admin' AND filter_class_id IS NULL AND filter_school_id IS NULL 
          AND filter_board_id IS NULL AND filter_project_id IS NULL 
          AND filter_city_id IS NULL AND filter_region_id IS NULL 
          AND filter_country_id IS NULL AND filter_grade IS NULL)
  )
  SELECT 
    'Active Courses'::TEXT as stat_name,
    COALESCE(SUM(cs.course_count) FILTER (WHERE cs.status = 'Published'), 0)::BIGINT as stat_value,
    '#3B82F6'::TEXT as stat_color
  FROM course_stats cs
  
  UNION ALL
  
  SELECT 
    'Draft Courses'::TEXT as stat_name,
    COALESCE(SUM(cs.course_count) FILTER (WHERE cs.status = 'Draft'), 0)::BIGINT as stat_value,
    '#F59E0B'::TEXT as stat_color
  FROM course_stats cs
  
  UNION ALL
  
  SELECT 
    'Archived Courses'::TEXT as stat_name,
    COALESCE(SUM(cs.course_count) FILTER (WHERE cs.status = 'Archived'), 0)::BIGINT as stat_value,
    '#6B7280'::TEXT as stat_color
  FROM course_stats cs
  
  UNION ALL
  
  SELECT 
    'Completed Assignments'::TEXT as stat_name,
    COALESCE(ast.completed_assignments, 0)::BIGINT as stat_value,
    '#10B981'::TEXT as stat_color
  FROM assignment_stats ast;
END;
$$;


ALTER FUNCTION "public"."get_admin_platform_stats_with_filters"("filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_admin_platform_stats_with_filters"("filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") IS 'Get platform distribution stats with hierarchical filtering for admin dashboard';



CREATE OR REPLACE FUNCTION "public"."get_admin_settings"() RETURNS TABLE("system_name" character varying, "maintenance_mode" boolean, "system_notifications" boolean, "email_notifications" boolean, "push_notifications" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ads.system_name,
        ads.maintenance_mode,
        ads.system_notifications,
        ads.email_notifications,
        ads.push_notifications,
        ads.created_at,
        ads.updated_at
    FROM admin_settings ads
    ORDER BY ads.created_at DESC
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_admin_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_user_growth_trends_with_filters"("p_time_range" "text" DEFAULT '30days'::"text", "filter_country_id" "uuid" DEFAULT NULL::"uuid", "filter_region_id" "uuid" DEFAULT NULL::"uuid", "filter_city_id" "uuid" DEFAULT NULL::"uuid", "filter_project_id" "uuid" DEFAULT NULL::"uuid", "filter_board_id" "uuid" DEFAULT NULL::"uuid", "filter_school_id" "uuid" DEFAULT NULL::"uuid", "filter_class_id" "uuid" DEFAULT NULL::"uuid", "filter_grade" "text" DEFAULT NULL::"text") RETURNS TABLE("period_label" "text", "total_users" bigint, "teachers" bigint, "students" bigint, "admins" bigint, "active_users" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  date_start DATE;
  date_end DATE;
BEGIN
  -- Set date range based on time_range parameter
  CASE p_time_range
    WHEN '7days' THEN
      date_start := CURRENT_DATE - INTERVAL '7 days';
      date_end := CURRENT_DATE;
    WHEN '30days' THEN
      date_start := CURRENT_DATE - INTERVAL '30 days';
      date_end := CURRENT_DATE;
    WHEN '3months' THEN
      date_start := CURRENT_DATE - INTERVAL '3 months';
      date_end := CURRENT_DATE;
    WHEN '6months' THEN
      date_start := CURRENT_DATE - INTERVAL '6 months';
      date_end := CURRENT_DATE;
    WHEN '1year' THEN
      date_start := CURRENT_DATE - INTERVAL '1 year';
      date_end := CURRENT_DATE;
    ELSE
      date_start := CURRENT_DATE - INTERVAL '30 days';
      date_end := CURRENT_DATE;
  END CASE;

  RETURN QUERY
  WITH time_periods AS (
    -- Generate time periods based on the range using separate CTEs
    SELECT period_date FROM (
      SELECT generate_series(date_start::DATE, date_end::DATE, '1 day'::INTERVAL)::DATE as period_date
      WHERE p_time_range = '7days'
      UNION ALL
      SELECT generate_series(date_start::DATE, date_end::DATE, '7 days'::INTERVAL)::DATE as period_date
      WHERE p_time_range = '30days'
      UNION ALL
      SELECT generate_series(date_start::DATE, date_end::DATE, '1 month'::INTERVAL)::DATE as period_date
      WHERE p_time_range IN ('3months', '6months', '1year')
      UNION ALL
      SELECT generate_series(date_start::DATE, date_end::DATE, '7 days'::INTERVAL)::DATE as period_date
      WHERE p_time_range NOT IN ('7days', '30days', '3months', '6months', '1year')
    ) periods
  ),
  user_counts AS (
    SELECT 
      tp.period_date,
      COUNT(*) FILTER (WHERE p.created_at <= tp.period_date) as total_users,
      COUNT(*) FILTER (WHERE p.role = 'teacher' AND p.created_at <= tp.period_date) as teachers,
      COUNT(*) FILTER (WHERE p.role = 'student' AND p.created_at <= tp.period_date) as students,
      COUNT(*) FILTER (WHERE p.role = 'admin' AND p.created_at <= tp.period_date) as admins
    FROM time_periods tp
    CROSS JOIN public.profiles p
    LEFT JOIN public.class_students cs ON p.id = cs.student_id
    LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id
    LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON s.board_id = b.id
    LEFT JOIN public.projects pr ON b.project_id = pr.id
    LEFT JOIN public.cities c ON pr.city_id = c.id
    LEFT JOIN public.regions r ON c.region_id = r.id
    LEFT JOIN public.countries co ON r.country_id = co.id
    WHERE 
      -- Apply location and hierarchy filters
      (filter_country_id IS NULL OR co.id = filter_country_id)
      AND (filter_region_id IS NULL OR r.id = filter_region_id)
      AND (filter_city_id IS NULL OR c.id = filter_city_id)
      AND (filter_project_id IS NULL OR pr.id = filter_project_id)
      AND (filter_board_id IS NULL OR b.id = filter_board_id)
      AND (filter_school_id IS NULL OR s.id = filter_school_id)
      AND (filter_class_id IS NULL OR cl.id = filter_class_id)
      AND (filter_grade IS NULL OR cl.grade = filter_grade)
      -- Include admin users when no class-based filters are applied
      OR (p.role = 'admin' AND filter_class_id IS NULL AND filter_school_id IS NULL 
          AND filter_board_id IS NULL AND filter_project_id IS NULL 
          AND filter_city_id IS NULL AND filter_region_id IS NULL 
          AND filter_country_id IS NULL AND filter_grade IS NULL)
    GROUP BY tp.period_date
  ),
  active_users_data AS (
    SELECT 
      tp.period_date,
      COUNT(DISTINCT ucip.user_id) as active_users
    FROM time_periods tp
    LEFT JOIN public.user_content_item_progress ucip ON (
      (p_time_range = '7days' AND DATE(ucip.updated_at) = tp.period_date) OR
      (p_time_range = '30days' AND DATE_TRUNC('week', ucip.updated_at)::DATE = tp.period_date) OR
      (p_time_range IN ('3months', '6months', '1year') AND DATE_TRUNC('month', ucip.updated_at)::DATE = tp.period_date) OR
      (p_time_range NOT IN ('7days', '30days', '3months', '6months', '1year') AND DATE_TRUNC('week', ucip.updated_at)::DATE = tp.period_date)
    )
    LEFT JOIN public.profiles p ON ucip.user_id = p.id
    LEFT JOIN public.class_students cs ON p.id = cs.student_id
    LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id
    LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON s.board_id = b.id
    LEFT JOIN public.projects pr ON b.project_id = pr.id
    LEFT JOIN public.cities c ON pr.city_id = c.id
    LEFT JOIN public.regions r ON c.region_id = r.id
    LEFT JOIN public.countries co ON r.country_id = co.id
    WHERE 
      -- Apply location and hierarchy filters
      (filter_country_id IS NULL OR co.id = filter_country_id)
      AND (filter_region_id IS NULL OR r.id = filter_region_id)
      AND (filter_city_id IS NULL OR c.id = filter_city_id)
      AND (filter_project_id IS NULL OR pr.id = filter_project_id)
      AND (filter_board_id IS NULL OR b.id = filter_board_id)
      AND (filter_school_id IS NULL OR s.id = filter_school_id)
      AND (filter_class_id IS NULL OR cl.id = filter_class_id)
      AND (filter_grade IS NULL OR cl.grade = filter_grade)
      -- Include admin users when no class-based filters are applied
      OR (p.role = 'admin' AND filter_class_id IS NULL AND filter_school_id IS NULL 
          AND filter_board_id IS NULL AND filter_project_id IS NULL 
          AND filter_city_id IS NULL AND filter_region_id IS NULL 
          AND filter_country_id IS NULL AND filter_grade IS NULL)
    GROUP BY tp.period_date
  )
  SELECT 
    CASE p_time_range
      WHEN '7days' THEN
        TO_CHAR(tp.period_date, 'Dy')
      WHEN '30days' THEN
        'Week ' || ROW_NUMBER() OVER (ORDER BY tp.period_date)
      WHEN '3months' THEN
        TO_CHAR(tp.period_date, 'Mon')
      WHEN '6months' THEN
        TO_CHAR(tp.period_date, 'Mon')
      WHEN '1year' THEN
        TO_CHAR(tp.period_date, 'Mon')
      ELSE
        'Week ' || ROW_NUMBER() OVER (ORDER BY tp.period_date)
    END as period_label,
    COALESCE(uc.total_users, 0) as total_users,
    COALESCE(uc.teachers, 0) as teachers,
    COALESCE(uc.students, 0) as students,
    COALESCE(uc.admins, 0) as admins,
    COALESCE(au.active_users, 0) as active_users
  FROM time_periods tp
  LEFT JOIN user_counts uc ON tp.period_date = uc.period_date
  LEFT JOIN active_users_data au ON tp.period_date = au.period_date
  ORDER BY tp.period_date;
END;
$$;


ALTER FUNCTION "public"."get_admin_user_growth_trends_with_filters"("p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_admin_user_growth_trends_with_filters"("p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") IS 'Get user growth trends data with hierarchical filtering for admin dashboard';



CREATE OR REPLACE FUNCTION "public"."get_ai_prompt"("prompt_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    prompt_content TEXT;
    prompt_id UUID;
BEGIN
    -- Validate input
    IF prompt_name IS NULL OR trim(prompt_name) = '' THEN
        RAISE EXCEPTION 'Prompt name cannot be null or empty';
    END IF;

    -- Get the most recent active prompt
    SELECT id, content INTO prompt_id, prompt_content
    FROM public.ai_prompts
    WHERE name = trim(prompt_name)
    AND is_active = true
    ORDER BY version DESC, updated_at DESC
    LIMIT 1;
    
    -- Update usage statistics (fire and forget)
    IF prompt_id IS NOT NULL THEN
        UPDATE public.ai_prompts 
        SET 
            usage_count = COALESCE(usage_count, 0) + 1,
            last_used_at = NOW()
        WHERE id = prompt_id;
    END IF;
    
    -- Return content or fallback
    RETURN COALESCE(
        prompt_content, 
        'You are IRIS, an intelligent AI assistant for LMS analytics. Provide helpful insights based on the provided context data.'
    );
END;
$$;


ALTER FUNCTION "public"."get_ai_prompt"("prompt_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ai_safety_ethics_settings"() RETURNS TABLE("content_filtering" boolean, "toxicity_detection" boolean, "bias_detection" boolean, "inappropriate_content_blocking" boolean, "harmful_content_prevention" boolean, "misinformation_detection" boolean, "data_encryption" boolean, "personal_data_protection" boolean, "conversation_logging" boolean, "data_retention_limit" integer, "gender_bias_monitoring" boolean, "cultural_bias_detection" boolean, "age_appropriate_responses" boolean, "inclusive_language" boolean, "emotional_safety_checks" boolean, "real_time_monitoring" boolean, "alert_threshold" integer, "automatic_escalation" boolean, "admin_notifications" boolean, "contextual_safety_analysis" boolean, "compliance_reporting" boolean, "audit_trail" boolean, "incident_reporting" boolean, "regular_assessments" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    settings_record ai_safety_ethics_settings%ROWTYPE;
BEGIN
    -- Get the most recent settings record
    SELECT * INTO settings_record 
    FROM ai_safety_ethics_settings 
    ORDER BY updated_at DESC
    LIMIT 1;
    
    -- Return settings or defaults if no record exists
    RETURN QUERY SELECT 
        COALESCE(settings_record.content_filtering, true),
        COALESCE(settings_record.toxicity_detection, true),
        COALESCE(settings_record.bias_detection, true),
        COALESCE(settings_record.inappropriate_content_blocking, true),
        COALESCE(settings_record.harmful_content_prevention, true),
        COALESCE(settings_record.misinformation_detection, true),
        COALESCE(settings_record.data_encryption, true),
        COALESCE(settings_record.personal_data_protection, true),
        COALESCE(settings_record.conversation_logging, true),
        COALESCE(settings_record.data_retention_limit, 90),
        COALESCE(settings_record.gender_bias_monitoring, true),
        COALESCE(settings_record.cultural_bias_detection, true),
        COALESCE(settings_record.age_appropriate_responses, true),
        COALESCE(settings_record.inclusive_language, true),
        COALESCE(settings_record.emotional_safety_checks, true),
        COALESCE(settings_record.real_time_monitoring, true),
        COALESCE(settings_record.alert_threshold, 75),
        COALESCE(settings_record.automatic_escalation, true),
        COALESCE(settings_record.admin_notifications, true),
        COALESCE(settings_record.contextual_safety_analysis, true),
        COALESCE(settings_record.compliance_reporting, true),
        COALESCE(settings_record.audit_trail, true),
        COALESCE(settings_record.incident_reporting, true),
        COALESCE(settings_record.regular_assessments, true);
END;
$$;


ALTER FUNCTION "public"."get_ai_safety_ethics_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ai_tutor_settings"() RETURNS TABLE("personality_type" "text", "response_style" "text", "adaptive_difficulty" boolean, "context_awareness" boolean, "max_response_length" integer, "response_speed" "text", "repetition_threshold" integer, "error_correction_style" "text", "voice_enabled" boolean, "voice_gender" "text", "speech_rate" numeric, "audio_feedback" boolean, "cultural_sensitivity" boolean, "age_appropriate" boolean, "professional_context" boolean, "custom_prompts" "text", "learning_analytics" boolean, "progress_tracking" boolean, "performance_reports" boolean, "data_retention" integer, "multilingual_support" boolean, "emotional_intelligence" boolean, "gamification_elements" boolean, "real_time_adaptation" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    settings_record ai_tutor_settings%ROWTYPE;
BEGIN
    -- Try to get existing settings for current user
    SELECT * INTO settings_record 
    FROM ai_tutor_settings 
    WHERE user_id = auth.uid();
    
    -- Return settings or defaults
    RETURN QUERY SELECT 
        COALESCE(settings_record.personality_type, 'encouraging'::TEXT),
        COALESCE(settings_record.response_style, 'conversational'::TEXT),
        COALESCE(settings_record.adaptive_difficulty, true),
        COALESCE(settings_record.context_awareness, true),
        COALESCE(settings_record.max_response_length, 150),
        COALESCE(settings_record.response_speed, 'normal'::TEXT),
        COALESCE(settings_record.repetition_threshold, 3),
        COALESCE(settings_record.error_correction_style, 'gentle'::TEXT),
        COALESCE(settings_record.voice_enabled, true),
        COALESCE(settings_record.voice_gender, 'neutral'::TEXT),
        COALESCE(settings_record.speech_rate, 1.0::DECIMAL),
        COALESCE(settings_record.audio_feedback, true),
        COALESCE(settings_record.cultural_sensitivity, true),
        COALESCE(settings_record.age_appropriate, true),
        COALESCE(settings_record.professional_context, false),
        COALESCE(settings_record.custom_prompts, ''::TEXT),
        COALESCE(settings_record.learning_analytics, true),
        COALESCE(settings_record.progress_tracking, true),
        COALESCE(settings_record.performance_reports, true),
        COALESCE(settings_record.data_retention, 90),
        COALESCE(settings_record.multilingual_support, true),
        COALESCE(settings_record.emotional_intelligence, true),
        COALESCE(settings_record.gamification_elements, true),
        COALESCE(settings_record.real_time_adaptation, true);
END;
$$;


ALTER FUNCTION "public"."get_ai_tutor_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_stages_with_counts"() RETURNS TABLE("stage_id" integer, "stage_number" integer, "title" "text", "title_urdu" "text", "description" "text", "difficulty_level" "text", "stage_order" integer, "exercise_count" bigint, "topic_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.stage_number,
        s.title,
        s.title_urdu,
        s.description,
        s.difficulty_level,
        s.stage_order,
        COUNT(DISTINCT e.id) as exercise_count,
        COUNT(DISTINCT t.id) as topic_count
    FROM public.ai_tutor_content_hierarchy s
    LEFT JOIN public.ai_tutor_content_hierarchy e ON e.parent_id = s.id AND e.level = 'exercise'
    LEFT JOIN public.ai_tutor_content_hierarchy t ON t.parent_id = e.id AND t.level = 'topic'
    WHERE s.level = 'stage'
    GROUP BY s.id, s.stage_number, s.title, s.title_urdu, s.description, s.difficulty_level, s.stage_order
    ORDER BY s.stage_order;
END;
$$;


ALTER FUNCTION "public"."get_all_stages_with_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_assessment_submissions"("assessment_id" "uuid") RETURNS TABLE("id" "uuid", "title" "text", "course_title" "text", "course_id" "uuid", "lesson_id" "uuid", "content_type" "text", "submissions" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH assessment_details AS (
        SELECT
            clc.id,
            clc.title,
            c.title as course_title,
            clc.content_type,
            c.id as course_id,
            cl.id as lesson_id
        FROM course_lesson_content clc
        JOIN course_lessons cl ON clc.lesson_id = cl.id
        JOIN course_sections cs ON cl.section_id = cs.id
        JOIN courses c ON cs.course_id = c.id
        WHERE clc.id = assessment_id
    ),
    course_students AS (
        SELECT
            p.id as student_id,
            p.first_name || ' ' || p.last_name AS student_name,
            NULL::text as avatar_url
        FROM profiles p
        JOIN course_members cm ON p.id = cm.user_id
        WHERE cm.course_id = (SELECT ad.course_id FROM assessment_details ad) AND p.role = 'student'
    ),
    text_answer_grades_data AS (
        SELECT
            tag.quiz_submission_id,
            jsonb_agg(
                jsonb_build_object(
                    'question_id', tag.question_id,
                    'question_text', qq.question_text,
                    'question_position', qq.position,
                    'grade', tag.grade,
                    'feedback', tag.feedback,
                    'graded_by', tag.graded_by,
                    'graded_at', tag.graded_at
                )
            ) as individual_grades
        FROM text_answer_grades tag
        JOIN quiz_questions qq ON qq.id = tag.question_id
        GROUP BY tag.quiz_submission_id
    ),
    quiz_submissions_data AS (
        SELECT
            qs.user_id,
            jsonb_build_object(
                'id', qs.id,
                'status', CASE 
                    WHEN qs.manual_grading_required AND NOT qs.manual_grading_completed THEN 'submitted'
                    WHEN qs.manual_grading_completed THEN 'graded'
                    ELSE 'graded'
                END,
                'score', COALESCE(qs.score, qs.manual_grading_score),
                'feedback', qs.manual_grading_feedback,
                'submitted_at', qs.submitted_at,
                'answers', qs.answers,
                'results', qs.results,
                'manual_grading_required', qs.manual_grading_required,
                'manual_grading_completed', qs.manual_grading_completed,
                'manual_grading_score', qs.manual_grading_score,
                'manual_grading_feedback', qs.manual_grading_feedback,
                'manual_grading_completed_at', qs.manual_grading_completed_at,
                'manual_grading_completed_by', qs.manual_grading_completed_by,
                'text_answer_grades', COALESCE(tagd.individual_grades, '[]'::jsonb),
                'attempt_number', qs.attempt_number,
                'is_latest_attempt', qs.is_latest_attempt,
                'retry_reason', qs.retry_reason
            ) as submission_data
        FROM quiz_submissions qs
        LEFT JOIN text_answer_grades_data tagd ON qs.id = tagd.quiz_submission_id
        WHERE qs.lesson_content_id = assessment_id
        AND qs.is_latest_attempt = true
    ),
    assignment_submissions_data AS (
        SELECT
            asub.user_id,
            jsonb_build_object(
                'id', asub.id,
                'status', asub.status,
                'score', asub.grade,
                'feedback', asub.feedback,
                'submitted_at', asub.submitted_at,
                'content', asub.content
            ) as submission_data
        FROM assignment_submissions asub
        WHERE asub.assignment_id = assessment_id
    ),
    all_submissions AS (
        SELECT
            cs.student_id,
            cs.student_name,
            cs.avatar_url,
            COALESCE(qsd.submission_data, asd.submission_data) as submission
        FROM course_students cs
        LEFT JOIN quiz_submissions_data qsd ON cs.student_id = qsd.user_id
        LEFT JOIN assignment_submissions_data asd ON cs.student_id = asd.user_id
    )
    SELECT
        ad.id,
        ad.title,
        ad.course_title,
        ad.course_id,
        ad.lesson_id,
        ad.content_type,
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'student', jsonb_build_object('id', sub.student_id, 'name', sub.student_name, 'avatar_url', sub.avatar_url),
                'submission', sub.submission
            )
        ), '[]'::jsonb) as submissions
    FROM assessment_details ad
    LEFT JOIN all_submissions sub ON true
    GROUP BY ad.id, ad.title, ad.course_title, ad.course_id, ad.lesson_id, ad.content_type;
END;
$$;


ALTER FUNCTION "public"."get_assessment_submissions"("assessment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_quizzes_for_course"("course_id" "uuid", "author_id" "uuid" DEFAULT NULL::"uuid", "search_term" "text" DEFAULT ''::"text", "difficulty_filter" "text" DEFAULT ''::"text", "limit_count" integer DEFAULT 20) RETURNS TABLE("quiz_id" "uuid", "quiz_title" "text", "quiz_description" "text", "difficulty_level" "text", "estimated_duration_minutes" integer, "total_questions" bigint, "author_name" "text", "is_already_linked" boolean, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sq.id,
    sq.title,
    sq.description,
    sq.difficulty_level,
    sq.estimated_duration_minutes,
    COUNT(DISTINCT sqq.id) as total_questions,
    p.first_name || ' ' || p.last_name as author_name,
    EXISTS (
      SELECT 1 FROM public.quiz_course_links qcl 
      WHERE qcl.quiz_id = sq.id AND qcl.course_id = get_available_quizzes_for_course.course_id
    ) as is_already_linked,
    sq.created_at
  FROM public.standalone_quizzes sq
  JOIN public.profiles p ON p.id = sq.author_id
  LEFT JOIN public.standalone_quiz_questions sqq ON sq.id = sqq.quiz_id
  WHERE 
    sq.status = 'published'
    AND sq.visibility IN ('public', 'restricted')
    AND (author_id IS NULL OR sq.author_id = author_id)
    AND (search_term = '' OR sq.title ILIKE '%' || search_term || '%' OR sq.description ILIKE '%' || search_term || '%')
    AND (difficulty_filter = '' OR sq.difficulty_level = difficulty_filter)
  GROUP BY sq.id, sq.title, sq.description, sq.difficulty_level, 
           sq.estimated_duration_minutes, p.first_name, p.last_name, sq.created_at
  ORDER BY sq.created_at DESC
  LIMIT limit_count;
END;
$$;


ALTER FUNCTION "public"."get_available_quizzes_for_course"("course_id" "uuid", "author_id" "uuid", "search_term" "text", "difficulty_filter" "text", "limit_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_available_quizzes_for_course"("course_id" "uuid", "author_id" "uuid", "search_term" "text", "difficulty_filter" "text", "limit_count" integer) IS 'Gets available quizzes that can be linked to a course';



CREATE OR REPLACE FUNCTION "public"."get_class_details"("class_uuid" "uuid") RETURNS TABLE("id" "uuid", "name" character varying, "code" character varying, "grade" character varying, "school_name" character varying, "board_name" character varying, "description" "text", "status" character varying, "academic_year" character varying, "semester" character varying, "max_students" integer, "current_students" integer, "teacher_count" bigint, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.code,
        c.grade,
        s.name as school_name,
        b.name as board_name,
        c.description,
        c.status,
        c.academic_year,
        c.semester,
        c.max_students,
        c.current_students,
        COUNT(DISTINCT ct.teacher_id) as teacher_count,
        c.created_at,
        c.updated_at
    FROM public.classes c
    JOIN public.schools s ON c.school_id = s.id
    JOIN public.boards b ON c.board_id = b.id
    LEFT JOIN public.class_teachers ct ON c.id = ct.class_id
    WHERE c.id = class_uuid
    GROUP BY c.id, s.name, b.name;
END;
$$;


ALTER FUNCTION "public"."get_class_details"("class_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_course_analytics_data"() RETURNS TABLE("course_title" "text", "enrolled_students" integer, "completion_rate" integer, "avg_rating" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH course_stats AS (
    SELECT
      c.id,
      c.title AS course_title,
      (SELECT COUNT(DISTINCT cm.user_id) FROM public.course_members cm WHERE cm.course_id = c.id AND cm.role = 'student') AS enrolled_students,
      (SELECT COUNT(DISTINCT ucp.user_id) FROM public.user_content_item_progress ucp WHERE ucp.course_id = c.id AND ucp.status = 'completed') AS completed_students
    FROM public.courses c
    WHERE c.status = 'Published'
  )
  SELECT
    cs.course_title,
    cs.enrolled_students::INTEGER,
    CASE
      WHEN cs.enrolled_students > 0 THEN
        ROUND((cs.completed_students::DECIMAL / cs.enrolled_students) * 100)::INTEGER
      ELSE 0
    END AS completion_rate,
    4.5 AS avg_rating
  FROM course_stats cs
  WHERE cs.enrolled_students > 0
  ORDER BY cs.enrolled_students DESC
  LIMIT 5;
END;
$$;


ALTER FUNCTION "public"."get_course_analytics_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_course_author"("p_course_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT author_id FROM public.courses WHERE id = p_course_id;
$$;


ALTER FUNCTION "public"."get_course_author"("p_course_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_course_completion_trends"("teacher_id" "uuid", "time_range" "text") RETURNS TABLE("month_label" "text", "course_data" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_start_date TIMESTAMP;
BEGIN
  -- Set date range based on time_range parameter
  CASE time_range
    WHEN '7days' THEN v_start_date := NOW() - INTERVAL '7 days';
    WHEN '30days' THEN v_start_date := NOW() - INTERVAL '30 days';
    WHEN '3months' THEN v_start_date := NOW() - INTERVAL '3 months';
    WHEN '6months' THEN v_start_date := NOW() - INTERVAL '6 months';
    WHEN '1year' THEN v_start_date := NOW() - INTERVAL '1 year';
    ELSE v_start_date := '2020-01-01'::TIMESTAMP;
  END CASE;

  RETURN QUERY
  WITH teacher_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = teacher_id AND cm.role = 'teacher'
  ),
  students_in_courses AS (
    SELECT DISTINCT cm.user_id
    FROM public.course_members cm
    WHERE cm.course_id IN (SELECT course_id FROM teacher_courses)
      AND cm.role = 'student'
  ),
  months AS (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY date_series) as month_number,
      TO_CHAR(date_series, 'Mon') as month_label,
      date_series as month_start,
      (date_series + INTERVAL '1 month') as month_end
    FROM generate_series(
      v_start_date::DATE,
      NOW()::DATE,
      '1 month'::INTERVAL
    ) as date_series
  ),
  course_completion AS (
    SELECT 
      m.month_number,
      m.month_label,
      c.title as course_title,
      COUNT(DISTINCT ucip.user_id)::INTEGER as completed_students
    FROM months m
    CROSS JOIN teacher_courses tc
    JOIN public.courses c ON tc.course_id = c.id
    LEFT JOIN public.user_content_item_progress ucip ON c.id = ucip.course_id
      AND ucip.user_id IN (SELECT user_id FROM students_in_courses)
      AND ucip.status = 'completed'
      AND ucip.completed_at >= m.month_start AND ucip.completed_at < m.month_end
    GROUP BY m.month_number, m.month_label, c.title
  )
  SELECT 
    cc.month_label,
    jsonb_object_agg(cc.course_title, cc.completed_students) as course_data
  FROM course_completion cc
  GROUP BY cc.month_number, cc.month_label
  ORDER BY cc.month_number;
END;
$$;


ALTER FUNCTION "public"."get_course_completion_trends"("teacher_id" "uuid", "time_range" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_course_completion_trends_with_filters"("p_teacher_id" "uuid", "p_time_range" "text" DEFAULT '30days'::"text", "filter_country_id" "uuid" DEFAULT NULL::"uuid", "filter_region_id" "uuid" DEFAULT NULL::"uuid", "filter_city_id" "uuid" DEFAULT NULL::"uuid", "filter_project_id" "uuid" DEFAULT NULL::"uuid", "filter_board_id" "uuid" DEFAULT NULL::"uuid", "filter_school_id" "uuid" DEFAULT NULL::"uuid", "filter_grade" "text" DEFAULT NULL::"text", "filter_class_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("month_label" "text", "course_data" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_start_date TIMESTAMP;
BEGIN
  -- Set date range based on time_range parameter
  CASE p_time_range
    WHEN '7days' THEN v_start_date := NOW() - INTERVAL '7 days';
    WHEN '30days' THEN v_start_date := NOW() - INTERVAL '30 days';
    WHEN '3months' THEN v_start_date := NOW() - INTERVAL '3 months';
    WHEN '6months' THEN v_start_date := NOW() - INTERVAL '6 months';
    WHEN '1year' THEN v_start_date := NOW() - INTERVAL '1 year';
    ELSE v_start_date := '2020-01-01'::TIMESTAMP;
  END CASE;

  RETURN QUERY
  WITH teacher_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
  ),
  filtered_students AS (
    SELECT DISTINCT p.id as user_id
    FROM public.profiles p
    LEFT JOIN public.class_students cs ON p.id = cs.student_id
    LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id
    LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON (cl.board_id = b.id OR s.board_id = b.id)
    LEFT JOIN public.projects pr ON (b.project_id = pr.id OR s.project_id = pr.id)
    LEFT JOIN public.cities c ON (pr.city_id = c.id OR b.city_id = c.id OR s.city_id = c.id)
    LEFT JOIN public.regions r ON (c.region_id = r.id OR pr.region_id = r.id OR b.region_id = r.id OR s.region_id = r.id)
    LEFT JOIN public.countries co ON (r.country_id = co.id OR c.country_id = co.id OR pr.country_id = co.id OR b.country_id = co.id OR s.country_id = co.id)
    WHERE p.role = 'student'
    AND (filter_country_id IS NULL OR co.id = filter_country_id)
    AND (filter_region_id IS NULL OR r.id = filter_region_id)
    AND (filter_city_id IS NULL OR c.id = filter_city_id)
    AND (filter_project_id IS NULL OR pr.id = filter_project_id)
    AND (filter_board_id IS NULL OR b.id = filter_board_id)
    AND (filter_school_id IS NULL OR s.id = filter_school_id)
    AND (filter_grade IS NULL OR cl.grade = filter_grade)
    AND (filter_class_id IS NULL OR cl.id = filter_class_id)
  ),
  students_in_courses AS (
    SELECT DISTINCT cm.user_id
    FROM public.course_members cm
    WHERE cm.course_id IN (SELECT course_id FROM teacher_courses)
      AND cm.role = 'student'
      AND cm.user_id IN (SELECT user_id FROM filtered_students)
  ),
  months AS (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY date_series) as month_number,
      TO_CHAR(date_series, 'Mon') as month_label,
      date_series as month_start,
      (date_series + INTERVAL '1 month') as month_end
    FROM generate_series(
      v_start_date::DATE,
      NOW()::DATE,
      '1 month'::INTERVAL
    ) as date_series
  ),
  course_completion AS (
    SELECT 
      m.month_number,
      m.month_label,
      c.title as course_title,
      COUNT(DISTINCT ucip.user_id)::INTEGER as completed_students
    FROM months m
    CROSS JOIN teacher_courses tc
    JOIN public.courses c ON tc.course_id = c.id
    LEFT JOIN public.user_content_item_progress ucip ON c.id = ucip.course_id
      AND ucip.user_id IN (SELECT user_id FROM students_in_courses)
      AND ucip.status = 'completed'
      AND ucip.completed_at >= m.month_start AND ucip.completed_at < m.month_end
    GROUP BY m.month_number, m.month_label, c.title
  )
  SELECT 
    cc.month_label,
    jsonb_object_agg(cc.course_title, cc.completed_students) as course_data
  FROM course_completion cc
  GROUP BY cc.month_number, cc.month_label
  ORDER BY cc.month_number;
END;
$$;


ALTER FUNCTION "public"."get_course_completion_trends_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_course_completion_trends_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") IS 'Get course completion trends with hierarchical and grade filtering';



CREATE OR REPLACE FUNCTION "public"."get_course_ids_by_search"("search_term" "text") RETURNS TABLE("id" "uuid")
    LANGUAGE "sql" STABLE
    AS $$
  SELECT c.id
  FROM courses AS c
  LEFT JOIN profiles AS p ON c.author_id = p.id
  WHERE c.title ILIKE '%' || search_term || '%'
     OR p.first_name ILIKE '%' || search_term || '%'
     OR p.last_name ILIKE '%' || search_term || '%';
$$;


ALTER FUNCTION "public"."get_course_ids_by_search"("search_term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_course_linked_quizzes"("course_id" "uuid") RETURNS TABLE("quiz_id" "uuid", "quiz_title" "text", "quiz_description" "text", "link_type" "text", "position" integer, "is_required" boolean, "due_date" timestamp with time zone, "lesson_content_id" "uuid", "lesson_title" "text", "section_title" "text", "quiz_status" "text", "quiz_visibility" "text", "total_questions" bigint, "author_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sq.id,
    sq.title,
    sq.description,
    qcl.link_type,
    qcl.position,
    qcl.is_required,
    qcl.due_date,
    qcl.lesson_content_id,
    clc.title as lesson_title,
    cs.title as section_title,
    sq.status,
    sq.visibility,
    COUNT(DISTINCT sqq.id) as total_questions,
    p.first_name || ' ' || p.last_name as author_name
  FROM public.quiz_course_links qcl
  JOIN public.standalone_quizzes sq ON sq.id = qcl.quiz_id
  JOIN public.profiles p ON p.id = sq.author_id
  LEFT JOIN public.course_lesson_content clc ON clc.id = qcl.lesson_content_id
  LEFT JOIN public.course_lessons cl ON cl.id = clc.lesson_id
  LEFT JOIN public.course_sections cs ON cs.id = cl.section_id
  LEFT JOIN public.standalone_quiz_questions sqq ON sq.id = sqq.quiz_id
  WHERE qcl.course_id = get_course_linked_quizzes.course_id
  GROUP BY sq.id, sq.title, sq.description, qcl.link_type, qcl.position, 
           qcl.is_required, qcl.due_date, qcl.lesson_content_id, clc.title, 
           cs.title, sq.status, sq.visibility, p.first_name, p.last_name
  ORDER BY qcl.position;
END;
$$;


ALTER FUNCTION "public"."get_course_linked_quizzes"("course_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_course_linked_quizzes"("course_id" "uuid") IS 'Gets all quizzes linked to a course';



CREATE OR REPLACE FUNCTION "public"."get_course_performance_data"("p_teacher_id" "uuid") RETURNS TABLE("course_id" "uuid", "course_title" "text", "course_description" "text", "total_students" integer, "active_students" integer, "completion_rate" integer, "average_score" integer, "total_assignments" integer, "completed_assignments" integer, "last_activity" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH teacher_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
  ),
  students_in_courses AS (
    SELECT DISTINCT cm.user_id, cm.course_id
    FROM public.course_members cm
    WHERE cm.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND cm.role = 'student'
  ),
  course_content_totals AS (
    SELECT
      cs.course_id,
      COUNT(clc.id) AS total_content_items
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
    GROUP BY cs.course_id
  ),
  student_progress_by_course AS (
    SELECT
      sic.user_id,
      sic.course_id,
      cct.total_content_items,
      COUNT(ucip.id) AS completed_content_items
    FROM students_in_courses sic
    JOIN course_content_totals cct ON sic.course_id = cct.course_id
    LEFT JOIN public.user_content_item_progress ucip ON sic.user_id = ucip.user_id
      AND sic.course_id = ucip.course_id
      AND ucip.status = 'completed'
    GROUP BY sic.user_id, sic.course_id, cct.total_content_items
  ),
  course_completion_rates AS (
    SELECT
      spc.course_id,
      AVG(CASE 
        WHEN spc.total_content_items > 0 THEN (spc.completed_content_items::decimal / spc.total_content_items) * 100
        ELSE 0 
      END)::integer as avg_completion_rate
    FROM student_progress_by_course spc
    GROUP BY spc.course_id
  ),
  course_assignments AS (
    SELECT
      cs.course_id,
      COUNT(clc.id) as total_assignments
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND clc.content_type = 'assignment'
    GROUP BY cs.course_id
  ),
  course_submissions AS (
    SELECT
      cs.course_id,
      COUNT(asub.id) as total_submissions,
      AVG(asub.grade)::integer as avg_score
    FROM public.assignment_submissions asub
    JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND asub.grade IS NOT NULL
    GROUP BY cs.course_id
  ),
  course_last_activity AS (
    SELECT
      ucip.course_id,
      MAX(ucip.updated_at) as last_activity
    FROM public.user_content_item_progress ucip
    WHERE ucip.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
    GROUP BY ucip.course_id
  ),
  course_active_students AS (
    SELECT
      ucip.course_id,
      COUNT(DISTINCT ucip.user_id) as active_students
    FROM public.user_content_item_progress ucip
    WHERE ucip.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND ucip.updated_at > NOW() - INTERVAL '30 days'
    GROUP BY ucip.course_id
  )
  SELECT
    c.id::uuid,
    c.title::text,
    c.description::text,
    COUNT(DISTINCT sic.user_id)::integer as total_students,
    COALESCE(cas.active_students, 0)::integer as active_students,
    COALESCE(ccr.avg_completion_rate, 0)::integer as completion_rate,
    COALESCE(cs.avg_score, 0)::integer as average_score,
    COALESCE(ca.total_assignments, 0)::integer as total_assignments,
    COALESCE(cs.total_submissions, 0)::integer as completed_assignments,
    COALESCE(cla.last_activity, NOW())::timestamp with time zone as last_activity
  FROM public.courses c
  JOIN teacher_courses tc ON c.id = tc.course_id
  LEFT JOIN students_in_courses sic ON c.id = sic.course_id
  LEFT JOIN course_completion_rates ccr ON c.id = ccr.course_id
  LEFT JOIN course_assignments ca ON c.id = ca.course_id
  LEFT JOIN course_submissions cs ON c.id = cs.course_id
  LEFT JOIN course_last_activity cla ON c.id = cla.course_id
  LEFT JOIN course_active_students cas ON c.id = cas.course_id
  WHERE c.status = 'Published'
  GROUP BY 
    c.id, 
    c.title, 
    c.description, 
    ccr.avg_completion_rate, 
    cs.avg_score, 
    ca.total_assignments, 
    cs.total_submissions, 
    cla.last_activity,
    cas.active_students
  ORDER BY c.title;
END;
$$;


ALTER FUNCTION "public"."get_course_performance_data"("p_teacher_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_course_performance_data_admin"() RETURNS TABLE("course_title" "text", "enrollments" integer, "completion_rate" integer, "avg_rating" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH course_stats AS (
    SELECT
      c.id,
      c.title AS course_title,
      (SELECT COUNT(DISTINCT cm.user_id) FROM public.course_members cm WHERE cm.course_id = c.id AND cm.role = 'student') AS enrollments,
      (SELECT COUNT(DISTINCT ucp.user_id) FROM public.user_content_item_progress ucp WHERE ucp.course_id = c.id AND ucp.status = 'completed') AS completed_students
    FROM public.courses c
    WHERE c.status = 'Published'
  )
  SELECT
    cs.course_title,
    cs.enrollments::INTEGER,
    CASE
      WHEN cs.enrollments > 0 THEN
        ROUND((cs.completed_students::DECIMAL / cs.enrollments) * 100)::INTEGER
      ELSE 0
    END AS completion_rate,
    4.5 AS avg_rating -- Placeholder
  FROM course_stats cs
  WHERE cs.enrollments > 0
  ORDER BY cs.enrollments DESC
  LIMIT 5;
END;
$$;


ALTER FUNCTION "public"."get_course_performance_data_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_course_performance_data_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid" DEFAULT NULL::"uuid", "filter_region_id" "uuid" DEFAULT NULL::"uuid", "filter_city_id" "uuid" DEFAULT NULL::"uuid", "filter_project_id" "uuid" DEFAULT NULL::"uuid", "filter_board_id" "uuid" DEFAULT NULL::"uuid", "filter_school_id" "uuid" DEFAULT NULL::"uuid", "filter_grade" "text" DEFAULT NULL::"text", "filter_class_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("course_id" "uuid", "course_title" "text", "course_description" "text", "total_students" integer, "active_students" integer, "completion_rate" integer, "average_score" integer, "total_assignments" integer, "completed_assignments" integer, "last_activity" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH teacher_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
  ),
  filtered_students AS (
    SELECT DISTINCT p.id as user_id
    FROM public.profiles p
    LEFT JOIN public.class_students cs ON p.id = cs.student_id
    LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id
    LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON (cl.board_id = b.id OR s.board_id = b.id)
    LEFT JOIN public.projects pr ON (b.project_id = pr.id OR s.project_id = pr.id)
    LEFT JOIN public.cities c ON (pr.city_id = c.id OR b.city_id = c.id OR s.city_id = c.id)
    LEFT JOIN public.regions r ON (c.region_id = r.id OR pr.region_id = r.id OR b.region_id = r.id OR s.region_id = r.id)
    LEFT JOIN public.countries co ON (r.country_id = co.id OR c.country_id = co.id OR pr.country_id = co.id OR b.country_id = co.id OR s.country_id = co.id)
    WHERE p.role = 'student'
    AND (filter_country_id IS NULL OR co.id = filter_country_id)
    AND (filter_region_id IS NULL OR r.id = filter_region_id)
    AND (filter_city_id IS NULL OR c.id = filter_city_id)
    AND (filter_project_id IS NULL OR pr.id = filter_project_id)
    AND (filter_board_id IS NULL OR b.id = filter_board_id)
    AND (filter_school_id IS NULL OR s.id = filter_school_id)
    AND (filter_grade IS NULL OR cl.grade = filter_grade)
    AND (filter_class_id IS NULL OR cl.id = filter_class_id)
  ),
  students_in_courses AS (
    SELECT DISTINCT cm.user_id, cm.course_id
    FROM public.course_members cm
    WHERE cm.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND cm.role = 'student'
      AND cm.user_id IN (SELECT user_id FROM filtered_students)
  ),
  course_content_totals AS (
    SELECT
      cs.course_id,
      COUNT(clc.id) AS total_content_items
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
    GROUP BY cs.course_id
  ),
  student_progress_by_course AS (
    SELECT
      sic.user_id,
      sic.course_id,
      cct.total_content_items,
      COUNT(ucip.id) AS completed_content_items
    FROM students_in_courses sic
    JOIN course_content_totals cct ON sic.course_id = cct.course_id
    LEFT JOIN public.user_content_item_progress ucip ON sic.user_id = ucip.user_id
      AND sic.course_id = ucip.course_id
      AND ucip.status = 'completed'
    GROUP BY sic.user_id, sic.course_id, cct.total_content_items
  ),
  course_completion_rates AS (
    SELECT
      spc.course_id,
      AVG(CASE 
        WHEN spc.total_content_items > 0 THEN (spc.completed_content_items::decimal / spc.total_content_items) * 100
        ELSE 0 
      END)::integer as avg_completion_rate
    FROM student_progress_by_course spc
    GROUP BY spc.course_id
  ),
  course_assignments AS (
    SELECT
      cs.course_id,
      COUNT(clc.id) as total_assignments
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND clc.content_type = 'assignment'
    GROUP BY cs.course_id
  ),
  course_submissions AS (
    SELECT
      cs.course_id,
      COUNT(asub.id) as total_submissions,
      AVG(asub.grade)::integer as avg_score
    FROM public.assignment_submissions asub
    JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND asub.grade IS NOT NULL
      AND asub.user_id IN (SELECT user_id FROM filtered_students)
    GROUP BY cs.course_id
  ),
  course_last_activity AS (
    SELECT
      ucip.course_id,
      MAX(ucip.updated_at) as last_activity
    FROM public.user_content_item_progress ucip
    WHERE ucip.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND ucip.user_id IN (SELECT user_id FROM filtered_students)
    GROUP BY ucip.course_id
  ),
  course_active_students AS (
    SELECT
      ucip.course_id,
      COUNT(DISTINCT ucip.user_id) as active_students
    FROM public.user_content_item_progress ucip
    WHERE ucip.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND ucip.user_id IN (SELECT user_id FROM filtered_students)
      AND ucip.updated_at > NOW() - INTERVAL '30 days'
    GROUP BY ucip.course_id
  )
  SELECT
    c.id::uuid,
    c.title::text,
    c.description::text,
    COUNT(DISTINCT sic.user_id)::integer as total_students,
    COALESCE(cas.active_students, 0)::integer as active_students,
    COALESCE(ccr.avg_completion_rate, 0)::integer as completion_rate,
    COALESCE(cs.avg_score, 0)::integer as average_score,
    COALESCE(ca.total_assignments, 0)::integer as total_assignments,
    COALESCE(cs.total_submissions, 0)::integer as completed_assignments,
    COALESCE(cla.last_activity, NOW())::timestamp with time zone as last_activity
  FROM public.courses c
  JOIN teacher_courses tc ON c.id = tc.course_id
  LEFT JOIN students_in_courses sic ON c.id = sic.course_id
  LEFT JOIN course_completion_rates ccr ON c.id = ccr.course_id
  LEFT JOIN course_assignments ca ON c.id = ca.course_id
  LEFT JOIN course_submissions cs ON c.id = cs.course_id
  LEFT JOIN course_last_activity cla ON c.id = cla.course_id
  LEFT JOIN course_active_students cas ON c.id = cas.course_id
  WHERE c.status = 'Published'
  GROUP BY 
    c.id, 
    c.title, 
    c.description, 
    ccr.avg_completion_rate, 
    cs.avg_score, 
    ca.total_assignments, 
    cs.total_submissions, 
    cla.last_activity,
    cas.active_students
  ORDER BY c.title;
END;
$$;


ALTER FUNCTION "public"."get_course_performance_data_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_course_performance_data_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") IS 'Get course performance data with hierarchical and grade filtering';



CREATE OR REPLACE FUNCTION "public"."get_course_status"("p_course_id" "uuid") RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT status FROM public.courses WHERE id = p_course_id;
$$;


ALTER FUNCTION "public"."get_course_status"("p_course_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_courses_for_user"() RETURNS TABLE("id" "uuid", "title" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check the current user's role directly, ignoring case
    IF (SELECT LOWER(p.role::text) FROM public.profiles p WHERE p.id = auth.uid()) = 'admin' THEN
        -- Admins can see all published courses, check status case-insensitively
        RETURN QUERY
        SELECT c.id, c.title
        FROM public.courses c
        WHERE LOWER(c.status) = 'published';
    ELSE
        -- Teachers and Students can see their published courses, check status case-insensitively
        RETURN QUERY
        SELECT c.id, c.title
        FROM public.courses c
        JOIN public.course_members cm ON c.id = cm.course_id
        WHERE cm.user_id = auth.uid()
          AND LOWER(c.status) = 'published';
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_courses_for_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_role text;
BEGIN
  -- We cast the role to text to be safe, though your function already returns text.
  SELECT role::text INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN user_role;
END;
$$;


ALTER FUNCTION "public"."get_current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_discussion_details"("p_discussion_id" "uuid") RETURNS TABLE("id" "uuid", "created_at" timestamp with time zone, "title" "text", "content" "text", "creator_id" "uuid", "course_id" "uuid", "discussion_type" "text", "creator_first_name" "text", "creator_last_name" "text", "course_title" "text", "replies_count" bigint, "likes_count" bigint, "is_liked_by_user" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id, d.created_at, d.title, d.content, d.creator_id, d.course_id, d.type AS discussion_type,
        p.first_name, p.last_name, c.title,
        (SELECT COUNT(*) FROM public.discussion_replies dr WHERE dr.discussion_id = d.id) AS replies_count,
        (SELECT COUNT(*) FROM public.discussion_likes dl WHERE dl.discussion_id = d.id) AS likes_count,
        EXISTS(SELECT 1 FROM public.discussion_likes dl WHERE dl.discussion_id = d.id AND dl.user_id = auth.uid()) AS is_liked_by_user
    FROM public.discussions d
    JOIN public.profiles p ON d.creator_id = p.id
    LEFT JOIN public.courses c ON d.course_id = c.id
    WHERE d.id = p_discussion_id;
END;
$$;


ALTER FUNCTION "public"."get_discussion_details"("p_discussion_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_discussion_replies"("p_discussion_id" "uuid") RETURNS TABLE("id" "uuid", "created_at" timestamp with time zone, "content" "text", "user_id" "uuid", "user_first_name" "text", "user_last_name" "text", "likes_count" bigint, "is_liked_by_user" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        dr.id, dr.created_at, dr.content, dr.user_id, p.first_name, p.last_name,
        (SELECT COUNT(*) FROM public.discussion_likes dl WHERE dl.reply_id = dr.id) AS likes_count,
        EXISTS(SELECT 1 FROM public.discussion_likes dl WHERE dl.reply_id = dr.id AND dl.user_id = auth.uid()) AS is_liked_by_user
    FROM public.discussion_replies dr
    JOIN public.profiles p ON dr.user_id = p.id
    WHERE dr.discussion_id = p_discussion_id
    ORDER BY dr.created_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_discussion_replies"("p_discussion_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_discussions_for_user"("p_search_term" "text", "p_course_filter" "text", "p_type_filter" "text") RETURNS TABLE("id" "uuid", "title" "text", "content" "text", "created_at" timestamp with time zone, "creator_id" "uuid", "creator_first_name" "text", "creator_last_name" "text", "course_id" "uuid", "course_title" "text", "discussion_type" "text", "replies_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_user_id UUID := auth.uid();
    current_user_role TEXT := get_current_user_role();
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.title,
        d.content,
        d.created_at,
        d.creator_id,
        p.first_name,
        p.last_name,
        c.id,
        c.title,
        d.type,
        (SELECT count(*) FROM public.discussion_replies dr WHERE dr.discussion_id = d.id) AS replies_count
    FROM
        public.discussions d
    LEFT JOIN
        public.profiles p ON d.creator_id = p.id
    LEFT JOIN
        public.courses c ON d.course_id = c.id
    WHERE
        -- Permission Check
        (
            LOWER(current_user_role) = 'admin'
            OR
            (d.course_id IS NULL AND EXISTS (
                SELECT 1 FROM public.discussion_participants dp
                WHERE dp.discussion_id = d.id AND dp.role = current_user_role::app_role
            ))
            OR
            (d.course_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.course_members cm
                WHERE cm.course_id = d.course_id AND cm.user_id = current_user_id
            ))
        )
        -- Search Filter
        AND
        (
            p_search_term = ''
            OR
            d.title ILIKE '%' || p_search_term || '%'
            OR
            d.content ILIKE '%' || p_search_term || '%'
        )
        -- Course Filter
        AND
        (
            p_course_filter = 'all'
            OR
            (p_course_filter = 'general' AND d.course_id IS NULL)
            OR
            d.course_id = p_course_filter::UUID
        )
        -- Type Filter
        AND
        (
            p_type_filter = 'all'
            OR
            d.type ILIKE p_type_filter
        )
    ORDER BY
        d.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_discussions_for_user"("p_search_term" "text", "p_course_filter" "text", "p_type_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_discussions_for_user"("p_search_term" "text", "p_course_filter" "text", "p_type_filter" "text", "p_page" integer, "p_rows_per_page" integer) RETURNS TABLE("id" "uuid", "title" "text", "content" "text", "created_at" timestamp with time zone, "creator_id" "uuid", "course_id" "uuid", "creator_first_name" "text", "creator_last_name" "text", "course_title" "text", "discussion_type" "text", "replies_count" bigint, "likes_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role public.app_role;
    v_offset INT := (p_page - 1) * p_rows_per_page;
BEGIN
    SELECT role INTO v_user_role FROM public.profiles WHERE public.profiles.id = v_user_id;

    RETURN QUERY
    SELECT
        d.id,
        d.title,
        d.content,
        d.created_at,
        d.creator_id,
        d.course_id,
        p.first_name AS creator_first_name,
        p.last_name AS creator_last_name,
        c.title AS course_title,
        d.type AS discussion_type,
        (SELECT count(*) FROM public.discussion_replies dr WHERE dr.discussion_id = d.id) AS replies_count,
        (SELECT count(*) FROM public.discussion_likes dl WHERE dl.discussion_id = d.id) AS likes_count
    FROM
        public.discussions d
    LEFT JOIN
        public.profiles p ON d.creator_id = p.id
    LEFT JOIN
        public.courses c ON d.course_id = c.id
    WHERE
        (
            v_user_role = 'admin'::public.app_role
            OR
            (d.course_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.course_members cm
                WHERE cm.course_id = d.course_id AND cm.user_id = v_user_id
            ))
            OR
            (d.course_id IS NULL AND EXISTS (
                SELECT 1 FROM public.discussion_participants dp
                WHERE dp.discussion_id = d.id AND dp.role = v_user_role
            ))
        )
        AND
        (
            p_search_term = '' OR p_search_term IS NULL
            OR
            d.title ILIKE '%' || p_search_term || '%'
            OR
            d.content ILIKE '%' || p_search_term || '%'
        )
        AND
        (
            p_course_filter = 'all'
            OR
            (p_course_filter = 'general' AND d.course_id IS NULL)
            OR
            d.course_id::text = p_course_filter
        )
        AND
        (
            p_type_filter = 'all'
            OR
            d.type ILIKE p_type_filter
        )
    ORDER BY
        d.created_at DESC
    LIMIT p_rows_per_page
    OFFSET v_offset;
END;
$$;


ALTER FUNCTION "public"."get_discussions_for_user"("p_search_term" "text", "p_course_filter" "text", "p_type_filter" "text", "p_page" integer, "p_rows_per_page" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_discussions_for_user_count"("p_search_term" "text", "p_course_filter" "text", "p_type_filter" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role public.app_role;
    v_count INT;
BEGIN
    SELECT role INTO v_user_role FROM public.profiles WHERE public.profiles.id = v_user_id;

    SELECT COUNT(d.id) INTO v_count
    FROM
        public.discussions d
    WHERE
        (
            v_user_role = 'admin'::public.app_role
            OR
            (d.course_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.course_members cm
                WHERE cm.course_id = d.course_id AND cm.user_id = v_user_id
            ))
            OR
            (d.course_id IS NULL AND EXISTS (
                SELECT 1 FROM public.discussion_participants dp
                WHERE dp.discussion_id = d.id AND dp.role = v_user_role
            ))
        )
        AND
        (
            p_search_term = '' OR p_search_term IS NULL
            OR
            d.title ILIKE '%' || p_search_term || '%'
            OR
            d.content ILIKE '%' || p_search_term || '%'
        )
        AND
        (
            p_course_filter = 'all'
            OR
            (p_course_filter = 'general' AND d.course_id IS NULL)
            OR
            d.course_id::text = p_course_filter
        )
        AND
        (
            p_type_filter = 'all'
            OR
            d.type ILIKE p_type_filter
        );
    RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."get_discussions_for_user_count"("p_search_term" "text", "p_course_filter" "text", "p_type_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_engagement_data"("time_range" "text") RETURNS TABLE("period_label" "text", "active_users" integer, "time_spent" integer, "courses" integer, "discussions" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  start_date TIMESTAMP;
  end_date TIMESTAMP;
  period_type TEXT;
BEGIN
  -- Set date range based on time_range parameter
  CASE time_range
    WHEN '7days' THEN
      start_date := NOW() - INTERVAL '7 days';
      period_type := 'day';
    WHEN '30days' THEN
      start_date := NOW() - INTERVAL '30 days';
      period_type := 'day';
    WHEN '3months' THEN
      start_date := NOW() - INTERVAL '3 months';
      period_type := 'week';
    WHEN '6months' THEN
      start_date := NOW() - INTERVAL '6 months';
      period_type := 'month';
    WHEN '1year' THEN
      start_date := NOW() - INTERVAL '1 year';
      period_type := 'month';
    ELSE -- alltime
      start_date := '2020-01-01'::TIMESTAMP;
      period_type := 'month';
  END CASE;
  
  end_date := NOW();

  RETURN QUERY
  WITH periods AS (
    SELECT 
      generate_series(
        date_trunc(period_type, start_date),
        date_trunc(period_type, end_date),
        ('1 ' || period_type)::interval
      ) as period
  )
  SELECT
    TO_CHAR(p.period, 
      CASE 
        WHEN period_type = 'day' THEN 'Mon DD'
        ELSE 'Mon'
      END
    ) AS period_label,
    (SELECT COUNT(DISTINCT ucp.user_id) FROM public.user_content_item_progress ucp WHERE ucp.updated_at >= p.period AND ucp.updated_at < p.period + ('1 ' || period_type)::interval)::INTEGER AS active_users,
    0 AS time_spent, -- Time spent is not tracked, returning 0
    (SELECT COUNT(DISTINCT ucp.course_id) FROM public.user_content_item_progress ucp WHERE ucp.updated_at >= p.period AND ucp.updated_at < p.period + ('1 ' || period_type)::interval)::INTEGER AS courses,
    (SELECT COUNT(DISTINCT d.id) FROM public.discussions d WHERE d.created_at >= p.period AND d.created_at < p.period + ('1 ' || period_type)::interval)::INTEGER AS discussions
  FROM periods p
  ORDER BY p.period;
END;
$$;


ALTER FUNCTION "public"."get_engagement_data"("time_range" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_engagement_metrics_data"("time_range" "text") RETURNS TABLE("period_label" "text", "active_users" integer, "assignments_submitted" integer, "quiz_submissions" integer, "lessons_completed" integer, "discussions_created" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  start_date TIMESTAMP;
  end_date TIMESTAMP;
  interval_type TEXT;
BEGIN
  -- Set date range based on time_range parameter
  CASE time_range
    WHEN '7days' THEN
      start_date := NOW() - INTERVAL '7 days';
      interval_type := 'day';
    WHEN '30days' THEN
      start_date := NOW() - INTERVAL '30 days';
      interval_type := 'day';
    WHEN '3months' THEN
      start_date := NOW() - INTERVAL '3 months';
      interval_type := 'month';
    WHEN '6months' THEN
      start_date := NOW() - INTERVAL '6 months';
      interval_type := 'month';
    WHEN '1year' THEN
      start_date := NOW() - INTERVAL '1 year';
      interval_type := 'month';
    ELSE -- alltime
      start_date := NOW() - INTERVAL '2 years';
      interval_type := 'quarter';
  END CASE;
  
  end_date := NOW();

  RETURN QUERY
  WITH periods AS (
    SELECT generate_series(
      date_trunc(interval_type, start_date),
      date_trunc(interval_type, end_date),
      (CASE WHEN interval_type = 'quarter' THEN '3 months' ELSE '1 ' || interval_type END)::interval
    ) as period
  ),
  active_users_by_period AS (
    SELECT
      date_trunc(interval_type, ucp.updated_at) as period,
      COUNT(DISTINCT ucp.user_id) as value
    FROM public.user_content_item_progress ucp
    WHERE ucp.updated_at BETWEEN start_date AND end_date
    GROUP BY 1
  ),
  assignments_by_period AS (
    SELECT
      date_trunc(interval_type, asub.submitted_at) as period,
      COUNT(asub.id) as value
    FROM public.assignment_submissions asub
    WHERE asub.submitted_at BETWEEN start_date AND end_date
    GROUP BY 1
  ),
  quizzes_by_period AS (
    SELECT
      date_trunc(interval_type, qsub.submitted_at) as period,
      COUNT(qsub.id) as value
    FROM public.quiz_submissions qsub
    WHERE qsub.submitted_at BETWEEN start_date AND end_date
    GROUP BY 1
  ),
  lessons_by_period AS (
    SELECT
      date_trunc(interval_type, ucp.completed_at) as period,
      COUNT(ucp.id) as value
    FROM public.user_content_item_progress ucp
    WHERE ucp.completed_at BETWEEN start_date AND end_date
    GROUP BY 1
  ),
  discussions_by_period AS (
    SELECT
      date_trunc(interval_type, d.created_at) as period,
      COUNT(d.id) as value
    FROM public.discussions d
    WHERE d.created_at BETWEEN start_date AND end_date
    GROUP BY 1
  )
  SELECT
    TO_CHAR(p.period, 
      CASE 
        WHEN interval_type = 'day' THEN 'YYYY-MM-DD'
        WHEN interval_type = 'month' THEN 'YYYY-Mon'
        WHEN interval_type = 'quarter' THEN 'YYYY "Q"Q'
      END
    ) AS period_label,
    COALESCE(au.value, 0)::INTEGER AS active_users,
    COALESCE(ap.value, 0)::INTEGER AS assignments_submitted,
    COALESCE(qp.value, 0)::INTEGER AS quiz_submissions,
    COALESCE(lp.value, 0)::INTEGER AS lessons_completed,
    COALESCE(dp.value, 0)::INTEGER AS discussions_created
  FROM periods p
  LEFT JOIN active_users_by_period au ON p.period = au.period
  LEFT JOIN assignments_by_period ap ON p.period = ap.period
  LEFT JOIN quizzes_by_period qp ON p.period = qp.period
  LEFT JOIN lessons_by_period lp ON p.period = lp.period
  LEFT JOIN discussions_by_period dp ON p.period = dp.period
  ORDER BY p.period;
END;
$$;


ALTER FUNCTION "public"."get_engagement_metrics_data"("time_range" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_engagement_trends_data"("p_teacher_id" "uuid", "p_time_range" "text") RETURNS TABLE("week_label" "text", "assignments_count" bigint, "quizzes_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
    v_interval INTERVAL;
    v_format TEXT;
    v_period_type TEXT;
BEGIN
    v_end_date := NOW();

    CASE p_time_range
        WHEN '7days' THEN
            v_start_date := v_end_date - INTERVAL '6 days';
            v_interval := '1 day';
            v_format := 'Dy';
            v_period_type := 'day';
        WHEN '30days' THEN
            v_start_date := DATE_TRUNC('week', v_end_date - INTERVAL '3 weeks');
            v_interval := '1 week';
            v_format := 'WW';
            v_period_type := 'week';
        WHEN '3months' THEN
            v_start_date := DATE_TRUNC('month', v_end_date - INTERVAL '2 months');
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
        WHEN '6months' THEN
            v_start_date := DATE_TRUNC('month', v_end_date - INTERVAL '5 months');
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
        WHEN '1year' THEN
            v_start_date := DATE_TRUNC('month', v_end_date - INTERVAL '11 months');
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
        ELSE -- alltime
            v_start_date := '2020-01-01'::TIMESTAMPTZ;
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
    END CASE;

    v_start_date := DATE_TRUNC(v_period_type, v_start_date);

    RETURN QUERY
    WITH time_periods AS (
        SELECT 
            CASE 
                WHEN p_time_range = '30days' THEN 'Week ' || TO_CHAR(period_start, v_format)
                ELSE TO_CHAR(period_start, v_format)
            END as label,
            period_start::date
        FROM generate_series(v_start_date, v_end_date, v_interval) AS period_start
    ),
    assignments_by_period AS (
        SELECT
            DATE_TRUNC(v_period_type, asub.submitted_at)::date as period_start,
            COUNT(asub.id) as count
        FROM public.assignment_submissions asub
        JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
        JOIN public.course_lessons cl ON clc.lesson_id = cl.id
        JOIN public.course_sections cs ON cl.section_id = cs.id
        JOIN public.course_members cm ON cs.course_id = cm.course_id
        WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
          AND asub.submitted_at BETWEEN v_start_date AND v_end_date
        GROUP BY 1
    ),
    quizzes_by_period AS (
        SELECT
            DATE_TRUNC(v_period_type, qs.submitted_at)::date as period_start,
            COUNT(qs.id) as count
        FROM public.quiz_submissions qs
        JOIN public.course_lessons cl ON qs.lesson_id = cl.id
        JOIN public.course_sections cs ON cl.section_id = cs.id
        JOIN public.course_members cm ON cs.course_id = cm.course_id
        WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
          AND qs.submitted_at BETWEEN v_start_date AND v_end_date
        GROUP BY 1
    )
    SELECT
        tp.label AS week_label,
        COALESCE(a.count, 0) AS assignments_count,
        COALESCE(q.count, 0) AS quizzes_count
    FROM time_periods tp
    LEFT JOIN assignments_by_period a ON tp.period_start = a.period_start
    LEFT JOIN quizzes_by_period q ON tp.period_start = q.period_start
    ORDER BY tp.period_start;
END;
$$;


ALTER FUNCTION "public"."get_engagement_trends_data"("p_teacher_id" "uuid", "p_time_range" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_engagement_trends_data_with_filters"("p_teacher_id" "uuid", "p_time_range" "text" DEFAULT '30days'::"text", "filter_country_id" "uuid" DEFAULT NULL::"uuid", "filter_region_id" "uuid" DEFAULT NULL::"uuid", "filter_city_id" "uuid" DEFAULT NULL::"uuid", "filter_project_id" "uuid" DEFAULT NULL::"uuid", "filter_board_id" "uuid" DEFAULT NULL::"uuid", "filter_school_id" "uuid" DEFAULT NULL::"uuid", "filter_grade" "text" DEFAULT NULL::"text", "filter_class_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("week_label" "text", "discussions_count" bigint, "assignments_count" bigint, "quizzes_count" bigint, "videos_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  start_date TIMESTAMP;
BEGIN
  -- Set date range based on time_range parameter
  CASE p_time_range
    WHEN '7days' THEN start_date := NOW() - INTERVAL '7 days';
    WHEN '30days' THEN start_date := NOW() - INTERVAL '30 days';
    WHEN '3months' THEN start_date := NOW() - INTERVAL '3 months';
    WHEN '6months' THEN start_date := NOW() - INTERVAL '6 months';
    WHEN '1year' THEN start_date := NOW() - INTERVAL '1 year';
    ELSE -- alltime (limit to a reasonable past for performance, e.g. 2 years)
      start_date := NOW() - INTERVAL '2 years';
  END CASE;

  RETURN QUERY
  WITH teacher_courses AS (
    SELECT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
  ),
  filtered_students AS (
    SELECT DISTINCT p.id as user_id
    FROM public.profiles p
    LEFT JOIN public.class_students cs ON p.id = cs.student_id
    LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id
    LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON (cl.board_id = b.id OR s.board_id = b.id)
    LEFT JOIN public.projects pr ON (b.project_id = pr.id OR s.project_id = pr.id)
    LEFT JOIN public.cities c ON (pr.city_id = c.id OR b.city_id = c.id OR s.city_id = c.id)
    LEFT JOIN public.regions r ON (c.region_id = r.id OR pr.region_id = r.id OR b.region_id = r.id OR s.region_id = r.id)
    LEFT JOIN public.countries co ON (r.country_id = co.id OR c.country_id = co.id OR pr.country_id = co.id OR b.country_id = co.id OR s.country_id = co.id)
    WHERE p.role = 'student'
    AND (filter_country_id IS NULL OR co.id = filter_country_id)
    AND (filter_region_id IS NULL OR r.id = filter_region_id)
    AND (filter_city_id IS NULL OR c.id = filter_city_id)
    AND (filter_project_id IS NULL OR pr.id = filter_project_id)
    AND (filter_board_id IS NULL OR b.id = filter_board_id)
    AND (filter_school_id IS NULL OR s.id = filter_school_id)
    AND (filter_grade IS NULL OR cl.grade = filter_grade)
    AND (filter_class_id IS NULL OR cl.id = filter_class_id)
  ),
  weeks AS (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY week_start) as week_number,
      'Week ' || ROW_NUMBER() OVER (ORDER BY week_start)::TEXT as week_label,
      week_start
    FROM generate_series(
      date_trunc('week', start_date),
      date_trunc('week', NOW()),
      '1 week'::INTERVAL
    ) as gs(week_start)
  ),
  discussions_by_week AS (
      SELECT
          date_trunc('week', d.created_at) as week_start,
          COUNT(d.id) as count
      FROM public.discussions d
      WHERE d.course_id IN (SELECT course_id FROM teacher_courses)
      AND d.created_at >= start_date
      GROUP BY 1
  ),
  assignments_by_week AS (
      SELECT
          date_trunc('week', asub.submitted_at) as week_start,
          COUNT(asub.id) as count
      FROM public.assignment_submissions asub
      JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
      JOIN public.course_lessons cl ON clc.lesson_id = cl.id
      JOIN public.course_sections cs ON cl.section_id = cs.id
      WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
      AND asub.submitted_at >= start_date
      AND asub.user_id IN (SELECT user_id FROM filtered_students)
      GROUP BY 1
  ),
  quizzes_by_week AS (
      SELECT
          date_trunc('week', qs.submitted_at) as week_start,
          COUNT(qs.id) as count
      FROM public.quiz_submissions qs
      JOIN public.course_lessons cl ON qs.lesson_id = cl.id
      JOIN public.course_sections cs ON cl.section_id = cs.id
      WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
      AND qs.submitted_at >= start_date
      AND qs.user_id IN (SELECT user_id FROM filtered_students)
      GROUP BY 1
  ),
  videos_by_week AS (
      SELECT
          date_trunc('week', ucip.updated_at) as week_start,
          COUNT(ucip.id) as count
      FROM public.user_content_item_progress ucip
      JOIN public.course_lesson_content clc ON ucip.lesson_content_id = clc.id
      WHERE ucip.course_id IN (SELECT course_id FROM teacher_courses)
      AND clc.content_type = 'video'
      AND (ucip.progress_data->>'time_spent_seconds')::numeric > 0
      AND ucip.updated_at >= start_date
      AND ucip.user_id IN (SELECT user_id FROM filtered_students)
      GROUP BY 1
  )
  SELECT
      w.week_label,
      COALESCE(d.count, 0),
      COALESCE(a.count, 0),
      COALESCE(q.count, 0),
      COALESCE(v.count, 0)
  FROM weeks w
  LEFT JOIN discussions_by_week d ON w.week_start = d.week_start
  LEFT JOIN assignments_by_week a ON w.week_start = a.week_start
  LEFT JOIN quizzes_by_week q ON w.week_start = q.week_start
  LEFT JOIN videos_by_week v ON w.week_start = v.week_start
  ORDER BY w.week_number;
END;
$$;


ALTER FUNCTION "public"."get_engagement_trends_data_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_engagement_trends_data_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") IS 'Get engagement trends data with hierarchical and grade filtering';



CREATE OR REPLACE FUNCTION "public"."get_exercises_for_stage_with_counts"("stage_num" integer) RETURNS TABLE("exercise_id" integer, "exercise_number" integer, "title" "text", "title_urdu" "text", "description" "text", "exercise_type" "text", "exercise_order" integer, "topic_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.exercise_number,
        e.title,
        e.title_urdu,
        e.description,
        e.exercise_type,
        e.exercise_order,
        COUNT(t.id) as topic_count
    FROM public.ai_tutor_content_hierarchy e
    LEFT JOIN public.ai_tutor_content_hierarchy t ON t.parent_id = e.id AND t.level = 'topic'
    WHERE e.level = 'exercise' 
    AND e.parent_id = (
        SELECT id FROM public.ai_tutor_content_hierarchy 
        WHERE level = 'stage' AND stage_number = stage_num
    )
    GROUP BY e.id, e.exercise_number, e.title, e.title_urdu, e.description, e.exercise_type, e.exercise_order
    ORDER BY e.exercise_order;
END;
$$;


ALTER FUNCTION "public"."get_exercises_for_stage_with_counts"("stage_num" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_failed_login_attempts"("p_email" "text", "p_hours_back" integer DEFAULT 24) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    attempt_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO attempt_count
    FROM login_attempts
    WHERE email = p_email
    AND success = FALSE
    AND attempt_time > NOW() - INTERVAL '1 hour' * p_hours_back;
    
    RETURN COALESCE(attempt_count, 0);
END;
$$;


ALTER FUNCTION "public"."get_failed_login_attempts"("p_email" "text", "p_hours_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_fcm_tokens_for_users"("user_ids" "uuid"[]) RETURNS TABLE("token" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT fcm_tokens.token
    FROM fcm_tokens
    WHERE fcm_tokens.user_id = ANY(user_ids);
END;
$$;


ALTER FUNCTION "public"."get_fcm_tokens_for_users"("user_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_hierarchy_statistics"() RETURNS TABLE("total_countries" integer, "total_regions" integer, "total_cities" integer, "total_projects" integer, "total_boards" integer, "total_schools" integer, "total_students" bigint, "total_teachers" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM countries)::INTEGER,
        (SELECT COUNT(*) FROM regions)::INTEGER,
        (SELECT COUNT(*) FROM cities)::INTEGER,
        (SELECT COUNT(*) FROM projects)::INTEGER,
        (SELECT COUNT(*) FROM boards)::INTEGER,
        (SELECT COUNT(*) FROM schools)::INTEGER,
        (SELECT COALESCE(SUM(total_students), 0) FROM schools)::BIGINT,
        (SELECT COALESCE(SUM(total_teachers), 0) FROM schools)::BIGINT;
END;
$$;


ALTER FUNCTION "public"."get_hierarchy_statistics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_latest_quiz_submissions_for_assessment"("p_lesson_content_id" "uuid") RETURNS TABLE("submission_id" "uuid", "user_id" "uuid", "student_name" "text", "student_email" "text", "attempt_number" integer, "total_attempts" integer, "submitted_at" timestamp with time zone, "score" numeric, "manual_grading_required" boolean, "manual_grading_completed" boolean, "manual_grading_score" numeric, "retry_reason" "text", "answers" "jsonb", "results" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qs.id as submission_id,
        qs.user_id,
        COALESCE(p.first_name || ' ' || p.last_name, p.email) as student_name,
        p.email as student_email,
        qs.attempt_number,
        (SELECT COUNT(*)::INTEGER FROM quiz_submissions qs2 
         WHERE qs2.user_id = qs.user_id 
         AND qs2.lesson_content_id = p_lesson_content_id) as total_attempts,
        qs.submitted_at,
        qs.score::NUMERIC(5,2),
        qs.manual_grading_required,
        qs.manual_grading_completed,
        qs.manual_grading_score::NUMERIC(5,2),
        qs.retry_reason,
        qs.answers,
        qs.results
    FROM quiz_submissions qs
    JOIN profiles p ON qs.user_id = p.id
    WHERE qs.lesson_content_id = p_lesson_content_id
    AND qs.is_latest_attempt = true
    ORDER BY p.email;
END;
$$;


ALTER FUNCTION "public"."get_latest_quiz_submissions_for_assessment"("p_lesson_content_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_login_security_stats"("p_hours_back" integer DEFAULT 24) RETURNS TABLE("total_attempts" bigint, "failed_attempts" bigint, "successful_attempts" bigint, "blocked_users_count" bigint, "unique_ips" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_attempts,
        COUNT(*) FILTER (WHERE success = FALSE) as failed_attempts,
        COUNT(*) FILTER (WHERE success = TRUE) as successful_attempts,
        (SELECT COUNT(*) FROM blocked_users WHERE is_active = TRUE AND blocked_until > NOW()) as blocked_users_count,
        COUNT(DISTINCT ip_address) FILTER (WHERE ip_address IS NOT NULL) as unique_ips
    FROM login_attempts
    WHERE attempt_time > NOW() - INTERVAL '1 hour' * p_hours_back;
END;
$$;


ALTER FUNCTION "public"."get_login_security_stats"("p_hours_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_maintenance_mode_status"() RETURNS TABLE("maintenance_mode" boolean, "system_name" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ads.maintenance_mode,
        ads.system_name
    FROM admin_settings ads
    ORDER BY ads.created_at DESC
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_maintenance_mode_status"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_maintenance_mode_status"() IS 'Returns current maintenance mode status and system name. Accessible by all authenticated users.';



CREATE OR REPLACE FUNCTION "public"."get_math_question_details"("question_id" "uuid") RETURNS TABLE("id" "uuid", "question_text" "text", "math_expression" "text", "math_tolerance" numeric, "math_hint" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qq.id,
    qq.question_text,
    qq.math_expression,
    qq.math_tolerance,
    qq.math_hint
  FROM quiz_questions qq
  WHERE qq.id = question_id
  AND qq.question_type = 'math_expression';
END;
$$;


ALTER FUNCTION "public"."get_math_question_details"("question_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_orphaned_quiz_answers"("input_quiz_id" "uuid") RETURNS TABLE("attempt_id" "uuid", "question_id_in_answer" "uuid", "question_text" "text", "question_type" "text", "selected_options" "jsonb", "attempt_created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sqa.id as attempt_id,
    answer.key::uuid as question_id_in_answer,
    COALESCE(sqq.question_text, 'Question not found') as question_text,
    COALESCE(sqq.question_type, 'unknown') as question_type,
    answer.value->'selectedOptions' as selected_options,
    sqa.created_at as attempt_created_at
  FROM public.standalone_quiz_attempts sqa,
       jsonb_each(sqa.answers) as answer
  LEFT JOIN public.standalone_quiz_questions sqq ON sqq.id = answer.key::uuid
  WHERE sqa.quiz_id = input_quiz_id
    AND sqq.id IS NULL  -- This means the question doesn't exist anymore
  ORDER BY sqa.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_orphaned_quiz_answers"("input_quiz_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_platform_stats_data"() RETURNS TABLE("category_name" "text", "value" integer, "color_code" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH user_distribution AS (
    SELECT 
      'Students' as category,
      COUNT(*) as count
    FROM profiles
    WHERE role = 'student'
  ),
  teacher_distribution AS (
    SELECT 
      'Teachers' as category,
      COUNT(*) as count
    FROM profiles
    WHERE role = 'teacher'
  ),
  admin_distribution AS (
    SELECT 
      'Admins' as category,
      COUNT(*) as count
    FROM profiles
    WHERE role = 'admin'
  ),
  course_distribution AS (
    SELECT 
      'Published Courses' as category,
      COUNT(*) as count
    FROM courses
    WHERE status = 'Published'
  ),
  all_distributions AS (
    SELECT * FROM user_distribution
    UNION ALL
    SELECT * FROM teacher_distribution
    UNION ALL
    SELECT * FROM admin_distribution
    UNION ALL
    SELECT * FROM course_distribution
  )
  SELECT 
    ad.category as category_name,
    ad.count::INTEGER as value,
    CASE ad.category
      WHEN 'Students' THEN '#3B82F6'
      WHEN 'Teachers' THEN '#10B981'
      WHEN 'Admins' THEN '#F59E0B'
      WHEN 'Published Courses' THEN '#8B5CF6'
      ELSE '#6B7280'
    END as color_code
  FROM all_distributions ad
  WHERE ad.count > 0
  ORDER BY ad.count DESC;
END;
$$;


ALTER FUNCTION "public"."get_platform_stats_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_question_performance_analytics"("input_quiz_id" "uuid") RETURNS TABLE("question_id" "uuid", "question_text" "text", "question_type" "text", "position" integer, "total_attempts" bigint, "correct_attempts" bigint, "accuracy_rate" numeric, "average_time_seconds" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sqq.id,
    sqq.question_text,
    sqq.question_type,
    sqq.position,
    COUNT(sqa.id) as total_attempts,
    COUNT(*) FILTER (WHERE 
      CASE 
        WHEN sqq.question_type = 'single_choice' THEN
          -- Check if the answer exists and is correct
          EXISTS (
            SELECT 1 FROM jsonb_each(sqa.answers) as answer
            WHERE answer.key = sqq.id::text
              AND jsonb_array_length(answer.value->'selectedOptions') = 1
              AND (answer.value->'selectedOptions'->0)::text = (
                SELECT ('"' || sqo.id::text || '"') FROM public.standalone_question_options sqo
                WHERE sqo.question_id = sqq.id AND sqo.is_correct = true
                LIMIT 1
              )
          )
        WHEN sqq.question_type = 'multiple_choice' THEN
          -- Check if all correct options are selected and no incorrect ones
          EXISTS (
            SELECT 1 FROM jsonb_each(sqa.answers) as answer
            WHERE answer.key = sqq.id::text
              AND (
                SELECT COUNT(*) FROM jsonb_array_elements_text(answer.value->'selectedOptions') as selected
                JOIN public.standalone_question_options sqo ON sqo.id::text = selected
                WHERE sqo.question_id = sqq.id AND sqo.is_correct = true
              ) = (
                SELECT COUNT(*) FROM public.standalone_question_options sqo
                WHERE sqo.question_id = sqq.id AND sqo.is_correct = true
              )
              AND (
                SELECT COUNT(*) FROM jsonb_array_elements_text(answer.value->'selectedOptions') as selected
                JOIN public.standalone_question_options sqo ON sqo.id::text = selected
                WHERE sqo.question_id = sqq.id AND sqo.is_correct = false
              ) = 0
          )
        WHEN sqq.question_type = 'text_answer' THEN
          -- For text answers, we'll consider them correct if they exist (exact matching would be complex)
          EXISTS (
            SELECT 1 FROM jsonb_each(sqa.answers) as answer
            WHERE answer.key = sqq.id::text
              AND answer.value->>'textAnswer' IS NOT NULL
              AND answer.value->>'textAnswer' != ''
          )
        WHEN sqq.question_type = 'math_expression' THEN
          -- For math expressions, we'll consider them correct if they exist
          EXISTS (
            SELECT 1 FROM jsonb_each(sqa.answers) as answer
            WHERE answer.key = sqq.id::text
              AND answer.value->>'mathExpression' IS NOT NULL
              AND answer.value->>'mathExpression' != ''
          )
        ELSE false
      END
    ) as correct_attempts,
    ROUND(
      (COUNT(*) FILTER (WHERE 
        CASE 
          WHEN sqq.question_type = 'single_choice' THEN
            EXISTS (
              SELECT 1 FROM jsonb_each(sqa.answers) as answer
              WHERE answer.key = sqq.id::text
                AND jsonb_array_length(answer.value->'selectedOptions') = 1
                AND (answer.value->'selectedOptions'->0)::text = (
                  SELECT ('"' || sqo.id::text || '"') FROM public.standalone_question_options sqo
                  WHERE sqo.question_id = sqq.id AND sqo.is_correct = true
                  LIMIT 1
                )
            )
          WHEN sqq.question_type = 'multiple_choice' THEN
            EXISTS (
              SELECT 1 FROM jsonb_each(sqa.answers) as answer
              WHERE answer.key = sqq.id::text
                AND (
                  SELECT COUNT(*) FROM jsonb_array_elements_text(answer.value->'selectedOptions') as selected
                  JOIN public.standalone_question_options sqo ON sqo.id::text = selected
                  WHERE sqo.question_id = sqq.id AND sqo.is_correct = true
                ) = (
                  SELECT COUNT(*) FROM public.standalone_question_options sqo
                  WHERE sqo.question_id = sqq.id AND sqo.is_correct = true
                )
                AND (
                  SELECT COUNT(*) FROM jsonb_array_elements_text(answer.value->'selectedOptions') as selected
                  JOIN public.standalone_question_options sqo ON sqo.id::text = selected
                  WHERE sqo.question_id = sqq.id AND sqo.is_correct = false
                ) = 0
            )
          WHEN sqq.question_type = 'text_answer' THEN
            EXISTS (
              SELECT 1 FROM jsonb_each(sqa.answers) as answer
              WHERE answer.key = sqq.id::text
                AND answer.value->>'textAnswer' IS NOT NULL
                AND answer.value->>'textAnswer' != ''
            )
          WHEN sqq.question_type = 'math_expression' THEN
            EXISTS (
              SELECT 1 FROM jsonb_each(sqa.answers) as answer
              WHERE answer.key = sqq.id::text
                AND answer.value->>'mathExpression' IS NOT NULL
                AND answer.value->>'mathExpression' != ''
            )
          ELSE false
        END
      )::numeric / NULLIF(COUNT(sqa.id), 0)::numeric) * 100, 2
    ) as accuracy_rate,
    ROUND(AVG(
      CASE 
        WHEN sqa.answers ? sqq.id::text THEN
          COALESCE((sqa.answers->sqq.id::text->>'time_spent_seconds')::numeric, 0)
        ELSE 0
      END
    ), 2) as average_time_seconds
  FROM public.standalone_quiz_questions sqq
  LEFT JOIN public.standalone_quiz_attempts sqa ON sqa.quiz_id = input_quiz_id
  WHERE sqq.quiz_id = input_quiz_id
  GROUP BY sqq.id, sqq.question_text, sqq.question_type, sqq.position
  ORDER BY sqq.position;
END;
$$;


ALTER FUNCTION "public"."get_question_performance_analytics"("input_quiz_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_question_performance_analytics"("input_quiz_id" "uuid") IS 'Gets performance analytics for each question in a quiz - handles missing question IDs gracefully';



CREATE OR REPLACE FUNCTION "public"."get_quiz_attempts"("input_quiz_id" "uuid") RETURNS TABLE("id" "uuid", "quiz_id" "uuid", "user_id" "uuid", "attempt_number" integer, "answers" "jsonb", "results" "jsonb", "score" numeric, "time_taken_minutes" integer, "submitted_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "user_name" "text", "user_email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sqa.id,
    sqa.quiz_id,
    sqa.user_id,
    sqa.attempt_number,
    sqa.answers,
    sqa.results,
    sqa.score,
    sqa.time_taken_minutes,
    sqa.submitted_at,
    sqa.created_at,
    sqa.updated_at,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unknown User') as user_name,
    COALESCE(p.email, 'No email') as user_email
  FROM public.standalone_quiz_attempts sqa
  LEFT JOIN public.profiles p ON p.id = sqa.user_id
  WHERE sqa.quiz_id = input_quiz_id
  ORDER BY sqa.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_quiz_attempts"("input_quiz_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_quiz_attempts"("input_quiz_id" "uuid") IS 'Gets all attempts for a specific quiz with user information';



CREATE OR REPLACE FUNCTION "public"."get_quiz_leaderboard"("input_quiz_id" "uuid", "limit_count" integer DEFAULT 10) RETURNS TABLE("user_id" "uuid", "user_name" "text", "user_email" "text", "best_score" numeric, "best_attempt_id" "uuid", "total_attempts" bigint, "first_attempt_at" timestamp with time zone, "last_attempt_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH user_best_scores AS (
    SELECT 
      sqa.user_id,
      MAX(sqa.score) as best_score,
      (SELECT id FROM public.standalone_quiz_attempts sqa2 
       WHERE sqa2.user_id = sqa.user_id AND sqa2.quiz_id = sqa.quiz_id 
       ORDER BY sqa2.score DESC, sqa2.submitted_at ASC LIMIT 1) as best_attempt_id,
      COUNT(*) as total_attempts,
      MIN(sqa.submitted_at) as first_attempt_at,
      MAX(sqa.submitted_at) as last_attempt_at
    FROM public.standalone_quiz_attempts sqa
    WHERE sqa.quiz_id = input_quiz_id
    GROUP BY sqa.user_id
  )
  SELECT 
    ubs.user_id,
    p.first_name || ' ' || p.last_name as user_name,
    p.email as user_email,
    ubs.best_score,
    ubs.best_attempt_id,
    ubs.total_attempts,
    ubs.first_attempt_at,
    ubs.last_attempt_at
  FROM user_best_scores ubs
  JOIN public.profiles p ON p.id = ubs.user_id
  ORDER BY ubs.best_score DESC, ubs.first_attempt_at ASC
  LIMIT limit_count;
END;
$$;


ALTER FUNCTION "public"."get_quiz_leaderboard"("input_quiz_id" "uuid", "limit_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_quiz_leaderboard"("input_quiz_id" "uuid", "limit_count" integer) IS 'Gets leaderboard for a quiz';



CREATE OR REPLACE FUNCTION "public"."get_quiz_performance_analytics"("input_quiz_id" "uuid") RETURNS TABLE("metric_name" "text", "metric_value" numeric, "metric_description" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  quiz_stats RECORD;
BEGIN
  -- Get basic statistics
  SELECT 
    COUNT(*) as total_attempts,
    COUNT(DISTINCT sqa.user_id) as unique_users,
    ROUND(AVG(sqa.score), 2) as avg_score,
    MIN(sqa.score) as min_score,
    MAX(sqa.score) as max_score,
    ROUND(STDDEV(sqa.score), 2) as score_stddev,
    COUNT(*) FILTER (WHERE sqa.score >= sq.passing_score) as passed_attempts,
    COUNT(*) FILTER (WHERE sqa.submitted_at IS NOT NULL) as completed_attempts,
    ROUND(AVG(EXTRACT(EPOCH FROM (sqa.submitted_at - sqa.created_at)) / 60), 2) as avg_time_taken
  INTO quiz_stats
  FROM public.standalone_quiz_attempts sqa
  JOIN public.standalone_quizzes sq ON sq.id = sqa.quiz_id
  WHERE sqa.quiz_id = input_quiz_id;

  -- Return metrics with NULLIF to prevent division by zero
  RETURN QUERY
  SELECT 'total_attempts'::text, COALESCE(quiz_stats.total_attempts, 0), 'Total number of quiz attempts'::text
  UNION ALL
  SELECT 'unique_users'::text, COALESCE(quiz_stats.unique_users, 0), 'Number of unique users who attempted the quiz'::text
  UNION ALL
  SELECT 'average_score'::text, COALESCE(quiz_stats.avg_score, 0), 'Average score across all attempts'::text
  UNION ALL
  SELECT 'min_score'::text, COALESCE(quiz_stats.min_score, 0), 'Lowest score achieved'::text
  UNION ALL
  SELECT 'max_score'::text, COALESCE(quiz_stats.max_score, 0), 'Highest score achieved'::text
  UNION ALL
  SELECT 'score_stddev'::text, COALESCE(quiz_stats.score_stddev, 0), 'Standard deviation of scores'::text
  UNION ALL
  SELECT 'pass_rate'::text, ROUND((COALESCE(quiz_stats.passed_attempts, 0)::numeric / NULLIF(COALESCE(quiz_stats.total_attempts, 0), 0)::numeric) * 100, 2), 'Percentage of attempts that passed'::text
  UNION ALL
  SELECT 'completion_rate'::text, ROUND((COALESCE(quiz_stats.completed_attempts, 0)::numeric / NULLIF(COALESCE(quiz_stats.total_attempts, 0), 0)::numeric) * 100, 2), 'Percentage of attempts that were completed'::text
  UNION ALL
  SELECT 'avg_time_taken'::text, COALESCE(quiz_stats.avg_time_taken, 0), 'Average time taken to complete the quiz (minutes)'::text;
END;
$$;


ALTER FUNCTION "public"."get_quiz_performance_analytics"("input_quiz_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_quiz_performance_data"("teacher_id" "uuid") RETURNS TABLE("quiz_title" "text", "avg_score" integer, "attempts_count" integer, "pass_rate" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH teacher_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = teacher_id AND cm.role = 'teacher'
  ),
  teacher_content_items AS (
    SELECT clc.id, clc.title, clc.content_type
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    JOIN teacher_courses tc ON cs.course_id = tc.course_id
    WHERE clc.content_type IN ('quiz', 'assignment')
  ),
  quiz_stats AS (
    SELECT
      tci.title as quiz_title,
      CASE
        WHEN tci.content_type = 'quiz' THEN
          COALESCE((SELECT AVG(qs.score) FROM public.quiz_submissions qs WHERE qs.lesson_content_id = tci.id), 75)
        WHEN tci.content_type = 'assignment' THEN
          COALESCE((SELECT AVG(as2.grade) FROM public.assignment_submissions as2 WHERE as2.assignment_id = tci.id AND as2.status = 'graded'), 80)
        ELSE 75
      END as avg_score,
      CASE
        WHEN tci.content_type = 'quiz' THEN
          COALESCE((SELECT COUNT(*) FROM public.quiz_submissions qs WHERE qs.lesson_content_id = tci.id), 5)
        WHEN tci.content_type = 'assignment' THEN
          COALESCE((SELECT COUNT(*) FROM public.assignment_submissions as2 WHERE as2.assignment_id = tci.id), 3)
        ELSE 5
      END as attempts_count,
      CASE
        WHEN tci.content_type = 'quiz' THEN
          COALESCE((SELECT
            CASE
              WHEN COUNT(*) > 0 THEN ROUND((COUNT(CASE WHEN qs.score >= 70 THEN 1 END)::DECIMAL / COUNT(*)) * 100)
              ELSE 75
            END
           FROM public.quiz_submissions qs WHERE qs.lesson_content_id = tci.id), 75)
        WHEN tci.content_type = 'assignment' THEN
          COALESCE((SELECT
            CASE
              WHEN COUNT(*) > 0 THEN ROUND((COUNT(CASE WHEN as2.grade >= 70 THEN 1 END)::DECIMAL / COUNT(*)) * 100)
              ELSE 80
            END
           FROM public.assignment_submissions as2 WHERE as2.assignment_id = tci.id AND as2.status = 'graded'), 80)
        ELSE 75
      END as pass_rate
    FROM teacher_content_items tci
  )
  SELECT
    qs.quiz_title,
    qs.avg_score::INTEGER as avg_score,
    GREATEST(qs.attempts_count, 1)::INTEGER as attempts_count,
    qs.pass_rate::INTEGER as pass_rate
  FROM quiz_stats qs
  WHERE qs.attempts_count > 0
  UNION ALL
  SELECT
    'No Quizzes Available'::TEXT as quiz_title, 0::INTEGER, 1::INTEGER, 0::INTEGER
  WHERE NOT EXISTS (SELECT 1 FROM quiz_stats qs WHERE qs.attempts_count > 0)
  ORDER BY attempts_count DESC
  LIMIT 5;
END;
$$;


ALTER FUNCTION "public"."get_quiz_performance_data"("teacher_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_quiz_performance_data_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid" DEFAULT NULL::"uuid", "filter_region_id" "uuid" DEFAULT NULL::"uuid", "filter_city_id" "uuid" DEFAULT NULL::"uuid", "filter_project_id" "uuid" DEFAULT NULL::"uuid", "filter_board_id" "uuid" DEFAULT NULL::"uuid", "filter_school_id" "uuid" DEFAULT NULL::"uuid", "filter_grade" "text" DEFAULT NULL::"text", "filter_class_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("quiz_title" "text", "avg_score" integer, "attempts_count" integer, "pass_rate" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH teacher_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
  ),
  filtered_students AS (
    SELECT DISTINCT p.id as user_id
    FROM public.profiles p
    LEFT JOIN public.class_students cs ON p.id = cs.student_id
    LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id
    LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON (cl.board_id = b.id OR s.board_id = b.id)
    LEFT JOIN public.projects pr ON (b.project_id = pr.id OR s.project_id = pr.id)
    LEFT JOIN public.cities c ON (pr.city_id = c.id OR b.city_id = c.id OR s.city_id = c.id)
    LEFT JOIN public.regions r ON (c.region_id = r.id OR pr.region_id = r.id OR b.region_id = r.id OR s.region_id = r.id)
    LEFT JOIN public.countries co ON (r.country_id = co.id OR c.country_id = co.id OR pr.country_id = co.id OR b.country_id = co.id OR s.country_id = co.id)
    WHERE p.role = 'student'
    AND (filter_country_id IS NULL OR co.id = filter_country_id)
    AND (filter_region_id IS NULL OR r.id = filter_region_id)
    AND (filter_city_id IS NULL OR c.id = filter_city_id)
    AND (filter_project_id IS NULL OR pr.id = filter_project_id)
    AND (filter_board_id IS NULL OR b.id = filter_board_id)
    AND (filter_school_id IS NULL OR s.id = filter_school_id)
    AND (filter_grade IS NULL OR cl.grade = filter_grade)
    AND (filter_class_id IS NULL OR cl.id = filter_class_id)
  ),
  teacher_content_items AS (
    SELECT clc.id, clc.title, clc.content_type
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    JOIN teacher_courses tc ON cs.course_id = tc.course_id
    WHERE clc.content_type IN ('quiz', 'assignment')
  ),
  quiz_stats AS (
    SELECT
      tci.title as quiz_title,
      CASE
        WHEN tci.content_type = 'quiz' THEN
          COALESCE((SELECT AVG(qs.score) FROM public.quiz_submissions qs 
                    WHERE qs.lesson_content_id = tci.id 
                    AND qs.user_id IN (SELECT user_id FROM filtered_students)), 75)
        WHEN tci.content_type = 'assignment' THEN
          COALESCE((SELECT AVG(as2.grade) FROM public.assignment_submissions as2 
                    WHERE as2.assignment_id = tci.id 
                    AND as2.status = 'graded'
                    AND as2.user_id IN (SELECT user_id FROM filtered_students)), 80)
        ELSE 75
      END as avg_score,
      CASE
        WHEN tci.content_type = 'quiz' THEN
          COALESCE((SELECT COUNT(*) FROM public.quiz_submissions qs 
                    WHERE qs.lesson_content_id = tci.id 
                    AND qs.user_id IN (SELECT user_id FROM filtered_students)), 5)
        WHEN tci.content_type = 'assignment' THEN
          COALESCE((SELECT COUNT(*) FROM public.assignment_submissions as2 
                    WHERE as2.assignment_id = tci.id 
                    AND as2.user_id IN (SELECT user_id FROM filtered_students)), 3)
        ELSE 5
      END as attempts_count,
      CASE
        WHEN tci.content_type = 'quiz' THEN
          COALESCE((SELECT
            CASE
              WHEN COUNT(*) > 0 THEN ROUND((COUNT(CASE WHEN qs.score >= 70 THEN 1 END)::DECIMAL / COUNT(*)) * 100)
              ELSE 75
            END
           FROM public.quiz_submissions qs 
           WHERE qs.lesson_content_id = tci.id 
           AND qs.user_id IN (SELECT user_id FROM filtered_students)), 75)
        WHEN tci.content_type = 'assignment' THEN
          COALESCE((SELECT
            CASE
              WHEN COUNT(*) > 0 THEN ROUND((COUNT(CASE WHEN as2.grade >= 70 THEN 1 END)::DECIMAL / COUNT(*)) * 100)
              ELSE 80
            END
           FROM public.assignment_submissions as2 
           WHERE as2.assignment_id = tci.id 
           AND as2.status = 'graded'
           AND as2.user_id IN (SELECT user_id FROM filtered_students)), 80)
        ELSE 75
      END as pass_rate
    FROM teacher_content_items tci
  )
  SELECT
    qs.quiz_title,
    qs.avg_score::INTEGER as avg_score,
    GREATEST(qs.attempts_count, 1)::INTEGER as attempts_count,
    qs.pass_rate::INTEGER as pass_rate
  FROM quiz_stats qs
  WHERE qs.attempts_count > 0
  ORDER BY quiz_title;
END;
$$;


ALTER FUNCTION "public"."get_quiz_performance_data_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_quiz_performance_data_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") IS 'Get quiz performance data with hierarchical and grade filtering';



CREATE OR REPLACE FUNCTION "public"."get_quiz_statistics"("input_quiz_id" "uuid") RETURNS TABLE("total_attempts" bigint, "unique_users" bigint, "average_score" numeric, "pass_rate" numeric, "completion_rate" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_attempts,
    COUNT(DISTINCT user_id) as unique_users,
    ROUND(AVG(score), 2) as average_score,
    ROUND(
      (COUNT(*) FILTER (WHERE score >= sq.passing_score)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 
      2
    ) as pass_rate,
    ROUND(
      (COUNT(*) FILTER (WHERE submitted_at IS NOT NULL)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 
      2
    ) as completion_rate
  FROM public.standalone_quiz_attempts sqa
  JOIN public.standalone_quizzes sq ON sq.id = sqa.quiz_id
  WHERE sqa.quiz_id = input_quiz_id;
END;
$$;


ALTER FUNCTION "public"."get_quiz_statistics"("input_quiz_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_quiz_submissions_for_assessment"("p_lesson_content_id" "uuid") RETURNS TABLE("submission_id" "uuid", "user_id" "uuid", "student_name" "text", "student_email" "text", "attempt_number" integer, "submitted_at" timestamp with time zone, "score" numeric, "manual_grading_required" boolean, "manual_grading_completed" boolean, "manual_grading_score" numeric, "is_latest_attempt" boolean, "retry_reason" "text", "answers" "jsonb", "results" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qs.id as submission_id,
        qs.user_id,
        COALESCE(p.first_name || ' ' || p.last_name, p.email) as student_name,
        p.email as student_email,
        qs.attempt_number,
        qs.submitted_at,
        qs.score,
        qs.manual_grading_required,
        qs.manual_grading_completed,
        qs.manual_grading_score,
        qs.is_latest_attempt,
        qs.retry_reason,
        qs.answers,
        qs.results
    FROM quiz_submissions qs
    JOIN profiles p ON qs.user_id = p.id
    WHERE qs.lesson_content_id = p_lesson_content_id
    ORDER BY p.email, qs.attempt_number DESC;
END;
$$;


ALTER FUNCTION "public"."get_quiz_submissions_for_assessment"("p_lesson_content_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_quiz_with_members"("input_quiz_id" "uuid") RETURNS TABLE("id" "uuid", "title" "text", "description" "text", "instructions" "text", "time_limit_minutes" integer, "max_attempts" integer, "passing_score" numeric, "shuffle_questions" boolean, "shuffle_options" boolean, "show_correct_answers" boolean, "show_results_immediately" boolean, "allow_retake" boolean, "retry_settings" "jsonb", "status" "text", "tags" "text"[], "estimated_duration_minutes" integer, "author_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "published_at" timestamp with time zone, "members" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sq.id,
    sq.title,
    sq.description,
    sq.instructions,
    sq.time_limit_minutes,
    sq.max_attempts,
    sq.passing_score,
    sq.shuffle_questions,
    sq.shuffle_options,
    sq.show_correct_answers,
    sq.show_results_immediately,
    sq.allow_retake,
    sq.retry_settings,
    sq.status,
    sq.tags,
    sq.estimated_duration_minutes,
    sq.author_id,
    sq.created_at,
    sq.updated_at,
    sq.published_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', qm.id,
            'user_id', qm.user_id,
            'role', qm.role,
            'created_at', qm.created_at,
            'profile', jsonb_build_object(
              'id', p.id,
              'first_name', p.first_name,
              'last_name', p.last_name,
              'email', p.email,
              'avatar_url', p.avatar_url
            )
          )
        )
        FROM public.quiz_members qm
        JOIN public.profiles p ON p.id = qm.user_id
        WHERE qm.quiz_id = sq.id
      ),
      '[]'::jsonb
    ) as members
  FROM public.standalone_quizzes sq
  WHERE sq.id = input_quiz_id;
END;
$$;


ALTER FUNCTION "public"."get_quiz_with_members"("input_quiz_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_quiz_with_members"("input_quiz_id" "uuid") IS 'Retrieves a quiz with its members';



CREATE OR REPLACE FUNCTION "public"."get_quizzes_by_author"("author_id" "uuid", "include_drafts" boolean DEFAULT true) RETURNS TABLE("id" "uuid", "title" "text", "description" "text", "status" "text", "visibility" "text", "difficulty_level" "text", "estimated_duration_minutes" integer, "total_questions" bigint, "total_attempts" bigint, "average_score" numeric, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "published_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sq.id,
    sq.title,
    sq.description,
    sq.status,
    sq.visibility,
    sq.difficulty_level,
    sq.estimated_duration_minutes,
    COUNT(sqq.id) as total_questions,
    COUNT(sqa.id) as total_attempts,
    ROUND(AVG(sqa.score), 2) as average_score,
    sq.created_at,
    sq.updated_at,
    sq.published_at
  FROM public.standalone_quizzes sq
  LEFT JOIN public.standalone_quiz_questions sqq ON sq.id = sqq.quiz_id
  LEFT JOIN public.standalone_quiz_attempts sqa ON sq.id = sqa.quiz_id
  WHERE sq.author_id = get_quizzes_by_author.author_id
    AND (include_drafts = true OR sq.status != 'draft')
  GROUP BY sq.id, sq.title, sq.description, sq.status, sq.visibility, 
           sq.difficulty_level, sq.estimated_duration_minutes, sq.created_at, sq.updated_at, sq.published_at
  ORDER BY sq.updated_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_quizzes_by_author"("author_id" "uuid", "include_drafts" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_quizzes_by_author"("author_id" "uuid", "include_drafts" boolean) IS 'Gets all quizzes created by an author';



CREATE OR REPLACE FUNCTION "public"."get_recent_access_logs"("limit_count" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "user_email" "text", "action" character varying, "ip_address" "inet", "location" "text", "status" character varying, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.user_email,
        al.action,
        al.ip_address,
        al.location,
        al.status,
        al.created_at
    FROM access_logs al
    ORDER BY al.created_at DESC
    LIMIT limit_count;
END;
$$;


ALTER FUNCTION "public"."get_recent_access_logs"("limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recent_access_logs"("limit_count" integer DEFAULT 50, "offset_count" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "user_email" "text", "action" character varying, "ip_address" "inet", "location" "text", "status" character varying, "metadata" "jsonb", "created_at" timestamp with time zone)
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
      -- If we can't access profiles, assume admin for now
      current_user_role := 'admin';
  END;
  
  -- Only allow admins to access this function
  IF current_user_role != 'admin' THEN
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


ALTER FUNCTION "public"."get_recent_access_logs"("limit_count" integer, "offset_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_recent_access_logs"("limit_count" integer, "offset_count" integer) IS 'Get recent access logs with pagination. Admin role required.';



CREATE OR REPLACE FUNCTION "public"."get_schools_by_location"("p_country_code" character varying DEFAULT NULL::character varying, "p_region_code" character varying DEFAULT NULL::character varying, "p_city_code" character varying DEFAULT NULL::character varying) RETURNS TABLE("school_id" "uuid", "school_name" character varying, "school_code" character varying, "school_type" character varying, "board_name" character varying, "project_name" character varying, "city_name" character varying, "region_name" character varying, "country_name" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.code,
        s.school_type,
        b.name,
        p.name,
        c.name,
        r.name,
        co.name
    FROM schools s
    JOIN boards b ON s.board_id = b.id
    JOIN projects p ON s.project_id = p.id
    JOIN cities c ON s.city_id = c.id
    JOIN regions r ON s.region_id = r.id
    JOIN countries co ON s.country_id = co.id
    WHERE 
        (p_country_code IS NULL OR co.code = p_country_code)
        AND (p_region_code IS NULL OR r.code = p_region_code)
        AND (p_city_code IS NULL OR c.code = p_city_code)
        AND s.status = 'active'
    ORDER BY s.name;
END;
$$;


ALTER FUNCTION "public"."get_schools_by_location"("p_country_code" character varying, "p_region_code" character varying, "p_city_code" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_security_alerts"("include_resolved" boolean DEFAULT false) RETURNS TABLE("id" "uuid", "alert_type" character varying, "message" "text", "severity" character varying, "is_resolved" boolean, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.id,
        sa.alert_type,
        sa.message,
        sa.severity,
        sa.is_resolved,
        sa.created_at
    FROM security_alerts sa
    WHERE include_resolved OR NOT sa.is_resolved
    ORDER BY sa.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_security_alerts"("include_resolved" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_security_alerts"("include_resolved" boolean DEFAULT false, "limit_count" integer DEFAULT 50, "offset_count" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "alert_type" character varying, "message" "text", "severity" character varying, "is_resolved" boolean, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.id,
        sa.alert_type,
        sa.message,
        sa.severity,
        sa.is_resolved,
        sa.created_at
    FROM security_alerts sa
    WHERE include_resolved OR NOT sa.is_resolved
    ORDER BY sa.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;


ALTER FUNCTION "public"."get_security_alerts"("include_resolved" boolean, "limit_count" integer, "offset_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_security_settings"() RETURNS TABLE("setting_key" character varying, "setting_value" "text", "setting_type" character varying, "description" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.setting_key,
        ss.setting_value,
        ss.setting_type,
        ss.description
    FROM security_settings ss
    ORDER BY ss.setting_key;
END;
$$;


ALTER FUNCTION "public"."get_security_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_standalone_quiz_attempts_requiring_grading"("input_teacher_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("attempt_id" "uuid", "quiz_id" "uuid", "quiz_title" "text", "student_id" "uuid", "student_name" "text", "student_email" "text", "attempt_number" integer, "submitted_at" timestamp with time zone, "total_questions" bigint, "text_answer_questions" bigint, "auto_graded_score" numeric, "pending_grades" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sqa.id as attempt_id,
    sqa.quiz_id,
    sq.title as quiz_title,
    sqa.user_id as student_id,
    p.first_name || ' ' || p.last_name as student_name,
    p.email as student_email,
    sqa.attempt_number,
    sqa.submitted_at,
    COUNT(sqq.id) as total_questions,
    COUNT(CASE WHEN sqq.question_type = 'text_answer' THEN 1 END) as text_answer_questions,
    COALESCE(SUM(
      CASE 
        WHEN sqq.question_type != 'text_answer' 
        AND (sqa.results->>sqq.id::text)::jsonb->>'is_correct' = 'true'
        THEN sqq.points 
        ELSE 0 
      END
    ), 0) as auto_graded_score,
    COUNT(CASE WHEN sqq.question_type = 'text_answer' THEN 1 END) - 
    COUNT(sqtag.id) as pending_grades
  FROM standalone_quiz_attempts sqa
  JOIN standalone_quizzes sq ON sq.id = sqa.quiz_id
  JOIN profiles p ON p.id = sqa.user_id
  JOIN standalone_quiz_questions sqq ON sqq.quiz_id = sqa.quiz_id
  LEFT JOIN standalone_quiz_text_answer_grades sqtag ON sqtag.attempt_id = sqa.id AND sqtag.question_id = sqq.id
  WHERE sqa.manual_grading_required = TRUE 
  AND sqa.manual_grading_completed = FALSE
  AND (input_teacher_id IS NULL OR sq.author_id = input_teacher_id)  -- Fixed: qualified with input_teacher_id
  GROUP BY sqa.id, sqa.quiz_id, sq.title, sqa.user_id, p.first_name, p.last_name, p.email, sqa.attempt_number, sqa.submitted_at
  ORDER BY sqa.submitted_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_standalone_quiz_attempts_requiring_grading"("input_teacher_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_standalone_quiz_text_answers_for_grading"("input_attempt_id" "uuid") RETURNS TABLE("question_id" "uuid", "question_text" "text", "question_position" integer, "question_points" numeric, "student_answer" "text", "current_grade" numeric, "current_feedback" "text", "graded_by" "text", "graded_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sqq.id as question_id,
    sqq.question_text,
    sqq.position as question_position,
    sqq.points as question_points,
    (sqa.answers->>sqq.id::text)::jsonb->>'textAnswer' as student_answer,
    sqtag.grade as current_grade,
    sqtag.feedback as current_feedback,
    p.first_name || ' ' || p.last_name as graded_by,
    sqtag.graded_at
  FROM standalone_quiz_questions sqq
  JOIN standalone_quiz_attempts sqa ON sqa.id = input_attempt_id
  LEFT JOIN standalone_quiz_text_answer_grades sqtag ON sqtag.question_id = sqq.id AND sqtag.attempt_id = input_attempt_id
  LEFT JOIN profiles p ON p.id = sqtag.graded_by
  WHERE sqq.quiz_id = (SELECT quiz_id FROM standalone_quiz_attempts WHERE id = input_attempt_id)
    AND sqq.question_type = 'text_answer'
  ORDER BY sqq.position ASC;
END;
$$;


ALTER FUNCTION "public"."get_standalone_quiz_text_answers_for_grading"("input_attempt_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_standalone_quiz_with_questions"("input_quiz_id" "uuid") RETURNS TABLE("id" "uuid", "title" "text", "description" "text", "instructions" "text", "time_limit_minutes" integer, "max_attempts" integer, "passing_score" numeric, "shuffle_questions" boolean, "shuffle_options" boolean, "show_correct_answers" boolean, "show_results_immediately" boolean, "allow_retake" boolean, "retry_settings" "jsonb", "status" "text", "visibility" "text", "tags" "text"[], "difficulty_level" "text", "estimated_duration_minutes" integer, "author_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "published_at" timestamp with time zone, "questions" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  quiz_record RECORD;
  questions_json jsonb;
BEGIN
  -- Get the quiz record
  SELECT * INTO quiz_record
  FROM public.standalone_quizzes sq
  WHERE sq.id = input_quiz_id;
  
  -- If quiz not found, return NULL values instead of empty result
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      NULL::uuid as id,
      NULL::text as title,
      NULL::text as description,
      NULL::text as instructions,
      NULL::integer as time_limit_minutes,
      NULL::integer as max_attempts,
      NULL::numeric(5,2) as passing_score,
      NULL::boolean as shuffle_questions,
      NULL::boolean as shuffle_options,
      NULL::boolean as show_correct_answers,
      NULL::boolean as show_results_immediately,
      NULL::boolean as allow_retake,
      NULL::jsonb as retry_settings,
      NULL::text as status,
      NULL::text as visibility,
      NULL::text[] as tags,
      NULL::text as difficulty_level,
      NULL::integer as estimated_duration_minutes,
      NULL::uuid as author_id,
      NULL::timestamp with time zone as created_at,
      NULL::timestamp with time zone as updated_at,
      NULL::timestamp with time zone as published_at,
      '[]'::jsonb as questions;
    RETURN;
  END IF;
  
  -- Get questions as JSON array
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', q.id,
        'quiz_id', q.quiz_id,
        'question_text', q.question_text,
        'question_type', q.question_type,
        'position', q.position,
        'points', q.points::numeric,
        'explanation', q.explanation,
        'math_expression', q.math_expression,
        'math_tolerance', q.math_tolerance::numeric,
        'math_hint', q.math_hint,
        'math_allow_drawing', q.math_allow_drawing,
        'is_required', q.is_required,
        'created_at', q.created_at,
        'updated_at', q.updated_at,
        'options', (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', o.id,
                'question_id', o.question_id,
                'option_text', o.option_text,
                'is_correct', o.is_correct,
                'position', o.position,
                'created_at', o.created_at
              ) ORDER BY o.position
            ),
            '[]'::json
          )
          FROM public.standalone_question_options o
          WHERE o.question_id = q.id
        )
      ) ORDER BY q.position
    ),
    '[]'::json
  ) INTO questions_json
  FROM public.standalone_quiz_questions q
  WHERE q.quiz_id = input_quiz_id;
  
  -- Return the quiz with questions
  RETURN QUERY
  SELECT 
    quiz_record.id,
    quiz_record.title,
    quiz_record.description,
    quiz_record.instructions,
    quiz_record.time_limit_minutes,
    quiz_record.max_attempts,
    quiz_record.passing_score,
    quiz_record.shuffle_questions,
    quiz_record.shuffle_options,
    quiz_record.show_correct_answers,
    quiz_record.show_results_immediately,
    quiz_record.allow_retake,
    quiz_record.retry_settings,
    quiz_record.status,
    quiz_record.visibility,
    quiz_record.tags,
    quiz_record.difficulty_level,
    quiz_record.estimated_duration_minutes,
    quiz_record.author_id,
    quiz_record.created_at,
    quiz_record.updated_at,
    quiz_record.published_at,
    questions_json;
END;
$$;


ALTER FUNCTION "public"."get_standalone_quiz_with_questions"("input_quiz_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_standalone_quiz_with_questions"("input_quiz_id" "uuid") IS 'Gets a quiz with its questions and options - fixed PGRST116 error by returning NULL values when quiz not found';



CREATE OR REPLACE FUNCTION "public"."get_student_assignments"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "title" "text", "overview" "text", "description" "text", "due_date" timestamp with time zone, "course_title" "text", "course_id" "uuid", "submission_id" "uuid", "submitted_at" timestamp with time zone, "submission_status" "text", "submission_content" "text", "submission_type" "text", "feedback" "text", "graded_at" timestamp with time zone, "grade" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    clc.id,
    clc.title,
    cl.overview,
    clc.content_path AS description,
    clc.due_date,
    c.title AS course_title,
    c.id AS course_id,
    sub.id AS submission_id,
    sub.submitted_at,
    sub.status AS submission_status,
    sub.content AS submission_content,
    sub.submission_type,
    sub.feedback,
    sub.graded_at,
    sub.grade
  FROM
    public.course_lesson_content AS clc
  JOIN
    public.course_lessons AS cl ON clc.lesson_id = cl.id
  JOIN
    public.course_sections AS cs ON cl.section_id = cs.id
  JOIN
    public.courses AS c ON cs.course_id = c.id
  JOIN
    public.course_members AS cm ON c.id = cm.course_id
  LEFT JOIN
    public.assignment_submissions AS sub ON clc.id = sub.assignment_id AND sub.user_id = p_user_id
  WHERE
    clc.content_type = 'assignment'
    AND cm.user_id = p_user_id
    AND cm.role = 'student'
    AND c.status = 'Published';
END;
$$;


ALTER FUNCTION "public"."get_student_assignments"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_courses"() RETURNS TABLE("id" "uuid", "title" "text", "subtitle" "text", "description" "text", "image_url" "text", "status" "text", "author_id" "uuid", "category_id" integer, "language_id" integer, "level_id" integer, "duration" "text", "requirements" "jsonb", "learning_outcomes" "jsonb")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT
    c.id,
    c.title,
    c.subtitle,
    c.description,
    c.image_url,
    c.status,
    c.author_id,
    c.category_id,
    c.language_id,
    c.level_id,
    c.duration,
    c.requirements,
    c.learning_outcomes
  FROM public.courses c
  JOIN public.course_members cm ON c.id = cm.course_id
  WHERE cm.user_id = auth.uid()
    AND c.status = 'Published';
$$;


ALTER FUNCTION "public"."get_student_courses"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_courses_with_progress"("student_id" "uuid") RETURNS TABLE("course_id" "uuid", "title" "text", "subtitle" "text", "image_url" "text", "progress_percentage" integer, "total_lessons" integer, "completed_lessons" integer, "last_accessed" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH student_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = student_id AND cm.role = 'student'
  ),
  content_items AS (
    SELECT
      cs.course_id,
      cl.id as lesson_id,
      clc.id as content_item_id
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
  ),
  course_progress AS (
    SELECT
      ci.course_id,
      COUNT(DISTINCT ci.lesson_id)::integer as total_lessons,
      COUNT(DISTINCT CASE WHEN ucip.status = 'completed' THEN ci.lesson_id ELSE NULL END)::integer as completed_lessons,
      MAX(ucip.updated_at) as last_accessed,
      -- Calculate percentage based on content items for accuracy
      (COUNT(DISTINCT CASE WHEN ucip.status = 'completed' THEN ci.content_item_id ELSE NULL END)::DECIMAL / NULLIF(COUNT(DISTINCT ci.content_item_id), 0) * 100)::INTEGER as progress_percentage
    FROM content_items ci
    LEFT JOIN public.user_content_item_progress ucip ON ci.content_item_id = ucip.lesson_content_id AND ucip.user_id = student_id
    GROUP BY ci.course_id
  )
  SELECT
    c.id as course_id,
    c.title,
    COALESCE(c.subtitle, '') as subtitle,
    COALESCE(c.image_url, '') as image_url,
    COALESCE(cp.progress_percentage, 0) as progress_percentage,
    COALESCE(cp.total_lessons, 0) as total_lessons,
    COALESCE(cp.completed_lessons, 0) as completed_lessons,
    cp.last_accessed
  FROM public.courses c
  JOIN student_courses sc ON c.id = sc.course_id
  LEFT JOIN course_progress cp ON c.id = cp.course_id
  WHERE c.status = 'Published'
  ORDER BY cp.last_accessed DESC NULLS LAST, c.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_student_courses_with_progress"("student_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_dashboard_stats"("student_id" "uuid") RETURNS TABLE("enrolled_courses_count" integer, "total_lessons_count" integer, "completed_lessons_count" integer, "active_discussions_count" integer, "study_streak_days" integer, "total_study_time_minutes" integer, "average_grade" numeric, "upcoming_assignments_count" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH student_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    JOIN public.courses c ON cm.course_id = c.id
    WHERE cm.user_id = student_id 
      AND cm.role = 'student' 
      AND c.status = 'Published'
  ),
  total_content_items AS (
    SELECT COUNT(clc.id) as count
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT course_id FROM student_courses)
  ),
  content_item_progress AS (
    SELECT
      ucip.completed_at
    FROM public.user_content_item_progress ucip
    WHERE ucip.user_id = student_id
      AND ucip.course_id IN (SELECT course_id FROM student_courses)
  ),
  discussion_participation AS (
    SELECT COUNT(DISTINCT d.id) as active_discussions
    FROM public.discussions d
    JOIN public.discussion_replies dr ON d.id = dr.discussion_id
    WHERE dr.user_id = student_id
  ),
  study_dates AS (
    SELECT DISTINCT DATE(ucip.updated_at) as study_date
    FROM public.user_content_item_progress ucip
    WHERE ucip.user_id = student_id 
      AND ucip.course_id IN (SELECT course_id FROM student_courses)
      AND ucip.updated_at >= NOW() - INTERVAL '30 days'
    ORDER BY study_date DESC
  ),
  study_streak AS (
    SELECT 
      CASE 
        WHEN COUNT(*) = 0 THEN 0
        ELSE (
          WITH RECURSIVE consecutive_days AS (
            SELECT study_date, 1 as streak_length
            FROM study_dates
            WHERE study_date = (
              SELECT MAX(study_date) FROM study_dates
            )
            
            UNION ALL
            
            SELECT sd.study_date, cd.streak_length + 1
            FROM study_dates sd
            JOIN consecutive_days cd ON sd.study_date = cd.study_date - INTERVAL '1 day'
          )
          SELECT MAX(streak_length)
          FROM consecutive_days
        )
      END::integer as streak_days
    FROM study_dates
    WHERE study_date = (
      SELECT MAX(study_date) FROM study_dates
    )
  ),
  assignment_grades AS (
    SELECT
        AVG(asub.grade) as avg_grade
    FROM public.assignment_submissions asub
    JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE asub.user_id = student_id
    AND cs.course_id IN (SELECT course_id FROM student_courses)
    AND asub.status = 'graded'
    AND asub.grade IS NOT NULL
  ),
  upcoming_assignments AS (
    SELECT COUNT(DISTINCT clc.id) as upcoming_count
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE clc.content_type = 'assignment'
    AND cs.course_id IN (SELECT course_id FROM student_courses)
    AND clc.due_date > NOW()
    AND clc.due_date <= NOW() + INTERVAL '7 days'
    AND NOT EXISTS (
        SELECT 1 FROM public.assignment_submissions asub
        WHERE asub.assignment_id = clc.id AND asub.user_id = student_id
    )
  )
  SELECT 
    (SELECT COUNT(*) FROM student_courses)::INTEGER as enrolled_courses_count,
    (SELECT count FROM total_content_items)::INTEGER as total_lessons_count,
    (SELECT COUNT(*) FROM content_item_progress WHERE completed_at IS NOT NULL)::INTEGER as completed_lessons_count,
    COALESCE((SELECT active_discussions FROM discussion_participation), 0)::INTEGER as active_discussions_count,
    COALESCE((SELECT streak_days FROM study_streak), 0)::INTEGER as study_streak_days,
    0::INTEGER as total_study_time_minutes, -- NOTE: user_content_item_progress does not track time spent.
    COALESCE((SELECT avg_grade FROM assignment_grades), 0)::DECIMAL as average_grade,
    (SELECT upcoming_count FROM upcoming_assignments)::INTEGER as upcoming_assignments_count;
END;
$$;


ALTER FUNCTION "public"."get_student_dashboard_stats"("student_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_engagement_trends"("teacher_id" "uuid", "time_range" "text") RETURNS TABLE("period_label" "text", "active_students" integer, "completion_rate" integer, "time_spent" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_interval INTERVAL;
    v_format TEXT;
    v_period_type TEXT;
BEGIN
    -- Determine date range and interval
    CASE time_range
        WHEN '7days' THEN
            v_start_date := NOW()::DATE - INTERVAL '6 days';
            v_end_date := NOW()::DATE;
            v_interval := '1 day';
            v_format := 'Dy';
            v_period_type := 'day';
        WHEN '30days' THEN
            v_start_date := DATE_TRUNC('week', NOW() - INTERVAL '3 weeks');
            v_end_date := NOW()::DATE;
            v_interval := '1 week';
            v_format := 'WW';
            v_period_type := 'week';
        WHEN '3months' THEN
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '2 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
        WHEN '6months' THEN
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '5 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
        WHEN '1year' THEN
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '11 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
        ELSE -- alltime
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '11 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
    END CASE;

    RETURN QUERY
    WITH time_periods AS (
        SELECT 
            CASE 
                WHEN time_range = '30days' THEN 'Week ' || TO_CHAR(period_start, v_format)
                ELSE TO_CHAR(period_start, v_format)
            END as label,
            period_start::DATE
        FROM generate_series(v_start_date, v_end_date, v_interval) AS period_start
    ),
    teacher_courses AS (
        SELECT cm.course_id
        FROM public.course_members cm
        WHERE cm.user_id = teacher_id AND cm.role = 'teacher'
    ),
    activity_data AS (
        SELECT
            date_trunc(v_period_type, ucip.updated_at)::DATE as period_start,
            COUNT(DISTINCT ucip.user_id) as active_students,
            COUNT(CASE WHEN ucip.status = 'completed' THEN 1 END) as completed_lessons,
            COUNT(ucip.id) as total_activities,
            COALESCE(SUM((ucip.progress_data->>'time_spent_seconds')::numeric), 0) as total_time_spent
        FROM public.user_content_item_progress ucip
        WHERE ucip.course_id IN (SELECT course_id FROM teacher_courses)
        AND ucip.updated_at >= v_start_date
        GROUP BY 1
    )
    SELECT
        tp.label AS period_label,
        COALESCE(ad.active_students, 0)::INTEGER,
        CASE 
            WHEN ad.total_activities > 0 THEN 
            ROUND((ad.completed_lessons::DECIMAL / ad.total_activities) * 100)::INTEGER
            ELSE 0
        END as completion_rate,
        ROUND(COALESCE(ad.total_time_spent, 0) / 60)::INTEGER as time_spent
    FROM time_periods tp
    LEFT JOIN activity_data ad ON tp.period_start = ad.period_start
    ORDER BY tp.period_start;
END;
$$;


ALTER FUNCTION "public"."get_student_engagement_trends"("teacher_id" "uuid", "time_range" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_engagement_trends_with_filters"("p_teacher_id" "uuid", "p_time_range" "text" DEFAULT '30days'::"text", "filter_country_id" "uuid" DEFAULT NULL::"uuid", "filter_region_id" "uuid" DEFAULT NULL::"uuid", "filter_city_id" "uuid" DEFAULT NULL::"uuid", "filter_project_id" "uuid" DEFAULT NULL::"uuid", "filter_board_id" "uuid" DEFAULT NULL::"uuid", "filter_school_id" "uuid" DEFAULT NULL::"uuid", "filter_grade" "text" DEFAULT NULL::"text", "filter_class_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("period_label" "text", "active_students" integer, "completion_rate" integer, "time_spent" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_interval INTERVAL;
    v_format TEXT;
    v_period_type TEXT;
BEGIN
    -- Determine date range and interval
    CASE p_time_range
        WHEN '7days' THEN
            v_start_date := NOW()::DATE - INTERVAL '6 days';
            v_end_date := NOW()::DATE;
            v_interval := '1 day';
            v_format := 'Dy';
            v_period_type := 'day';
        WHEN '30days' THEN
            v_start_date := DATE_TRUNC('week', NOW() - INTERVAL '3 weeks');
            v_end_date := NOW()::DATE;
            v_interval := '1 week';
            v_format := 'WW';
            v_period_type := 'week';
        WHEN '3months' THEN
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '2 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
        WHEN '6months' THEN
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '5 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
        WHEN '1year' THEN
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '11 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
        ELSE -- alltime
            v_start_date := DATE_TRUNC('month', NOW() - INTERVAL '11 months');
            v_end_date := NOW()::DATE;
            v_interval := '1 month';
            v_format := 'Mon';
            v_period_type := 'month';
    END CASE;

    RETURN QUERY
    WITH time_periods AS (
        SELECT 
            CASE 
                WHEN p_time_range = '30days' THEN 'Week ' || TO_CHAR(period_start, v_format)
                ELSE TO_CHAR(period_start, v_format)
            END as label,
            period_start::DATE
        FROM generate_series(v_start_date, v_end_date, v_interval) AS period_start
    ),
    teacher_courses AS (
        SELECT cm.course_id
        FROM public.course_members cm
        WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
    ),
    filtered_students AS (
        SELECT DISTINCT p.id as user_id
        FROM public.profiles p
        LEFT JOIN public.class_students cs ON p.id = cs.student_id
        LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id
        LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
        LEFT JOIN public.schools s ON cl.school_id = s.id
        LEFT JOIN public.boards b ON (cl.board_id = b.id OR s.board_id = b.id)
        LEFT JOIN public.projects pr ON (b.project_id = pr.id OR s.project_id = pr.id)
        LEFT JOIN public.cities c ON (pr.city_id = c.id OR b.city_id = c.id OR s.city_id = c.id)
        LEFT JOIN public.regions r ON (c.region_id = r.id OR pr.region_id = r.id OR b.region_id = r.id OR s.region_id = r.id)
        LEFT JOIN public.countries co ON (r.country_id = co.id OR c.country_id = co.id OR pr.country_id = co.id OR b.country_id = co.id OR s.country_id = co.id)
        WHERE p.role = 'student'
        AND (filter_country_id IS NULL OR co.id = filter_country_id)
        AND (filter_region_id IS NULL OR r.id = filter_region_id)
        AND (filter_city_id IS NULL OR c.id = filter_city_id)
        AND (filter_project_id IS NULL OR pr.id = filter_project_id)
        AND (filter_board_id IS NULL OR b.id = filter_board_id)
        AND (filter_school_id IS NULL OR s.id = filter_school_id)
        AND (filter_grade IS NULL OR cl.grade = filter_grade)
        AND (filter_class_id IS NULL OR cl.id = filter_class_id)
    ),
    activity_data AS (
        SELECT
            date_trunc(v_period_type, ucip.updated_at)::DATE as period_start,
            COUNT(DISTINCT ucip.user_id) as active_students,
            COUNT(CASE WHEN ucip.status = 'completed' THEN 1 END) as completed_lessons,
            COUNT(ucip.id) as total_activities,
            COALESCE(SUM((ucip.progress_data->>'time_spent_seconds')::numeric), 0) as total_time_spent
        FROM public.user_content_item_progress ucip
        WHERE ucip.course_id IN (SELECT course_id FROM teacher_courses)
        AND ucip.user_id IN (SELECT user_id FROM filtered_students)
        AND ucip.updated_at >= v_start_date
        GROUP BY 1
    )
    SELECT
        tp.label AS period_label,
        COALESCE(ad.active_students, 0)::INTEGER,
        CASE 
            WHEN ad.total_activities > 0 THEN 
            ROUND((ad.completed_lessons::DECIMAL / ad.total_activities) * 100)::INTEGER
            ELSE 0
        END as completion_rate,
        ROUND(COALESCE(ad.total_time_spent, 0) / 60)::INTEGER as time_spent
    FROM time_periods tp
    LEFT JOIN activity_data ad ON tp.period_start = ad.period_start
    ORDER BY tp.period_start;
END;
$$;


ALTER FUNCTION "public"."get_student_engagement_trends_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_student_engagement_trends_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") IS 'Get student engagement trends with hierarchical and grade filtering';



CREATE OR REPLACE FUNCTION "public"."get_student_progress_distribution"("p_teacher_id" "uuid") RETURNS TABLE("category_name" "text", "student_count" bigint, "color_code" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH teacher_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
  ),
  students_in_courses AS (
    SELECT DISTINCT cm.user_id, c.id as course_id
    FROM public.course_members cm
    JOIN public.courses c ON cm.course_id = c.id
    WHERE cm.course_id IN (SELECT course_id FROM teacher_courses)
      AND cm.role = 'student'
  ),
  course_content_totals AS (
    SELECT
      cs.course_id,
      COUNT(clc.id) AS total_content_items
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
    GROUP BY cs.course_id
  ),
  student_progress_by_course AS (
    SELECT
      sic.user_id,
      sic.course_id,
      cct.total_content_items,
      COUNT(ucip.id) AS completed_content_items
    FROM students_in_courses sic
    JOIN course_content_totals cct ON sic.course_id = cct.course_id
    LEFT JOIN public.user_content_item_progress ucip ON sic.user_id = ucip.user_id
      AND sic.course_id = ucip.course_id
      AND ucip.status = 'completed'
    GROUP BY sic.user_id, sic.course_id, cct.total_content_items
  ),
  student_overall_progress AS (
    SELECT
      spc.user_id,
      SUM(spc.total_content_items) AS total_items,
      SUM(spc.completed_content_items) AS completed_items
    FROM student_progress_by_course spc
    GROUP BY spc.user_id
  ),
  progress_categories AS (
    SELECT 
      sop.user_id,
      CASE 
        WHEN sop.total_items IS NULL OR sop.total_items = 0 THEN 'Not Started'
        WHEN sop.completed_items = 0 THEN 'Not Started'
        WHEN (sop.completed_items::decimal / sop.total_items) >= 0.9 THEN 'Excellent (90-100%)'
        WHEN (sop.completed_items::decimal / sop.total_items) >= 0.8 THEN 'Good (80-89%)'
        WHEN (sop.completed_items::decimal / sop.total_items) >= 0.7 THEN 'Average (70-79%)'
        ELSE 'Needs Help (<70%)'
      END AS category
    FROM student_overall_progress sop
  )
  SELECT
    pc.category,
    COUNT(pc.user_id) AS student_count,
    CASE pc.category
      WHEN 'Excellent (90-100%)' THEN '#10B981'::text
      WHEN 'Good (80-89%)' THEN '#3B82F6'::text
      WHEN 'Average (70-79%)' THEN '#F59E0B'::text
      WHEN 'Needs Help (<70%)' THEN '#EF4444'::text
      ELSE '#6B7280'::text
    END AS color_code
  FROM progress_categories pc
  GROUP BY pc.category
  ORDER BY
    CASE pc.category
      WHEN 'Excellent (90-100%)' THEN 1
      WHEN 'Good (80-89%)' THEN 2
      WHEN 'Average (70-79%)' THEN 3
      WHEN 'Needs Help (<70%)' THEN 4
      WHEN 'Not Started' THEN 5
      ELSE 6
    END;
END;
$$;


ALTER FUNCTION "public"."get_student_progress_distribution"("p_teacher_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_progress_distribution_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid" DEFAULT NULL::"uuid", "filter_region_id" "uuid" DEFAULT NULL::"uuid", "filter_city_id" "uuid" DEFAULT NULL::"uuid", "filter_project_id" "uuid" DEFAULT NULL::"uuid", "filter_board_id" "uuid" DEFAULT NULL::"uuid", "filter_school_id" "uuid" DEFAULT NULL::"uuid", "filter_grade" "text" DEFAULT NULL::"text", "filter_class_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("category_name" "text", "student_count" bigint, "color_code" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH teacher_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
  ),
  filtered_students AS (
    SELECT DISTINCT p.id as user_id
    FROM public.profiles p
    LEFT JOIN public.class_students cs ON p.id = cs.student_id
    LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id
    LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON (cl.board_id = b.id OR s.board_id = b.id)
    LEFT JOIN public.projects pr ON (b.project_id = pr.id OR s.project_id = pr.id)
    LEFT JOIN public.cities c ON (pr.city_id = c.id OR b.city_id = c.id OR s.city_id = c.id)
    LEFT JOIN public.regions r ON (c.region_id = r.id OR pr.region_id = r.id OR b.region_id = r.id OR s.region_id = r.id)
    LEFT JOIN public.countries co ON (r.country_id = co.id OR c.country_id = co.id OR pr.country_id = co.id OR b.country_id = co.id OR s.country_id = co.id)
    WHERE p.role = 'student'
    AND (filter_country_id IS NULL OR co.id = filter_country_id)
    AND (filter_region_id IS NULL OR r.id = filter_region_id)
    AND (filter_city_id IS NULL OR c.id = filter_city_id)
    AND (filter_project_id IS NULL OR pr.id = filter_project_id)
    AND (filter_board_id IS NULL OR b.id = filter_board_id)
    AND (filter_school_id IS NULL OR s.id = filter_school_id)
    AND (filter_grade IS NULL OR cl.grade = filter_grade)
    AND (filter_class_id IS NULL OR cl.id = filter_class_id)
  ),
  students_in_courses AS (
    SELECT DISTINCT cm.user_id, c.id as course_id
    FROM public.course_members cm
    JOIN public.courses c ON cm.course_id = c.id
    WHERE cm.course_id IN (SELECT course_id FROM teacher_courses)
      AND cm.role = 'student'
      AND cm.user_id IN (SELECT user_id FROM filtered_students)
  ),
  course_content_totals AS (
    SELECT
      cs.course_id,
      COUNT(clc.id) AS total_content_items
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
    GROUP BY cs.course_id
  ),
  student_progress_by_course AS (
    SELECT
      sic.user_id,
      sic.course_id,
      cct.total_content_items,
      COUNT(ucip.id) AS completed_content_items
    FROM students_in_courses sic
    JOIN course_content_totals cct ON sic.course_id = cct.course_id
    LEFT JOIN public.user_content_item_progress ucip ON sic.user_id = ucip.user_id
      AND sic.course_id = ucip.course_id
      AND ucip.status = 'completed'
    GROUP BY sic.user_id, sic.course_id, cct.total_content_items
  ),
  student_overall_progress AS (
    SELECT
      spc.user_id,
      SUM(spc.total_content_items) AS total_items,
      SUM(spc.completed_content_items) AS completed_items
    FROM student_progress_by_course spc
    GROUP BY spc.user_id
  ),
  progress_categories AS (
    SELECT 
      sop.user_id,
      CASE 
        WHEN sop.total_items IS NULL OR sop.total_items = 0 THEN 'Not Started'
        WHEN sop.completed_items = 0 THEN 'Not Started'
        WHEN (sop.completed_items::decimal / sop.total_items) >= 0.9 THEN 'Excellent (90-100%)'
        WHEN (sop.completed_items::decimal / sop.total_items) >= 0.8 THEN 'Good (80-89%)'
        WHEN (sop.completed_items::decimal / sop.total_items) >= 0.7 THEN 'Average (70-79%)'
        ELSE 'Needs Help (<70%)'
      END AS category
    FROM student_overall_progress sop
  )
  SELECT
    pc.category,
    COUNT(pc.user_id) AS student_count,
    CASE pc.category
      WHEN 'Excellent (90-100%)' THEN '#10B981'::text
      WHEN 'Good (80-89%)' THEN '#3B82F6'::text
      WHEN 'Average (70-79%)' THEN '#F59E0B'::text
      WHEN 'Needs Help (<70%)' THEN '#EF4444'::text
      ELSE '#6B7280'::text
    END AS color_code
  FROM progress_categories pc
  GROUP BY pc.category
  ORDER BY
    CASE pc.category
      WHEN 'Excellent (90-100%)' THEN 1
      WHEN 'Good (80-89%)' THEN 2
      WHEN 'Average (70-79%)' THEN 3
      WHEN 'Needs Help (<70%)' THEN 4
      WHEN 'Not Started' THEN 5
      ELSE 6
    END;
END;
$$;


ALTER FUNCTION "public"."get_student_progress_distribution_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_student_progress_distribution_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") IS 'Get student progress distribution with hierarchical and grade filtering';



CREATE OR REPLACE FUNCTION "public"."get_student_recent_activity"("student_id" "uuid", "days_back" integer) RETURNS TABLE("activity_type" "text", "activity_description" "text", "activity_time" timestamp with time zone, "course_title" "text", "lesson_title" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH student_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = student_id AND cm.role = 'student'
  ),
  content_item_activities AS (
    SELECT 
      'content_completed' as activity_type,
      'Completed: ' || clc.title as activity_description,
      ucip.completed_at as activity_time,
      c.title as course_title,
      clc.title as lesson_title
    FROM public.user_content_item_progress ucip
    JOIN public.course_lesson_content clc ON ucip.lesson_content_id = clc.id
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    JOIN public.courses c ON cs.course_id = c.id
    WHERE ucip.user_id = student_id
      AND cs.course_id IN (SELECT course_id FROM student_courses)
      AND ucip.completed_at IS NOT NULL
      AND ucip.completed_at >= NOW() - (days_back || ' days')::INTERVAL
      AND clc.content_type != 'assignment'
  ),
  discussion_activities AS (
    SELECT 
      'discussion_reply' as activity_type,
      'Replied to discussion: ' || d.title as activity_description,
      dr.created_at as activity_time,
      c.title as course_title,
      d.title as lesson_title
    FROM public.discussion_replies dr
    JOIN public.discussions d ON dr.discussion_id = d.id
    JOIN public.courses c ON d.course_id = c.id
    WHERE dr.user_id = student_id 
      AND d.course_id IN (SELECT course_id FROM student_courses)
      AND dr.created_at >= NOW() - (days_back || ' days')::INTERVAL
  ),
  assignment_activities AS (
    SELECT 
      'assignment_submitted' as activity_type,
      'Submitted assignment: ' || clc.title as activity_description,
      asub.submitted_at as activity_time,
      c.title as course_title,
      clc.title as lesson_title
    FROM public.assignment_submissions asub
    JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    JOIN public.courses c ON cs.course_id = c.id
    WHERE asub.user_id = student_id 
      AND cs.course_id IN (SELECT course_id FROM student_courses)
      AND asub.submitted_at IS NOT NULL
      AND asub.submitted_at >= NOW() - (days_back || ' days')::INTERVAL
  ),
  all_activities AS (
    SELECT * FROM content_item_activities
    UNION ALL
    SELECT * FROM discussion_activities
    UNION ALL
    SELECT * FROM assignment_activities
  )
  SELECT aa.* FROM all_activities aa
  ORDER BY aa.activity_time DESC
  LIMIT 20;
END;
$$;


ALTER FUNCTION "public"."get_student_recent_activity"("student_id" "uuid", "days_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_stats_for_teacher"("p_teacher_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    stats_result json;
begin
    -- Validate that the calling user is the teacher themselves or an admin
    if not (
        auth.uid() = p_teacher_id or
        (select role from public.profiles where profiles.id = auth.uid()) = 'admin'
    ) then
        raise exception 'You are not authorized to perform this action.';
    end if;

    with student_base as (
        -- Get unique students for the teacher with their status
        select distinct on (cm.user_id)
            cm.user_id,
            case
              when u.email_confirmed_at is null then 'unverified'
              when u.last_sign_in_at is null or u.last_sign_in_at < now() - interval '30 day' then 'inactive'
              else 'active'
            end as status
        from public.course_members as teacher_cm
        join public.course_members as cm on teacher_cm.course_id = cm.course_id
        join auth.users as u on cm.user_id = u.id
        where teacher_cm.user_id = p_teacher_id
          and teacher_cm.role = 'teacher'
          and cm.role = 'student'
    )
    select to_jsonb(s) into stats_result from (
        select
            count(*) as "totalCount",
            count(*) filter (where status = 'active') as "activeCount",
            count(*) filter (where status = 'unverified') as "unverifiedCount",
            count(*) filter (where status = 'inactive') as "inactiveCount"
        from student_base
    ) s;

    return stats_result;
end;
$$;


ALTER FUNCTION "public"."get_student_stats_for_teacher"("p_teacher_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_status_counts"("p_teacher_id" "uuid") RETURNS TABLE("total_students" bigint, "active_students" bigint, "behind_students" bigint, "excellent_students" bigint, "not_started_students" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH teacher_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
  ),
  students_in_courses AS (
    SELECT DISTINCT cm.user_id, c.id AS course_id
    FROM public.course_members cm
    JOIN public.courses c ON cm.course_id = c.id
    WHERE cm.course_id IN (SELECT course_id FROM teacher_courses)
      AND cm.role = 'student'
  ),
  course_content_totals AS (
    SELECT
      cs.course_id,
      COUNT(clc.id) AS total_content_items
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
    GROUP BY cs.course_id
  ),
  student_progress_by_course AS (
    SELECT
      sic.user_id,
      sic.course_id,
      cct.total_content_items,
      COUNT(ucip.id) AS completed_content_items
    FROM students_in_courses sic
    JOIN course_content_totals cct ON sic.course_id = cct.course_id
    LEFT JOIN public.user_content_item_progress ucip ON sic.user_id = ucip.user_id
      AND sic.course_id = ucip.course_id
      AND ucip.status = 'completed'
    GROUP BY sic.user_id, sic.course_id, cct.total_content_items
  ),
  student_overall_progress AS (
    SELECT
      spc.user_id,
      SUM(spc.total_content_items) AS total_items,
      SUM(spc.completed_content_items) AS completed_items
    FROM student_progress_by_course spc
    GROUP BY spc.user_id
  ),
  student_statuses AS (
    SELECT 
      sop.user_id,
      CASE 
        WHEN sop.total_items IS NULL OR sop.total_items = 0 THEN 'Not Started'
        WHEN sop.completed_items = 0 THEN 'Not Started'
        WHEN (sop.completed_items::DECIMAL / sop.total_items) >= 0.9 THEN 'Excellent'
        WHEN (sop.completed_items::DECIMAL / sop.total_items) >= 0.7 THEN 'Active'
        ELSE 'Behind'
      END as status
    FROM student_overall_progress sop
  )
  SELECT
    (SELECT COUNT(DISTINCT user_id) FROM students_in_courses) as total_students,
    COUNT(CASE WHEN ss.status = 'Active' THEN 1 END),
    COUNT(CASE WHEN ss.status = 'Behind' THEN 1 END),
    COUNT(CASE WHEN ss.status = 'Excellent' THEN 1 END),
    COUNT(CASE WHEN ss.status = 'Not Started' THEN 1 END)
  FROM student_statuses ss;
END;
$$;


ALTER FUNCTION "public"."get_student_status_counts"("p_teacher_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_status_counts_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid" DEFAULT NULL::"uuid", "filter_region_id" "uuid" DEFAULT NULL::"uuid", "filter_city_id" "uuid" DEFAULT NULL::"uuid", "filter_project_id" "uuid" DEFAULT NULL::"uuid", "filter_board_id" "uuid" DEFAULT NULL::"uuid", "filter_school_id" "uuid" DEFAULT NULL::"uuid", "filter_grade" "text" DEFAULT NULL::"text", "filter_class_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("total_students" bigint, "active_students" bigint, "behind_students" bigint, "excellent_students" bigint, "not_started_students" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH teacher_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
  ),
  filtered_students AS (
    SELECT DISTINCT p.id as user_id
    FROM public.profiles p
    LEFT JOIN public.class_students cs ON p.id = cs.student_id
    LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id
    LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
    LEFT JOIN public.schools s ON cl.school_id = s.id
    LEFT JOIN public.boards b ON (cl.board_id = b.id OR s.board_id = b.id)
    LEFT JOIN public.projects pr ON (b.project_id = pr.id OR s.project_id = pr.id)
    LEFT JOIN public.cities c ON (pr.city_id = c.id OR b.city_id = c.id OR s.city_id = c.id)
    LEFT JOIN public.regions r ON (c.region_id = r.id OR pr.region_id = r.id OR b.region_id = r.id OR s.region_id = r.id)
    LEFT JOIN public.countries co ON (r.country_id = co.id OR c.country_id = co.id OR pr.country_id = co.id OR b.country_id = co.id OR s.country_id = co.id)
    WHERE p.role = 'student'
    AND (filter_country_id IS NULL OR co.id = filter_country_id)
    AND (filter_region_id IS NULL OR r.id = filter_region_id)
    AND (filter_city_id IS NULL OR c.id = filter_city_id)
    AND (filter_project_id IS NULL OR pr.id = filter_project_id)
    AND (filter_board_id IS NULL OR b.id = filter_board_id)
    AND (filter_school_id IS NULL OR s.id = filter_school_id)
    AND (filter_grade IS NULL OR cl.grade = filter_grade)
    AND (filter_class_id IS NULL OR cl.id = filter_class_id)
  ),
  students_in_courses AS (
    SELECT DISTINCT cm.user_id, c.id AS course_id
    FROM public.course_members cm
    JOIN public.courses c ON cm.course_id = c.id
    WHERE cm.course_id IN (SELECT course_id FROM teacher_courses)
      AND cm.role = 'student'
      AND cm.user_id IN (SELECT user_id FROM filtered_students)
  ),
  course_content_totals AS (
    SELECT
      cs.course_id,
      COUNT(clc.id) AS total_content_items
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
    GROUP BY cs.course_id
  ),
  student_progress_by_course AS (
    SELECT
      sic.user_id,
      sic.course_id,
      cct.total_content_items,
      COUNT(ucip.id) AS completed_content_items
    FROM students_in_courses sic
    JOIN course_content_totals cct ON sic.course_id = cct.course_id
    LEFT JOIN public.user_content_item_progress ucip ON sic.user_id = ucip.user_id
      AND sic.course_id = ucip.course_id
      AND ucip.status = 'completed'
    GROUP BY sic.user_id, sic.course_id, cct.total_content_items
  ),
  student_overall_progress AS (
    SELECT
      spc.user_id,
      SUM(spc.total_content_items) AS total_items,
      SUM(spc.completed_content_items) AS completed_items
    FROM student_progress_by_course spc
    GROUP BY spc.user_id
  ),
  student_statuses AS (
    SELECT 
      sop.user_id,
      CASE 
        WHEN sop.total_items IS NULL OR sop.total_items = 0 THEN 'Not Started'
        WHEN sop.completed_items = 0 THEN 'Not Started'
        WHEN (sop.completed_items::DECIMAL / sop.total_items) >= 0.9 THEN 'Excellent'
        WHEN (sop.completed_items::DECIMAL / sop.total_items) >= 0.7 THEN 'Active'
        ELSE 'Behind'
      END as status
    FROM student_overall_progress sop
  )
  SELECT
    (SELECT COUNT(DISTINCT user_id) FROM students_in_courses) as total_students,
    COUNT(CASE WHEN ss.status = 'Active' THEN 1 END),
    COUNT(CASE WHEN ss.status = 'Behind' THEN 1 END),
    COUNT(CASE WHEN ss.status = 'Excellent' THEN 1 END),
    COUNT(CASE WHEN ss.status = 'Not Started' THEN 1 END)
  FROM student_statuses ss;
END;
$$;


ALTER FUNCTION "public"."get_student_status_counts_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_student_status_counts_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") IS 'Get student status counts with hierarchical and grade filtering';



CREATE OR REPLACE FUNCTION "public"."get_student_status_distribution"("p_teacher_id" "uuid") RETURNS TABLE("status" "text", "count" bigint, "percentage" integer, "color" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH teacher_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
  ),
  students_in_courses AS (
    SELECT DISTINCT cm.user_id, c.id AS course_id
    FROM public.course_members cm
    JOIN public.courses c ON cm.course_id = c.id
    WHERE cm.course_id IN (SELECT course_id FROM teacher_courses)
      AND cm.role = 'student'
  ),
  course_content_totals AS (
    SELECT
      cs.course_id,
      COUNT(clc.id) AS total_content_items
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
    GROUP BY cs.course_id
  ),
  student_progress_by_course AS (
    SELECT
      sic.user_id,
      sic.course_id,
      cct.total_content_items,
      COUNT(ucip.id) AS completed_content_items
    FROM students_in_courses sic
    JOIN course_content_totals cct ON sic.course_id = cct.course_id
    LEFT JOIN public.user_content_item_progress ucip ON sic.user_id = ucip.user_id
      AND sic.course_id = ucip.course_id
      AND ucip.status = 'completed'
    GROUP BY sic.user_id, sic.course_id, cct.total_content_items
  ),
  student_overall_progress AS (
    SELECT
      spc.user_id,
      SUM(spc.total_content_items) AS total_items,
      SUM(spc.completed_content_items) AS completed_items
    FROM student_progress_by_course spc
    GROUP BY spc.user_id
  ),
  student_statuses AS (
    SELECT 
      sop.user_id,
      CASE 
        WHEN sop.total_items IS NULL OR sop.total_items = 0 THEN 'Not Started'
        WHEN sop.completed_items = 0 THEN 'Not Started'
        WHEN (sop.completed_items::DECIMAL / sop.total_items) >= 0.9 THEN 'Excellent'
        WHEN (sop.completed_items::DECIMAL / sop.total_items) >= 0.7 THEN 'Active'
        ELSE 'Behind'
      END as student_status
    FROM student_overall_progress sop
  ),
  status_counts AS (
    SELECT 
      ss.student_status as status,
      COUNT(*) as count
    FROM student_statuses ss
    GROUP BY ss.student_status
  ),
  total_students AS (
    SELECT COUNT(*) as total FROM student_statuses
  )
  SELECT
    sc.status::text,
    sc.count::bigint,
    CASE 
      WHEN ts.total > 0 THEN ((sc.count::decimal / ts.total) * 100)::integer
      ELSE 0 
    END as percentage,
    CASE sc.status
      WHEN 'Excellent' THEN '#10B981'::text
      WHEN 'Active' THEN '#3B82F6'::text
      WHEN 'Behind' THEN '#F59E0B'::text
      WHEN 'Not Started' THEN '#6B7280'::text
      ELSE '#6B7280'::text
    END as color
  FROM status_counts sc
  CROSS JOIN total_students ts
  ORDER BY 
    CASE sc.status
      WHEN 'Excellent' THEN 1
      WHEN 'Active' THEN 2
      WHEN 'Behind' THEN 3
      WHEN 'Not Started' THEN 4
      ELSE 5
    END;
END;
$$;


ALTER FUNCTION "public"."get_student_status_distribution"("p_teacher_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_study_analytics"("student_id" "uuid", "time_range" "text" DEFAULT '7days'::"text") RETURNS TABLE("date_label" "text", "lessons_completed" integer, "study_time_minutes" integer, "assignments_submitted" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  start_date TIMESTAMP;
  end_date TIMESTAMP;
  period_type TEXT;
BEGIN
  -- Set date range based on time_range parameter
  CASE time_range
    WHEN '7days' THEN
      start_date := NOW() - INTERVAL '7 days';
      period_type := 'day';
    WHEN '30days' THEN
      start_date := NOW() - INTERVAL '30 days';
      period_type := 'day';
    WHEN '3months' THEN
      start_date := NOW() - INTERVAL '3 months';
      period_type := 'week';
    ELSE
      start_date := NOW() - INTERVAL '7 days';
      period_type := 'day';
  END CASE;
  
  end_date := NOW();

  RETURN QUERY
  WITH student_courses AS (
    SELECT DISTINCT cm.course_id
    FROM course_members cm
    WHERE cm.user_id = student_id AND cm.role = 'student'
  ),
  periods AS (
    SELECT 
      CASE period_type
        WHEN 'day' THEN 
          date_series::DATE::TEXT
        WHEN 'week' THEN 
          'Week ' || EXTRACT(WEEK FROM date_series)::TEXT
      END as date_label,
      date_series as period_start,
      CASE period_type
        WHEN 'day' THEN date_series + INTERVAL '1 day'
        WHEN 'week' THEN date_series + INTERVAL '1 week'
      END as period_end
    FROM generate_series(
      start_date::DATE,
      end_date::DATE,
      CASE period_type
        WHEN 'day' THEN '1 day'::INTERVAL
        WHEN 'week' THEN '1 week'::INTERVAL
      END
    ) as date_series
  ),
  activity_data AS (
    SELECT 
      p.date_label,
      COUNT(CASE WHEN ucp.completed_at >= p.period_start AND ucp.completed_at < p.period_end THEN 1 END)::INTEGER as lessons_completed,
      COALESCE(SUM(CASE WHEN ucp.updated_at >= p.period_start AND ucp.updated_at < p.period_end THEN ucp.progress_seconds ELSE 0 END) / 60, 0)::INTEGER as study_time_minutes,
      COUNT(CASE WHEN as2.submitted_at >= p.period_start AND as2.submitted_at < p.period_end THEN 1 END)::INTEGER as assignments_submitted
    FROM periods p
    LEFT JOIN user_course_progress ucp ON 
      ucp.user_id = student_id AND
      (ucp.completed_at >= p.period_start AND ucp.completed_at < p.period_end OR
       ucp.updated_at >= p.period_start AND ucp.updated_at < p.period_end)
    LEFT JOIN assignment_submissions as2 ON 
      as2.user_id = student_id AND
      as2.submitted_at >= p.period_start AND as2.submitted_at < p.period_end
    GROUP BY p.date_label, p.period_start
    ORDER BY p.period_start
  )
  SELECT 
    ad.date_label,
    ad.lessons_completed,
    ad.study_time_minutes,
    ad.assignments_submitted
  FROM activity_data ad;
END;
$$;


ALTER FUNCTION "public"."get_student_study_analytics"("student_id" "uuid", "time_range" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_upcoming_assignments"("student_id" "uuid", "days_ahead" integer) RETURNS TABLE("assignment_id" "uuid", "assignment_title" "text", "course_title" "text", "due_date" timestamp with time zone, "days_remaining" integer, "priority" "text", "submission_status" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH student_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = student_id AND cm.role = 'student'
  ),
  upcoming_assignments AS (
    SELECT 
      clc.id as assignment_id,
      clc.title as assignment_title,
      c.title as course_title,
      clc.due_date,
      EXTRACT(DAY FROM clc.due_date - NOW())::INTEGER as days_remaining,
      CASE 
        WHEN clc.due_date <= NOW() + INTERVAL '1 day' THEN 'High'
        WHEN clc.due_date <= NOW() + INTERVAL '3 days' THEN 'Medium'
        ELSE 'Low'
      END as priority,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM public.assignment_submissions asub
          WHERE asub.assignment_id = clc.id AND asub.user_id = student_id
        ) THEN 'Submitted'
        ELSE 'Not Submitted'
      END as submission_status
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    JOIN student_courses sc ON cs.course_id = sc.course_id
    JOIN public.courses c ON sc.course_id = c.id
    WHERE clc.content_type = 'assignment'
      AND clc.due_date IS NOT NULL
      AND clc.due_date > NOW()
      AND clc.due_date <= NOW() + (days_ahead || ' days')::INTERVAL
  )
  SELECT ua.* FROM upcoming_assignments ua
  ORDER BY ua.due_date ASC;
END;
$$;


ALTER FUNCTION "public"."get_student_upcoming_assignments"("student_id" "uuid", "days_ahead" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_students_data"("p_teacher_id" "uuid", "search_term" "text", "course_filter" "text", "status_filter" "text", "sort_by" "text", "sort_order" "text", "page_number" integer, "page_size" integer) RETURNS TABLE("student_id" "uuid", "student_name" "text", "student_email" "text", "student_avatar" "text", "avatar_url" "text", "enrolled_date" timestamp with time zone, "course_title" "text", "progress_percentage" integer, "status" "text", "last_active" "text", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH student_enrollments AS (
        SELECT
            cm.user_id,
            cm.course_id,
            p.first_name,
            p.last_name,
            p.email,
            p.avatar_url,
            cm.created_at AS enrolled_date,
            c.title AS course_title
        FROM public.course_members cm
        JOIN public.courses c ON cm.course_id = c.id
        JOIN public.profiles p ON cm.user_id = p.id
        WHERE cm.role = 'student'
          AND c.status = 'Published'
          AND cm.course_id IN (
            SELECT course_id FROM public.course_members WHERE user_id = p_teacher_id AND role = 'teacher'
          )
    ),
    student_progress AS (
        SELECT
            ucip.user_id,
            ucip.course_id,
            COUNT(DISTINCT CASE WHEN lower(ucip.status) = 'completed' THEN ucip.lesson_content_id END) AS completed_items,
            COUNT(DISTINCT ucip.lesson_content_id) AS progressed_items,
            MAX(ucip.updated_at) AS last_activity
        FROM public.user_content_item_progress ucip
        GROUP BY ucip.user_id, ucip.course_id
    ),
    course_totals AS (
        SELECT
            c.id AS course_id,
            COUNT(clc.id) AS total_items
        FROM public.courses c
        JOIN public.course_sections cs ON c.id = cs.course_id
        JOIN public.course_lessons cl ON cs.id = cl.section_id
        JOIN public.course_lesson_content clc ON cl.id = clc.lesson_id
        GROUP BY c.id
    ),
    final_data AS (
        SELECT
            se.user_id AS student_id,
            (se.first_name || ' ' || se.last_name) AS student_name,
            se.email AS student_email,
            (SUBSTRING(se.first_name, 1, 1) || SUBSTRING(se.last_name, 1, 1)) AS student_avatar,
            se.avatar_url,
            se.enrolled_date,
            se.course_title,
            CASE
                WHEN COALESCE(ct.total_items, 0) > 0 THEN
                    (COALESCE(sp.completed_items, 0) * 100.0 / ct.total_items)::integer
                ELSE 0
            END AS progress_percentage,
            CASE
                WHEN COALESCE(ct.total_items, 0) > 0 AND (COALESCE(sp.completed_items, 0) * 100.0 / ct.total_items)::integer >= 100 THEN 'Completed'
                WHEN COALESCE(sp.progressed_items, 0) > 0 THEN 'In Progress'
                ELSE 'Not Started'
            END AS status,
            to_char(sp.last_activity, 'YYYY-MM-DD') AS last_active
        FROM student_enrollments se
        LEFT JOIN student_progress sp ON se.user_id = sp.user_id AND se.course_id = sp.course_id
        LEFT JOIN course_totals ct ON se.course_id = ct.course_id
        WHERE (search_term = '' OR (se.first_name || ' ' || se.last_name) ILIKE '%' || search_term || '%' OR se.email ILIKE '%' || search_term || '%')
          AND (course_filter = '' OR se.course_id::text = course_filter)
    ),
    filtered_data AS (
        SELECT *
        FROM final_data
        WHERE (status_filter = '' OR final_data.status = status_filter)
    )
    SELECT
        fd.student_id,
        fd.student_name,
        fd.student_email,
        fd.student_avatar,
        fd.avatar_url,
        fd.enrolled_date,
        fd.course_title,
        fd.progress_percentage,
        fd.status,
        fd.last_active,
        (SELECT COUNT(*) FROM filtered_data) AS total_count
    FROM filtered_data fd
    ORDER BY
        CASE WHEN sort_by = 'name' AND sort_order = 'asc' THEN fd.student_name END ASC,
        CASE WHEN sort_by = 'name' AND sort_order = 'desc' THEN fd.student_name END DESC,
        CASE WHEN sort_by = 'progress' AND sort_order = 'asc' THEN fd.progress_percentage END ASC,
        CASE WHEN sort_by = 'progress' AND sort_order = 'desc' THEN fd.progress_percentage END DESC,
        CASE WHEN sort_by = 'enrolled_date' AND sort_order = 'asc' THEN fd.enrolled_date END ASC,
        CASE WHEN sort_by = 'enrolled_date' AND sort_order = 'desc' THEN fd.enrolled_date END DESC
    LIMIT page_size
    OFFSET (page_number - 1) * page_size;
END;
$$;


ALTER FUNCTION "public"."get_students_data"("p_teacher_id" "uuid", "search_term" "text", "course_filter" "text", "status_filter" "text", "sort_by" "text", "sort_order" "text", "page_number" integer, "page_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_students_for_teacher"("p_teacher_id" "uuid") RETURNS TABLE("id" "uuid", "first_name" "text", "last_name" "text", "email" "text", "avatar_url" "text", "email_confirmed_at" timestamp with time zone, "enrolled_at" timestamp with time zone, "course_id" "uuid", "course_title" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- First, validate that the calling user is the teacher themselves or an admin
  if not (
    auth.uid() = p_teacher_id or
    (select role from public.profiles where profiles.id = auth.uid()) = 'admin'
  ) then
    raise exception 'You are not authorized to perform this action.';
  end if;

  return query
  select
      u.id as id,
      p.first_name,
      p.last_name,
      u.email::text,
      p.avatar_url,
      u.email_confirmed_at,
      cm.created_at as enrolled_at,
      c.id as course_id,
      c.title as course_title
  from
      public.course_members as teacher_cm
  join
      public.course_members as cm on teacher_cm.course_id = cm.course_id
  join
      auth.users as u on cm.user_id = u.id
  left join
      public.profiles as p on cm.user_id = p.id
  left join
      public.courses as c on cm.course_id = c.id
  where
      teacher_cm.user_id = p_teacher_id
      and teacher_cm.role = 'teacher'
      and cm.role = 'student';
end;
$$;


ALTER FUNCTION "public"."get_students_for_teacher"("p_teacher_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_students_for_teacher"("p_teacher_id" "uuid", "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") RETURNS TABLE("id" "uuid", "first_name" "text", "last_name" "text", "email" "text", "avatar_url" "text", "enrolled_at" timestamp with time zone, "last_active" timestamp with time zone, "status" "text", "course_id" "uuid", "course_title" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- First, validate that the calling user is the teacher themselves or an admin
  if not (
    auth.uid() = p_teacher_id or
    (select role from public.profiles where profiles.id = auth.uid()) = 'admin'
  ) then
    raise exception 'You are not authorized to perform this action.';
  end if;

  return query
  with student_base as (
    select
      u.id,
      p.first_name,
      p.last_name,
      u.email::text,
      p.avatar_url,
      cm.created_at as enrolled_at,
      u.last_sign_in_at as last_active,
      case
          when u.email_confirmed_at is null then 'unverified'
          when u.last_sign_in_at is null or u.last_sign_in_at < now() - interval '30 day' then 'inactive'
          else 'active'
      end as status,
      c.id as course_id,
      c.title as course_title,
      row_number() over(partition by u.id order by cm.created_at desc) as rn
    from
      public.course_members as teacher_cm
    join public.course_members as cm on teacher_cm.course_id = cm.course_id
    join auth.users as u on cm.user_id = u.id
    left join public.profiles as p on cm.user_id = p.id
    left join public.courses as c on cm.course_id = c.id
    where
      teacher_cm.user_id = p_teacher_id
      and teacher_cm.role = 'teacher'
      and cm.role = 'student'
  )
  select
    student_base.id,
    student_base.first_name,
    student_base.last_name,
    student_base.email,
    student_base.avatar_url,
    student_base.enrolled_at,
    student_base.last_active,
    student_base.status,
    student_base.course_id,
    student_base.course_title
  from student_base
  where
      (p_course_filter <> 'all' or student_base.rn = 1)
      and (
          p_search_term = '' or
          concat_ws(' ', student_base.first_name, student_base.last_name) ilike '%' || p_search_term || '%' or
          student_base.email ilike '%' || p_search_term || '%'
      )
      and (
          p_course_filter = 'all' or
          student_base.course_title = p_course_filter
      )
      and (
          p_status_filter = 'all' or
          student_base.status = p_status_filter
      );
end;
$$;


ALTER FUNCTION "public"."get_students_for_teacher"("p_teacher_id" "uuid", "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_students_for_teacher"("p_teacher_id" "uuid", "p_page" integer, "p_rows_per_page" integer, "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") RETURNS TABLE("id" "uuid", "first_name" "text", "last_name" "text", "email" "text", "avatar_url" "text", "enrolled_at" timestamp with time zone, "last_active" timestamp with time zone, "status" "text", "course_id" "uuid", "course_title" "text", "grade" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- Validate that the calling user is the teacher themselves or an admin
  if not (
    auth.uid() = p_teacher_id or
    (select role from public.profiles where profiles.id = auth.uid()) = 'admin'
  ) then
    raise exception 'You are not authorized to perform this action.';
  end if;

  return query
  with student_base as (
    select
      u.id,
      p.first_name,
      p.last_name,
      u.email::text,
      p.avatar_url,
      cm.created_at as enrolled_at,
      u.last_sign_in_at as last_active,
      case
          when u.email_confirmed_at is null then 'unverified'
          when u.last_sign_in_at is null or u.last_sign_in_at < now() - interval '30 day' then 'inactive'
          else 'active'
      end as status,
      c.id as course_id,
      c.title as course_title,
      p.grade,
      row_number() over(partition by u.id order by cm.created_at desc) as rn
    from
      public.course_members as teacher_cm
    join public.course_members as cm on teacher_cm.course_id = cm.course_id
    join auth.users as u on cm.user_id = u.id
    left join public.profiles as p on cm.user_id = p.id
    left join public.courses as c on cm.course_id = c.id
    where
      teacher_cm.user_id = p_teacher_id
      and teacher_cm.role = 'teacher'
      and cm.role = 'student'
  )
  select
    student_base.id,
    student_base.first_name,
    student_base.last_name,
    student_base.email,
    student_base.avatar_url,
    student_base.enrolled_at,
    student_base.last_active,
    student_base.status,
    student_base.course_id,
    student_base.course_title,
    student_base.grade
  from student_base
  where
      (p_course_filter <> 'all' or student_base.rn = 1)
      and (
          p_search_term = '' or
          concat_ws(' ', student_base.first_name, student_base.last_name) ilike '%' || p_search_term || '%' or
          student_base.email ilike '%' || p_search_term || '%'
      )
      and (
          p_course_filter = 'all' or
          student_base.course_title = p_course_filter
      )
      and (
          p_status_filter = 'all' or
          student_base.status = p_status_filter
      )
  order by student_base.enrolled_at desc
  limit p_rows_per_page
  offset (p_page - 1) * p_rows_per_page;
end;
$$;


ALTER FUNCTION "public"."get_students_for_teacher"("p_teacher_id" "uuid", "p_page" integer, "p_rows_per_page" integer, "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_students_for_teacher_count"("p_teacher_id" "uuid", "p_search_term" "text" DEFAULT ''::"text", "p_course_filter" "text" DEFAULT 'all'::"text", "p_status_filter" "text" DEFAULT 'all'::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  total_rows int;
begin
  -- Validate user
  if not (auth.uid() = p_teacher_id or (select role from public.profiles where profiles.id = auth.uid()) = 'admin') then
    raise exception 'You are not authorized to perform this action.';
  end if;

  with student_base as (
    select
      u.id,
      p.first_name,
      p.last_name,
      u.email::text as email,
      case
          when u.email_confirmed_at is null then 'unverified'
          when u.last_sign_in_at is null or u.last_sign_in_at < now() - interval '30 day' then 'inactive'
          else 'active'
      end as status,
      c.title as course_title,
      row_number() over(partition by u.id order by cm.created_at desc) as rn
    from
      public.course_members as teacher_cm
    join public.course_members as cm on teacher_cm.course_id = cm.course_id
    join auth.users as u on cm.user_id = u.id
    left join public.profiles as p on cm.user_id = p.id
    left join public.courses as c on cm.course_id = c.id
    where
      teacher_cm.user_id = p_teacher_id
      and teacher_cm.role = 'teacher'
      and cm.role = 'student'
  )
  select count(*)
  into total_rows
  from student_base
  where
      (p_course_filter <> 'all' or student_base.rn = 1)
      and (
          p_search_term = '' or
          concat_ws(' ', student_base.first_name, student_base.last_name) ilike '%' || p_search_term || '%' or
          student_base.email ilike '%' || p_search_term || '%'
      )
      and (
          p_course_filter = 'all' or
          student_base.course_title = p_course_filter
      )
      and (
          p_status_filter = 'all' or
          student_base.status = p_status_filter
      );

  return total_rows;
end;
$$;


ALTER FUNCTION "public"."get_students_for_teacher_count"("p_teacher_id" "uuid", "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_teacher_assessments_data"("teacher_id" "uuid", "search_query" "text" DEFAULT ''::"text", "course_filter_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "title" "text", "course" "text", "course_id" "uuid", "type" "text", "due_date" timestamp with time zone, "submissions" bigint, "graded" bigint, "avg_score" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH teacher_courses AS (
    SELECT c.id, c.title
    FROM courses c
    JOIN course_members cm ON c.id = cm.course_id
    WHERE cm.user_id = teacher_id 
      AND cm.role = 'teacher'
      AND c.status = 'Published'
      AND (course_filter_id IS NULL OR c.id = course_filter_id)
  ),
  assessments AS (
    SELECT
      clc.id,
      clc.title,
      tc.title AS course,
      tc.id AS course_id,
      clc.content_type AS type,
      clc.due_date
    FROM course_lesson_content clc
    JOIN course_lessons cl ON clc.lesson_id = cl.id
    JOIN course_sections cs ON cl.section_id = cs.id
    JOIN teacher_courses tc ON cs.course_id = tc.id
    WHERE clc.content_type IN ('assignment', 'quiz')
      AND (search_query = '' OR clc.title ILIKE '%' || search_query || '%')
  ),
  quiz_stats AS (
    SELECT
      a.id,
      COUNT(qs.id) AS submissions,
      COUNT(qs.id) AS graded,
      COALESCE(AVG(qs.score), 0)::NUMERIC AS avg_score
    FROM assessments a
    JOIN quiz_submissions qs ON a.id = qs.lesson_content_id
    WHERE a.type = 'quiz'
    GROUP BY a.id
  ),
  assignment_stats AS (
    SELECT
      a.id,
      COUNT(asub.id) AS submissions,
      COUNT(CASE WHEN asub.status = 'graded' THEN 1 END) AS graded,
      COALESCE(AVG(asub.grade), 0)::NUMERIC AS avg_score
    FROM assessments a
    JOIN assignment_submissions asub ON a.id = asub.assignment_id
    WHERE a.type = 'assignment'
    GROUP BY a.id
  )
  SELECT
    a.id,
    a.title,
    a.course,
    a.course_id,
    a.type,
    a.due_date,
    COALESCE(qs.submissions, assignments.submissions, 0) AS submissions,
    COALESCE(qs.graded, assignments.graded, 0) AS graded,
    COALESCE(qs.avg_score, assignments.avg_score, 0) AS avg_score
  FROM assessments a
  LEFT JOIN quiz_stats qs ON a.id = qs.id
  LEFT JOIN assignment_stats assignments ON a.id = assignments.id;
END;
$$;


ALTER FUNCTION "public"."get_teacher_assessments_data"("teacher_id" "uuid", "search_query" "text", "course_filter_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_teacher_engagement_metrics"("p_teacher_id" "uuid", "p_time_range" "text") RETURNS TABLE("total_students" bigint, "active_students" bigint, "engagement_rate" integer, "avg_completion_rate" integer, "total_assignments" bigint, "pending_assignments" bigint, "completion_rate" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
    v_result_total_students BIGINT;
    v_result_active_students BIGINT;
    v_result_engagement_rate INTEGER;
    v_result_avg_completion_rate INTEGER;
    v_result_total_assignments BIGINT;
    v_result_pending_assignments BIGINT;
    v_result_completion_rate INTEGER;
BEGIN
    v_end_date := NOW();
    -- Set date range based on p_time_range parameter
    CASE p_time_range
        WHEN '7days' THEN v_start_date := v_end_date - INTERVAL '7 days';
        WHEN '30days' THEN v_start_date := v_end_date - INTERVAL '30 days';
        WHEN '3months' THEN v_start_date := v_end_date - INTERVAL '3 months';
        WHEN '6months' THEN v_start_date := v_end_date - INTERVAL '6 months';
        WHEN '1year' THEN v_start_date := v_end_date - INTERVAL '1 year';
        ELSE v_start_date := '2020-01-01'::TIMESTAMPTZ;
    END CASE;

    -- Get the complete result with all metrics
    WITH teacher_courses AS (
        SELECT cm.course_id
        FROM public.course_members cm
        WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
    ),
    students_in_courses AS (
        SELECT DISTINCT cm.user_id
        FROM public.course_members cm
        WHERE cm.course_id IN (SELECT course_id FROM teacher_courses)
        AND cm.role = 'student'
    ),
    active_students_list AS (
        -- Students who have any progress (no time filter for engagement calculation)
        SELECT DISTINCT user_id FROM public.user_content_item_progress
        WHERE course_id IN (SELECT course_id FROM teacher_courses)
        UNION
        -- Students who have submitted assignments
        SELECT DISTINCT asub.user_id FROM public.assignment_submissions asub
        JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
        JOIN public.course_lessons cl ON clc.lesson_id = cl.id
        JOIN public.course_sections cs ON cl.section_id = cs.id
        WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
        UNION
        -- Students who have submitted quizzes
        SELECT DISTINCT qsub.user_id FROM public.quiz_submissions qsub
        JOIN public.course_lessons cl ON qsub.lesson_id = cl.id
        JOIN public.course_sections cs ON cl.section_id = cs.id
        WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
    ),
    student_completion_percentages AS (
        SELECT 
            ucip.user_id,
            ucip.course_id,
            COUNT(*) as total_content_items,
            COUNT(CASE WHEN ucip.status = 'completed' THEN 1 END) as completed_items,
            CASE 
                WHEN COUNT(*) > 0 THEN 
                    ROUND((COUNT(CASE WHEN ucip.status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)) * 100)
                ELSE 0 
            END as completion_percentage
        FROM public.user_content_item_progress ucip
        WHERE ucip.course_id IN (SELECT course_id FROM teacher_courses)
        AND ucip.user_id IN (SELECT user_id FROM students_in_courses)
        GROUP BY ucip.user_id, ucip.course_id
    ),
    student_avg_completion AS (
        SELECT 
            user_id,
            AVG(completion_percentage) as avg_completion_percentage
        FROM student_completion_percentages
        GROUP BY user_id
    ),
    all_progress AS (
        SELECT status, user_id FROM public.user_content_item_progress
        WHERE course_id IN (SELECT course_id FROM teacher_courses)
        AND user_id IN (SELECT user_id FROM students_in_courses)
        AND updated_at BETWEEN v_start_date AND v_end_date
    ),
    assignment_data AS (
        SELECT asub.status
        FROM public.assignment_submissions asub
        JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
        JOIN public.course_lessons cl ON clc.lesson_id = cl.id
        JOIN public.course_sections cs ON cl.section_id = cs.id
        WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
        AND asub.user_id IN (SELECT user_id FROM students_in_courses)
        AND asub.submitted_at BETWEEN v_start_date AND v_end_date
    )
    SELECT 
        (SELECT COUNT(*) FROM students_in_courses),
        (SELECT COUNT(DISTINCT user_id) FROM active_students_list),
        CASE
            WHEN (SELECT COUNT(*) FROM students_in_courses) > 0 THEN
                COALESCE(
                    (SELECT AVG(avg_completion_percentage)::INTEGER 
                     FROM student_avg_completion), 
                    0
                )
            ELSE 0
        END,
        CASE
            WHEN (SELECT COUNT(*) FROM all_progress) > 0 THEN
                (((SELECT COUNT(*) FROM all_progress WHERE status = 'completed')::DECIMAL / (SELECT COUNT(*) FROM all_progress)) * 100)::INTEGER
            ELSE 0
        END,
        (SELECT COUNT(*) FROM assignment_data),
        (SELECT COUNT(*) FROM assignment_data WHERE status = 'pending'),
        CASE
            WHEN (SELECT COUNT(*) FROM all_progress) > 0 THEN
                (((SELECT COUNT(*) FROM all_progress WHERE status = 'completed'))::decimal / (SELECT count(*) FROM all_progress) * 100)::integer
            ELSE 0
        END
    INTO 
        v_result_total_students,
        v_result_active_students,
        v_result_engagement_rate,
        v_result_avg_completion_rate,
        v_result_total_assignments,
        v_result_pending_assignments,
        v_result_completion_rate;

    -- Return the complete result
    RETURN QUERY SELECT 
        v_result_total_students::BIGINT,
        v_result_active_students::BIGINT,
        v_result_engagement_rate::INTEGER,
        v_result_avg_completion_rate::INTEGER,
        v_result_total_assignments::BIGINT,
        v_result_pending_assignments::BIGINT,
        v_result_completion_rate::INTEGER;
END;
$$;


ALTER FUNCTION "public"."get_teacher_engagement_metrics"("p_teacher_id" "uuid", "p_time_range" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_teacher_engagement_metrics_with_filters"("p_teacher_id" "uuid", "p_time_range" "text" DEFAULT '30days'::"text", "filter_country_id" "uuid" DEFAULT NULL::"uuid", "filter_region_id" "uuid" DEFAULT NULL::"uuid", "filter_city_id" "uuid" DEFAULT NULL::"uuid", "filter_project_id" "uuid" DEFAULT NULL::"uuid", "filter_board_id" "uuid" DEFAULT NULL::"uuid", "filter_school_id" "uuid" DEFAULT NULL::"uuid", "filter_grade" "text" DEFAULT NULL::"text", "filter_class_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("total_students" integer, "active_students" integer, "engagement_rate" integer, "avg_completion_rate" integer, "total_assignments" integer, "pending_assignments" integer, "completion_rate" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    date_start TIMESTAMP;
BEGIN
    -- Set date range based on time_range parameter
    CASE p_time_range
        WHEN '7days' THEN date_start := NOW() - INTERVAL '7 days';
        WHEN '30days' THEN date_start := NOW() - INTERVAL '30 days';
        WHEN '3months' THEN date_start := NOW() - INTERVAL '3 months';
        WHEN '6months' THEN date_start := NOW() - INTERVAL '6 months';
        WHEN '1year' THEN date_start := NOW() - INTERVAL '1 year';
        ELSE date_start := '2020-01-01'::TIMESTAMP;
    END CASE;

    RETURN QUERY
    WITH teacher_courses AS (
        SELECT cm.course_id
        FROM public.course_members cm
        WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
    ),
    filtered_students AS (
        SELECT DISTINCT p.id as user_id
        FROM public.profiles p
        LEFT JOIN public.class_students cs ON p.id = cs.student_id
        LEFT JOIN public.class_teachers ct ON p.id = ct.teacher_id
        LEFT JOIN public.classes cl ON (cs.class_id = cl.id OR ct.class_id = cl.id)
        LEFT JOIN public.schools s ON cl.school_id = s.id
        LEFT JOIN public.boards b ON (cl.board_id = b.id OR s.board_id = b.id)
        LEFT JOIN public.projects pr ON (b.project_id = pr.id OR s.project_id = pr.id)
        LEFT JOIN public.cities c ON (pr.city_id = c.id OR b.city_id = c.id OR s.city_id = c.id)
        LEFT JOIN public.regions r ON (c.region_id = r.id OR pr.region_id = r.id OR b.region_id = r.id OR s.region_id = r.id)
        LEFT JOIN public.countries co ON (r.country_id = co.id OR c.country_id = co.id OR pr.country_id = co.id OR b.country_id = co.id OR s.country_id = co.id)
        WHERE p.role = 'student'
        AND (filter_country_id IS NULL OR co.id = filter_country_id)
        AND (filter_region_id IS NULL OR r.id = filter_region_id)
        AND (filter_city_id IS NULL OR c.id = filter_city_id)
        AND (filter_project_id IS NULL OR pr.id = filter_project_id)
        AND (filter_board_id IS NULL OR b.id = filter_board_id)
        AND (filter_school_id IS NULL OR s.id = filter_school_id)
        AND (filter_grade IS NULL OR cl.grade = filter_grade)
        AND (filter_class_id IS NULL OR cl.id = filter_class_id)
    ),
    students_in_courses AS (
        SELECT DISTINCT cm.user_id
        FROM public.course_members cm
        WHERE cm.course_id IN (SELECT course_id FROM teacher_courses)
        AND cm.role = 'student'
        AND cm.user_id IN (SELECT user_id FROM filtered_students)
    ),
    progress_data AS (
        SELECT
            ucip.user_id,
            ucip.course_id,
            ucip.status
        FROM public.user_content_item_progress ucip
        WHERE ucip.course_id IN (SELECT course_id FROM teacher_courses)
        AND ucip.user_id IN (SELECT user_id FROM students_in_courses)
        AND ucip.updated_at >= date_start
    ),
    assignment_data AS (
        SELECT
            asub.status
        FROM public.assignment_submissions asub
        JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
        JOIN public.course_lessons cl ON clc.lesson_id = cl.id
        JOIN public.course_sections cs ON cl.section_id = cs.id
        WHERE cs.course_id IN (SELECT course_id FROM teacher_courses)
        AND asub.user_id IN (SELECT user_id FROM students_in_courses)
        AND asub.submitted_at >= date_start
    )
    SELECT
        (SELECT count(*) FROM students_in_courses)::INTEGER AS total_students,
        (SELECT count(DISTINCT user_id) FROM progress_data)::INTEGER AS active_students,
        CASE
            WHEN (SELECT count(*) FROM students_in_courses) > 0 THEN
                ((SELECT count(DISTINCT user_id) FROM progress_data)::decimal / (SELECT count(*) FROM students_in_courses) * 100)::integer
            ELSE 0
        END AS engagement_rate,
        CASE
            WHEN (SELECT count(*) FROM progress_data) > 0 THEN
                ((SELECT count(*) FROM progress_data WHERE status = 'completed')::decimal / (SELECT count(*) FROM progress_data) * 100)::integer
            ELSE 0
        END AS avg_completion_rate,
        (SELECT count(*) FROM assignment_data)::INTEGER AS total_assignments,
        (SELECT count(*) FROM assignment_data WHERE status = 'pending')::INTEGER AS pending_assignments,
        CASE
            WHEN (SELECT count(*) FROM assignment_data) > 0 THEN
                (((SELECT count(*) FROM assignment_data) - (SELECT count(*) FROM assignment_data WHERE status = 'pending'))::decimal / (SELECT count(*) FROM assignment_data) * 100)::integer
            ELSE 0
        END AS completion_rate;
END;
$$;


ALTER FUNCTION "public"."get_teacher_engagement_metrics_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_teacher_engagement_metrics_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") IS 'Get teacher engagement metrics with hierarchical and grade filtering';



CREATE OR REPLACE FUNCTION "public"."get_teacher_overall_metrics"("p_teacher_id" "uuid") RETURNS TABLE("total_students" integer, "active_students" integer, "average_completion" integer, "average_score" integer, "courses_published" integer, "total_assignments" integer, "total_enrollments" integer, "average_engagement" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH teacher_courses AS (
    SELECT DISTINCT cm.course_id
    FROM public.course_members cm
    WHERE cm.user_id = p_teacher_id AND cm.role = 'teacher'
  ),
  students_in_courses AS (
    SELECT DISTINCT cm.user_id, cm.course_id
    FROM public.course_members cm
    WHERE cm.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND cm.role = 'student'
  ),
  course_content_totals AS (
    SELECT
      cs.course_id,
      COUNT(clc.id) AS total_content_items
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
    GROUP BY cs.course_id
  ),
  student_progress_by_course AS (
    SELECT
      sic.user_id,
      sic.course_id,
      cct.total_content_items,
      COUNT(ucip.id) AS completed_content_items
    FROM students_in_courses sic
    JOIN course_content_totals cct ON sic.course_id = cct.course_id
    LEFT JOIN public.user_content_item_progress ucip ON sic.user_id = ucip.user_id
      AND sic.course_id = ucip.course_id
      AND ucip.status = 'completed'
    GROUP BY sic.user_id, sic.course_id, cct.total_content_items
  ),
  student_completion_rates AS (
    SELECT
      spc.user_id,
      AVG(CASE 
        WHEN spc.total_content_items > 0 THEN (spc.completed_content_items::decimal / spc.total_content_items) * 100
        ELSE 0 
      END)::integer as completion_rate
    FROM student_progress_by_course spc
    GROUP BY spc.user_id
  ),
  active_students AS (
    SELECT
      COUNT(DISTINCT ucip.user_id) as active_count
    FROM public.user_content_item_progress ucip
    WHERE ucip.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND ucip.updated_at > NOW() - INTERVAL '30 days'
  ),
  assignment_submissions AS (
    SELECT
      COUNT(asub.id) as total_submissions,
      AVG(asub.grade)::integer as avg_score
    FROM public.assignment_submissions asub
    JOIN public.course_lesson_content clc ON asub.assignment_id = clc.id
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND asub.grade IS NOT NULL
  ),
  course_assignments AS (
    SELECT
      COUNT(clc.id) as assignment_count
    FROM public.course_lesson_content clc
    JOIN public.course_lessons cl ON clc.lesson_id = cl.id
    JOIN public.course_sections cs ON cl.section_id = cs.id
    WHERE cs.course_id IN (SELECT tc.course_id FROM teacher_courses tc)
      AND clc.content_type = 'assignment'
  )
  SELECT
    (SELECT COUNT(DISTINCT user_id) FROM students_in_courses)::integer as total_students,
    COALESCE((SELECT active_count FROM active_students), 0)::integer as active_students,
    COALESCE((SELECT AVG(completion_rate)::integer FROM student_completion_rates), 0)::integer as average_completion,
    COALESCE((SELECT avg_score FROM assignment_submissions), 0)::integer as average_score,
    (SELECT COUNT(*) FROM teacher_courses)::integer as courses_published,
    COALESCE((SELECT assignment_count FROM course_assignments), 0)::integer as total_assignments,
    (SELECT COUNT(*) FROM students_in_courses)::integer as total_enrollments,
    CASE 
      WHEN (SELECT COUNT(DISTINCT user_id) FROM students_in_courses) > 0 THEN
        ROUND((COALESCE((SELECT active_count FROM active_students), 0)::decimal / (SELECT COUNT(DISTINCT user_id) FROM students_in_courses)) * 100)::integer
      ELSE 0 
    END as average_engagement;
END;
$$;


ALTER FUNCTION "public"."get_teacher_overall_metrics"("p_teacher_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_text_answer_grades"("submission_id" "uuid") RETURNS TABLE("question_id" "uuid", "question_text" "text", "question_position" integer, "grade" numeric, "feedback" "text", "graded_by" "uuid", "graded_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qq.id as question_id,
    qq.question_text,
    qq.position as question_position,
    tag.grade,
    tag.feedback,
    tag.graded_by,
    tag.graded_at
  FROM quiz_questions qq
  LEFT JOIN text_answer_grades tag ON qq.id = tag.question_id AND tag.quiz_submission_id = submission_id
  WHERE qq.lesson_content_id = (
    SELECT lesson_content_id FROM quiz_submissions WHERE id = submission_id
  )
  AND qq.question_type = 'text_answer'
  ORDER BY qq.position;
END;
$$;


ALTER FUNCTION "public"."get_text_answer_grades"("submission_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_topics_for_exercise_full"("stage_num" integer, "exercise_num" integer) RETURNS TABLE("topic_id" integer, "topic_number" integer, "title" "text", "title_urdu" "text", "description" "text", "topic_data" "jsonb", "topic_order" integer, "category" "text", "difficulty" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.topic_number,
        t.title,
        t.title_urdu,
        t.description,
        t.topic_data,
        t.topic_order,
        t.category,
        t.difficulty
    FROM public.ai_tutor_content_hierarchy t
    WHERE t.level = 'topic' 
    AND t.parent_id = (
        SELECT id FROM public.ai_tutor_content_hierarchy 
        WHERE level = 'exercise' 
        AND parent_id = (
            SELECT id FROM public.ai_tutor_content_hierarchy 
            WHERE level = 'stage' AND stage_number = stage_num
        )
        AND exercise_number = exercise_num
    )
    ORDER BY t.topic_order;
END;
$$;


ALTER FUNCTION "public"."get_topics_for_exercise_full"("stage_num" integer, "exercise_num" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_accessible_quizzes"("input_user_id" "uuid") RETURNS TABLE("id" "uuid", "title" "text", "description" "text", "instructions" "text", "time_limit_minutes" integer, "max_attempts" integer, "passing_score" numeric, "shuffle_questions" boolean, "shuffle_options" boolean, "show_correct_answers" boolean, "show_results_immediately" boolean, "allow_retake" boolean, "retry_settings" "jsonb", "status" "text", "visibility" "text", "tags" "text"[], "difficulty_level" "text", "estimated_duration_minutes" integer, "author_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "published_at" timestamp with time zone, "role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sq.id,
    sq.title,
    sq.description,
    sq.instructions,
    sq.time_limit_minutes,
    sq.max_attempts,
    sq.passing_score,
    sq.shuffle_questions,
    sq.shuffle_options,
    sq.show_correct_answers,
    sq.show_results_immediately,
    sq.allow_retake,
    sq.retry_settings,
    sq.status,
    sq.visibility,
    sq.tags,
    sq.difficulty_level,
    sq.estimated_duration_minutes,
    sq.author_id,
    sq.created_at,
    sq.updated_at,
    sq.published_at,
    COALESCE(qm.role, 'author'::text) as role
  FROM public.standalone_quizzes sq
  LEFT JOIN public.quiz_members qm ON qm.quiz_id = sq.id AND qm.user_id = input_user_id
  WHERE 
    (
      -- User is the author (can see their own quizzes regardless of status)
      sq.author_id = input_user_id
      OR
      -- User is a member of the quiz AND quiz is published
      (qm.user_id IS NOT NULL AND sq.status = 'published')
      OR
      -- User is admin or teacher (can see all quizzes regardless of status)
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = input_user_id AND p.role IN ('admin', 'teacher')
      )
    )
  ORDER BY sq.updated_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_accessible_quizzes"("input_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_accessible_quizzes"("input_user_id" "uuid") IS 'Gets quizzes accessible to a user - students only see published quizzes, teachers/admins see all';



CREATE OR REPLACE FUNCTION "public"."get_user_analytics_data"("time_range" "text") RETURNS TABLE("period_label" "text", "active_users" integer, "new_signups" integer, "churn_rate" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  start_date TIMESTAMP;
  end_date TIMESTAMP;
  interval_type TEXT;
BEGIN
  -- Set date range based on time_range parameter
  CASE time_range
    WHEN '7days' THEN
      start_date := NOW() - INTERVAL '7 days';
      interval_type := 'day';
    WHEN '30days' THEN
      start_date := NOW() - INTERVAL '30 days';
      interval_type := 'day';
    WHEN '3months' THEN
      start_date := NOW() - INTERVAL '3 months';
      interval_type := 'month';
    WHEN '6months' THEN
      start_date := NOW() - INTERVAL '6 months';
      interval_type := 'month';
    WHEN '1year' THEN
      start_date := NOW() - INTERVAL '1 year';
      interval_type := 'month';
    ELSE -- alltime
      start_date := NOW() - INTERVAL '2 years';
      interval_type := 'quarter';
  END CASE;
  
  end_date := NOW();

  RETURN QUERY
  WITH periods AS (
    SELECT generate_series(
      date_trunc(interval_type, start_date),
      date_trunc(interval_type, end_date),
      (CASE WHEN interval_type = 'quarter' THEN '3 months' ELSE '1 ' || interval_type END)::interval
    ) as period
  ),
  active_users_by_period AS (
    SELECT
      date_trunc(interval_type, ucp.updated_at) as period,
      COUNT(DISTINCT ucp.user_id) as value
    FROM public.user_content_item_progress ucp
    WHERE ucp.updated_at BETWEEN start_date AND end_date
    GROUP BY 1
  ),
  new_signups_by_period AS (
    SELECT
      date_trunc(interval_type, prof.created_at) as period,
      COUNT(prof.id) as value
    FROM public.profiles prof
    WHERE prof.created_at BETWEEN start_date AND end_date
    GROUP BY 1
  )
  SELECT
    TO_CHAR(p.period, 
      CASE 
        WHEN interval_type = 'day' THEN 'YYYY-MM-DD'
        WHEN interval_type = 'month' THEN 'YYYY-Mon'
        WHEN interval_type = 'quarter' THEN 'YYYY "Q"Q'
      END
    ) AS period_label,
    COALESCE(au.value, 0)::INTEGER AS active_users,
    COALESCE(ns.value, 0)::INTEGER AS new_signups,
    0 AS churn_rate -- Churn rate calculation can be added here later
  FROM periods p
  LEFT JOIN active_users_by_period au ON p.period = au.period
  LEFT JOIN new_signups_by_period ns ON p.period = ns.period
  ORDER BY p.period;
END;
$$;


ALTER FUNCTION "public"."get_user_analytics_data"("time_range" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_classes"("user_uuid" "uuid", "user_role" "text") RETURNS TABLE("class_id" "uuid", "class_name" character varying, "class_code" character varying, "grade" character varying, "school_name" character varying, "board_name" character varying, "role_in_class" character varying, "enrollment_status" character varying, "academic_year" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF user_role = 'teacher' THEN
        RETURN QUERY
        SELECT 
            c.id as class_id,
            c.name as class_name,
            c.code as class_code,
            c.grade,
            s.name as school_name,
            b.name as board_name,
            ct.role as role_in_class,
            NULL::VARCHAR as enrollment_status,
            c.academic_year
        FROM public.classes c
        JOIN public.schools s ON c.school_id = s.id
        JOIN public.boards b ON c.board_id = b.id
        JOIN public.class_teachers ct ON c.id = ct.class_id
        WHERE ct.teacher_id = user_uuid;
    ELSIF user_role = 'student' THEN
        RETURN QUERY
        SELECT 
            c.id as class_id,
            c.name as class_name,
            c.code as class_code,
            c.grade,
            s.name as school_name,
            b.name as board_name,
            'student'::VARCHAR as role_in_class,
            cs.enrollment_status,
            c.academic_year
        FROM public.classes c
        JOIN public.schools s ON c.school_id = s.id
        JOIN public.boards b ON c.board_id = b.id
        JOIN public.class_students cs ON c.id = cs.class_id
        WHERE cs.student_id = user_uuid;
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_user_classes"("user_uuid" "uuid", "user_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_course_ids"() RETURNS TABLE("id" "uuid")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT course_id FROM public.course_members WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_course_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_growth_data"("time_range" "text") RETURNS TABLE("period_label" "text", "total_users" bigint, "total_teachers" bigint, "total_students" bigint, "total_admins" bigint, "active_users" bigint)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  start_date TIMESTAMP;
  end_date TIMESTAMP;
  period_type TEXT;
BEGIN
  -- Set date range based on time_range parameter
  CASE time_range
    WHEN '7days' THEN
      start_date := NOW() - INTERVAL '6 days';
      period_type := 'day';
    WHEN '30days' THEN
      start_date := NOW() - INTERVAL '29 days';
      period_type := 'day';
    WHEN '3months' THEN
      start_date := date_trunc('month', NOW() - INTERVAL '2 months');
      period_type := 'month';
    WHEN '6months' THEN
      start_date := date_trunc('month', NOW() - INTERVAL '5 months');
      period_type := 'month';
    WHEN '1year' THEN
      start_date := date_trunc('month', NOW() - INTERVAL '11 months');
      period_type := 'month';
    ELSE -- alltime
      start_date := date_trunc('month', NOW() - INTERVAL '11 months');
      period_type := 'month';
  END CASE;
  
  end_date := NOW();

  RETURN QUERY
  WITH periods AS (
    SELECT generate_series(
      date_trunc(period_type, start_date),
      date_trunc(period_type, end_date),
      ('1 ' || period_type)::interval
    ) as period
  ),
  user_creations_by_period AS (
      SELECT
          date_trunc(period_type, created_at) AS period,
          COUNT(*) FILTER (WHERE role = 'teacher') as new_teachers,
          COUNT(*) FILTER (WHERE role = 'student') as new_students,
          COUNT(*) FILTER (WHERE role = 'admin') as new_admins
      FROM public.profiles
      GROUP BY period
  ),
  user_activity_by_period AS (
      SELECT
          date_trunc(period_type, updated_at) AS period,
          COUNT(DISTINCT user_id) as active_users_in_period
      FROM public.user_content_item_progress
      GROUP BY period
  )
  SELECT
      TO_CHAR(p.period, 
        CASE 
          WHEN period_type = 'day' THEN 'Mon DD'
          ELSE 'Mon'
        END
      ) as period_label,
      (SUM(COALESCE(uc.new_teachers, 0) + COALESCE(uc.new_students, 0) + COALESCE(uc.new_admins, 0)) OVER (ORDER BY p.period ASC))::BIGINT as total_users,
      (SUM(COALESCE(uc.new_teachers, 0)) OVER (ORDER BY p.period ASC))::BIGINT as total_teachers,
      (SUM(COALESCE(uc.new_students, 0)) OVER (ORDER BY p.period ASC))::BIGINT as total_students,
      (SUM(COALESCE(uc.new_admins, 0)) OVER (ORDER BY p.period ASC))::BIGINT as total_admins,
      (SUM(COALESCE(ua.active_users_in_period, 0)) OVER (ORDER BY p.period ASC))::BIGINT as active_users
  FROM periods p
  LEFT JOIN user_creations_by_period uc ON uc.period = p.period
  LEFT JOIN user_activity_by_period ua ON ua.period = p.period
  ORDER BY p.period;

END;
$$;


ALTER FUNCTION "public"."get_user_growth_data"("time_range" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_quiz_attempt_history"("p_user_id" "uuid", "p_lesson_content_id" "uuid") RETURNS TABLE("attempt_number" integer, "submitted_at" timestamp with time zone, "score" numeric, "manual_grading_required" boolean, "manual_grading_completed" boolean, "manual_grading_score" numeric, "retry_reason" "text", "answers" "jsonb", "results" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qs.attempt_number,
        qs.submitted_at,
        qs.score,
        qs.manual_grading_required,
        qs.manual_grading_completed,
        qs.manual_grading_score,
        qs.retry_reason,
        qs.answers,
        qs.results
    FROM quiz_submissions qs
    WHERE qs.user_id = p_user_id
    AND qs.lesson_content_id = p_lesson_content_id
    ORDER BY qs.attempt_number;
END;
$$;


ALTER FUNCTION "public"."get_user_quiz_attempt_history"("p_user_id" "uuid", "p_lesson_content_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_quiz_attempts"("input_user_id" "uuid", "input_quiz_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "quiz_id" "uuid", "user_id" "uuid", "attempt_number" integer, "answers" "jsonb", "results" "jsonb", "score" numeric, "time_taken_minutes" integer, "submitted_at" timestamp with time zone, "retry_reason" "text", "teacher_approval_required" boolean, "teacher_approved" boolean, "teacher_approved_by" "uuid", "teacher_approved_at" timestamp with time zone, "teacher_approval_notes" "text", "study_materials_completed" boolean, "study_materials_completed_at" timestamp with time zone, "ip_address" "inet", "user_agent" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "started_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sqa.id,
    sqa.quiz_id,
    sqa.user_id,
    sqa.attempt_number,
    sqa.answers,
    sqa.results,
    sqa.score,
    sqa.time_taken_minutes,
    sqa.submitted_at,
    sqa.retry_reason,
    sqa.teacher_approval_required,
    sqa.teacher_approved,
    sqa.teacher_approved_by,
    sqa.teacher_approved_at,
    sqa.teacher_approval_notes,
    sqa.study_materials_completed,
    sqa.study_materials_completed_at,
    sqa.ip_address,
    sqa.user_agent,
    sqa.created_at,
    sqa.updated_at,
    sqa.created_at as started_at
  FROM public.standalone_quiz_attempts sqa
  WHERE 
    sqa.user_id = input_user_id
    AND (input_quiz_id IS NULL OR sqa.quiz_id = input_quiz_id)
  ORDER BY sqa.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_quiz_attempts"("input_user_id" "uuid", "input_quiz_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_quiz_attempts"("input_user_id" "uuid", "input_quiz_id" "uuid") IS 'Gets user quiz attempts - fixed to handle edge cases';



CREATE OR REPLACE FUNCTION "public"."get_user_quiz_completion_status"("input_user_id" "uuid", "input_quiz_id" "uuid") RETURNS TABLE("quiz_id" "uuid", "user_id" "uuid", "has_attempted" boolean, "total_attempts" bigint, "best_score" numeric, "passed" boolean, "can_retake" boolean, "next_attempt_number" integer, "last_attempt_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sq.id,
    input_user_id,
    (COUNT(sqa.id) > 0) as has_attempted,
    COUNT(sqa.id) as total_attempts,
    MAX(sqa.score) as best_score,
    (MAX(sqa.score) >= sq.passing_score) as passed,
    CASE 
      WHEN sq.allow_retake = true AND COUNT(sqa.id) < sq.max_attempts THEN true
      ELSE false
    END as can_retake,
    (COUNT(sqa.id) + 1) as next_attempt_number,
    MAX(sqa.submitted_at) as last_attempt_at
  FROM public.standalone_quizzes sq
  LEFT JOIN public.standalone_quiz_attempts sqa ON sq.id = sqa.quiz_id 
    AND sqa.user_id = input_user_id
  WHERE sq.id = input_quiz_id
  GROUP BY sq.id, sq.passing_score, sq.allow_retake, sq.max_attempts;
END;
$$;


ALTER FUNCTION "public"."get_user_quiz_completion_status"("input_user_id" "uuid", "input_quiz_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_quiz_completion_status"("input_user_id" "uuid", "input_quiz_id" "uuid") IS 'Gets completion status of a quiz for a user';



CREATE OR REPLACE FUNCTION "public"."get_user_quiz_history"("input_user_id" "uuid", "limit_count" integer DEFAULT 50) RETURNS TABLE("quiz_id" "uuid", "quiz_title" "text", "quiz_status" "text", "quiz_visibility" "text", "attempt_id" "uuid", "attempt_number" integer, "score" numeric, "time_taken_minutes" integer, "submitted_at" timestamp with time zone, "can_retake" boolean, "author_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sq.id,
    sq.title,
    sq.status,
    sq.visibility,
    sqa.id,
    sqa.attempt_number,
    sqa.score,
    sqa.time_taken_minutes,
    sqa.submitted_at,
    CASE 
      WHEN sq.allow_retake = true AND sqa.attempt_number < sq.max_attempts THEN true
      ELSE false
    END as can_retake,
    p.first_name || ' ' || p.last_name as author_name
  FROM public.standalone_quiz_attempts sqa
  JOIN public.standalone_quizzes sq ON sq.id = sqa.quiz_id
  JOIN public.profiles p ON p.id = sq.author_id
  WHERE sqa.user_id = input_user_id
  ORDER BY sqa.submitted_at DESC
  LIMIT limit_count;
END;
$$;


ALTER FUNCTION "public"."get_user_quiz_history"("input_user_id" "uuid", "limit_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_quiz_history"("input_user_id" "uuid", "limit_count" integer) IS 'Gets quiz history for a user';



CREATE OR REPLACE FUNCTION "public"."get_users_with_mfa_status"("search_term" "text" DEFAULT NULL::"text", "page_number" integer DEFAULT 1, "page_size" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "role" "text", "mfa_enabled" boolean, "created_at" timestamp with time zone, "total_count" bigint)
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
  
  -- Check if current user is admin (using profiles table)
  SELECT p.role INTO current_user_role 
  FROM profiles p
  WHERE p.id = auth.uid();
  
  -- Only allow admins to access this function
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Get total count
  SELECT COUNT(*) INTO total_count_val
  FROM profiles p
  WHERE (search_term IS NULL OR 
         p.email ILIKE '%' || search_term || '%' OR
         p.first_name ILIKE '%' || search_term || '%' OR
         p.last_name ILIKE '%' || search_term || '%');
  
  -- Return paginated results with simple MFA status check
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.role::TEXT,
    -- Simple MFA status check - just use profiles metadata
    COALESCE((p.metadata->>'mfa_enabled')::boolean, false) as mfa_enabled,
    p.created_at,
    total_count_val
  FROM profiles p
  WHERE (search_term IS NULL OR 
         p.email ILIKE '%' || search_term || '%' OR
         p.first_name ILIKE '%' || search_term || '%' OR
         p.last_name ILIKE '%' || search_term || '%')
  ORDER BY p.created_at DESC
  LIMIT page_size
  OFFSET offset_val;
  
  -- Set the total_count for all rows
  total_count := total_count_val;
END;
$$;


ALTER FUNCTION "public"."get_users_with_mfa_status"("search_term" "text", "page_number" integer, "page_size" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_users_with_mfa_status"("search_term" "text", "page_number" integer, "page_size" integer) IS 'Get users with MFA status for admin panel - simple version that works reliably';



CREATE OR REPLACE FUNCTION "public"."handle_deleted_published_course"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- This function is triggered when a row in 'courses' is about to be deleted.
  -- 'OLD' refers to the course that is being deleted.
  -- We find all other courses (drafts) that reference the course being deleted
  -- and set their 'published_course_id' to NULL.
  UPDATE public.courses
  SET published_course_id = NULL
  WHERE published_course_id = OLD.id;

  RETURN OLD; -- Proceed with the DELETE operation
END;
$$;


ALTER FUNCTION "public"."handle_deleted_published_course"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, email, first_name, last_name, role, grade, teacher_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    (new.raw_user_meta_data ->> 'role')::app_role, -- Cast the role
    new.raw_user_meta_data ->> 'grade',           -- Get grade
    new.raw_user_meta_data ->> 'teacher_id'       -- Get teacher_id
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_course_progress_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_course_progress_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_user_progress"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Initialize user progress summary
    INSERT INTO public.ai_tutor_user_progress_summary (
        user_id,
        current_stage,
        current_exercise,
        urdu_enabled,
        unlocked_stages,
        unlocked_exercises
    ) VALUES (
        NEW.id,
        1,
        1,
        TRUE,
        ARRAY[1],
        '{"1": [1]}'::jsonb
    );
    
    -- Initialize stage progress for stage 1
    INSERT INTO public.ai_tutor_user_stage_progress (
        user_id,
        stage_id,
        started_at
    ) VALUES (
        NEW.id,
        1,
        NOW()
    );
    
    -- Initialize exercise progress for stage 1 exercises
    INSERT INTO public.ai_tutor_user_exercise_progress (
        user_id,
        stage_id,
        exercise_id,
        started_at
    ) VALUES 
        (NEW.id, 1, 1, NOW()),
        (NEW.id, 1, 2, NOW()),
        (NEW.id, 1, 3, NOW());
    
    -- Initialize learning unlocks
    INSERT INTO public.ai_tutor_learning_unlocks (
        user_id,
        stage_id,
        exercise_id,
        is_unlocked,
        unlock_criteria_met
    ) VALUES 
        (NEW.id, 1, NULL, TRUE, TRUE),
        (NEW.id, 1, 1, TRUE, TRUE),
        (NEW.id, 1, 2, FALSE, FALSE),
        (NEW.id, 1, 3, FALSE, FALSE);
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."initialize_user_progress"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND TRIM(LOWER(role::text)) = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_user"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Direct query without triggering RLS
  SELECT role INTO user_role 
  FROM profiles 
  WHERE id = user_id;
  
  RETURN user_role = 'admin';
END;
$$;


ALTER FUNCTION "public"."is_admin_user"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_author_of_course"("course_id_to_check" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.courses
    where id = course_id_to_check
      and author_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_author_of_course"("course_id_to_check" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_course_author"("p_course_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = p_course_id AND author_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_course_author"("p_course_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_teacher"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND TRIM(LOWER(role::text)) = 'teacher'
  );
$$;


ALTER FUNCTION "public"."is_teacher"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_teacher_for_course"("p_course_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_members
    WHERE course_id = p_course_id AND user_id = auth.uid() AND role = 'teacher'
  );
$$;


ALTER FUNCTION "public"."is_teacher_for_course"("p_course_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_access_attempt"("p_action" character varying, "p_status" character varying, "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_user_email" "text" DEFAULT NULL::"text", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text", "p_location" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO access_logs (
        user_id,
        user_email,
        action,
        ip_address,
        user_agent,
        location,
        status,
        metadata
    ) VALUES (
        p_user_id,
        p_user_email,
        p_action,
        p_ip_address,
        p_user_agent,
        p_location,
        p_status,
        p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;


ALTER FUNCTION "public"."log_access_attempt"("p_action" character varying, "p_status" character varying, "p_user_id" "uuid", "p_user_email" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_location" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_debug_message"("message" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Log to PostgreSQL logs (visible in Supabase logs)
  RAISE NOTICE 'DEBUG: %', message;
END;
$$;


ALTER FUNCTION "public"."log_debug_message"("message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_login_attempt"("p_email" "text", "p_success" boolean, "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text", "p_failure_reason" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO login_attempts (
        email,
        ip_address,
        user_agent,
        success,
        failure_reason,
        metadata
    ) VALUES (
        p_email,
        p_ip_address,
        p_user_agent,
        p_success,
        p_failure_reason,
        p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;


ALTER FUNCTION "public"."log_login_attempt"("p_email" "text", "p_success" boolean, "p_ip_address" "inet", "p_user_agent" "text", "p_failure_reason" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_assignment_complete"("p_student_id" "uuid", "p_course_id" "uuid", "p_lesson_id" "uuid", "p_content_item_id" "uuid", "p_teacher_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  is_authorized BOOLEAN;
  user_role TEXT;
BEGIN
  -- First check if the user is an admin
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = p_teacher_id;
  
  -- If user is admin, they are always authorized
  IF user_role = 'admin' THEN
    is_authorized := TRUE;
  ELSE
    -- Check if the calling user is a teacher for the specified course
    SELECT EXISTS (
      SELECT 1
      FROM public.course_members
      WHERE course_id = p_course_id
        AND user_id = p_teacher_id
        AND role = 'teacher'
    ) INTO is_authorized;
  END IF;

  IF is_authorized THEN
    -- If the user is authorized (admin or teacher), upsert the progress for the student
    INSERT INTO public.user_content_item_progress (
        user_id,
        course_id,
        lesson_id,
        lesson_content_id,
        status,
        completed_at
    )
    VALUES (
        p_student_id,
        p_course_id,
        p_lesson_id,
        p_content_item_id,
        'completed',
        now()
    )
    ON CONFLICT (user_id, lesson_content_id) DO UPDATE SET
        status = 'completed',
        completed_at = now();
  ELSE
    -- If the user is not authorized, raise an exception
    RAISE EXCEPTION 'User is not an authorized teacher or admin for this course';
  END IF;
END;
$$;


ALTER FUNCTION "public"."mark_assignment_complete"("p_student_id" "uuid", "p_course_id" "uuid", "p_lesson_id" "uuid", "p_content_item_id" "uuid", "p_teacher_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mark_assignment_complete"("p_student_id" "uuid", "p_course_id" "uuid", "p_lesson_id" "uuid", "p_content_item_id" "uuid", "p_teacher_id" "uuid") IS 'Mark assignment as complete - allows both teachers (for their courses) and admins (for any course)';



CREATE OR REPLACE FUNCTION "public"."perform_expired_blocks_cleanup"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    -- Update expired blocks to inactive
    UPDATE blocked_users 
    SET is_active = FALSE
    WHERE blocked_until < NOW() 
    AND is_active = TRUE;
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Log the cleanup
    IF cleaned_count > 0 THEN
        RAISE NOTICE 'Cleaned up % expired blocked users', cleaned_count;
    END IF;
    
    RETURN cleaned_count;
END;
$$;


ALTER FUNCTION "public"."perform_expired_blocks_cleanup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."populate_user_profiles"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Insert basic user info from auth.users
    INSERT INTO public.user_profiles (user_id, display_name, email, phone, role)
    SELECT 
        au.id as user_id,
        COALESCE(au.email, 'Student ' || substring(au.id::text from 1 for 8)) as display_name,
        au.email as email,
        au.phone as phone,
        'student' as role
    FROM auth.users au
    WHERE au.id NOT IN (SELECT user_id FROM public.user_profiles)
    ON CONFLICT (user_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        updated_at = NOW();
    
    RAISE NOTICE 'User profiles populated successfully';
END;
$$;


ALTER FUNCTION "public"."populate_user_profiles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."populate_user_profiles_simple"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_record RECORD;
    display_name_val TEXT;
    first_name_val TEXT;
    last_name_val TEXT;
    updated_count INTEGER := 0;
BEGIN
    -- Loop through all users in auth.users
    FOR user_record IN 
        SELECT id, email, phone FROM auth.users
    LOOP
        -- Try to get names safely
        BEGIN
            -- Try to get first_name and last_name from metadata
            SELECT 
                raw_user_meta_data->>'first_name',
                raw_user_meta_data->>'last_name'
            INTO first_name_val, last_name_val
            FROM auth.users 
            WHERE id = user_record.id;
        EXCEPTION
            WHEN OTHERS THEN
                first_name_val := NULL;
                last_name_val := NULL;
        END;
        
        -- Create display name from first_name + last_name
        IF first_name_val IS NOT NULL AND last_name_val IS NOT NULL 
           AND first_name_val != '' AND last_name_val != '' THEN
            display_name_val := first_name_val || ' ' || last_name_val;
        ELSIF first_name_val IS NOT NULL AND first_name_val != '' THEN
            display_name_val := first_name_val;
        ELSIF last_name_val IS NOT NULL AND last_name_val != '' THEN
            display_name_val := last_name_val;
        ELSE
            -- Fallback: create name from email
            IF user_record.email ~ '^[a-zA-Z]+\.?[a-zA-Z]*@' THEN
                display_name_val := INITCAP(
                    REPLACE(
                        SPLIT_PART(user_record.email, '@', 1),
                        '.', ' '
                    )
                );
            ELSE
                display_name_val := INITCAP(SPLIT_PART(user_record.email, '@', 1));
            END IF;
        END IF;
        
        -- Insert or update user profile
        INSERT INTO public.user_profiles (user_id, display_name, first_name, last_name, email, phone, role)
        VALUES (
            user_record.id,
            display_name_val,
            first_name_val,
            last_name_val,
            user_record.email,
            user_record.phone,
            'student'
        )
        ON CONFLICT (user_id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            updated_at = NOW();
        
        updated_count := updated_count + 1;
        RAISE NOTICE 'Added/Updated user: % -> %', user_record.email, display_name_val;
    END LOOP;
    
    RAISE NOTICE 'User profiles populated successfully. % users processed.', updated_count;
END;
$$;


ALTER FUNCTION "public"."populate_user_profiles_simple"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."publish_draft"("draft_id_in" "uuid", "published_id_in" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  rec_section record;
  rec_lesson record;
  rec_content_item record;
  rec_question record;
  rec_option record;

  match_section_id uuid;
  match_lesson_id uuid;
  match_content_item_id uuid;
  match_question_id uuid;

  active_section_ids uuid[] := ARRAY[]::uuid[];
  active_lesson_ids uuid[] := ARRAY[]::uuid[];
  active_content_item_ids uuid[] := ARRAY[]::uuid[];
  active_question_ids uuid[] := ARRAY[]::uuid[];
  active_option_ids uuid[] := ARRAY[]::uuid[];

BEGIN
  -- Add debugging for function parameters
  RAISE NOTICE 'publish_draft called with draft_id_in: %, published_id_in: %', draft_id_in, published_id_in;
  
  -- Special handling for when draft and published are the same course
  -- This happens when admin unpublishes and republishes the same course
  IF draft_id_in = published_id_in THEN
    RAISE NOTICE 'Same course scenario detected - this should not happen in normal flow';
    RAISE NOTICE 'The frontend should handle same-course scenario by just updating status';
    RAISE EXCEPTION 'Same course scenario detected - this should be handled by frontend';
  END IF;

  -- Update the published course's main details from the draft
  -- INCLUDING the new fields: country_ids, region_ids, city_ids, project_ids, board_ids, class_ids, school_ids
  UPDATE public.courses
  SET
      title = draft.title,
      subtitle = draft.subtitle,
      description = draft.description,
      category_id = draft.category_id,
      language_id = draft.language_id,
      level_id = draft.level_id,
      image_url = draft.image_url,
      duration = draft.duration,
      requirements = draft.requirements,
      learning_outcomes = draft.learning_outcomes,
      -- NEW FIELDS: Sync the additional metadata fields (using correct column names with _ids suffix)
      country_ids = draft.country_ids,
      region_ids = draft.region_ids,
      city_ids = draft.city_ids,
      project_ids = draft.project_ids,
      board_ids = draft.board_ids,
      school_ids = draft.school_ids,
      class_ids = draft.class_ids,
      updated_at = now()
  FROM public.courses AS draft
  WHERE
      courses.id = published_id_in AND draft.id = draft_id_in;

  -- Synchronize curriculum by looping through the DRAFT and updating/inserting into the PUBLISHED course
  FOR rec_section IN SELECT * FROM public.course_sections WHERE course_id = draft_id_in ORDER BY position LOOP
    SELECT id INTO match_section_id FROM public.course_sections WHERE course_id = published_id_in AND position = rec_section.position;

    IF match_section_id IS NOT NULL THEN
      UPDATE public.course_sections SET title = rec_section.title, overview = rec_section.overview WHERE id = match_section_id;
    ELSE
      INSERT INTO public.course_sections (course_id, title, overview, position)
      VALUES (published_id_in, rec_section.title, rec_section.overview, rec_section.position)
      RETURNING id INTO match_section_id;
    END IF;
    active_section_ids := array_append(active_section_ids, match_section_id);

    FOR rec_lesson IN SELECT * FROM public.course_lessons WHERE section_id = rec_section.id ORDER BY position LOOP
      SELECT id INTO match_lesson_id FROM public.course_lessons WHERE section_id = match_section_id AND position = rec_lesson.position;
      
      IF match_lesson_id IS NOT NULL THEN
        UPDATE public.course_lessons SET title = rec_lesson.title, overview = rec_lesson.overview WHERE id = match_lesson_id;
      ELSE
        INSERT INTO public.course_lessons (section_id, title, overview, "position")
        VALUES (match_section_id, rec_lesson.title, rec_lesson.overview, rec_lesson.position)
        RETURNING id INTO match_lesson_id;
      END IF;
      active_lesson_ids := array_append(active_lesson_ids, match_lesson_id);

      FOR rec_content_item IN SELECT * FROM public.course_lesson_content WHERE lesson_id = rec_lesson.id ORDER BY position LOOP
        -- ULTRA-CONSERVATIVE matching: Try multiple strategies to find existing content items
        -- This ensures we NEVER lose student progress by creating new content items unnecessarily
        
        -- Strategy 1: Try by position (most reliable)
        SELECT id INTO match_content_item_id FROM public.course_lesson_content 
        WHERE lesson_id = match_lesson_id AND position = rec_content_item.position
        AND id NOT IN (SELECT unnest(active_content_item_ids));
        
        -- Strategy 2: If not found by position, try by title and content_type
        IF match_content_item_id IS NULL THEN
          SELECT id INTO match_content_item_id FROM public.course_lesson_content 
          WHERE lesson_id = match_lesson_id 
            AND title = rec_content_item.title 
            AND content_type = rec_content_item.content_type
            AND id NOT IN (SELECT unnest(active_content_item_ids));
        END IF;
        
        -- Strategy 3: If still not found, try by content_path (for files/videos)
        IF match_content_item_id IS NULL AND rec_content_item.content_path IS NOT NULL THEN
          SELECT id INTO match_content_item_id FROM public.course_lesson_content 
          WHERE lesson_id = match_lesson_id 
            AND content_path = rec_content_item.content_path
            AND content_type = rec_content_item.content_type
            AND id NOT IN (SELECT unnest(active_content_item_ids));
        END IF;
        
        -- Strategy 4: If still not found, try by title only (last resort)
        IF match_content_item_id IS NULL THEN
          SELECT id INTO match_content_item_id FROM public.course_lesson_content 
          WHERE lesson_id = match_lesson_id 
            AND title = rec_content_item.title
            AND id NOT IN (SELECT unnest(active_content_item_ids));
        END IF;

        -- Strategy 5: If still not found, check if ANY content item in this lesson has progress
        -- If so, try to reuse the first available content item to preserve progress
        IF match_content_item_id IS NULL THEN
          SELECT id INTO match_content_item_id FROM public.course_lesson_content 
          WHERE lesson_id = match_lesson_id 
            AND id NOT IN (SELECT unnest(active_content_item_ids))
            AND (id IN (SELECT lesson_content_id FROM public.user_content_item_progress WHERE course_id = published_id_in)
                 OR id IN (SELECT lesson_content_id FROM public.quiz_submissions WHERE lesson_content_id IS NOT NULL)
                 OR id IN (SELECT lesson_content_id FROM public.quiz_questions WHERE lesson_content_id IS NOT NULL))
          LIMIT 1;
        END IF;

        IF match_content_item_id IS NOT NULL THEN
          -- Update existing content item (preserves ID and ALL progress)
          UPDATE public.course_lesson_content 
          SET title = rec_content_item.title, 
              content_type = rec_content_item.content_type, 
              content_path = rec_content_item.content_path, 
              due_date = rec_content_item.due_date,
              position = rec_content_item.position  -- Update position if it changed
          WHERE id = match_content_item_id;
        ELSE
          -- ONLY create new content item if absolutely no match found AND no progress exists
          -- This should rarely happen and only for truly new content
          INSERT INTO public.course_lesson_content (lesson_id, title, content_type, content_path, due_date, position)
          VALUES (match_lesson_id, rec_content_item.title, rec_content_item.content_type, rec_content_item.content_path, rec_content_item.due_date, rec_content_item.position)
          RETURNING id INTO match_content_item_id;
        END IF;
        active_content_item_ids := array_append(active_content_item_ids, match_content_item_id);

        -- Handle quiz content - preserve existing quiz structure if possible
        IF rec_content_item.content_type = 'quiz' THEN
          -- Check if there are existing questions for this content item
          IF EXISTS (SELECT 1 FROM public.quiz_questions WHERE lesson_content_id = match_content_item_id) THEN
            -- Update existing quiz questions instead of deleting and recreating
            -- This preserves quiz attempts and progress
            -- Note: This is a simplified approach - in a full implementation, you might want
            -- to do more sophisticated question matching based on question text or position
            NULL; -- Skip quiz recreation to preserve progress
          ELSE
            -- No existing questions, safe to create new ones
            DELETE FROM public.question_options WHERE question_id IN (SELECT id FROM public.quiz_questions WHERE lesson_content_id = match_content_item_id);
            DELETE FROM public.quiz_questions WHERE lesson_content_id = match_content_item_id;

            FOR rec_question IN SELECT * FROM public.quiz_questions WHERE lesson_content_id = rec_content_item.id ORDER BY position LOOP
              INSERT INTO public.quiz_questions (lesson_content_id, question_text, position)
              VALUES (match_content_item_id, rec_question.question_text, rec_question.position)
              RETURNING id INTO match_question_id;

              FOR rec_option IN SELECT * FROM public.question_options WHERE question_id = rec_question.id ORDER BY position LOOP
                INSERT INTO public.question_options (question_id, option_text, is_correct, position)
                VALUES (match_question_id, rec_option.option_text, rec_option.is_correct, rec_option.position);
              END LOOP;
            END LOOP;
          END IF;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  -- Cleanup: Delete items from the published course that are no longer in the draft, with ULTRA-CONSERVATIVE safety checks
  -- Note: This is a cascading-like manual delete, starting from the deepest level.
  -- We are EXTREMELY conservative to ensure we NEVER lose student progress.
  -- We'd rather have orphaned content items than lose student progress.

  -- Delete orphaned content items, but ONLY if they have absolutely NO associated progress or related data.
  -- This is ultra-conservative to ensure we never lose student progress.
  -- We only delete content items that have no progress, no quiz questions, and no quiz submissions.
  DELETE FROM public.course_lesson_content
  WHERE lesson_id IN (SELECT id FROM public.course_lessons WHERE section_id IN (SELECT id FROM public.course_sections WHERE course_id = published_id_in))
    AND id <> ALL(active_content_item_ids)
    AND id NOT IN (SELECT lesson_content_id FROM public.user_content_item_progress WHERE course_id = published_id_in)
    AND id NOT IN (SELECT lesson_content_id FROM public.quiz_questions WHERE lesson_content_id IS NOT NULL)
    AND id NOT IN (SELECT lesson_content_id FROM public.quiz_submissions WHERE lesson_content_id IS NOT NULL);

  -- Delete orphaned lessons (if they have no content items left)
  DELETE FROM public.course_lessons l
  WHERE l.section_id IN (SELECT id FROM public.course_sections WHERE course_id = published_id_in)
    AND l.id <> ALL(active_lesson_ids)
    AND NOT EXISTS (SELECT 1 FROM public.course_lesson_content WHERE lesson_id = l.id);

  -- Delete orphaned sections (if they have no lessons left)
  DELETE FROM public.course_sections s
  WHERE s.course_id = published_id_in
    AND s.id <> ALL(active_section_ids)
    AND NOT EXISTS (SELECT 1 FROM public.course_lessons WHERE section_id = s.id);

  -- Synchronize members
  -- Add new members from draft
  INSERT INTO public.course_members (course_id, user_id, role)
  SELECT published_id_in, user_id, role
  FROM public.course_members draft_members
  WHERE draft_members.course_id = draft_id_in
    AND NOT EXISTS (
      SELECT 1 FROM public.course_members pub_members
      WHERE pub_members.course_id = published_id_in
        AND pub_members.user_id = draft_members.user_id
    );

  -- Remove members who are no longer in the draft
  DELETE FROM public.course_members
  WHERE course_id = published_id_in
    AND user_id NOT IN (
      SELECT user_id FROM public.course_members WHERE course_id = draft_id_in
    );

  -- Finally, delete the draft course itself
  -- (This will only execute if draft_id_in != published_id_in due to the early return above)
  DELETE FROM public.courses WHERE id = draft_id_in;

END;
$$;


ALTER FUNCTION "public"."publish_draft"("draft_id_in" "uuid", "published_id_in" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."publish_draft"("draft_id_in" "uuid", "published_id_in" "uuid") IS 'Safely synchronizes content from a draft course to a published course, preserving student progress and including all metadata fields (country_ids, region_ids, city_ids, project_ids, board_ids, school_ids, class_ids)';



CREATE OR REPLACE FUNCTION "public"."reject_submission"("course_id_in" "uuid", "feedback" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  is_admin_user BOOLEAN;
BEGIN
  -- Verify that the user performing this action is an admin.
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') INTO is_admin_user;
  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Only admins can reject course submissions.';
  END IF;

  -- Update the course status to 'Rejected' and store the feedback.
  UPDATE public.courses
  SET
    status = 'Rejected',
    review_feedback = feedback
  WHERE id = course_id_in AND status = 'Under Review';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Course could not be rejected. It might not be under review.';
  END IF;
END;
$$;


ALTER FUNCTION "public"."reject_submission"("course_id_in" "uuid", "feedback" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_quiz_member"("input_quiz_id" "uuid", "input_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if user has permission to remove members
  IF NOT EXISTS (
    SELECT 1 FROM public.standalone_quizzes sq
    WHERE sq.id = input_quiz_id
    AND (
      sq.author_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to remove quiz members';
  END IF;

  -- Remove quiz member
  DELETE FROM public.quiz_members
  WHERE quiz_id = input_quiz_id AND user_id = input_user_id;

  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."remove_quiz_member"("input_quiz_id" "uuid", "input_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."remove_quiz_member"("input_quiz_id" "uuid", "input_user_id" "uuid") IS 'Removes a member from a quiz';



CREATE OR REPLACE FUNCTION "public"."reset_failed_attempts"("p_email" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Remove user from blocked list if they exist
    UPDATE blocked_users 
    SET is_active = FALSE
    WHERE email = p_email;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."reset_failed_attempts"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."review_retry_request"("p_request_id" "uuid", "p_teacher_id" "uuid", "p_decision" "text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    request_record RECORD;
    result JSONB;
BEGIN
    -- Get the request
    SELECT * INTO request_record
    FROM public.quiz_retry_requests
    WHERE id = p_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request not found or already processed'
        );
    END IF;
    
    -- Update the request
    UPDATE public.quiz_retry_requests
    SET 
        status = p_decision,
        reviewed_by = p_teacher_id,
        reviewed_at = now(),
        review_notes = p_notes
    WHERE id = p_request_id;
    
    -- Update the attempt if approved
    IF p_decision = 'approved' THEN
        UPDATE public.quiz_attempts
        SET 
            teacher_approved = true,
            teacher_approved_by = p_teacher_id,
            teacher_approved_at = now(),
            teacher_approval_notes = p_notes
        WHERE id = request_record.current_attempt_id;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'decision', p_decision,
        'attemptId', request_record.current_attempt_id
    );
END;
$$;


ALTER FUNCTION "public"."review_retry_request"("p_request_id" "uuid", "p_teacher_id" "uuid", "p_decision" "text", "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."review_retry_request"("p_request_id" "uuid", "p_teacher_id" "uuid", "p_decision" "text", "p_notes" "text") IS 'Allows teachers to approve or reject retry requests';



CREATE OR REPLACE FUNCTION "public"."safe_delete_course"("course_id_to_delete" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    course_exists boolean;
    has_progress boolean;
    has_submissions boolean;
BEGIN
    -- Check if course exists
    SELECT EXISTS(SELECT 1 FROM public.courses WHERE id = course_id_to_delete) INTO course_exists;
    
    IF NOT course_exists THEN
        RAISE EXCEPTION 'Course with ID % does not exist', course_id_to_delete;
    END IF;
    
    -- Check if course has any student progress (optional safety check)
    SELECT EXISTS(
        SELECT 1 FROM public.user_content_item_progress 
        WHERE course_id = course_id_to_delete
    ) INTO has_progress;
    
    -- Check if course has any submissions (optional safety check)
    SELECT EXISTS(
        SELECT 1 FROM public.assignment_submissions as2
        JOIN public.course_lesson_content clc ON as2.assignment_id = clc.id
        JOIN public.course_lessons cl ON clc.lesson_id = cl.id
        JOIN public.course_sections cs ON cl.section_id = cs.id
        WHERE cs.course_id = course_id_to_delete
    ) INTO has_submissions;
    
    -- If course has progress or submissions, we might want to warn or prevent deletion
    -- For now, we'll allow deletion but log it
    IF has_progress OR has_submissions THEN
        RAISE NOTICE 'Course % has student progress or submissions. Proceeding with deletion.', course_id_to_delete;
    END IF;
    
    -- Delete the course (this will cascade to related tables due to foreign key constraints)
    DELETE FROM public.courses WHERE id = course_id_to_delete;
    
    -- Check if deletion was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to delete course with ID %', course_id_to_delete;
    END IF;
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise
        RAISE NOTICE 'Error deleting course %: %', course_id_to_delete, SQLERRM;
        RAISE;
END;
$$;


ALTER FUNCTION "public"."safe_delete_course"("course_id_to_delete" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."safe_delete_course"("course_id_to_delete" "uuid") IS 'Safely deletes a course with proper error handling and progress checking';



CREATE OR REPLACE FUNCTION "public"."save_fcm_token"("token_value" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO fcm_tokens (user_id, token)
    VALUES (auth.uid(), token_value)
    ON CONFLICT (user_id, token) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."save_fcm_token"("token_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_math_answer"("submission_id" "uuid", "question_id" "uuid", "latex_expression" "text", "simplified_form" "text" DEFAULT NULL::"text", "is_correct" boolean DEFAULT false, "similarity_score" numeric DEFAULT 0) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  answer_id UUID;
  user_id UUID;
BEGIN
  -- Get user_id from submission
  SELECT qs.user_id INTO user_id
  FROM quiz_submissions qs
  WHERE qs.id = submission_id;
  
  -- Insert math answer
  INSERT INTO quiz_math_answers (
    quiz_submission_id,
    question_id,
    user_id,
    latex_expression,
    simplified_form,
    is_correct,
    similarity_score
  ) VALUES (
    submission_id,
    question_id,
    user_id,
    latex_expression,
    simplified_form,
    is_correct,
    similarity_score
  ) RETURNING id INTO answer_id;
  
  RETURN answer_id;
END;
$$;


ALTER FUNCTION "public"."save_math_answer"("submission_id" "uuid", "question_id" "uuid", "latex_expression" "text", "simplified_form" "text", "is_correct" boolean, "similarity_score" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_math_answer"("submission_id" "uuid", "question_id" "uuid", "latex_expression" "text", "simplified_form" "text" DEFAULT NULL::"text", "is_correct" boolean DEFAULT false, "similarity_score" numeric DEFAULT 0, "drawing_data" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  answer_id UUID;
  user_id UUID;
BEGIN
  -- Get user_id from submission
  SELECT qs.user_id INTO user_id
  FROM quiz_submissions qs
  WHERE qs.id = submission_id;
  
  -- Insert math answer
  INSERT INTO quiz_math_answers (
    quiz_submission_id,
    question_id,
    user_id,
    latex_expression,
    simplified_form,
    is_correct,
    similarity_score
  ) VALUES (
    submission_id,
    question_id,
    user_id,
    latex_expression,
    simplified_form,
    is_correct,
    similarity_score
  ) RETURNING id INTO answer_id;
  
  -- If drawing data is provided, store it in the submission
  IF drawing_data IS NOT NULL THEN
    UPDATE quiz_submissions 
    SET drawing_data = COALESCE(drawing_data::jsonb, '{}'::jsonb) || 
                      jsonb_build_object(question_id::text, drawing_data::jsonb)
    WHERE id = submission_id;
  END IF;
  
  RETURN answer_id;
END;
$$;


ALTER FUNCTION "public"."save_math_answer"("submission_id" "uuid", "question_id" "uuid", "latex_expression" "text", "simplified_form" "text", "is_correct" boolean, "similarity_score" numeric, "drawing_data" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_text_answer_grades"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  grade_record RECORD;
BEGIN
  -- Insert or update grades using UPSERT
  -- This handles duplicates automatically without needing to delete first
  FOR grade_record IN 
    SELECT * FROM jsonb_array_elements(grades_data)
  LOOP
    INSERT INTO text_answer_grades (
      quiz_submission_id,
      question_id,
      grade,
      feedback,
      graded_by
    ) VALUES (
      submission_id,
      (grade_record.value->>'question_id')::UUID,
      (grade_record.value->>'grade')::NUMERIC(5,2),
      grade_record.value->>'feedback',
      teacher_id
    )
    ON CONFLICT (quiz_submission_id, question_id) 
    DO UPDATE SET
      grade = EXCLUDED.grade,
      feedback = EXCLUDED.feedback,
      graded_by = EXCLUDED.graded_by,
      graded_at = NOW();
  END LOOP;
  
  -- Update the main quiz submission with overall score and completion status
  UPDATE quiz_submissions 
  SET 
    manual_grading_completed = TRUE,
    manual_grading_completed_at = NOW(),
    manual_grading_completed_by = teacher_id
  WHERE id = submission_id;
END;
$$;


ALTER FUNCTION "public"."save_text_answer_grades"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_standalone_quizzes"("search_term" "text" DEFAULT ''::"text", "difficulty_filter" "text" DEFAULT ''::"text", "status_filter" "text" DEFAULT ''::"text", "author_filter" "uuid" DEFAULT NULL::"uuid", "limit_count" integer DEFAULT 20, "offset_count" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "title" "text", "description" "text", "status" "text", "visibility" "text", "difficulty_level" "text", "estimated_duration_minutes" integer, "total_questions" bigint, "author_name" "text", "author_email" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "published_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sq.id,
    sq.title,
    sq.description,
    sq.status,
    sq.visibility,
    sq.difficulty_level,
    sq.estimated_duration_minutes,
    COUNT(sqq.id) as total_questions,
    p.first_name || ' ' || p.last_name as author_name,
    p.email as author_email,
    sq.created_at,
    sq.updated_at,
    sq.published_at
  FROM public.standalone_quizzes sq
  JOIN public.profiles p ON p.id = sq.author_id
  LEFT JOIN public.standalone_quiz_questions sqq ON sq.id = sqq.quiz_id
  WHERE 
    (search_term = '' OR sq.title ILIKE '%' || search_term || '%' OR sq.description ILIKE '%' || search_term || '%')
    AND (difficulty_filter = '' OR sq.difficulty_level = difficulty_filter)
    AND (status_filter = '' OR sq.status = status_filter)
    AND (author_filter IS NULL OR sq.author_id = author_filter)
    AND sq.visibility = 'public'
    AND sq.status = 'published'
  GROUP BY sq.id, sq.title, sq.description, sq.status, sq.visibility, 
           sq.difficulty_level, sq.estimated_duration_minutes, p.first_name, p.last_name, p.email,
           sq.created_at, sq.updated_at, sq.published_at
  ORDER BY sq.updated_at DESC
  LIMIT limit_count OFFSET offset_count;
END;
$$;


ALTER FUNCTION "public"."search_standalone_quizzes"("search_term" "text", "difficulty_filter" "text", "status_filter" "text", "author_filter" "uuid", "limit_count" integer, "offset_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_standalone_quizzes"("search_term" "text", "difficulty_filter" "text", "status_filter" "text", "author_filter" "uuid", "limit_count" integer, "offset_count" integer) IS 'Searches for standalone quizzes with filters';



CREATE OR REPLACE FUNCTION "public"."search_topics_by_content"("search_term" "text") RETURNS TABLE("topic_id" integer, "hierarchy_path" "text", "title" "text", "title_urdu" "text", "topic_data" "jsonb", "category" "text", "difficulty" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.hierarchy_path,
        t.title,
        t.title_urdu,
        t.topic_data,
        t.category,
        t.difficulty
    FROM public.ai_tutor_content_hierarchy t
    WHERE t.level = 'topic'
    AND (
        t.title ILIKE '%' || search_term || '%'
        OR t.title_urdu ILIKE '%' || search_term || '%'
        OR t.topic_data::TEXT ILIKE '%' || search_term || '%'
    )
    ORDER BY t.hierarchy_path;
END;
$$;


ALTER FUNCTION "public"."search_topics_by_content"("search_term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_admin_settings_created_by"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_admin_settings_created_by"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_ai_safety_ethics_settings_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Set updated_by and updated_at
    NEW.updated_by = auth.uid();
    NEW.updated_at = NOW();
    
    -- Set created_by on insert
    IF TG_OP = 'INSERT' THEN
        NEW.created_by = auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_ai_safety_ethics_settings_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_ai_tutor_settings_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Set user_id if not provided
    IF NEW.user_id IS NULL THEN
        NEW.user_id = auth.uid();
    END IF;
    
    -- Set updated_by and updated_at
    NEW.updated_by = auth.uid();
    NEW.updated_at = NOW();
    
    -- Set created_by on insert
    IF TG_OP = 'INSERT' THEN
        NEW.created_by = auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_ai_tutor_settings_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_manual_grading_flags"("attempt_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  quiz_has_text_questions BOOLEAN;
BEGIN
  -- Check if the quiz has text answer questions
  SELECT check_standalone_quiz_manual_grading_required(
    (SELECT quiz_id FROM standalone_quiz_attempts WHERE id = attempt_id)
  ) INTO quiz_has_text_questions;
  
  -- Update the attempt with correct manual grading flags
  UPDATE standalone_quiz_attempts 
  SET 
    manual_grading_required = quiz_has_text_questions,
    manual_grading_completed = NOT quiz_has_text_questions,
    score = CASE 
      WHEN quiz_has_text_questions THEN NULL 
      ELSE score 
    END
  WHERE id = attempt_id;
  
  -- Log the action
  RAISE NOTICE 'Updated manual grading flags for attempt %: required=%, completed=%', 
    attempt_id, quiz_has_text_questions, NOT quiz_has_text_questions;
END;
$$;


ALTER FUNCTION "public"."set_manual_grading_flags"("attempt_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_manual_grading_flags"("attempt_id" "uuid") IS 'Manually set manual grading flags for a quiz attempt based on quiz question types';



CREATE OR REPLACE FUNCTION "public"."submit_for_review"("course_id_in" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if the user has permission (is author OR a teacher member)
  -- AND if the course is in a valid state for submission ('Draft' or 'Rejected').
  IF (
    (SELECT status FROM public.courses WHERE id = course_id_in) IN ('Draft', 'Rejected')
    AND
    (
      (SELECT author_id FROM public.courses WHERE id = course_id_in) = auth.uid()
      OR
      is_teacher_for_course(course_id_in) -- This uses the function we fixed previously
    )
  ) THEN
    -- This update will now bypass the RLS policy because of SECURITY DEFINER.
    UPDATE public.courses
    SET
      status = 'Under Review'
    WHERE id = course_id_in;
  ELSE
    -- The function will raise an error if the user does not have permission.
    RAISE EXCEPTION 'Course cannot be submitted for review. You might not have permission, or the course is not in a Draft or Rejected state.';
  END IF;
END;
$$;


ALTER FUNCTION "public"."submit_for_review"("course_id_in" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_all_mfa_status"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  sync_count INTEGER := 0;
  user_record RECORD;
BEGIN
  -- Loop through all users and sync their MFA status
  FOR user_record IN 
    SELECT p.id, p.email
    FROM profiles p
  LOOP
    -- Check if user has verified MFA factors
    IF EXISTS (
      SELECT 1 FROM auth.mfa_factors mf 
      WHERE mf.user_id = user_record.id 
      AND mf.status = 'verified' 
      AND mf.factor_type = 'totp'
    ) THEN
      -- User has MFA enabled, sync to all locations
      UPDATE auth.users 
      SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"mfa_enabled": "true"}'::jsonb
      WHERE id = user_record.id
      AND (raw_app_meta_data->>'mfa_enabled' IS NULL OR raw_app_meta_data->>'mfa_enabled' != 'true');
      
      UPDATE profiles 
      SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"mfa_enabled": true}'::jsonb
      WHERE id = user_record.id
      AND (metadata->>'mfa_enabled' IS NULL OR metadata->>'mfa_enabled' != 'true');
      
      sync_count := sync_count + 1;
    ELSE
      -- User doesn't have MFA enabled, ensure it's marked as disabled
      UPDATE auth.users 
      SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"mfa_enabled": "false"}'::jsonb
      WHERE id = user_record.id
      AND (raw_app_meta_data->>'mfa_enabled' IS NULL OR raw_app_meta_data->>'mfa_enabled' = 'true');
      
      UPDATE profiles 
      SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"mfa_enabled": false}'::jsonb
      WHERE id = user_record.id
      AND (metadata->>'mfa_enabled' IS NULL OR metadata->>'mfa_enabled' = 'true');
    END IF;
  END LOOP;
  
  RETURN sync_count;
END;
$$;


ALTER FUNCTION "public"."sync_all_mfa_status"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_all_mfa_status"() IS 'Sync MFA status for all users by checking verified factors and updating metadata';



CREATE OR REPLACE FUNCTION "public"."sync_mfa_status_to_profiles"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- This function will be called by the frontend to sync MFA status
  -- For now, it's a placeholder that can be expanded later
  NULL;
END;
$$;


ALTER FUNCTION "public"."sync_mfa_status_to_profiles"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_mfa_status_to_profiles"() IS 'Function to sync MFA status from auth.users to profiles.metadata';



CREATE OR REPLACE FUNCTION "public"."test_backup_codes_save"("test_codes" "text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_user_id UUID;
  result JSONB;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Try to update backup codes
  UPDATE profiles 
  SET 
    two_factor_backup_codes = test_codes,
    two_factor_setup_completed_at = now(),
    updated_at = now()
  WHERE id = current_user_id;

  -- Check if update was successful
  IF FOUND THEN
    -- Verify the update
    SELECT jsonb_build_object(
      'success', true,
      'user_id', current_user_id,
      'backup_codes', two_factor_backup_codes,
      'setup_completed_at', two_factor_setup_completed_at
    ) INTO result
    FROM profiles 
    WHERE id = current_user_id;
    
    RETURN result;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found or update failed');
  END IF;
END;
$$;


ALTER FUNCTION "public"."test_backup_codes_save"("test_codes" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_manual_grading_detection"("test_quiz_id" "uuid") RETURNS TABLE("quiz_id" "uuid", "total_questions" bigint, "text_answer_questions" bigint, "should_require_manual_grading" boolean, "function_result" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    test_quiz_id as quiz_id,
    COUNT(*) as total_questions,
    COUNT(CASE WHEN question_type = 'text_answer' THEN 1 END) as text_answer_questions,
    (COUNT(CASE WHEN question_type = 'text_answer' THEN 1 END) > 0) as should_require_manual_grading,
    check_standalone_quiz_manual_grading_required(test_quiz_id) as function_result
  FROM standalone_quiz_questions 
  WHERE standalone_quiz_questions.quiz_id = test_quiz_id;
END;
$$;


ALTER FUNCTION "public"."test_manual_grading_detection"("test_quiz_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_real_data"() RETURNS TABLE("test_name" "text", "count_value" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 'Published Courses'::TEXT, COUNT(*)::INTEGER FROM courses WHERE status = 'Published'
  UNION ALL
  SELECT 'User Course Progress'::TEXT, COUNT(*)::INTEGER FROM user_course_progress
  UNION ALL
  SELECT 'Assignment Submissions'::TEXT, COUNT(*)::INTEGER FROM assignment_submissions
  UNION ALL
  SELECT 'Quiz Submissions'::TEXT, COUNT(*)::INTEGER FROM quiz_submissions
  UNION ALL
  SELECT 'Discussions'::TEXT, COUNT(*)::INTEGER FROM discussions
  UNION ALL
  SELECT 'Profiles'::TEXT, COUNT(*)::INTEGER FROM profiles;
END;
$$;


ALTER FUNCTION "public"."test_real_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_teacher_policy"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Test if user has teacher role
  RETURN EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = user_id 
    AND profiles.role = 'teacher'::app_role
  );
END;
$$;


ALTER FUNCTION "public"."test_teacher_policy"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_like"("p_user_id" "uuid", "p_discussion_id" "uuid" DEFAULT NULL::"uuid", "p_reply_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    existing_like_id uuid;
BEGIN
    IF p_discussion_id IS NOT NULL THEN
        SELECT id INTO existing_like_id
        FROM public.discussion_likes
        WHERE user_id = p_user_id AND discussion_id = p_discussion_id;

        IF existing_like_id IS NOT NULL THEN
            DELETE FROM public.discussion_likes WHERE discussion_likes.id = existing_like_id;
        ELSE
            INSERT INTO public.discussion_likes (user_id, discussion_id)
            VALUES (p_user_id, p_discussion_id);
        END IF;
    ELSIF p_reply_id IS NOT NULL THEN
        SELECT id INTO existing_like_id
        FROM public.discussion_likes
        WHERE user_id = p_user_id AND reply_id = p_reply_id;

        IF existing_like_id IS NOT NULL THEN
            DELETE FROM public.discussion_likes WHERE discussion_likes.id = existing_like_id;
        ELSE
            INSERT INTO public.discussion_likes (user_id, reply_id)
            VALUES (p_user_id, p_reply_id);
        END IF;
    END IF;
END;
$$;


ALTER FUNCTION "public"."toggle_like"("p_user_id" "uuid", "p_discussion_id" "uuid", "p_reply_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unblock_user"("p_email" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE blocked_users 
    SET is_active = FALSE
    WHERE email = p_email;
    
    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."unblock_user"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unlink_quiz_from_course"("input_quiz_id" "uuid", "input_course_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM public.quiz_course_links 
  WHERE quiz_course_links.quiz_id = input_quiz_id 
    AND quiz_course_links.course_id = input_course_id;
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."unlink_quiz_from_course"("input_quiz_id" "uuid", "input_course_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."unlink_quiz_from_course"("input_quiz_id" "uuid", "input_course_id" "uuid") IS 'Unlinks a quiz from a course';



CREATE OR REPLACE FUNCTION "public"."update_admin_settings"("p_system_name" character varying DEFAULT NULL::character varying, "p_maintenance_mode" boolean DEFAULT NULL::boolean, "p_system_notifications" boolean DEFAULT NULL::boolean, "p_email_notifications" boolean DEFAULT NULL::boolean, "p_push_notifications" boolean DEFAULT NULL::boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    settings_id UUID;
BEGIN
    -- Get the most recent settings record
    SELECT id INTO settings_id
    FROM admin_settings
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no settings exist, create a new one
    IF settings_id IS NULL THEN
        INSERT INTO admin_settings (
            system_name,
            maintenance_mode,
            system_notifications,
            email_notifications,
            push_notifications
        ) VALUES (
            COALESCE(p_system_name, 'DIL Learning Platform'),
            COALESCE(p_maintenance_mode, false),
            COALESCE(p_system_notifications, true),
            COALESCE(p_email_notifications, true),
            COALESCE(p_push_notifications, false)
        );
        RETURN true;
    ELSE
        -- Update existing settings
        UPDATE admin_settings
        SET 
            system_name = COALESCE(p_system_name, system_name),
            maintenance_mode = COALESCE(p_maintenance_mode, maintenance_mode),
            system_notifications = COALESCE(p_system_notifications, system_notifications),
            email_notifications = COALESCE(p_email_notifications, email_notifications),
            push_notifications = COALESCE(p_push_notifications, push_notifications)
        WHERE id = settings_id;
        RETURN true;
    END IF;
    
    RETURN false;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;


ALTER FUNCTION "public"."update_admin_settings"("p_system_name" character varying, "p_maintenance_mode" boolean, "p_system_notifications" boolean, "p_email_notifications" boolean, "p_push_notifications" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_admin_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_admin_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_apex_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_apex_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_class_student_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment student count
        UPDATE public.classes 
        SET current_students = current_students + 1
        WHERE id = NEW.class_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement student count
        UPDATE public.classes 
        SET current_students = current_students - 1
        WHERE id = OLD.class_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle status changes
        IF OLD.enrollment_status != NEW.enrollment_status THEN
            IF OLD.enrollment_status = 'active' AND NEW.enrollment_status != 'active' THEN
                -- Student became inactive
                UPDATE public.classes 
                SET current_students = current_students - 1
                WHERE id = NEW.class_id;
            ELSIF OLD.enrollment_status != 'active' AND NEW.enrollment_status = 'active' THEN
                -- Student became active
                UPDATE public.classes 
                SET current_students = current_students + 1
                WHERE id = NEW.class_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_class_student_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_last_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NEW.created_at 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_last_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_course_thumbnails_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_course_thumbnails_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_courses_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Only update updated_at for UPDATE operations
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
        RETURN NEW;
    END IF;
    
    -- For all other operations, return the appropriate record without modification
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    
    -- This should never be reached, but just in case
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_courses_updated_at_column"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_courses_updated_at_column"() IS 'Updates updated_at timestamp only on UPDATE operations to prevent conflicts during DELETE operations';



CREATE OR REPLACE FUNCTION "public"."update_notifications_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_notifications_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_quiz_members_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_quiz_members_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_quiz_submission_with_attempt_tracking"("p_submission_id" "uuid", "p_answers" "jsonb", "p_results" "jsonb", "p_score" numeric, "p_manual_grading_required" boolean DEFAULT false, "p_manual_grading_completed" boolean DEFAULT false, "p_retry_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("submission_id" "uuid", "attempt_number" integer, "is_latest_attempt" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  submission_record RECORD;
BEGIN
  -- Get the current submission details
  SELECT * INTO submission_record
  FROM quiz_submissions qs
  WHERE qs.id = p_submission_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found: %', p_submission_id;
  END IF;
  
  -- Update the submission
  UPDATE quiz_submissions 
  SET 
    answers = p_answers,
    results = p_results,
    score = p_score,
    manual_grading_required = p_manual_grading_required,
    manual_grading_completed = p_manual_grading_completed,
    retry_reason = p_retry_reason
  WHERE id = p_submission_id;
  
  -- Return the updated submission details
  RETURN QUERY SELECT 
    submission_record.id,
    submission_record.attempt_number,
    submission_record.is_latest_attempt;
END;
$$;


ALTER FUNCTION "public"."update_quiz_submission_with_attempt_tracking"("p_submission_id" "uuid", "p_answers" "jsonb", "p_results" "jsonb", "p_score" numeric, "p_manual_grading_required" boolean, "p_manual_grading_completed" boolean, "p_retry_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_secure_links_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_secure_links_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_security_setting"("p_setting_key" character varying, "p_setting_value" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE security_settings 
    SET 
        setting_value = p_setting_value,
        updated_at = NOW()
    WHERE setting_key = p_setting_key;
    
    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."update_security_setting"("p_setting_key" character varying, "p_setting_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_session_activity"("p_session_token" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE user_sessions 
    SET last_activity = NOW()
    WHERE session_token = p_session_token 
    AND is_active = TRUE 
    AND expires_at > NOW();
    
    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."update_session_activity"("p_session_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_session_on_access"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.last_activity = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_session_on_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_progress_summary"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Update the user progress summary when any progress changes
    UPDATE public.ai_tutor_user_progress_summary 
    SET 
        updated_at = NOW(),
        last_activity_date = CURRENT_DATE
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_progress_summary"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."access_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "user_email" "text",
    "action" character varying(100) NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "location" "text",
    "status" character varying(20) NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "access_logs_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['success'::character varying, 'failed'::character varying, 'pending'::character varying])::"text"[])))
);


ALTER TABLE "public"."access_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."access_logs" IS 'Tracks user access and authentication attempts';



COMMENT ON COLUMN "public"."access_logs"."action" IS 'Human-readable description of the action performed';



CREATE TABLE IF NOT EXISTS "public"."admin_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "system_name" character varying(255) DEFAULT 'DIL Learning Platform'::character varying,
    "maintenance_mode" boolean DEFAULT false,
    "system_notifications" boolean DEFAULT true,
    "email_notifications" boolean DEFAULT true,
    "push_notifications" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."admin_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_settings" IS 'Stores system-wide admin settings and configuration';



COMMENT ON COLUMN "public"."admin_settings"."system_name" IS 'The name of the learning platform';



COMMENT ON COLUMN "public"."admin_settings"."maintenance_mode" IS 'Whether the system is in maintenance mode';



COMMENT ON COLUMN "public"."admin_settings"."system_notifications" IS 'Whether system-wide notifications are enabled';



COMMENT ON COLUMN "public"."admin_settings"."email_notifications" IS 'Whether email notifications are enabled';



COMMENT ON COLUMN "public"."admin_settings"."push_notifications" IS 'Whether real-time notifications are enabled';



CREATE TABLE IF NOT EXISTS "public"."ai_prompts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "role" character varying(50) NOT NULL,
    "content" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "usage_count" integer DEFAULT 0,
    "last_used_at" timestamp with time zone,
    CONSTRAINT "ai_prompts_content_check" CHECK (("length"("content") > 0)),
    CONSTRAINT "ai_prompts_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['system'::character varying, 'user'::character varying, 'assistant'::character varying, 'query_analysis'::character varying])::"text"[]))),
    CONSTRAINT "ai_prompts_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."ai_prompts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_report_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "query" "text" NOT NULL,
    "response" "text" NOT NULL,
    "tokens_used" integer DEFAULT 0,
    "model_used" "text" DEFAULT 'gpt-4'::"text",
    "execution_time_ms" integer DEFAULT 0,
    "success" boolean DEFAULT true,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."ai_report_interactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_report_interactions" IS 'Tracks interactions with the AI reports chatbot for analytics and monitoring';



COMMENT ON COLUMN "public"."ai_report_interactions"."query" IS 'The user query sent to the AI';



COMMENT ON COLUMN "public"."ai_report_interactions"."response" IS 'The AI generated response';



COMMENT ON COLUMN "public"."ai_report_interactions"."tokens_used" IS 'Number of tokens consumed by the OpenAI API call';



COMMENT ON COLUMN "public"."ai_report_interactions"."model_used" IS 'The OpenAI model used for generation';



COMMENT ON COLUMN "public"."ai_report_interactions"."execution_time_ms" IS 'Time taken to process the request in milliseconds';



COMMENT ON COLUMN "public"."ai_report_interactions"."success" IS 'Whether the AI interaction was successful';



COMMENT ON COLUMN "public"."ai_report_interactions"."error_message" IS 'Error message if the interaction failed';



CREATE TABLE IF NOT EXISTS "public"."ai_safety_ethics_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content_filtering" boolean DEFAULT true,
    "toxicity_detection" boolean DEFAULT true,
    "bias_detection" boolean DEFAULT true,
    "inappropriate_content_blocking" boolean DEFAULT true,
    "harmful_content_prevention" boolean DEFAULT true,
    "misinformation_detection" boolean DEFAULT true,
    "data_encryption" boolean DEFAULT true,
    "personal_data_protection" boolean DEFAULT true,
    "conversation_logging" boolean DEFAULT true,
    "data_retention_limit" integer DEFAULT 90,
    "gender_bias_monitoring" boolean DEFAULT true,
    "cultural_bias_detection" boolean DEFAULT true,
    "age_appropriate_responses" boolean DEFAULT true,
    "inclusive_language" boolean DEFAULT true,
    "emotional_safety_checks" boolean DEFAULT true,
    "real_time_monitoring" boolean DEFAULT true,
    "alert_threshold" integer DEFAULT 75,
    "automatic_escalation" boolean DEFAULT true,
    "admin_notifications" boolean DEFAULT true,
    "contextual_safety_analysis" boolean DEFAULT true,
    "compliance_reporting" boolean DEFAULT true,
    "audit_trail" boolean DEFAULT true,
    "incident_reporting" boolean DEFAULT true,
    "regular_assessments" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "ai_safety_ethics_settings_alert_threshold_check" CHECK ((("alert_threshold" >= 50) AND ("alert_threshold" <= 100))),
    CONSTRAINT "ai_safety_ethics_settings_data_retention_limit_check" CHECK ((("data_retention_limit" >= 30) AND ("data_retention_limit" <= 365)))
);


ALTER TABLE "public"."ai_safety_ethics_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_safety_ethics_settings" IS 'Stores AI safety and ethics configuration settings - admin access only';



CREATE TABLE IF NOT EXISTS "public"."ai_tutor_content_hierarchy" (
    "id" integer NOT NULL,
    "uuid" "uuid" DEFAULT "extensions"."uuid_generate_v4"(),
    "level" "text" NOT NULL,
    "hierarchy_path" "text" NOT NULL,
    "parent_id" integer,
    "title" "text" NOT NULL,
    "title_urdu" "text",
    "description" "text",
    "description_urdu" "text",
    "stage_number" integer,
    "difficulty_level" "text",
    "stage_order" integer,
    "exercise_number" integer,
    "exercise_type" "text",
    "exercise_order" integer,
    "topic_number" integer,
    "topic_order" integer,
    "topic_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "category" "text",
    "difficulty" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_tutor_content_hierarchy_difficulty_level_check" CHECK (("difficulty_level" = ANY (ARRAY['A1'::"text", 'A2'::"text", 'B1'::"text", 'B2'::"text", 'C1'::"text", 'C2'::"text"]))),
    CONSTRAINT "ai_tutor_content_hierarchy_exercise_type_check" CHECK (("exercise_type" = ANY (ARRAY['lesson'::"text", 'pronunciation'::"text", 'response'::"text", 'dialogue'::"text", 'narration'::"text", 'conversation'::"text", 'roleplay'::"text", 'storytelling'::"text", 'discussion'::"text", 'problem_solving'::"text", 'presentation'::"text", 'negotiation'::"text", 'leadership'::"text", 'debate'::"text", 'academic'::"text", 'interview'::"text", 'spontaneous'::"text", 'diplomatic'::"text", 'academic_debate'::"text"]))),
    CONSTRAINT "ai_tutor_content_hierarchy_level_check" CHECK (("level" = ANY (ARRAY['stage'::"text", 'exercise'::"text", 'topic'::"text"])))
);


ALTER TABLE "public"."ai_tutor_content_hierarchy" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ai_tutor_content_hierarchy_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ai_tutor_content_hierarchy_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ai_tutor_content_hierarchy_id_seq" OWNED BY "public"."ai_tutor_content_hierarchy"."id";



CREATE TABLE IF NOT EXISTS "public"."ai_tutor_daily_learning_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "analytics_date" "date" DEFAULT CURRENT_DATE,
    "sessions_count" integer DEFAULT 0,
    "total_time_minutes" integer DEFAULT 0,
    "average_session_duration" numeric(5,2) DEFAULT 0.00,
    "average_score" numeric(5,2) DEFAULT 0.00,
    "best_score" numeric(5,2) DEFAULT 0.00,
    "exercises_attempted" integer DEFAULT 0,
    "exercises_completed" integer DEFAULT 0,
    "stages_worked_on" integer[] DEFAULT '{}'::integer[],
    "exercises_worked_on" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "urdu_usage_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "ai_tutor_daily_learning_analytics_average_score_check" CHECK ((("average_score" >= (0)::numeric) AND ("average_score" <= (100)::numeric))),
    CONSTRAINT "ai_tutor_daily_learning_analytics_best_score_check" CHECK ((("best_score" >= (0)::numeric) AND ("best_score" <= (100)::numeric))),
    CONSTRAINT "ai_tutor_daily_learning_analytics_exercises_attempted_check" CHECK (("exercises_attempted" >= 0)),
    CONSTRAINT "ai_tutor_daily_learning_analytics_exercises_completed_check" CHECK (("exercises_completed" >= 0)),
    CONSTRAINT "ai_tutor_daily_learning_analytics_sessions_count_check" CHECK (("sessions_count" >= 0)),
    CONSTRAINT "ai_tutor_daily_learning_analytics_total_time_minutes_check" CHECK (("total_time_minutes" >= 0))
);


ALTER TABLE "public"."ai_tutor_daily_learning_analytics" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_tutor_daily_learning_analytics" IS 'Weekly progress summaries for reporting and insights';



CREATE TABLE IF NOT EXISTS "public"."ai_tutor_learning_milestones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "milestone_type" "text" NOT NULL,
    "milestone_title" "text" NOT NULL,
    "milestone_description" "text" NOT NULL,
    "achievement_data" "jsonb" DEFAULT '{}'::"jsonb",
    "milestone_value" "text",
    "earned_at" timestamp with time zone DEFAULT "now"(),
    "is_notified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_tutor_learning_milestones" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_tutor_learning_milestones" IS 'Records user achievements and milestones';



CREATE TABLE IF NOT EXISTS "public"."ai_tutor_learning_unlocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stage_id" integer NOT NULL,
    "exercise_id" integer,
    "is_unlocked" boolean DEFAULT false,
    "unlock_criteria_met" boolean DEFAULT false,
    "unlocked_at" timestamp with time zone,
    "unlocked_by_criteria" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_tutor_learning_unlocks_exercise_id_check" CHECK ((("exercise_id" >= 1) AND ("exercise_id" <= 3))),
    CONSTRAINT "ai_tutor_learning_unlocks_stage_id_check" CHECK ((("stage_id" >= 0) AND ("stage_id" <= 6)))
);


ALTER TABLE "public"."ai_tutor_learning_unlocks" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_tutor_learning_unlocks" IS 'Manages which stages and exercises are unlocked for each user';



CREATE TABLE IF NOT EXISTS "public"."ai_tutor_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "personality_type" "text" DEFAULT 'encouraging'::"text",
    "response_style" "text" DEFAULT 'conversational'::"text",
    "adaptive_difficulty" boolean DEFAULT true,
    "context_awareness" boolean DEFAULT true,
    "max_response_length" integer DEFAULT 150,
    "response_speed" "text" DEFAULT 'normal'::"text",
    "repetition_threshold" integer DEFAULT 3,
    "error_correction_style" "text" DEFAULT 'gentle'::"text",
    "voice_enabled" boolean DEFAULT true,
    "voice_gender" "text" DEFAULT 'neutral'::"text",
    "speech_rate" numeric(3,1) DEFAULT 1.0,
    "audio_feedback" boolean DEFAULT true,
    "cultural_sensitivity" boolean DEFAULT true,
    "age_appropriate" boolean DEFAULT true,
    "professional_context" boolean DEFAULT false,
    "custom_prompts" "text" DEFAULT ''::"text",
    "learning_analytics" boolean DEFAULT true,
    "progress_tracking" boolean DEFAULT true,
    "performance_reports" boolean DEFAULT true,
    "data_retention" integer DEFAULT 90,
    "multilingual_support" boolean DEFAULT true,
    "emotional_intelligence" boolean DEFAULT true,
    "gamification_elements" boolean DEFAULT true,
    "real_time_adaptation" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "ai_tutor_settings_data_retention_check" CHECK ((("data_retention" >= 30) AND ("data_retention" <= 365))),
    CONSTRAINT "ai_tutor_settings_error_correction_style_check" CHECK (("error_correction_style" = ANY (ARRAY['gentle'::"text", 'direct'::"text", 'detailed'::"text", 'minimal'::"text"]))),
    CONSTRAINT "ai_tutor_settings_max_response_length_check" CHECK ((("max_response_length" >= 50) AND ("max_response_length" <= 300))),
    CONSTRAINT "ai_tutor_settings_personality_type_check" CHECK (("personality_type" = ANY (ARRAY['encouraging'::"text", 'professional'::"text", 'friendly'::"text", 'academic'::"text"]))),
    CONSTRAINT "ai_tutor_settings_repetition_threshold_check" CHECK ((("repetition_threshold" >= 1) AND ("repetition_threshold" <= 10))),
    CONSTRAINT "ai_tutor_settings_response_speed_check" CHECK (("response_speed" = ANY (ARRAY['fast'::"text", 'normal'::"text", 'slow'::"text"]))),
    CONSTRAINT "ai_tutor_settings_response_style_check" CHECK (("response_style" = ANY (ARRAY['conversational'::"text", 'structured'::"text", 'interactive'::"text", 'concise'::"text"]))),
    CONSTRAINT "ai_tutor_settings_speech_rate_check" CHECK ((("speech_rate" >= 0.5) AND ("speech_rate" <= 2.0))),
    CONSTRAINT "ai_tutor_settings_voice_gender_check" CHECK (("voice_gender" = ANY (ARRAY['neutral'::"text", 'female'::"text", 'male'::"text"])))
);


ALTER TABLE "public"."ai_tutor_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_tutor_user_exercise_progress" (
    "id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stage_id" integer NOT NULL,
    "exercise_id" integer NOT NULL,
    "attempts" integer DEFAULT 0,
    "scores" numeric[] DEFAULT '{}'::numeric[],
    "last_5_scores" numeric[] DEFAULT '{}'::numeric[],
    "average_score" numeric(5,2) DEFAULT 0.00,
    "urdu_used" boolean[] DEFAULT '{}'::boolean[],
    "mature" boolean DEFAULT false,
    "total_score" numeric(5,2) DEFAULT 0.00,
    "best_score" numeric(5,2) DEFAULT 0.00,
    "time_spent_minutes" integer DEFAULT 0,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "last_attempt_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "current_topic_id" integer DEFAULT 1,
    CONSTRAINT "ai_tutor_user_exercise_progress_attempts_check" CHECK (("attempts" >= 0)),
    CONSTRAINT "ai_tutor_user_exercise_progress_average_score_check" CHECK ((("average_score" >= (0)::numeric) AND ("average_score" <= (100)::numeric))),
    CONSTRAINT "ai_tutor_user_exercise_progress_best_score_check" CHECK (("best_score" >= (0)::numeric)),
    CONSTRAINT "ai_tutor_user_exercise_progress_current_topic_id_check" CHECK (("current_topic_id" >= 1)),
    CONSTRAINT "ai_tutor_user_exercise_progress_exercise_id_check" CHECK ((("exercise_id" >= 1) AND ("exercise_id" <= 3))),
    CONSTRAINT "ai_tutor_user_exercise_progress_stage_id_check" CHECK ((("stage_id" >= 1) AND ("stage_id" <= 6))),
    CONSTRAINT "ai_tutor_user_exercise_progress_time_spent_minutes_check" CHECK (("time_spent_minutes" >= 0)),
    CONSTRAINT "ai_tutor_user_exercise_progress_total_score_check" CHECK (("total_score" >= (0)::numeric))
);


ALTER TABLE "public"."ai_tutor_user_exercise_progress" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_tutor_user_exercise_progress" IS 'Summarizes user performance for each exercise';



CREATE SEQUENCE IF NOT EXISTS "public"."ai_tutor_user_exercise_progress_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ai_tutor_user_exercise_progress_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ai_tutor_user_exercise_progress_id_seq" OWNED BY "public"."ai_tutor_user_exercise_progress"."id";



CREATE TABLE IF NOT EXISTS "public"."ai_tutor_user_progress_summary" (
    "user_id" "uuid" NOT NULL,
    "current_stage" integer NOT NULL,
    "current_exercise" integer NOT NULL,
    "topic_id" integer,
    "urdu_enabled" boolean DEFAULT true,
    "unlocked_stages" integer[] DEFAULT '{1}'::integer[],
    "unlocked_exercises" "jsonb" DEFAULT '{"1": [1]}'::"jsonb",
    "overall_progress_percentage" numeric(5,2) DEFAULT 0.00,
    "total_time_spent_minutes" integer DEFAULT 0,
    "total_exercises_completed" integer DEFAULT 0,
    "streak_days" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "average_session_duration_minutes" numeric(5,2) DEFAULT 0.00,
    "weekly_learning_hours" numeric(4,2) DEFAULT 0.00,
    "monthly_learning_hours" numeric(5,2) DEFAULT 0.00,
    "first_activity_date" "date" DEFAULT CURRENT_DATE,
    "last_activity_date" "date" DEFAULT CURRENT_DATE,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "english_proficiency_text" "text",
    "assigned_start_stage" integer,
    CONSTRAINT "user_progress_summary_current_exercise_check" CHECK ((("current_exercise" >= 1) AND ("current_exercise" <= 3))),
    CONSTRAINT "user_progress_summary_current_stage_check" CHECK ((("current_stage" >= 0) AND ("current_stage" <= 6))),
    CONSTRAINT "user_progress_summary_longest_streak_check" CHECK (("longest_streak" >= 0)),
    CONSTRAINT "user_progress_summary_overall_progress_percentage_check" CHECK ((("overall_progress_percentage" >= (0)::numeric) AND ("overall_progress_percentage" <= (100)::numeric))),
    CONSTRAINT "user_progress_summary_streak_days_check" CHECK (("streak_days" >= 0)),
    CONSTRAINT "user_progress_summary_total_exercises_completed_check" CHECK (("total_exercises_completed" >= 0)),
    CONSTRAINT "user_progress_summary_total_time_spent_minutes_check" CHECK (("total_time_spent_minutes" >= 0))
);


ALTER TABLE "public"."ai_tutor_user_progress_summary" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_tutor_user_progress_summary" IS 'Quick Summary of the user for the AI Tutor';



COMMENT ON COLUMN "public"."ai_tutor_user_progress_summary"."english_proficiency_text" IS 'User-provided text describing their English proficiency during sign-up.';



COMMENT ON COLUMN "public"."ai_tutor_user_progress_summary"."assigned_start_stage" IS 'The initial stage assigned to the user based on their proficiency text.';



CREATE TABLE IF NOT EXISTS "public"."ai_tutor_user_stage_progress" (
    "id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stage_id" integer NOT NULL,
    "completed" boolean DEFAULT false,
    "mature" boolean DEFAULT false,
    "average_score" numeric(5,2) DEFAULT 0.00,
    "progress_percentage" numeric(5,2) DEFAULT 0.00,
    "total_score" numeric(5,2) DEFAULT 0.00,
    "best_score" numeric(5,2) DEFAULT 0.00,
    "time_spent_minutes" integer DEFAULT 0,
    "attempts_count" integer DEFAULT 0,
    "exercises_completed" integer DEFAULT 0,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "last_attempt_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_tutor_user_stage_progress_attempts_count_check" CHECK (("attempts_count" >= 0)),
    CONSTRAINT "ai_tutor_user_stage_progress_average_score_check" CHECK ((("average_score" >= (0)::numeric) AND ("average_score" <= (100)::numeric))),
    CONSTRAINT "ai_tutor_user_stage_progress_best_score_check" CHECK (("best_score" >= (0)::numeric)),
    CONSTRAINT "ai_tutor_user_stage_progress_exercises_completed_check" CHECK ((("exercises_completed" >= 0) AND ("exercises_completed" <= 3))),
    CONSTRAINT "ai_tutor_user_stage_progress_progress_percentage_check" CHECK ((("progress_percentage" >= (0)::numeric) AND ("progress_percentage" <= (100)::numeric))),
    CONSTRAINT "ai_tutor_user_stage_progress_stage_id_check" CHECK ((("stage_id" >= 0) AND ("stage_id" <= 6))),
    CONSTRAINT "ai_tutor_user_stage_progress_time_spent_minutes_check" CHECK (("time_spent_minutes" >= 0)),
    CONSTRAINT "ai_tutor_user_stage_progress_total_score_check" CHECK (("total_score" >= (0)::numeric))
);


ALTER TABLE "public"."ai_tutor_user_stage_progress" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_tutor_user_stage_progress" IS 'Aggregated metadata for each stage per user';



CREATE SEQUENCE IF NOT EXISTS "public"."ai_tutor_user_stage_progress_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ai_tutor_user_stage_progress_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ai_tutor_user_stage_progress_id_seq" OWNED BY "public"."ai_tutor_user_stage_progress"."id";



CREATE TABLE IF NOT EXISTS "public"."ai_tutor_user_topic_progress" (
    "id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stage_id" integer NOT NULL,
    "exercise_id" integer NOT NULL,
    "topic_id" integer NOT NULL,
    "attempt_num" integer NOT NULL,
    "score" numeric(5,2),
    "urdu_used" boolean DEFAULT false,
    "completed" boolean DEFAULT false,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "total_time_seconds" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_tutor_user_topic_progress_attempt_num_check" CHECK (("attempt_num" > 0)),
    CONSTRAINT "ai_tutor_user_topic_progress_exercise_id_check" CHECK ((("exercise_id" >= 1) AND ("exercise_id" <= 3))),
    CONSTRAINT "ai_tutor_user_topic_progress_score_check" CHECK ((("score" >= (0)::numeric) AND ("score" <= (100)::numeric))),
    CONSTRAINT "ai_tutor_user_topic_progress_stage_id_check" CHECK ((("stage_id" >= 1) AND ("stage_id" <= 6))),
    CONSTRAINT "ai_tutor_user_topic_progress_total_time_seconds_check" CHECK (("total_time_seconds" >= 0))
);


ALTER TABLE "public"."ai_tutor_user_topic_progress" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_tutor_user_topic_progress" IS 'Tracks every attempt per topic with detailed metrics';



CREATE SEQUENCE IF NOT EXISTS "public"."ai_tutor_user_topic_progress_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ai_tutor_user_topic_progress_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ai_tutor_user_topic_progress_id_seq" OWNED BY "public"."ai_tutor_user_topic_progress"."id";



CREATE TABLE IF NOT EXISTS "public"."ai_tutor_weekly_progress_summaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "week_start_date" "date" NOT NULL,
    "total_sessions" integer DEFAULT 0,
    "total_time_hours" numeric(5,2) DEFAULT 0.00,
    "average_daily_time_minutes" numeric(5,2) DEFAULT 0.00,
    "average_score" numeric(5,2) DEFAULT 0.00,
    "score_improvement" numeric(5,2) DEFAULT 0.00,
    "consistency_score" numeric(3,2) DEFAULT 0.00,
    "stages_completed" integer DEFAULT 0,
    "exercises_mastered" integer DEFAULT 0,
    "milestones_earned" integer DEFAULT 0,
    "weekly_recommendations" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_tutor_weekly_progress_summaries_average_score_check" CHECK ((("average_score" >= (0)::numeric) AND ("average_score" <= (100)::numeric))),
    CONSTRAINT "ai_tutor_weekly_progress_summaries_consistency_score_check" CHECK ((("consistency_score" >= (0)::numeric) AND ("consistency_score" <= (1)::numeric))),
    CONSTRAINT "ai_tutor_weekly_progress_summaries_exercises_mastered_check" CHECK (("exercises_mastered" >= 0)),
    CONSTRAINT "ai_tutor_weekly_progress_summaries_milestones_earned_check" CHECK (("milestones_earned" >= 0)),
    CONSTRAINT "ai_tutor_weekly_progress_summaries_stages_completed_check" CHECK (("stages_completed" >= 0)),
    CONSTRAINT "ai_tutor_weekly_progress_summaries_total_sessions_check" CHECK (("total_sessions" >= 0)),
    CONSTRAINT "ai_tutor_weekly_progress_summaries_total_time_hours_check" CHECK (("total_time_hours" >= (0)::numeric))
);


ALTER TABLE "public"."ai_tutor_weekly_progress_summaries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."apex_contact_info" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "department" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "availability" "text" NOT NULL,
    "description" "text" NOT NULL,
    "priority" "public"."contact_priority" DEFAULT 'medium'::"public"."contact_priority",
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."apex_contact_info" OWNER TO "postgres";


COMMENT ON TABLE "public"."apex_contact_info" IS 'Contact information for different support departments';



COMMENT ON COLUMN "public"."apex_contact_info"."department" IS 'Name of the support department';



COMMENT ON COLUMN "public"."apex_contact_info"."email" IS 'Contact email address';



COMMENT ON COLUMN "public"."apex_contact_info"."phone" IS 'Contact phone number (optional)';



COMMENT ON COLUMN "public"."apex_contact_info"."availability" IS 'Available hours/days';



COMMENT ON COLUMN "public"."apex_contact_info"."description" IS 'Description of what this department handles';



COMMENT ON COLUMN "public"."apex_contact_info"."priority" IS 'Priority level for displaying contacts';



COMMENT ON COLUMN "public"."apex_contact_info"."is_active" IS 'Whether the contact is currently active/visible';



CREATE TABLE IF NOT EXISTS "public"."apex_faqs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "category" "text" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "priority" "public"."faq_priority" DEFAULT 'medium'::"public"."faq_priority",
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."apex_faqs" OWNER TO "postgres";


COMMENT ON TABLE "public"."apex_faqs" IS 'Frequently Asked Questions for the AI Assistant';



COMMENT ON COLUMN "public"."apex_faqs"."question" IS 'The FAQ question text';



COMMENT ON COLUMN "public"."apex_faqs"."answer" IS 'The answer to the FAQ question';



COMMENT ON COLUMN "public"."apex_faqs"."category" IS 'Category for organizing FAQs';



COMMENT ON COLUMN "public"."apex_faqs"."tags" IS 'Array of tags for better searchability';



COMMENT ON COLUMN "public"."apex_faqs"."priority" IS 'Priority level (high, medium, low)';



COMMENT ON COLUMN "public"."apex_faqs"."is_active" IS 'Whether the FAQ is currently active/visible';



CREATE TABLE IF NOT EXISTS "public"."apex_knowledge_base" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "category" "text" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "related_faq_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."apex_knowledge_base" OWNER TO "postgres";


COMMENT ON TABLE "public"."apex_knowledge_base" IS 'Knowledge base articles for the AI Assistant';



COMMENT ON COLUMN "public"."apex_knowledge_base"."title" IS 'Title of the knowledge base article';



COMMENT ON COLUMN "public"."apex_knowledge_base"."content" IS 'Full content of the article';



COMMENT ON COLUMN "public"."apex_knowledge_base"."category" IS 'Category for organizing articles';



COMMENT ON COLUMN "public"."apex_knowledge_base"."tags" IS 'Array of tags for better searchability';



COMMENT ON COLUMN "public"."apex_knowledge_base"."related_faq_ids" IS 'Array of related FAQ IDs';



COMMENT ON COLUMN "public"."apex_knowledge_base"."is_active" IS 'Whether the article is currently active/visible';



CREATE TABLE IF NOT EXISTS "public"."assignment_submissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "assignment_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "submission_type" "text" NOT NULL,
    "content" "text",
    "status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "grade" integer,
    "feedback" "text",
    "graded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "assignment_submissions_status_check" CHECK (("status" = ANY (ARRAY['submitted'::"text", 'graded'::"text"]))),
    CONSTRAINT "assignment_submissions_submission_type_check" CHECK (("submission_type" = ANY (ARRAY['text'::"text", 'file'::"text", 'link'::"text"])))
);


ALTER TABLE "public"."assignment_submissions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."assignment_submissions"."assignment_id" IS 'FK to the course_lessons table, where type is ''assignment''';



COMMENT ON COLUMN "public"."assignment_submissions"."user_id" IS 'FK to the user who submitted the assignment';



COMMENT ON COLUMN "public"."assignment_submissions"."submission_type" IS 'The type of submission: text, file path, or URL';



COMMENT ON COLUMN "public"."assignment_submissions"."content" IS 'The actual submission content, be it raw text, a file path from storage, or a URL';



COMMENT ON COLUMN "public"."assignment_submissions"."status" IS 'The current status of the submission';



COMMENT ON COLUMN "public"."assignment_submissions"."grade" IS 'The grade or score given to the submission';



COMMENT ON COLUMN "public"."assignment_submissions"."feedback" IS 'Feedback provided by the teacher';



COMMENT ON COLUMN "public"."assignment_submissions"."graded_at" IS 'Timestamp of when the assignment was graded';



CREATE TABLE IF NOT EXISTS "public"."blocked_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "ip_address" "inet",
    "block_reason" "text" NOT NULL,
    "blocked_at" timestamp with time zone DEFAULT "now"(),
    "blocked_until" timestamp with time zone NOT NULL,
    "attempts_count" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."blocked_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."blocked_users" IS 'Tracks users who are temporarily blocked due to security violations';



COMMENT ON COLUMN "public"."blocked_users"."blocked_until" IS 'Timestamp when the block expires';



COMMENT ON COLUMN "public"."blocked_users"."is_active" IS 'Whether the block is currently active';



CREATE TABLE IF NOT EXISTS "public"."boards" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "code" character varying(20) NOT NULL,
    "country_id" "uuid" NOT NULL,
    "region_id" "uuid" NOT NULL,
    "city_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "description" "text",
    "board_type" character varying(50) DEFAULT 'educational'::character varying,
    "website" character varying(255),
    "contact_email" character varying(255),
    "contact_phone" character varying(50),
    "address" "text",
    "status" character varying(20) DEFAULT 'active'::character varying,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "boards_board_type_check" CHECK ((("board_type")::"text" = ANY ((ARRAY['educational'::character varying, 'examination'::character varying, 'certification'::character varying, 'accreditation'::character varying])::"text"[]))),
    CONSTRAINT "boards_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying])::"text"[])))
);


ALTER TABLE "public"."boards" OWNER TO "postgres";


COMMENT ON TABLE "public"."boards" IS 'Educational boards and examination bodies';



COMMENT ON COLUMN "public"."boards"."code" IS 'Unique board identifier';



CREATE TABLE IF NOT EXISTS "public"."cities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "code" character varying(10) NOT NULL,
    "country_id" "uuid" NOT NULL,
    "region_id" "uuid" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."cities" OWNER TO "postgres";


COMMENT ON TABLE "public"."cities" IS 'Cities within regions';



COMMENT ON COLUMN "public"."cities"."code" IS 'City code within the region';



CREATE TABLE IF NOT EXISTS "public"."class_students" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "enrollment_date" "date" DEFAULT CURRENT_DATE,
    "enrollment_status" character varying(20) DEFAULT 'active'::character varying,
    "student_number" character varying(20),
    "seat_number" character varying(10),
    "parent_guardian_contact" "text",
    "emergency_contact" "text",
    "notes" "text",
    "enrolled_by" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "class_students_enrollment_status_check" CHECK ((("enrollment_status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'transferred'::character varying, 'graduated'::character varying, 'dropped'::character varying])::"text"[])))
);


ALTER TABLE "public"."class_students" OWNER TO "postgres";


COMMENT ON TABLE "public"."class_students" IS 'Many-to-many relationship between classes and students with enrollment details';



COMMENT ON COLUMN "public"."class_students"."enrollment_status" IS 'Current status of student enrollment';



COMMENT ON COLUMN "public"."class_students"."student_number" IS 'Roll number or student ID within the class';



COMMENT ON COLUMN "public"."class_students"."seat_number" IS 'Assigned seat number in the classroom';



CREATE TABLE IF NOT EXISTS "public"."class_teachers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "role" character varying(50) DEFAULT 'teacher'::character varying,
    "is_primary" boolean DEFAULT false,
    "assigned_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "class_teachers_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['teacher'::character varying, 'assistant_teacher'::character varying, 'substitute_teacher'::character varying, 'co_teacher'::character varying])::"text"[])))
);


ALTER TABLE "public"."class_teachers" OWNER TO "postgres";


COMMENT ON TABLE "public"."class_teachers" IS 'Many-to-many relationship between classes and teachers';



COMMENT ON COLUMN "public"."class_teachers"."role" IS 'Role of the teacher in the class (teacher, assistant, substitute, co-teacher)';



COMMENT ON COLUMN "public"."class_teachers"."is_primary" IS 'Whether this teacher is the primary teacher for the class';



CREATE TABLE IF NOT EXISTS "public"."classes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "code" character varying(20) NOT NULL,
    "grade" character varying(10) NOT NULL,
    "school_id" "uuid" NOT NULL,
    "board_id" "uuid" NOT NULL,
    "description" "text",
    "status" character varying(20) DEFAULT 'active'::character varying,
    "max_students" integer DEFAULT 30,
    "current_students" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "check_current_students_limit" CHECK (("current_students" <= "max_students")),
    CONSTRAINT "classes_current_students_check" CHECK (("current_students" >= 0)),
    CONSTRAINT "classes_grade_check" CHECK ((("grade")::"text" = ANY ((ARRAY['1'::character varying, '2'::character varying, '3'::character varying, '4'::character varying, '5'::character varying, '6'::character varying, '7'::character varying, '8'::character varying, '9'::character varying, '10'::character varying, '11'::character varying, '12'::character varying])::"text"[]))),
    CONSTRAINT "classes_max_students_check" CHECK (("max_students" > 0)),
    CONSTRAINT "classes_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::"text"[])))
);


ALTER TABLE "public"."classes" OWNER TO "postgres";


COMMENT ON TABLE "public"."classes" IS 'Stores academic classes with their basic information and settings';



COMMENT ON COLUMN "public"."classes"."max_students" IS 'Maximum number of students allowed in the class';



COMMENT ON COLUMN "public"."classes"."current_students" IS 'Current number of active students in the class';



CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "code" character varying(20) NOT NULL,
    "school_type" character varying(50) NOT NULL,
    "country_id" "uuid" NOT NULL,
    "region_id" "uuid" NOT NULL,
    "city_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "board_id" "uuid" NOT NULL,
    "address" "text",
    "phone" character varying(50),
    "email" character varying(255),
    "website" character varying(255),
    "principal_name" character varying(255),
    "principal_email" character varying(255),
    "principal_phone" character varying(50),
    "established_year" integer,
    "total_students" integer DEFAULT 0,
    "total_teachers" integer DEFAULT 0,
    "total_classes" integer DEFAULT 0,
    "facilities" "text"[],
    "curriculum" "text"[],
    "languages_offered" "text"[],
    "status" character varying(20) DEFAULT 'active'::character varying,
    "accreditation_status" character varying(50) DEFAULT 'pending'::character varying,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "schools_accreditation_status_check" CHECK ((("accreditation_status")::"text" = ANY ((ARRAY['pending'::character varying, 'accredited'::character varying, 'expired'::character varying, 'suspended'::character varying])::"text"[]))),
    CONSTRAINT "schools_school_type_check" CHECK ((("school_type")::"text" = ANY ((ARRAY['Private'::character varying, 'Public'::character varying, 'International'::character varying, 'Charter'::character varying, 'Religious'::character varying])::"text"[]))),
    CONSTRAINT "schools_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying, 'closed'::character varying])::"text"[])))
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


COMMENT ON TABLE "public"."schools" IS 'Educational institutions with complete information';



COMMENT ON COLUMN "public"."schools"."code" IS 'Unique school identifier';



CREATE OR REPLACE VIEW "public"."class_overview" AS
 SELECT "c"."id",
    "c"."name",
    "c"."code",
    "c"."grade",
    "c"."description",
    "c"."status",
    "c"."max_students",
    "c"."current_students",
    "c"."created_at",
    "c"."updated_at",
    "s"."name" AS "school_name",
    "s"."code" AS "school_code",
    "b"."name" AS "board_name",
    "b"."code" AS "board_code",
    "count"(DISTINCT "ct"."teacher_id") AS "teacher_count",
    "count"(DISTINCT "cs"."student_id") AS "student_count"
   FROM (((("public"."classes" "c"
     LEFT JOIN "public"."schools" "s" ON (("c"."school_id" = "s"."id")))
     LEFT JOIN "public"."boards" "b" ON (("c"."board_id" = "b"."id")))
     LEFT JOIN "public"."class_teachers" "ct" ON (("c"."id" = "ct"."class_id")))
     LEFT JOIN "public"."class_students" "cs" ON (("c"."id" = "cs"."class_id")))
  GROUP BY "c"."id", "c"."name", "c"."code", "c"."grade", "c"."description", "c"."status", "c"."max_students", "c"."current_students", "c"."created_at", "c"."updated_at", "s"."name", "s"."code", "b"."name", "b"."code";


ALTER VIEW "public"."class_overview" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."class_statistics" AS
 SELECT "count"(*) AS "total_classes",
    "count"(
        CASE
            WHEN (("status")::"text" = 'active'::"text") THEN 1
            ELSE NULL::integer
        END) AS "active_classes",
    "count"(
        CASE
            WHEN (("status")::"text" = 'inactive'::"text") THEN 1
            ELSE NULL::integer
        END) AS "inactive_classes",
    "count"(
        CASE
            WHEN (("status")::"text" = 'archived'::"text") THEN 1
            ELSE NULL::integer
        END) AS "archived_classes",
    "count"(DISTINCT "school_id") AS "schools_with_classes",
    "count"(DISTINCT "board_id") AS "boards_with_classes",
    "sum"("current_students") AS "total_enrolled_students",
    "avg"("current_students") AS "avg_students_per_class"
   FROM "public"."classes";


ALTER VIEW "public"."class_statistics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'participant'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "left_at" timestamp with time zone,
    "is_muted" boolean DEFAULT false,
    "is_blocked" boolean DEFAULT false,
    "last_read_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "conversation_participants_role_check" CHECK (("role" = ANY (ARRAY['participant'::"text", 'admin'::"text", 'moderator'::"text"])))
);


ALTER TABLE "public"."conversation_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text",
    "type" "text" DEFAULT 'direct'::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_message_at" timestamp with time zone DEFAULT "now"(),
    "is_archived" boolean DEFAULT false,
    "is_deleted" boolean DEFAULT false,
    CONSTRAINT "conversations_type_check" CHECK (("type" = ANY (ARRAY['direct'::"text", 'group'::"text"])))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."countries" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "code" character varying(3) NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."countries" OWNER TO "postgres";


COMMENT ON TABLE "public"."countries" IS 'Master table for countries in the organizational hierarchy';



COMMENT ON COLUMN "public"."countries"."code" IS 'ISO country code (2-3 characters)';



CREATE TABLE IF NOT EXISTS "public"."course_categories" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."course_categories" OWNER TO "postgres";


ALTER TABLE "public"."course_categories" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."course_categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."course_languages" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."course_languages" OWNER TO "postgres";


ALTER TABLE "public"."course_languages" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."course_languages_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."course_lesson_content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "title" "text",
    "content_type" "text" NOT NULL,
    "content_path" "text",
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "due_date" timestamp with time zone,
    "retry_settings" "jsonb" DEFAULT '{"maxRetries": 2, "allowRetries": false, "retryThreshold": 70, "retryCooldownHours": 24, "generateNewQuestions": true, "requireStudyMaterials": false, "requireTeacherApproval": false, "studyMaterialsRequired": []}'::"jsonb"
);


ALTER TABLE "public"."course_lesson_content" OWNER TO "postgres";


COMMENT ON TABLE "public"."course_lesson_content" IS 'Stores individual content items (video, quiz, etc.) for a lesson.';



COMMENT ON COLUMN "public"."course_lesson_content"."due_date" IS 'Due date for assignments and quizzes. Only applicable for content_type = assignment or quiz.';



COMMENT ON COLUMN "public"."course_lesson_content"."retry_settings" IS 'Quiz retry configuration settings for this content item';



CREATE TABLE IF NOT EXISTS "public"."course_lessons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "overview" "text",
    "duration_text" "text"
);


ALTER TABLE "public"."course_lessons" OWNER TO "postgres";


COMMENT ON TABLE "public"."course_lessons" IS 'Stores the individual lessons for a course section.';



COMMENT ON COLUMN "public"."course_lessons"."duration_text" IS 'Estimated time to complete the entire lesson container.';



CREATE TABLE IF NOT EXISTS "public"."course_levels" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."course_levels" OWNER TO "postgres";


ALTER TABLE "public"."course_levels" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."course_levels_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."course_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."course_member_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."course_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."course_members" IS 'Links users to courses with a specific role (teacher or student).';



CREATE TABLE IF NOT EXISTS "public"."course_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "overview" "text"
);


ALTER TABLE "public"."course_sections" OWNER TO "postgres";


COMMENT ON TABLE "public"."course_sections" IS 'Stores the sections or modules for a course.';



CREATE TABLE IF NOT EXISTS "public"."course_thumbnails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "prompt" "text" NOT NULL,
    "style" "text" DEFAULT 'academic'::"text" NOT NULL,
    "image_url" "text" NOT NULL,
    "public_url" "text" NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."course_thumbnails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "subtitle" "text",
    "description" "text",
    "image_url" "text",
    "category_id" integer,
    "language_id" integer,
    "level_id" integer,
    "requirements" "jsonb",
    "learning_outcomes" "jsonb",
    "creator_id" "uuid" DEFAULT "auth"."uid"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "author_id" "uuid",
    "status" "text" DEFAULT 'Draft'::"text" NOT NULL,
    "duration" "text",
    "published_course_id" "uuid",
    "review_feedback" "text",
    "country_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "region_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "city_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "project_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "board_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "class_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "school_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    CONSTRAINT "courses_status_check" CHECK (("status" = ANY (ARRAY['Draft'::"text", 'Published'::"text", 'Under Review'::"text", 'Rejected'::"text"])))
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


COMMENT ON TABLE "public"."courses" IS 'Stores the master record for each course.';



COMMENT ON COLUMN "public"."courses"."country_ids" IS 'Array of country UUIDs where this course is available';



COMMENT ON COLUMN "public"."courses"."region_ids" IS 'Array of region UUIDs where this course is available';



COMMENT ON COLUMN "public"."courses"."city_ids" IS 'Array of city UUIDs where this course is available';



COMMENT ON COLUMN "public"."courses"."project_ids" IS 'Array of project UUIDs this course is associated with';



COMMENT ON COLUMN "public"."courses"."board_ids" IS 'Array of board UUIDs this course is associated with';



COMMENT ON COLUMN "public"."courses"."class_ids" IS 'Array of class UUIDs enrolled for this course';



COMMENT ON COLUMN "public"."courses"."school_ids" IS 'Array of school UUIDs enrolled for this course';



CREATE TABLE IF NOT EXISTS "public"."discussion_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "discussion_id" "uuid",
    "reply_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_like_target" CHECK (((("discussion_id" IS NOT NULL) AND ("reply_id" IS NULL)) OR (("discussion_id" IS NULL) AND ("reply_id" IS NOT NULL))))
);


ALTER TABLE "public"."discussion_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discussion_participants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "discussion_id" "uuid",
    "role" "public"."app_role" NOT NULL
);


ALTER TABLE "public"."discussion_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discussion_replies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "discussion_id" "uuid",
    "user_id" "uuid",
    "content" "text" NOT NULL,
    "parent_reply_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."discussion_replies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discussions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "creator_id" "uuid",
    "course_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "text" DEFAULT 'regular'::"text" NOT NULL
);


ALTER TABLE "public"."discussions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fcm_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fcm_tokens" OWNER TO "postgres";


COMMENT ON TABLE "public"."fcm_tokens" IS 'Stores FCM registration tokens for push notifications';



COMMENT ON COLUMN "public"."fcm_tokens"."user_id" IS 'References the user this token belongs to';



COMMENT ON COLUMN "public"."fcm_tokens"."token" IS 'FCM registration token';



CREATE TABLE IF NOT EXISTS "public"."iris_chat_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_role" "text" DEFAULT 'student'::"text" NOT NULL,
    "query" "text" NOT NULL,
    "response_preview" "text",
    "tools_used" "text"[] DEFAULT '{}'::"text"[],
    "tokens_used" integer DEFAULT 0,
    "success" boolean DEFAULT true,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."iris_chat_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."iris_chat_logs" IS 'Stores IRIS chat interactions for analytics, debugging, and audit purposes';



COMMENT ON COLUMN "public"."iris_chat_logs"."user_id" IS 'Reference to the user who made the query';



COMMENT ON COLUMN "public"."iris_chat_logs"."user_role" IS 'User role at the time of the query';



COMMENT ON COLUMN "public"."iris_chat_logs"."query" IS 'The original user query/message';



COMMENT ON COLUMN "public"."iris_chat_logs"."response_preview" IS 'First 200 characters of the AI response';



COMMENT ON COLUMN "public"."iris_chat_logs"."tools_used" IS 'Array of MCP tools used in the query (e.g., listTables, queryDatabase)';



COMMENT ON COLUMN "public"."iris_chat_logs"."tokens_used" IS 'Total OpenAI tokens consumed for this interaction';



COMMENT ON COLUMN "public"."iris_chat_logs"."success" IS 'Whether the query was processed successfully';



COMMENT ON COLUMN "public"."iris_chat_logs"."error_message" IS 'Error message if the query failed';



CREATE OR REPLACE VIEW "public"."iris_analytics" AS
 SELECT "date_trunc"('day'::"text", "created_at") AS "date",
    "user_role",
    "count"(*) AS "total_queries",
    "count"(*) FILTER (WHERE ("success" = true)) AS "successful_queries",
    "count"(*) FILTER (WHERE ("success" = false)) AS "failed_queries",
    "avg"("tokens_used") AS "avg_tokens_used",
    "sum"("tokens_used") AS "total_tokens_used",
    "unnest"("tools_used") AS "tool_name"
   FROM "public"."iris_chat_logs"
  WHERE ("created_at" >= ("now"() - '30 days'::interval))
  GROUP BY ("date_trunc"('day'::"text", "created_at")), "user_role", ("unnest"("tools_used"))
  ORDER BY ("date_trunc"('day'::"text", "created_at")) DESC;


ALTER VIEW "public"."iris_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."login_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "attempt_time" timestamp with time zone DEFAULT "now"(),
    "success" boolean DEFAULT false,
    "failure_reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."login_attempts" OWNER TO "postgres";


COMMENT ON TABLE "public"."login_attempts" IS 'Tracks all login attempts (successful and failed) for security monitoring';



COMMENT ON COLUMN "public"."login_attempts"."email" IS 'Email address used in login attempt';



COMMENT ON COLUMN "public"."login_attempts"."success" IS 'Whether the login attempt was successful';



COMMENT ON COLUMN "public"."login_attempts"."failure_reason" IS 'Reason for login failure if applicable';



CREATE TABLE IF NOT EXISTS "public"."message_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "message_status_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'delivered'::"text", 'read'::"text"])))
);


ALTER TABLE "public"."message_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "message_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "reply_to_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_edited" boolean DEFAULT false,
    "is_deleted" boolean DEFAULT false,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'file'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" character varying(255) NOT NULL,
    "message" "text" NOT NULL,
    "type" character varying(20) NOT NULL,
    "notification_type" character varying(50),
    "read" boolean DEFAULT false NOT NULL,
    "action_url" "text",
    "action_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_action_data_check" CHECK ((("action_data" IS NULL) OR ("jsonb_typeof"("action_data") = 'object'::"text"))),
    CONSTRAINT "notifications_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['info'::character varying, 'success'::character varying, 'warning'::character varying, 'error'::character varying])::"text"[])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Stores user notifications for the application';



COMMENT ON COLUMN "public"."notifications"."user_id" IS 'References the user who owns this notification';



COMMENT ON COLUMN "public"."notifications"."type" IS 'Type of notification: info, success, warning, or error';



COMMENT ON COLUMN "public"."notifications"."notification_type" IS 'Specific notification type for routing: new_discussion, new_message, etc.';



COMMENT ON COLUMN "public"."notifications"."read" IS 'Whether the notification has been read by the user';



COMMENT ON COLUMN "public"."notifications"."action_url" IS 'Optional URL to navigate to when notification is clicked';



COMMENT ON COLUMN "public"."notifications"."action_data" IS 'Additional data for routing (e.g., discussion_id, message_id, etc.)';



CREATE TABLE IF NOT EXISTS "public"."observation_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "observer_name" character varying(255) NOT NULL,
    "observer_role" character varying(50) NOT NULL,
    "school_name" character varying(255) NOT NULL,
    "teacher_name" character varying(255) NOT NULL,
    "observation_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "lesson_code" character varying(100) NOT NULL,
    "project_name" character varying(255) NOT NULL,
    "overall_score" integer NOT NULL,
    "status" character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    "form_data" "jsonb" NOT NULL,
    "submitted_by" "uuid" NOT NULL,
    "show_teal_observations" boolean DEFAULT false,
    "observer_id" "uuid",
    "school_id" "uuid",
    "teacher_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "observation_reports_observer_role_check" CHECK ((("observer_role")::"text" = ANY ((ARRAY['principal'::character varying, 'ece'::character varying, 'school-officer'::character varying, 'project-manager'::character varying])::"text"[]))),
    CONSTRAINT "observation_reports_overall_score_check" CHECK ((("overall_score" >= 0) AND ("overall_score" <= 100))),
    CONSTRAINT "observation_reports_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['completed'::character varying, 'draft'::character varying])::"text"[])))
);


ALTER TABLE "public"."observation_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "grade" "text",
    "teacher_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "two_factor_backup_codes" "text"[],
    "two_factor_setup_completed_at" timestamp with time zone,
    "mfa_reset_required" boolean DEFAULT false,
    "mfa_reset_requested_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "phone_number" character varying(20),
    "avatar_url" "text",
    "notification_preferences" "jsonb" DEFAULT '{"push": false, "inApp": true}'::"jsonb",
    "theme_preference" character varying(10) DEFAULT 'auto'::character varying
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Profiles table with 2FA columns preserved for core authentication system';



COMMENT ON COLUMN "public"."profiles"."first_name" IS 'User first name - editable in profile settings';



COMMENT ON COLUMN "public"."profiles"."last_name" IS 'User last name - editable in profile settings';



COMMENT ON COLUMN "public"."profiles"."two_factor_backup_codes" IS 'Array of backup codes for MFA recovery - managed by core authentication system';



COMMENT ON COLUMN "public"."profiles"."two_factor_setup_completed_at" IS 'Timestamp when 2FA setup was completed - managed by core authentication system';



COMMENT ON COLUMN "public"."profiles"."mfa_reset_required" IS 'Flag indicating if MFA reset is required - managed by core authentication system';



COMMENT ON COLUMN "public"."profiles"."mfa_reset_requested_at" IS 'Timestamp when MFA reset was requested - managed by core authentication system';



COMMENT ON COLUMN "public"."profiles"."phone_number" IS 'User phone number - editable in profile settings';



COMMENT ON COLUMN "public"."profiles"."avatar_url" IS 'URL to user profile picture - managed in profile settings';



COMMENT ON COLUMN "public"."profiles"."notification_preferences" IS 'User notification preferences - managed in profile settings';



COMMENT ON COLUMN "public"."profiles"."theme_preference" IS 'User theme preference (light/dark/auto) - managed in profile settings';



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "code" character varying(20) NOT NULL,
    "country_id" "uuid" NOT NULL,
    "region_id" "uuid" NOT NULL,
    "city_id" "uuid" NOT NULL,
    "description" "text",
    "status" character varying(20) DEFAULT 'active'::character varying,
    "start_date" "date",
    "end_date" "date",
    "budget" numeric(15,2),
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "projects_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'completed'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON TABLE "public"."projects" IS 'Educational projects within specific locations';



COMMENT ON COLUMN "public"."projects"."code" IS 'Unique project identifier';



CREATE OR REPLACE VIEW "public"."project_statistics" AS
 SELECT "p"."id",
    "p"."name",
    "p"."code",
    "p"."status",
    "count"(DISTINCT "b"."id") AS "total_boards",
    "count"(DISTINCT "s"."id") AS "total_schools",
    "sum"("s"."total_students") AS "total_students",
    "sum"("s"."total_teachers") AS "total_teachers"
   FROM (("public"."projects" "p"
     LEFT JOIN "public"."boards" "b" ON (("p"."id" = "b"."project_id")))
     LEFT JOIN "public"."schools" "s" ON (("b"."id" = "s"."board_id")))
  GROUP BY "p"."id", "p"."name", "p"."code", "p"."status";


ALTER VIEW "public"."project_statistics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "option_text" "text" NOT NULL,
    "is_correct" boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."question_options" OWNER TO "postgres";


COMMENT ON TABLE "public"."question_options" IS 'Stores the answer options for a quiz question.';



CREATE TABLE IF NOT EXISTS "public"."quiz_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_content_id" "uuid" NOT NULL,
    "attempt_number" integer DEFAULT 1 NOT NULL,
    "answers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "results" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "score" numeric(5,2),
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "retry_reason" "text",
    "teacher_approval_required" boolean DEFAULT false,
    "teacher_approved" boolean DEFAULT false,
    "teacher_approved_by" "uuid",
    "teacher_approved_at" timestamp with time zone,
    "teacher_approval_notes" "text",
    "study_materials_completed" boolean DEFAULT false,
    "study_materials_completed_at" timestamp with time zone,
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quiz_attempts" OWNER TO "postgres";


COMMENT ON TABLE "public"."quiz_attempts" IS 'Tracks all quiz attempts including retries with academic integrity measures';



COMMENT ON COLUMN "public"."quiz_attempts"."attempt_number" IS 'Sequential attempt number (1, 2, 3, etc.)';



COMMENT ON COLUMN "public"."quiz_attempts"."retry_reason" IS 'Reason provided by student for retry request';



COMMENT ON COLUMN "public"."quiz_attempts"."teacher_approval_required" IS 'Whether this attempt requires teacher approval';



COMMENT ON COLUMN "public"."quiz_attempts"."teacher_approved" IS 'Whether teacher has approved this attempt';



COMMENT ON COLUMN "public"."quiz_attempts"."study_materials_completed" IS 'Whether required study materials were completed before retry';



CREATE TABLE IF NOT EXISTS "public"."quiz_course_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "lesson_content_id" "uuid",
    "link_type" "text" NOT NULL,
    "position" integer DEFAULT 0,
    "is_required" boolean DEFAULT true,
    "due_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "quiz_course_links_link_type_check" CHECK (("link_type" = ANY (ARRAY['standalone'::"text", 'embedded'::"text"])))
);


ALTER TABLE "public"."quiz_course_links" OWNER TO "postgres";


COMMENT ON TABLE "public"."quiz_course_links" IS 'Links between standalone quizzes and courses';



CREATE TABLE IF NOT EXISTS "public"."quiz_math_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_submission_id" "uuid",
    "question_id" "uuid",
    "user_id" "uuid",
    "latex_expression" "text" NOT NULL,
    "simplified_form" "text",
    "is_correct" boolean DEFAULT false,
    "similarity_score" numeric(5,4),
    "evaluated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quiz_math_answers" OWNER TO "postgres";


COMMENT ON TABLE "public"."quiz_math_answers" IS 'Stores mathematical expression answers from students';



COMMENT ON COLUMN "public"."quiz_math_answers"."latex_expression" IS 'Student input in LaTeX format';



COMMENT ON COLUMN "public"."quiz_math_answers"."simplified_form" IS 'Simplified form of the expression for comparison';



COMMENT ON COLUMN "public"."quiz_math_answers"."is_correct" IS 'Whether the answer is mathematically correct';



COMMENT ON COLUMN "public"."quiz_math_answers"."similarity_score" IS 'Similarity score (0-1) to the correct answer';



CREATE TABLE IF NOT EXISTS "public"."quiz_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "quiz_members_role_check" CHECK (("role" = ANY (ARRAY['teacher'::"text", 'student'::"text"])))
);


ALTER TABLE "public"."quiz_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."quiz_members" IS 'Manages teacher and student access to standalone quizzes';



COMMENT ON COLUMN "public"."quiz_members"."quiz_id" IS 'Reference to the standalone quiz';



COMMENT ON COLUMN "public"."quiz_members"."user_id" IS 'Reference to the user (teacher or student)';



COMMENT ON COLUMN "public"."quiz_members"."role" IS 'Role of the user: teacher or student';



CREATE TABLE IF NOT EXISTS "public"."quiz_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lesson_content_id" "uuid" NOT NULL,
    "question_text" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "question_type" "text" DEFAULT 'single_choice'::"text" NOT NULL,
    "math_expression" "text",
    "math_tolerance" numeric(5,4) DEFAULT 0.01,
    "math_hint" "text",
    "math_allow_drawing" boolean DEFAULT false,
    CONSTRAINT "quiz_questions_question_type_check" CHECK (("question_type" = ANY (ARRAY['single_choice'::"text", 'multiple_choice'::"text", 'text_answer'::"text", 'math_expression'::"text"])))
);


ALTER TABLE "public"."quiz_questions" OWNER TO "postgres";


COMMENT ON TABLE "public"."quiz_questions" IS 'Stores the questions for a specific lesson quiz content item.';



COMMENT ON COLUMN "public"."quiz_questions"."question_type" IS 'Type of question: single_choice (one correct answer), multiple_choice (multiple correct answers), text_answer (manual grading required), math_expression (mathematical expression input)';



COMMENT ON COLUMN "public"."quiz_questions"."math_expression" IS 'LaTeX expression representing the correct mathematical answer';



COMMENT ON COLUMN "public"."quiz_questions"."math_tolerance" IS 'Acceptable numerical variance for math answers (0.01 = 1%)';



COMMENT ON COLUMN "public"."quiz_questions"."math_hint" IS 'Optional hint to help students with the math question';



COMMENT ON COLUMN "public"."quiz_questions"."math_allow_drawing" IS 'Whether drawing canvas is enabled for this math expression question';



CREATE TABLE IF NOT EXISTS "public"."quiz_retry_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_content_id" "uuid" NOT NULL,
    "current_attempt_id" "uuid" NOT NULL,
    "request_reason" "text" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "review_notes" "text",
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "quiz_retry_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."quiz_retry_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."quiz_retry_requests" IS 'Tracks retry requests that require teacher approval';



COMMENT ON COLUMN "public"."quiz_retry_requests"."status" IS 'Status of the retry request: pending, approved, rejected, expired';



CREATE TABLE IF NOT EXISTS "public"."quiz_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "answers" "jsonb" NOT NULL,
    "score" double precision,
    "results" "jsonb",
    "lesson_content_id" "uuid",
    "manual_grading_required" boolean DEFAULT false NOT NULL,
    "manual_grading_completed" boolean DEFAULT false NOT NULL,
    "manual_grading_score" numeric(5,2),
    "manual_grading_feedback" "text",
    "manual_grading_completed_at" timestamp with time zone,
    "manual_grading_completed_by" "uuid",
    "drawing_data" "jsonb",
    "attempt_number" integer DEFAULT 1 NOT NULL,
    "previous_attempt_id" "uuid",
    "retry_reason" "text",
    "is_latest_attempt" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."quiz_submissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."quiz_submissions" IS 'Manual grading logic is now handled entirely in the frontend. The manual_grading_required and manual_grading_completed fields are set by the application logic.';



COMMENT ON COLUMN "public"."quiz_submissions"."score" IS 'Score for the quiz. Can be null for text answer questions that require manual grading.';



COMMENT ON COLUMN "public"."quiz_submissions"."manual_grading_required" IS 'Indicates if this submission requires manual grading due to text answer questions';



COMMENT ON COLUMN "public"."quiz_submissions"."manual_grading_completed" IS 'Indicates if manual grading has been completed';



COMMENT ON COLUMN "public"."quiz_submissions"."manual_grading_score" IS 'Score given by teacher for manual grading (0-100)';



COMMENT ON COLUMN "public"."quiz_submissions"."manual_grading_feedback" IS 'Feedback provided by teacher for manual grading';



COMMENT ON COLUMN "public"."quiz_submissions"."manual_grading_completed_at" IS 'Timestamp when manual grading was completed';



COMMENT ON COLUMN "public"."quiz_submissions"."manual_grading_completed_by" IS 'ID of the teacher who completed the manual grading';



COMMENT ON COLUMN "public"."quiz_submissions"."drawing_data" IS 'JSON data containing student drawings for math questions';



COMMENT ON COLUMN "public"."quiz_submissions"."attempt_number" IS 'Sequential attempt number for this user/lesson combination (1, 2, 3, etc.)';



COMMENT ON COLUMN "public"."quiz_submissions"."previous_attempt_id" IS 'Reference to the previous attempt (for retry tracking)';



COMMENT ON COLUMN "public"."quiz_submissions"."retry_reason" IS 'Reason for retry (e.g., "Automatic retry - no approval required")';



COMMENT ON COLUMN "public"."quiz_submissions"."is_latest_attempt" IS 'True if this is the most recent attempt for this user/lesson combination';



CREATE TABLE IF NOT EXISTS "public"."regions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "code" character varying(10) NOT NULL,
    "country_id" "uuid" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."regions" OWNER TO "postgres";


COMMENT ON TABLE "public"."regions" IS 'Geographic regions within countries';



COMMENT ON COLUMN "public"."regions"."code" IS 'Region code within the country';



CREATE OR REPLACE VIEW "public"."school_hierarchy" AS
 SELECT "s"."id" AS "school_id",
    "s"."name" AS "school_name",
    "s"."code" AS "school_code",
    "s"."school_type",
    "s"."status" AS "school_status",
    "b"."name" AS "board_name",
    "b"."code" AS "board_code",
    "p"."name" AS "project_name",
    "p"."code" AS "project_code",
    "c"."name" AS "city_name",
    "c"."code" AS "city_code",
    "r"."name" AS "region_name",
    "r"."code" AS "region_code",
    "co"."name" AS "country_name",
    "co"."code" AS "country_code"
   FROM ((((("public"."schools" "s"
     JOIN "public"."boards" "b" ON (("s"."board_id" = "b"."id")))
     JOIN "public"."projects" "p" ON (("s"."project_id" = "p"."id")))
     JOIN "public"."cities" "c" ON (("s"."city_id" = "c"."id")))
     JOIN "public"."regions" "r" ON (("s"."region_id" = "r"."id")))
     JOIN "public"."countries" "co" ON (("s"."country_id" = "co"."id")));


ALTER VIEW "public"."school_hierarchy" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."secure_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" character varying(50) NOT NULL,
    "observer_role" character varying(50) NOT NULL,
    "token" character varying(255) NOT NULL,
    "full_url" "text" NOT NULL,
    "expiry" timestamp with time zone NOT NULL,
    "status" character varying(20) DEFAULT 'active'::character varying NOT NULL,
    "used_by" character varying(255),
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" NOT NULL,
    "expiry_days" integer NOT NULL,
    CONSTRAINT "secure_links_expiry_days_check" CHECK (("expiry_days" > 0)),
    CONSTRAINT "secure_links_observer_role_check" CHECK ((("observer_role")::"text" = ANY ((ARRAY['principal'::character varying, 'ece'::character varying, 'school-officer'::character varying, 'project-manager'::character varying])::"text"[]))),
    CONSTRAINT "secure_links_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['Principal'::character varying, 'ECE Observer'::character varying, 'School Officer'::character varying, 'Project Manager'::character varying])::"text"[]))),
    CONSTRAINT "secure_links_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'expired'::character varying, 'used'::character varying, 'deactivated'::character varying])::"text"[])))
);


ALTER TABLE "public"."secure_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alert_type" character varying(50) NOT NULL,
    "message" "text" NOT NULL,
    "severity" character varying(20) NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_resolved" boolean DEFAULT false,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "security_alerts_alert_type_check" CHECK ((("alert_type")::"text" = ANY ((ARRAY['info'::character varying, 'warning'::character varying, 'error'::character varying, 'success'::character varying])::"text"[]))),
    CONSTRAINT "security_alerts_severity_check" CHECK ((("severity")::"text" = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::"text"[])))
);


ALTER TABLE "public"."security_alerts" OWNER TO "postgres";


COMMENT ON TABLE "public"."security_alerts" IS 'Stores security-related system alerts and notifications';



CREATE TABLE IF NOT EXISTS "public"."security_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "setting_key" character varying(100) NOT NULL,
    "setting_value" "text" NOT NULL,
    "setting_type" character varying(50) NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "security_settings_setting_type_check" CHECK ((("setting_type")::"text" = ANY ((ARRAY['boolean'::character varying, 'integer'::character varying, 'string'::character varying])::"text"[])))
);


ALTER TABLE "public"."security_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."security_settings" IS 'Stores system-wide security and authentication settings';



COMMENT ON COLUMN "public"."security_settings"."setting_key" IS 'Unique identifier for the setting';



COMMENT ON COLUMN "public"."security_settings"."setting_value" IS 'Current value of the setting';



COMMENT ON COLUMN "public"."security_settings"."setting_type" IS 'Data type of the setting value';



CREATE TABLE IF NOT EXISTS "public"."standalone_question_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "option_text" "text" NOT NULL,
    "is_correct" boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."standalone_question_options" OWNER TO "postgres";


COMMENT ON TABLE "public"."standalone_question_options" IS 'Answer options for standalone quiz questions';



CREATE TABLE IF NOT EXISTS "public"."standalone_quiz_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "attempt_number" integer DEFAULT 1 NOT NULL,
    "answers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "results" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "score" numeric(5,2) DEFAULT NULL::numeric,
    "time_taken_minutes" integer,
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "retry_reason" "text",
    "teacher_approval_required" boolean DEFAULT false,
    "teacher_approved" boolean,
    "teacher_approved_by" "uuid",
    "teacher_approved_at" timestamp with time zone,
    "teacher_approval_notes" "text",
    "study_materials_completed" boolean DEFAULT false,
    "study_materials_completed_at" timestamp with time zone,
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "manual_grading_required" boolean DEFAULT false NOT NULL,
    "manual_grading_completed" boolean DEFAULT false NOT NULL,
    "manual_grading_score" numeric(5,2),
    "manual_grading_feedback" "text",
    "manual_grading_completed_at" timestamp with time zone,
    "manual_grading_completed_by" "uuid"
);


ALTER TABLE "public"."standalone_quiz_attempts" OWNER TO "postgres";


COMMENT ON TABLE "public"."standalone_quiz_attempts" IS 'User attempts on standalone quizzes';



COMMENT ON COLUMN "public"."standalone_quiz_attempts"."manual_grading_required" IS 'Indicates if this attempt requires manual grading due to text answer questions';



COMMENT ON COLUMN "public"."standalone_quiz_attempts"."manual_grading_completed" IS 'Indicates if manual grading has been completed';



COMMENT ON COLUMN "public"."standalone_quiz_attempts"."manual_grading_score" IS 'Score given by teacher for manual grading (0-100)';



COMMENT ON COLUMN "public"."standalone_quiz_attempts"."manual_grading_feedback" IS 'Feedback provided by teacher for manual grading';



COMMENT ON COLUMN "public"."standalone_quiz_attempts"."manual_grading_completed_at" IS 'Timestamp when manual grading was completed';



COMMENT ON COLUMN "public"."standalone_quiz_attempts"."manual_grading_completed_by" IS 'ID of the teacher who completed the manual grading';



CREATE TABLE IF NOT EXISTS "public"."standalone_quiz_math_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_submission_id" "uuid",
    "question_id" "uuid",
    "user_id" "uuid",
    "latex_expression" "text" NOT NULL,
    "simplified_form" "text",
    "is_correct" boolean,
    "similarity_score" numeric(5,4) DEFAULT NULL::numeric,
    "evaluated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."standalone_quiz_math_answers" OWNER TO "postgres";


COMMENT ON TABLE "public"."standalone_quiz_math_answers" IS 'Math expression answers for standalone quiz questions';



CREATE TABLE IF NOT EXISTS "public"."standalone_quiz_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "question_text" "text" NOT NULL,
    "question_type" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "points" numeric(5,2) DEFAULT 1.00,
    "explanation" "text",
    "math_expression" "text",
    "math_tolerance" numeric(5,4) DEFAULT 0.0001,
    "math_hint" "text",
    "math_allow_drawing" boolean DEFAULT false,
    "is_required" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "standalone_quiz_questions_question_type_check" CHECK (("question_type" = ANY (ARRAY['single_choice'::"text", 'multiple_choice'::"text", 'text_answer'::"text", 'math_expression'::"text"])))
);


ALTER TABLE "public"."standalone_quiz_questions" OWNER TO "postgres";


COMMENT ON TABLE "public"."standalone_quiz_questions" IS 'Questions belonging to standalone quizzes';



CREATE TABLE IF NOT EXISTS "public"."standalone_quiz_retry_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "attempt_id" "uuid" NOT NULL,
    "request_reason" "text" NOT NULL,
    "request_details" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "review_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "standalone_quiz_retry_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."standalone_quiz_retry_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."standalone_quiz_retry_requests" IS 'Requests for retaking standalone quizzes';



CREATE TABLE IF NOT EXISTS "public"."standalone_quizzes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "instructions" "text",
    "time_limit_minutes" integer,
    "max_attempts" integer DEFAULT 1,
    "passing_score" numeric(5,2) DEFAULT 70.00,
    "shuffle_questions" boolean DEFAULT false,
    "shuffle_options" boolean DEFAULT false,
    "show_correct_answers" boolean DEFAULT true,
    "show_results_immediately" boolean DEFAULT true,
    "allow_retake" boolean DEFAULT false,
    "retry_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'draft'::"text",
    "visibility" "text" DEFAULT 'private'::"text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "difficulty_level" "text" DEFAULT 'medium'::"text",
    "estimated_duration_minutes" integer,
    "author_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "published_at" timestamp with time zone,
    CONSTRAINT "standalone_quizzes_difficulty_level_check" CHECK (("difficulty_level" = ANY (ARRAY['easy'::"text", 'medium'::"text", 'hard'::"text"]))),
    CONSTRAINT "standalone_quizzes_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"]))),
    CONSTRAINT "standalone_quizzes_visibility_check" CHECK (("visibility" = ANY (ARRAY['private'::"text", 'public'::"text", 'restricted'::"text"])))
);


ALTER TABLE "public"."standalone_quizzes" OWNER TO "postgres";


COMMENT ON TABLE "public"."standalone_quizzes" IS 'Standalone quizzes that can be used independently or linked to courses';



CREATE OR REPLACE VIEW "public"."standalone_quiz_summary" AS
 SELECT "sq"."id",
    "sq"."title",
    "sq"."description",
    "sq"."status",
    "sq"."visibility",
    "sq"."difficulty_level",
    "sq"."estimated_duration_minutes",
    "sq"."max_attempts",
    "sq"."passing_score",
    "sq"."author_id",
    (("p"."first_name" || ' '::"text") || "p"."last_name") AS "author_name",
    "p"."email" AS "author_email",
    "count"(DISTINCT "sqq"."id") AS "total_questions",
    "count"(DISTINCT "sqa"."id") AS "total_attempts",
    "count"(DISTINCT "sqa"."user_id") AS "unique_users",
    "round"("avg"("sqa"."score"), 2) AS "average_score",
    "round"(((("count"(*) FILTER (WHERE ("sqa"."score" >= "sq"."passing_score")))::numeric / (NULLIF("count"("sqa"."id"), 0))::numeric) * (100)::numeric), 2) AS "pass_rate",
    "sq"."created_at",
    "sq"."updated_at",
    "sq"."published_at"
   FROM ((("public"."standalone_quizzes" "sq"
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "sq"."author_id")))
     LEFT JOIN "public"."standalone_quiz_questions" "sqq" ON (("sq"."id" = "sqq"."quiz_id")))
     LEFT JOIN "public"."standalone_quiz_attempts" "sqa" ON (("sq"."id" = "sqa"."quiz_id")))
  GROUP BY "sq"."id", "sq"."title", "sq"."description", "sq"."status", "sq"."visibility", "sq"."difficulty_level", "sq"."estimated_duration_minutes", "sq"."max_attempts", "sq"."passing_score", "sq"."author_id", "p"."first_name", "p"."last_name", "p"."email", "sq"."created_at", "sq"."updated_at", "sq"."published_at";


ALTER VIEW "public"."standalone_quiz_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."standalone_quiz_summary" IS 'Summary view of standalone quizzes with statistics';



CREATE TABLE IF NOT EXISTS "public"."standalone_quiz_text_answer_grades" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "attempt_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "grade" numeric(5,2) NOT NULL,
    "feedback" "text",
    "graded_by" "uuid" NOT NULL,
    "graded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "standalone_quiz_text_answer_grades_grade_check" CHECK ((("grade" >= (0)::numeric) AND ("grade" <= (100)::numeric)))
);


ALTER TABLE "public"."standalone_quiz_text_answer_grades" OWNER TO "postgres";


COMMENT ON TABLE "public"."standalone_quiz_text_answer_grades" IS 'Stores individual grades for text answer questions in standalone quiz attempts';



COMMENT ON COLUMN "public"."standalone_quiz_text_answer_grades"."grade" IS 'Grade for this text answer question (0-100)';



COMMENT ON COLUMN "public"."standalone_quiz_text_answer_grades"."feedback" IS 'Teacher feedback for this specific question';



CREATE TABLE IF NOT EXISTS "public"."text_answer_grades" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_submission_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "grade" numeric(5,2) NOT NULL,
    "feedback" "text",
    "graded_by" "uuid" NOT NULL,
    "graded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "text_answer_grades_grade_check" CHECK ((("grade" >= (0)::numeric) AND ("grade" <= (100)::numeric)))
);


ALTER TABLE "public"."text_answer_grades" OWNER TO "postgres";


COMMENT ON TABLE "public"."text_answer_grades" IS 'Stores individual grades and feedback for text answer questions';



COMMENT ON COLUMN "public"."text_answer_grades"."quiz_submission_id" IS 'Reference to the quiz submission';



COMMENT ON COLUMN "public"."text_answer_grades"."question_id" IS 'Reference to the specific question';



COMMENT ON COLUMN "public"."text_answer_grades"."grade" IS 'Grade given for this question (0-100)';



COMMENT ON COLUMN "public"."text_answer_grades"."feedback" IS 'Feedback provided for this question';



COMMENT ON COLUMN "public"."text_answer_grades"."graded_by" IS 'ID of the teacher who graded this question';



COMMENT ON COLUMN "public"."text_answer_grades"."graded_at" IS 'Timestamp when this question was graded';



CREATE TABLE IF NOT EXISTS "public"."user_content_item_progress" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "lesson_content_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'not_started'::"text" NOT NULL,
    "progress_data" "jsonb",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_content_item_progress" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_content_item_progress" IS 'Tracks completion status for each content item within a lesson for a user.';



ALTER TABLE "public"."user_content_item_progress" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."user_content_item_progress_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_token" "text" NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "location" "text",
    "is_active" boolean DEFAULT true,
    "last_activity" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_sessions" IS 'Tracks active user sessions for security monitoring';



CREATE TABLE IF NOT EXISTS "public"."user_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'offline'::"text" NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"(),
    "is_typing" boolean DEFAULT false,
    "typing_in_conversation" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_status_status_check" CHECK (("status" = ANY (ARRAY['online'::"text", 'offline'::"text", 'away'::"text", 'busy'::"text"])))
);


ALTER TABLE "public"."user_status" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ai_tutor_content_hierarchy" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ai_tutor_content_hierarchy_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ai_tutor_user_exercise_progress" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ai_tutor_user_exercise_progress_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ai_tutor_user_stage_progress" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ai_tutor_user_stage_progress_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ai_tutor_user_topic_progress" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ai_tutor_user_topic_progress_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."access_logs"
    ADD CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_prompts"
    ADD CONSTRAINT "ai_prompts_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."ai_prompts"
    ADD CONSTRAINT "ai_prompts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_report_interactions"
    ADD CONSTRAINT "ai_report_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_safety_ethics_settings"
    ADD CONSTRAINT "ai_safety_ethics_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_tutor_content_hierarchy"
    ADD CONSTRAINT "ai_tutor_content_hierarchy_hierarchy_path_key" UNIQUE ("hierarchy_path");



ALTER TABLE ONLY "public"."ai_tutor_content_hierarchy"
    ADD CONSTRAINT "ai_tutor_content_hierarchy_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_tutor_daily_learning_analytics"
    ADD CONSTRAINT "ai_tutor_daily_learning_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_tutor_daily_learning_analytics"
    ADD CONSTRAINT "ai_tutor_daily_learning_analytics_user_id_analytics_date_key" UNIQUE ("user_id", "analytics_date");



ALTER TABLE ONLY "public"."ai_tutor_learning_milestones"
    ADD CONSTRAINT "ai_tutor_learning_milestones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_tutor_learning_unlocks"
    ADD CONSTRAINT "ai_tutor_learning_unlocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_tutor_learning_unlocks"
    ADD CONSTRAINT "ai_tutor_learning_unlocks_user_id_stage_id_exercise_id_key" UNIQUE ("user_id", "stage_id", "exercise_id");



ALTER TABLE ONLY "public"."ai_tutor_settings"
    ADD CONSTRAINT "ai_tutor_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_tutor_user_exercise_progress"
    ADD CONSTRAINT "ai_tutor_user_exercise_progres_user_id_stage_id_exercise_id_key" UNIQUE ("user_id", "stage_id", "exercise_id");



ALTER TABLE ONLY "public"."ai_tutor_user_exercise_progress"
    ADD CONSTRAINT "ai_tutor_user_exercise_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_tutor_user_stage_progress"
    ADD CONSTRAINT "ai_tutor_user_stage_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_tutor_user_stage_progress"
    ADD CONSTRAINT "ai_tutor_user_stage_progress_user_id_stage_id_key" UNIQUE ("user_id", "stage_id");



ALTER TABLE ONLY "public"."ai_tutor_user_topic_progress"
    ADD CONSTRAINT "ai_tutor_user_topic_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_tutor_user_topic_progress"
    ADD CONSTRAINT "ai_tutor_user_topic_progress_user_id_stage_id_exercise_id_t_key" UNIQUE ("user_id", "stage_id", "exercise_id", "topic_id", "attempt_num");



ALTER TABLE ONLY "public"."ai_tutor_weekly_progress_summaries"
    ADD CONSTRAINT "ai_tutor_weekly_progress_summaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_tutor_weekly_progress_summaries"
    ADD CONSTRAINT "ai_tutor_weekly_progress_summaries_user_id_week_start_date_key" UNIQUE ("user_id", "week_start_date");



ALTER TABLE ONLY "public"."apex_contact_info"
    ADD CONSTRAINT "apex_contact_info_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."apex_faqs"
    ADD CONSTRAINT "apex_faqs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."apex_knowledge_base"
    ADD CONSTRAINT "apex_knowledge_base_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assignment_submissions"
    ADD CONSTRAINT "assignment_submissions_assignment_id_user_id_key" UNIQUE ("assignment_id", "user_id");



ALTER TABLE ONLY "public"."assignment_submissions"
    ADD CONSTRAINT "assignment_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."boards"
    ADD CONSTRAINT "boards_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."boards"
    ADD CONSTRAINT "boards_name_project_id_key" UNIQUE ("name", "project_id");



ALTER TABLE ONLY "public"."boards"
    ADD CONSTRAINT "boards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_code_region_id_key" UNIQUE ("code", "region_id");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_name_region_id_key" UNIQUE ("name", "region_id");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_students"
    ADD CONSTRAINT "class_students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_teachers"
    ADD CONSTRAINT "class_teachers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_code_key" UNIQUE ("code");



COMMENT ON CONSTRAINT "classes_code_key" ON "public"."classes" IS 'Ensures class codes are unique across the entire system';



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_user_id_key" UNIQUE ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_categories"
    ADD CONSTRAINT "course_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."course_categories"
    ADD CONSTRAINT "course_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_languages"
    ADD CONSTRAINT "course_languages_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."course_languages"
    ADD CONSTRAINT "course_languages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_lesson_content"
    ADD CONSTRAINT "course_lesson_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_lessons"
    ADD CONSTRAINT "course_lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_levels"
    ADD CONSTRAINT "course_levels_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."course_levels"
    ADD CONSTRAINT "course_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_members"
    ADD CONSTRAINT "course_members_course_user_unique" UNIQUE ("course_id", "user_id");



ALTER TABLE ONLY "public"."course_members"
    ADD CONSTRAINT "course_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_sections"
    ADD CONSTRAINT "course_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_thumbnails"
    ADD CONSTRAINT "course_thumbnails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discussion_likes"
    ADD CONSTRAINT "discussion_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discussion_participants"
    ADD CONSTRAINT "discussion_participants_discussion_id_role_key" UNIQUE ("discussion_id", "role");



ALTER TABLE ONLY "public"."discussion_participants"
    ADD CONSTRAINT "discussion_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discussion_replies"
    ADD CONSTRAINT "discussion_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fcm_tokens"
    ADD CONSTRAINT "fcm_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fcm_tokens"
    ADD CONSTRAINT "fcm_tokens_user_id_token_key" UNIQUE ("user_id", "token");



ALTER TABLE ONLY "public"."iris_chat_logs"
    ADD CONSTRAINT "iris_chat_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."login_attempts"
    ADD CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_status"
    ADD CONSTRAINT "message_status_message_id_user_id_key" UNIQUE ("message_id", "user_id");



ALTER TABLE ONLY "public"."message_status"
    ADD CONSTRAINT "message_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."observation_reports"
    ADD CONSTRAINT "observation_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_name_city_id_key" UNIQUE ("name", "city_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_options"
    ADD CONSTRAINT "question_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_course_links"
    ADD CONSTRAINT "quiz_course_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_course_links"
    ADD CONSTRAINT "quiz_course_links_unique_quiz_course" UNIQUE ("quiz_id", "course_id");



ALTER TABLE ONLY "public"."quiz_math_answers"
    ADD CONSTRAINT "quiz_math_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_members"
    ADD CONSTRAINT "quiz_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_members"
    ADD CONSTRAINT "quiz_members_quiz_id_user_id_key" UNIQUE ("quiz_id", "user_id");



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_retry_requests"
    ADD CONSTRAINT "quiz_retry_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_submissions"
    ADD CONSTRAINT "quiz_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."regions"
    ADD CONSTRAINT "regions_code_country_id_key" UNIQUE ("code", "country_id");



ALTER TABLE ONLY "public"."regions"
    ADD CONSTRAINT "regions_name_country_id_key" UNIQUE ("name", "country_id");



ALTER TABLE ONLY "public"."regions"
    ADD CONSTRAINT "regions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_name_board_id_key" UNIQUE ("name", "board_id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."secure_links"
    ADD CONSTRAINT "secure_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."secure_links"
    ADD CONSTRAINT "secure_links_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."security_alerts"
    ADD CONSTRAINT "security_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_settings"
    ADD CONSTRAINT "security_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_settings"
    ADD CONSTRAINT "security_settings_setting_key_key" UNIQUE ("setting_key");



ALTER TABLE ONLY "public"."standalone_question_options"
    ADD CONSTRAINT "standalone_question_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."standalone_quiz_attempts"
    ADD CONSTRAINT "standalone_quiz_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."standalone_quiz_math_answers"
    ADD CONSTRAINT "standalone_quiz_math_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."standalone_quiz_questions"
    ADD CONSTRAINT "standalone_quiz_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."standalone_quiz_retry_requests"
    ADD CONSTRAINT "standalone_quiz_retry_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."standalone_quiz_text_answer_grades"
    ADD CONSTRAINT "standalone_quiz_text_answer_grades_attempt_id_question_id_key" UNIQUE ("attempt_id", "question_id");



ALTER TABLE ONLY "public"."standalone_quiz_text_answer_grades"
    ADD CONSTRAINT "standalone_quiz_text_answer_grades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."standalone_quizzes"
    ADD CONSTRAINT "standalone_quizzes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."text_answer_grades"
    ADD CONSTRAINT "text_answer_grades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."text_answer_grades"
    ADD CONSTRAINT "text_answer_grades_quiz_submission_id_question_id_key" UNIQUE ("quiz_submission_id", "question_id");



ALTER TABLE ONLY "public"."class_students"
    ADD CONSTRAINT "unique_student_per_class" UNIQUE ("class_id", "student_id");



ALTER TABLE ONLY "public"."class_teachers"
    ADD CONSTRAINT "unique_teacher_per_class" UNIQUE ("class_id", "teacher_id");



ALTER TABLE ONLY "public"."user_content_item_progress"
    ADD CONSTRAINT "user_content_item_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_content_item_progress"
    ADD CONSTRAINT "user_content_item_progress_user_id_lesson_content_id_key" UNIQUE ("user_id", "lesson_content_id");



ALTER TABLE ONLY "public"."ai_tutor_user_progress_summary"
    ADD CONSTRAINT "user_progress_summary_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_status"
    ADD CONSTRAINT "user_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_status"
    ADD CONSTRAINT "user_status_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."discussion_likes"
    ADD CONSTRAINT "user_unique_like" UNIQUE ("user_id", "discussion_id");



ALTER TABLE ONLY "public"."discussion_likes"
    ADD CONSTRAINT "user_unique_reply_like" UNIQUE ("user_id", "reply_id");



CREATE INDEX "idx_access_logs_action" ON "public"."access_logs" USING "btree" ("action");



CREATE INDEX "idx_access_logs_created_at" ON "public"."access_logs" USING "btree" ("created_at");



CREATE INDEX "idx_access_logs_status" ON "public"."access_logs" USING "btree" ("status");



CREATE INDEX "idx_access_logs_user_id" ON "public"."access_logs" USING "btree" ("user_id");



CREATE INDEX "idx_admin_settings_created_at" ON "public"."admin_settings" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ai_prompts_active" ON "public"."ai_prompts" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_ai_prompts_name" ON "public"."ai_prompts" USING "btree" ("name");



CREATE INDEX "idx_ai_prompts_role" ON "public"."ai_prompts" USING "btree" ("role");



CREATE INDEX "idx_ai_report_interactions_created_at" ON "public"."ai_report_interactions" USING "btree" ("created_at");



CREATE INDEX "idx_ai_report_interactions_success" ON "public"."ai_report_interactions" USING "btree" ("success");



CREATE INDEX "idx_ai_report_interactions_user_id" ON "public"."ai_report_interactions" USING "btree" ("user_id");



CREATE INDEX "idx_ai_safety_ethics_settings_updated_at" ON "public"."ai_safety_ethics_settings" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_ai_tutor_settings_user_id" ON "public"."ai_tutor_settings" USING "btree" ("user_id");



CREATE INDEX "idx_apex_contact_active" ON "public"."apex_contact_info" USING "btree" ("is_active");



CREATE INDEX "idx_apex_contact_department" ON "public"."apex_contact_info" USING "btree" ("department");



CREATE INDEX "idx_apex_contact_priority" ON "public"."apex_contact_info" USING "btree" ("priority");



CREATE INDEX "idx_apex_faqs_active" ON "public"."apex_faqs" USING "btree" ("is_active");



CREATE INDEX "idx_apex_faqs_category" ON "public"."apex_faqs" USING "btree" ("category");



CREATE INDEX "idx_apex_faqs_created_at" ON "public"."apex_faqs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_apex_faqs_priority" ON "public"."apex_faqs" USING "btree" ("priority");



CREATE INDEX "idx_apex_faqs_tags" ON "public"."apex_faqs" USING "gin" ("tags");



CREATE INDEX "idx_apex_knowledge_active" ON "public"."apex_knowledge_base" USING "btree" ("is_active");



CREATE INDEX "idx_apex_knowledge_category" ON "public"."apex_knowledge_base" USING "btree" ("category");



CREATE INDEX "idx_apex_knowledge_created_at" ON "public"."apex_knowledge_base" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_apex_knowledge_tags" ON "public"."apex_knowledge_base" USING "gin" ("tags");



CREATE INDEX "idx_blocked_users_active" ON "public"."blocked_users" USING "btree" ("is_active");



CREATE INDEX "idx_blocked_users_email" ON "public"."blocked_users" USING "btree" ("email");



CREATE INDEX "idx_blocked_users_ip" ON "public"."blocked_users" USING "btree" ("ip_address");



CREATE INDEX "idx_blocked_users_until" ON "public"."blocked_users" USING "btree" ("blocked_until");



CREATE INDEX "idx_boards_board_type" ON "public"."boards" USING "btree" ("board_type");



CREATE INDEX "idx_boards_city_id" ON "public"."boards" USING "btree" ("city_id");



CREATE INDEX "idx_boards_code" ON "public"."boards" USING "btree" ("code");



CREATE INDEX "idx_boards_country_id" ON "public"."boards" USING "btree" ("country_id");



CREATE INDEX "idx_boards_created_at" ON "public"."boards" USING "btree" ("created_at");



CREATE INDEX "idx_boards_name" ON "public"."boards" USING "btree" ("name");



CREATE INDEX "idx_boards_project_id" ON "public"."boards" USING "btree" ("project_id");



CREATE INDEX "idx_boards_region_id" ON "public"."boards" USING "btree" ("region_id");



CREATE INDEX "idx_boards_status" ON "public"."boards" USING "btree" ("status");



CREATE INDEX "idx_cities_code" ON "public"."cities" USING "btree" ("code");



CREATE INDEX "idx_cities_country_id" ON "public"."cities" USING "btree" ("country_id");



CREATE INDEX "idx_cities_created_at" ON "public"."cities" USING "btree" ("created_at");



CREATE INDEX "idx_cities_name" ON "public"."cities" USING "btree" ("name");



CREATE INDEX "idx_cities_region_id" ON "public"."cities" USING "btree" ("region_id");



CREATE INDEX "idx_class_students_class_id" ON "public"."class_students" USING "btree" ("class_id");



CREATE INDEX "idx_class_students_enrollment_date" ON "public"."class_students" USING "btree" ("enrollment_date");



CREATE INDEX "idx_class_students_enrollment_status" ON "public"."class_students" USING "btree" ("enrollment_status");



CREATE INDEX "idx_class_students_seat_number" ON "public"."class_students" USING "btree" ("seat_number");



CREATE INDEX "idx_class_students_student_id" ON "public"."class_students" USING "btree" ("student_id");



CREATE INDEX "idx_class_students_student_number" ON "public"."class_students" USING "btree" ("student_number");



CREATE INDEX "idx_class_teachers_assigned_at" ON "public"."class_teachers" USING "btree" ("assigned_at");



CREATE INDEX "idx_class_teachers_class_id" ON "public"."class_teachers" USING "btree" ("class_id");



CREATE INDEX "idx_class_teachers_is_primary" ON "public"."class_teachers" USING "btree" ("is_primary");



CREATE INDEX "idx_class_teachers_role" ON "public"."class_teachers" USING "btree" ("role");



CREATE INDEX "idx_class_teachers_teacher_id" ON "public"."class_teachers" USING "btree" ("teacher_id");



CREATE INDEX "idx_classes_board_id" ON "public"."classes" USING "btree" ("board_id");



CREATE INDEX "idx_classes_code" ON "public"."classes" USING "btree" ("code");



CREATE INDEX "idx_classes_created_at" ON "public"."classes" USING "btree" ("created_at");



CREATE INDEX "idx_classes_created_by" ON "public"."classes" USING "btree" ("created_by");



CREATE INDEX "idx_classes_grade" ON "public"."classes" USING "btree" ("grade");



CREATE INDEX "idx_classes_name" ON "public"."classes" USING "btree" ("name");



CREATE INDEX "idx_classes_school_id" ON "public"."classes" USING "btree" ("school_id");



CREATE INDEX "idx_classes_status" ON "public"."classes" USING "btree" ("status");



CREATE INDEX "idx_content_hierarchy_category" ON "public"."ai_tutor_content_hierarchy" USING "btree" ("category");



CREATE INDEX "idx_content_hierarchy_difficulty" ON "public"."ai_tutor_content_hierarchy" USING "btree" ("difficulty");



CREATE INDEX "idx_content_hierarchy_difficulty_level" ON "public"."ai_tutor_content_hierarchy" USING "btree" ("difficulty_level") WHERE ("level" = 'stage'::"text");



CREATE INDEX "idx_content_hierarchy_exercise_number" ON "public"."ai_tutor_content_hierarchy" USING "btree" ("exercise_number") WHERE ("level" = 'exercise'::"text");



CREATE INDEX "idx_content_hierarchy_exercise_type" ON "public"."ai_tutor_content_hierarchy" USING "btree" ("exercise_type") WHERE ("level" = 'exercise'::"text");



CREATE INDEX "idx_content_hierarchy_level" ON "public"."ai_tutor_content_hierarchy" USING "btree" ("level");



CREATE INDEX "idx_content_hierarchy_parent" ON "public"."ai_tutor_content_hierarchy" USING "btree" ("parent_id");



CREATE INDEX "idx_content_hierarchy_path" ON "public"."ai_tutor_content_hierarchy" USING "btree" ("hierarchy_path");



CREATE INDEX "idx_content_hierarchy_stage_number" ON "public"."ai_tutor_content_hierarchy" USING "btree" ("stage_number") WHERE ("level" = 'stage'::"text");



CREATE INDEX "idx_content_hierarchy_topic_data_gin" ON "public"."ai_tutor_content_hierarchy" USING "gin" ("topic_data");



CREATE INDEX "idx_content_hierarchy_topic_number" ON "public"."ai_tutor_content_hierarchy" USING "btree" ("topic_number") WHERE ("level" = 'topic'::"text");



CREATE INDEX "idx_conversation_participants_active" ON "public"."conversation_participants" USING "btree" ("conversation_id", "user_id") WHERE ("left_at" IS NULL);



CREATE INDEX "idx_conversation_participants_conversation_id" ON "public"."conversation_participants" USING "btree" ("conversation_id");



CREATE INDEX "idx_conversation_participants_user_id" ON "public"."conversation_participants" USING "btree" ("user_id");



CREATE INDEX "idx_conversations_created_by" ON "public"."conversations" USING "btree" ("created_by");



CREATE INDEX "idx_conversations_last_message_at" ON "public"."conversations" USING "btree" ("last_message_at");



CREATE INDEX "idx_conversations_type" ON "public"."conversations" USING "btree" ("type");



CREATE INDEX "idx_conversations_updated_at" ON "public"."conversations" USING "btree" ("updated_at");



CREATE INDEX "idx_countries_code" ON "public"."countries" USING "btree" ("code");



CREATE INDEX "idx_countries_created_at" ON "public"."countries" USING "btree" ("created_at");



CREATE INDEX "idx_countries_name" ON "public"."countries" USING "btree" ("name");



CREATE INDEX "idx_course_lesson_content_due_date" ON "public"."course_lesson_content" USING "btree" ("due_date");



CREATE INDEX "idx_course_thumbnails_course_id" ON "public"."course_thumbnails" USING "btree" ("course_id");



CREATE INDEX "idx_course_thumbnails_generated_at" ON "public"."course_thumbnails" USING "btree" ("generated_at" DESC);



CREATE INDEX "idx_courses_board_ids" ON "public"."courses" USING "gin" ("board_ids");



CREATE INDEX "idx_courses_city_ids" ON "public"."courses" USING "gin" ("city_ids");



CREATE INDEX "idx_courses_class_ids" ON "public"."courses" USING "gin" ("class_ids");



CREATE INDEX "idx_courses_country_ids" ON "public"."courses" USING "gin" ("country_ids");



CREATE INDEX "idx_courses_project_ids" ON "public"."courses" USING "gin" ("project_ids");



CREATE INDEX "idx_courses_region_ids" ON "public"."courses" USING "gin" ("region_ids");



CREATE INDEX "idx_courses_school_ids" ON "public"."courses" USING "gin" ("school_ids");



CREATE INDEX "idx_courses_updated_at" ON "public"."courses" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_daily_analytics_date" ON "public"."ai_tutor_daily_learning_analytics" USING "btree" ("analytics_date");



CREATE INDEX "idx_daily_analytics_user_date" ON "public"."ai_tutor_daily_learning_analytics" USING "btree" ("user_id", "analytics_date");



CREATE INDEX "idx_daily_analytics_user_id" ON "public"."ai_tutor_daily_learning_analytics" USING "btree" ("user_id");



CREATE INDEX "idx_exercise_progress_stage_exercise" ON "public"."ai_tutor_user_exercise_progress" USING "btree" ("stage_id", "exercise_id");



CREATE INDEX "idx_exercise_progress_user_id" ON "public"."ai_tutor_user_exercise_progress" USING "btree" ("user_id");



CREATE INDEX "idx_exercise_progress_user_stage_exercise" ON "public"."ai_tutor_user_exercise_progress" USING "btree" ("user_id", "stage_id", "exercise_id");



CREATE INDEX "idx_fcm_tokens_created_at" ON "public"."fcm_tokens" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_fcm_tokens_user_id" ON "public"."fcm_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_learning_milestones_earned" ON "public"."ai_tutor_learning_milestones" USING "btree" ("earned_at");



CREATE INDEX "idx_learning_milestones_user_type" ON "public"."ai_tutor_learning_milestones" USING "btree" ("user_id", "milestone_type");



CREATE INDEX "idx_learning_unlocks_stage_exercise" ON "public"."ai_tutor_learning_unlocks" USING "btree" ("stage_id", "exercise_id");



CREATE INDEX "idx_learning_unlocks_status" ON "public"."ai_tutor_learning_unlocks" USING "btree" ("is_unlocked");



CREATE INDEX "idx_learning_unlocks_user_id" ON "public"."ai_tutor_learning_unlocks" USING "btree" ("user_id");



CREATE INDEX "idx_learning_unlocks_user_stage" ON "public"."ai_tutor_learning_unlocks" USING "btree" ("user_id", "stage_id");



CREATE INDEX "idx_learning_unlocks_user_stage_exercise" ON "public"."ai_tutor_learning_unlocks" USING "btree" ("user_id", "stage_id", "exercise_id");



CREATE INDEX "idx_login_attempts_email" ON "public"."login_attempts" USING "btree" ("email");



CREATE INDEX "idx_login_attempts_ip" ON "public"."login_attempts" USING "btree" ("ip_address");



CREATE INDEX "idx_login_attempts_success" ON "public"."login_attempts" USING "btree" ("success");



CREATE INDEX "idx_login_attempts_time" ON "public"."login_attempts" USING "btree" ("attempt_time");



CREATE INDEX "idx_message_status_message_id" ON "public"."message_status" USING "btree" ("message_id");



CREATE INDEX "idx_message_status_status" ON "public"."message_status" USING "btree" ("status");



CREATE INDEX "idx_message_status_user_id" ON "public"."message_status" USING "btree" ("user_id");



CREATE INDEX "idx_messages_conversation_id" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "idx_messages_not_deleted" ON "public"."messages" USING "btree" ("conversation_id", "created_at") WHERE ("is_deleted" = false);



CREATE INDEX "idx_messages_reply_to_id" ON "public"."messages" USING "btree" ("reply_to_id");



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_milestones_type" ON "public"."ai_tutor_learning_milestones" USING "btree" ("milestone_type");



CREATE INDEX "idx_milestones_user_id" ON "public"."ai_tutor_learning_milestones" USING "btree" ("user_id");



CREATE INDEX "idx_milestones_user_type" ON "public"."ai_tutor_learning_milestones" USING "btree" ("user_id", "milestone_type");



CREATE INDEX "idx_notifications_action_data" ON "public"."notifications" USING "gin" ("action_data");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_read" ON "public"."notifications" USING "btree" ("user_id", "read");



CREATE INDEX "idx_observation_reports_created_at" ON "public"."observation_reports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_observation_reports_observation_date" ON "public"."observation_reports" USING "btree" ("observation_date" DESC);



CREATE INDEX "idx_observation_reports_observer_role" ON "public"."observation_reports" USING "btree" ("observer_role");



CREATE INDEX "idx_observation_reports_school_name" ON "public"."observation_reports" USING "btree" ("school_name");



CREATE INDEX "idx_observation_reports_status" ON "public"."observation_reports" USING "btree" ("status");



CREATE INDEX "idx_observation_reports_submitted_by" ON "public"."observation_reports" USING "btree" ("submitted_by");



CREATE INDEX "idx_profiles_backup_codes" ON "public"."profiles" USING "gin" ("two_factor_backup_codes");



CREATE INDEX "idx_profiles_metadata_mfa" ON "public"."profiles" USING "btree" ((("metadata" ->> 'mfa_enabled'::"text")));



CREATE INDEX "idx_profiles_phone_number" ON "public"."profiles" USING "btree" ("phone_number");



CREATE INDEX "idx_progress_summary_current_stage" ON "public"."ai_tutor_user_progress_summary" USING "btree" ("current_stage");



CREATE INDEX "idx_progress_summary_user_id" ON "public"."ai_tutor_user_progress_summary" USING "btree" ("user_id");



CREATE INDEX "idx_projects_city_id" ON "public"."projects" USING "btree" ("city_id");



CREATE INDEX "idx_projects_code" ON "public"."projects" USING "btree" ("code");



CREATE INDEX "idx_projects_country_id" ON "public"."projects" USING "btree" ("country_id");



CREATE INDEX "idx_projects_created_at" ON "public"."projects" USING "btree" ("created_at");



CREATE INDEX "idx_projects_name" ON "public"."projects" USING "btree" ("name");



CREATE INDEX "idx_projects_region_id" ON "public"."projects" USING "btree" ("region_id");



CREATE INDEX "idx_projects_status" ON "public"."projects" USING "btree" ("status");



CREATE INDEX "idx_quiz_attempts_attempt_number" ON "public"."quiz_attempts" USING "btree" ("lesson_content_id", "user_id", "attempt_number");



CREATE INDEX "idx_quiz_attempts_submitted_at" ON "public"."quiz_attempts" USING "btree" ("submitted_at");



CREATE INDEX "idx_quiz_attempts_teacher_approval" ON "public"."quiz_attempts" USING "btree" ("teacher_approval_required", "teacher_approved");



CREATE INDEX "idx_quiz_attempts_user_content" ON "public"."quiz_attempts" USING "btree" ("user_id", "lesson_content_id");



CREATE INDEX "idx_quiz_course_links_course_id" ON "public"."quiz_course_links" USING "btree" ("course_id");



CREATE INDEX "idx_quiz_course_links_lesson_content_id" ON "public"."quiz_course_links" USING "btree" ("lesson_content_id");



CREATE INDEX "idx_quiz_course_links_quiz_id" ON "public"."quiz_course_links" USING "btree" ("quiz_id");



CREATE INDEX "idx_quiz_math_answers_question" ON "public"."quiz_math_answers" USING "btree" ("question_id");



CREATE INDEX "idx_quiz_math_answers_submission" ON "public"."quiz_math_answers" USING "btree" ("quiz_submission_id");



CREATE INDEX "idx_quiz_math_answers_user" ON "public"."quiz_math_answers" USING "btree" ("user_id");



CREATE INDEX "idx_quiz_members_quiz_id" ON "public"."quiz_members" USING "btree" ("quiz_id");



CREATE INDEX "idx_quiz_members_role" ON "public"."quiz_members" USING "btree" ("role");



CREATE INDEX "idx_quiz_members_user_id" ON "public"."quiz_members" USING "btree" ("user_id");



CREATE INDEX "idx_quiz_questions_question_type" ON "public"."quiz_questions" USING "btree" ("question_type");



CREATE INDEX "idx_quiz_retry_requests_content" ON "public"."quiz_retry_requests" USING "btree" ("lesson_content_id");



CREATE INDEX "idx_quiz_retry_requests_expires" ON "public"."quiz_retry_requests" USING "btree" ("expires_at");



CREATE INDEX "idx_quiz_retry_requests_status" ON "public"."quiz_retry_requests" USING "btree" ("status");



CREATE INDEX "idx_quiz_retry_requests_user" ON "public"."quiz_retry_requests" USING "btree" ("user_id");



CREATE INDEX "idx_quiz_submissions_attempts" ON "public"."quiz_submissions" USING "btree" ("user_id", "lesson_content_id", "attempt_number");



CREATE INDEX "idx_quiz_submissions_drawing_data" ON "public"."quiz_submissions" USING "gin" ("drawing_data");



CREATE INDEX "idx_quiz_submissions_latest" ON "public"."quiz_submissions" USING "btree" ("lesson_content_id", "is_latest_attempt") WHERE ("is_latest_attempt" = true);



CREATE UNIQUE INDEX "idx_quiz_submissions_latest_attempt" ON "public"."quiz_submissions" USING "btree" ("user_id", "lesson_content_id") WHERE ("is_latest_attempt" = true);



CREATE INDEX "idx_quiz_submissions_manual_grading" ON "public"."quiz_submissions" USING "btree" ("manual_grading_required", "manual_grading_completed") WHERE ("manual_grading_required" = true);



CREATE INDEX "idx_regions_code" ON "public"."regions" USING "btree" ("code");



CREATE INDEX "idx_regions_country_id" ON "public"."regions" USING "btree" ("country_id");



CREATE INDEX "idx_regions_created_at" ON "public"."regions" USING "btree" ("created_at");



CREATE INDEX "idx_regions_name" ON "public"."regions" USING "btree" ("name");



CREATE INDEX "idx_schools_accreditation_status" ON "public"."schools" USING "btree" ("accreditation_status");



CREATE INDEX "idx_schools_board_id" ON "public"."schools" USING "btree" ("board_id");



CREATE INDEX "idx_schools_city_id" ON "public"."schools" USING "btree" ("city_id");



CREATE INDEX "idx_schools_code" ON "public"."schools" USING "btree" ("code");



CREATE INDEX "idx_schools_country_id" ON "public"."schools" USING "btree" ("country_id");



CREATE INDEX "idx_schools_created_at" ON "public"."schools" USING "btree" ("created_at");



CREATE INDEX "idx_schools_name" ON "public"."schools" USING "btree" ("name");



CREATE INDEX "idx_schools_project_id" ON "public"."schools" USING "btree" ("project_id");



CREATE INDEX "idx_schools_region_id" ON "public"."schools" USING "btree" ("region_id");



CREATE INDEX "idx_schools_school_type" ON "public"."schools" USING "btree" ("school_type");



CREATE INDEX "idx_schools_status" ON "public"."schools" USING "btree" ("status");



CREATE INDEX "idx_secure_links_active_expiry" ON "public"."secure_links" USING "btree" ("expiry") WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_secure_links_created_at" ON "public"."secure_links" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_secure_links_created_by" ON "public"."secure_links" USING "btree" ("created_by");



CREATE INDEX "idx_secure_links_expiry" ON "public"."secure_links" USING "btree" ("expiry");



CREATE INDEX "idx_secure_links_observer_role" ON "public"."secure_links" USING "btree" ("observer_role");



CREATE INDEX "idx_secure_links_status" ON "public"."secure_links" USING "btree" ("status");



CREATE INDEX "idx_secure_links_token" ON "public"."secure_links" USING "btree" ("token");



CREATE INDEX "idx_security_alerts_resolved" ON "public"."security_alerts" USING "btree" ("is_resolved");



CREATE INDEX "idx_security_alerts_severity" ON "public"."security_alerts" USING "btree" ("severity");



CREATE INDEX "idx_security_alerts_type" ON "public"."security_alerts" USING "btree" ("alert_type");



CREATE INDEX "idx_stage_progress_stage_id" ON "public"."ai_tutor_user_stage_progress" USING "btree" ("stage_id");



CREATE INDEX "idx_stage_progress_user_id" ON "public"."ai_tutor_user_stage_progress" USING "btree" ("user_id");



CREATE INDEX "idx_stage_progress_user_stage" ON "public"."ai_tutor_user_stage_progress" USING "btree" ("user_id", "stage_id");



CREATE INDEX "idx_standalone_question_options_position" ON "public"."standalone_question_options" USING "btree" ("question_id", "position");



CREATE INDEX "idx_standalone_question_options_question_id" ON "public"."standalone_question_options" USING "btree" ("question_id");



CREATE INDEX "idx_standalone_quiz_attempts_attempt_number" ON "public"."standalone_quiz_attempts" USING "btree" ("quiz_id", "user_id", "attempt_number");



CREATE INDEX "idx_standalone_quiz_attempts_manual_grading" ON "public"."standalone_quiz_attempts" USING "btree" ("manual_grading_required", "manual_grading_completed") WHERE ("manual_grading_required" = true);



CREATE INDEX "idx_standalone_quiz_attempts_quiz_user" ON "public"."standalone_quiz_attempts" USING "btree" ("quiz_id", "user_id");



CREATE INDEX "idx_standalone_quiz_attempts_submitted_at" ON "public"."standalone_quiz_attempts" USING "btree" ("submitted_at");



CREATE INDEX "idx_standalone_quiz_attempts_teacher_approval" ON "public"."standalone_quiz_attempts" USING "btree" ("teacher_approval_required", "teacher_approved");



CREATE INDEX "idx_standalone_quiz_math_answers_question_id" ON "public"."standalone_quiz_math_answers" USING "btree" ("question_id");



CREATE INDEX "idx_standalone_quiz_math_answers_user_id" ON "public"."standalone_quiz_math_answers" USING "btree" ("user_id");



CREATE INDEX "idx_standalone_quiz_questions_position" ON "public"."standalone_quiz_questions" USING "btree" ("quiz_id", "position");



CREATE INDEX "idx_standalone_quiz_questions_quiz_id" ON "public"."standalone_quiz_questions" USING "btree" ("quiz_id");



CREATE INDEX "idx_standalone_quiz_retry_requests_quiz_user" ON "public"."standalone_quiz_retry_requests" USING "btree" ("quiz_id", "user_id");



CREATE INDEX "idx_standalone_quiz_retry_requests_status" ON "public"."standalone_quiz_retry_requests" USING "btree" ("status");



CREATE INDEX "idx_standalone_quiz_text_answer_grades_attempt" ON "public"."standalone_quiz_text_answer_grades" USING "btree" ("attempt_id");



CREATE INDEX "idx_standalone_quiz_text_answer_grades_question" ON "public"."standalone_quiz_text_answer_grades" USING "btree" ("question_id");



CREATE INDEX "idx_standalone_quizzes_author_id" ON "public"."standalone_quizzes" USING "btree" ("author_id");



CREATE INDEX "idx_standalone_quizzes_created_at" ON "public"."standalone_quizzes" USING "btree" ("created_at");



CREATE INDEX "idx_standalone_quizzes_status" ON "public"."standalone_quizzes" USING "btree" ("status");



CREATE INDEX "idx_standalone_quizzes_visibility" ON "public"."standalone_quizzes" USING "btree" ("visibility");



CREATE INDEX "idx_text_answer_grades_question" ON "public"."text_answer_grades" USING "btree" ("question_id");



CREATE INDEX "idx_text_answer_grades_submission" ON "public"."text_answer_grades" USING "btree" ("quiz_submission_id");



CREATE INDEX "idx_text_answer_grades_teacher" ON "public"."text_answer_grades" USING "btree" ("graded_by");



CREATE INDEX "idx_topic_progress_created_at" ON "public"."ai_tutor_user_topic_progress" USING "btree" ("created_at");



CREATE INDEX "idx_topic_progress_stage_exercise_topic" ON "public"."ai_tutor_user_topic_progress" USING "btree" ("stage_id", "exercise_id", "topic_id");



CREATE INDEX "idx_topic_progress_user_id" ON "public"."ai_tutor_user_topic_progress" USING "btree" ("user_id");



CREATE INDEX "idx_topic_progress_user_stage_exercise_topic" ON "public"."ai_tutor_user_topic_progress" USING "btree" ("user_id", "stage_id", "exercise_id", "topic_id");



CREATE INDEX "idx_user_exercise_progress_maturity" ON "public"."ai_tutor_user_exercise_progress" USING "btree" ("mature");



CREATE INDEX "idx_user_exercise_progress_user_stage_exercise" ON "public"."ai_tutor_user_exercise_progress" USING "btree" ("user_id", "stage_id", "exercise_id");



CREATE INDEX "idx_user_progress_summary_activity" ON "public"."ai_tutor_user_progress_summary" USING "btree" ("last_activity_date");



CREATE INDEX "idx_user_progress_summary_current" ON "public"."ai_tutor_user_progress_summary" USING "btree" ("current_stage", "current_exercise");



CREATE INDEX "idx_user_sessions_active" ON "public"."user_sessions" USING "btree" ("is_active");



CREATE INDEX "idx_user_sessions_expires_at" ON "public"."user_sessions" USING "btree" ("expires_at");



CREATE INDEX "idx_user_sessions_last_activity" ON "public"."user_sessions" USING "btree" ("last_activity");



CREATE INDEX "idx_user_sessions_user_id" ON "public"."user_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_user_stage_progress_completion" ON "public"."ai_tutor_user_stage_progress" USING "btree" ("completed", "mature");



CREATE INDEX "idx_user_stage_progress_user_stage" ON "public"."ai_tutor_user_stage_progress" USING "btree" ("user_id", "stage_id");



CREATE INDEX "idx_user_status_last_seen" ON "public"."user_status" USING "btree" ("last_seen_at");



CREATE INDEX "idx_user_status_status" ON "public"."user_status" USING "btree" ("status");



CREATE INDEX "idx_user_status_user_id" ON "public"."user_status" USING "btree" ("user_id");



CREATE INDEX "idx_user_topic_progress_date" ON "public"."ai_tutor_user_topic_progress" USING "btree" ("created_at");



CREATE INDEX "idx_user_topic_progress_user_topic" ON "public"."ai_tutor_user_topic_progress" USING "btree" ("user_id", "stage_id", "exercise_id", "topic_id");



CREATE INDEX "idx_weekly_summaries_user_id" ON "public"."ai_tutor_weekly_progress_summaries" USING "btree" ("user_id");



CREATE INDEX "idx_weekly_summaries_user_week" ON "public"."ai_tutor_weekly_progress_summaries" USING "btree" ("user_id", "week_start_date");



CREATE INDEX "idx_weekly_summaries_week_start" ON "public"."ai_tutor_weekly_progress_summaries" USING "btree" ("week_start_date");



CREATE INDEX "iris_chat_logs_created_at_idx" ON "public"."iris_chat_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "iris_chat_logs_success_idx" ON "public"."iris_chat_logs" USING "btree" ("success");



CREATE INDEX "iris_chat_logs_tools_used_idx" ON "public"."iris_chat_logs" USING "gin" ("tools_used");



CREATE INDEX "iris_chat_logs_user_id_idx" ON "public"."iris_chat_logs" USING "btree" ("user_id");



CREATE INDEX "iris_chat_logs_user_role_idx" ON "public"."iris_chat_logs" USING "btree" ("user_role");



CREATE UNIQUE INDEX "unique_primary_teacher_per_class" ON "public"."class_teachers" USING "btree" ("class_id") WHERE ("is_primary" = true);



CREATE UNIQUE INDEX "unique_seat_number_per_class" ON "public"."class_students" USING "btree" ("class_id", "seat_number") WHERE ("seat_number" IS NOT NULL);



CREATE UNIQUE INDEX "unique_student_number_per_class" ON "public"."class_students" USING "btree" ("class_id", "student_number") WHERE ("student_number" IS NOT NULL);



CREATE OR REPLACE TRIGGER "apex_contact_info_updated_at" BEFORE UPDATE ON "public"."apex_contact_info" FOR EACH ROW EXECUTE FUNCTION "public"."update_apex_updated_at"();



CREATE OR REPLACE TRIGGER "apex_faqs_updated_at" BEFORE UPDATE ON "public"."apex_faqs" FOR EACH ROW EXECUTE FUNCTION "public"."update_apex_updated_at"();



CREATE OR REPLACE TRIGGER "apex_knowledge_base_updated_at" BEFORE UPDATE ON "public"."apex_knowledge_base" FOR EACH ROW EXECUTE FUNCTION "public"."update_apex_updated_at"();



CREATE OR REPLACE TRIGGER "create_message_status_records_trigger" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."create_message_status_records"();



CREATE OR REPLACE TRIGGER "create_user_status_record_trigger" AFTER INSERT ON "public"."conversation_participants" FOR EACH ROW EXECUTE FUNCTION "public"."create_user_status_record"();



CREATE OR REPLACE TRIGGER "trigger_cleanup_expired_blocks" AFTER INSERT OR UPDATE ON "public"."blocked_users" FOR EACH ROW WHEN (("new"."is_active" = true)) EXECUTE FUNCTION "public"."auto_cleanup_expired_blocks"();



CREATE OR REPLACE TRIGGER "trigger_set_admin_settings_created_by" BEFORE INSERT ON "public"."admin_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_admin_settings_created_by"();



CREATE OR REPLACE TRIGGER "trigger_set_ai_safety_ethics_settings_metadata" BEFORE INSERT OR UPDATE ON "public"."ai_safety_ethics_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_ai_safety_ethics_settings_metadata"();



CREATE OR REPLACE TRIGGER "trigger_set_ai_tutor_settings_metadata" BEFORE INSERT OR UPDATE ON "public"."ai_tutor_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_ai_tutor_settings_metadata"();



CREATE OR REPLACE TRIGGER "trigger_update_admin_settings_updated_at" BEFORE UPDATE ON "public"."admin_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_admin_settings_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_class_student_count" AFTER INSERT OR DELETE OR UPDATE ON "public"."class_students" FOR EACH ROW EXECUTE FUNCTION "public"."update_class_student_count"();



CREATE OR REPLACE TRIGGER "trigger_update_progress_summary" AFTER INSERT OR UPDATE ON "public"."ai_tutor_user_stage_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_progress_summary"();



CREATE OR REPLACE TRIGGER "trigger_update_progress_summary_exercise" AFTER INSERT OR UPDATE ON "public"."ai_tutor_user_exercise_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_progress_summary"();



CREATE OR REPLACE TRIGGER "trigger_update_session_activity" BEFORE UPDATE ON "public"."user_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_session_on_access"();



CREATE OR REPLACE TRIGGER "update_ai_report_interactions_updated_at" BEFORE UPDATE ON "public"."ai_report_interactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_boards_updated_at" BEFORE UPDATE ON "public"."boards" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_cities_updated_at" BEFORE UPDATE ON "public"."cities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_class_students_updated_at" BEFORE UPDATE ON "public"."class_students" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_classes_updated_at" BEFORE UPDATE ON "public"."classes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_conversation_last_message_trigger" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_last_message"();



CREATE OR REPLACE TRIGGER "update_conversations_updated_at" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_countries_updated_at" BEFORE UPDATE ON "public"."countries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_course_thumbnails_updated_at" BEFORE UPDATE ON "public"."course_thumbnails" FOR EACH ROW EXECUTE FUNCTION "public"."update_course_thumbnails_updated_at"();



CREATE OR REPLACE TRIGGER "update_courses_updated_at" BEFORE UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."update_courses_updated_at_column"();



COMMENT ON TRIGGER "update_courses_updated_at" ON "public"."courses" IS 'Automatically updates updated_at column on course updates only';



CREATE OR REPLACE TRIGGER "update_fcm_tokens_updated_at" BEFORE UPDATE ON "public"."fcm_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_messages_updated_at" BEFORE UPDATE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notifications_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_notifications_updated_at"();



CREATE OR REPLACE TRIGGER "update_observation_reports_updated_at" BEFORE UPDATE ON "public"."observation_reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_quiz_course_links_updated_at" BEFORE UPDATE ON "public"."quiz_course_links" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_quiz_members_updated_at" BEFORE UPDATE ON "public"."quiz_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_quiz_members_updated_at"();



CREATE OR REPLACE TRIGGER "update_regions_updated_at" BEFORE UPDATE ON "public"."regions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_schools_updated_at" BEFORE UPDATE ON "public"."schools" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_secure_links_updated_at" BEFORE UPDATE ON "public"."secure_links" FOR EACH ROW EXECUTE FUNCTION "public"."update_secure_links_updated_at"();



CREATE OR REPLACE TRIGGER "update_security_settings_updated_at" BEFORE UPDATE ON "public"."security_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_standalone_quiz_attempts_updated_at" BEFORE UPDATE ON "public"."standalone_quiz_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_standalone_quiz_questions_updated_at" BEFORE UPDATE ON "public"."standalone_quiz_questions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_standalone_quiz_retry_requests_updated_at" BEFORE UPDATE ON "public"."standalone_quiz_retry_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_standalone_quizzes_updated_at" BEFORE UPDATE ON "public"."standalone_quizzes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_status_updated_at" BEFORE UPDATE ON "public"."user_status" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."access_logs"
    ADD CONSTRAINT "access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ai_prompts"
    ADD CONSTRAINT "ai_prompts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_prompts"
    ADD CONSTRAINT "ai_prompts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_report_interactions"
    ADD CONSTRAINT "ai_report_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_safety_ethics_settings"
    ADD CONSTRAINT "ai_safety_ethics_settings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ai_safety_ethics_settings"
    ADD CONSTRAINT "ai_safety_ethics_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ai_tutor_content_hierarchy"
    ADD CONSTRAINT "ai_tutor_content_hierarchy_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."ai_tutor_content_hierarchy"("id");



ALTER TABLE ONLY "public"."ai_tutor_daily_learning_analytics"
    ADD CONSTRAINT "ai_tutor_daily_learning_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tutor_learning_milestones"
    ADD CONSTRAINT "ai_tutor_learning_milestones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tutor_learning_unlocks"
    ADD CONSTRAINT "ai_tutor_learning_unlocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tutor_settings"
    ADD CONSTRAINT "ai_tutor_settings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ai_tutor_settings"
    ADD CONSTRAINT "ai_tutor_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ai_tutor_settings"
    ADD CONSTRAINT "ai_tutor_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tutor_user_exercise_progress"
    ADD CONSTRAINT "ai_tutor_user_exercise_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tutor_user_stage_progress"
    ADD CONSTRAINT "ai_tutor_user_stage_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tutor_user_topic_progress"
    ADD CONSTRAINT "ai_tutor_user_topic_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tutor_weekly_progress_summaries"
    ADD CONSTRAINT "ai_tutor_weekly_progress_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."apex_contact_info"
    ADD CONSTRAINT "apex_contact_info_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."apex_contact_info"
    ADD CONSTRAINT "apex_contact_info_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."apex_faqs"
    ADD CONSTRAINT "apex_faqs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."apex_faqs"
    ADD CONSTRAINT "apex_faqs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."apex_knowledge_base"
    ADD CONSTRAINT "apex_knowledge_base_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."apex_knowledge_base"
    ADD CONSTRAINT "apex_knowledge_base_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assignment_submissions"
    ADD CONSTRAINT "assignment_submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."course_lesson_content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignment_submissions"
    ADD CONSTRAINT "assignment_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."boards"
    ADD CONSTRAINT "boards_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."boards"
    ADD CONSTRAINT "boards_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."boards"
    ADD CONSTRAINT "boards_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."boards"
    ADD CONSTRAINT "boards_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."boards"
    ADD CONSTRAINT "boards_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."boards"
    ADD CONSTRAINT "boards_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."class_students"
    ADD CONSTRAINT "class_students_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_students"
    ADD CONSTRAINT "class_students_enrolled_by_fkey" FOREIGN KEY ("enrolled_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."class_students"
    ADD CONSTRAINT "class_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_teachers"
    ADD CONSTRAINT "class_teachers_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."class_teachers"
    ADD CONSTRAINT "class_teachers_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_teachers"
    ADD CONSTRAINT "class_teachers_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."course_lesson_content"
    ADD CONSTRAINT "course_lesson_content_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_lessons"
    ADD CONSTRAINT "course_lessons_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."course_sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_members"
    ADD CONSTRAINT "course_members_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_members"
    ADD CONSTRAINT "course_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_sections"
    ADD CONSTRAINT "course_sections_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_thumbnails"
    ADD CONSTRAINT "course_thumbnails_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."course_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "public"."course_languages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."course_levels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_published_course_id_fkey" FOREIGN KEY ("published_course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."discussion_likes"
    ADD CONSTRAINT "discussion_likes_discussion_id_fkey" FOREIGN KEY ("discussion_id") REFERENCES "public"."discussions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_likes"
    ADD CONSTRAINT "discussion_likes_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "public"."discussion_replies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_likes"
    ADD CONSTRAINT "discussion_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_participants"
    ADD CONSTRAINT "discussion_participants_discussion_id_fkey" FOREIGN KEY ("discussion_id") REFERENCES "public"."discussions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_replies"
    ADD CONSTRAINT "discussion_replies_discussion_id_fkey" FOREIGN KEY ("discussion_id") REFERENCES "public"."discussions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_replies"
    ADD CONSTRAINT "discussion_replies_parent_reply_id_fkey" FOREIGN KEY ("parent_reply_id") REFERENCES "public"."discussion_replies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_replies"
    ADD CONSTRAINT "discussion_replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fcm_tokens"
    ADD CONSTRAINT "fcm_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_members"
    ADD CONSTRAINT "fk_course_members_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."iris_chat_logs"
    ADD CONSTRAINT "iris_chat_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_status"
    ADD CONSTRAINT "message_status_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_status"
    ADD CONSTRAINT "message_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."observation_reports"
    ADD CONSTRAINT "observation_reports_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."question_options"
    ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_lesson_content_id_fkey" FOREIGN KEY ("lesson_content_id") REFERENCES "public"."course_lesson_content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_teacher_approved_by_fkey" FOREIGN KEY ("teacher_approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_course_links"
    ADD CONSTRAINT "quiz_course_links_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_course_links"
    ADD CONSTRAINT "quiz_course_links_lesson_content_id_fkey" FOREIGN KEY ("lesson_content_id") REFERENCES "public"."course_lesson_content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_course_links"
    ADD CONSTRAINT "quiz_course_links_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."standalone_quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_math_answers"
    ADD CONSTRAINT "quiz_math_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_math_answers"
    ADD CONSTRAINT "quiz_math_answers_quiz_submission_id_fkey" FOREIGN KEY ("quiz_submission_id") REFERENCES "public"."quiz_submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_math_answers"
    ADD CONSTRAINT "quiz_math_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_members"
    ADD CONSTRAINT "quiz_members_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."standalone_quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_members"
    ADD CONSTRAINT "quiz_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_lesson_content_id_fkey" FOREIGN KEY ("lesson_content_id") REFERENCES "public"."course_lesson_content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_retry_requests"
    ADD CONSTRAINT "quiz_retry_requests_current_attempt_id_fkey" FOREIGN KEY ("current_attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_retry_requests"
    ADD CONSTRAINT "quiz_retry_requests_lesson_content_id_fkey" FOREIGN KEY ("lesson_content_id") REFERENCES "public"."course_lesson_content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_retry_requests"
    ADD CONSTRAINT "quiz_retry_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."quiz_retry_requests"
    ADD CONSTRAINT "quiz_retry_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_submissions"
    ADD CONSTRAINT "quiz_submissions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_submissions"
    ADD CONSTRAINT "quiz_submissions_lesson_content_id_fkey" FOREIGN KEY ("lesson_content_id") REFERENCES "public"."course_lesson_content"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quiz_submissions"
    ADD CONSTRAINT "quiz_submissions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_submissions"
    ADD CONSTRAINT "quiz_submissions_manual_grading_completed_by_fkey" FOREIGN KEY ("manual_grading_completed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."quiz_submissions"
    ADD CONSTRAINT "quiz_submissions_previous_attempt_fkey" FOREIGN KEY ("previous_attempt_id") REFERENCES "public"."quiz_submissions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quiz_submissions"
    ADD CONSTRAINT "quiz_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."regions"
    ADD CONSTRAINT "regions_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."regions"
    ADD CONSTRAINT "regions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."regions"
    ADD CONSTRAINT "regions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."secure_links"
    ADD CONSTRAINT "secure_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."security_alerts"
    ADD CONSTRAINT "security_alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."standalone_question_options"
    ADD CONSTRAINT "standalone_question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."standalone_quiz_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."standalone_quiz_attempts"
    ADD CONSTRAINT "standalone_quiz_attempts_manual_grading_completed_by_fkey" FOREIGN KEY ("manual_grading_completed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."standalone_quiz_attempts"
    ADD CONSTRAINT "standalone_quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."standalone_quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."standalone_quiz_attempts"
    ADD CONSTRAINT "standalone_quiz_attempts_teacher_approved_by_fkey" FOREIGN KEY ("teacher_approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."standalone_quiz_attempts"
    ADD CONSTRAINT "standalone_quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."standalone_quiz_math_answers"
    ADD CONSTRAINT "standalone_quiz_math_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."standalone_quiz_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."standalone_quiz_math_answers"
    ADD CONSTRAINT "standalone_quiz_math_answers_quiz_submission_id_fkey" FOREIGN KEY ("quiz_submission_id") REFERENCES "public"."standalone_quiz_attempts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."standalone_quiz_math_answers"
    ADD CONSTRAINT "standalone_quiz_math_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."standalone_quiz_questions"
    ADD CONSTRAINT "standalone_quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."standalone_quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."standalone_quiz_retry_requests"
    ADD CONSTRAINT "standalone_quiz_retry_requests_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."standalone_quiz_attempts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."standalone_quiz_retry_requests"
    ADD CONSTRAINT "standalone_quiz_retry_requests_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."standalone_quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."standalone_quiz_retry_requests"
    ADD CONSTRAINT "standalone_quiz_retry_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."standalone_quiz_retry_requests"
    ADD CONSTRAINT "standalone_quiz_retry_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."standalone_quiz_text_answer_grades"
    ADD CONSTRAINT "standalone_quiz_text_answer_grades_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."standalone_quiz_attempts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."standalone_quiz_text_answer_grades"
    ADD CONSTRAINT "standalone_quiz_text_answer_grades_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."standalone_quiz_text_answer_grades"
    ADD CONSTRAINT "standalone_quiz_text_answer_grades_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."standalone_quiz_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."standalone_quizzes"
    ADD CONSTRAINT "standalone_quizzes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."text_answer_grades"
    ADD CONSTRAINT "text_answer_grades_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."text_answer_grades"
    ADD CONSTRAINT "text_answer_grades_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."text_answer_grades"
    ADD CONSTRAINT "text_answer_grades_quiz_submission_id_fkey" FOREIGN KEY ("quiz_submission_id") REFERENCES "public"."quiz_submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_content_item_progress"
    ADD CONSTRAINT "user_content_item_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_content_item_progress"
    ADD CONSTRAINT "user_content_item_progress_lesson_content_id_fkey" FOREIGN KEY ("lesson_content_id") REFERENCES "public"."course_lesson_content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_content_item_progress"
    ADD CONSTRAINT "user_content_item_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_content_item_progress"
    ADD CONSTRAINT "user_content_item_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_tutor_user_progress_summary"
    ADD CONSTRAINT "user_progress_summary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_status"
    ADD CONSTRAINT "user_status_typing_in_conversation_fkey" FOREIGN KEY ("typing_in_conversation") REFERENCES "public"."conversations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_status"
    ADD CONSTRAINT "user_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete AI safety ethics settings" ON "public"."ai_safety_ethics_settings" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can delete FAQs" ON "public"."apex_faqs" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can delete access logs" ON "public"."access_logs" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



COMMENT ON POLICY "Admins can delete access logs" ON "public"."access_logs" IS 'Allows administrators to delete access logs for data cleanup';



CREATE POLICY "Admins can delete admin settings" ON "public"."admin_settings" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can delete contact info" ON "public"."apex_contact_info" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can delete knowledge base articles" ON "public"."apex_knowledge_base" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can insert AI safety ethics settings" ON "public"."ai_safety_ethics_settings" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can insert FAQs" ON "public"."apex_faqs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can insert admin settings" ON "public"."admin_settings" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can insert contact info" ON "public"."apex_contact_info" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can insert knowledge base articles" ON "public"."apex_knowledge_base" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can insert text answer grades" ON "public"."text_answer_grades" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"public"."app_role")))) AND ("graded_by" = "auth"."uid"())));



CREATE POLICY "Admins can manage AI tutor settings" ON "public"."ai_tutor_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage all classes" ON "public"."classes" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage all quizzes" ON "public"."standalone_quizzes" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage class students" ON "public"."class_students" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage class teachers" ON "public"."class_teachers" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage course categories" ON "public"."course_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (TRIM(BOTH FROM "lower"(("profiles"."role")::"text")) = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (TRIM(BOTH FROM "lower"(("profiles"."role")::"text")) = 'admin'::"text")))));



CREATE POLICY "Admins can manage course languages" ON "public"."course_languages" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (TRIM(BOTH FROM "lower"(("profiles"."role")::"text")) = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (TRIM(BOTH FROM "lower"(("profiles"."role")::"text")) = 'admin'::"text")))));



CREATE POLICY "Admins can manage course levels" ON "public"."course_levels" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (TRIM(BOTH FROM "lower"(("profiles"."role")::"text")) = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (TRIM(BOTH FROM "lower"(("profiles"."role")::"text")) = 'admin'::"text")))));



CREATE POLICY "Admins can manage security alerts" ON "public"."security_alerts" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage security settings" ON "public"."security_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can read all profiles" ON "public"."profiles" FOR SELECT USING ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Admins can update AI safety ethics settings" ON "public"."ai_safety_ethics_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can update FAQs" ON "public"."apex_faqs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can update access logs" ON "public"."access_logs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



COMMENT ON POLICY "Admins can update access logs" ON "public"."access_logs" IS 'Allows administrators to update access log status and metadata';



CREATE POLICY "Admins can update admin settings" ON "public"."admin_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can update all submissions" ON "public"."assignment_submissions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can update all text answer grades" ON "public"."text_answer_grades" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can update any profile" ON "public"."profiles" FOR UPDATE USING ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Admins can update contact info" ON "public"."apex_contact_info" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can update knowledge base articles" ON "public"."apex_knowledge_base" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view AI safety ethics settings" ON "public"."ai_safety_ethics_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view admin settings" ON "public"."admin_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all AI report interactions" ON "public"."ai_report_interactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all FAQs" ON "public"."apex_faqs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all access logs" ON "public"."access_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



COMMENT ON POLICY "Admins can view all access logs" ON "public"."access_logs" IS 'Allows administrators to view all access logs for security monitoring';



CREATE POLICY "Admins can view all attempts" ON "public"."quiz_attempts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all chat logs" ON "public"."iris_chat_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all contact info" ON "public"."apex_contact_info" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all knowledge base articles" ON "public"."apex_knowledge_base" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all retry requests" ON "public"."quiz_retry_requests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all sessions" ON "public"."user_sessions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all submissions" ON "public"."assignment_submissions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all text answer grades" ON "public"."text_answer_grades" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all users" ON "public"."profiles" FOR SELECT USING ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "All authenticated users can create conversations" ON "public"."conversations" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "All authenticated users can join conversations" ON "public"."conversation_participants" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "All authenticated users can send messages to conversations they" ON "public"."messages" FOR INSERT WITH CHECK ((("auth"."uid"() = "sender_id") AND (EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "messages"."conversation_id") AND ("cp"."user_id" = "auth"."uid"()) AND ("cp"."left_at" IS NULL))))));



CREATE POLICY "Allow admins and teachers to update submissions" ON "public"."quiz_submissions" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))) OR "public"."is_teacher_for_course"(( SELECT "s"."course_id"
   FROM (("public"."course_lesson_content" "lc"
     JOIN "public"."course_lessons" "l" ON (("lc"."lesson_id" = "l"."id")))
     JOIN "public"."course_sections" "s" ON (("l"."section_id" = "s"."id")))
  WHERE ("lc"."id" = "quiz_submissions"."lesson_content_id"))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))) OR "public"."is_teacher_for_course"(( SELECT "s"."course_id"
   FROM (("public"."course_lesson_content" "lc"
     JOIN "public"."course_lessons" "l" ON (("lc"."lesson_id" = "l"."id")))
     JOIN "public"."course_sections" "s" ON (("l"."section_id" = "s"."id")))
  WHERE ("lc"."id" = "quiz_submissions"."lesson_content_id")))));



CREATE POLICY "Allow admins to delete profiles" ON "public"."profiles" FOR DELETE TO "authenticated" USING (("public"."get_current_user_role"() = 'admin'::"text"));



CREATE POLICY "Allow admins to delete submissions" ON "public"."quiz_submissions" FOR DELETE USING (("public"."get_current_user_role"() = 'admin'::"text"));



CREATE POLICY "Allow authenticated users to read levels" ON "public"."course_levels" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to view likes" ON "public"."discussion_likes" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow course author to delete members" ON "public"."course_members" FOR DELETE TO "authenticated" USING (("public"."get_course_author"("course_id") = "auth"."uid"()));



CREATE POLICY "Allow course author to insert members" ON "public"."course_members" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_course_author"("course_id") = "auth"."uid"()));



CREATE POLICY "Allow course author to update members" ON "public"."course_members" FOR UPDATE TO "authenticated" USING (("public"."get_course_author"("course_id") = "auth"."uid"())) WITH CHECK (("public"."get_course_author"("course_id") = "auth"."uid"()));



CREATE POLICY "Allow delete for authors and admins" ON "public"."courses" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))) OR ("author_id" = "auth"."uid"()) OR (("status" = 'Draft'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."course_members" "cm"
  WHERE (("cm"."course_id" = "courses"."id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = 'teacher'::"public"."course_member_role")))))));



CREATE POLICY "Allow insert for admins and teachers" ON "public"."courses" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (TRIM(BOTH FROM "lower"(("profiles"."role")::"text")) = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (TRIM(BOTH FROM "lower"(("profiles"."role")::"text")) = 'teacher'::"text"))))));



CREATE POLICY "Allow management of course members" ON "public"."course_members" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))) OR ("public"."get_course_author"("course_id") = "auth"."uid"()) OR "public"."is_teacher_for_course"("course_id"))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))) OR ("public"."get_course_author"("course_id") = "auth"."uid"()) OR "public"."is_teacher_for_course"("course_id")));



CREATE POLICY "Allow members to view fellow course members" ON "public"."course_members" FOR SELECT TO "authenticated" USING (("course_id" IN ( SELECT "get_user_course_ids"."id"
   FROM "public"."get_user_course_ids"() "get_user_course_ids"("id"))));



CREATE POLICY "Allow students to insert their own submissions" ON "public"."quiz_submissions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow token validation by anyone" ON "public"."secure_links" FOR SELECT USING (true);



CREATE POLICY "Allow update based on role and status" ON "public"."courses" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))) OR (("status" = 'Draft'::"text") AND (("author_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."course_members" "cm"
  WHERE (("cm"."course_id" = "courses"."id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = 'teacher'::"public"."course_member_role"))))))));



CREATE POLICY "Allow users to delete their own likes" ON "public"."discussion_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to insert their own likes" ON "public"."discussion_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to insert their own progress" ON "public"."user_content_item_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to see submissions based on role" ON "public"."quiz_submissions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))) OR "public"."is_teacher_for_course"(( SELECT "s"."course_id"
   FROM (("public"."course_lesson_content" "lc"
     JOIN "public"."course_lessons" "l" ON (("lc"."lesson_id" = "l"."id")))
     JOIN "public"."course_sections" "s" ON (("l"."section_id" = "s"."id")))
  WHERE ("lc"."id" = "quiz_submissions"."lesson_content_id")))));



CREATE POLICY "Allow users to see their own progress" ON "public"."user_content_item_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to update profiles based on role" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (true) WITH CHECK ((("public"."get_current_user_role"() = 'admin'::"text") OR (("public"."get_current_user_role"() = 'teacher'::"text") AND ("role" = 'student'::"public"."app_role")) OR ("id" = "auth"."uid"())));



CREATE POLICY "Allow users to update their own progress" ON "public"."user_content_item_progress" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow view based on role and membership" ON "public"."courses" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))) OR ("author_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."course_members" "cm"
  WHERE (("cm"."course_id" = "courses"."id") AND ("cm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Allow viewing of course members" ON "public"."course_members" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))) OR ("course_id" IN ( SELECT "get_user_course_ids"."id"
   FROM "public"."get_user_course_ids"() "get_user_course_ids"("id")))));



CREATE POLICY "Anonymous users can insert access logs" ON "public"."access_logs" FOR INSERT WITH CHECK (true);



COMMENT ON POLICY "Anonymous users can insert access logs" ON "public"."access_logs" IS 'Allows unauthenticated users to log failed login attempts and security events';



CREATE POLICY "Anyone can view active FAQs" ON "public"."apex_faqs" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active contact info" ON "public"."apex_contact_info" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active knowledge base articles" ON "public"."apex_knowledge_base" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view content hierarchy" ON "public"."ai_tutor_content_hierarchy" FOR SELECT USING (true);



CREATE POLICY "Authenticated can view course categories" ON "public"."course_categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated can view course languages" ON "public"."course_languages" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated can view course levels" ON "public"."course_levels" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can insert access logs" ON "public"."access_logs" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND (("user_id" IS NULL) OR ("user_id" = "auth"."uid"()))));



COMMENT ON POLICY "Authenticated users can insert access logs" ON "public"."access_logs" IS 'Allows authenticated users to log their own access events';



CREATE POLICY "Authenticated users can read course categories" ON "public"."course_categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read course languages" ON "public"."course_languages" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read course levels" ON "public"."course_levels" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view content items" ON "public"."course_lesson_content" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view course lessons" ON "public"."course_lessons" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view course sections" ON "public"."course_sections" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view question options" ON "public"."question_options" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view quiz questions" ON "public"."quiz_questions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authors can manage options of their quiz questions" ON "public"."standalone_question_options" USING ((EXISTS ( SELECT 1
   FROM ("public"."standalone_quiz_questions" "sqq"
     JOIN "public"."standalone_quizzes" "sq" ON (("sq"."id" = "sqq"."quiz_id")))
  WHERE (("sqq"."id" = "standalone_question_options"."question_id") AND ("sq"."author_id" = "auth"."uid"())))));



CREATE POLICY "Authors can manage questions of their quizzes" ON "public"."standalone_quiz_questions" USING ((EXISTS ( SELECT 1
   FROM "public"."standalone_quizzes"
  WHERE (("standalone_quizzes"."id" = "standalone_quiz_questions"."quiz_id") AND ("auth"."uid"() = "standalone_quizzes"."author_id")))));



CREATE POLICY "Boards are viewable by everyone" ON "public"."boards" FOR SELECT USING (true);



CREATE POLICY "Cities are viewable by everyone" ON "public"."cities" FOR SELECT USING (true);



CREATE POLICY "Conversation creators can update their conversations" ON "public"."conversations" FOR UPDATE USING ((("auth"."uid"() = "created_by") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role"))))));



CREATE POLICY "Countries are viewable by everyone" ON "public"."countries" FOR SELECT USING (true);



CREATE POLICY "Course authors can delete thumbnails" ON "public"."course_thumbnails" FOR DELETE USING (("course_id" IN ( SELECT "courses"."id"
   FROM "public"."courses"
  WHERE ("courses"."author_id" = "auth"."uid"()))));



CREATE POLICY "Course authors can insert thumbnails" ON "public"."course_thumbnails" FOR INSERT WITH CHECK (("course_id" IN ( SELECT "courses"."id"
   FROM "public"."courses"
  WHERE ("courses"."author_id" = "auth"."uid"()))));



CREATE POLICY "Course authors can update thumbnails" ON "public"."course_thumbnails" FOR UPDATE USING (("course_id" IN ( SELECT "courses"."id"
   FROM "public"."courses"
  WHERE ("courses"."author_id" = "auth"."uid"()))));



CREATE POLICY "Discussions: Delete Access Policy" ON "public"."discussions" FOR DELETE USING (((( SELECT ("profiles"."role")::"text" AS "role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text") OR ("creator_id" = "auth"."uid"())));



CREATE POLICY "Discussions: Insert Access Policy" ON "public"."discussions" FOR INSERT WITH CHECK (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'teacher'::"text"])));



CREATE POLICY "Discussions: Update Access Policy" ON "public"."discussions" FOR UPDATE USING (((( SELECT ("profiles"."role")::"text" AS "role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text") OR ("creator_id" = "auth"."uid"()))) WITH CHECK (((( SELECT ("profiles"."role")::"text" AS "role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text") OR ("creator_id" = "auth"."uid"())));



CREATE POLICY "Discussions: View Access Policy" ON "public"."discussions" FOR SELECT USING ((("creator_id" = "auth"."uid"()) OR (( SELECT ("profiles"."role")::"text" AS "role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text") OR (("course_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."course_members" "cm"
  WHERE (("cm"."course_id" = "discussions"."course_id") AND ("cm"."user_id" = "auth"."uid"()))))) OR (("course_id" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."discussion_participants" "dp"
  WHERE (("dp"."discussion_id" = "discussions"."id") AND (("dp"."role")::"text" = ( SELECT ("p"."role")::"text" AS "role"
           FROM "public"."profiles" "p"
          WHERE ("p"."id" = "auth"."uid"())))))))));



CREATE POLICY "Enable insert access for all users" ON "public"."blocked_users" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert access for all users" ON "public"."login_attempts" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."blocked_users" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for authenticated users" ON "public"."login_attempts" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable update access for authenticated users" ON "public"."blocked_users" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Only admins can delete boards" ON "public"."boards" FOR DELETE USING ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Only admins can delete cities" ON "public"."cities" FOR DELETE USING ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Only admins can delete conversations" ON "public"."conversations" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Only admins can delete countries" ON "public"."countries" FOR DELETE USING ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Only admins can delete projects" ON "public"."projects" FOR DELETE USING ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Only admins can delete regions" ON "public"."regions" FOR DELETE USING ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Only admins can delete schools" ON "public"."schools" FOR DELETE USING ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Only admins can insert boards" ON "public"."boards" FOR INSERT WITH CHECK ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Only admins can insert cities" ON "public"."cities" FOR INSERT WITH CHECK ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Only admins can insert countries" ON "public"."countries" FOR INSERT WITH CHECK ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Only admins can insert projects" ON "public"."projects" FOR INSERT WITH CHECK ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Only admins can insert regions" ON "public"."regions" FOR INSERT WITH CHECK ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Only admins can insert schools" ON "public"."schools" FOR INSERT WITH CHECK ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Only admins can update boards" ON "public"."boards" FOR UPDATE USING ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Only admins can update cities" ON "public"."cities" FOR UPDATE USING ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Only admins can update countries" ON "public"."countries" FOR UPDATE USING ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Only admins can update projects" ON "public"."projects" FOR UPDATE USING ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Only admins can update regions" ON "public"."regions" FOR UPDATE USING ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Only admins can update schools" ON "public"."schools" FOR UPDATE USING ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "Participants: Delete Access Policy" ON "public"."discussion_participants" FOR DELETE USING (((( SELECT ("profiles"."role")::"text" AS "role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."discussions" "d"
  WHERE (("d"."id" = "discussion_participants"."discussion_id") AND ("d"."creator_id" = "auth"."uid"()))))));



CREATE POLICY "Participants: Insert Access Policy" ON "public"."discussion_participants" FOR INSERT WITH CHECK (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'teacher'::"text"])));



CREATE POLICY "Participants: Update Access Policy" ON "public"."discussion_participants" FOR UPDATE USING (((( SELECT ("profiles"."role")::"text" AS "role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."discussions" "d"
  WHERE (("d"."id" = "discussion_participants"."discussion_id") AND ("d"."creator_id" = "auth"."uid"()))))));



CREATE POLICY "Participants: View Access Policy" ON "public"."discussion_participants" FOR SELECT USING (true);



CREATE POLICY "Projects are viewable by everyone" ON "public"."projects" FOR SELECT USING (true);



CREATE POLICY "Quiz authors can manage retry requests for their quizzes" ON "public"."standalone_quiz_retry_requests" USING ((EXISTS ( SELECT 1
   FROM "public"."standalone_quizzes"
  WHERE (("standalone_quizzes"."id" = "standalone_quiz_retry_requests"."quiz_id") AND ("standalone_quizzes"."author_id" = "auth"."uid"())))));



CREATE POLICY "Quiz authors can manage their quiz course links" ON "public"."quiz_course_links" USING ((EXISTS ( SELECT 1
   FROM "public"."standalone_quizzes"
  WHERE (("standalone_quizzes"."id" = "quiz_course_links"."quiz_id") AND ("standalone_quizzes"."author_id" = "auth"."uid"())))));



CREATE POLICY "Quiz authors can update attempts on their quizzes" ON "public"."standalone_quiz_attempts" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."standalone_quizzes"
  WHERE (("standalone_quizzes"."id" = "standalone_quiz_attempts"."quiz_id") AND ("standalone_quizzes"."author_id" = "auth"."uid"())))));



COMMENT ON POLICY "Quiz authors can update attempts on their quizzes" ON "public"."standalone_quiz_attempts" IS 'Allows quiz authors to update attempts on quizzes they created';



CREATE POLICY "Quiz authors can view attempts on their quizzes" ON "public"."standalone_quiz_attempts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."standalone_quizzes"
  WHERE (("standalone_quizzes"."id" = "standalone_quiz_attempts"."quiz_id") AND ("standalone_quizzes"."author_id" = "auth"."uid"())))));



CREATE POLICY "Quiz authors can view math answers for their quizzes" ON "public"."standalone_quiz_math_answers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."standalone_quiz_questions" "sqq"
     JOIN "public"."standalone_quizzes" "sq" ON (("sq"."id" = "sqq"."quiz_id")))
  WHERE (("sqq"."id" = "standalone_quiz_math_answers"."question_id") AND ("sq"."author_id" = "auth"."uid"())))));



CREATE POLICY "Regions are viewable by everyone" ON "public"."regions" FOR SELECT USING (true);



CREATE POLICY "Replies: Admin full access" ON "public"."discussion_replies" USING (("public"."get_current_user_role"() = 'admin'::"text")) WITH CHECK (("public"."get_current_user_role"() = 'admin'::"text"));



CREATE POLICY "Replies: Creators can delete their own replies" ON "public"."discussion_replies" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Replies: Creators can update their own replies" ON "public"."discussion_replies" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Replies: Selective insert for members" ON "public"."discussion_replies" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."discussions" "d"
  WHERE ("d"."id" = "discussion_replies"."discussion_id"))));



CREATE POLICY "Replies: Selective view for members" ON "public"."discussion_replies" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."discussions" "d"
  WHERE ("d"."id" = "discussion_replies"."discussion_id"))));



CREATE POLICY "Schools are viewable by everyone" ON "public"."schools" FOR SELECT USING (true);



CREATE POLICY "Service can insert chat logs" ON "public"."iris_chat_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Students can create their own submissions" ON "public"."assignment_submissions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Students can update their own submissions" ON "public"."assignment_submissions" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND ("status" <> 'graded'::"text"))) WITH CHECK ((("auth"."uid"() = "user_id") AND ("status" <> 'graded'::"text")));



CREATE POLICY "Students can view their class enrollments" ON "public"."class_students" FOR SELECT USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can view their classes" ON "public"."classes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."class_students" "cs"
  WHERE (("cs"."class_id" = "classes"."id") AND ("cs"."student_id" = "auth"."uid"()) AND (("cs"."enrollment_status")::"text" = 'active'::"text")))));



CREATE POLICY "Students can view their own submissions" ON "public"."assignment_submissions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Students can view their own text answer grades" ON "public"."text_answer_grades" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."quiz_submissions" "qs"
  WHERE (("qs"."id" = "text_answer_grades"."quiz_submission_id") AND ("qs"."user_id" = "auth"."uid"())))));



CREATE POLICY "System can insert AI report interactions" ON "public"."ai_report_interactions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Teachers and Admins can manage all question options" ON "public"."standalone_question_options" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['teacher'::"public"."app_role", 'admin'::"public"."app_role"]))))));



CREATE POLICY "Teachers and Admins can manage all quiz course links" ON "public"."quiz_course_links" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['teacher'::"public"."app_role", 'admin'::"public"."app_role"]))))));



CREATE POLICY "Teachers and Admins can manage all quiz questions" ON "public"."standalone_quiz_questions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['teacher'::"public"."app_role", 'admin'::"public"."app_role"]))))));



CREATE POLICY "Teachers and Admins can manage all retry requests" ON "public"."standalone_quiz_retry_requests" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['teacher'::"public"."app_role", 'admin'::"public"."app_role"]))))));



CREATE POLICY "Teachers and Admins can update quiz attempts for manual grading" ON "public"."standalone_quiz_attempts" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['teacher'::"public"."app_role", 'admin'::"public"."app_role"]))))));



COMMENT ON POLICY "Teachers and Admins can update quiz attempts for manual grading" ON "public"."standalone_quiz_attempts" IS 'Allows teachers and admins to update quiz attempts when completing manual grading';



CREATE POLICY "Teachers and Admins can view all math answers" ON "public"."standalone_quiz_math_answers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['teacher'::"public"."app_role", 'admin'::"public"."app_role"]))))));



CREATE POLICY "Teachers and Admins can view all quiz attempts" ON "public"."standalone_quiz_attempts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['teacher'::"public"."app_role", 'admin'::"public"."app_role"]))))));



CREATE POLICY "Teachers can create class assignments" ON "public"."class_teachers" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'teacher'::"public"."app_role")))));



CREATE POLICY "Teachers can create classes" ON "public"."classes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'teacher'::"public"."app_role")))));



CREATE POLICY "Teachers can delete classes they created" ON "public"."classes" FOR DELETE USING ((("created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'teacher'::"public"."app_role"))))));



CREATE POLICY "Teachers can delete classes they teach" ON "public"."classes" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."class_teachers" "ct"
  WHERE (("ct"."class_id" = "classes"."id") AND ("ct"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "Teachers can delete their class assignments" ON "public"."class_teachers" FOR DELETE USING (("teacher_id" = "auth"."uid"()));



CREATE POLICY "Teachers can insert text answer grades" ON "public"."text_answer_grades" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM (((("public"."quiz_submissions" "qs"
     JOIN "public"."course_lesson_content" "clc" ON (("clc"."id" = "qs"."lesson_content_id")))
     JOIN "public"."course_lessons" "cl" ON (("cl"."id" = "clc"."lesson_id")))
     JOIN "public"."course_sections" "cs" ON (("cs"."id" = "cl"."section_id")))
     JOIN "public"."course_members" "cm" ON (("cm"."course_id" = "cs"."course_id")))
  WHERE (("qs"."id" = "text_answer_grades"."quiz_submission_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = 'teacher'::"public"."course_member_role")))) AND ("graded_by" = "auth"."uid"())));



CREATE POLICY "Teachers can manage students in any class" ON "public"."class_students" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'teacher'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'teacher'::"public"."app_role")))));



CREATE POLICY "Teachers can update classes they created" ON "public"."classes" FOR UPDATE USING ((("created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'teacher'::"public"."app_role")))))) WITH CHECK ((("created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'teacher'::"public"."app_role"))))));



CREATE POLICY "Teachers can update classes they teach" ON "public"."classes" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."class_teachers" "ct"
  WHERE (("ct"."class_id" = "classes"."id") AND ("ct"."teacher_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."class_teachers" "ct"
  WHERE (("ct"."class_id" = "classes"."id") AND ("ct"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "Teachers can update retry requests for their courses" ON "public"."quiz_retry_requests" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ((("public"."course_lesson_content" "clc"
     JOIN "public"."course_lessons" "cl" ON (("clc"."lesson_id" = "cl"."id")))
     JOIN "public"."course_sections" "cs" ON (("cl"."section_id" = "cs"."id")))
     JOIN "public"."course_members" "cm" ON (("cs"."course_id" = "cm"."course_id")))
  WHERE (("clc"."id" = "quiz_retry_requests"."lesson_content_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = 'teacher'::"public"."course_member_role")))));



CREATE POLICY "Teachers can update submissions for their courses" ON "public"."assignment_submissions" FOR UPDATE TO "authenticated" USING ("public"."is_teacher_for_course"(( SELECT "cs"."course_id"
   FROM (("public"."course_lesson_content" "clc"
     JOIN "public"."course_lessons" "cl" ON (("clc"."lesson_id" = "cl"."id")))
     JOIN "public"."course_sections" "cs" ON (("cl"."section_id" = "cs"."id")))
  WHERE ("clc"."id" = "assignment_submissions"."assignment_id"))));



CREATE POLICY "Teachers can update text answer grades" ON "public"."text_answer_grades" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (((("public"."quiz_submissions" "qs"
     JOIN "public"."course_lesson_content" "clc" ON (("clc"."id" = "qs"."lesson_content_id")))
     JOIN "public"."course_lessons" "cl" ON (("cl"."id" = "clc"."lesson_id")))
     JOIN "public"."course_sections" "cs" ON (("cs"."id" = "cl"."section_id")))
     JOIN "public"."course_members" "cm" ON (("cm"."course_id" = "cs"."course_id")))
  WHERE (("qs"."id" = "text_answer_grades"."quiz_submission_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = 'teacher'::"public"."course_member_role")))));



CREATE POLICY "Teachers can update their class assignments" ON "public"."class_teachers" FOR UPDATE USING (("teacher_id" = "auth"."uid"())) WITH CHECK (("teacher_id" = "auth"."uid"()));



CREATE POLICY "Teachers can view all classes" ON "public"."classes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'teacher'::"public"."app_role")))));



CREATE POLICY "Teachers can view attempts for their courses" ON "public"."quiz_attempts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ((("public"."course_lesson_content" "clc"
     JOIN "public"."course_lessons" "cl" ON (("clc"."lesson_id" = "cl"."id")))
     JOIN "public"."course_sections" "cs" ON (("cl"."section_id" = "cs"."id")))
     JOIN "public"."course_members" "cm" ON (("cs"."course_id" = "cm"."course_id")))
  WHERE (("clc"."id" = "quiz_attempts"."lesson_content_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = 'teacher'::"public"."course_member_role")))));



CREATE POLICY "Teachers can view math answers for their courses" ON "public"."quiz_math_answers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (((("public"."quiz_submissions" "qs"
     JOIN "public"."course_lesson_content" "clc" ON (("qs"."lesson_content_id" = "clc"."id")))
     JOIN "public"."course_lessons" "cl" ON (("clc"."lesson_id" = "cl"."id")))
     JOIN "public"."course_sections" "cs" ON (("cl"."section_id" = "cs"."id")))
     JOIN "public"."course_members" "cm" ON (("cs"."course_id" = "cm"."course_id")))
  WHERE (("qs"."id" = "quiz_math_answers"."quiz_submission_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = 'teacher'::"public"."course_member_role")))));



CREATE POLICY "Teachers can view retry requests for their courses" ON "public"."quiz_retry_requests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ((("public"."course_lesson_content" "clc"
     JOIN "public"."course_lessons" "cl" ON (("clc"."lesson_id" = "cl"."id")))
     JOIN "public"."course_sections" "cs" ON (("cl"."section_id" = "cs"."id")))
     JOIN "public"."course_members" "cm" ON (("cs"."course_id" = "cm"."course_id")))
  WHERE (("clc"."id" = "quiz_retry_requests"."lesson_content_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = 'teacher'::"public"."course_member_role")))));



CREATE POLICY "Teachers can view students in any class" ON "public"."class_students" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'teacher'::"public"."app_role")))));



CREATE POLICY "Teachers can view submissions for their courses" ON "public"."assignment_submissions" FOR SELECT TO "authenticated" USING ("public"."is_teacher_for_course"(( SELECT "cs"."course_id"
   FROM (("public"."course_lesson_content" "clc"
     JOIN "public"."course_lessons" "cl" ON (("clc"."lesson_id" = "cl"."id")))
     JOIN "public"."course_sections" "cs" ON (("cl"."section_id" = "cs"."id")))
  WHERE ("clc"."id" = "assignment_submissions"."assignment_id"))));



CREATE POLICY "Teachers can view text answer grades" ON "public"."text_answer_grades" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (((("public"."quiz_submissions" "qs"
     JOIN "public"."course_lesson_content" "clc" ON (("clc"."id" = "qs"."lesson_content_id")))
     JOIN "public"."course_lessons" "cl" ON (("cl"."id" = "clc"."lesson_id")))
     JOIN "public"."course_sections" "cs" ON (("cs"."id" = "cl"."section_id")))
     JOIN "public"."course_members" "cm" ON (("cm"."course_id" = "cs"."course_id")))
  WHERE (("qs"."id" = "text_answer_grades"."quiz_submission_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = 'teacher'::"public"."course_member_role")))));



CREATE POLICY "Teachers can view their class assignments" ON "public"."class_teachers" FOR SELECT USING (("teacher_id" = "auth"."uid"()));



CREATE POLICY "Update the user topic progress" ON "public"."ai_tutor_user_topic_progress" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can create their own math answers" ON "public"."standalone_quiz_math_answers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own quiz attempts" ON "public"."standalone_quiz_attempts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own retry requests" ON "public"."standalone_quiz_retry_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own FCM tokens" ON "public"."fcm_tokens" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own message status" ON "public"."message_status" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own messages" ON "public"."messages" FOR DELETE USING (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can delete their own notifications" ON "public"."notifications" FOR DELETE USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can delete their own observation reports" ON "public"."observation_reports" FOR DELETE USING (("auth"."uid"() = "submitted_by"));



CREATE POLICY "Users can delete their own secure links" ON "public"."secure_links" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete their own status" ON "public"."user_status" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own daily analytics" ON "public"."ai_tutor_daily_learning_analytics" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can insert own exercise progress" ON "public"."ai_tutor_user_exercise_progress" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can insert own learning milestones" ON "public"."ai_tutor_learning_milestones" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can insert own learning unlocks" ON "public"."ai_tutor_learning_unlocks" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own progress summary" ON "public"."ai_tutor_user_progress_summary" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can insert own stage progress" ON "public"."ai_tutor_user_stage_progress" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can insert own topic progress" ON "public"."ai_tutor_user_topic_progress" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can insert own weekly summaries" ON "public"."ai_tutor_weekly_progress_summaries" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can insert their own FCM tokens" ON "public"."fcm_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own attempts" ON "public"."quiz_attempts" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own math answers" ON "public"."quiz_math_answers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own message status" ON "public"."message_status" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own notifications" ON "public"."notifications" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can insert their own observation reports" ON "public"."observation_reports" FOR INSERT WITH CHECK (("auth"."uid"() = "submitted_by"));



CREATE POLICY "Users can insert their own retry requests" ON "public"."quiz_retry_requests" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own secure links" ON "public"."secure_links" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert their own status" ON "public"."user_status" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can leave conversations" ON "public"."conversation_participants" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage content items for accessible lessons" ON "public"."course_lesson_content" USING ((EXISTS ( SELECT 1
   FROM "public"."course_lessons"
  WHERE ("course_lessons"."id" = "course_lesson_content"."lesson_id"))));



CREATE POLICY "Users can manage lessons for their accessible courses" ON "public"."course_lessons" USING ((( SELECT 1
   FROM "public"."course_sections"
  WHERE ("course_sections"."id" = "course_lessons"."section_id")) IS NOT NULL));



CREATE POLICY "Users can manage options for accessible questions" ON "public"."question_options" USING ((EXISTS ( SELECT 1
   FROM "public"."quiz_questions"
  WHERE ("quiz_questions"."id" = "question_options"."question_id"))));



CREATE POLICY "Users can manage questions for accessible content items" ON "public"."quiz_questions" USING ((EXISTS ( SELECT 1
   FROM "public"."course_lesson_content"
  WHERE ("course_lesson_content"."id" = "quiz_questions"."lesson_content_id"))));



CREATE POLICY "Users can manage sections for their accessible courses" ON "public"."course_sections" USING ((( SELECT 1
   FROM "public"."courses"
  WHERE ("courses"."id" = "course_sections"."course_id")) IS NOT NULL));



CREATE POLICY "Users can manage their own sessions" ON "public"."user_sessions" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own daily analytics" ON "public"."ai_tutor_daily_learning_analytics" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can update own exercise progress" ON "public"."ai_tutor_user_exercise_progress" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can update own learning unlocks" ON "public"."ai_tutor_learning_unlocks" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own progress summary" ON "public"."ai_tutor_user_progress_summary" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can update own stage progress" ON "public"."ai_tutor_user_stage_progress" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can update own weekly summaries" ON "public"."ai_tutor_weekly_progress_summaries" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can update their own FCM tokens" ON "public"."fcm_tokens" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own message status" ON "public"."message_status" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own messages" ON "public"."messages" FOR UPDATE USING (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can update their own observation reports" ON "public"."observation_reports" FOR UPDATE USING (("auth"."uid"() = "submitted_by"));



CREATE POLICY "Users can update their own participation" ON "public"."conversation_participants" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own quiz attempts" ON "public"."standalone_quiz_attempts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own secure links" ON "public"."secure_links" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update their own status" ON "public"."user_status" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view all user status" ON "public"."user_status" FOR SELECT USING (true);



CREATE POLICY "Users can view conversations they participate in" ON "public"."conversations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "conversations"."id") AND ("cp"."user_id" = "auth"."uid"()) AND ("cp"."left_at" IS NULL)))));



CREATE POLICY "Users can view course thumbnails for accessible courses" ON "public"."course_thumbnails" FOR SELECT USING (("course_id" IN ( SELECT "c"."id"
   FROM ("public"."courses" "c"
     LEFT JOIN "public"."course_members" "cm" ON (("c"."id" = "cm"."course_id")))
  WHERE (("cm"."user_id" = "auth"."uid"()) OR ("c"."author_id" = "auth"."uid"())))));



CREATE POLICY "Users can view message status in their conversations" ON "public"."message_status" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can view messages in their conversations" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "messages"."conversation_id") AND ("cp"."user_id" = "auth"."uid"()) AND ("cp"."left_at" IS NULL)))));



CREATE POLICY "Users can view options of published quiz questions" ON "public"."standalone_question_options" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."standalone_quiz_questions" "sqq"
     JOIN "public"."standalone_quizzes" "sq" ON (("sq"."id" = "sqq"."quiz_id")))
  WHERE (("sqq"."id" = "standalone_question_options"."question_id") AND (("sq"."status" = 'published'::"text") OR ("sq"."author_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view own AI report interactions" ON "public"."ai_report_interactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own chat logs" ON "public"."iris_chat_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own daily analytics" ON "public"."ai_tutor_daily_learning_analytics" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can view own exercise progress" ON "public"."ai_tutor_user_exercise_progress" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can view own learning milestones" ON "public"."ai_tutor_learning_milestones" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can view own learning unlocks" ON "public"."ai_tutor_learning_unlocks" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can view own progress summary" ON "public"."ai_tutor_user_progress_summary" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can view own stage progress" ON "public"."ai_tutor_user_stage_progress" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can view own topic progress" ON "public"."ai_tutor_user_topic_progress" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can view own weekly summaries" ON "public"."ai_tutor_weekly_progress_summaries" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can view participants in their conversations" ON "public"."conversation_participants" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can view questions of published quizzes" ON "public"."standalone_quiz_questions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."standalone_quizzes"
  WHERE (("standalone_quizzes"."id" = "standalone_quiz_questions"."quiz_id") AND (("standalone_quizzes"."status" = 'published'::"text") OR ("auth"."uid"() = "standalone_quizzes"."author_id"))))));



CREATE POLICY "Users can view quiz course links" ON "public"."quiz_course_links" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."standalone_quizzes"
  WHERE (("standalone_quizzes"."id" = "quiz_course_links"."quiz_id") AND (("standalone_quizzes"."status" = 'published'::"text") OR ("auth"."uid"() = "standalone_quizzes"."author_id"))))));



CREATE POLICY "Users can view security alerts" ON "public"."security_alerts" FOR SELECT USING (true);



CREATE POLICY "Users can view their own AI tutor settings" ON "public"."ai_tutor_settings" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own FCM tokens" ON "public"."fcm_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own MFA status" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own access logs" ON "public"."access_logs" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND (("user_id" = "auth"."uid"()) OR ("user_email" = (( SELECT "users"."email"
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text"))));



COMMENT ON POLICY "Users can view their own access logs" ON "public"."access_logs" IS 'Allows users to view their own access logs by user_id or email';



CREATE POLICY "Users can view their own attempts" ON "public"."quiz_attempts" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own math answers" ON "public"."quiz_math_answers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own math answers" ON "public"."standalone_quiz_math_answers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



COMMENT ON POLICY "Users can view their own notifications" ON "public"."notifications" IS 'Allows users to view their own notifications OR service role to view any notifications';



CREATE POLICY "Users can view their own observation reports" ON "public"."observation_reports" FOR SELECT USING (("auth"."uid"() = "submitted_by"));



CREATE POLICY "Users can view their own quiz attempts" ON "public"."standalone_quiz_attempts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own retry requests" ON "public"."quiz_retry_requests" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own retry requests" ON "public"."standalone_quiz_retry_requests" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own secure links" ON "public"."secure_links" FOR SELECT USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can view their own sessions" ON "public"."user_sessions" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."access_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_prompts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ai_prompts_admin_delete" ON "public"."ai_prompts" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "ai_prompts_admin_insert" ON "public"."ai_prompts" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "ai_prompts_admin_select" ON "public"."ai_prompts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "ai_prompts_admin_update" ON "public"."ai_prompts" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



ALTER TABLE "public"."ai_report_interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_safety_ethics_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_tutor_content_hierarchy" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_tutor_daily_learning_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_tutor_learning_milestones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_tutor_learning_unlocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_tutor_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_tutor_user_exercise_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_tutor_user_progress_summary" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_tutor_user_stage_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_tutor_user_topic_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_tutor_weekly_progress_summaries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."apex_contact_info" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."apex_faqs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."apex_knowledge_base" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assignment_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blocked_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."boards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_students" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_teachers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."classes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."countries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_languages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_lesson_content" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_lessons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_levels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_sections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_thumbnails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discussion_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discussion_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discussion_replies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discussions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fcm_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."iris_chat_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."login_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."observation_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_course_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_math_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quiz_members_all" ON "public"."quiz_members" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "quiz_members_select" ON "public"."quiz_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['teacher'::"public"."app_role", 'admin'::"public"."app_role"])))))));



ALTER TABLE "public"."quiz_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_retry_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."regions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."secure_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."security_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."security_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."standalone_question_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."standalone_quiz_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."standalone_quiz_math_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."standalone_quiz_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."standalone_quiz_retry_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."standalone_quizzes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "standalone_quizzes_all" ON "public"."standalone_quizzes" USING ((("author_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"public"."app_role"))))));



CREATE POLICY "standalone_quizzes_select" ON "public"."standalone_quizzes" FOR SELECT USING ((("author_id" = "auth"."uid"()) OR (("status" = 'published'::"text") AND ("visibility" = 'public'::"text")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['teacher'::"public"."app_role", 'admin'::"public"."app_role"])))))));



ALTER TABLE "public"."text_answer_grades" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_content_item_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_status" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


















































































































































































































GRANT ALL ON FUNCTION "public"."add_quiz_member"("input_quiz_id" "uuid", "input_user_id" "uuid", "input_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_quiz_member"("input_quiz_id" "uuid", "input_user_id" "uuid", "input_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_quiz_member"("input_quiz_id" "uuid", "input_user_id" "uuid", "input_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_disable_mfa_for_user"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_disable_mfa_for_user"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_disable_mfa_for_user"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_enable_mfa_for_user"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_enable_mfa_for_user"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_enable_mfa_for_user"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_get_users_with_mfa_status"("search_term" "text", "page_number" integer, "page_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_get_users_with_mfa_status"("search_term" "text", "page_number" integer, "page_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_get_users_with_mfa_status"("search_term" "text", "page_number" integer, "page_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_submission"("course_id_in" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_submission"("course_id_in" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_submission"("course_id_in" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_cleanup_expired_blocks"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_cleanup_expired_blocks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_cleanup_expired_blocks"() TO "service_role";



GRANT ALL ON FUNCTION "public"."block_user"("p_email" "text", "p_ip_address" "inet", "p_block_reason" "text", "p_block_hours" integer, "p_attempts_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."block_user"("p_email" "text", "p_ip_address" "inet", "p_block_reason" "text", "p_block_hours" integer, "p_attempts_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."block_user"("p_email" "text", "p_ip_address" "inet", "p_block_reason" "text", "p_block_hours" integer, "p_attempts_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."bulk_link_quizzes_to_course"("course_id" "uuid", "quiz_ids" "uuid"[], "link_type" "text", "is_required" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_link_quizzes_to_course"("course_id" "uuid", "quiz_ids" "uuid"[], "link_type" "text", "is_required" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_link_quizzes_to_course"("course_id" "uuid", "quiz_ids" "uuid"[], "link_type" "text", "is_required" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_quiz_final_score"("submission_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_quiz_final_score"("submission_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_quiz_final_score"("submission_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_delete_course"("course_id_to_check" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_delete_course"("course_id_to_check" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_delete_course"("course_id_to_check" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_retry_quiz"("p_user_id" "uuid", "p_lesson_content_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_retry_quiz"("p_user_id" "uuid", "p_lesson_content_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_retry_quiz"("p_user_id" "uuid", "p_lesson_content_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_login_security"("p_email" "text", "p_ip_address" "inet", "p_user_agent" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_login_security"("p_email" "text", "p_ip_address" "inet", "p_user_agent" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_login_security"("p_email" "text", "p_ip_address" "inet", "p_user_agent" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_mfa_requirement"("user_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_mfa_requirement"("user_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_mfa_requirement"("user_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_standalone_quiz_manual_grading_required"("input_quiz_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_standalone_quiz_manual_grading_required"("input_quiz_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_standalone_quiz_manual_grading_required"("input_quiz_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_blocked"("p_email" "text", "p_ip_address" "inet") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_blocked"("p_email" "text", "p_ip_address" "inet") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_blocked"("p_email" "text", "p_ip_address" "inet") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_status"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_status"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_status"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_iris_chat_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_iris_chat_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_iris_chat_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_login_records"("p_days_to_keep" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_login_records"("p_days_to_keep" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_login_records"("p_days_to_keep" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_manual_grading"("submission_id" "uuid", "teacher_id" "uuid", "manual_score" numeric, "manual_feedback" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_manual_grading"("submission_id" "uuid", "teacher_id" "uuid", "manual_score" numeric, "manual_feedback" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_manual_grading"("submission_id" "uuid", "teacher_id" "uuid", "manual_score" numeric, "manual_feedback" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_manual_grading_v2"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_manual_grading_v2"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_manual_grading_v2"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_standalone_quiz_manual_grading"("input_attempt_id" "uuid", "input_teacher_id" "uuid", "grades_data" "jsonb", "overall_feedback" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_standalone_quiz_manual_grading"("input_attempt_id" "uuid", "input_teacher_id" "uuid", "grades_data" "jsonb", "overall_feedback" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_standalone_quiz_manual_grading"("input_attempt_id" "uuid", "input_teacher_id" "uuid", "grades_data" "jsonb", "overall_feedback" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_message_status_records"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_message_status_records"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_message_status_records"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_quiz_attempt"("p_user_id" "uuid", "p_lesson_content_id" "uuid", "p_answers" "jsonb", "p_results" "jsonb", "p_score" numeric, "p_retry_reason" "text", "p_ip_address" "inet", "p_user_agent" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_quiz_attempt"("p_user_id" "uuid", "p_lesson_content_id" "uuid", "p_answers" "jsonb", "p_results" "jsonb", "p_score" numeric, "p_retry_reason" "text", "p_ip_address" "inet", "p_user_agent" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_quiz_attempt"("p_user_id" "uuid", "p_lesson_content_id" "uuid", "p_answers" "jsonb", "p_results" "jsonb", "p_score" numeric, "p_retry_reason" "text", "p_ip_address" "inet", "p_user_agent" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_quiz_submission_with_attempt_tracking"("p_user_id" "uuid", "p_lesson_content_id" "uuid", "p_lesson_id" "uuid", "p_course_id" "uuid", "p_answers" "jsonb", "p_results" "jsonb", "p_score" numeric, "p_manual_grading_required" boolean, "p_manual_grading_completed" boolean, "p_retry_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_quiz_submission_with_attempt_tracking"("p_user_id" "uuid", "p_lesson_content_id" "uuid", "p_lesson_id" "uuid", "p_course_id" "uuid", "p_answers" "jsonb", "p_results" "jsonb", "p_score" numeric, "p_manual_grading_required" boolean, "p_manual_grading_completed" boolean, "p_retry_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_quiz_submission_with_attempt_tracking"("p_user_id" "uuid", "p_lesson_content_id" "uuid", "p_lesson_id" "uuid", "p_course_id" "uuid", "p_answers" "jsonb", "p_results" "jsonb", "p_score" numeric, "p_manual_grading_required" boolean, "p_manual_grading_completed" boolean, "p_retry_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_session"("p_user_id" "uuid", "p_session_token" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_location" "text", "p_session_duration_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_session"("p_user_id" "uuid", "p_session_token" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_location" "text", "p_session_duration_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_session"("p_user_id" "uuid", "p_session_token" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_location" "text", "p_session_duration_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_status_record"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_status_record"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_status_record"() TO "service_role";



GRANT ALL ON FUNCTION "public"."deactivate_session"("p_session_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."deactivate_session"("p_session_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."deactivate_session"("p_session_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_engagement_metrics"("teacher_id" "uuid", "time_range" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."debug_engagement_metrics"("teacher_id" "uuid", "time_range" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_engagement_metrics"("teacher_id" "uuid", "time_range" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_teacher_data"("teacher_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."debug_teacher_data"("teacher_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_teacher_data"("teacher_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."disable_mfa_for_user"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."disable_mfa_for_user"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."disable_mfa_for_user"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."duplicate_standalone_quiz"("original_quiz_id" "uuid", "new_title" "text", "new_author_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."duplicate_standalone_quiz"("original_quiz_id" "uuid", "new_title" "text", "new_author_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."duplicate_standalone_quiz"("original_quiz_id" "uuid", "new_title" "text", "new_author_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."evaluate_math_expression"("user_expression" "text", "correct_expression" "text", "tolerance" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."evaluate_math_expression"("user_expression" "text", "correct_expression" "text", "tolerance" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."evaluate_math_expression"("user_expression" "text", "correct_expression" "text", "tolerance" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_old_secure_links"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_old_secure_links"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_old_secure_links"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fix_all_manual_grading_flags"() TO "anon";
GRANT ALL ON FUNCTION "public"."fix_all_manual_grading_flags"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fix_all_manual_grading_flags"() TO "service_role";



GRANT ALL ON FUNCTION "public"."force_mfa_reset_for_user"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."force_mfa_reset_for_user"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."force_mfa_reset_for_user"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_2fa_statistics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_2fa_statistics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_2fa_statistics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_sessions_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_sessions_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_sessions_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_assessments_data"("search_query" "text", "course_filter_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_assessments_data"("search_query" "text", "course_filter_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_assessments_data"("search_query" "text", "course_filter_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_course_analytics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_course_analytics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_course_analytics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_course_analytics_with_filters"("filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_course_analytics_with_filters"("filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_course_analytics_with_filters"("filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"("time_range" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"("time_range" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"("time_range" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats_with_filters"("time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats_with_filters"("time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats_with_filters"("time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_engagement_trends_data"("p_time_range" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_engagement_trends_data"("p_time_range" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_engagement_trends_data"("p_time_range" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_engagement_trends_data_with_filters"("p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_engagement_trends_data_with_filters"("p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_engagement_trends_data_with_filters"("p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_platform_stats_with_filters"("filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_platform_stats_with_filters"("filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_platform_stats_with_filters"("filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_user_growth_trends_with_filters"("p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_user_growth_trends_with_filters"("p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_user_growth_trends_with_filters"("p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_class_id" "uuid", "filter_grade" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ai_prompt"("prompt_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_ai_prompt"("prompt_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ai_prompt"("prompt_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ai_safety_ethics_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_ai_safety_ethics_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ai_safety_ethics_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ai_tutor_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_ai_tutor_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ai_tutor_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_stages_with_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_stages_with_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_stages_with_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_assessment_submissions"("assessment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_assessment_submissions"("assessment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_assessment_submissions"("assessment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_quizzes_for_course"("course_id" "uuid", "author_id" "uuid", "search_term" "text", "difficulty_filter" "text", "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_quizzes_for_course"("course_id" "uuid", "author_id" "uuid", "search_term" "text", "difficulty_filter" "text", "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_quizzes_for_course"("course_id" "uuid", "author_id" "uuid", "search_term" "text", "difficulty_filter" "text", "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_class_details"("class_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_class_details"("class_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_class_details"("class_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_course_analytics_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_course_analytics_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_course_analytics_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_course_author"("p_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_course_author"("p_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_course_author"("p_course_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_course_completion_trends"("teacher_id" "uuid", "time_range" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_course_completion_trends"("teacher_id" "uuid", "time_range" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_course_completion_trends"("teacher_id" "uuid", "time_range" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_course_completion_trends_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_course_completion_trends_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_course_completion_trends_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_course_ids_by_search"("search_term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_course_ids_by_search"("search_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_course_ids_by_search"("search_term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_course_linked_quizzes"("course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_course_linked_quizzes"("course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_course_linked_quizzes"("course_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_course_performance_data"("p_teacher_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_course_performance_data"("p_teacher_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_course_performance_data"("p_teacher_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_course_performance_data_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_course_performance_data_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_course_performance_data_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_course_performance_data_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_course_performance_data_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_course_performance_data_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_course_status"("p_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_course_status"("p_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_course_status"("p_course_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_courses_for_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_courses_for_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_courses_for_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_discussion_details"("p_discussion_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_discussion_details"("p_discussion_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_discussion_details"("p_discussion_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_discussion_replies"("p_discussion_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_discussion_replies"("p_discussion_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_discussion_replies"("p_discussion_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_discussions_for_user"("p_search_term" "text", "p_course_filter" "text", "p_type_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_discussions_for_user"("p_search_term" "text", "p_course_filter" "text", "p_type_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_discussions_for_user"("p_search_term" "text", "p_course_filter" "text", "p_type_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_discussions_for_user"("p_search_term" "text", "p_course_filter" "text", "p_type_filter" "text", "p_page" integer, "p_rows_per_page" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_discussions_for_user"("p_search_term" "text", "p_course_filter" "text", "p_type_filter" "text", "p_page" integer, "p_rows_per_page" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_discussions_for_user"("p_search_term" "text", "p_course_filter" "text", "p_type_filter" "text", "p_page" integer, "p_rows_per_page" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_discussions_for_user_count"("p_search_term" "text", "p_course_filter" "text", "p_type_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_discussions_for_user_count"("p_search_term" "text", "p_course_filter" "text", "p_type_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_discussions_for_user_count"("p_search_term" "text", "p_course_filter" "text", "p_type_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_engagement_data"("time_range" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_engagement_data"("time_range" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_engagement_data"("time_range" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_engagement_metrics_data"("time_range" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_engagement_metrics_data"("time_range" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_engagement_metrics_data"("time_range" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_engagement_trends_data"("p_teacher_id" "uuid", "p_time_range" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_engagement_trends_data"("p_teacher_id" "uuid", "p_time_range" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_engagement_trends_data"("p_teacher_id" "uuid", "p_time_range" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_engagement_trends_data_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_engagement_trends_data_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_engagement_trends_data_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_exercises_for_stage_with_counts"("stage_num" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_exercises_for_stage_with_counts"("stage_num" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exercises_for_stage_with_counts"("stage_num" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_failed_login_attempts"("p_email" "text", "p_hours_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_failed_login_attempts"("p_email" "text", "p_hours_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_failed_login_attempts"("p_email" "text", "p_hours_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_fcm_tokens_for_users"("user_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_fcm_tokens_for_users"("user_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_fcm_tokens_for_users"("user_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_hierarchy_statistics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_hierarchy_statistics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_hierarchy_statistics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_latest_quiz_submissions_for_assessment"("p_lesson_content_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_latest_quiz_submissions_for_assessment"("p_lesson_content_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_quiz_submissions_for_assessment"("p_lesson_content_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_login_security_stats"("p_hours_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_login_security_stats"("p_hours_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_login_security_stats"("p_hours_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_maintenance_mode_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_maintenance_mode_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_maintenance_mode_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_math_question_details"("question_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_math_question_details"("question_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_math_question_details"("question_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_orphaned_quiz_answers"("input_quiz_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_orphaned_quiz_answers"("input_quiz_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_orphaned_quiz_answers"("input_quiz_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_platform_stats_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_platform_stats_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_platform_stats_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_question_performance_analytics"("input_quiz_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_question_performance_analytics"("input_quiz_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_question_performance_analytics"("input_quiz_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quiz_attempts"("input_quiz_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_quiz_attempts"("input_quiz_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quiz_attempts"("input_quiz_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quiz_leaderboard"("input_quiz_id" "uuid", "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_quiz_leaderboard"("input_quiz_id" "uuid", "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quiz_leaderboard"("input_quiz_id" "uuid", "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quiz_performance_analytics"("input_quiz_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_quiz_performance_analytics"("input_quiz_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quiz_performance_analytics"("input_quiz_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quiz_performance_data"("teacher_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_quiz_performance_data"("teacher_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quiz_performance_data"("teacher_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quiz_performance_data_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_quiz_performance_data_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quiz_performance_data_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quiz_statistics"("input_quiz_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_quiz_statistics"("input_quiz_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quiz_statistics"("input_quiz_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quiz_submissions_for_assessment"("p_lesson_content_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_quiz_submissions_for_assessment"("p_lesson_content_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quiz_submissions_for_assessment"("p_lesson_content_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quiz_with_members"("input_quiz_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_quiz_with_members"("input_quiz_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quiz_with_members"("input_quiz_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quizzes_by_author"("author_id" "uuid", "include_drafts" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_quizzes_by_author"("author_id" "uuid", "include_drafts" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quizzes_by_author"("author_id" "uuid", "include_drafts" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recent_access_logs"("limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recent_access_logs"("limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_access_logs"("limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recent_access_logs"("limit_count" integer, "offset_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recent_access_logs"("limit_count" integer, "offset_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_access_logs"("limit_count" integer, "offset_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_schools_by_location"("p_country_code" character varying, "p_region_code" character varying, "p_city_code" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_schools_by_location"("p_country_code" character varying, "p_region_code" character varying, "p_city_code" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_schools_by_location"("p_country_code" character varying, "p_region_code" character varying, "p_city_code" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_security_alerts"("include_resolved" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_security_alerts"("include_resolved" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_security_alerts"("include_resolved" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_security_alerts"("include_resolved" boolean, "limit_count" integer, "offset_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_security_alerts"("include_resolved" boolean, "limit_count" integer, "offset_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_security_alerts"("include_resolved" boolean, "limit_count" integer, "offset_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_security_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_security_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_security_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_standalone_quiz_attempts_requiring_grading"("input_teacher_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_standalone_quiz_attempts_requiring_grading"("input_teacher_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_standalone_quiz_attempts_requiring_grading"("input_teacher_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_standalone_quiz_text_answers_for_grading"("input_attempt_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_standalone_quiz_text_answers_for_grading"("input_attempt_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_standalone_quiz_text_answers_for_grading"("input_attempt_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_standalone_quiz_with_questions"("input_quiz_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_standalone_quiz_with_questions"("input_quiz_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_standalone_quiz_with_questions"("input_quiz_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_assignments"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_assignments"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_assignments"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_courses"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_courses"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_courses"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_courses_with_progress"("student_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_courses_with_progress"("student_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_courses_with_progress"("student_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_dashboard_stats"("student_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_dashboard_stats"("student_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_dashboard_stats"("student_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_engagement_trends"("teacher_id" "uuid", "time_range" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_engagement_trends"("teacher_id" "uuid", "time_range" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_engagement_trends"("teacher_id" "uuid", "time_range" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_engagement_trends_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_engagement_trends_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_engagement_trends_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_progress_distribution"("p_teacher_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_progress_distribution"("p_teacher_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_progress_distribution"("p_teacher_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_progress_distribution_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_progress_distribution_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_progress_distribution_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_recent_activity"("student_id" "uuid", "days_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_recent_activity"("student_id" "uuid", "days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_recent_activity"("student_id" "uuid", "days_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_stats_for_teacher"("p_teacher_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_stats_for_teacher"("p_teacher_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_stats_for_teacher"("p_teacher_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_status_counts"("p_teacher_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_status_counts"("p_teacher_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_status_counts"("p_teacher_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_status_counts_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_status_counts_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_status_counts_with_filters"("p_teacher_id" "uuid", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_status_distribution"("p_teacher_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_status_distribution"("p_teacher_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_status_distribution"("p_teacher_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_study_analytics"("student_id" "uuid", "time_range" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_study_analytics"("student_id" "uuid", "time_range" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_study_analytics"("student_id" "uuid", "time_range" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_upcoming_assignments"("student_id" "uuid", "days_ahead" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_upcoming_assignments"("student_id" "uuid", "days_ahead" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_upcoming_assignments"("student_id" "uuid", "days_ahead" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_students_data"("p_teacher_id" "uuid", "search_term" "text", "course_filter" "text", "status_filter" "text", "sort_by" "text", "sort_order" "text", "page_number" integer, "page_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_students_data"("p_teacher_id" "uuid", "search_term" "text", "course_filter" "text", "status_filter" "text", "sort_by" "text", "sort_order" "text", "page_number" integer, "page_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_students_data"("p_teacher_id" "uuid", "search_term" "text", "course_filter" "text", "status_filter" "text", "sort_by" "text", "sort_order" "text", "page_number" integer, "page_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_students_for_teacher"("p_teacher_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_students_for_teacher"("p_teacher_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_students_for_teacher"("p_teacher_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_students_for_teacher"("p_teacher_id" "uuid", "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_students_for_teacher"("p_teacher_id" "uuid", "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_students_for_teacher"("p_teacher_id" "uuid", "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_students_for_teacher"("p_teacher_id" "uuid", "p_page" integer, "p_rows_per_page" integer, "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_students_for_teacher"("p_teacher_id" "uuid", "p_page" integer, "p_rows_per_page" integer, "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_students_for_teacher"("p_teacher_id" "uuid", "p_page" integer, "p_rows_per_page" integer, "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_students_for_teacher_count"("p_teacher_id" "uuid", "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_students_for_teacher_count"("p_teacher_id" "uuid", "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_students_for_teacher_count"("p_teacher_id" "uuid", "p_search_term" "text", "p_course_filter" "text", "p_status_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teacher_assessments_data"("teacher_id" "uuid", "search_query" "text", "course_filter_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_teacher_assessments_data"("teacher_id" "uuid", "search_query" "text", "course_filter_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teacher_assessments_data"("teacher_id" "uuid", "search_query" "text", "course_filter_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teacher_engagement_metrics"("p_teacher_id" "uuid", "p_time_range" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_teacher_engagement_metrics"("p_teacher_id" "uuid", "p_time_range" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teacher_engagement_metrics"("p_teacher_id" "uuid", "p_time_range" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teacher_engagement_metrics_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_teacher_engagement_metrics_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teacher_engagement_metrics_with_filters"("p_teacher_id" "uuid", "p_time_range" "text", "filter_country_id" "uuid", "filter_region_id" "uuid", "filter_city_id" "uuid", "filter_project_id" "uuid", "filter_board_id" "uuid", "filter_school_id" "uuid", "filter_grade" "text", "filter_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teacher_overall_metrics"("p_teacher_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_teacher_overall_metrics"("p_teacher_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teacher_overall_metrics"("p_teacher_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_text_answer_grades"("submission_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_text_answer_grades"("submission_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_text_answer_grades"("submission_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_topics_for_exercise_full"("stage_num" integer, "exercise_num" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_topics_for_exercise_full"("stage_num" integer, "exercise_num" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_topics_for_exercise_full"("stage_num" integer, "exercise_num" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_accessible_quizzes"("input_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_accessible_quizzes"("input_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_accessible_quizzes"("input_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_analytics_data"("time_range" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_analytics_data"("time_range" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_analytics_data"("time_range" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_classes"("user_uuid" "uuid", "user_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_classes"("user_uuid" "uuid", "user_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_classes"("user_uuid" "uuid", "user_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_course_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_course_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_course_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_growth_data"("time_range" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_growth_data"("time_range" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_growth_data"("time_range" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_quiz_attempt_history"("p_user_id" "uuid", "p_lesson_content_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_quiz_attempt_history"("p_user_id" "uuid", "p_lesson_content_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_quiz_attempt_history"("p_user_id" "uuid", "p_lesson_content_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_quiz_attempts"("input_user_id" "uuid", "input_quiz_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_quiz_attempts"("input_user_id" "uuid", "input_quiz_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_quiz_attempts"("input_user_id" "uuid", "input_quiz_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_quiz_completion_status"("input_user_id" "uuid", "input_quiz_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_quiz_completion_status"("input_user_id" "uuid", "input_quiz_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_quiz_completion_status"("input_user_id" "uuid", "input_quiz_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_quiz_history"("input_user_id" "uuid", "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_quiz_history"("input_user_id" "uuid", "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_quiz_history"("input_user_id" "uuid", "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_users_with_mfa_status"("search_term" "text", "page_number" integer, "page_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_users_with_mfa_status"("search_term" "text", "page_number" integer, "page_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_users_with_mfa_status"("search_term" "text", "page_number" integer, "page_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_deleted_published_course"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_deleted_published_course"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_deleted_published_course"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_course_progress_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_course_progress_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_course_progress_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."initialize_user_progress"() TO "anon";
GRANT ALL ON FUNCTION "public"."initialize_user_progress"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_user_progress"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_user"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_user"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_user"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_author_of_course"("course_id_to_check" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_author_of_course"("course_id_to_check" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_author_of_course"("course_id_to_check" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_course_author"("p_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_course_author"("p_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_course_author"("p_course_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_teacher"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_teacher"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_teacher"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_teacher_for_course"("p_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_teacher_for_course"("p_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_teacher_for_course"("p_course_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_access_attempt"("p_action" character varying, "p_status" character varying, "p_user_id" "uuid", "p_user_email" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_location" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_access_attempt"("p_action" character varying, "p_status" character varying, "p_user_id" "uuid", "p_user_email" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_location" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_access_attempt"("p_action" character varying, "p_status" character varying, "p_user_id" "uuid", "p_user_email" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_location" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_debug_message"("message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_debug_message"("message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_debug_message"("message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_login_attempt"("p_email" "text", "p_success" boolean, "p_ip_address" "inet", "p_user_agent" "text", "p_failure_reason" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_login_attempt"("p_email" "text", "p_success" boolean, "p_ip_address" "inet", "p_user_agent" "text", "p_failure_reason" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_login_attempt"("p_email" "text", "p_success" boolean, "p_ip_address" "inet", "p_user_agent" "text", "p_failure_reason" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_assignment_complete"("p_student_id" "uuid", "p_course_id" "uuid", "p_lesson_id" "uuid", "p_content_item_id" "uuid", "p_teacher_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_assignment_complete"("p_student_id" "uuid", "p_course_id" "uuid", "p_lesson_id" "uuid", "p_content_item_id" "uuid", "p_teacher_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_assignment_complete"("p_student_id" "uuid", "p_course_id" "uuid", "p_lesson_id" "uuid", "p_content_item_id" "uuid", "p_teacher_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."perform_expired_blocks_cleanup"() TO "anon";
GRANT ALL ON FUNCTION "public"."perform_expired_blocks_cleanup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."perform_expired_blocks_cleanup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."populate_user_profiles"() TO "anon";
GRANT ALL ON FUNCTION "public"."populate_user_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."populate_user_profiles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."populate_user_profiles_simple"() TO "anon";
GRANT ALL ON FUNCTION "public"."populate_user_profiles_simple"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."populate_user_profiles_simple"() TO "service_role";



GRANT ALL ON FUNCTION "public"."publish_draft"("draft_id_in" "uuid", "published_id_in" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."publish_draft"("draft_id_in" "uuid", "published_id_in" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."publish_draft"("draft_id_in" "uuid", "published_id_in" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_submission"("course_id_in" "uuid", "feedback" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_submission"("course_id_in" "uuid", "feedback" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_submission"("course_id_in" "uuid", "feedback" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_quiz_member"("input_quiz_id" "uuid", "input_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_quiz_member"("input_quiz_id" "uuid", "input_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_quiz_member"("input_quiz_id" "uuid", "input_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_failed_attempts"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_failed_attempts"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_failed_attempts"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."review_retry_request"("p_request_id" "uuid", "p_teacher_id" "uuid", "p_decision" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."review_retry_request"("p_request_id" "uuid", "p_teacher_id" "uuid", "p_decision" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."review_retry_request"("p_request_id" "uuid", "p_teacher_id" "uuid", "p_decision" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_delete_course"("course_id_to_delete" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_delete_course"("course_id_to_delete" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_delete_course"("course_id_to_delete" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_fcm_token"("token_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."save_fcm_token"("token_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_fcm_token"("token_value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_math_answer"("submission_id" "uuid", "question_id" "uuid", "latex_expression" "text", "simplified_form" "text", "is_correct" boolean, "similarity_score" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."save_math_answer"("submission_id" "uuid", "question_id" "uuid", "latex_expression" "text", "simplified_form" "text", "is_correct" boolean, "similarity_score" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_math_answer"("submission_id" "uuid", "question_id" "uuid", "latex_expression" "text", "simplified_form" "text", "is_correct" boolean, "similarity_score" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."save_math_answer"("submission_id" "uuid", "question_id" "uuid", "latex_expression" "text", "simplified_form" "text", "is_correct" boolean, "similarity_score" numeric, "drawing_data" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."save_math_answer"("submission_id" "uuid", "question_id" "uuid", "latex_expression" "text", "simplified_form" "text", "is_correct" boolean, "similarity_score" numeric, "drawing_data" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_math_answer"("submission_id" "uuid", "question_id" "uuid", "latex_expression" "text", "simplified_form" "text", "is_correct" boolean, "similarity_score" numeric, "drawing_data" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_text_answer_grades"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_text_answer_grades"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_text_answer_grades"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_standalone_quizzes"("search_term" "text", "difficulty_filter" "text", "status_filter" "text", "author_filter" "uuid", "limit_count" integer, "offset_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_standalone_quizzes"("search_term" "text", "difficulty_filter" "text", "status_filter" "text", "author_filter" "uuid", "limit_count" integer, "offset_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_standalone_quizzes"("search_term" "text", "difficulty_filter" "text", "status_filter" "text", "author_filter" "uuid", "limit_count" integer, "offset_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_topics_by_content"("search_term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_topics_by_content"("search_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_topics_by_content"("search_term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_admin_settings_created_by"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_admin_settings_created_by"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_admin_settings_created_by"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_ai_safety_ethics_settings_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_ai_safety_ethics_settings_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_ai_safety_ethics_settings_metadata"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_ai_tutor_settings_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_ai_tutor_settings_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_ai_tutor_settings_metadata"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_manual_grading_flags"("attempt_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_manual_grading_flags"("attempt_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_manual_grading_flags"("attempt_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_for_review"("course_id_in" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_for_review"("course_id_in" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_for_review"("course_id_in" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_all_mfa_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_all_mfa_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_all_mfa_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_mfa_status_to_profiles"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_mfa_status_to_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_mfa_status_to_profiles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_backup_codes_save"("test_codes" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."test_backup_codes_save"("test_codes" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_backup_codes_save"("test_codes" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."test_manual_grading_detection"("test_quiz_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."test_manual_grading_detection"("test_quiz_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_manual_grading_detection"("test_quiz_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."test_real_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_real_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_real_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_teacher_policy"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."test_teacher_policy"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_teacher_policy"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_like"("p_user_id" "uuid", "p_discussion_id" "uuid", "p_reply_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_like"("p_user_id" "uuid", "p_discussion_id" "uuid", "p_reply_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_like"("p_user_id" "uuid", "p_discussion_id" "uuid", "p_reply_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."unblock_user"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unblock_user"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unblock_user"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unlink_quiz_from_course"("input_quiz_id" "uuid", "input_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."unlink_quiz_from_course"("input_quiz_id" "uuid", "input_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unlink_quiz_from_course"("input_quiz_id" "uuid", "input_course_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_admin_settings"("p_system_name" character varying, "p_maintenance_mode" boolean, "p_system_notifications" boolean, "p_email_notifications" boolean, "p_push_notifications" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_admin_settings"("p_system_name" character varying, "p_maintenance_mode" boolean, "p_system_notifications" boolean, "p_email_notifications" boolean, "p_push_notifications" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_admin_settings"("p_system_name" character varying, "p_maintenance_mode" boolean, "p_system_notifications" boolean, "p_email_notifications" boolean, "p_push_notifications" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_admin_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_admin_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_admin_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_apex_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_apex_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_apex_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_class_student_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_class_student_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_class_student_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_course_thumbnails_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_course_thumbnails_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_course_thumbnails_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_courses_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_courses_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_courses_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_quiz_members_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_quiz_members_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_quiz_members_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_quiz_submission_with_attempt_tracking"("p_submission_id" "uuid", "p_answers" "jsonb", "p_results" "jsonb", "p_score" numeric, "p_manual_grading_required" boolean, "p_manual_grading_completed" boolean, "p_retry_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_quiz_submission_with_attempt_tracking"("p_submission_id" "uuid", "p_answers" "jsonb", "p_results" "jsonb", "p_score" numeric, "p_manual_grading_required" boolean, "p_manual_grading_completed" boolean, "p_retry_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_quiz_submission_with_attempt_tracking"("p_submission_id" "uuid", "p_answers" "jsonb", "p_results" "jsonb", "p_score" numeric, "p_manual_grading_required" boolean, "p_manual_grading_completed" boolean, "p_retry_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_secure_links_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_secure_links_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_secure_links_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_security_setting"("p_setting_key" character varying, "p_setting_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_security_setting"("p_setting_key" character varying, "p_setting_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_security_setting"("p_setting_key" character varying, "p_setting_value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_session_activity"("p_session_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_session_activity"("p_session_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_session_activity"("p_session_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_session_on_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_session_on_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_session_on_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_progress_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_progress_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_progress_summary"() TO "service_role";


















GRANT ALL ON TABLE "public"."access_logs" TO "anon";
GRANT ALL ON TABLE "public"."access_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."access_logs" TO "service_role";



GRANT ALL ON TABLE "public"."admin_settings" TO "anon";
GRANT ALL ON TABLE "public"."admin_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_settings" TO "service_role";



GRANT ALL ON TABLE "public"."ai_prompts" TO "anon";
GRANT ALL ON TABLE "public"."ai_prompts" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_prompts" TO "service_role";



GRANT ALL ON TABLE "public"."ai_report_interactions" TO "anon";
GRANT ALL ON TABLE "public"."ai_report_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_report_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."ai_safety_ethics_settings" TO "anon";
GRANT ALL ON TABLE "public"."ai_safety_ethics_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_safety_ethics_settings" TO "service_role";



GRANT ALL ON TABLE "public"."ai_tutor_content_hierarchy" TO "anon";
GRANT ALL ON TABLE "public"."ai_tutor_content_hierarchy" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_tutor_content_hierarchy" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ai_tutor_content_hierarchy_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ai_tutor_content_hierarchy_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ai_tutor_content_hierarchy_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ai_tutor_daily_learning_analytics" TO "anon";
GRANT ALL ON TABLE "public"."ai_tutor_daily_learning_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_tutor_daily_learning_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."ai_tutor_learning_milestones" TO "anon";
GRANT ALL ON TABLE "public"."ai_tutor_learning_milestones" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_tutor_learning_milestones" TO "service_role";



GRANT ALL ON TABLE "public"."ai_tutor_learning_unlocks" TO "anon";
GRANT ALL ON TABLE "public"."ai_tutor_learning_unlocks" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_tutor_learning_unlocks" TO "service_role";



GRANT ALL ON TABLE "public"."ai_tutor_settings" TO "anon";
GRANT ALL ON TABLE "public"."ai_tutor_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_tutor_settings" TO "service_role";



GRANT ALL ON TABLE "public"."ai_tutor_user_exercise_progress" TO "anon";
GRANT ALL ON TABLE "public"."ai_tutor_user_exercise_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_tutor_user_exercise_progress" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ai_tutor_user_exercise_progress_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ai_tutor_user_exercise_progress_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ai_tutor_user_exercise_progress_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ai_tutor_user_progress_summary" TO "anon";
GRANT ALL ON TABLE "public"."ai_tutor_user_progress_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_tutor_user_progress_summary" TO "service_role";



GRANT ALL ON TABLE "public"."ai_tutor_user_stage_progress" TO "anon";
GRANT ALL ON TABLE "public"."ai_tutor_user_stage_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_tutor_user_stage_progress" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ai_tutor_user_stage_progress_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ai_tutor_user_stage_progress_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ai_tutor_user_stage_progress_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ai_tutor_user_topic_progress" TO "anon";
GRANT ALL ON TABLE "public"."ai_tutor_user_topic_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_tutor_user_topic_progress" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ai_tutor_user_topic_progress_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ai_tutor_user_topic_progress_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ai_tutor_user_topic_progress_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ai_tutor_weekly_progress_summaries" TO "anon";
GRANT ALL ON TABLE "public"."ai_tutor_weekly_progress_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_tutor_weekly_progress_summaries" TO "service_role";



GRANT ALL ON TABLE "public"."apex_contact_info" TO "anon";
GRANT ALL ON TABLE "public"."apex_contact_info" TO "authenticated";
GRANT ALL ON TABLE "public"."apex_contact_info" TO "service_role";



GRANT ALL ON TABLE "public"."apex_faqs" TO "anon";
GRANT ALL ON TABLE "public"."apex_faqs" TO "authenticated";
GRANT ALL ON TABLE "public"."apex_faqs" TO "service_role";



GRANT ALL ON TABLE "public"."apex_knowledge_base" TO "anon";
GRANT ALL ON TABLE "public"."apex_knowledge_base" TO "authenticated";
GRANT ALL ON TABLE "public"."apex_knowledge_base" TO "service_role";



GRANT ALL ON TABLE "public"."assignment_submissions" TO "anon";
GRANT ALL ON TABLE "public"."assignment_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."assignment_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."blocked_users" TO "anon";
GRANT ALL ON TABLE "public"."blocked_users" TO "authenticated";
GRANT ALL ON TABLE "public"."blocked_users" TO "service_role";



GRANT ALL ON TABLE "public"."boards" TO "anon";
GRANT ALL ON TABLE "public"."boards" TO "authenticated";
GRANT ALL ON TABLE "public"."boards" TO "service_role";



GRANT ALL ON TABLE "public"."cities" TO "anon";
GRANT ALL ON TABLE "public"."cities" TO "authenticated";
GRANT ALL ON TABLE "public"."cities" TO "service_role";



GRANT ALL ON TABLE "public"."class_students" TO "anon";
GRANT ALL ON TABLE "public"."class_students" TO "authenticated";
GRANT ALL ON TABLE "public"."class_students" TO "service_role";



GRANT ALL ON TABLE "public"."class_teachers" TO "anon";
GRANT ALL ON TABLE "public"."class_teachers" TO "authenticated";
GRANT ALL ON TABLE "public"."class_teachers" TO "service_role";



GRANT ALL ON TABLE "public"."classes" TO "anon";
GRANT ALL ON TABLE "public"."classes" TO "authenticated";
GRANT ALL ON TABLE "public"."classes" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."class_overview" TO "anon";
GRANT ALL ON TABLE "public"."class_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."class_overview" TO "service_role";



GRANT ALL ON TABLE "public"."class_statistics" TO "anon";
GRANT ALL ON TABLE "public"."class_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."class_statistics" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_participants" TO "anon";
GRANT ALL ON TABLE "public"."conversation_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participants" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."countries" TO "anon";
GRANT ALL ON TABLE "public"."countries" TO "authenticated";
GRANT ALL ON TABLE "public"."countries" TO "service_role";



GRANT ALL ON TABLE "public"."course_categories" TO "anon";
GRANT ALL ON TABLE "public"."course_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."course_categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."course_categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."course_categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."course_categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."course_languages" TO "anon";
GRANT ALL ON TABLE "public"."course_languages" TO "authenticated";
GRANT ALL ON TABLE "public"."course_languages" TO "service_role";



GRANT ALL ON SEQUENCE "public"."course_languages_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."course_languages_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."course_languages_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."course_lesson_content" TO "anon";
GRANT ALL ON TABLE "public"."course_lesson_content" TO "authenticated";
GRANT ALL ON TABLE "public"."course_lesson_content" TO "service_role";



GRANT ALL ON TABLE "public"."course_lessons" TO "anon";
GRANT ALL ON TABLE "public"."course_lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."course_lessons" TO "service_role";



GRANT ALL ON TABLE "public"."course_levels" TO "anon";
GRANT ALL ON TABLE "public"."course_levels" TO "authenticated";
GRANT ALL ON TABLE "public"."course_levels" TO "service_role";



GRANT ALL ON SEQUENCE "public"."course_levels_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."course_levels_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."course_levels_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."course_members" TO "anon";
GRANT ALL ON TABLE "public"."course_members" TO "authenticated";
GRANT ALL ON TABLE "public"."course_members" TO "service_role";



GRANT ALL ON TABLE "public"."course_sections" TO "anon";
GRANT ALL ON TABLE "public"."course_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."course_sections" TO "service_role";



GRANT ALL ON TABLE "public"."course_thumbnails" TO "anon";
GRANT ALL ON TABLE "public"."course_thumbnails" TO "authenticated";
GRANT ALL ON TABLE "public"."course_thumbnails" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."discussion_likes" TO "anon";
GRANT ALL ON TABLE "public"."discussion_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."discussion_likes" TO "service_role";



GRANT ALL ON TABLE "public"."discussion_participants" TO "anon";
GRANT ALL ON TABLE "public"."discussion_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."discussion_participants" TO "service_role";



GRANT ALL ON TABLE "public"."discussion_replies" TO "anon";
GRANT ALL ON TABLE "public"."discussion_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."discussion_replies" TO "service_role";



GRANT ALL ON TABLE "public"."discussions" TO "anon";
GRANT ALL ON TABLE "public"."discussions" TO "authenticated";
GRANT ALL ON TABLE "public"."discussions" TO "service_role";



GRANT ALL ON TABLE "public"."fcm_tokens" TO "anon";
GRANT ALL ON TABLE "public"."fcm_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."fcm_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."iris_chat_logs" TO "anon";
GRANT ALL ON TABLE "public"."iris_chat_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."iris_chat_logs" TO "service_role";



GRANT ALL ON TABLE "public"."iris_analytics" TO "anon";
GRANT ALL ON TABLE "public"."iris_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."iris_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."login_attempts" TO "anon";
GRANT ALL ON TABLE "public"."login_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."login_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."message_status" TO "anon";
GRANT ALL ON TABLE "public"."message_status" TO "authenticated";
GRANT ALL ON TABLE "public"."message_status" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."observation_reports" TO "anon";
GRANT ALL ON TABLE "public"."observation_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."observation_reports" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."project_statistics" TO "anon";
GRANT ALL ON TABLE "public"."project_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."project_statistics" TO "service_role";



GRANT ALL ON TABLE "public"."question_options" TO "anon";
GRANT ALL ON TABLE "public"."question_options" TO "authenticated";
GRANT ALL ON TABLE "public"."question_options" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_course_links" TO "anon";
GRANT ALL ON TABLE "public"."quiz_course_links" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_course_links" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_math_answers" TO "anon";
GRANT ALL ON TABLE "public"."quiz_math_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_math_answers" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_members" TO "anon";
GRANT ALL ON TABLE "public"."quiz_members" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_members" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_questions" TO "anon";
GRANT ALL ON TABLE "public"."quiz_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_questions" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_retry_requests" TO "anon";
GRANT ALL ON TABLE "public"."quiz_retry_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_retry_requests" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_submissions" TO "anon";
GRANT ALL ON TABLE "public"."quiz_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."regions" TO "anon";
GRANT ALL ON TABLE "public"."regions" TO "authenticated";
GRANT ALL ON TABLE "public"."regions" TO "service_role";



GRANT ALL ON TABLE "public"."school_hierarchy" TO "anon";
GRANT ALL ON TABLE "public"."school_hierarchy" TO "authenticated";
GRANT ALL ON TABLE "public"."school_hierarchy" TO "service_role";



GRANT ALL ON TABLE "public"."secure_links" TO "anon";
GRANT ALL ON TABLE "public"."secure_links" TO "authenticated";
GRANT ALL ON TABLE "public"."secure_links" TO "service_role";



GRANT ALL ON TABLE "public"."security_alerts" TO "anon";
GRANT ALL ON TABLE "public"."security_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."security_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."security_settings" TO "anon";
GRANT ALL ON TABLE "public"."security_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."security_settings" TO "service_role";



GRANT ALL ON TABLE "public"."standalone_question_options" TO "anon";
GRANT ALL ON TABLE "public"."standalone_question_options" TO "authenticated";
GRANT ALL ON TABLE "public"."standalone_question_options" TO "service_role";



GRANT ALL ON TABLE "public"."standalone_quiz_attempts" TO "anon";
GRANT ALL ON TABLE "public"."standalone_quiz_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."standalone_quiz_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."standalone_quiz_math_answers" TO "anon";
GRANT ALL ON TABLE "public"."standalone_quiz_math_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."standalone_quiz_math_answers" TO "service_role";



GRANT ALL ON TABLE "public"."standalone_quiz_questions" TO "anon";
GRANT ALL ON TABLE "public"."standalone_quiz_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."standalone_quiz_questions" TO "service_role";



GRANT ALL ON TABLE "public"."standalone_quiz_retry_requests" TO "anon";
GRANT ALL ON TABLE "public"."standalone_quiz_retry_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."standalone_quiz_retry_requests" TO "service_role";



GRANT ALL ON TABLE "public"."standalone_quizzes" TO "anon";
GRANT ALL ON TABLE "public"."standalone_quizzes" TO "authenticated";
GRANT ALL ON TABLE "public"."standalone_quizzes" TO "service_role";



GRANT ALL ON TABLE "public"."standalone_quiz_summary" TO "anon";
GRANT ALL ON TABLE "public"."standalone_quiz_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."standalone_quiz_summary" TO "service_role";



GRANT ALL ON TABLE "public"."standalone_quiz_text_answer_grades" TO "anon";
GRANT ALL ON TABLE "public"."standalone_quiz_text_answer_grades" TO "authenticated";
GRANT ALL ON TABLE "public"."standalone_quiz_text_answer_grades" TO "service_role";



GRANT ALL ON TABLE "public"."text_answer_grades" TO "anon";
GRANT ALL ON TABLE "public"."text_answer_grades" TO "authenticated";
GRANT ALL ON TABLE "public"."text_answer_grades" TO "service_role";



GRANT ALL ON TABLE "public"."user_content_item_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_content_item_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_content_item_progress" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_content_item_progress_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_content_item_progress_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_content_item_progress_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."user_status" TO "anon";
GRANT ALL ON TABLE "public"."user_status" TO "authenticated";
GRANT ALL ON TABLE "public"."user_status" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
