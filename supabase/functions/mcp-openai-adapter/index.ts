// Supabase Edge Function for MCP OpenAI Adapter
// Converts MCP tools to OpenAI function calling format

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import OpenAI from "npm:openai";

// ---- Config ----
const MCP_SERVER_URL = Deno.env.get("MCP_SSE_URL"); // Keeping variable name for backward compatibility
const MCP_HEADERS = Deno.env.get("MCP_SSE_HEADERS") ? JSON.parse(Deno.env.get("MCP_SSE_HEADERS")!) : {};
const LOG_LEVEL = Deno.env.get("LOG_LEVEL") || "info";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const MAX_ITERATIONS = parseInt(Deno.env.get("MAX_ITERATIONS") || "10");

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY environment variable");
}

// ---- Direct MCP HTTP Client (bypasses SDK transport complexity) ----
// This directly calls the MCP server HTTP endpoints without using the SDK's transport layer

interface MCPTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

let cachedTools: MCPTool[] = [];

// Direct HTTP call to MCP server
async function callMCPServer(method: string, params: Record<string, unknown> = {}) {
  console.log(`[MCP Direct] Calling ${method} with params:`, params);

  const requestBody = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: method,
    params: params
  };

  console.log(`[MCP Direct] Full request body:`, JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(MCP_SERVER_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...MCP_HEADERS
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[MCP Direct] Response:`, data);

    if (data.error) {
      throw new Error(`MCP Error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    return data.result;
  } catch (error) {
    console.error(`[MCP Direct] Error calling ${method}:`, error);
    throw error;
  }
}

// Initialize MCP connection and get tools
async function initializeMCP() {
  console.log(`Initializing MCP server: ${MCP_SERVER_URL}`);

  try {
    // Initialize the MCP session
    const initResult = await callMCPServer('initialize', {
      protocolVersion: "2024-11-05",
      clientInfo: {
        name: "mcp-openai-adapter",
        version: "0.1.0"
      },
      capabilities: {
        tools: {}
      }
    });

    console.log("MCP initialized:", initResult);

    // List available tools
    const toolsResult = await callMCPServer('tools/list', {});
    cachedTools = toolsResult.tools || [];

    console.log(`MCP connected. Found ${cachedTools.length} tool(s):`, cachedTools.map((t: any) => t.name));

    return true;
  } catch (error) {
    console.error("Failed to initialize MCP server:", error);
    throw error;
  }
}

