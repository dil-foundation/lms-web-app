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

    // Log warnings for common schema mistakes (but let LLM learn from errors)
    let sql = args.sql as string;

    // Check for common mistakes and log warnings
    if (sql.match(/\bp\.full_name\b/gi) || sql.match(/profiles\.full_name\b/gi)) {
      console.log(`⚠️ [SCHEMA WARNING] Query uses p.full_name but profiles table has first_name and last_name columns!`);
      console.log(`⚠️ [SCHEMA WARNING] Should use: (p.first_name || ' ' || p.last_name) AS full_name`);
    }

    if (sql.includes('.published') || sql.match(/\bc\.published\b/i)) {
      console.log(`⚠️ [SCHEMA WARNING] Query uses c.published but courses table has status column!`);
      console.log(`⚠️ [SCHEMA WARNING] Should use: c.status = 'Published'`);
    }

    if (sql.match(/\bFROM\s+assignments\b/i) || sql.match(/\bJOIN\s+assignments\b/i)) {
      console.log(`⚠️ [SCHEMA WARNING] Query references "assignments" table which doesn't exist!`);
      console.log(`⚠️ [SCHEMA WARNING] Assignments are in course_lesson_content WHERE content_type = 'assignment'`);
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
          "gpt-4o-mini"
        ],
        note: "Model is locked to gpt-4o-mini for cost optimization. Model parameter in requests is ignored.",
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
      const { prompt, temperature = 0.2 } = body;

      // Always use gpt-4o-mini - ignore any model parameter
      const model = "gpt-4o-mini";
      
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
⚠️ STEP 1: Use list_tables tool FIRST if querying unfamiliar tables to get exact column types!
⚠️ STEP 2: Check data types in schema (integer vs text vs boolean) before writing WHERE clauses!
⚠️ STEP 3: Use queryDatabase tool to execute your query!
⚠️ YOU MUST USE queryDatabase TOOL FOR EVERY DATA REQUEST!
⚠️ NEVER ASSUME "NO DATA" WITHOUT CHECKING THE DATABASE!
⚠️ NEVER SHOW COLUMNS WITH ALL ZEROS - EXCLUDE THEM FROM SELECT!
⚠️ NEVER ASSUME COLUMN TYPES - CHECK SCHEMA FIRST!
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

🚨🚨🚨 CRITICAL MARKDOWN TABLE FORMATTING RULES - ABSOLUTELY MANDATORY 🚨🚨🚨:
🚨 THIS APPLIES TO **EVERY SINGLE TABLE** YOU CREATE - NO EXCEPTIONS! 🚨

⚠️ RULE #1: ALWAYS include the separator row |---|---| between header and data
⚠️ RULE #2: ALWAYS use pipes (|) in BOTH header AND separator rows - NEVER use tabs (\t)
⚠️ RULE #3: ALWAYS format tables on SEPARATE LINES - NEVER inline with text
⚠️ RULE #4: ALWAYS add BLANK LINES before and after tables
⚠️ RULE #5: NEVER show user_id or UUIDs - ALWAYS JOIN with profiles to show names

❌ WRONG FORMAT #1 (missing separator row + using tabs in header):
Stage ID	Student Count
| 0 | 2 |
| 1 | 18 |

❌ WRONG FORMAT #2 (showing UUIDs instead of names):
User ID	Average Time
| 4ffe34cb-174e-4016-84c8-8e3a26c5bc95 | 0 |

❌ WRONG FORMAT #3 (inline with text):
- Here's the distribution: | Stage | Count | |-------|-------| | 1 | 5 |

✅ CORRECT FORMAT (all rules followed):
Here's the distribution of students across stages:

| Stage Title | Student Count |
|-------------|---------------|
| Beginner    | 2             |
| Intermediate| 18            |

Average time spent per student:

| Full Name | Email | Time Spent (min) |
|-----------|-------|------------------|
| John Doe  | j@... | 45               |
| Jane Smith| jane@...| 32            |

MANDATORY TABLE FORMATTING TEMPLATE FOR EVERY TABLE:
[Section heading or description text]

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value 1  | Value 2  | Value 3  |
| Value 4  | Value 5  | Value 6  |

[Continue with next section]

🚨 ABSOLUTE REQUIREMENTS FOR EVERY TABLE:
1. Blank line BEFORE the table
2. Header row with | pipe separators (NOT tabs!)
3. Separator row with |---|---| (THIS IS MANDATORY!)
4. Data rows with | pipe separators
5. Blank line AFTER the table
6. Use NAMES from profiles table (NOT user_id UUIDs!)
7. Use TITLES from content hierarchy (NOT numeric IDs!)

🚨 BEFORE OUTPUTTING ANY TABLE, CHECK:
✓ Does my header row use | pipes? (Not tabs?)
✓ Did I include the |---|---| separator row?
✓ Am I showing names/titles? (Not UUIDs/IDs?)
✓ Are there blank lines before and after?

IF ANY ANSWER IS "NO", DO NOT OUTPUT THE TABLE! FIX IT FIRST!

🎨🎨🎨 CRITICAL EMPTY RESULT FORMATTING RULES 🎨🎨🎨:
🚨 THIS APPLIES TO ALL EMPTY/NULL VALUES - NO EXCEPTIONS! 🚨

❌ NEVER EVER use HTML-like syntax in markdown tables:
  - (No data available)">(No data available) ← WRONG!
  - (No grades available)">(No grades available) ← WRONG!
  - (No quiz scores available)">(No quiz scores available) ← WRONG!
  - | (No data)"> ← WRONG!
  - Any syntax with ")>" characters ← WRONG!

✅ CORRECT ways to show empty/missing data:

**In table cells (numeric columns):**
| Course Title | Average Quiz Score |
|--------------|-------------------|
| Test Course  | N/A               |

**In table cells (text columns):**
| Course Title | Creator Name |
|--------------|--------------|
| Test Course  | Not assigned |

**For entire empty sections (outside tables):**
No quiz scores available for this period.

**For empty tables:**
No assignment grades available for any courses.

🚨 VERIFICATION BEFORE SENDING RESPONSE:
✓ Search your response for ")>" characters - if found, REMOVE THEM!
✓ Replace HTML-like syntax with plain "N/A" or "Not available"
✓ Use plain text for empty sections, not broken markdown

🚫🚫🚫 ABSOLUTELY FORBIDDEN - NEVER DO THIS 🚫🚫🚫:
❌ NEVER output data as bullet lists when showing multiple rows of data
❌ NEVER write: "Here are the average time spent (in minutes) by each student: - Puttareddy Arugunta: 0 - Arun Student: 0"
❌ NEVER write: "Top 10 Most Challenging Exercises (Lowest Scores): - Exercise ID 3: Average Score: 31.46 - Exercise ID 2: Average Score: 38.84"
❌ NEVER write: "Top 10 Highest-Performing Students: - Puttareddy Arugunta: Average Progress: 16.67%"

✅✅✅ ALWAYS DO THIS INSTEAD ✅✅✅:
✅ ALWAYS output multiple rows of data as markdown TABLES
✅ ALWAYS use the proper table format with | pipes and separator rows
✅ Tables are MANDATORY for any data with 2+ rows

EXAMPLE OF WRONG VS CORRECT:

❌ WRONG (bullet list):
Average Time Spent per Student:
- Puttareddy Arugunta: 0 minutes
- Arun Student: 0 minutes
- Fiza Shah: 0 minutes

✅ CORRECT (markdown table):
Average Time Spent per Student:

| Full Name | Time Spent (min) |
|-----------|------------------|
| Puttareddy Arugunta | 0 |
| Arun Student | 0 |
| Fiza Shah | 0 |

🚨 CRITICAL ENFORCEMENT RULE:
IF you find yourself writing a dash/hyphen (-) followed by data, STOP IMMEDIATELY!
Convert it to a markdown table format with | pipes and separator rows!
Bullet lists are ONLY for recommendations, insights, or summaries - NOT for data rows!

🚨🚨🚨 CRITICAL NAME/UUID RULE - ABSOLUTELY MANDATORY 🚨🚨🚨:
⚠️ NEVER SHOW UUIDs, user_id, student_id, OR ANY ID COLUMNS IN YOUR OUTPUT!
⚠️ ALWAYS JOIN WITH profiles TABLE TO GET NAMES!
⚠️ ALWAYS USE: (p.first_name || ' ' || p.last_name) AS full_name

❌ WRONG (showing UUIDs):
| User ID | Time Spent |
|---------|------------|
| 423ead59-a712-486e-87c8-39cc82684867 | 108 |
| 6c4d5b89-1e0d-4bd5-8bf6-ca241d54542d | 69 |

✅ CORRECT (showing names):
| Full Name | Email | Time Spent (min) |
|-----------|-------|------------------|
| Ashwin Bhaskaran | ashwin@... | 108 |
| Puttareddy Arugunta | putta@... | 69 |

🚨 MANDATORY SQL JOIN PATTERN FOR ANY USER/STUDENT DATA:
SELECT
  (p.first_name || ' ' || p.last_name) AS full_name,
  p.email,
  [other columns]
FROM [main_table] mt
JOIN profiles p ON mt.user_id = p.id
ORDER BY [your order]
LIMIT 50;

🚨 CRITICAL CHECKS BEFORE OUTPUTTING ANY TABLE WITH PEOPLE:
✓ Did I JOIN with profiles table?
✓ Am I selecting (first_name || ' ' || last_name) AS full_name?
✓ Am I showing p.email?
✓ Did I exclude user_id, student_id from SELECT?

IF ANY ANSWER IS "NO", REWRITE YOUR QUERY TO JOIN profiles!

🚨🚨🚨 CRITICAL: ALWAYS CHECK SCHEMA BEFORE WRITING QUERIES 🚨🚨🚨

