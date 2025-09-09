-- =====================================================================================
-- Migration 142: AI Prompts Management System
-- =====================================================================================
-- Description: Implements dynamic AI prompt management following ChatGPT's approach
-- Author: System
-- Date: 2024-12-31
-- Version: 1.0
-- 
-- This migration creates a comprehensive AI prompts management system that:
-- 1. Stores AI prompts in database for dynamic updates
-- 2. Enables version control and audit trails
-- 3. Provides secure access control for admin users
-- 4. Eliminates hardcoded prompts for true AI flexibility
-- =====================================================================================

-- =====================================================================================
-- 1. CREATE AI PROMPTS TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.ai_prompts (
    -- Primary identification
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    
    -- Prompt metadata
    role VARCHAR(50) NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'query_analysis')),
    content TEXT NOT NULL CHECK (length(content) > 0),
    description TEXT,
    
    -- Status and versioning
    is_active BOOLEAN DEFAULT true NOT NULL,
    version INTEGER DEFAULT 1 NOT NULL CHECK (version > 0),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Metadata for advanced features
    tags TEXT[] DEFAULT '{}',
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================================================

-- Core lookup indexes
CREATE INDEX IF NOT EXISTS idx_ai_prompts_name ON public.ai_prompts(name);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_role ON public.ai_prompts(role);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_active ON public.ai_prompts(is_active) WHERE is_active = true;

