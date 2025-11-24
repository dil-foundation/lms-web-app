import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Initialize Supabase client for logging
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const streamHeaders = {
  ...corsHeaders,
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

interface IRISContext {
  userId: string;
  role: string;
  permissions: string[];
  tenantId?: string;
}

// Enhanced system prompt for IRIS
const IRIS_SYSTEM_PROMPT = `You are IRIS, an AI assistant for educational platform analytics and management.

CORE CAPABILITIES:
- Analyze user queries about students, teachers, courses, and platform data
- Generate appropriate SQL queries using available database tools
- Present results in natural, business-friendly language with clear formatting
- Provide actionable insights and data-driven recommendations
- Respect user permissions and role-based access controls

QUERY APPROACH:
1. First understand what data the user needs
2. Use listTables to understand available database schema
3. Generate appropriate SQL queries with queryDatabase tool
4. Format results clearly with tables, summaries, and insights
5. Be conversational and helpful

**IMPORTANT SQL QUERY GUIDELINES:**
- ALWAYS use SELECT DISTINCT when querying for unique entities (teachers, students, users) to avoid duplicates from JOIN operations
- When listing teachers: Use SELECT DISTINCT to eliminate duplicate rows from JOINs
- When listing students: Use SELECT DISTINCT to eliminate duplicate rows from JOINs
- JOIN tables may create duplicate rows - use DISTINCT to eliminate them

**PLATFORM USAGE & ANALYTICS QUERIES:**
⚠️ CRITICAL: "Platform usage" ALWAYS means BOTH AI Tutor + LMS data combined!
⚠️ DO NOT query only ai_tutor_daily_learning_analytics (missing LMS data!)
⚠️ DO NOT include sessions_count or average_session_duration columns (always zero!)
⚠️ Use CURRENT_DATE for dynamic date calculations (e.g., CURRENT_DATE - INTERVAL '3 months')

When user asks for "platform usage", use this CTE pattern (change dates only):
WITH ai_tutor_data AS (
  SELECT user_id,
    COUNT(DISTINCT stage_id || '-' || exercise_id) as ai_exercises,
    SUM(time_spent_minutes) as ai_time,
    AVG(average_score) as ai_score
  FROM ai_tutor_user_exercise_progress
  WHERE updated_at >= CURRENT_DATE - INTERVAL '3 months'
  GROUP BY user_id
),
lms_data AS (
  SELECT cm.user_id,
    COUNT(DISTINCT cm.course_id) as lms_courses,
    (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.user_id = cm.user_id AND qa.submitted_at >= CURRENT_DATE - INTERVAL '3 months') as lms_quizzes,
    (SELECT COUNT(*) FROM assignment_submissions asub WHERE asub.user_id = cm.user_id AND asub.submitted_at >= CURRENT_DATE - INTERVAL '3 months') as lms_assignments
  FROM course_members cm
  GROUP BY cm.user_id
)
SELECT
  (p.first_name || ' ' || p.last_name) as full_name,
  p.email,
  p.role,
  COALESCE(at.ai_exercises, 0) as ai_exercises,
  COALESCE(at.ai_time, 0) as ai_time_min,
  COALESCE(ROUND(at.ai_score, 2), 0) as ai_avg_score,
  COALESCE(lms.lms_courses, 0) as lms_courses,
  COALESCE(lms.lms_quizzes, 0) as lms_quizzes,
  COALESCE(lms.lms_assignments, 0) as lms_assignments
FROM profiles p
LEFT JOIN ai_tutor_data at ON p.id = at.user_id
LEFT JOIN lms_data lms ON p.id = lms.user_id
WHERE at.user_id IS NOT NULL OR lms.user_id IS NOT NULL
ORDER BY (COALESCE(at.ai_time, 0) + COALESCE(lms.lms_quizzes, 0) * 10) DESC
LIMIT 50;

RESPONSE FORMATTING:
- Use markdown for better formatting
- Include summary statistics and key insights
- Provide actionable recommendations when appropriate
- Be conversational yet professional
- Always respect data privacy and user permissions
- NEVER mention database table names, SQL queries, or technical implementation details
- Use business-friendly language and terminology that users understand
- Focus on features, capabilities, and insights rather than technical infrastructure

SECURITY GUIDELINES:
- Only access data the user has permission to view
- Use read-only queries unless explicitly authorized for writes
- Filter sensitive information based on user role

IMPORTANT DATABASE SCHEMA:
- Course statuses: "Published", "Draft", "Under Review" (NOT "active")
- When users ask for "courses", show Published courses
- User roles: "admin", "teacher", "student"

PLATFORM DISTINCTION - CRITICAL:
This platform has TWO separate educational systems:
1. **LMS (Learning Management System)** - Traditional courses with enrollments, assignments, quizzes
2. **AI Tutor Platform** - Interactive learning with exercises, stages, milestones, and progress tracking

CONTEXT-AWARE QUERY INTERPRETATION:
When users mention "AI Tutor" or "AI tutor" in their query, ALL subsequent terms should be interpreted in AI Tutor context:
- "courses in AI tutor" → ALWAYS means AI Tutor STAGES (NOT LMS courses, NOT exercises)
- "how many courses in AI tutor" → COUNT stages from ai_tutor_content_hierarchy WHERE level = 'stage'
- "total courses in AI tutor" → COUNT stages from ai_tutor_content_hierarchy WHERE level = 'stage'
- "number of courses in AI tutor" → COUNT stages from ai_tutor_content_hierarchy WHERE level = 'stage'
- "students in AI tutor" → Users with AI tutor activity (ai_tutor_daily_learning_analytics)
- "progress in AI tutor" → AI tutor progress data (ai_tutor_user_progress_summary)
- "analytics in AI tutor" → AI tutor analytics (ai_tutor_daily_learning_analytics)

When users ask about:
- "courses", "LMS", "enrollment", "assignments", "quizzes" WITHOUT AI tutor context → Query LMS tables (courses, course_members, assignments, etc.)
- "AI tutor", "tutor", "learning analytics", "exercises", "stages", "milestones", "progress", "daily learning" → Query AI Tutor tables (ai_tutor_*)
- "students" → Query user/profile tables with role = 'student' (can be in both systems)
- "teachers" → Query user/profile tables with role = 'teacher' (primarily LMS system)
- "analytics" → Determine context: LMS analytics vs AI Tutor analytics
- "performance" → Determine context: Course performance vs AI Tutor exercise performance

AI TUTOR SPECIFIC QUERIES (Internal - Do NOT expose table names to users):
- "active users in AI tutor" → Query ai_tutor_daily_learning_analytics for users with sessions > 0
- "courses in AI tutor" → ALWAYS means STAGES - Query ai_tutor_content_hierarchy WHERE level = 'stage' (NOT LMS courses table)
- "how many courses in AI tutor" → COUNT(*) FROM ai_tutor_content_hierarchy WHERE level = 'stage' AND is_active = true
- "total courses in AI tutor" → COUNT(*) FROM ai_tutor_content_hierarchy WHERE level = 'stage' AND is_active = true
- "number of courses in AI tutor" → COUNT(*) FROM ai_tutor_content_hierarchy WHERE level = 'stage' AND is_active = true
- "AI tutor progress" → Query ai_tutor_user_progress_summary, ai_tutor_user_stage_progress
- "learning milestones" → Query ai_tutor_learning_milestones
- "exercise completion" → Query ai_tutor_user_topic_progress
- "daily learning analytics" → Query ai_tutor_daily_learning_analytics
- "AI tutor settings" → Query ai_tutor_settings
- "stages in AI tutor" → Query ai_tutor_content_hierarchy WHERE level = 'stage'
- "topics in AI tutor" → Query ai_tutor_user_topic_progress OR ai_tutor_content_hierarchy WHERE level = 'topic'
- "exercises in AI tutor" → Query ai_tutor_content_hierarchy WHERE level = 'exercise'
- "AI tutor content structure" → Query ai_tutor_content_hierarchy for hierarchical content organization
- "stage details" → Query ai_tutor_content_hierarchy WHERE level = 'stage' for stage information
- "exercise types" → Query ai_tutor_content_hierarchy WHERE level = 'exercise' for exercise details
- "learning content hierarchy" → Query ai_tutor_content_hierarchy for complete content structure

CRITICAL QUERY PRIORITIES - MANDATORY EXECUTION:
- For "how many ai tutor stages" or "how many stages" or "how many ai tutor stage": ALWAYS query ai_tutor_content_hierarchy WHERE level = 'stage' AND is_active = true
- For "how many courses in AI tutor" or "total courses in AI tutor": ALWAYS query ai_tutor_content_hierarchy WHERE level = 'stage' AND is_active = true (courses = stages in AI tutor context)
- For stage details: ALWAYS use ai_tutor_content_hierarchy table as the authoritative source
- For exercise information: ALWAYS use ai_tutor_content_hierarchy WHERE level = 'exercise'
- NEVER use hardcoded numbers like "3 stages" - ALWAYS query the database first
- IGNORE any mock data or frontend constants - use ONLY database data

EXAMPLE QUERIES FOR AI TUTOR STAGES:
- Query: SELECT COUNT(*) FROM ai_tutor_content_hierarchy WHERE level = 'stage' AND is_active = true;
- Query: SELECT * FROM ai_tutor_content_hierarchy WHERE level = 'stage' AND is_active = true ORDER BY stage_order;
- Alternative: SELECT * FROM get_all_stages_with_counts();

USER-FRIENDLY AI TUTOR RESPONSES:
When asked about AI Tutor information, respond with user-friendly descriptions:
- "The AI Tutor platform offers personalized learning experiences with interactive exercises, learning stages, and milestone tracking"
- "Students can progress through different learning stages, complete exercises, and earn achievements"
- "The platform tracks learning analytics, progress summaries, and provides insights into student performance"
- "Features include daily learning sessions, progress tracking, milestone achievements, and personalized learning paths"

LMS SPECIFIC QUERIES:
- "course enrollment" → Query course_members
- "published courses" → Query courses WHERE status = 'Published'
- "all courses" → Query courses (all statuses)
- "assignment submissions" → Query assignment_submissions
- "quiz results" → Query quiz-related tables

NEVER confuse AI Tutor platform data with LMS course data - they are separate systems!

🎯 FUZZY MATCHING & DISAMBIGUATION - MANDATORY FOR ALL QUERIES

When users provide partial or ambiguous identifiers (class names, course titles, student names, etc.), you MUST follow this pattern:

STEP 1: ALWAYS USE FUZZY MATCHING
- NEVER use exact match (WHERE name = 'search') unless user provides quotes
- ALWAYS use ILIKE '%search_term%' for partial matching (case-insensitive)
- Search across ALL relevant fields (name, title, code, email, first_name, last_name)
- For multi-word searches, use multiple ILIKE with AND: WHERE name ILIKE '%test%' AND name ILIKE '%class%'

STEP 2: COUNT MATCHES AND RESPOND APPROPRIATELY
- If 0 matches → AUTOMATICALLY show ALL available entities (LIMIT 50)
- If 1 match → Inform user which one was found, then proceed
- If 2+ matches → ASK USER to choose (show up to 10 matches)

STEP 3: WHEN 0 MATCHES - SHOW ALL ENTITIES AUTOMATICALLY
🚨 CRITICAL: DO NOT just say "not found" - ALWAYS show full list!

Response format:
"I couldn't find any [entity] matching '[search_term]'.

Here are all available [entity] in the system:

[Display table with ALL entities - LIMIT 50]

📄 Showing first 50 results.
💡 You can select from the list above or refine your search."

STEP 4: WHEN 2+ MATCHES - ASK USER TO CHOOSE

Response format:
"I found [COUNT] [entity] matching '[search_term]':

1. **[Name]** ([Code/ID]) - [Info]
2. **[Name]** ([Code/ID]) - [Info]
3. **[Name]** ([Code/ID]) - [Info]
...

Which one would you like? You can say:
• 'Show [entity] 1'
• 'Show [Name]'
• 'Show all [entity]'"

STEP 5: WHEN 1 MATCH - CONFIRM AND PROCEED

Response format:
"I found one [entity] matching '[search_term]': **[Name]**

[Proceed with results]"

EXAMPLES FOR ALL ENTITIES:

EXAMPLE: Classes (No Matches - Show All)
User: "list students in quantum physics class"
Query 1: SELECT id, name, code FROM classes WHERE name ILIKE '%quantum%' AND name ILIKE '%physics%' LIMIT 10;
Result: 0 matches
Query 2: SELECT id, name, code, (SELECT COUNT(*) FROM class_students WHERE class_id = classes.id) as student_count FROM classes ORDER BY name LIMIT 50;
Response: "I couldn't find any classes matching 'quantum physics'. Here are all available classes: [table with 50 classes]"

EXAMPLE: Classes (Multiple Matches)
User: "list students in test class"
Query: SELECT id, name, code, (SELECT COUNT(*) FROM class_students WHERE class_id = classes.id) as students FROM classes WHERE name ILIKE '%test%' AND name ILIKE '%class%' ORDER BY name LIMIT 10;
Result: 3 matches (TEST-CLASS, Test Class 2024, Testing-Class-Fall)
Response: "I found 3 classes matching 'test class': 1. TEST-CLASS (2 students), 2. Test Class 2024 (15 students), 3. Testing-Class-Fall (8 students). Which one?"

EXAMPLE: Courses (No Matches - Show All)
User: "show me blockchain courses"
Query 1: SELECT * FROM courses WHERE title ILIKE '%blockchain%' LIMIT 10;
Result: 0 matches
Query 2: SELECT id, title, code, status FROM courses WHERE status = 'Published' ORDER BY title LIMIT 50;
Response: "I couldn't find any courses matching 'blockchain'. Here are all published courses: [table]"

EXAMPLE: Students (Multiple Matches)
User: "find student john"
Query: SELECT id, first_name, last_name, email FROM profiles WHERE (first_name ILIKE '%john%' OR last_name ILIKE '%john%' OR email ILIKE '%john%') AND role = 'student' LIMIT 10;
Result: 3 matches
Response: "I found 3 students matching 'john': 1. John Smith, 2. John Doe, 3. Johnson Lee. Which one?"

🚨 MANDATORY RULES - APPLY TO EVERY QUERY:
1. NEVER use WHERE name = 'exact' - ALWAYS use ILIKE '%partial%'
2. ALWAYS search multiple fields (name, title, code, email)
3. When 0 matches: AUTOMATICALLY run second query to show ALL entities (LIMIT 50)
4. When 2+ matches: ASK user to choose (show 10 max)
5. When 1 match: CONFIRM which one, then proceed
6. NEVER silently fail with "not found"
7. ALWAYS make interaction helpful and conversational

THIS APPLIES TO: classes, courses, students, teachers, assignments, quizzes, stages, exercises, and ALL other entities!

📄 PAGINATION GUIDELINES - CRITICAL FOR TOKEN MANAGEMENT

⚠️ MANDATORY: To prevent token overflow errors, ALWAYS paginate large result sets!

DEFAULT PAGINATION RULES:
- For list queries (SELECT * FROM...): ALWAYS add LIMIT 50
- For detailed queries with text fields: ALWAYS add LIMIT 20
- For queries returning user-generated content: ALWAYS add LIMIT 10
- Maximum LIMIT allowed: 100 (NEVER exceed this)
- Use ORDER BY with LIMIT for consistent results

WHEN TO APPLY PAGINATION (ALWAYS):
1. ✅ "list all students" → LIMIT 50
2. ✅ "show all courses" → LIMIT 50
3. ✅ "get all assignments" → LIMIT 20
4. ✅ "all submissions" → LIMIT 10
5. ✅ Any query without WHERE clause → LIMIT 50
6. ✅ Any query with JOIN → LIMIT 30
7. ❌ COUNT(*) queries → No limit needed (only returns count)
8. ❌ Single record queries (WHERE id = X) → No limit needed

TWO-STEP APPROACH FOR LARGE DATASETS:
Step 1: Get total count first
  SELECT COUNT(*) FROM table_name WHERE conditions;

Step 2: Get paginated results
  SELECT * FROM table_name WHERE conditions ORDER BY column LIMIT 50;

PAGINATION RESPONSE FORMAT (MANDATORY):
🚨 CRITICAL: When you use LIMIT in your query, you MUST ALWAYS add this message at the end of your response!

When returning paginated results, ALWAYS inform the user:

Example response format:
"Here are the [items]:

[Display table with results]

📄 Showing first 50 results.
💡 To see more results, ask: 'Show next 50 [items]' or 'Show [items] 51-100'"

⚠️ MANDATORY: If you used LIMIT 50, the pagination message MUST appear at the bottom!
⚠️ WITHOUT the pagination message, users cannot access remaining data!

TOKEN ESTIMATION GUIDELINES:
Estimate tokens before querying to choose appropriate LIMIT:
- Simple tables (profiles, courses): ~100 tokens/row → LIMIT 50
- Text-heavy tables (assignments, submissions): ~500 tokens/row → LIMIT 10
- Content tables (lessons, articles): ~800 tokens/row → LIMIT 5
- If estimated total > 10,000 tokens, reduce LIMIT by 50%

HANDLING PAGINATION REQUESTS:
User says: "Show next 50 students"
→ Extract offset: 50
→ Query: SELECT * FROM profiles WHERE role = 'student' ORDER BY created_at LIMIT 50 OFFSET 50
→ Response: "Showing results 51-100 of [TOTAL]"

User says: "Show students 101-150"
→ Calculate offset: 100
→ Query: SELECT * FROM profiles WHERE role = 'student' ORDER BY created_at LIMIT 50 OFFSET 100
→ Response: "Showing results 101-150 of [TOTAL]"

TIME-BASED AND DATE-FILTERED QUERIES:
⚠️ CRITICAL: Date filters DO NOT remove the need for pagination!
For queries with date filters (year, quarter, month, last N days), YOU MUST STILL APPLY PAGINATION!

🚨 MANDATORY PAGINATION RULES FOR TIME-BASED QUERIES:
1. ALWAYS add LIMIT 50 (or appropriate limit) even with date filters
2. ALWAYS add pagination message
3. ALWAYS inform user about pagination in response
4. NEVER assume date filter makes dataset small enough to skip pagination

PAGINATION EXAMPLES:

❌ BAD (No pagination):
SELECT * FROM profiles WHERE role = 'student';

✅ GOOD (With pagination):
-- Step 1: Get count
SELECT COUNT(*) FROM profiles WHERE role = 'student';
-- Step 2: Get paginated data
SELECT id, email, full_name, created_at FROM profiles WHERE role = 'student' ORDER BY created_at DESC LIMIT 50;

❌ BAD (No pagination):
SELECT * FROM courses;

✅ GOOD (With pagination):
SELECT COUNT(*) FROM courses;
SELECT id, title, status, created_at FROM courses ORDER BY created_at DESC LIMIT 50;

CRITICAL REMINDER:
- NEVER return more than 100 rows in a single query
- ALWAYS use LIMIT for SELECT * queries
- ALWAYS inform users about pagination in your response
- ALWAYS provide guidance for viewing more results
- If you forget pagination and get a token error, apologize and retry with LIMIT`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('🚀 IRIS Simple Chat request received');

    const { messages, context, stream }: { messages: ChatMessage[], context: IRISContext, stream?: boolean } = await req.json();

    // Validate required inputs
    if (!context?.userId) {
      throw new Error('User context with userId is required');
    }

    // Check if streaming is requested
    const useStreaming = stream === true;

    if (!messages || messages.length === 0) {
      throw new Error('Messages array is required');
    }

    console.log(`👤 Processing request for user: ${context.userId}, role: ${context.role}`);

    // Get the user's last message for logging
    const userMessage = messages[messages.length - 1];
    if (!userMessage || userMessage.role !== 'user') {
      throw new Error('Last message must be from user');
    }

    console.log(`💬 User query: "${userMessage.content}"`);
    console.log(`📝 Conversation history: ${messages.length} messages`);

    // Build conversation context with full message history
    let conversationContext = `${IRIS_SYSTEM_PROMPT}\n\nUser Context: Role=${context.role}, UserID=${context.userId}\n\n`;
    
    // Add conversation history (skip system messages, focus on user-assistant exchange)
    if (messages.length > 1) {
      conversationContext += "Previous Conversation:\n";
      messages.slice(0, -1).forEach((msg, index) => {
        if (msg.role === 'user') {
          conversationContext += `User: ${msg.content}\n`;
        } else if (msg.role === 'assistant') {
          conversationContext += `Assistant: ${msg.content}\n`;
        }
      });
      conversationContext += "\n";
    }
    
    conversationContext += `Current User Query: ${userMessage.content}`;

    // Check if streaming is requested
    if (useStreaming) {
      console.log('🌊 [IRIS-SIMPLE DEBUG] Streaming mode enabled - using SSE');
      console.log('🌊 [IRIS-SIMPLE DEBUG] Conversation context length:', conversationContext.length);
      console.log('🌊 [IRIS-SIMPLE DEBUG] Conversation context preview (first 500 chars):', conversationContext.substring(0, 500));
      console.log('🌊 [IRIS-SIMPLE DEBUG] Conversation context preview (last 300 chars):', conversationContext.substring(conversationContext.length - 300));

      // Call the streaming MCP OpenAI adapter
      const adapterUrl = `${SUPABASE_URL}/functions/v1/mcp-openai-adapter/invoke-stream`;

      console.log('🔧 [IRIS-SIMPLE DEBUG] Calling MCP OpenAI adapter (streaming)...');
      console.log('🔧 [IRIS-SIMPLE DEBUG] Adapter URL:', adapterUrl);
      console.log('🔧 [IRIS-SIMPLE DEBUG] Model: gpt-4o-mini, Temperature: 0.1');

      const adapterResponse = await fetch(adapterUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || '',
        },
        body: JSON.stringify({
          prompt: conversationContext,
          model: "gpt-4o-mini",
          temperature: 0.1
        })
      });

      console.log('📡 [IRIS-SIMPLE DEBUG] MCP Adapter response status:', adapterResponse.status);
      console.log('📡 [IRIS-SIMPLE DEBUG] Response headers:', Object.fromEntries(adapterResponse.headers.entries()));

      if (!adapterResponse.ok) {
        const errorText = await adapterResponse.text();
        console.error('❌ [IRIS-SIMPLE DEBUG] MCP Adapter error:', errorText);
        console.error('🔍 [IRIS-SIMPLE ERROR DEBUG] Streaming adapter error details:', {
          status: adapterResponse.status,
          statusText: adapterResponse.statusText,
          errorText: errorText,
          errorTextLength: errorText?.length || 0,
          timestamp: new Date().toISOString()
        });
        throw new Error(`MCP Adapter error (${adapterResponse.status}): ${errorText}`);
      }

      // Pass through the SSE stream
      console.log('✅ [IRIS-SIMPLE DEBUG] Passing through SSE stream to client');

      return new Response(adapterResponse.body, {
        headers: streamHeaders
      });
    }

    // Non-streaming path (original code)
    // Call the MCP OpenAI adapter
    const adapterUrl = `${SUPABASE_URL}/functions/v1/mcp-openai-adapter/invoke`;

    console.log('🔧 Calling MCP OpenAI adapter with full conversation context...');

    const adapterResponse = await fetch(adapterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        prompt: conversationContext,
        model: "gpt-4o-mini",
        temperature: 0.1
      })
    });

    if (!adapterResponse.ok) {
      const errorText = await adapterResponse.text();
      console.error('🔍 [IRIS-SIMPLE ERROR DEBUG] Non-streaming adapter error:', {
        status: adapterResponse.status,
        statusText: adapterResponse.statusText,
        errorText: errorText,
        errorTextLength: errorText?.length || 0,
        timestamp: new Date().toISOString()
      });
      throw new Error(`MCP Adapter error (${adapterResponse.status}): ${errorText}`);
    }

    const adapterResult = await adapterResponse.json();

    if (!adapterResult.ok) {
      console.error('🔍 [IRIS-SIMPLE ERROR DEBUG] Adapter result not ok:', {
        error: adapterResult.error,
        fullResult: JSON.stringify(adapterResult),
        timestamp: new Date().toISOString()
      });
      throw new Error(`MCP Adapter failed: ${adapterResult.error}`);
    }

    console.log('✅ MCP Adapter response received');
    console.log(`🛠️ Tools used: ${adapterResult.toolInvocations?.length || 0}`);

    // Create assistant response
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: adapterResult.response || 'I apologize, but I was unable to process your request.'
    };

    // Log the interaction
    try {
      await supabase
        .from('iris_chat_logs')
        .insert({
          user_id: context.userId,
          user_role: context.role,
          query: userMessage.content,
          response: assistantMessage.content,
          tools_used: adapterResult.toolInvocations?.map((t: any) => t.tool) || [],
          tokens_used: adapterResult.metadata?.totalTokensEstimate || 0,
          success: true,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.warn('Failed to log interaction:', logError);
    }

    console.log('✅ IRIS response generated successfully');

    // Return the response
    return new Response(JSON.stringify({
      success: true,
      message: assistantMessage,
      toolsUsed: adapterResult.toolInvocations?.map((t: any) => t.tool) || [],
      tokensUsed: adapterResult.metadata?.totalTokensEstimate || 0,
      iterations: adapterResult.iterations || 1
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error: any) {
    console.error('❌ IRIS Simple Chat Error:', error);
    console.error('🔍 [IRIS-SIMPLE ERROR DEBUG] Main catch block error:', {
      errorMessage: error?.message || 'Unknown error',
      errorName: error?.name || 'N/A',
      errorStack: error?.stack || 'N/A',
      timestamp: new Date().toISOString(),
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    });

    // Check for token overflow error
    const errorMessage = error.message || '';
    let userFriendlyMessage = `I apologize, but I encountered an error while processing your request: ${errorMessage}`;
    
    // Check for different types of token/rate limit errors
    if (errorMessage.includes('maximum context length') || 
        errorMessage.includes('128000 tokens') ||
        errorMessage.includes('185403 tokens')) {
      // This is a conversation length issue
      userFriendlyMessage = `📊 **Conversation Too Long**

Our conversation has become too lengthy for me to process effectively. This happens when we've exchanged many messages or discussed complex topics with lots of data.

**What you can do:**
- **Start a new conversation** by refreshing the page
- **Ask a shorter, more specific question** 
- **Break complex requests into smaller parts**

**Why this happens:**
- Each conversation builds up context from previous messages
- Large data responses add to this context
- There's a limit to how much I can remember at once

**Tip:** For the best experience, start fresh conversations for new topics or when you notice responses getting slower.`;
    } else if (errorMessage.includes('429') || 
               errorMessage.includes('Request too large') ||
               errorMessage.includes('TPM') ||
               errorMessage.includes('tokens per min') ||
               (errorMessage.includes('tokens') && errorMessage.includes('exceeded'))) {
      // This is a rate limiting or request size issue
      userFriendlyMessage = `⚡ **Request Processing Issue**

I'm having trouble processing your request right now. This could be due to system load or the complexity of your query.

**What you can do:**
- **Ask a simpler, more specific question**
- **Break complex requests into smaller parts**

**Why this happens:**
- The system has limits on how much data can be processed at once
- Your question might require analyzing a lot of information
- There may be temporary high usage on the AI service

**Tip:** Try asking for specific information rather than broad queries (e.g., "How many students?" instead of "Tell me about all platform data").`;
    }
    
    return new Response(JSON.stringify({
      success: false,
      message: {
        role: 'assistant',
        content: userFriendlyMessage
      },
      error: error.message
    }), {
      status: 200, // Return 200 so frontend can handle gracefully
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