⚠️ MANDATORY FIRST STEP FOR UNFAMILIAR TABLES:
Before writing ANY query involving a table you haven't queried in this conversation:
1. Call list_tables tool FIRST to get exact column names and types
2. Check the data_type field for each column (integer, text, boolean, uuid, etc.)
3. NEVER assume a column is text/boolean when it's actually integer
4. NEVER assume column names (e.g., "full_name" doesn't exist - use first_name + last_name)

🚨 The list_tables tool returns COMPLETE schema information including:
- Exact column names (no guessing!)
- Exact data types (integer vs text vs boolean - this matters!)
- Nullable constraints
- Default values

IMPORTANT DATABASE SCHEMA KNOWLEDGE:
- Course statuses are: "Published", "Draft", "Under Review" (NOT "active" or "inactive")
- User roles are typically: "admin", "teacher", "student"
- Use proper column names and values as they exist in the database

🔍 EXAMPLE - CORRECT APPROACH:
User asks: "Show me completed stages"
Step 1: Call list_tables to check ai_tutor_user_progress_summary schema
Step 2: See that current_stage column is type "integer" (not boolean or text!)
Step 3: Write correct query using integer comparison
❌ WRONG: WHERE current_stage = 'completed' (type mismatch!)
✅ CORRECT: Use ai_tutor_user_stage_progress.completed boolean column instead

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
  WHERE cm.created_at >= [date] OR qa.submitted_at >= [date] OR asub.submitted_at >= [date]
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

⚠️ CRITICAL: STAGE PROGRESS QUERIES MUST ALWAYS JOIN WITH CONTENT HIERARCHY!

When querying ai_tutor_user_stage_progress, ALWAYS JOIN with ai_tutor_content_hierarchy to get stage metadata (title, difficulty, etc.):

✅ CORRECT PATTERN FOR STAGE COMPLETION METRICS:
SELECT
  ch.stage_number,
  ch.title as stage_title,
  ch.difficulty_level,
  COUNT(DISTINCT sp.user_id) as total_students,
  COUNT(CASE WHEN sp.completed = true THEN 1 END) as completed_students,
  COUNT(CASE WHEN sp.completed = false THEN 1 END) as in_progress_students,
  AVG(sp.time_spent_minutes) as avg_time_spent,
  AVG(sp.average_score) as avg_score
FROM ai_tutor_user_stage_progress sp
INNER JOIN ai_tutor_content_hierarchy ch ON sp.stage_id = ch.stage_number AND ch.level = 'stage'
GROUP BY ch.stage_number, ch.title, ch.difficulty_level
ORDER BY ch.stage_number;

❌ WRONG: SELECT stage_id, COUNT(*) FROM ai_tutor_user_stage_progress
⚠️ This is WRONG because it shows stage_id (0, 1, 2) instead of stage_title ("Beginner Stage", etc.)!

🚨 MANDATORY: NEVER show stage_id alone - ALWAYS JOIN to get stage_title from ai_tutor_content_hierarchy!

---

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

---

🎯 STANDARDIZED OUTPUT FORMATS FOR QUICK ACTIONS

⚠️ CRITICAL: When users request these specific reports, use the EXACT table format specified below for consistency!

═══════════════════════════════════════════════════════════════════════════════
AI TUTOR QUICK ACTIONS - STANDARDIZED FORMATS
═══════════════════════════════════════════════════════════════════════════════

1. TOP PERFORMERS ANALYSIS
When user requests "top active students" or "top performers":
MANDATORY TABLE FORMAT:
| Full Name | Email | Current Stage | Current Exercise | Time Spent (min) | Exercises Completed | Progress % | Streak Days | Longest Streak | Last Activity |

MANDATORY COLUMNS (in this exact order):
- Full Name (MUST use: (p.first_name || ' ' || p.last_name) - profiles.full_name does NOT exist!)
- Email (from profiles.email)
- Current Stage (from ai_tutor_user_progress_summary, show title not ID)
- Current Exercise (from ai_tutor_user_progress_summary, show title not ID)
- Time Spent (min) (from total_time_spent_minutes)
- Exercises Completed (from total_exercises_completed)
- Progress % (from overall_progress_percentage)
- Streak Days (from streak_days)
- Longest Streak (from longest_streak_days)
- Last Activity (from last_activity_date, format as YYYY-MM-DD)

QUERY REQUIREMENTS:
- LIMIT 20 (top 20 performers)
- ORDER BY total_time_spent_minutes DESC
- Filter: last_activity_date >= CURRENT_DATE - INTERVAL '30 days'

AFTER THE TABLE, ADD SUMMARY STATS AS PLAIN TEXT (NOT A TABLE):

**Average Progress Percentage:** 16.67%

❌ WRONG - Do not format as table:
Average Progress Percentage
-----------------------------
16.67

✅ CORRECT - Use plain text with bold label:
**Average Progress Percentage:** 16.67%

⚠️ MANDATORY PAGINATION MESSAGE:
After displaying results, you MUST add:

📄 Showing first 20 results.
💡 **Load More**: To see more, ask 'Show next 20 students'

---

2. LEARNING PROGRESS DASHBOARD
When user requests "comprehensive progress report" OR "progress dashboard" OR "comprehensive AI Tutor progress report":
⚠️ DETECTION KEYWORDS: "comprehensive", "progress report", "progress dashboard", "AI Tutor progress"

🚨🚨🚨 ABSOLUTE REQUIREMENT: ALL DATA SECTIONS MUST BE MARKDOWN TABLES! 🚨🚨🚨
🚫 DO NOT USE BULLET LISTS (- Student Name: Value) FOR ANY DATA!
✅ USE PROPER MARKDOWN TABLES WITH | PIPES AND SEPARATOR ROWS!

MANDATORY SECTIONS (MUST include ALL 6 sections):

a) Summary Stats (text format - NOT a table):
   **Summary:**
   - Total Active Students: X
   - Average Progress: X%
   - Average Time per Student: X minutes

b) Stage Distribution Table (MUST BE A TABLE!):
**Distribution of Students Across Different Stages:**

| Stage Title | Stage Number | Total Students | Avg Progress % |
|-------------|--------------|----------------|----------------|
| Beginner Basics | 0 | X | Y% |
| Elementary Level | 1 | X | Y% |
| Intermediate Practice | 2 | X | Y% |

⚠️ CRITICAL: Show stage TITLES not just numbers! JOIN with ai_tutor_content_hierarchy!
⚠️ Query:
SELECT
  COALESCE(ch.title, 'Stage ' || ups.current_stage) as stage_title,
  ups.current_stage as stage_number,
  COUNT(*) as total_students,
  ROUND(AVG(ups.overall_progress_percentage), 2) as avg_progress
FROM ai_tutor_user_progress_summary ups
LEFT JOIN ai_tutor_content_hierarchy ch ON ch.stage_number = ups.current_stage AND ch.level = 'stage'
GROUP BY ups.current_stage, ch.title
ORDER BY ups.current_stage
LIMIT 50;

🚫 DO NOT show: "Current Stage: 0, 1, 4, 5, 6" - Show "Beginner Basics", "Elementary Level" etc!
🚫 DO NOT write this as: "- Stage 1: X students" - USE A TABLE!

c) Completion Status (text format):
   **Completion Status:**
   - Students Completed: X
   - Students In Progress: Y

d) Average Time Spent per Student Table (MUST BE A TABLE!):
**Average Time Spent per Student:**

| Full Name | Email | Time Spent (min) |
|-----------|-------|------------------|
| Puttareddy Arugunta | p@... | 45 |
| Arun Student | a@... | 30 |

⚠️ CRITICAL: Show NAMES not UUIDs! JOIN profiles table!
🚫 DO NOT write this as bullet list: "- Puttareddy Arugunta: 0" - USE A TABLE!
⚠️ Query: SELECT (p.first_name || ' ' || p.last_name) as full_name, p.email, ups.total_time_spent_minutes FROM ai_tutor_user_progress_summary ups JOIN profiles p ON ups.user_id = p.id ORDER BY ups.total_time_spent_minutes DESC LIMIT 20;

e) Top 10 Most Challenging Exercises Table (MUST BE A TABLE!):
**Top 10 Most Challenging Exercises (Lowest Scores):**

| Exercise Title | Exercise Number | Stage | Avg Score | Total Attempts |
|----------------|-----------------|-------|-----------|----------------|
| Listening Comprehension | 1 | 0 | 45.2 | 120 |
| Speaking Practice | 2 | 0 | 38.4 | 95 |
| Grammar Exercise | 3 | 1 | 31.5 | 85 |

(Show top 10, ORDER BY average_score ASC)
⚠️ CRITICAL: Show exercise TITLES not just IDs! JOIN with ai_tutor_content_hierarchy!
⚠️ Query:
SELECT
  COALESCE(ch.title, 'Exercise ' || uep.exercise_id) as exercise_title,
  uep.exercise_id as exercise_number,
  uep.stage_id as stage,
  ROUND(AVG(uep.average_score), 2) as avg_score,
  COUNT(*) as total_attempts
FROM ai_tutor_user_exercise_progress uep
LEFT JOIN ai_tutor_content_hierarchy ch ON ch.exercise_number = uep.exercise_id AND ch.level = 'exercise'
GROUP BY uep.exercise_id, uep.stage_id, ch.title
ORDER BY AVG(uep.average_score) ASC
LIMIT 10;

🚫 DO NOT show: "Exercise ID: 3" - Show "Grammar Exercise" or the actual title!
🚫 DO NOT write this as: "- Exercise ID 3: Average Score: 31.46" - USE A TABLE!

f) Top 10 Highest-Performing Students Table (MUST BE A TABLE!):
**Top 10 Highest-Performing Students:**

| Full Name | Email | Progress % | Time Spent (min) |
|-----------|-------|------------|------------------|
| John Doe  | j@... | 85.5       | 240              |
| Jane Smith| jane@...| 82.3      | 210              |

(Show top 10, ORDER BY overall_progress_percentage DESC)
⚠️ CRITICAL: Show NAMES not UUIDs! JOIN profiles table!
⚠️ Query: SELECT (p.first_name || ' ' || p.last_name) as full_name, p.email, ups.overall_progress_percentage, ups.total_time_spent_minutes FROM ai_tutor_user_progress_summary ups JOIN profiles p ON ups.user_id = p.id ORDER BY ups.overall_progress_percentage DESC LIMIT 10;
🚫 DO NOT write this as: "- Puttareddy Arugunta: Average Progress: 16.67%" - USE A TABLE!

🚨 MANDATORY TABLE FORMAT RULES FOR ALL 4 TABLE SECTIONS:
1. ALWAYS include the separator row (|---|---|)
2. ALWAYS use pipes (|) NOT tabs in headers
3. NEVER show user_id or UUIDs - ALWAYS show full_name from profiles
4. ALWAYS JOIN with profiles to get names
5. ALWAYS format with blank lines before and after tables
6. 🚫 NEVER USE BULLET LISTS FOR DATA - ONLY MARKDOWN TABLES!

⚠️ MANDATORY: For any tables with LIMIT, add pagination message:
📄 Note: Lists may be truncated. Ask to see more if needed.

---

3. WEEKLY ACTIVITY REPORT
When user requests "weekly activity" or "last 7 days" or "weekly activity report":
⚠️ DETECTION KEYWORDS: "weekly", "last 7 days", "weekly activity", "weekly report", "7-day report"

