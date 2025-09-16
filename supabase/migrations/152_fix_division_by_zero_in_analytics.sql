-- Migration: Fix division by zero errors in quiz analytics functions
-- This fixes the 22012 error by adding NULLIF to prevent division by zero

-- Fix get_quiz_statistics function
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

-- Fix get_quiz_performance_analytics function
DROP FUNCTION IF EXISTS public.get_quiz_performance_analytics(uuid);

CREATE OR REPLACE FUNCTION public.get_quiz_performance_analytics(input_quiz_id uuid)
RETURNS TABLE (
  metric_name text,
  metric_value numeric,
  metric_description text
) LANGUAGE plpgsql SECURITY DEFINER
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
