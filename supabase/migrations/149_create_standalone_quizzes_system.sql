-- Migration: Create Standalone Quizzes System
-- This migration creates a new quiz system that supports both standalone quizzes and course-linked quizzes

-- 1. Create standalone_quizzes table
CREATE TABLE IF NOT EXISTS public.standalone_quizzes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  instructions text,
  time_limit_minutes integer DEFAULT NULL,
  max_attempts integer DEFAULT 1,
  passing_score numeric(5,2) DEFAULT 70.00,
  shuffle_questions boolean DEFAULT false,
  shuffle_options boolean DEFAULT false,
  show_correct_answers boolean DEFAULT true,
  show_results_immediately boolean DEFAULT true,
  allow_retake boolean DEFAULT false,
  retry_settings jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  visibility text DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'restricted')),
  tags text[] DEFAULT '{}',
  difficulty_level text DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  estimated_duration_minutes integer DEFAULT NULL,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  published_at timestamp with time zone DEFAULT NULL,
  CONSTRAINT standalone_quizzes_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 2. Create standalone_quiz_questions table
CREATE TABLE IF NOT EXISTS public.standalone_quiz_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.standalone_quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('single_choice', 'multiple_choice', 'text_answer', 'math_expression')),
  position integer NOT NULL DEFAULT 0,
  points numeric(5,2) DEFAULT 1.00,
  explanation text,
  -- Math-specific fields
  math_expression text,
  math_tolerance numeric(5,4) DEFAULT 0.0001,
  math_hint text,
  math_allow_drawing boolean DEFAULT false,
  -- Additional fields
  is_required boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT standalone_quiz_questions_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 3. Create standalone_question_options table
CREATE TABLE IF NOT EXISTS public.standalone_question_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.standalone_quiz_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT standalone_question_options_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 4. Create standalone_quiz_attempts table
CREATE TABLE IF NOT EXISTS public.standalone_quiz_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.standalone_quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  score numeric(5,2) DEFAULT NULL,
  time_taken_minutes integer DEFAULT NULL,
  submitted_at timestamp with time zone DEFAULT now(),
  retry_reason text DEFAULT NULL,
  teacher_approval_required boolean DEFAULT false,
  teacher_approved boolean DEFAULT NULL,
  teacher_approved_by uuid DEFAULT NULL REFERENCES auth.users(id),
  teacher_approved_at timestamp with time zone DEFAULT NULL,
  teacher_approval_notes text DEFAULT NULL,
  study_materials_completed boolean DEFAULT false,
  study_materials_completed_at timestamp with time zone DEFAULT NULL,
  ip_address inet DEFAULT NULL,
  user_agent text DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT standalone_quiz_attempts_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 5. Create standalone_quiz_retry_requests table
CREATE TABLE IF NOT EXISTS public.standalone_quiz_retry_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.standalone_quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL REFERENCES public.standalone_quiz_attempts(id) ON DELETE CASCADE,
  request_reason text NOT NULL,
  request_details text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid DEFAULT NULL REFERENCES auth.users(id),
  reviewed_at timestamp with time zone DEFAULT NULL,
  review_notes text DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT standalone_quiz_retry_requests_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 6. Create standalone_quiz_math_answers table
CREATE TABLE IF NOT EXISTS public.standalone_quiz_math_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quiz_submission_id uuid DEFAULT NULL REFERENCES public.standalone_quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid DEFAULT NULL REFERENCES public.standalone_quiz_questions(id) ON DELETE CASCADE,
  user_id uuid DEFAULT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latex_expression text NOT NULL,
  simplified_form text DEFAULT NULL,
  is_correct boolean DEFAULT NULL,
  similarity_score numeric(5,4) DEFAULT NULL,
  evaluated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT standalone_quiz_math_answers_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 7. Create quiz_course_links table for linking standalone quizzes to courses
CREATE TABLE IF NOT EXISTS public.quiz_course_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.standalone_quizzes(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_content_id uuid DEFAULT NULL REFERENCES public.course_lesson_content(id) ON DELETE CASCADE,
  link_type text NOT NULL CHECK (link_type IN ('standalone', 'embedded')),
  position integer DEFAULT 0,
  is_required boolean DEFAULT true,
  due_date timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT quiz_course_links_pkey PRIMARY KEY (id),
  CONSTRAINT quiz_course_links_unique_quiz_course UNIQUE (quiz_id, course_id)
) TABLESPACE pg_default;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_standalone_quizzes_author_id ON public.standalone_quizzes USING btree (author_id);
CREATE INDEX IF NOT EXISTS idx_standalone_quizzes_status ON public.standalone_quizzes USING btree (status);
CREATE INDEX IF NOT EXISTS idx_standalone_quizzes_visibility ON public.standalone_quizzes USING btree (visibility);
CREATE INDEX IF NOT EXISTS idx_standalone_quizzes_created_at ON public.standalone_quizzes USING btree (created_at);