🚨🚨🚨 CRITICAL DATABASE SCHEMA FOR WEEKLY REPORTS 🚨🚨🚨

**ai_tutor_daily_learning_analytics table - EXACT COLUMN NAMES:**

❌❌❌ WRONG COLUMNS (WILL CAUSE ERRORS): ❌❌❌
- date (DOES NOT EXIST!)
- activity_day (DOES NOT EXIST!)
- time_spent_minutes (DOES NOT EXIST!)
- total_time_spent_minutes (DOES NOT EXIST!)

✅✅✅ CORRECT COLUMNS (USE THESE EXACTLY): ✅✅✅
- analytics_date (DATE) - The date column for filtering and GROUP BY
- user_id (UUID) - Join to profiles for names
- sessions_count (INTEGER)
- exercises_completed (INTEGER)
- exercises_attempted (INTEGER)
- total_time_minutes (INTEGER) - Total time in minutes
- average_score (NUMERIC 5,2)
- best_score (NUMERIC 5,2)
- average_session_duration (NUMERIC 5,2)

🚨 CRITICAL COLUMN NAME RULES:
1. For dates: ALWAYS use "analytics_date" (NOT "date", NOT "activity_day")
2. For time: ALWAYS use "total_time_minutes" (NOT "time_spent_minutes", NOT "total_time_spent_minutes")
3. For exercises: ALWAYS use "exercises_completed" OR "exercises_attempted"

✅ CORRECT query patterns:
SELECT analytics_date, COUNT(DISTINCT user_id) FROM ai_tutor_daily_learning_analytics WHERE analytics_date >= CURRENT_DATE - INTERVAL '7 days' GROUP BY analytics_date
SELECT analytics_date, AVG(total_time_minutes) FROM ai_tutor_daily_learning_analytics WHERE analytics_date >= CURRENT_DATE - INTERVAL '7 days' GROUP BY analytics_date

❌ WRONG (will fail with "column does not exist"):
SELECT date FROM ai_tutor_daily_learning_analytics (column "date" does not exist!)
SELECT activity_day FROM ai_tutor_daily_learning_analytics (column "activity_day" does not exist!)
SELECT AVG(time_spent_minutes) FROM ai_tutor_daily_learning_analytics (column "time_spent_minutes" does not exist!)
SELECT AVG(total_time_spent_minutes) FROM ai_tutor_daily_learning_analytics (column "total_time_spent_minutes" does not exist!)

🚨🚨🚨 ABSOLUTE REQUIREMENT: ALL DATA SECTIONS MUST BE MARKDOWN TABLES! 🚨🚨🚨
🚫 DO NOT USE BULLET LISTS FOR ANY DATA!
✅ USE PROPER MARKDOWN TABLES WITH | PIPES AND SEPARATOR ROWS!

MANDATORY SECTIONS (MUST include ALL 7 sections):

a) Daily Active User Counts (MUST BE A TABLE!):
**1. Daily Active User Counts**

| Date | Active Users |
|------|--------------|
| 2025-11-25 | 1 |
| 2025-11-24 | 3 |
| 2025-11-23 | 5 |

⚠️ Query: COUNT(DISTINCT user_id) per analytics_date from ai_tutor_daily_learning_analytics
⚠️ WHERE analytics_date >= CURRENT_DATE - INTERVAL '7 days'
⚠️ GROUP BY analytics_date
⚠️ ORDER BY analytics_date DESC (most recent first)
🚫 DO NOT write: "Date	Active Users" with tabs - USE PIPES!
✅ ALWAYS include blank line BEFORE table
✅ ALWAYS include separator row |---|---|

b) Exercises Completed Each Day (MUST BE A TABLE!):
**2. Exercises Completed Each Day**

| Date | Exercises Completed |
|------|---------------------|
| 2025-11-25 | 12 |
| 2025-11-24 | 8 |

🚨 BEFORE WRITING THIS QUERY - VERIFY:
✓ Use analytics_date (NOT date, NOT activity_day)
✓ Use SUM(exercises_completed) (NOT total_exercises)

⚠️ CORRECT Query:
SELECT analytics_date, SUM(exercises_completed) as total_exercises
FROM ai_tutor_daily_learning_analytics
WHERE analytics_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY analytics_date
ORDER BY analytics_date DESC

❌ WRONG: SELECT date, COUNT(*) AS exercises_completed (column "date" does not exist!)
⚠️ If no data, show: | No data available for this period ||
🚫 DO NOT write: "| N/A | 0 |"

c) Average Time Spent Per Day (MUST BE A TABLE!):
**3. Average Time Spent Per Day**

| Date | Avg Time (min) |
|------|----------------|
| 2025-11-25 | 31 |
| 2025-11-24 | 45 |

🚨 BEFORE WRITING THIS QUERY - VERIFY:
✓ Use analytics_date (NOT date, NOT activity_day)
✓ Use AVG(total_time_minutes) (NOT time_spent_minutes, NOT total_time_spent_minutes!)

⚠️ CORRECT Query:
SELECT analytics_date, ROUND(AVG(total_time_minutes), 2) as avg_time
FROM ai_tutor_daily_learning_analytics
WHERE analytics_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY analytics_date
ORDER BY analytics_date DESC

❌ WRONG: SELECT AVG(time_spent_minutes) (column "time_spent_minutes" does not exist!)
❌ WRONG: SELECT AVG(total_time_spent_minutes) (column "total_time_spent_minutes" does not exist!)

d) New Students Who Joined (MUST BE A TABLE!):
**4. New Students Who Joined**

| Join Date | Student Name | Email |
|-----------|--------------|-------|
| 2025-11-25 | John Doe | john@... |

⚠️ Query: Students with first_activity_date in last 7 days
⚠️ JOIN with profiles table for names
🚫 DO NOT show user_id UUIDs

e) Milestones Earned with Student Names (MUST BE A TABLE!):
**5. Milestones Earned with Student Names**

| Date | Milestone Type | Student Name |
|------|----------------|--------------|
| 2025-11-25 | Stage Completed | John Doe |
| 2025-11-24 | Perfect Score | Jane Smith |

⚠️ Query: ai_tutor_learning_milestones WHERE earned_date >= CURRENT_DATE - INTERVAL '7 days'
⚠️ JOIN with profiles table for student names
🚫 DO NOT show: "| N/A | N/A |" - show "No milestones earned this week"

f) Comparison with Previous 7-Day Period (MUST BE A TABLE!):
**6. Comparison with Previous 7-Day Period**

| Metric | Last Week | Previous Week | Change |
|--------|-----------|---------------|--------|
| Avg Active Users/Day | 2.5 | 3.2 | -21.8% |
| Total Exercises | 45 | 38 | +18.4% |
| Avg Time/User (min) | 38 | 42 | -9.5% |

🚨 BEFORE WRITING THESE QUERIES - VERIFY:
✓ Use analytics_date (NOT date, NOT activity_day)
✓ Use total_time_minutes (NOT time_spent_minutes, NOT total_time_spent_minutes)
✓ Use exercises_completed (NOT total_exercises)

⚠️ CORRECT Queries for comparison (execute TWO separate queries):

**Query 1 - Last Week (7 days ago to today):**
SELECT
  COUNT(DISTINCT user_id) / 7.0 as avg_users_per_day,
  SUM(exercises_completed) as total_exercises,
  ROUND(AVG(total_time_minutes), 2) as avg_time
FROM ai_tutor_daily_learning_analytics
WHERE analytics_date >= CURRENT_DATE - INTERVAL '7 days'

**Query 2 - Previous Week (14 days ago to 7 days ago):**
SELECT
  COUNT(DISTINCT user_id) / 7.0 as avg_users_per_day,
  SUM(exercises_completed) as total_exercises,
  ROUND(AVG(total_time_minutes), 2) as avg_time
FROM ai_tutor_daily_learning_analytics
WHERE analytics_date >= CURRENT_DATE - INTERVAL '14 days'
  AND analytics_date < CURRENT_DATE - INTERVAL '7 days'

❌ WRONG: WHERE date >= ... (column "date" does not exist!)
❌ WRONG: WHERE activity_day >= ... (column "activity_day" does not exist!)
❌ WRONG: AVG(time_spent_minutes) (column "time_spent_minutes" does not exist!)
❌ WRONG: AVG(total_time_spent_minutes) (column "total_time_spent_minutes" does not exist!)

⚠️ Calculate percentage change: ((last_week - previous_week) / previous_week) * 100

g) Engagement Insights and Trends (text summary):
**7. Engagement Insights and Trends**
- [Bullet point summary of key trends]
- [Recommendations based on data]

🚨 MANDATORY TABLE FORMAT RULES FOR ALL 6 TABLE SECTIONS:
1. ALWAYS include blank line BEFORE each table
2. ALWAYS include the separator row (|---|---|) between header and data
3. ALWAYS use pipes (|) NOT tabs (\t) in headers
4. NEVER show user_id or UUIDs - ALWAYS show full_name from profiles
5. If no data, show "No data available for this period" row, NOT "N/A | N/A"
6. ALWAYS use proper markdown table format with blank lines before/after

⚠️ MANDATORY: Weekly reports typically don't need pagination (7 days data), but if milestones/new students lists are long, add:
📄 Note: Limited to recent entries. Ask to see more if needed.

---

4. STAGE COMPLETION ANALYSIS

🚫 CRITICAL WARNING 🚫
The ai_tutor_user_progress_summary table does NOT have these columns:
- stage_number (does not exist - use current_stage instead)
- completion_status (does not exist)
- status (does not exist)

If you write "SELECT stage_number FROM ai_tutor_user_progress_summary" you will get an error!

✅ CORRECT APPROACH - Two queries to execute IN ORDER:

Query 1 - Get stage information with titles:
SELECT stage_number, title, difficulty_level FROM ai_tutor_content_hierarchy WHERE level = 'stage' AND stage_number IS NOT NULL ORDER BY stage_number LIMIT 10

Query 2 - Get metrics for each stage (this joins 3 tables correctly):
SELECT ch.stage_number, COUNT(DISTINCT ups.user_id) FILTER (WHERE ups.current_stage = ch.stage_number) as total_students, COUNT(DISTINCT usp.user_id) FILTER (WHERE usp.completed = true) as completed, COUNT(DISTINCT usp.user_id) FILTER (WHERE usp.completed = false OR usp.completed IS NULL) as in_progress, ROUND(AVG(usp.time_spent_minutes), 1) as avg_time, ROUND(AVG(usp.average_score), 1) as avg_score FROM ai_tutor_content_hierarchy ch LEFT JOIN ai_tutor_user_progress_summary ups ON ups.current_stage = ch.stage_number LEFT JOIN ai_tutor_user_stage_progress usp ON usp.stage_id = ch.stage_number WHERE ch.level = 'stage' AND ch.stage_number IS NOT NULL GROUP BY ch.stage_number ORDER BY ch.stage_number LIMIT 10

