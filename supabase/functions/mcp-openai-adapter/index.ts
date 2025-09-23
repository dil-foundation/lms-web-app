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
- "active users in AI tutor": SELECT DISTINCT user_id FROM ai_tutor_daily_learning_analytics WHERE sessions_count > 0
- "courses in AI tutor": ALWAYS means STAGES - SELECT * FROM ai_tutor_content_hierarchy WHERE level = 'stage' (NOT LMS courses!)
- "how many courses in AI tutor": COUNT(*) FROM ai_tutor_content_hierarchy WHERE level = 'stage' AND is_active = true
- "total courses in AI tutor": COUNT(*) FROM ai_tutor_content_hierarchy WHERE level = 'stage' AND is_active = true
- "number of courses in AI tutor": COUNT(*) FROM ai_tutor_content_hierarchy WHERE level = 'stage' AND is_active = true
- "AI tutor progress": Query ai_tutor_user_progress_summary
- "learning milestones": Query ai_tutor_learning_milestones
- "exercise completion": Query ai_tutor_user_topic_progress
- "daily learning analytics": Query ai_tutor_daily_learning_analytics
- "AI tutor users": Query users who have records in ai_tutor_* tables
- "stages in AI tutor": Query ai_tutor_content_hierarchy WHERE level = 'stage'
- "topics in AI tutor": Query ai_tutor_user_topic_progress OR ai_tutor_content_hierarchy WHERE level = 'topic'
- "exercises in AI tutor": Query ai_tutor_content_hierarchy WHERE level = 'exercise'
- "AI tutor content structure": Query ai_tutor_content_hierarchy for hierarchical content organization
- "stage details": Query ai_tutor_content_hierarchy WHERE level = 'stage' for stage information with titles, descriptions, difficulty levels
- "exercise types": Query ai_tutor_content_hierarchy WHERE level = 'exercise' for exercise details with types and metadata
- "learning content hierarchy": Query ai_tutor_content_hierarchy for complete content structure with parent-child relationships

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