CREATE INDEX IF NOT EXISTS idx_standalone_quiz_questions_quiz_id ON public.standalone_quiz_questions USING btree (quiz_id);
CREATE INDEX IF NOT EXISTS idx_standalone_quiz_questions_position ON public.standalone_quiz_questions USING btree (quiz_id, position);

CREATE INDEX IF NOT EXISTS idx_standalone_question_options_question_id ON public.standalone_question_options USING btree (question_id);
CREATE INDEX IF NOT EXISTS idx_standalone_question_options_position ON public.standalone_question_options USING btree (question_id, position);

CREATE INDEX IF NOT EXISTS idx_standalone_quiz_attempts_quiz_user ON public.standalone_quiz_attempts USING btree (quiz_id, user_id);
CREATE INDEX IF NOT EXISTS idx_standalone_quiz_attempts_attempt_number ON public.standalone_quiz_attempts USING btree (quiz_id, user_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_standalone_quiz_attempts_submitted_at ON public.standalone_quiz_attempts USING btree (submitted_at);
CREATE INDEX IF NOT EXISTS idx_standalone_quiz_attempts_teacher_approval ON public.standalone_quiz_attempts USING btree (teacher_approval_required, teacher_approved);

CREATE INDEX IF NOT EXISTS idx_standalone_quiz_retry_requests_quiz_user ON public.standalone_quiz_retry_requests USING btree (quiz_id, user_id);
CREATE INDEX IF NOT EXISTS idx_standalone_quiz_retry_requests_status ON public.standalone_quiz_retry_requests USING btree (status);

CREATE INDEX IF NOT EXISTS idx_standalone_quiz_math_answers_question_id ON public.standalone_quiz_math_answers USING btree (question_id);
CREATE INDEX IF NOT EXISTS idx_standalone_quiz_math_answers_user_id ON public.standalone_quiz_math_answers USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_course_links_quiz_id ON public.quiz_course_links USING btree (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_course_links_course_id ON public.quiz_course_links USING btree (course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_course_links_lesson_content_id ON public.quiz_course_links USING btree (lesson_content_id);

-- 9. Create RLS policies
ALTER TABLE public.standalone_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standalone_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standalone_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standalone_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standalone_quiz_retry_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standalone_quiz_math_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_course_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for standalone_quizzes
DROP POLICY IF EXISTS "Users can view published quizzes" ON public.standalone_quizzes;
CREATE POLICY "Users can view published quizzes" ON public.standalone_quizzes
  FOR SELECT USING (status = 'published' OR auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can manage their own quizzes" ON public.standalone_quizzes;
CREATE POLICY "Authors can manage their own quizzes" ON public.standalone_quizzes
  FOR ALL USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Teachers and Admins can manage all quizzes" ON public.standalone_quizzes;
CREATE POLICY "Teachers and Admins can manage all quizzes" ON public.standalone_quizzes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- RLS policies for standalone_quiz_questions
DROP POLICY IF EXISTS "Users can view questions of published quizzes" ON public.standalone_quiz_questions;
CREATE POLICY "Users can view questions of published quizzes" ON public.standalone_quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.standalone_quizzes 
      WHERE id = quiz_id AND (status = 'published' OR auth.uid() = author_id)
    )
  );

DROP POLICY IF EXISTS "Authors can manage questions of their quizzes" ON public.standalone_quiz_questions;
CREATE POLICY "Authors can manage questions of their quizzes" ON public.standalone_quiz_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.standalone_quizzes 
      WHERE id = quiz_id AND auth.uid() = author_id
    )
  );