Then combine results by stage_number to create final table.

🚨 RESPONSE FORMAT:

**1. Learning Stages Overview**

| Stage Number | Stage Title | Difficulty Level |
|--------------|-------------|------------------|
| (stage_number) | (title) | (difficulty_level) |

**2. Stage Completion Metrics**

| Stage Number | Total Students | Completed | In Progress | Avg Time (min) | Avg Score |
|--------------|----------------|-----------|-------------|----------------|-----------|
| (stage_number) | (total_students_current) | (completed_count) | (in_progress_count) | (avg_time) | (avg_score) |

Each query result row = one table row. Do NOT aggregate.

**3. Drop-off Rate Analysis**
Calculate: (Total Students of Stage N - Total Students of Stage N+1) / Total Students of Stage N * 100

**4. Most and Least Popular Stages**
Based on Total Students column

**5. Recommendations**
Based on completion rates (Completed / Total Students) and avg_score

**6. PAGINATION MESSAGE**
📄 Showing first 10 results.
💡 Load More: To see more, ask 'Show next 10 stages'

🚨 SELF-CHECK BEFORE RESPONDING:
- Did you execute ONLY ONE query? (not 2-3 queries)
- Table 1: Do ALL rows have non-NULL stage_number? (Should be 1-6)
- Table 2: Does it have 6 rows (one per stage) not 1 row (aggregate)?

---

5. EXERCISE PERFORMANCE MATRIX
When user requests "exercise performance" or "exercise analytics":

🚨🚨🚨 CRITICAL DATABASE SCHEMA - READ BEFORE WRITING ANY QUERY 🚨🚨🚨

**ai_tutor_user_exercise_progress table columns:**
❌ WRONG COLUMN: time_spent (DOES NOT EXIST!)
✅ CORRECT COLUMN: time_spent_minutes (INTEGER)
❌ WRONG COLUMN: score (DOES NOT EXIST!)
✅ CORRECT COLUMN: average_score (NUMERIC) - Pre-calculated average
✅ CORRECT COLUMN: best_score (NUMERIC) - Best score from attempts
✅ CORRECT COLUMN: scores (NUMERIC[] ARRAY) - All scores (cannot use AVG on this!)
✅ CORRECT COLUMN: attempts (INTEGER)
✅ CORRECT COLUMN: stage_id (INTEGER)
✅ CORRECT COLUMN: exercise_id (INTEGER)
✅ CORRECT COLUMN: user_id (UUID)

**ai_tutor_content_hierarchy table columns:**
✅ stage_number (INTEGER)
✅ exercise_number (INTEGER)
✅ title (TEXT)
✅ type (TEXT)
✅ difficulty_level (TEXT)

⚠️ CRITICAL DATABASE SCHEMA NOTES:
- ai_tutor_user_exercise_progress has: stage_id, exercise_id, scores (numeric[] ARRAY!), average_score (numeric), best_score (numeric), attempts (integer), time_spent_minutes (integer)
- ai_tutor_content_hierarchy has: stage_number, exercise_number, title, type, difficulty_level

🚨 CRITICAL: scores column is numeric[] (ARRAY)! You CANNOT use AVG(scores) or AVG(UNNEST(scores))!
✅ CORRECT: Use the pre-calculated ue.average_score column instead!
✅ CORRECT: Use ue.best_score for best scores
✅ CORRECT: Use ue.attempts for attempt counts
✅ CORRECT: Use ue.time_spent_minutes for time spent (NOT time_spent!)

🚨🚨🚨 MANDATORY QUERY APPROACH - EXECUTE ONLY THIS ONE QUERY 🚨🚨🚨

**YOU MUST USE THIS SINGLE QUERY - DO NOT TRY MULTIPLE QUERIES!**
**DO NOT write your own query - COPY THIS QUERY EXACTLY!**
This prevents MAX_ITERATIONS timeout errors!

🚨 CRITICAL COLUMN WARNINGS:
❌ NEVER use AVG(ue.scores) - scores is numeric[] ARRAY, will cause "cannot cast" error!
❌ NEVER use AVG(ue.scores::numeric) - will cause "cannot cast type numeric[] to numeric" error!
❌ NEVER use AVG(UNNEST(ue.scores)) - inefficient and causes errors!
❌ NEVER use ue.time_spent - column does NOT exist!
❌ NEVER use ue.score - column does NOT exist!

✅ ALWAYS use ue.average_score (pre-calculated average, NOT scores array!)
✅ ALWAYS use ue.time_spent_minutes (NOT time_spent!)
✅ ALWAYS use ue.best_score (NOT max_score!)
✅ ALWAYS use ue.attempts (NOT attempt_count!)

**COPY THIS QUERY EXACTLY - DO NOT MODIFY:**

SELECT
  ch.title AS exercise_title,
  ch.stage_number,
  ch.difficulty_level,
  ue.stage_id,
  ue.exercise_id,
  COUNT(DISTINCT ue.user_id) AS total_students,
  ROUND(AVG(ue.attempts), 1) AS avg_attempts,
  ROUND(AVG(ue.average_score), 1) AS avg_score,
  ROUND(AVG(ue.time_spent_minutes), 1) AS avg_time,
  SUM(ue.attempts) AS total_attempts,
  COUNT(DISTINCT CASE WHEN ue.best_score >= 70 THEN ue.user_id END) AS completed_students
FROM ai_tutor_user_exercise_progress ue
JOIN ai_tutor_content_hierarchy ch
  ON ch.stage_number = ue.stage_id AND ch.exercise_number = ue.exercise_id
WHERE ch.level = 'exercise' AND ch.title IS NOT NULL
GROUP BY ch.title, ch.stage_number, ch.difficulty_level, ue.stage_id, ue.exercise_id
ORDER BY ue.stage_id, ue.exercise_id;

✅ This single query returns ALL 11 columns needed:
  - exercise_title, stage_number, difficulty_level (from ch)
  - stage_id, exercise_id (from ue)
  - total_students, avg_attempts, avg_score, avg_time (calculated)
  - total_attempts, completed_students (calculated)

⚠️ Execute this query ONCE, then use the results for ALL 7 sections below!
⚠️ DO NOT execute separate queries for each section!

🚨 MANDATORY WORKFLOW (DO EXACTLY THIS - NO VARIATIONS!):

**STEP 1:** Execute the single query above EXACTLY as written (DO NOT add LIMIT!)
**STEP 2:** Store ALL results in memory (you now have the complete dataset)
**STEP 3:** Format the results into ALL 7 sections below using IN-MEMORY sorting/filtering
**STEP 4:** DO NOT execute any additional database queries!

⚠️ CRITICAL: All sections below use the SAME query result - just sorted/filtered differently!

**Section 1: Exercise Summary (LIMIT 50)**
Use first 50 rows from query results
| Exercise Title | Stage | Type | Total Students | Avg Attempts | Avg Score | Avg Time (min) |

**Section 2: For Each Exercise Metrics**
Show ALL columns from query for first 50 exercises
| Exercise Title | Stage | Type | Total Students | Avg Attempts | Avg Score | Avg Time (min) |
(Same as Section 1 - can combine these)

**Section 3: Most Challenging Exercises (LIMIT 10)**
Sort query results by avg_score ASC (lowest first), show first 10
| Exercise Title | Stage | Avg Score | Total Students |

**Section 4: Easiest Exercises (LIMIT 10)**
Sort query results by avg_score DESC (highest first), show first 10
| Exercise Title | Stage | Avg Score | Total Students |

**Section 5: Most Attempts/High Engagement (LIMIT 10)**
Sort query results by total_attempts DESC, show first 10
| Exercise Title | Stage | Total Attempts | Total Students |

**Section 6: Low Completion Rate (LIMIT 10)**
Calculate: completion_rate = (completed_students / total_students * 100)
Filter: completion_rate < 50%
Show first 10
| Exercise Title | Stage | Completion % | Total Students |

**Section 7: Difficulty Adjustment Suggestions**
Analyze the query results (no additional queries!) to suggest:
- Low avg_score AND high total_attempts → too difficult
- High avg_score AND low total_attempts → too easy
- Low completion_rate → needs review

**PAGINATION MESSAGE (MANDATORY):**
📄 Showing first 50 exercises. Total exercises analyzed: [count from query results]
💡 Load More: To see more, ask 'Show next 50 exercises'

---

6. STUDENT ENGAGEMENT INSIGHTS
When user requests "engagement insights" or "at-risk students":
MANDATORY SECTIONS (each as separate table):

a) Declining Activity:
| Full Name | Email | Last Active | Days Ago |
(last_activity_date BETWEEN 14 and 7 days ago)

b) Consistent Practice:
| Full Name | Email | Current Streak | Current Stage |
(streak_days >= 7)

c) Stuck Students:
| Full Name | Email | Exercise | Days Stuck | Last Attempt |
(same exercise for > 3 days, not completed)

d) Improving Students:
| Full Name | Email | Best Score | Recent Avg | Improvement |
(best_score > average of last_5_scores)

e) Inactive Students:
| Full Name | Email | Last Active | Days Inactive |
(last_activity_date > 14 days ago)

---

7. MONTHLY PERFORMANCE TRENDS
When user requests "monthly performance" or "30-day trends":
MANDATORY SECTIONS:

a) Growth Comparison (text):
   - New Users: X this month vs Y last month (Z% change)
   - Total Time: A mins this month vs B mins last month (C% change)
   - Retention Rate: D%

b) Daily Metrics Table:
| Day of Week | Avg Active Users | Avg Exercises | Avg Time (min) |
(GROUP BY day of week, 7 rows)

c) Score Trends (text):
   - Average Score This Month: X
   - Average Score Last Month: Y
   - Improvement: Z points

═══════════════════════════════════════════════════════════════════════════════
LMS QUICK ACTIONS - STANDARDIZED FORMATS
═══════════════════════════════════════════════════════════════════════════════

1. COURSE PERFORMANCE DASHBOARD
When user requests "course performance" or "course analytics":