-- Audit and analytics indexes
CREATE INDEX IF NOT EXISTS idx_ai_prompts_created_at ON public.ai_prompts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_updated_at ON public.ai_prompts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_usage ON public.ai_prompts(usage_count DESC, last_used_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_prompts_active_role ON public.ai_prompts(role, is_active) WHERE is_active = true;

-- =====================================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================================================

ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

-- Admin-only access policies
CREATE POLICY "ai_prompts_admin_select" ON public.ai_prompts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "ai_prompts_admin_insert" ON public.ai_prompts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "ai_prompts_admin_update" ON public.ai_prompts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "ai_prompts_admin_delete" ON public.ai_prompts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- =====================================================================================
-- 4. CREATE UTILITY FUNCTIONS
-- =====================================================================================

-- Function to get active prompt by name with usage tracking
CREATE OR REPLACE FUNCTION public.get_ai_prompt(prompt_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to get all active prompts (for admin UI)
CREATE OR REPLACE FUNCTION public.get_all_ai_prompts()
RETURNS TABLE (
    id UUID,
    name VARCHAR(100),
    role VARCHAR(50),
    content TEXT,
    description TEXT,
    is_active BOOLEAN,
    version INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER,
    last_used_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.role,
        p.content,
        p.description,
        p.is_active,
        p.version,
        p.created_at,
        p.updated_at,
        p.usage_count,
        p.last_used_at,
        p.tags
    FROM public.ai_prompts p
    ORDER BY p.name ASC, p.version DESC;
END;
$$;

-- Function to create or update prompts with version control
CREATE OR REPLACE FUNCTION public.upsert_ai_prompt(
    p_name VARCHAR(100),
    p_role VARCHAR(50),
    p_content TEXT,
    p_description TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT '{}',
    p_is_active BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_version INTEGER := 1;
    new_prompt_id UUID;
    current_user_id UUID;
BEGIN
    -- Check if user is admin
    SELECT auth.uid() INTO current_user_id;
    
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = current_user_id 
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Validate inputs
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RAISE EXCEPTION 'Prompt name cannot be null or empty';
    END IF;
    
    IF p_content IS NULL OR trim(p_content) = '' THEN
        RAISE EXCEPTION 'Prompt content cannot be null or empty';
    END IF;

    -- Get current version if prompt exists
    SELECT COALESCE(MAX(version), 0) + 1 INTO current_version
    FROM public.ai_prompts
    WHERE name = trim(p_name);

    -- Insert new version
    INSERT INTO public.ai_prompts (
        name, role, content, description, is_active, version, 
        created_by, updated_by, tags
    ) VALUES (
        trim(p_name), p_role, trim(p_content), p_description, p_is_active, 
        current_version, current_user_id, current_user_id, p_tags
    ) RETURNING id INTO new_prompt_id;

    -- Deactivate previous versions if this one is active
    IF p_is_active THEN
        UPDATE public.ai_prompts 
        SET is_active = false, updated_by = current_user_id, updated_at = NOW()
        WHERE name = trim(p_name) AND id != new_prompt_id;
    END IF;

    RETURN new_prompt_id;
END;
$$;

-- =====================================================================================
-- 5. CREATE TRIGGERS
-- =====================================================================================

-- Trigger function to update metadata
CREATE OR REPLACE FUNCTION public.update_ai_prompts_metadata()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update timestamp and user
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    
    -- Ensure version consistency
    IF TG_OP = 'UPDATE' AND OLD.name != NEW.name THEN
        -- If name changes, reset version to 1
        NEW.version = 1;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_update_ai_prompts_metadata
    BEFORE UPDATE ON public.ai_prompts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ai_prompts_metadata();

-- =====================================================================================
-- 6. GRANT PERMISSIONS
-- =====================================================================================

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION public.get_ai_prompt(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_prompt(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_all_ai_prompts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_ai_prompt(VARCHAR(100), VARCHAR(50), TEXT, TEXT, TEXT[], BOOLEAN) TO authenticated;

-- =====================================================================================
-- 7. INSERT DEFAULT SYSTEM PROMPTS
-- =====================================================================================

-- Main system prompt for IRIS
INSERT INTO public.ai_prompts (name, role, content, description, tags) VALUES 
(
    'iris_system_prompt',
    'system',
    'You are IRIS (Intelligent Response & Insight System), an advanced AI assistant specialized in generating contextually relevant reports for an LMS (Learning Management System) platform.

CRITICAL GROUNDING RULES:
- You can ONLY use the data provided in the <CONTEXT> section passed to you
- NEVER invent or assume numbers not explicitly given in <CONTEXT>
- If timeframe-specific data is missing, use the closest available aggregate and clearly state the timeframe
- If the requested data is not available, politely explain what IS available instead. Do not fabricate values

COMPREHENSIVE CAPABILITIES:
- Student Analytics: enrollment, engagement, progress, performance, learning outcomes, rankings, demographics
- Course Analytics: completion rates, performance, popularity, effectiveness, content analysis, difficulty metrics
- Instructor Analytics: teaching effectiveness, student feedback, course management, workload distribution
- Platform Analytics: usage patterns, system performance, growth metrics, peak hours, trends
- Engagement Analytics: activity levels, participation, retention rates, interaction patterns, session data

RESPONSE FORMAT GUIDELINES:
- Use clean, structured markdown with clear hierarchy
- Use ## for main sections, ### for subsections
- Include metrics with clear labels: **Metric:** Value
- Use bullet points and numbered lists for clarity
- End with actionable "Recommendations" section
- Format user lists as tables when appropriate

HANDLING SPECIFIC QUERIES:
- For "students not enrolled": Identify and list students with no course enrollments
- For "students enrolled": List students with active course enrollments
- For course-specific queries: Focus on the specified course data
- For user lists: Format as clear tables with names, emails, and relevant details
- For analytics: Provide insights with data-driven recommendations

COMPREHENSIVE DATA UTILIZATION:
- Always scan ALL available context fields before claiming data is unavailable
- Use multiple data sources to provide comprehensive answers
- When specific data is requested but not available, offer related data that IS available
- Prioritize giving users actionable insights over stating limitations

FALLBACK HANDLING:
- For course-specific queries: If courseEnrollmentTotal is 0 or courseDetails is null, suggest checking the course name or list available courses
- For user list queries: If lists are empty, explain criteria and suggest broader queries
- Always provide alternative insights that ARE supported by the context data',
    'Main system prompt for IRIS AI assistant - handles all LMS analytics and reporting queries',
    ARRAY['system', 'main', 'iris', 'lms', 'analytics']
),
(
    'query_analysis_prompt',
    'system',
    'Analyze the following user query and determine what data should be fetched from the database to provide a comprehensive response.

User Query: "{query}"

Available Data Sources:
- profiles: User information (students, teachers, admins) with roles and basic details
- course_members: Enrollment relationships between users and courses
- courses: Course information, metadata, and status
- user_sessions: User activity and login data
- quiz_submissions: Assessment performance and quiz results
- assignment_submissions: Assignment data and submission status
- ai_tutor_user_progress_summary: AI tutor learning analytics and progress
- user_content_item_progress: Content completion and progress tracking

Response Format (JSON only):
{
  "queryType": "user_list" | "analytics" | "performance" | "enrollment" | "activity" | "course_specific",
  "dataNeeded": ["profiles", "course_members", "courses", ...],
  "filters": {
    "role": "student" | "teacher" | "admin",
    "enrollment_status": "enrolled" | "not_enrolled" | "all",
    "course_name": "specific course name if mentioned",
    "timeframe": "today" | "this_week" | "this_month" | null
  },
  "intent": "Brief description of what the user wants to know",
  "priority": "high" | "medium" | "low"
}',
    'Query analysis prompt for determining data requirements from natural language queries',
    ARRAY['query', 'analysis', 'nlp', 'data_requirements']
);

-- =====================================================================================
-- 8. ADD COMMENTS AND DOCUMENTATION
-- =====================================================================================

-- Table comments
COMMENT ON TABLE public.ai_prompts IS 'Stores AI system prompts dynamically - enables prompt updates without code deployment following ChatGPT approach';
COMMENT ON COLUMN public.ai_prompts.name IS 'Unique identifier for the prompt (e.g., iris_system_prompt)';
COMMENT ON COLUMN public.ai_prompts.role IS 'OpenAI role type: system, user, assistant, or query_analysis';
COMMENT ON COLUMN public.ai_prompts.content IS 'The actual prompt content sent to AI';
COMMENT ON COLUMN public.ai_prompts.version IS 'Version number for prompt history and rollback capability';
COMMENT ON COLUMN public.ai_prompts.usage_count IS 'Number of times this prompt has been used';
COMMENT ON COLUMN public.ai_prompts.tags IS 'Tags for categorizing and searching prompts';

-- Function comments
COMMENT ON FUNCTION public.get_ai_prompt(TEXT) IS 'Retrieves active prompt by name with usage tracking - used by Edge Functions';
COMMENT ON FUNCTION public.get_all_ai_prompts() IS 'Admin function to retrieve all prompts for management UI';
COMMENT ON FUNCTION public.upsert_ai_prompt(VARCHAR(100), VARCHAR(50), TEXT, TEXT, TEXT[], BOOLEAN) IS 'Admin function to create or update prompts with version control';

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