DROP POLICY IF EXISTS "Teachers and Admins can manage all quiz questions" ON public.standalone_quiz_questions;
CREATE POLICY "Teachers and Admins can manage all quiz questions" ON public.standalone_quiz_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- RLS policies for standalone_question_options
DROP POLICY IF EXISTS "Users can view options of published quiz questions" ON public.standalone_question_options;
CREATE POLICY "Users can view options of published quiz questions" ON public.standalone_question_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.standalone_quiz_questions sqq
      JOIN public.standalone_quizzes sq ON sq.id = sqq.quiz_id
      WHERE sqq.id = question_id AND (sq.status = 'published' OR sq.author_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authors can manage options of their quiz questions" ON public.standalone_question_options;
CREATE POLICY "Authors can manage options of their quiz questions" ON public.standalone_question_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.standalone_quiz_questions sqq
      JOIN public.standalone_quizzes sq ON sq.id = sqq.quiz_id
      WHERE sqq.id = question_id AND sq.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers and Admins can manage all question options" ON public.standalone_question_options;
CREATE POLICY "Teachers and Admins can manage all question options" ON public.standalone_question_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- RLS policies for standalone_quiz_attempts
DROP POLICY IF EXISTS "Users can view their own quiz attempts" ON public.standalone_quiz_attempts;
CREATE POLICY "Users can view their own quiz attempts" ON public.standalone_quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own quiz attempts" ON public.standalone_quiz_attempts;
CREATE POLICY "Users can create their own quiz attempts" ON public.standalone_quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quiz attempts" ON public.standalone_quiz_attempts;
CREATE POLICY "Users can update their own quiz attempts" ON public.standalone_quiz_attempts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Quiz authors can view attempts on their quizzes" ON public.standalone_quiz_attempts;
CREATE POLICY "Quiz authors can view attempts on their quizzes" ON public.standalone_quiz_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.standalone_quizzes 
      WHERE id = quiz_id AND author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers and Admins can view all quiz attempts" ON public.standalone_quiz_attempts;
CREATE POLICY "Teachers and Admins can view all quiz attempts" ON public.standalone_quiz_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- RLS policies for standalone_quiz_retry_requests
DROP POLICY IF EXISTS "Users can view their own retry requests" ON public.standalone_quiz_retry_requests;
CREATE POLICY "Users can view their own retry requests" ON public.standalone_quiz_retry_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own retry requests" ON public.standalone_quiz_retry_requests;
CREATE POLICY "Users can create their own retry requests" ON public.standalone_quiz_retry_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Quiz authors can manage retry requests for their quizzes" ON public.standalone_quiz_retry_requests;
CREATE POLICY "Quiz authors can manage retry requests for their quizzes" ON public.standalone_quiz_retry_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.standalone_quizzes 
      WHERE id = quiz_id AND author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers and Admins can manage all retry requests" ON public.standalone_quiz_retry_requests;
CREATE POLICY "Teachers and Admins can manage all retry requests" ON public.standalone_quiz_retry_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- RLS policies for standalone_quiz_math_answers
DROP POLICY IF EXISTS "Users can view their own math answers" ON public.standalone_quiz_math_answers;
CREATE POLICY "Users can view their own math answers" ON public.standalone_quiz_math_answers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own math answers" ON public.standalone_quiz_math_answers;
CREATE POLICY "Users can create their own math answers" ON public.standalone_quiz_math_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Quiz authors can view math answers for their quizzes" ON public.standalone_quiz_math_answers;
CREATE POLICY "Quiz authors can view math answers for their quizzes" ON public.standalone_quiz_math_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.standalone_quiz_questions sqq
      JOIN public.standalone_quizzes sq ON sq.id = sqq.quiz_id
      WHERE sqq.id = question_id AND sq.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers and Admins can view all math answers" ON public.standalone_quiz_math_answers;
CREATE POLICY "Teachers and Admins can view all math answers" ON public.standalone_quiz_math_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- RLS policies for quiz_course_links
DROP POLICY IF EXISTS "Users can view quiz course links" ON public.quiz_course_links;
CREATE POLICY "Users can view quiz course links" ON public.quiz_course_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.standalone_quizzes 
      WHERE id = quiz_id AND (status = 'published' OR auth.uid() = author_id)
    )
  );

DROP POLICY IF EXISTS "Quiz authors can manage their quiz course links" ON public.quiz_course_links;
CREATE POLICY "Quiz authors can manage their quiz course links" ON public.quiz_course_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.standalone_quizzes 
      WHERE id = quiz_id AND author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers and Admins can manage all quiz course links" ON public.quiz_course_links;