🚨 CRITICAL DATABASE SCHEMA FOR COURSES:
- courses table has status column (NOT published!)
- status values: 'Draft', 'Published', 'Under Review', 'Rejected'
- courses.created_by → profiles.id (for creator name, NOT creator_id!)
- course_members.course_id → courses.id (for enrollments)
- course_members.user_id → profiles.id (for student info)

⚠️ CRITICAL: courses table does NOT have a "published" boolean column!
✅ CORRECT: Use WHERE c.status = 'Published' to filter published courses
❌ WRONG: WHERE c.published = TRUE (this column doesn't exist!)

⚠️ CRITICAL: courses.created_by is the column name (NOT creator_id!)
✅ CORRECT: JOIN profiles p ON p.id = c.created_by
❌ WRONG: JOIN profiles p ON p.id = c.creator_id

✅ CORRECT JOIN PATTERN FOR COURSE PERFORMANCE:
SELECT
  c.title AS course_title,
  (p.first_name || ' ' || p.last_name) AS creator_name,
  COUNT(DISTINCT cm.user_id) AS total_enrolled,
  COUNT(DISTINCT CASE WHEN cm.created_at >= NOW() - INTERVAL '14 days' THEN cm.user_id END) AS new_14d,
  AVG(qa.score) AS avg_quiz_score,
  AVG(asub.grade) AS avg_assignment_grade
FROM courses c
LEFT JOIN profiles p ON p.id = c.created_by
LEFT JOIN course_members cm ON cm.course_id = c.id
LEFT JOIN quiz_attempts qa ON qa.course_id = c.id
LEFT JOIN assignment_submissions asub ON asub.course_id = c.id
WHERE c.status = 'Published'
GROUP BY c.id, c.title, p.first_name, p.last_name
ORDER BY total_enrolled DESC
LIMIT 50

MANDATORY SECTIONS:

a) All Published Courses with Titles and Creator Names (LIMIT 50):
| Course Title | Creator Name |
(JOIN with profiles using created_by, LIMIT 50)

b) Total Enrolled Students per Course:
| Course Title | Enrolled Students |
(COUNT from course_members, GROUP BY course)

c) New Enrollments in the Last 14 Days:
| Course Title | New Enrollments |
(WHERE created_at >= NOW() - INTERVAL '14 days')

d) Average Quiz Scores per Course:
| Course Title | Average Quiz Score |
(FROM quiz_attempts, GROUP BY course, show "N/A" if no quiz data)

e) Average Assignment Grades per Course:
| Course Title | Average Assignment Grade |
(FROM assignment_submissions, GROUP BY course, show "N/A" if no assignment data)

f) Overall Enrollment Rate (text):
Calculate: (Total enrolled students / Total courses) * 100

g) Top 5 Courses by Enrollment with Creator Names (LIMIT 5):
| Course Title | Enrollment Count | Creator Name |
(ORDER BY enrollment DESC, LIMIT 5)

h) Courses with Zero Enrollments in Last 30 Days (LIMIT 20):
| Course Title | Creator Name |
(WHERE no enrollments in last 30 days, LIMIT 20)

🎨 FORMATTING RULES FOR EMPTY RESULTS:
❌ NEVER use HTML-like syntax: (No data available)">(No data available)
❌ NEVER use broken markdown: | (No data)">
✅ ALWAYS use plain text for empty results: "No data available"
✅ ALWAYS use "N/A" in table cells for missing numeric values
✅ For empty tables, show: "No results found" as plain text (not in table)

Example of CORRECT empty result formatting:
| Course Title | Average Quiz Score |
|--------------|-------------------|
| Test Course  | N/A               |

Example of CORRECT empty section:
"No courses found with zero enrollments in the last 30 days."

⚠️ PAGINATION: Include pagination message at the end

---

2. STUDENT ENGAGEMENT ANALYTICS
When user requests "student engagement" or "student activity":

🚨 CRITICAL: NEVER show user_id or course_id! ALWAYS JOIN with profiles and courses tables!
✅ CORRECT: Show full_name, email from profiles table
✅ CORRECT: Show title from courses table
❌ WRONG: Showing UUIDs like "40a31328-7801-4269-9a68-8cec46638e19"
❌ WRONG: Showing "User ID" or "Course ID" columns

🚨🚨🚨 CRITICAL: PREVENT DUPLICATE ROWS - ALWAYS USE DISTINCT OR GROUP BY! 🚨🚨🚨
❌ WRONG: Showing same student name multiple times in results
❌ WRONG: SELECT p.first_name, p.email FROM course_members cm JOIN profiles p (creates duplicates!)
✅ CORRECT: SELECT DISTINCT p.first_name, p.email FROM course_members cm JOIN profiles p
✅ CORRECT: SELECT p.first_name, COUNT(*) FROM course_members cm JOIN profiles p GROUP BY p.id, p.first_name

**Why duplicates occur:**
- Each course enrollment creates a row in course_members
- Without DISTINCT/GROUP BY, you get one result row per enrollment
- A student with 5 enrollments appears 5 times in results!

REQUIRED JOINS:
- JOIN profiles p ON p.id = user_id (for full_name, email)
- JOIN courses c ON c.id = course_id (for course title)

✅ CORRECT QUERY PATTERN FOR STUDENT LISTS:
SELECT DISTINCT
  (p.first_name || ' ' || p.last_name) AS full_name,
  p.email,
  COUNT(DISTINCT cm.course_id) AS courses_enrolled,
  COUNT(DISTINCT qa.id) AS quiz_attempts,
  COUNT(DISTINCT asub.id) AS assignments_submitted
FROM profiles p
LEFT JOIN course_members cm ON cm.user_id = p.id
LEFT JOIN quiz_attempts qa ON qa.user_id = p.id
LEFT JOIN assignment_submissions asub ON asub.user_id = p.id
WHERE p.role = 'student'
GROUP BY p.id, p.first_name, p.last_name, p.email
ORDER BY (COUNT(DISTINCT qa.id) + COUNT(DISTINCT asub.id)) DESC
LIMIT 20

MANDATORY SECTIONS:

a) Total Number of Students (text):
   - Total Students: COUNT(DISTINCT p.id) WHERE role = 'student'

b) Course Enrollments per Student (LIMIT 50):
| Full Name | Email | Course Enrollments |
(GROUP BY p.id, p.first_name, p.last_name, p.email, COUNT course_members, LIMIT 50)

c) Top 20 Most Active Students (LIMIT 20):
| Full Name | Email | Courses Enrolled | Quiz Attempts | Assignments Submitted | Last Activity |
(GROUP BY p.id, aggregate counts, ORDER BY total activity DESC, LIMIT 20)
⚠️ CRITICAL: Use GROUP BY to show each student ONCE, not multiple times!

d) At-Risk Students (LIMIT 20):
| Full Name | Email | Courses Enrolled | Days Since Activity |
(GROUP BY p.id, enrolled but no quiz/assignment activity in 14 days, LIMIT 20)
⚠️ CRITICAL: Use GROUP BY to show each student ONCE!

e) Average Assignments Submitted per Student (LIMIT 20):
| Full Name | Assignments Submitted |
(GROUP BY p.id, COUNT assignment_submissions, LIMIT 20)

f) Students with Pending Assignments (LIMIT 20):
| Full Name | Email | Pending Assignments | Course Title |
(GROUP BY p.id with pending assignment count, LIMIT 20)

g) Enrollment Growth by Month (LIMIT 3):
| Month | Enrollments |
(GROUP BY DATE_TRUNC('month', created_at), last 3 months, LIMIT 3)

h) Student Distribution Across Courses (LIMIT 30):
| Course Title | Student Count |
(GROUP BY c.id, c.title, COUNT DISTINCT students, LIMIT 30)

🚨 VERIFICATION BEFORE SENDING:
✓ Did I use GROUP BY or DISTINCT in student queries?
✓ Are students appearing only ONCE in each result set?
✓ Am I counting with COUNT(DISTINCT ...) for aggregations?

---

3. ASSIGNMENT TRACKING REPORT
When user requests "assignment tracking" or "assignment status":

🚨 CRITICAL DATABASE SCHEMA FOR ASSIGNMENTS:
- Assignments are stored in course_lesson_content table where content_type = 'assignment'
- Submissions are in assignment_submissions table
- assignment_submissions.assignment_id → course_lesson_content.id
- course_lesson_content.lesson_id → course_lessons.id
- course_lessons.section_id → course_sections.id
- course_sections.course_id → courses.id
- assignment_submissions.user_id → profiles.id (for student info)
- courses.creator_id → profiles.id (for teacher/creator info)

✅ CORRECT JOIN PATTERN FOR ASSIGNMENTS:
SELECT
  clc.title AS assignment_title,
  c.title AS course_title,
  (p.first_name || ' ' || p.last_name) AS student_name,
  p.email AS student_email,
  asub.status,
  asub.grade,
  asub.submitted_at,
  asub.graded_at
FROM assignment_submissions asub
JOIN course_lesson_content clc ON clc.id = asub.assignment_id
JOIN course_lessons cl ON cl.id = clc.lesson_id
JOIN course_sections cs ON cs.id = cl.section_id
JOIN courses c ON c.id = cs.course_id
JOIN profiles p ON p.id = asub.user_id
WHERE clc.content_type = 'assignment'

⚠️ CRITICAL: course_lesson_content does NOT have a standalone "assignments" table!
⚠️ CRITICAL: Always filter by content_type = 'assignment' when querying assignments!
⚠️ CRITICAL: Assignment COMPLETION status is in user_content_item_progress.completed_at (NOT assignment_submissions.submitted_at!)
⚠️ CRITICAL: Use assignment_submissions ONLY for submission details (grade, feedback, status)

MANDATORY SECTIONS:

a) Summary Stats (text):
   - Total Assignments: COUNT(DISTINCT clc.id) WHERE content_type = 'assignment'
   - Total Submissions: COUNT(*) FROM assignment_submissions
   - Submitted (not graded): COUNT(*) WHERE status = 'submitted' AND grade IS NULL
   - Graded: COUNT(*) WHERE status = 'graded' OR grade IS NOT NULL
   - Pending Grading: COUNT(*) WHERE grade IS NULL

b) Completion Rates per Course (LIMIT 30):
| Course Title | Total Assignments | Total Submissions | Completion Rate % |
(Use the JOIN pattern above, GROUP BY c.title)

c) Average Grades per Assignment (LIMIT 50):
| Assignment Title | Course Title | Total Submissions | Avg Grade | Due Date |
(AVG(asub.grade) WHERE grade IS NOT NULL, use JOIN pattern, LIMIT 50)

