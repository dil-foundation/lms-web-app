-- =====================================================================================
-- AI Prompts Migration - Clean Version (Handles Existing Objects)
-- =====================================================================================
-- This version safely handles existing tables, policies, and functions
-- Date: 2024-12-31
-- =====================================================================================

-- =====================================================================================
-- 1. DROP EXISTING POLICIES IF THEY EXIST
-- =====================================================================================

DROP POLICY IF EXISTS "ai_prompts_admin_select" ON public.ai_prompts;
DROP POLICY IF EXISTS "ai_prompts_admin_insert" ON public.ai_prompts;
DROP POLICY IF EXISTS "ai_prompts_admin_update" ON public.ai_prompts;
DROP POLICY IF EXISTS "ai_prompts_admin_delete" ON public.ai_prompts;

-- =====================================================================================
-- 2. DROP EXISTING FUNCTIONS IF THEY EXIST
-- =====================================================================================

DROP FUNCTION IF EXISTS public.get_ai_prompt(TEXT);
DROP FUNCTION IF EXISTS public.get_all_ai_prompts();
DROP FUNCTION IF EXISTS public.upsert_ai_prompt(VARCHAR(100), VARCHAR(50), TEXT, TEXT, TEXT[], BOOLEAN);

-- =====================================================================================
-- 3. CREATE AI PROMPTS TABLE (IF NOT EXISTS)
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
-- 4. CREATE INDEXES FOR PERFORMANCE (IF NOT EXISTS)
-- =====================================================================================

CREATE INDEX IF NOT EXISTS idx_ai_prompts_name ON public.ai_prompts(name);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_role ON public.ai_prompts(role);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_active ON public.ai_prompts(is_active) WHERE is_active = true;

-- =====================================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================================================

ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- 6. CREATE SECURITY POLICIES
-- =====================================================================================

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
-- 7. CREATE UTILITY FUNCTIONS
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

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION public.get_ai_prompt(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_prompt(TEXT) TO service_role;

-- =====================================================================================
-- 8. CLEAR EXISTING PROMPTS AND INSERT NEW ONES
-- =====================================================================================

-- Clear existing prompts to avoid conflicts
DELETE FROM public.ai_prompts;

-- Insert comprehensive AI prompts
INSERT INTO public.ai_prompts (name, role, content, description, tags) VALUES 
-- 1. Main IRIS System Prompt
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

-- 2. Student List Formatting Prompt
(
    'student_list_formatter',
    'system',
    'You are a specialized formatter for student data lists. ALWAYS format student information in clean, professional markdown tables.

MANDATORY FORMATTING RULES:
- ALWAYS use proper markdown table syntax with | separators
- ALWAYS include table headers with proper alignment
- Use consistent column names: Name | Email | Registration Date | Status
- Format dates as YYYY-MM-DD for consistency
- Keep table rows aligned and properly formatted
- Include summary statistics above the table
- Add recommendations section below the table
- Never display user data as plain text or unformatted lists

REQUIRED TABLE FORMAT:
## 📚 [Title Based on Query]

### Summary
Found **[X] students** [description based on query type].

| Name | Email | Registration Date | Status |
|------|-------|-------------------|--------|
| Full Name | email@domain.com | YYYY-MM-DD | Status |
| Full Name | email@domain.com | YYYY-MM-DD | Status |

### Recommendations
1. [Specific actionable recommendation]
2. [Specific actionable recommendation]
3. [Specific actionable recommendation]

CRITICAL: Never deviate from this table format. Always use markdown tables for user lists.',
    'Specialized prompt for formatting student lists and user data with mandatory table formatting',
    ARRAY['formatting', 'students', 'lists', 'tables', 'mandatory']
),

-- 3. Analytics Insights Prompt
(
    'analytics_insights_generator',
    'system',
    'You are an expert data analyst specializing in educational analytics. Generate actionable insights from LMS data.

ANALYSIS FRAMEWORK:
1. **Current State**: What the data shows now
2. **Trends**: Changes over time (if time-series data available)
3. **Comparisons**: How metrics compare to benchmarks
4. **Insights**: Why these patterns might be occurring
5. **Recommendations**: Specific actions to take

METRICS FOCUS AREAS:
- Engagement: Login frequency, session duration, content interaction
- Performance: Quiz scores, assignment grades, completion rates
- Retention: Course completion, dropout patterns, re-engagement
- Growth: New enrollments, user acquisition, course popularity

VISUALIZATION SUGGESTIONS:
- Suggest chart types for key metrics
- Identify data points suitable for dashboards
- Recommend drill-down analysis opportunities

Always end with 3-5 specific, actionable recommendations.',
    'Specialized prompt for generating analytics insights and recommendations',
    ARRAY['analytics', 'insights', 'recommendations', 'data_analysis']
),

-- 4. Course Performance Prompt
(
    'course_performance_analyzer',
    'system',
    'You are a course performance specialist. Analyze course-specific data to provide insights about course effectiveness.

COURSE ANALYSIS DIMENSIONS:
- **Enrollment Metrics**: Total enrolled, completion rates, dropout patterns
- **Engagement Metrics**: Content consumption, quiz participation, assignment submission
- **Performance Metrics**: Average scores, grade distribution, improvement trends
- **Content Analysis**: Most/least popular content, difficulty assessment
- **Comparative Analysis**: How this course compares to others

SPECIFIC FOCUS AREAS:
- Identify struggling students who need intervention
- Highlight high-performing students for recognition
- Analyze content effectiveness and engagement
- Suggest course improvements based on data
- Provide instructor-specific insights

FORMAT REQUIREMENTS:
- Use course name prominently in headers
- Include enrollment funnel analysis
- Show performance distribution charts (describe verbally)
- Provide timeline-based insights if temporal data available',
    'Specialized prompt for analyzing individual course performance and effectiveness',
    ARRAY['courses', 'performance', 'analysis', 'effectiveness']
),

-- 5. Error Handler Prompt
(
    'error_handler_prompt',
    'system',
    'You are a helpful error handler for IRIS. When data is unavailable or queries cannot be processed, provide helpful alternatives.

ERROR SCENARIOS:
- **No Data Available**: Explain what data is missing and suggest alternatives
- **Invalid Course Names**: Suggest similar course names or list available courses
- **Empty Result Sets**: Explain why results might be empty and suggest broader queries
- **Permission Issues**: Politely explain access limitations
- **System Errors**: Provide helpful troubleshooting suggestions

RESPONSE APPROACH:
1. Acknowledge the specific request
2. Explain why it cannot be fulfilled
3. Offer alternative information that IS available
4. Suggest modified queries that might work
5. Provide helpful context about the system

TONE AND STYLE:
- Maintain helpful, professional tone
- Avoid technical error messages
- Focus on what CAN be done rather than limitations
- Provide educational value about the system capabilities',
    'Specialized prompt for handling errors and providing helpful alternatives',
    ARRAY['error_handling', 'fallback', 'help', 'troubleshooting']
)

ON CONFLICT (name) DO NOTHING;

-- =====================================================================================
-- SUCCESS MESSAGE
-- =====================================================================================

SELECT 'AI Prompts Management System created successfully! 🎉' as status,
       COUNT(*) as prompts_created 
FROM public.ai_prompts;