CREATE POLICY "Teachers and Admins can manage all quiz course links" ON public.quiz_course_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- 10. Create functions for quiz management
DROP FUNCTION IF EXISTS public.get_standalone_quiz_with_questions(uuid);
CREATE OR REPLACE FUNCTION public.get_standalone_quiz_with_questions(input_quiz_id uuid)
RETURNS TABLE (
  quiz_id uuid,
  title text,
  description text,
  instructions text,
  time_limit_minutes integer,
  max_attempts integer,
  passing_score numeric,
  shuffle_questions boolean,
  shuffle_options boolean,
  show_correct_answers boolean,
  show_results_immediately boolean,
  allow_retake boolean,
  retry_settings jsonb,
  status text,
  visibility text,
  tags text[],
  difficulty_level text,
  estimated_duration_minutes integer,
  author_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  published_at timestamp with time zone,
  questions jsonb
) LANGUAGE plpgsql SECURITY DEFINER
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
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', sqq.id,
          'question_text', sqq.question_text,
          'question_type', sqq.question_type,
          'position', sqq.position,
          'points', sqq.points,
          'explanation', sqq.explanation,
          'math_expression', sqq.math_expression,
          'math_tolerance', sqq.math_tolerance,
          'math_hint', sqq.math_hint,
          'math_allow_drawing', sqq.math_allow_drawing,
          'is_required', sqq.is_required,
          'options', COALESCE(
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', sqo.id,
                  'option_text', sqo.option_text,
                  'is_correct', sqo.is_correct,
                  'position', sqo.position
                ) ORDER BY sqo.position
              )
              FROM public.standalone_question_options sqo
              WHERE sqo.question_id = sqq.id
            ),
            '[]'::jsonb
          )
        ) ORDER BY sqq.position
      ) FILTER (WHERE sqq.id IS NOT NULL),
      '[]'::jsonb
    ) as questions
  FROM public.standalone_quizzes sq
  LEFT JOIN public.standalone_quiz_questions sqq ON sq.id = sqq.quiz_id
  WHERE sq.id = input_quiz_id
  GROUP BY sq.id, sq.title, sq.description, sq.instructions, sq.time_limit_minutes, 
           sq.max_attempts, sq.passing_score, sq.shuffle_questions, sq.shuffle_options,
           sq.show_correct_answers, sq.show_results_immediately, sq.allow_retake,
           sq.retry_settings, sq.status, sq.visibility, sq.tags, sq.difficulty_level,
           sq.estimated_duration_minutes, sq.author_id, sq.created_at, sq.updated_at, sq.published_at;
END;
$$;