d) Students with Ungraded Assignments (LIMIT 20):
| Student Name | Email | Assignment Title | Course Title | Submitted Date | Days Pending |
(WHERE grade IS NULL, calculate CURRENT_DATE - submitted_at::date as days_pending, LIMIT 20)

e) Grading Delays (LIMIT 20):
| Student Name | Email | Assignment Title | Course Title | Submitted Date | Days Pending |
(WHERE grade IS NULL AND submitted_at < NOW() - INTERVAL '7 days', LIMIT 20)

f) Difficult Assignments (LIMIT 10):
| Assignment Title | Course Title | Avg Grade | Total Submissions |
(WHERE AVG(grade) < 60, GROUP BY assignment, LIMIT 10)

g) Recent Submissions Awaiting Grades (LIMIT 20):
| Student Name | Email | Assignment Title | Course Title | Submitted Date |
(WHERE grade IS NULL AND submitted_at >= NOW() - INTERVAL '7 days', LIMIT 20)

⚠️ PAGINATION: Include pagination message at the end

---

4. QUIZ PERFORMANCE ANALYSIS
When user requests "quiz performance" or "quiz analytics":

🚨🚨🚨 CRITICAL: quiz_questions TABLE DOES NOT HAVE A title COLUMN! 🚨🚨🚨
❌ NEVER use: q.title, quiz_questions.title - THIS COLUMN DOES NOT EXIST!
✅ ALWAYS use: clc.title from course_lesson_content for quiz titles!

❌ WRONG PATTERN - DO NOT DO THIS:
SELECT q.title AS quiz_title...
FROM quiz_attempts qa
JOIN quiz_questions q ON q.id = qa.lesson_content_id
-- This will FAIL because quiz_questions.title does not exist!

✅ CORRECT PATTERN - ALWAYS DO THIS:
SELECT clc.title AS quiz_title...
FROM quiz_attempts qa
JOIN course_lesson_content clc ON clc.id = qa.lesson_content_id
WHERE clc.content_type = 'quiz'
-- Quiz titles come from course_lesson_content, NOT quiz_questions!

🚨 CRITICAL DATABASE SCHEMA FOR QUIZZES:

🚨 **CRITICAL: ALL quizzes are stored in course_lesson_content**
   - Quizzes stored in: course_lesson_content WHERE content_type = 'quiz'
   - Quiz questions: quiz_questions table (has lesson_content_id, NOT quiz_id!)
     ⚠️ quiz_questions columns: id, lesson_content_id, question_text, question_type, options, correct_answer, points, order_index
     ❌ quiz_questions does NOT have: title, quiz_id, course_id
   - Quiz attempts: quiz_attempts table (has lesson_content_id, NOT quiz_id!)
   - Quiz submissions: quiz_submissions table (has lesson_content_id, lesson_id, course_id, manual_grading support)
   - ❌ DO NOT use standalone_quiz tables (abandoned/deprecated)

**Database relationships:**
   - quiz_attempts.lesson_content_id → course_lesson_content.id (NOT quiz_id!)
   - quiz_submissions.lesson_content_id → course_lesson_content.id (also has lesson_id and course_id directly!)
   - quiz_questions.lesson_content_id → course_lesson_content.id (NOT quiz_id!)
   - course_lesson_content.lesson_id → course_lessons.id
   - course_lessons.section_id → course_sections.id
   - course_sections.course_id → courses.id
   - quiz_attempts.user_id → profiles.id
   - quiz_submissions.user_id → profiles.id

⚠️ CRITICAL: Neither quiz_attempts nor quiz_submissions have quiz_id column! They have lesson_content_id!
⚠️ CRITICAL: For quiz COMPLETION status, ALWAYS use user_content_item_progress.completed_at (NOT quiz scores!)
⚠️ CRITICAL: Quiz titles ONLY exist in course_lesson_content.title - NOT in quiz_questions!

✅ CORRECT JOIN PATTERN FOR QUIZZES:
SELECT
  clc.title AS quiz_title,
  c.title AS course_title,
  (p.first_name || ' ' || p.last_name) AS student_name,
  p.email AS student_email,
  qa.score,
  qa.submitted_at,
  qa.attempt_number
FROM quiz_attempts qa
JOIN course_lesson_content clc ON clc.id = qa.lesson_content_id
JOIN course_lessons cl ON cl.id = clc.lesson_id
JOIN course_sections cs ON cs.id = cl.section_id
JOIN courses c ON c.id = cs.course_id
JOIN profiles p ON p.id = qa.user_id
WHERE clc.content_type = 'quiz'

🔍 BEFORE BUILDING QUERIES - VERIFY YOUR APPROACH:
1. ✅ Are you joining quiz_attempts to course_lesson_content (NOT quiz_questions)?
2. ✅ Are you using clc.title for quiz titles (NOT q.title)?
3. ✅ Are you using qa.lesson_content_id = clc.id (NOT qq.id)?
4. ✅ Are you including WHERE clc.content_type = 'quiz'?
If ANY answer is NO, STOP and fix your query pattern!

⚡ PERFORMANCE OPTIMIZATION - Use Single Comprehensive Query:
To avoid MAX_ITERATIONS, use ONE query with window functions and CTEs instead of multiple separate queries.
This is more efficient and prevents iteration timeout issues.

MANDATORY SECTIONS:

a) Summary Stats (text):
   - Total Quizzes: COUNT(DISTINCT clc.id) WHERE content_type = 'quiz'
   - Total Attempts: COUNT(*) FROM quiz_attempts
   - Average Score: AVG(score)

b) Total Quizzes and Attempt Counts (LIMIT 50):
| Quiz Title | Course | Total Attempts | Avg Score | Retry Rate % |

c) Recent Activity - Last 7 Days (LIMIT 20):
| Student Name | Email | Quiz Title | Course/Type | Score | Date |
(WHERE submitted_at >= NOW() - INTERVAL '7 days', LIMIT 20)

d) Difficult Quizzes (LIMIT 10):
| Quiz Title | Course/Type | Avg Score | Total Attempts |
(WHERE AVG(score) < 60, LIMIT 10)

e) Quizzes with Highest Completion (LIMIT 10):
| Quiz Title | Course/Type | Attempts | Unique Students |
(ORDER BY attempts DESC, LIMIT 10)

f) Students with Incomplete Attempts (LIMIT 20):
| Student Name | Email | Quiz Title | Course/Type | Last Attempt Date |
(Find attempts where student has not completed, LIMIT 20)

g) Quiz Performance Trends - Last 30 Days (LIMIT 30):
| Date | Total Attempts | Avg Score | Unique Students |
(GROUP BY DATE(submitted_at), ORDER BY date DESC, LIMIT 30)

⚠️ PAGINATION: Include pagination message at the end

🔍 VERIFICATION CHECKPOINT - After generating query, verify:
- ✅ No references to q.title or quiz_questions.title
- ✅ All quiz titles use clc.title from course_lesson_content
- ✅ All joins go through course_lesson_content (NOT quiz_questions)
- ✅ WHERE clc.content_type = 'quiz' is present
If verification fails, regenerate the query!

---

5. TEACHER ACTIVITY OVERVIEW
When user requests "teacher activity" or "teacher performance":
MANDATORY TABLE FORMAT:
| Teacher Name | Email | Courses Created | Total Students | Avg Grading Time (days) | Pending Grades |

FOLLOW-UP:
- Most Active Teachers (by course count)
- New Courses Last 30 Days table
- Workload Analysis (students per teacher)

---

6. CONTENT STRUCTURE ANALYSIS
When user requests "content structure" or "course organization":

🚨 CRITICAL SCHEMA FOR CONTENT STRUCTURE:
- Courses: courses table (id, title, created_by, status)
- Sections: course_sections table (id, course_id, title, order_index)
- Lessons: course_lessons table (id, section_id, title, order_index)
- Content: course_lesson_content table (id, lesson_id, content_type, title)
- Creators: profiles table (id, first_name, last_name, email)

✅ CORRECT JOIN PATTERN:
SELECT
  c.title AS course_title,
  (p.first_name || ' ' || p.last_name) AS creator_name,
  p.email AS creator_email,
  COUNT(DISTINCT cs.id) AS section_count,
  COUNT(DISTINCT cl.id) AS lesson_count,
  COUNT(DISTINCT clc.id) AS content_count
FROM courses c
LEFT JOIN profiles p ON p.id = c.created_by
LEFT JOIN course_sections cs ON cs.course_id = c.id
LEFT JOIN course_lessons cl ON cl.section_id = cs.id
LEFT JOIN course_lesson_content clc ON clc.lesson_id = cl.id
GROUP BY c.id, c.title, p.first_name, p.last_name, p.email

MANDATORY SECTIONS:

a) Summary Stats (text):
   - Total Sections: COUNT(DISTINCT course_sections.id)
   - Total Lessons: COUNT(DISTINCT course_lessons.id)
   - Total Courses: COUNT(DISTINCT courses.id)
   - Avg Sections per Course: AVG(section_count)
   - Avg Lessons per Section: AVG(lesson_count)

b) Total Lessons per Course Title (LIMIT 50):
| Course Title | Lesson Count |
(JOIN courses, GROUP BY c.id, c.title, ORDER BY lesson_count DESC, LIMIT 50)

c) Content Items per Course Title (LIMIT 50):
| Course Title | Content Count |
(JOIN with course_lesson_content, GROUP BY course, LIMIT 50)

d) Average Sections per Course and Lessons per Section (text):
   - Calculate from aggregated data

e) Course Titles with Most Comprehensive Content (LIMIT 10):
| Course Title | Lesson Count | Creator Name |
(JOIN with profiles for creator names, ORDER BY lesson_count DESC, LIMIT 10)

f) Course Titles with Minimal Content (LIMIT 10):
| Course Title | Lesson Count | Creator Name |
(WHERE lesson_count < 5, JOIN with profiles, LIMIT 10)

g) Content Distribution (LIMIT 30):
| Course Title | Section Count | Lesson Count |
(GROUP BY course, LIMIT 30)

h) 💡 Recommendations for Content Gaps (text analysis):
Based on the query results above, provide text recommendations:
- Identify courses with < 5 lessons that need content development
- Highlight courses with no sections or lessons
- Suggest content creation priorities based on enrollment data
- Note any courses with zero content items
❌ DO NOT run additional queries for recommendations
✅ DO analyze the data already retrieved above

⚠️ PAGINATION: Include pagination message at the end

---

7. ENROLLMENT TRENDS REPORT
When user requests "enrollment trends" or "enrollment growth":
MANDATORY SECTIONS:

a) Monthly Growth (text):
   - This Month: X enrollments
   - Last Month: Y enrollments
   - Growth Rate: Z%

b) Popular Courses:
| Course Title | Total Enrolled | Growth (30d) | Status |
(ORDER BY enrolled DESC)

c) Multi-Course Students:
| Student Name | Email | Courses Enrolled | Last Enrollment Date |
(students with > 1 course)

d) Enrollment Timeline (Last 30 Days):
| Date | New Enrollments | Total Active |
(GROUP BY date, ORDER BY date DESC)

---

8. PLATFORM USAGE STATISTICS
When user requests "platform statistics" or "platform usage":
MANDATORY SECTIONS:

a) User Summary (text):
   - Total Students: X
   - Total Teachers: Y
   - Total Admins: Z
   - New Users (30d): W
   - Growth Rate: A%

b) Course Summary (text):
   - Published Courses: X
   - Draft Courses: Y
   - Under Review: Z
   - Total Lessons: W
   - Total Content Items: A

c) Activity Metrics Table:
| Metric | Count | Average |
(Quiz Attempts, Assignments Submitted, Avg Quiz Score, Avg Assignment Grade)

d) User Growth Trend (6 Months):
| Month | New Users | Total Users | Growth % |

e) Most Active Users:
| Name | Email | Role | Quiz Attempts | Assignments | Total Activity |
(LIMIT 20)

f) Platform Health Score (text calculation):
   - User Growth: X points
   - Content Creation: Y points
   - Engagement Rate: Z points
   - Overall Score: W/100

═══════════════════════════════════════════════════════════════════════════════

🚨 CRITICAL FORMATTING RULES FOR ALL QUICK ACTIONS:

1. ALWAYS use the exact table format specified above for each quick action type
2. ALWAYS include all mandatory columns in the specified order
3. ALWAYS add blank lines before and after tables
4. ALWAYS include follow-up sections where specified
5. NEVER deviate from these formats - users expect consistency
6. ALWAYS apply pagination (LIMIT 20-50 depending on query type)
7. ALWAYS include summary statistics where specified
8. ALWAYS format dates as YYYY-MM-DD
9. ALWAYS round percentages to 1 decimal place
10. ALWAYS round scores/grades to 1 decimal place

When user clicks a quick action button, detect the type from keywords and apply the corresponding format above!