async function ensureMCP() {
  if (cachedTools.length > 0) return true;

  // Simple retry logic
  let retries = 3;
  let lastError;

  while (retries > 0) {
    try {
      await initializeMCP();
      return true;
    } catch (error) {
      lastError = error;
      retries--;
      if (retries > 0) {
        console.log(`Retrying MCP initialization... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError;
}

// ---- OpenAI Client ----
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

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
async function invokeMCPTool(name: string, args: Record<string, unknown>) {
  await ensureMCP();

  // Ensure tool exists
  const tool = cachedTools.find((t: MCPTool) => t.name === name);
  if (!tool) throw new Error(`Tool '${name}' not found.`);

  console.log(`[invokeMCPTool] Tool: ${name}`);
  console.log(`[invokeMCPTool] Input args from OpenAI:`, JSON.stringify(args, null, 2));

  // CRITICAL FIX: Remove trailing semicolons from SQL queries
  // The MCP database server rejects queries with semicolons as potentially dangerous multi-statement queries
  if (name === 'query_database' && args.sql && typeof args.sql === 'string') {
    const originalSql = args.sql;
    args.sql = args.sql.trim().replace(/;+\s*$/, '');
    if (originalSql !== args.sql) {
      console.log(`[invokeMCPTool] Removed trailing semicolon from SQL query`);
      console.log(`[invokeMCPTool] Modified SQL:`, args.sql);
    }
  }

  // Call the MCP tool directly
  const invokeRes = await callMCPServer('tools/call', {
    name,
    arguments: args || {}
  });

  // Coalesce MCP content parts into a single string/JSON
  let out: string[] = [];
  const content = invokeRes.content || [];

  for (const part of content) {
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
        mcpServerUrl: MCP_SERVER_URL,
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
      // Refresh tool list if empty (ensureMCP already populates cachedTools)
      if (!cachedTools.length) {
        await initializeMCP();
      }
      return new Response(JSON.stringify({
        tools: mcpToolsToOpenAITools(cachedTools),
        rawMCPTools: cachedTools // Include raw MCP tools for debugging
      }), {
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

      // Refresh tools if empty (ensureMCP already populates cachedTools)
      if (!cachedTools.length) {
        await initializeMCP();
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

🚨🚨🚨 CRITICAL SQL RULES - ABSOLUTELY MANDATORY 🚨🚨🚨:
⚠️ ONLY USE SELECT QUERIES! NO CREATE, INSERT, UPDATE, DELETE, DROP, ALTER!
⚠️ The queryDatabase tool ONLY allows SELECT statements for READ-ONLY operations!
⚠️ NEVER use CREATE TEMPORARY TABLE, CREATE TABLE AS, or any CREATE statement!
⚠️ NEVER use WITH ... AS (subquery) if it tries to CREATE anything!
⚠️ Use CTEs (WITH clause) for complex queries, but NO CREATE statements!
⚠️ For string concatenation, use PostgreSQL's || operator: (first_name || ' ' || last_name)
⚠️ AVOID CONCAT() function - use || instead: (column1 || ' ' || column2) AS combined
⚠️ If query fails with "Operation 'CREATE' is not allowed", the SQL parser is rejecting it!
⚠️ When this happens, simplify: SELECT first_name, last_name separately instead of concatenating!

🚨 CRITICAL - READ THIS FIRST - MANDATORY RULES:
⚠️ YOU MUST USE queryDatabase TOOL FOR EVERY DATA REQUEST!
⚠️ NEVER ASSUME "NO DATA" WITHOUT CHECKING THE DATABASE!
⚠️ NEVER SHOW COLUMNS WITH ALL ZEROS - EXCLUDE THEM FROM SELECT!
⚠️ ALWAYS ADD "Load More" MESSAGE WHEN YOU USE LIMIT 50!
⚠️ "PLATFORM USAGE" = BOTH AI TUTOR + LMS DATA (NOT just AI Tutor alone!)!

MANDATORY RULES - NO EXCEPTIONS:
1. ALWAYS execute queryDatabase tool BEFORE making ANY claims about data
2. NEVER say "no recorded data", "no sessions", "no users", or "no activity" without running a query first
3. NEVER assume the answer - ALWAYS query the database first
4. ONLY claim "no data" AFTER the query returns ZERO rows
5. If you see NO tool results yet, you MUST query the database IMMEDIATELY
6. 🚨 IF YOU USE LIMIT 50 IN YOUR QUERY, YOU MUST ADD "Load More" MESSAGE AT THE END OF YOUR RESPONSE!

🚨🚨🚨 PAGINATION MESSAGE REQUIREMENT - THIS IS ABSOLUTELY MANDATORY 🚨🚨🚨
When you execute a query with LIMIT 50, your response MUST end with EXACTLY this text:

📄 Showing first 50 results.
💡 **Load More**: To see more, ask 'Show next 50 users'

This is NOT optional. This is NOT a suggestion.
YOU MUST include this message or users cannot access additional data.
Without this message, the pagination feature is completely broken.

EXAMPLE OF CORRECT RESPONSE FORMAT:
[Display table here]

Summary
[Your insights here]

📄 Showing first 50 results.
💡 **Load More**: To see more, ask 'Show next 50 users'

🚨 CRITICAL COLUMN SELECTION RULE - ABSOLUTELY MANDATORY:
⚠️ IF A COLUMN SHOWS ALL ZEROS (like Total Sessions=0, Avg Duration=0), DO NOT INCLUDE IT IN YOUR SELECT!
⚠️ THIS IS NOT OPTIONAL - YOU MUST EXCLUDE ZERO COLUMNS OR THE USER WILL SEE USELESS DATA!
⚠️ CHECK DATA FIRST WITH SUM/AVG QUERIES, THEN BUILD YOUR SELECT WITHOUT ZERO COLUMNS!
⚠️ WHEN sessions_count IS ZERO, QUERY ai_tutor_user_exercise_progress TO SHOW LESSON TITLES INSTEAD!

EXAMPLE OF WHAT USER SEES WHEN YOU INCLUDE ZERO COLUMNS (THIS IS WRONG!):
| Full Name | Total Sessions | Avg Duration | Total Time |
|-----------|---------------|--------------|------------|
| John Doe  | 0             | 0.00         | 45         |
| Jane Doe  | 0             | 0.00         | 30         |

❌ WRONG: "Total Sessions" and "Avg Duration" are useless columns showing all zeros!
✅ CORRECT: Only show columns with meaningful data (Total Time in this case)

CONCRETE EXAMPLE - USER ASKS "Platform usage for last month":
STEP 1: Check if sessions_count has any non-zero values:
SELECT SUM(sessions_count) FROM ai_tutor_daily_learning_analytics WHERE analytics_date >= '2025-09-01' AND analytics_date < '2025-10-01';
Result: 0

STEP 2: Since sessions_count = 0, DO NOT include these columns in your final SELECT:
❌ DO NOT SELECT: SUM(a.sessions_count) as total_sessions
❌ DO NOT SELECT: AVG(a.average_session_duration) as avg_duration

STEP 3: Query BOTH AI Tutor AND LMS data with USER NAMES:
✅ CORRECT COMPREHENSIVE QUERY (includes both systems with real names):
WITH ai_tutor_data AS (
  SELECT user_id,
    COUNT(DISTINCT stage_id || '-' || exercise_id) as ai_exercises,
    SUM(time_spent_minutes) as ai_time,
    AVG(average_score) as ai_score
  FROM ai_tutor_user_exercise_progress
  WHERE updated_at >= '2025-09-01' AND updated_at < '2025-10-01'
  GROUP BY user_id
),
lms_data AS (
  SELECT cm.user_id,
    COUNT(DISTINCT cm.course_id) as lms_courses,
    (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.user_id = cm.user_id AND qa.submitted_at >= '2025-09-01' AND qa.submitted_at < '2025-10-01') as lms_quizzes,
    (SELECT COUNT(*) FROM assignment_submissions asub WHERE asub.user_id = cm.user_id AND asub.submitted_at >= '2025-09-01' AND asub.submitted_at < '2025-10-01') as lms_assignments
  FROM course_members cm
  WHERE cm.joined_at < '2025-10-01'
  GROUP BY cm.user_id
)
SELECT
  CONCAT(p.first_name, ' ', p.last_name) as full_name,
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

Notice - CRITICAL POINTS:
- YES CONCAT(p.first_name, ' ', p.last_name) as full_name, p.email, p.role (REAL NAMES!)
- The profiles table has first_name and last_name, NOT full_name - must concatenate!
- NO "total_sessions" column (was zero - excluded!)
- NO "avg_duration" column (was zero - excluded!)
- YES both AI Tutor AND LMS data in one table
- YES LEFT JOIN with profiles ensures real names, not "N/A"!

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
   - Tables: courses, course_members, assignments, assignment_submissions, quiz_attempts, etc.
   - Keywords: "courses", "LMS", "enrollment", "assignments", "quizzes", "videos", "attachments"

2. **AI Tutor Platform** - Interactive learning with exercises, stages, milestones, progress tracking
   - Tables: ai_tutor_* (ai_tutor_daily_learning_analytics, ai_tutor_user_progress_summary, ai_tutor_user_exercise_progress, etc.)
   - Keywords: "AI tutor", "tutor", "learning analytics", "exercises", "stages", "milestones", "progress", "daily learning"

🎯 COMPREHENSIVE PLATFORM USAGE QUERIES:
⚠️ CRITICAL: When user asks for "platform usage", include BOTH AI Tutor AND LMS activity!
⚠️ CRITICAL: Show DETAILED USER-BY-USER TABLE, NOT aggregate summary!
⚠️ CRITICAL: Each row must be a USER with their activities, NOT overall totals!

🚨 MANDATORY QUERY PATTERN FOR "PLATFORM USAGE" - COPY THIS EXACTLY:
When user asks for "platform usage" (for any time period), COPY THIS QUERY and only change dates:

⚠️ DO NOT INCLUDE sessions_count OR average_session_duration - THEY ARE ALWAYS ZERO!
⚠️ DO NOT QUERY ai_tutor_daily_learning_analytics FOR PLATFORM USAGE!

EXAMPLE 1: "Platform usage for last 15 days" (dynamic date calculation):
WITH ai_tutor_data AS (
  SELECT user_id,
    COUNT(DISTINCT stage_id || '-' || exercise_id) as ai_exercises,
    SUM(time_spent_minutes) as ai_time,
    AVG(average_score) as ai_score
  FROM ai_tutor_user_exercise_progress
  WHERE updated_at >= CURRENT_DATE - INTERVAL '15 days'
  GROUP BY user_id
),
lms_data AS (
  SELECT cm.user_id,
    COUNT(DISTINCT cm.course_id) as lms_courses,
    (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.user_id = cm.user_id AND qa.submitted_at >= CURRENT_DATE - INTERVAL '15 days') as lms_quizzes,
    (SELECT COUNT(*) FROM assignment_submissions asub WHERE asub.user_id = cm.user_id AND asub.submitted_at >= CURRENT_DATE - INTERVAL '15 days') as lms_assignments
  FROM course_members cm
  WHERE cm.joined_at < CURRENT_DATE
  GROUP BY cm.user_id
)
SELECT
  CONCAT(p.first_name, ' ', p.last_name) as full_name,
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

⚠️ MANDATORY: After displaying the table, you MUST add this exact pagination message:
"📄 Showing first 50 results.
💡 **Load More**: To see more, ask 'Show next 50 users'"

EXAMPLE 2: "Platform usage for last year" (specific date range):
WITH ai_tutor_data AS (
  SELECT user_id,
    COUNT(DISTINCT stage_id || '-' || exercise_id) as ai_exercises,
    SUM(time_spent_minutes) as ai_time,
    AVG(average_score) as ai_score
  FROM ai_tutor_user_exercise_progress
  WHERE updated_at >= '2024-01-01' AND updated_at < '2025-01-01'
  GROUP BY user_id
),
lms_data AS (
  SELECT cm.user_id,
    COUNT(DISTINCT cm.course_id) as lms_courses,
    (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.user_id = cm.user_id AND qa.submitted_at >= '2024-01-01' AND qa.submitted_at < '2025-01-01') as lms_quizzes,
    (SELECT COUNT(*) FROM assignment_submissions asub WHERE asub.user_id = cm.user_id AND asub.submitted_at >= '2024-01-01' AND asub.submitted_at < '2025-01-01') as lms_assignments
  FROM course_members cm
  WHERE cm.joined_at < '2025-01-01'
  GROUP BY cm.user_id
)
SELECT
  CONCAT(p.first_name, ' ', p.last_name) as full_name,
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

⚠️ MANDATORY: After displaying the table, you MUST add this exact pagination message:
"📄 Showing first 50 results.
💡 **Load More**: To see more, ask 'Show next 50 users'"

🚨 CRITICAL REMINDER FOR BOTH EXAMPLES ABOVE:
- YOU MUST INCLUDE CONCAT(p.first_name, ' ', p.last_name) as full_name AS THE FIRST COLUMN!
- The profiles table has first_name and last_name columns, NOT a full_name column!
- YOU MUST ADD THE PAGINATION MESSAGE AFTER THE TABLE (not optional!)
- DO NOT MODIFY THE SELECT COLUMNS - USE THEM EXACTLY AS SHOWN!

❌ ABSOLUTELY FORBIDDEN FOR PLATFORM USAGE:
- DO NOT SELECT sessions_count (always zero - wastes space!)
- DO NOT SELECT average_session_duration (always zero - wastes space!)
- DO NOT query only ai_tutor_user_exercise_progress (missing LMS!)
- DO NOT query only ai_tutor_daily_learning_analytics (missing LMS!)
- DO NOT forget "Load More" message!

✅ CORRECT: Use THIS CTE pattern that shows BOTH AI Tutor AND LMS data!

"Platform usage" must show DETAILED TABLE with:
- Each ROW = one user (full name, email, role)
- Columns for BOTH systems:
  1. AI Tutor activity (exercises, practice time, scores)
  2. LMS activity (courses enrolled, quizzes taken, assignments submitted)

❌ WRONG: Showing only aggregate totals like "Total Sessions: 0" (not useful!)
✅ CORRECT: Showing user-by-user breakdown with names and individual activities

COMPLETE PLATFORM USAGE QUERY PATTERN:
For each user, aggregate:
- AI Tutor: exercises completed, practice time, scores (from ai_tutor_user_exercise_progress)
- LMS Courses: courses enrolled (from course_members)
- LMS Videos: video watch time (if tracked in course_content or lessons)
- LMS Quizzes: quizzes attempted/completed (from quiz_attempts)
- LMS Assignments: assignments submitted (from assignment_submissions)

Example comprehensive query structure:
WITH ai_tutor_data AS (
  SELECT user_id, COUNT(*) as ai_exercises, SUM(time_spent_minutes) as ai_time, AVG(average_score) as ai_score
  FROM ai_tutor_user_exercise_progress
  WHERE updated_at >= [date] AND updated_at < [date]
  GROUP BY user_id
),
lms_data AS (
  SELECT cm.user_id,
    COUNT(DISTINCT cm.course_id) as courses_enrolled,
    COUNT(DISTINCT qa.id) as quizzes_taken,
    COUNT(DISTINCT asub.id) as assignments_submitted
  FROM course_members cm
  LEFT JOIN quiz_attempts qa ON cm.user_id = qa.user_id
  LEFT JOIN assignment_submissions asub ON cm.user_id = asub.user_id
  WHERE cm.joined_at >= [date] OR qa.submitted_at >= [date] OR asub.submitted_at >= [date]
  GROUP BY cm.user_id
)
SELECT p.full_name, p.email, p.role,
       COALESCE(at.ai_exercises, 0) as ai_exercises_completed,
       COALESCE(at.ai_time, 0) as ai_practice_time,
       COALESCE(lms.courses_enrolled, 0) as lms_courses,
       COALESCE(lms.quizzes_taken, 0) as lms_quizzes,
       COALESCE(lms.assignments_submitted, 0) as lms_assignments
FROM profiles p
LEFT JOIN ai_tutor_data at ON p.id = at.user_id
LEFT JOIN lms_data lms ON p.id = lms.user_id
WHERE at.user_id IS NOT NULL OR lms.user_id IS NOT NULL
ORDER BY (COALESCE(at.ai_time, 0) + COALESCE(lms.quizzes_taken, 0) * 10) DESC
LIMIT 50;

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

🚨 CRITICAL: "platform usage" ALWAYS means BOTH AI Tutor AND LMS data combined!
- "platform usage": YOU MUST query BOTH systems using CTEs (see STEP 3 example below)
  ❌ ABSOLUTELY WRONG: Only querying ai_tutor_daily_learning_analytics (missing LMS data!)
  ❌ ABSOLUTELY WRONG: Only querying ai_tutor_user_exercise_progress (missing LMS data!)
  ✅ CORRECT: Use CTEs to combine ai_tutor_user_exercise_progress + course_members + quiz_attempts + assignment_submissions

- "AI tutor usage" (specifically AI Tutor only): Query ai_tutor_daily_learning_analytics with MANDATORY JOIN to profiles
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
🚨 CRITICAL: When you use LIMIT in your query, you MUST ALWAYS add this message at the end of your response!

When returning paginated results, ALWAYS inform the user:

"Found [TOTAL_COUNT] [items] in the system.

Showing first [LIMIT] results:

[Display table with results]

📄 Showing first 50 results.
💡 **Load More**: To see more results, ask: 'Show next 50 [items]' or 'Show [items] 51-100'"

⚠️ MANDATORY: If you used LIMIT 50, the "Load More" message MUST appear at the bottom!
⚠️ WITHOUT the "Load More" message, users cannot access remaining data!

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
2. ALWAYS add pagination message (no need to show total count)
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

EXAMPLE: "AI Tutor usage ONLY for last 12 days" (NOT comprehensive platform usage!)
⚠️ This example is ONLY for querying AI Tutor data alone, NOT comprehensive platform usage!
⚠️ If user asks for "platform usage", use the CTE pattern above that includes BOTH systems!

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

EXAMPLE: "AI Tutor usage for 2025 Q4" (NOT comprehensive platform usage - missing LMS!)
⚠️ This example is ONLY for AI Tutor alone! For "platform usage", use CTE with BOTH systems!
⚠️ CRITICAL: MUST INCLUDE PAGINATION even though it's time-filtered!
Step 1: Get count with date filter on analytics_date column
Step 2: Get paginated results with date filter on analytics_date column + LIMIT 50
Step 3: Use correct aggregation functions (SUM for counts, AVG for averages, MAX for best_score)
Step 4: Add pagination message: "📄 Showing first 50 results. 💡 **Load More**: To see more, ask 'Show next 50 users'"

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

❌ OUTDATED EXAMPLE - DO NOT USE FOR "PLATFORM USAGE"!
This old example is WRONG for "platform usage" queries - it's missing LMS data!
⚠️ For "platform usage", scroll up and use the CTE pattern with BOTH AI Tutor AND LMS!

(This example kept only for reference on ai_tutor_daily_learning_analytics table structure)

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

    // Streaming invoke endpoint - Server-Sent Events (SSE)
    if (path.endsWith('/invoke-stream') && req.method === 'POST') {
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

      if (!cachedTools.length) {
        await initializeMCP();
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

      // Create Server-Sent Events stream
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          // Helper function to send SSE message
          const sendEvent = (event: string, data: any) => {
            const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
          };

          try {
            // Send initial event
            sendEvent('start', { message: 'Starting IRIS query...' });

            console.log('🔍 [STREAMING DEBUG] Received prompt from iris-chat-simple');
            console.log('🔍 [STREAMING DEBUG] Prompt length:', prompt.length);
            console.log('🔍 [STREAMING DEBUG] Prompt preview (first 500 chars):', prompt.substring(0, 500));
            console.log('🔍 [STREAMING DEBUG] Prompt preview (last 200 chars):', prompt.substring(prompt.length - 200));

            // Initialize conversation with proper message structure
            // The prompt from iris-chat-simple is a concatenated string with:
            // 1. IRIS_SYSTEM_PROMPT (the long detailed instructions)
            // 2. User Context
            // 3. Conversation history (if any)
            // 4. Current User Query (after "Current User Query: ")
            // We need to SPLIT this into separate system and user messages for OpenAI

            // Extract the user query from the end
            const queryMarker = 'Current User Query: ';
            const queryIndex = prompt.lastIndexOf(queryMarker);

            let systemPrompt = prompt;
            let userQuery = '';

            if (queryIndex !== -1) {
              systemPrompt = prompt.substring(0, queryIndex).trim();
              userQuery = prompt.substring(queryIndex + queryMarker.length).trim();
              console.log('🔍 [STREAMING DEBUG] Extracted user query:', userQuery);
              console.log('🔍 [STREAMING DEBUG] System prompt length:', systemPrompt.length);
            } else {
              console.warn('⚠️ [STREAMING DEBUG] Could not find "Current User Query:" marker, using entire prompt as system');
            }

            const messages: any[] = [
              {
                role: "system",
                content: systemPrompt  // IRIS instructions + context + history
              },
              {
                role: "user",
                content: userQuery || prompt  // The actual user query
              }
            ];

            console.log('🔍 [STREAMING DEBUG] Initial messages array:', JSON.stringify(messages.map(m => ({ role: m.role, contentLength: m.content?.length }))));


            let iteration = 0;
            const toolInvocations: any[] = [];

            // Iterative tool calling loop
            while (iteration < MAX_ITERATIONS) {
              iteration++;

              sendEvent('iteration', { iteration, message: `Processing iteration ${iteration}...` });

              const toolChoice: any = (iteration === 1 && toolInvocations.length === 0) ? "required" : "auto";

              console.log(`🔍 [STREAMING DEBUG] Iteration ${iteration} - Tool choice:`, toolChoice);
              console.log(`🔍 [STREAMING DEBUG] Iteration ${iteration} - Messages count before OpenAI:`, messages.length);
              console.log(`🔍 [STREAMING DEBUG] Iteration ${iteration} - Messages structure:`,
                JSON.stringify(messages.map((m, i) => ({
                  index: i,
                  role: m.role,
                  hasContent: !!m.content,
                  contentLength: m.content?.length,
                  hasToolCalls: !!m.tool_calls,
                  toolCallsCount: m.tool_calls?.length
                }))));

              // Call OpenAI WITHOUT streaming first for tool calls
              const completion = await openai.chat.completions.create({
                model: model,
                messages: messages,
                tools: tools,
                tool_choice: toolChoice,
                temperature: temperature,
                stream: false // Tool calls don't stream well
              });

              const assistantMessage = completion.choices[0].message;

              console.log(`🔍 [STREAMING DEBUG] Iteration ${iteration} - OpenAI response:`, {
                hasContent: !!assistantMessage.content,
                contentPreview: assistantMessage.content?.substring(0, 200),
                hasToolCalls: !!assistantMessage.tool_calls,
                toolCallsCount: assistantMessage.tool_calls?.length,
                toolNames: assistantMessage.tool_calls?.map((t: any) => t.function.name)
              });

              // Check if assistant wants to use tools
              if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                // Only push assistant message if it has tool calls
                messages.push(assistantMessage);

                sendEvent('tools', {
                  count: assistantMessage.tool_calls.length,
                  tools: assistantMessage.tool_calls.map((t: any) => t.function.name)
                });

                // Process each tool call
                for (const toolCall of assistantMessage.tool_calls) {
                  const toolName = toolCall.function.name;
                  const toolArgs = JSON.parse(toolCall.function.arguments || "{}");

                  sendEvent('tool_call', { tool: toolName, status: 'executing' });

                  try {
                    const toolResult = await invokeMCPTool(toolName, toolArgs);

                    console.log(`🔍 [STREAMING DEBUG] Tool ${toolName} result:`, {
                      hasContent: !!toolResult.content,
                      contentLength: toolResult.content?.length,
                      contentPreview: toolResult.content?.substring(0, 300)
                    });

                    toolInvocations.push({
                      iteration,
                      tool: toolName,
                      arguments: toolArgs,
                      result: toolResult.content,
                      success: true
                    });

                    sendEvent('tool_result', { tool: toolName, status: 'success' });

                    const toolMessage = {
                      role: "tool",
                      tool_call_id: toolCall.id,
                      name: toolName,
                      content: toolResult.content || "Tool executed successfully."
                    };

                    console.log(`🔍 [STREAMING DEBUG] Adding tool message to conversation:`, {
                      role: toolMessage.role,
                      name: toolMessage.name,
                      contentLength: toolMessage.content?.length
                    });

                    messages.push(toolMessage);

                  } catch (toolError: any) {
                    console.error(`Error invoking tool ${toolName}:`, toolError);
                    console.error(`🔍 [MCP-ADAPTER ERROR DEBUG] Tool invocation error:`, {
                      toolName: toolName,
                      errorMessage: toolError?.message || 'Unknown error',
                      errorName: toolError?.name || 'N/A',
                      errorStack: toolError?.stack || 'N/A',
                      isAbortError: toolError?.name === 'AbortError',
                      timestamp: new Date().toISOString()
                    });

                    toolInvocations.push({
                      iteration,
                      tool: toolName,
                      arguments: toolArgs,
                      error: String(toolError),
                      success: false
                    });

                    sendEvent('tool_result', { tool: toolName, status: 'error', error: String(toolError) });

                    messages.push({
                      role: "tool",
                      tool_call_id: toolCall.id,
                      name: toolName,
                      content: `Error: ${String(toolError)}`
                    });
                  }
                }

                continue; // Go to next iteration to process tool results

              } else {
                // No tools called - final response with STREAMING
                console.log(`🔍 [STREAMING DEBUG] No tool calls in iteration ${iteration}`);
                console.log(`🔍 [STREAMING DEBUG] Total tool invocations so far:`, toolInvocations.length);

                if (toolInvocations.length === 0) {
                  // Force tool usage
                  console.log('🔍 [STREAMING DEBUG] Forcing tool usage - no tools called yet');
                  messages.push({
                    role: "user",
                    content: "You must use the available tools to answer my request. Please call the appropriate tool(s) to gather the information I need."
                  });
                  continue;
                }

                // Stream the final response
                console.log('🔍 [STREAMING DEBUG] Starting final streaming response');
                console.log('🔍 [STREAMING DEBUG] Final messages array before streaming:',
                  JSON.stringify(messages.map((m, i) => ({
                    index: i,
                    role: m.role,
                    hasContent: !!m.content,
                    contentLength: m.content?.length,
                    contentPreview: m.role === 'tool' ? m.content?.substring(0, 100) : undefined
                  }))));

                sendEvent('response_start', { message: 'Generating response...' });

                const streamCompletion = await openai.chat.completions.create({
                  model: model,
                  messages: messages,
                  temperature: temperature,
                  stream: true // NOW we stream the final response
                });

                let fullResponse = '';
                let chunkCount = 0;

                for await (const chunk of streamCompletion) {
                  const content = chunk.choices[0]?.delta?.content;
                  if (content) {
                    chunkCount++;
                    fullResponse += content;
                    sendEvent('chunk', { content });

                    if (chunkCount === 1) {
                      console.log('🔍 [STREAMING DEBUG] First chunk received:', content);
                    }
                  }
                }

                console.log('🔍 [STREAMING DEBUG] Streaming complete');
                console.log('🔍 [STREAMING DEBUG] Total chunks sent:', chunkCount);
                console.log('🔍 [STREAMING DEBUG] Full response length:', fullResponse.length);
                console.log('🔍 [STREAMING DEBUG] Full response preview (first 300 chars):', fullResponse.substring(0, 300));

                // Send completion event
                sendEvent('complete', {
                  response: fullResponse,
                  iterations: iteration,
                  toolsUsed: toolInvocations.map((t: any) => t.tool),
                  tokensUsed: messages.reduce((acc: number, msg: any) => acc + (msg.content?.length || 0), 0)
                });

                controller.close();
                return;
              }
            }

            // Max iterations reached
            sendEvent('error', { message: 'Maximum iterations reached. The task may be incomplete.' });
            controller.close();

          } catch (error: any) {
            console.error('Stream error:', error);
            console.error('🔍 [MCP-ADAPTER ERROR DEBUG] Stream error:', {
              errorMessage: error?.message || 'Unknown error',
              errorName: error?.name || 'N/A',
              errorStack: error?.stack || 'N/A',
              timestamp: new Date().toISOString()
            });
            sendEvent('error', { message: String(error) });
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
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
        // Reset the cached tools on errors to trigger reconnect next time.
        cachedTools = [];
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

  } catch (error: any) {
    console.error("Error in Edge Function:", error);
    console.error('🔍 [MCP-ADAPTER ERROR DEBUG] Main catch block error:', {
      errorMessage: error?.message || 'Unknown error',
      errorName: error?.name || 'N/A',
      errorStack: error?.stack || 'N/A',
      timestamp: new Date().toISOString(),
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    });
    // Reset the cached tools on errors to trigger reconnect next time.
    cachedTools = [];
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