-- 11. Create function to get user's quiz attempts
DROP FUNCTION IF EXISTS public.get_user_quiz_attempts(uuid, uuid);
CREATE OR REPLACE FUNCTION public.get_user_quiz_attempts(input_user_id uuid, input_quiz_id uuid DEFAULT NULL)
RETURNS TABLE (
  attempt_id uuid,
  quiz_id uuid,
  quiz_title text,
  attempt_number integer,
  score numeric,
  time_taken_minutes integer,
  submitted_at timestamp with time zone,
  status text,
  can_retake boolean
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sqa.id,
    sqa.quiz_id,
    sq.title,
    sqa.attempt_number,
    sqa.score,
    sqa.time_taken_minutes,
    sqa.submitted_at,
    CASE 
      WHEN sqa.score >= sq.passing_score THEN 'passed'
      WHEN sqa.score < sq.passing_score THEN 'failed'
      ELSE 'incomplete'
    END as status,
    CASE 
      WHEN sq.allow_retake = true AND sqa.attempt_number < sq.max_attempts THEN true
      ELSE false
    END as can_retake
  FROM public.standalone_quiz_attempts sqa
  JOIN public.standalone_quizzes sq ON sq.id = sqa.quiz_id
  WHERE sqa.user_id = input_user_id
    AND (input_quiz_id IS NULL OR sqa.quiz_id = input_quiz_id)
  ORDER BY sqa.submitted_at DESC;
END;
$$;

-- 12. Create function to get quiz statistics
DROP FUNCTION IF EXISTS public.get_quiz_statistics(uuid);
CREATE OR REPLACE FUNCTION public.get_quiz_statistics(input_quiz_id uuid)
RETURNS TABLE (
  total_attempts bigint,
  unique_users bigint,
  average_score numeric,
  pass_rate numeric,
  completion_rate numeric
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_attempts,
    COUNT(DISTINCT user_id) as unique_users,
    ROUND(AVG(score), 2) as average_score,
    ROUND(
      (COUNT(*) FILTER (WHERE score >= sq.passing_score)::numeric / COUNT(*)::numeric) * 100, 
      2
    ) as pass_rate,
    ROUND(
      (COUNT(*) FILTER (WHERE submitted_at IS NOT NULL)::numeric / COUNT(*)::numeric) * 100, 
      2
    ) as completion_rate
  FROM public.standalone_quiz_attempts sqa
  JOIN public.standalone_quizzes sq ON sq.id = sqa.quiz_id
  WHERE sqa.quiz_id = input_quiz_id;
END;
$$;

-- 13. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_standalone_quizzes_updated_at ON public.standalone_quizzes;
CREATE TRIGGER update_standalone_quizzes_updated_at
  BEFORE UPDATE ON public.standalone_quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_standalone_quiz_questions_updated_at ON public.standalone_quiz_questions;
CREATE TRIGGER update_standalone_quiz_questions_updated_at
  BEFORE UPDATE ON public.standalone_quiz_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_standalone_quiz_attempts_updated_at ON public.standalone_quiz_attempts;
CREATE TRIGGER update_standalone_quiz_attempts_updated_at
  BEFORE UPDATE ON public.standalone_quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_standalone_quiz_retry_requests_updated_at ON public.standalone_quiz_retry_requests;
CREATE TRIGGER update_standalone_quiz_retry_requests_updated_at
  BEFORE UPDATE ON public.standalone_quiz_retry_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_quiz_course_links_updated_at ON public.quiz_course_links;
CREATE TRIGGER update_quiz_course_links_updated_at
  BEFORE UPDATE ON public.quiz_course_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Create function to duplicate a quiz
DROP FUNCTION IF EXISTS public.duplicate_standalone_quiz(uuid, text, uuid);
CREATE OR REPLACE FUNCTION public.duplicate_standalone_quiz(original_quiz_id uuid, new_title text, new_author_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
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

-- 15. Create function to get quizzes by author
DROP FUNCTION IF EXISTS public.get_quizzes_by_author(uuid, boolean);
CREATE OR REPLACE FUNCTION public.get_quizzes_by_author(author_id uuid, include_drafts boolean DEFAULT true)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  status text,
  visibility text,
  difficulty_level text,
  estimated_duration_minutes integer,
  total_questions bigint,
  total_attempts bigint,
  average_score numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  published_at timestamp with time zone
) LANGUAGE plpgsql SECURITY DEFINER
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

-- 16. Create function to search quizzes
DROP FUNCTION IF EXISTS public.search_standalone_quizzes(text, text, text, uuid, integer, integer);
CREATE OR REPLACE FUNCTION public.search_standalone_quizzes(
  search_term text DEFAULT '',
  difficulty_filter text DEFAULT '',
  status_filter text DEFAULT '',
  author_filter uuid DEFAULT NULL,
  limit_count integer DEFAULT 20,
  offset_count integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  status text,
  visibility text,
  difficulty_level text,
  estimated_duration_minutes integer,
  total_questions bigint,
  author_name text,
  author_email text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  published_at timestamp with time zone
) LANGUAGE plpgsql SECURITY DEFINER
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

-- 17. Add comments for documentation
COMMENT ON TABLE public.standalone_quizzes IS 'Standalone quizzes that can be used independently or linked to courses';
COMMENT ON TABLE public.standalone_quiz_questions IS 'Questions belonging to standalone quizzes';
COMMENT ON TABLE public.standalone_question_options IS 'Answer options for standalone quiz questions';
COMMENT ON TABLE public.standalone_quiz_attempts IS 'User attempts on standalone quizzes';
COMMENT ON TABLE public.standalone_quiz_retry_requests IS 'Requests for retaking standalone quizzes';
COMMENT ON TABLE public.standalone_quiz_math_answers IS 'Math expression answers for standalone quiz questions';
COMMENT ON TABLE public.quiz_course_links IS 'Links between standalone quizzes and courses';

COMMENT ON FUNCTION public.get_standalone_quiz_with_questions(uuid) IS 'Retrieves a standalone quiz with all its questions and options';
COMMENT ON FUNCTION public.get_user_quiz_attempts(uuid, uuid) IS 'Gets all quiz attempts for a user, optionally filtered by quiz';
COMMENT ON FUNCTION public.get_quiz_statistics(uuid) IS 'Gets statistics for a standalone quiz';
COMMENT ON FUNCTION public.duplicate_standalone_quiz(uuid, text, uuid) IS 'Creates a copy of an existing quiz';
COMMENT ON FUNCTION public.get_quizzes_by_author(uuid, boolean) IS 'Gets all quizzes created by an author';
COMMENT ON FUNCTION public.search_standalone_quizzes(text, text, text, uuid, integer, integer) IS 'Searches for standalone quizzes with filters';
