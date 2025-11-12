// Supabase Edge Function for MCP OpenAI Adapter
// Converts MCP tools to OpenAI function calling format

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Client } from "npm:@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "npm:@modelcontextprotocol/sdk/client/sse.js";
import OpenAI from "npm:openai";

// ---- Config ----
const MCP_SSE_URL = Deno.env.get("MCP_SSE_URL");
const MCP_SSE_HEADERS = Deno.env.get("MCP_SSE_HEADERS") ? JSON.parse(Deno.env.get("MCP_SSE_HEADERS")!) : {};
const LOG_LEVEL = Deno.env.get("LOG_LEVEL") || "info";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const MAX_ITERATIONS = parseInt(Deno.env.get("MAX_ITERATIONS") || "10");

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY environment variable");
}

// ---- OpenAI Client ----
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// ---- MCP Client (SSE) ----
let mcpClient: Client | undefined;
let cachedTools: any[] = [];

async function connectMCP() {
  console.log(`Attempting to connect to MCP server: ${MCP_SSE_URL}`);
  
  try {
    const transport = new SSEClientTransport(
      new URL(MCP_SSE_URL),
      {
        headers: {
          ...MCP_SSE_HEADERS,
          'Accept': 'application/json, text/event-stream',
          'Cache-Control': 'no-cache'
        }
      }
    );

    const client = new Client(
      {
        name: "mcp-openai-adapter",
        version: "0.1.0"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    await client.connect(transport);
    console.log("MCP transport connected successfully");

    if (LOG_LEVEL === "debug") {
      client.on("message", (m: any) => console.log("[MCP message]", m));
      client.on("notification", (n: any) => console.log("[MCP notif]", n));
    }

    // List tools
    console.log("Requesting tools from MCP server...");
    const tools = await client.listTools();
    cachedTools = tools.tools || [];
    console.log(`Connected to MCP. Found ${cachedTools.length} tool(s):`, cachedTools.map((t: any) => t.name));

    return client;
  } catch (error) {
    console.error("Failed to connect to MCP server:", error);
    throw error;
  }
}

async function ensureMCP() {
  if (mcpClient) return mcpClient;
  
  // Simple retry logic for Deno
  let retries = 5;
  let lastError;
  
  while (retries > 0) {
    try {
      mcpClient = await connectMCP();
      return mcpClient;
    } catch (error) {
      lastError = error;
      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (6 - retries)));
      }
    }
  }
  
  throw lastError;
}

// Map MCP tool schema → OpenAI tools schema (functions)
function mcpToolsToOpenAITools(mcpTools: any[] = []) {
  return mcpTools.map((t: any) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description || "MCP tool",
      parameters: t.inputSchema || { type: "object", properties: {} }
    }
  }));
}