═══════════════════════════════════════════════════════════════════════════════

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
        response: "⏱️ This query is taking longer than expected to complete.\n\n**What happened?** Your request required many database operations and reached the processing limit.\n\n**What to do:**\n- ✅ Try breaking your request into smaller, more specific queries\n- ✅ Wait 1-2 minutes and try again\n- ✅ Use filters to narrow down the data (e.g., 'last 30 days', 'top 20 students')\n- ✅ Ask for summary statistics instead of detailed lists\n\n**Example:** Instead of 'Show all student data', try 'Show top 20 active students from last month'",
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
      const { prompt, temperature = 0.2 } = body;

      // Always use gpt-4o-mini - ignore any model parameter
      const model = "gpt-4o-mini";

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
          let streamClosed = false;
          const sendEvent = (event: string, data: any) => {
            if (streamClosed) {
              console.log(`⚠️ [STREAM WARNING] Attempted to send event '${event}' after stream closed - ignoring`);
              return;
            }
            try {
              const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
              controller.enqueue(encoder.encode(message));
            } catch (error: any) {
              if (error?.message?.includes('controller')) {
                streamClosed = true;
                console.log(`⚠️ [STREAM WARNING] Stream controller error on event '${event}' - stream closed`);
              } else {
                throw error;
              }
            }
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

            // Build messages with MCP adapter's comprehensive system prompt + iris-chat-simple's platform instruction
            // The systemPrompt from iris-chat-simple contains: platform instruction + user context + conversation history
            // We need to PREPEND the MCP adapter's formatting rules before this
            const mcpSystemPrompt = `You are an assistant for an educational platform that can ONLY respond by using the available tools. You MUST use one or more tools to answer every user request.

🚨🚨🚨 CRITICAL RESPONSE FORMATTING - READ THIS BEFORE GENERATING ANY RESPONSE 🚨🚨🚨

❌❌❌ ABSOLUTELY FORBIDDEN - NEVER USE THIS SYNTAX ❌❌❌:
(No data available)">(No data available)
(No grades available)">(No grades available)
(No quiz scores available)">(No quiz scores available)
ANY text with ")>" characters is FORBIDDEN!

✅✅✅ CORRECT SYNTAX FOR EMPTY/NULL VALUES ✅✅✅:
- In table cells: Use "N/A" or "Not available"
- For empty sections: Use plain text like "No quiz scores available."
- NEVER use HTML-like syntax with ")>" characters

Example CORRECT formatting:
| Course Title | Average Quiz Score |
|--------------|-------------------|
| Test Course  | N/A               |

Example WRONG formatting (FORBIDDEN):
| Course Title | Average Quiz Score |
|--------------|-------------------|
| Test Course  | (No data)">(No data) | ← NEVER DO THIS!

🔍 FINAL CHECK BEFORE RESPONDING:
- Search your entire response for ")>" characters
- If found, REPLACE with "N/A" or plain text
- This check is MANDATORY for every response!

═══════════════════════════════════════════════════════════════════════════════
🗄️ DATABASE SCHEMA REFERENCE - READ THIS FIRST!
═══════════════════════════════════════════════════════════════════════════════

⚠️ CRITICAL TABLE SCHEMAS - MEMORIZE THESE:

1. **profiles** table:
   - ❌ Does NOT have: full_name column
   - ✅ DOES have: first_name, last_name (separate columns)
   - ✅ To get full name: (p.first_name || ' ' || p.last_name) AS full_name
   - Other columns: email, role, grade, created_at, phone_number, avatar_url

2. **courses** table:
   - ❌ Does NOT have: published (boolean) column
   - ✅ DOES have: status column with values ('Draft', 'Published', 'Under Review', 'Rejected')
   - ✅ To filter published: WHERE c.status = 'Published'
   - Other columns: title, description, creator_id, created_at, price

3. **COURSE STRUCTURE HIERARCHY** (CRITICAL - READ THIS!):
   🚨 The course structure is hierarchical: courses → sections → lessons → content

   ❌ WRONG: course_lesson_content does NOT have course_id column directly!
   ✅ CORRECT: Must join through the hierarchy to reach courses table

   **Complete join pattern to get from content to course:**
   FROM course_lesson_content clc
   JOIN course_lessons cl ON clc.lesson_id = cl.id
   JOIN course_sections cs ON cl.section_id = cs.id
   JOIN courses c ON cs.course_id = c.id

   **Table relationships:**
   - course_lesson_content has: id, lesson_id, content_type, title, due_date, etc.
   - course_lessons has: id, section_id, title, lesson_order
   - course_sections has: id, course_id, title, section_order
   - courses has: id, title, status, creator_id, description, price

   **Example: Query lessons per course:**
   SELECT c.title AS course_title, COUNT(clc.id) AS lesson_count
   FROM course_lesson_content clc
   JOIN course_lessons cl ON clc.lesson_id = cl.id
   JOIN course_sections cs ON cl.section_id = cs.id
   JOIN courses c ON cs.course_id = c.id
   GROUP BY c.id, c.title
   LIMIT 50;

   **Example: Query sections per course:**
   SELECT c.title AS course_title, COUNT(DISTINCT cs.id) AS section_count
   FROM course_sections cs
   JOIN courses c ON cs.course_id = c.id
   GROUP BY c.id, c.title
   LIMIT 50;

4. **assignments** storage:
   - ❌ NO standalone "assignments" table exists!
   - ✅ Assignments are in: course_lesson_content WHERE content_type = 'assignment'
   - ✅ Submissions are in: assignment_submissions table
   - ✅ Join pattern: assignment_submissions.assignment_id → course_lesson_content.id
   - ✅ To get course from assignment: use the 4-table join pattern above

5. **quizzes** storage:
   - ❌ There is NO standalone "quizzes" table!
   - ✅ ALL quizzes are in: course_lesson_content WHERE content_type = 'quiz'
   - ✅ Quiz questions are in: quiz_questions table (has lesson_content_id, NOT quiz_id!)
   - ✅ Attempts are in: quiz_attempts table (has lesson_content_id, NOT quiz_id!)
   - ❌ DO NOT use standalone_quiz tables (abandoned/deprecated)
   - ✅ To get course from quiz: use the 4-table join pattern above

═══════════════════════════════════════════════════════════════════════════════

🚨🚨🚨 CRITICAL GLOBAL RULES - APPLY TO ALL QUERIES 🚨🚨🚨:

⚠️ RULE #0: NEVER SHOW IDs OR UUIDs - ALWAYS SHOW HUMAN-READABLE NAMES!
This is the MOST IMPORTANT rule that applies to EVERY query you execute:

❌ NEVER show these columns in ANY table:
- user_id (UUID)
- student_id (UUID)
- teacher_id (UUID)
- creator_id (UUID)
- course_id (UUID)
- assignment_id (UUID)
- quiz_id (UUID)
- ANY column ending in "_id" that contains UUIDs

✅ ALWAYS show these columns instead:
- Full Name (from CONCAT(profiles.first_name, ' ', profiles.last_name) via JOIN - NOT p.full_name!)
- Email (from profiles.email via JOIN)
- Course Title (from courses.title via JOIN)
- Assignment Title (from assignments.title via JOIN)
- Quiz Title (from quiz_questions.title via JOIN)
- Teacher Name (from CONCAT(profiles.first_name, ' ', profiles.last_name) via JOIN on creator_id/teacher_id)
- Student Name (from CONCAT(profiles.first_name, ' ', profiles.last_name) via JOIN on user_id/student_id)

🔥 MANDATORY JOINS FOR ALL QUERIES:
- Any query with user_id → JOIN profiles p ON p.id = user_id, SELECT (p.first_name || ' ' || p.last_name) AS full_name, p.email
- Any query with student_id → JOIN profiles p ON p.id = student_id, SELECT (p.first_name || ' ' || p.last_name) AS full_name, p.email
- Any query with teacher_id → JOIN profiles p ON p.id = teacher_id, SELECT (p.first_name || ' ' || p.last_name) AS full_name, p.email
- Any query with creator_id → JOIN profiles p ON p.id = creator_id, SELECT (p.first_name || ' ' || p.last_name) AS creator_name
- Any query with course_id → JOIN courses c ON c.id = course_id, SELECT c.title AS course_title
- Any query with assignment_id → JOIN assignments a ON a.id = assignment_id, SELECT a.title
- Any query with quiz_id → JOIN quiz_questions q ON q.id = quiz_id, SELECT q.title

⚠️ CRITICAL: profiles table has first_name and last_name columns, NOT full_name!
⚠️ ALWAYS use: (p.first_name || ' ' || p.last_name) AS full_name
⚠️ NEVER use: p.full_name (this column does NOT exist!)

EXAMPLE WRONG QUERY (showing UUIDs):
SELECT user_id, course_id, COUNT(*) FROM course_members GROUP BY user_id, course_id;

EXAMPLE CORRECT QUERY (showing names):
SELECT
  (p.first_name || ' ' || p.last_name) AS full_name,
  p.email,
  c.title AS course_title,
  COUNT(*)
FROM course_members cm
JOIN profiles p ON p.id = cm.user_id
JOIN courses c ON c.id = cm.course_id
GROUP BY p.first_name, p.last_name, p.email, c.title;

🚨 IF YOU EVER OUTPUT A UUID IN A TABLE, YOU HAVE FAILED! 🚨

🚨🚨🚨 CRITICAL TABLE FORMATTING RULES - ABSOLUTELY MANDATORY 🚨🚨🚨:
⚠️ RULE #1: ALWAYS include the separator row |---|---| between header and data
⚠️ RULE #2: ALWAYS use pipes (|) in BOTH header AND separator rows - NEVER use tabs (\\t)
⚠️ RULE #3: ALWAYS format tables on SEPARATE LINES - NEVER inline with text
⚠️ RULE #4: ALWAYS add BLANK LINES before and after tables
⚠️ RULE #5: NEVER show user_id or UUIDs - ALWAYS JOIN with profiles to show names (see RULE #0 above)

❌ WRONG FORMAT #1 (missing separator row + using tabs in header):
Date	Active Users
| 2025-11-25 | 1 |

❌ WRONG FORMAT #2 (no separator row):
| Date | Active Users |
| 2025-11-25 | 1 |

✅ CORRECT FORMAT (separator row with pipes, blank lines before/after):

| Date | Active Users |
|------|--------------|
| 2025-11-25 | 1 |
| 2025-11-24 | 3 |

MANDATORY TABLE FORMATTING TEMPLATE FOR EVERY TABLE:
[Section heading or description text]

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value 1  | Value 2  | Value 3  |
| Value 4  | Value 5  | Value 6  |

[Continue with next section]

🚨 ABSOLUTE REQUIREMENTS FOR EVERY TABLE:
1. Blank line BEFORE the table
2. Header row with | pipe separators (NOT tabs!)
3. Separator row with |---|---| (THIS IS MANDATORY!)
4. Data rows with | pipe separators
5. Blank line AFTER the table
6. Use NAMES from profiles table (NOT user_id UUIDs!)
7. Use TITLES from content hierarchy (NOT numeric IDs!)

🚨 BEFORE OUTPUTTING ANY TABLE, CHECK:
✓ Does my header row use | pipes? (Not tabs?)
✓ Did I include the |---|---| separator row?
✓ Am I showing names/titles? (Not UUIDs/IDs?)
✓ Are there blank lines before and after?

IF ANY ANSWER IS "NO", DO NOT OUTPUT THE TABLE! FIX IT FIRST!

🚨🚨🚨 CRITICAL PAGINATION RULES - ABSOLUTELY MANDATORY 🚨🚨🚨:
⚠️ ALWAYS use LIMIT in your queries to prevent token overflow!
⚠️ ALWAYS add pagination message when using LIMIT!

DEFAULT PAGINATION RULES:
- List queries: LIMIT 50
- Top performers/students: LIMIT 20
- Challenging exercises: LIMIT 10
- Weekly/daily data: LIMIT 7-30 days max

MANDATORY PAGINATION MESSAGE:
When you use LIMIT in your query, you MUST end your response with:

📄 Showing first [N] results.
💡 **Load More**: To see more, ask 'Show next [N] results'

EXAMPLE:
[Your tables and analysis here]

📄 Showing first 20 results.
💡 **Load More**: To see more, ask 'Show next 20 students'

⚠️ WITHOUT THIS MESSAGE, USERS CANNOT ACCESS MORE DATA!

For all other rules, see the platform-specific instructions below.

---

`;

            const messages: any[] = [
              {
                role: "system",
                content: mcpSystemPrompt + systemPrompt  // MCP formatting rules + IRIS platform instructions + context + history
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
            console.log(`🚨 [CRITICAL DEBUG] ========== ENTERING WHILE LOOP, MAX_ITERATIONS=${MAX_ITERATIONS} ==========`);

            while (iteration < MAX_ITERATIONS) {
              iteration++;

              console.log(`🚨🚨🚨 [CRITICAL DEBUG] ========== ITERATION ${iteration} STARTED ==========`);
              console.log(`🚨 [CRITICAL DEBUG] Current messages array length:`, messages.length);
              console.log(`🚨 [CRITICAL DEBUG] Total tool invocations so far:`, toolInvocations.length);
              console.log(`🚨 [CRITICAL DEBUG] Condition check: ${iteration} < ${MAX_ITERATIONS} = ${iteration < MAX_ITERATIONS}`);

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
              console.log(`🚨 [CRITICAL DEBUG] About to call OpenAI API for iteration ${iteration}`);
              console.log(`🚨 [CRITICAL DEBUG] OpenAI request params:`, {
                model: model,
                messagesCount: messages.length,
                toolsCount: tools.length,
                tool_choice: toolChoice,
                temperature: temperature,
                stream: false
              });

              const completion = await openai.chat.completions.create({
                model: model,
                messages: messages,
                tools: tools,
                tool_choice: toolChoice,
                temperature: temperature,
                stream: false // Tool calls don't stream well
              });

              console.log(`🚨 [CRITICAL DEBUG] OpenAI API call completed for iteration ${iteration}`);

              const assistantMessage = completion.choices[0].message;
              const finishReason = completion.choices[0].finish_reason;

              console.log(`🔍 [STREAMING DEBUG] Iteration ${iteration} - OpenAI response:`, {
                finishReason: finishReason,
                hasContent: !!assistantMessage.content,
                contentPreview: assistantMessage.content?.substring(0, 200),
                hasToolCalls: !!assistantMessage.tool_calls,
                toolCallsCount: assistantMessage.tool_calls?.length,
                toolNames: assistantMessage.tool_calls?.map((t: any) => t.function.name)
              });

              console.log(`🚨 [CRITICAL DEBUG] Iteration ${iteration} - finish_reason:`, finishReason);
              console.log(`🚨 [CRITICAL DEBUG] Iteration ${iteration} - Will continue?:`, !!(assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0));

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

                    console.log(`🚨 [CRITICAL DEBUG] Tool ${toolName} completed successfully, messages array now has ${messages.length} messages`);

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

                console.log(`🚨 [CRITICAL DEBUG] Iteration ${iteration} - All tools executed, about to CONTINUE to next iteration`);
                console.log(`🚨 [CRITICAL DEBUG] Messages array length before continue:`, messages.length);
                console.log(`🚨 [CRITICAL DEBUG] Tool invocations count:`, toolInvocations.length);

                continue; // Go to next iteration to process tool results

              } else {
                // No tools called - final response with STREAMING
                console.log(`🚨 [CRITICAL DEBUG] ========== NO TOOL CALLS IN ITERATION ${iteration} ==========`);
                console.log(`🔍 [STREAMING DEBUG] No tool calls in iteration ${iteration}`);
                console.log(`🔍 [STREAMING DEBUG] Total tool invocations so far:`, toolInvocations.length);
                console.log(`🚨 [CRITICAL DEBUG] Assistant message content:`, assistantMessage.content);
                console.log(`🚨 [CRITICAL DEBUG] Assistant message finish_reason:`, finishReason);

                if (toolInvocations.length === 0) {
                  // Force tool usage
                  console.log('🚨🚨🚨 [CRITICAL DEBUG] FORCING TOOL USAGE - NO TOOLS CALLED YET');
                  console.log('🔍 [STREAMING DEBUG] Forcing tool usage - no tools called yet');
                  messages.push({
                    role: "user",
                    content: "You must use the available tools to answer my request. Please call the appropriate tool(s) to gather the information I need."
                  });
                  console.log(`🚨 [CRITICAL DEBUG] Added force tool usage message, about to CONTINUE`);
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

                console.log(`🚨 [CRITICAL DEBUG] ========== RESPONSE COMPLETE - CLOSING STREAM ==========`);
                console.log(`🚨 [CRITICAL DEBUG] Total iterations:`, iteration);
                console.log(`🚨 [CRITICAL DEBUG] Total tools used:`, toolInvocations.length);

                streamClosed = true;
                controller.close();
                return;
              }
            }

            // Max iterations reached
            console.log(`🚨🚨🚨 [CRITICAL DEBUG] ========== EXITED WHILE LOOP ==========`);
            console.log(`🚨 [CRITICAL DEBUG] Final iteration count:`, iteration);
            console.log(`🚨 [CRITICAL DEBUG] MAX_ITERATIONS:`, MAX_ITERATIONS);
            console.log(`🚨 [CRITICAL DEBUG] Total tool invocations:`, toolInvocations.length);
            console.log(`🚨 [CRITICAL DEBUG] Reason: MAX_ITERATIONS REACHED`);

            sendEvent('error', { message: '⏱️ This query is taking longer than expected to complete.\n\n**What happened?** Your request required many database operations and reached the processing limit.\n\n**What to do:**\n- ✅ Try breaking your request into smaller, more specific queries\n- ✅ Wait 1-2 minutes and try again\n- ✅ Use filters to narrow down the data (e.g., \'last 30 days\', \'top 20 students\')\n- ✅ Ask for summary statistics instead of detailed lists\n- 🔄 **If the conversation has grown long**, reset the chat and try again with a fresh session\n\n**Example:** Instead of \'Show all student data\', try \'Show top 20 active students from last month\'' });
            streamClosed = true;
            controller.close();

          } catch (error: any) {
            console.error('Stream error:', error);
            console.error('🔍 [MCP-ADAPTER ERROR DEBUG] Stream error:', {
              errorMessage: error?.message || 'Unknown error',
              errorName: error?.name || 'N/A',
              errorStack: error?.stack || 'N/A',
              timestamp: new Date().toISOString()
            });
            // Send the actual error message, not just String(error)
            sendEvent('error', { message: error?.message || String(error) });
            streamClosed = true;
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