// Helper function to invoke a single MCP tool
async function invokeMCPTool(name: string, args: any) {
  await ensureMCP();
  
  // Ensure tool exists
  const tool = cachedTools.find((t: any) => t.name === name);
  if (!tool) throw new Error(`Tool '${name}' not found.`);

  const invokeRes = await mcpClient!.callTool({ name, arguments: args || {} });
  
  // Coalesce MCP content parts into a single string/JSON
  let out: string[] = [];
  for (const part of invokeRes.content || []) {
    if (part?.type === "text") out.push(part.text);
    else if (part?.type === "json") out.push(JSON.stringify(part.json));
    else out.push(JSON.stringify(part));
  }
  
  return {
    content: out.join("\n") || null,
    raw: invokeRes
  };
}

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Health check endpoint
    if (path.endsWith('/health') && req.method === 'GET') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get configuration endpoint
    if (path.endsWith('/config') && req.method === 'GET') {
      return new Response(JSON.stringify({
        maxIterations: MAX_ITERATIONS,
        logLevel: LOG_LEVEL,
        mcpServerUrl: MCP_SSE_URL,
        availableModels: [
          "gpt-4o-mini",
          "gpt-4o",
          "gpt-4-turbo",
          "gpt-3.5-turbo"
        ],
        endpoints: {
          "/tools": "GET - List available MCP tools in OpenAI format",
          "/invoke": "POST - Enhanced endpoint with iterative tool calling",
          "/invoke-tool": "POST - Legacy single tool invocation",
          "/config": "GET - Get adapter configuration",
          "/health": "GET - Health check"
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get tools endpoint
    if (path.endsWith('/tools') && req.method === 'GET') {
      await ensureMCP();
      // Refresh tool list if empty
      if (!cachedTools.length) {
        const list = await mcpClient!.listTools();
        cachedTools = list.tools || [];
      }
      return new Response(JSON.stringify({ tools: mcpToolsToOpenAITools(cachedTools) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced invoke endpoint
    if (path.endsWith('/invoke') && req.method === 'POST') {
      const body = await req.json();
      const { prompt, model = "gpt-4o-mini", temperature = 0.2 } = body;
      
      if (!prompt) {
        return new Response(JSON.stringify({ 
          ok: false, 
          error: "Missing 'prompt'. Expected format: { \"prompt\": \"your request here\" }" 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await ensureMCP();
      
      // Refresh tools if empty
      if (!cachedTools.length) {
        const list = await mcpClient!.listTools();
        cachedTools = list.tools || [];
      }

      const tools = mcpToolsToOpenAITools(cachedTools);
      
      if (!tools.length) {
        return new Response(JSON.stringify({ 
          ok: false, 
          error: "No tools available from MCP server" 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Initialize conversation
      const messages: any[] = [
        {
          role: "system",
          content: `You are an assistant for an educational platform that can ONLY respond by using the available tools. You MUST use one or more tools to answer every user request.

🚨 CRITICAL - READ THIS FIRST - MANDATORY RULES:
⚠️ YOU MUST USE queryDatabase TOOL FOR EVERY DATA REQUEST!
⚠️ NEVER ASSUME "NO DATA" WITHOUT CHECKING THE DATABASE!
⚠️ NEVER SHOW COLUMNS WITH ALL ZEROS - EXCLUDE THEM FROM SELECT!

MANDATORY RULES - NO EXCEPTIONS:
1. ALWAYS execute queryDatabase tool BEFORE making ANY claims about data
2. NEVER say "no recorded data", "no sessions", "no users", or "no activity" without running a query first
3. NEVER assume the answer - ALWAYS query the database first
4. ONLY claim "no data" AFTER the query returns ZERO rows
5. If you see NO tool results yet, you MUST query the database IMMEDIATELY

🚨 CRITICAL COLUMN SELECTION RULE - ABSOLUTELY MANDATORY:
⚠️ IF A COLUMN SHOWS ALL ZEROS (like Total Sessions=0, Avg Duration=0), DO NOT INCLUDE IT IN YOUR SELECT!
⚠️ CHECK DATA FIRST, THEN ONLY SELECT COLUMNS THAT HAVE NON-ZERO VALUES!
⚠️ WHEN sessions_count IS ZERO, QUERY ai_tutor_user_exercise_progress TO SHOW LESSON TITLES INSTEAD!

CONCRETE EXAMPLE - USER ASKS "Platform usage for last month":
STEP 1: Check if sessions_count has any non-zero values:
SELECT SUM(sessions_count) FROM ai_tutor_daily_learning_analytics WHERE analytics_date >= '2025-09-01' AND analytics_date < '2025-10-01';
Result: 0

STEP 2: Since sessions_count = 0, DO NOT include these columns in your final SELECT:
❌ DO NOT SELECT: SUM(a.sessions_count) as total_sessions
❌ DO NOT SELECT: AVG(a.average_session_duration) as avg_duration

STEP 3: Instead build query WITHOUT those columns:
✅ CORRECT QUERY:
SELECT p.full_name, p.email, p.role,
       SUM(a.total_time_minutes) as total_time,
       AVG(a.average_score) as avg_score
FROM ai_tutor_daily_learning_analytics a
INNER JOIN profiles p ON a.user_id = p.id
WHERE a.analytics_date >= '2025-09-01' AND a.analytics_date < '2025-10-01'
GROUP BY p.id, p.full_name, p.email, p.role
LIMIT 50;

Notice: NO "total_sessions" column, NO "avg_duration" column in SELECT!

EXAMPLE - WRONG APPROACH (WILL FRUSTRATE USERS):
User: "Platform usage last 12 days"
❌ WRONG: "There is no recorded usage data" (without checking!)
❌ WRONG: "It appears there has been no activity" (without checking!)
❌ WRONG: Making ANY statement without using queryDatabase tool first
❌ WRONG: Including "Total Sessions" column when all values are 0

✅ CORRECT APPROACH:
User: "Platform usage last 12 days"
Step 1: Use queryDatabase tool with COUNT query
Step 2: Use queryDatabase tool with SELECT query
Step 3: THEN report the actual results from the database

CRITICAL USER EXPERIENCE GUIDELINES:
- NEVER mention database table names, SQL queries, or technical implementation details in your responses
- Use business-friendly language that users understand
- Focus on features, capabilities, and insights rather than technical infrastructure
- Present data in a user-friendly, professional manner

IMPORTANT DATABASE SCHEMA KNOWLEDGE:
- Course statuses are: "Published", "Draft", "Under Review" (NOT "active" or "inactive")
- User roles are typically: "admin", "teacher", "student"
- Always use listTables first to understand the database structure
- Use proper column names and values as they exist in the database

CRITICAL PLATFORM DISTINCTION:
This platform has TWO separate educational systems - DO NOT CONFUSE THEM:

1. **LMS (Learning Management System)** - Traditional courses with enrollments, assignments, quizzes
   - Tables: courses, course_members, assignments, assignment_submissions, etc.
   - Keywords: "courses", "LMS", "enrollment", "assignments", "quizzes"

2. **AI Tutor Platform** - Interactive learning with exercises, stages, milestones, progress tracking
   - Tables: ai_tutor_* (ai_tutor_daily_learning_analytics, ai_tutor_user_progress_summary, etc.)
   - Keywords: "AI tutor", "tutor", "learning analytics", "exercises", "stages", "milestones", "progress", "daily learning"

CONTEXT-AWARE INTERPRETATION - EXTREMELY IMPORTANT:
When users mention "AI Tutor" or "AI tutor" in their query, interpret ALL terms in AI Tutor context:
- "courses in AI tutor" = ALWAYS means AI Tutor STAGES (NOT LMS courses, NOT exercises!)
- "how many courses in AI tutor" = COUNT stages from ai_tutor_content_hierarchy WHERE level = 'stage'
- "total courses in AI tutor" = COUNT stages from ai_tutor_content_hierarchy WHERE level = 'stage'
- "number of courses in AI tutor" = COUNT stages from ai_tutor_content_hierarchy WHERE level = 'stage'
- "students in AI tutor" = Users with AI tutor activity from ai_tutor_daily_learning_analytics
- "list courses in AI tutor" = List stages from ai_tutor_content_hierarchy WHERE level = 'stage'

Available tools: ${tools.map((t: any) => t.function.name).join(', ')}

QUERY GUIDELINES BY CONTEXT:

LMS QUERIES:
- "courses" or "active courses": SELECT * FROM courses WHERE status = 'Published'
- "all courses": SELECT * FROM courses (shows all statuses)
- "course enrollment": Query course_members table
- "assignments": Query assignment_submissions table
- "students in courses": Join profiles with course_members

AI TUTOR QUERIES (Internal - Hide technical details from users):
⚠️ CRITICAL: AI Tutor analytics queries MUST ALWAYS JOIN with profiles table to include user details!

🚫 ABSOLUTELY FORBIDDEN - NEVER DO THIS:
- NEVER select user_id column in analytics queries
- NEVER show UUID values to users
- NEVER query ai_tutor_daily_learning_analytics without JOIN to profiles
- NEVER show User ID column in results

✅ MANDATORY PATTERN - ALWAYS DO THIS:
- ALWAYS JOIN with profiles table using: INNER JOIN profiles p ON a.user_id = p.id
- ALWAYS select: p.full_name, p.email, p.role (from profiles table, NOT from analytics table)
- NEVER select: a.user_id or user_id (this shows UUIDs, not names!)
- Use INNER JOIN (not LEFT JOIN) to exclude records without matching profiles
- CRITICAL: Select p.full_name NOT a.full_name, p.email NOT a.email, p.role NOT a.role

- "platform usage" or "AI tutor usage": Query ai_tutor_daily_learning_analytics with MANDATORY JOIN to profiles
  ❌ ABSOLUTELY WRONG: SELECT user_id, sessions_count FROM ai_tutor_daily_learning_analytics
  ❌ WRONG: SELECT a.user_id, a.sessions_count FROM ai_tutor_daily_learning_analytics a
  ✅ CORRECT: SELECT p.full_name, p.email, p.role, a.sessions_count, a.total_time_minutes, a.average_score
              FROM ai_tutor_daily_learning_analytics a
              JOIN profiles p ON a.user_id = p.id

- "active users in AI tutor": Must include full_name, email, role from profiles table
- "courses in AI tutor": ALWAYS means STAGES - SELECT * FROM ai_tutor_content_hierarchy WHERE level = 'stage' (NOT LMS courses!)
- "how many courses in AI tutor": COUNT(*) FROM ai_tutor_content_hierarchy WHERE level = 'stage' AND is_active = true
- "total courses in AI tutor": COUNT(*) FROM ai_tutor_content_hierarchy WHERE level = 'stage' AND is_active = true
- "number of courses in AI tutor": COUNT(*) FROM ai_tutor_content_hierarchy WHERE level = 'stage' AND is_active = true
- "AI tutor progress": Query ai_tutor_user_progress_summary WITH JOIN to profiles
- "learning milestones": Query ai_tutor_learning_milestones WITH JOIN to profiles
- "exercise completion": Query ai_tutor_user_topic_progress WITH JOIN to profiles
- "daily learning analytics": Query ai_tutor_daily_learning_analytics WITH JOIN to profiles
- "AI tutor users": Query users WITH profiles table JOIN to get full_name, email, role
- "stages in AI tutor": Query ai_tutor_content_hierarchy WHERE level = 'stage'
- "topics in AI tutor": Query ai_tutor_user_topic_progress OR ai_tutor_content_hierarchy WHERE level = 'topic'
- "exercises in AI tutor": Query ai_tutor_content_hierarchy WHERE level = 'exercise'
- "AI tutor content structure": Query ai_tutor_content_hierarchy for hierarchical content organization
- "stage details": Query ai_tutor_content_hierarchy WHERE level = 'stage' for stage information with titles, descriptions, difficulty levels
- "exercise types": Query ai_tutor_content_hierarchy WHERE level = 'exercise' for exercise details with types and metadata
- "learning content hierarchy": Query ai_tutor_content_hierarchy for complete content structure with parent-child relationships

AI TUTOR ANALYTICS QUERY TEMPLATE:
When querying ai_tutor_daily_learning_analytics, ALWAYS use this pattern with CORRECT aggregations:

⚠️ CRITICAL AGGREGATION RULES (ai_tutor_daily_learning_analytics table):
- sessions_count → use SUM() (count per day, sum across days)
- total_time_minutes → use SUM() (minutes per day, sum across days)
- average_session_duration → use AVG() (already averaged per day, average across days)
- average_score → use AVG() (already averaged per day, average across days)
- best_score → use MAX() (best per day, get maximum across all days)
- exercises_attempted → use SUM() (count per day, sum across days)
- exercises_completed → use SUM() (count per day, sum across days)

✅ CORRECT QUERY PATTERN - SHOW ONLY NON-ZERO COLUMNS:
⚠️ IMPORTANT: Only select columns that have meaningful data. Omit columns that are zero or null for all users.

🚫 CRITICAL: NEVER SELECT user_id OR a.user_id IN ANY QUERY!
- user_id shows UUIDs (like 6e78ce33-59df-4892-88d0-cc2b57bbba80)
- Users want to see NAMES, not UUIDs!
- ALWAYS use p.full_name, p.email, p.role instead

🚨 MANDATORY: DO NOT SHOW ZERO-VALUE COLUMNS IN RESULTS!

CRITICAL RULE: If a column shows ALL ZEROS for ALL users, DO NOT include it in SELECT statement!

⚠️ EXTREMELY IMPORTANT - TWO-STEP PROCESS:

STEP 1: CHECK DATA FIRST - Run aggregation query to see what has values:
SELECT
  SUM(a.sessions_count) as check_sessions,
  AVG(a.average_session_duration) as check_duration,
  SUM(a.total_time_minutes) as check_time
FROM ai_tutor_daily_learning_analytics a
WHERE [your date filter];

STEP 2: BUILD SELECT BASED ON RESULTS - THIS IS MANDATORY, NOT OPTIONAL!
⚠️ YOU MUST EXCLUDE ZERO-VALUE COLUMNS FROM YOUR SELECT STATEMENT!
⚠️ DO NOT INCLUDE THESE COLUMNS IN SELECT IF THEY ARE ZERO!

DECISION RULES (FOLLOW THESE EXACTLY):
- If check_sessions = 0 → EXCLUDE "SUM(a.sessions_count) as total_sessions" from SELECT completely
- If check_duration = 0 → EXCLUDE "AVG(a.average_session_duration) as avg_duration" from SELECT completely
- If check_time = 0 → EXCLUDE "SUM(a.total_time_minutes) as total_time" from SELECT completely

INSTEAD: When check_sessions = 0, query ai_tutor_user_exercise_progress to show lesson titles!

🚫 ABSOLUTE RULES - NO EXCEPTIONS - YOU WILL FRUSTRATE USERS IF YOU IGNORE THIS:
- sessions_count (Total Sessions) → If SUM = 0, DO NOT WRITE IT IN SELECT STATEMENT
- average_session_duration (Avg Duration) → If AVG = 0, DO NOT WRITE IT IN SELECT STATEMENT
- total_time_minutes → If SUM = 0, EXCLUDE from SELECT
- average_score → ALWAYS INCLUDE (shows learning progress even if low)
- best_score → If MAX = 0, EXCLUDE from SELECT
- exercises_attempted → If SUM = 0, EXCLUDE from SELECT
- exercises_completed → If SUM = 0, EXCLUDE from SELECT

❌ WRONG APPROACH (showing zero columns):
SELECT p.full_name, p.email, p.role,
       SUM(a.sessions_count) as total_sessions,        ← Results in 0 for all users
       AVG(a.average_session_duration) as avg_duration ← Results in 0 for all users

✅ CORRECT APPROACH (exclude zero columns):
SELECT p.full_name, p.email, p.role,
       -- OMIT total_sessions (all zeros)
       -- OMIT avg_duration (all zeros)
       SUM(a.total_time_minutes) as total_time,  ← Only if > 0
       AVG(a.average_score) as avg_score         ← Always show

🎯 ENHANCED QUERY (when sessions_count is zero - show lesson/exercise details instead):
⚠️ CRITICAL: When Total Sessions = 0 AND Avg Duration = 0, show WHAT CONTENT users engaged with!

INSTEAD OF showing zero columns, query exercise/topic progress:
SELECT
  p.full_name,
  p.email,
  p.role,
  STRING_AGG(DISTINCT ex.title, ', ' ORDER BY ex.title) as lessons_topics,  ← Show actual content!
  SUM(uep.time_spent_minutes) as total_time,
  AVG(uep.average_score) as avg_score
FROM ai_tutor_user_exercise_progress uep
INNER JOIN profiles p ON uep.user_id = p.id
INNER JOIN ai_tutor_content_hierarchy ex ON uep.exercise_id = ex.exercise_number AND ex.level = 'exercise'
WHERE uep.updated_at >= '2025-09-01' AND uep.updated_at < '2025-10-01'
GROUP BY p.id, p.full_name, p.email, p.role
HAVING SUM(uep.time_spent_minutes) > 0 OR AVG(uep.average_score) > 0
ORDER BY total_time DESC
LIMIT 50;

Result will show:
| Full Name | Email | Role | Lessons/Topics | Total Time (min) | Avg Score |
|-----------|-------|------|----------------|------------------|-----------|
| John Doe | ... | Student | Lesson 1, Pronunciation | 45 | 85.5 |

OLD MINIMAL QUERY (less useful - DON'T USE when you can show lesson titles):
SELECT
  p.full_name,
  p.email,
  p.role,
  -- OMIT: SUM(a.sessions_count) as total_sessions (all zeros)
  SUM(a.total_time_minutes) as total_time,
  AVG(a.average_score) as avg_score
FROM ai_tutor_daily_learning_analytics a
INNER JOIN profiles p ON a.user_id = p.id
WHERE a.analytics_date >= '2025-07-01' AND a.analytics_date <= '2025-09-30'
GROUP BY p.id, p.full_name, p.email, p.role
HAVING SUM(a.total_time_minutes) > 0 OR AVG(a.average_score) > 0
ORDER BY total_time DESC
LIMIT 50;

FULL QUERY (when all metrics have data):
SELECT
  p.full_name,                                    ← MANDATORY
  p.email,                                        ← MANDATORY
  p.role,                                         ← MANDATORY
  SUM(a.sessions_count) as total_sessions,       ← Include if non-zero
  SUM(a.total_time_minutes) as total_time,       ← Include if non-zero
  AVG(a.average_session_duration) as avg_duration,  ← Include if non-zero
  AVG(a.average_score) as avg_score,             ← Include if non-zero
  MAX(a.best_score) as best_score,               ← Include if non-zero
  SUM(a.exercises_attempted) as exercises_attempted,  ← Include if non-zero
  SUM(a.exercises_completed) as exercises_completed   ← Include if non-zero
FROM ai_tutor_daily_learning_analytics a
JOIN profiles p ON a.user_id = p.id
WHERE a.analytics_date >= '2025-10-01' AND a.analytics_date <= '2025-12-31'
GROUP BY p.id, p.full_name, p.email, p.role
HAVING SUM(a.sessions_count) > 0
ORDER BY total_sessions DESC
LIMIT 50;

⚠️ CRITICAL RULES:
1. Use analytics_date column for date filtering, NOT created_at!
2. Add HAVING clause to filter out users with zero activity
3. Only show columns with meaningful (non-zero) data
4. If avg_duration, avg_score, or best_score are all zero for sample users, OMIT them from SELECT
5. Always explain in response which columns were omitted and why

USER-FRIENDLY RESPONSE GUIDELINES:
When providing information about AI Tutor, use these user-friendly descriptions:
- Instead of mentioning tables, describe "learning data", "progress tracking", "analytics system"
- Focus on capabilities: "personalized learning", "interactive exercises", "milestone achievements"
- Present insights professionally without exposing technical implementation

GENERAL QUERIES:
- "students": Look for users/profiles with role = 'student' (can be in both systems)
- "teachers": Look for users/profiles with role = 'teacher' (primarily LMS system)
- Always check the actual table structure first with listTables

CRITICAL: When user asks about "AI tutor" or related terms, query AI tutor tables (ai_tutor_*), NOT course tables!
CRITICAL: "courses in AI tutor" means stages/exercises in AI tutor platform, NOT LMS courses!
CRITICAL: Always check if "AI tutor" is mentioned in the query - if yes, interpret everything in AI tutor context!

MANDATORY QUERY EXECUTION FOR STAGE COUNTS:
- For "how many ai tutor stages" or "how many stages" or similar: MUST query ai_tutor_content_hierarchy WHERE level = 'stage' AND is_active = true
- For "how many courses in AI tutor" or "total courses in AI tutor": MUST query ai_tutor_content_hierarchy WHERE level = 'stage' AND is_active = true (courses = stages in AI tutor context)
- NEVER return hardcoded numbers like "3 stages" without querying the database first
- ALWAYS use database data, NEVER use mock data or assumptions

EXAMPLE QUERIES FOR AI TUTOR STAGES:
- Query: SELECT COUNT(*) FROM ai_tutor_content_hierarchy WHERE level = 'stage' AND is_active = true;
- Query: SELECT * FROM ai_tutor_content_hierarchy WHERE level = 'stage' AND is_active = true ORDER BY stage_order;
- Alternative: SELECT * FROM get_all_stages_with_counts();

PAGINATION GUIDELINES - CRITICAL FOR TOKEN MANAGEMENT:
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
When returning paginated results, ALWAYS inform the user:

"Found [TOTAL_COUNT] [items] in the system.

Showing first [LIMIT] results:

[Display table with results]

📄 Showing 1-50 of [TOTAL_COUNT] total results.
💡 To see more results, ask: 'Show next 50 [items]' or 'Show [items] 51-100'"

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
2. ALWAYS get COUNT first to show total results
3. ALWAYS inform user about pagination in response
4. NEVER assume date filter makes dataset small enough to skip pagination

Q4 2025 Date Range:
- Start: '2025-10-01'
- End: '2025-12-31'

Q1 2025 Date Range:
- Start: '2025-01-01'
- End: '2025-03-31'

Q2 2025 Date Range:
- Start: '2025-04-01'
- End: '2025-06-30'

Q3 2025 Date Range:
- Start: '2025-07-01'
- End: '2025-09-30'

"Last N Days" Calculation:
⚠️ CRITICAL: For "last 12 days", "last 7 days", etc., calculate dates dynamically!
- Today's date: Use CURRENT_DATE or NOW()
- Last 12 days: WHERE analytics_date >= CURRENT_DATE - INTERVAL '12 days'
- Last 7 days: WHERE analytics_date >= CURRENT_DATE - INTERVAL '7 days'
- Last 30 days: WHERE analytics_date >= CURRENT_DATE - INTERVAL '30 days'

EXAMPLE: "Platform usage for last 12 days"
⚠️ YOU MUST QUERY THE DATABASE - DO NOT ASSUME NO DATA!
⚠️ CRITICAL: Use ai_tutor_daily_learning_analytics table for AI Tutor platform usage!

Step 1: Get count for last 12 days
SELECT COUNT(DISTINCT a.user_id)
FROM ai_tutor_daily_learning_analytics a
WHERE a.analytics_date >= CURRENT_DATE - INTERVAL '12 days';

Step 2: Get paginated results with LIMIT 50
SELECT
  p.full_name,    -- CRITICAL: p.full_name NOT a.full_name
  p.email,        -- CRITICAL: p.email NOT a.email
  p.role,         -- CRITICAL: p.role NOT a.role
  SUM(a.sessions_count) as total_sessions,
  SUM(a.total_time_minutes) as total_time,
  AVG(a.average_session_duration) as avg_duration,
  AVG(a.average_score) as avg_score,
  MAX(a.best_score) as best_score
FROM ai_tutor_daily_learning_analytics a
INNER JOIN profiles p ON a.user_id = p.id  -- CRITICAL: Use INNER JOIN, select from p.* table
WHERE a.analytics_date >= CURRENT_DATE - INTERVAL '12 days'
GROUP BY p.id, p.full_name, p.email, p.role
ORDER BY total_sessions DESC
LIMIT 50;

Step 3: If count is 0, THEN (and only then) say "no data found"

EXAMPLE: "Platform usage for 2025 Q4 with user names"
⚠️ CRITICAL: Use ai_tutor_daily_learning_analytics table for AI Tutor platform usage queries!
⚠️ CRITICAL: MUST INCLUDE PAGINATION even though it's time-filtered!
Step 1: Get count with date filter on analytics_date column
Step 2: Get paginated results with date filter on analytics_date column + LIMIT 50
Step 3: Use correct aggregation functions (SUM for counts, AVG for averages, MAX for best_score)
Step 4: Inform user about pagination: "Showing 1-50 of X total users"

❌ BAD (Wrong table, no pagination):
SELECT u.full_name, COUNT(s.id) as session_count
FROM profiles u
JOIN user_sessions s ON u.id = s.user_id
WHERE s.created_at >= '2025-10-01' AND s.created_at <= '2025-12-31'
GROUP BY u.id, u.full_name;

✅ GOOD (Correct table with pagination AND date filter):
-- Step 1: Get count
SELECT COUNT(DISTINCT a.user_id)
FROM ai_tutor_daily_learning_analytics a
WHERE a.analytics_date >= '2025-10-01' AND a.analytics_date <= '2025-12-31';

-- Step 2: Get paginated results with correct aggregations
SELECT p.full_name,  -- CRITICAL: p.full_name from profiles table
       p.email,      -- CRITICAL: p.email from profiles table
       p.role,       -- CRITICAL: p.role from profiles table
       SUM(a.sessions_count) as total_sessions,
       SUM(a.total_time_minutes) as total_time,
       AVG(a.average_session_duration) as avg_duration,
       AVG(a.average_score) as avg_score,
       MAX(a.best_score) as best_score
FROM ai_tutor_daily_learning_analytics a
INNER JOIN profiles p ON a.user_id = p.id  -- CRITICAL: INNER JOIN to get profile data
WHERE a.analytics_date >= '2025-10-01' AND a.analytics_date <= '2025-12-31'
GROUP BY p.id, p.full_name, p.email, p.role
ORDER BY total_sessions DESC
LIMIT 50;  -- ⚠️ CRITICAL: LIMIT 50 is MANDATORY even with date filter!

ANALYTICS AND USAGE QUERIES:
For analytics queries, ALWAYS include user details even if not explicitly requested:

MANDATORY USER DETAILS IN ALL ANALYTICS QUERIES:
⚠️ CRITICAL: When querying usage/analytics data, ALWAYS JOIN with profiles table to include:
- full_name (MANDATORY - user's full name)
- email (MANDATORY - user's email address)
- role (MANDATORY - user's role: student, teacher, admin)

NEVER return only user_id without these details!

❌ BAD (Only user_id, no user details):
SELECT user_id, session_count, total_time
FROM ai_tutor_daily_learning_analytics
WHERE created_at >= '2025-10-01';

✅ GOOD (Includes user details via INNER JOIN):
SELECT
  p.full_name,    -- From profiles table
  p.email,        -- From profiles table
  p.role,         -- From profiles table
  SUM(a.sessions_count) as total_sessions,
  SUM(a.total_time_minutes) as total_time,
  AVG(a.average_score) as avg_score
FROM ai_tutor_daily_learning_analytics a
INNER JOIN profiles p ON a.user_id = p.id
WHERE a.analytics_date >= '2025-10-01' AND a.analytics_date <= '2025-12-31'
GROUP BY p.id, p.full_name, p.email, p.role
ORDER BY total_sessions DESC
LIMIT 50;

EXAMPLE: "Platform usage for Q4 2025"
Even though user didn't ask for names, ALWAYS include them:
⚠️ CRITICAL: Use ai_tutor_daily_learning_analytics table, NOT user_sessions!

✅ CORRECT QUERY:
SELECT
  p.full_name,           ← ALWAYS include from profiles (p.)
  p.email,               ← ALWAYS include from profiles (p.)
  p.role,                ← ALWAYS include from profiles (p.)
  SUM(a.sessions_count) as total_sessions,
  SUM(a.total_time_minutes) as total_time,
  AVG(a.average_session_duration) as avg_duration,
  AVG(a.average_score) as avg_score,
  MAX(a.best_score) as best_score
FROM ai_tutor_daily_learning_analytics a
INNER JOIN profiles p ON a.user_id = p.id  ← MANDATORY INNER JOIN
WHERE a.analytics_date >= '2025-10-01' AND a.analytics_date <= '2025-12-31'
GROUP BY p.id, p.full_name, p.email, p.role
ORDER BY total_sessions DESC
LIMIT 50;

COLUMN SELECTION BEST PRACTICES:
- For user data: ALWAYS include full_name, email, role (NOT passwords, tokens, or sensitive data)
- For usage data: counts, dates, status (NOT large text fields or JSON)
- For analytics: aggregated metrics (SUM, COUNT, AVG) + user details
- NEVER select: password_hash, auth_tokens, api_keys, personal_data
- NEVER return only user_id without joining profiles table

EXAMPLE TRANSFORMATIONS:

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

❌ BAD (Too many results):
SELECT * FROM assignment_submissions;

✅ GOOD (Appropriate limit for text-heavy):
SELECT COUNT(*) FROM assignment_submissions;
SELECT id, student_id, assignment_id, submitted_at, status FROM assignment_submissions ORDER BY submitted_at DESC LIMIT 10;

❌ BAD (Date filter but no pagination):
SELECT u.full_name, COUNT(*) as logins
FROM profiles u
JOIN access_logs a ON u.id = a.user_id
WHERE a.created_at >= '2025-10-01'
GROUP BY u.id, u.full_name;

✅ GOOD (Date filter WITH pagination):
-- Count first
SELECT COUNT(DISTINCT user_id)
FROM access_logs
WHERE created_at >= '2025-10-01' AND created_at <= '2025-12-31';

-- Paginated results
SELECT u.full_name, u.email, COUNT(a.id) as login_count
FROM profiles u
JOIN access_logs a ON u.id = a.user_id
WHERE a.created_at >= '2025-10-01' AND a.created_at <= '2025-12-31'
GROUP BY u.id, u.full_name, u.email
ORDER BY login_count DESC
LIMIT 50;

CRITICAL REMINDER:
- NEVER return more than 100 rows in a single query
- ALWAYS use LIMIT for SELECT * queries
- ALWAYS inform users about pagination in your response
- ALWAYS provide guidance for viewing more results
- If you forget pagination and get a token error, apologize and retry with LIMIT

Always start by calling the appropriate tool(s) to gather information, then provide a response based on the tool results.`
        },
        {
          role: "user",
          content: prompt
        }
      ];

      let iteration = 0;
      let toolInvocations: any[] = [];
      
      while (iteration < MAX_ITERATIONS) {
        iteration++;
        
        if (LOG_LEVEL === "debug") {
          console.log(`[Iteration ${iteration}] Starting OpenAI completion...`);
        }

        // Determine tool choice - force tool usage on first iteration
        let toolChoice: any = "auto";
        if (iteration === 1 && toolInvocations.length === 0) {
          toolChoice = "required";
        }

        // Call OpenAI with current messages and available tools
        const completion = await openai.chat.completions.create({
          model: model,
          messages: messages,
          tools: tools,
          tool_choice: toolChoice,
          temperature: temperature
        });

        const assistantMessage = completion.choices[0].message;
        
        if (LOG_LEVEL === "debug") {
          console.log(`[Iteration ${iteration}] Assistant message:`, assistantMessage);
        }

        // Add assistant message to conversation
        messages.push(assistantMessage);

        // Check if assistant wants to use tools
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          
          // Process each tool call
          for (const toolCall of assistantMessage.tool_calls) {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments || "{}");
            
            if (LOG_LEVEL === "debug") {
              console.log(`[Iteration ${iteration}] Invoking tool: ${toolName} with args:`, toolArgs);
            }

            try {
              // Invoke the MCP tool
              const toolResult = await invokeMCPTool(toolName, toolArgs);
              
              // Track the tool invocation
              toolInvocations.push({
                iteration: iteration,
                tool: toolName,
                arguments: toolArgs,
                result: toolResult.content,
                success: true
              });

              // Add tool result to conversation
              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                name: toolName,
                content: toolResult.content || "Tool executed successfully but returned no content."
              });

            } catch (toolError) {
              console.error(`Error invoking tool ${toolName}:`, toolError);
              
              // Track failed tool invocation
              toolInvocations.push({
                iteration: iteration,
                tool: toolName,
                arguments: toolArgs,
                error: String(toolError),
                success: false
              });

              // Add error message to conversation
              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                name: toolName,
                content: `Error: ${String(toolError)}`
              });
            }
          }
          
          // Continue the loop to get the assistant's response to the tool results
          continue;
          
        } else {
          // No tools called - check if we have any tool invocations
          if (toolInvocations.length === 0) {
            // Force the assistant to use tools by adding a message
            messages.push(assistantMessage);
            messages.push({
              role: "user",
              content: "You must use the available tools to answer my request. Please call the appropriate tool(s) to gather the information I need."
            });
            continue;
          }
          
          // We have tool results, so we can provide the final response
          const finalResponse = assistantMessage.content;
          
          return new Response(JSON.stringify({
            ok: true,
            response: finalResponse,
            iterations: iteration,
            toolInvocations: toolInvocations,
            conversationLength: messages.length,
            metadata: {
              model: model,
              temperature: temperature,
              totalTokensEstimate: messages.reduce((acc: number, msg: any) => acc + (msg.content?.length || 0), 0)
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // If we reach here, we hit the max iterations limit
      return new Response(JSON.stringify({
        ok: true,
        response: "Maximum iterations reached. The task may be incomplete.",
        iterations: iteration,
        toolInvocations: toolInvocations,
        conversationLength: messages.length,
        warning: `Reached maximum iteration limit of ${MAX_ITERATIONS}`,
        metadata: {
          model: model,
          temperature: temperature,
          totalTokensEstimate: messages.reduce((acc: number, msg: any) => acc + (msg.content?.length || 0), 0)
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Legacy invoke-tool endpoint
    if (path.endsWith('/invoke-tool') && req.method === 'POST') {
      const body = await req.json();
      const { name, arguments: args } = body;
      
      if (!name) {
        return new Response(JSON.stringify({ ok: false, error: "Missing 'name'." }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      try {
        const result = await invokeMCPTool(name, args);
        return new Response(JSON.stringify({ ok: true, content: result.content, raw: result.raw }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error(error);
        // Reset the client on transport errors to trigger reconnect next time.
        mcpClient = undefined;
        return new Response(JSON.stringify({ ok: false, error: String(error) }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Default response for unmatched routes
    return new Response(JSON.stringify({ 
      error: "Not Found",
      availableEndpoints: ["/health", "/config", "/tools", "/invoke", "/invoke-tool"]
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in Edge Function:", error);
    // Reset the client on transport errors to trigger reconnect next time.
    mcpClient = undefined;
    return new Response(JSON.stringify({ 
      ok: false, 
      error: String(error),
      details: "An error occurred during processing"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
