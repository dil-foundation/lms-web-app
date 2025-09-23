import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const MCP_ADAPTER_URL = Deno.env.get("MCP_ADAPTER_URL");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Initialize Supabase client for logging
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

RESPONSE FORMATTING:
- Use markdown for better formatting
- Include summary statistics and key insights
- Provide actionable recommendations when appropriate
- Be conversational yet professional
- Always respect data privacy and user permissions

SECURITY GUIDELINES:
- Only access data the user has permission to view
- Use read-only queries unless explicitly authorized for writes
- Filter sensitive information based on user role

PLATFORM DISTINCTION - CRITICAL:
This platform has TWO separate educational systems:
1. **LMS (Learning Management System)** - Traditional courses with enrollments, assignments, quizzes
2. **AI Tutor Platform** - Interactive learning with exercises, stages, milestones, and progress tracking

CONTEXT-AWARE QUERY INTERPRETATION:
When users mention "AI Tutor" or "AI tutor" in their query, ALL subsequent terms should be interpreted in AI Tutor context:
- "courses in AI tutor" → AI Tutor stages/exercises (NOT LMS courses)
- "students in AI tutor" → Users with AI tutor activity (ai_tutor_daily_learning_analytics)
- "progress in AI tutor" → AI tutor progress data (ai_tutor_user_progress_summary)
- "analytics in AI tutor" → AI tutor analytics (ai_tutor_daily_learning_analytics)

AI TUTOR SPECIFIC QUERIES (Internal - Do NOT expose table names to users):
- "active users in AI tutor" → Query ai_tutor_daily_learning_analytics for users with sessions > 0
- "stages in AI tutor" → Query ai_tutor_user_stage_progress OR ai_tutor_content_hierarchy WHERE level = 'stage'
- "exercises in AI tutor" → Query ai_tutor_content_hierarchy WHERE level = 'exercise'
- "topics in AI tutor" → Query ai_tutor_user_topic_progress OR ai_tutor_content_hierarchy WHERE level = 'topic'
- "AI tutor content structure" → Query ai_tutor_content_hierarchy for hierarchical content organization
- "stage details" → Query ai_tutor_content_hierarchy WHERE level = 'stage' for stage information
- "exercise types" → Query ai_tutor_content_hierarchy WHERE level = 'exercise' for exercise details
- "learning content hierarchy" → Query ai_tutor_content_hierarchy for complete content structure

When users ask about:
- "students" → Query user/profile tables with student role filter
- "teachers" → Query user/profile tables with teacher role filter  
- "courses" → Query course-related tables and enrollment data (LMS context) OR ai_tutor_content_hierarchy (AI tutor context)
- "analytics" → Provide platform statistics and engagement metrics
- "performance" → Show completion rates, grades, and progress data`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('🚀 IRIS Streaming Chat request received');
    
    const { messages, context }: { messages: ChatMessage[], context: IRISContext } = await req.json();

    // Validate required inputs
    if (!context?.userId) {
      throw new Error('User context with userId is required');
    }

    if (!messages || messages.length === 0) {
      throw new Error('Messages array is required');
    }

    console.log(`👤 Processing streaming request for user: ${context.userId}, role: ${context.role}`);

    // Build conversation with system prompt
    const systemMessage: ChatMessage = {
      role: 'system',
      content: IRIS_SYSTEM_PROMPT
    };

    const fullMessages = [systemMessage, ...messages];
    console.log(`💬 Total messages in conversation: ${fullMessages.length}`);

    // Step 1: Fetch available tools from MCP adapter
    console.log('🔧 Fetching MCP tools from:', MCP_ADAPTER_URL);
    let tools = [];
    
    try {
      const toolsResponse = await fetch(`https://mcp-jsonplaceholder.finance-6b9.workers.dev/sse/tools`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (toolsResponse.ok) {
        const toolsData = await toolsResponse.json();
        tools = toolsData.tools || toolsData || [];
        console.log(`📋 Retrieved ${tools.length} MCP tools`);
      } else {
        console.warn(`⚠️ MCP tools fetch failed: ${toolsResponse.status}`);
      }
    } catch (mcpError) {
      console.warn('⚠️ MCP server not available, continuing without tools:', mcpError.message);
    }

    // Step 2: First, make a non-streaming call to check if tools are needed
    console.log('🤖 Making initial OpenAI request to check for tool calls...');
    
    const initialResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: fullMessages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? "auto" : undefined,
        stream: false, // Non-streaming first to check for tool calls
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!initialResponse.ok) {
      const errorText = await initialResponse.text();
      throw new Error(`OpenAI API error (${initialResponse.status}): ${errorText}`);
    }

    const initialData = await initialResponse.json();
    const initialMessage = initialData.choices[0].message;

    // 🔍 DEBUG: Log the complete OpenAI response
    console.log("🔍 DEBUG - Full OpenAI Response:", JSON.stringify(initialData, null, 2));
    console.log("🔍 DEBUG - Initial Message:", JSON.stringify(initialMessage, null, 2));
    console.log("🔍 DEBUG - Has tool_calls?", !!initialMessage.tool_calls);
    
    if (initialMessage.tool_calls) {
      console.log("🔍 DEBUG - Tool calls found:", JSON.stringify(initialMessage.tool_calls, null, 2));
    }

    // Step 3: Handle tool calls if present (non-streaming approach)
    if (initialMessage.tool_calls && initialMessage.tool_calls.length > 0) {
      console.log(`🛠️ Tool calls detected: ${initialMessage.tool_calls.length} tools to execute`);
      
      // Add the assistant message with tool calls to conversation
      const updatedMessages = [...fullMessages, initialMessage];

      // Execute each tool call
      for (const toolCall of initialMessage.tool_calls) {
        console.log(`🔧 Executing tool: ${toolCall.function.name}`);
        
        try {
          const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
          
          const toolResponse = await fetch(`${MCP_ADAPTER_URL}/invoke`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              name: toolCall.function.name,
              arguments: toolArgs
            }),
            signal: AbortSignal.timeout(30000) // 30 second timeout
          });

          let toolResult = '';
          if (toolResponse.ok) {
            const toolData = await toolResponse.json();
            
            // 🔍 DEBUG: Log MCP response
            console.log(`🔍 DEBUG - MCP Response for ${toolCall.function.name}:`, JSON.stringify(toolData, null, 2));
            
            // Handle different MCP response formats
            if (toolData.content) {
              toolResult = typeof toolData.content === 'string' ? toolData.content : JSON.stringify(toolData.content);
            } else if (toolData.result) {
              toolResult = typeof toolData.result === 'string' ? toolData.result : JSON.stringify(toolData.result);
            } else {
              toolResult = JSON.stringify(toolData);
            }
            
            console.log(`✅ Tool ${toolCall.function.name} executed successfully`);
            console.log(`🔍 DEBUG - Tool result content:`, toolResult.substring(0, 200) + (toolResult.length > 200 ? '...' : ''));
          } else {
            const errorText = await toolResponse.text();
            toolResult = `Error executing tool: ${toolResponse.status} ${toolResponse.statusText} - ${errorText}`;
            console.error(`❌ Tool ${toolCall.function.name} failed:`, toolResult);
          }

          // Add tool result to conversation
          const toolMessage = {
            role: 'tool' as const,
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: toolResult
          };
          
          updatedMessages.push(toolMessage);
          
          // 🔍 DEBUG: Log tool message being added
          console.log(`🔍 DEBUG - Adding tool message:`, JSON.stringify(toolMessage, null, 2));

        } catch (toolError) {
          console.error(`❌ Tool execution error for ${toolCall.function.name}:`, toolError);
          updatedMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: `Error: ${toolError.message}`
          });
        }
      }

      // Now make final streaming call with tool results
      console.log('🚀 Making final streaming call with tool results...');
      console.log(`🔍 DEBUG - Updated messages count: ${updatedMessages.length}`);
      console.log(`🔍 DEBUG - Last few messages:`, JSON.stringify(updatedMessages.slice(-3), null, 2));
      
      const finalResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4-turbo-preview",
          messages: updatedMessages,
          stream: true, // Now we can stream the final response
          temperature: 0.1,
          max_tokens: 2000,
        }),
      });

      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
        throw new Error(`OpenAI final API error (${finalResponse.status}): ${errorText}`);
      }

      // Create transform stream for final response
      const { readable, writable } = new TransformStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode("data: {\"type\": \"start\"}\n\n"));
        },
        transform(chunk, controller) {
          controller.enqueue(chunk);
        },
        flush(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        }
      });

      finalResponse.body?.pipeTo(writable);
      
      // Return the readable stream
      return new Response(readable, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });

    } else {
      // Step 4: No tool calls - use streaming for regular response
      console.log('💬 No tool calls needed, streaming regular response...');
      
      const streamResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4-turbo-preview",
          messages: fullMessages,
          stream: true, // Stream for regular responses
          temperature: 0.1,
          max_tokens: 2000,
        }),
      });

      if (!streamResponse.ok) {
        const errorText = await streamResponse.text();
        throw new Error(`OpenAI stream API error (${streamResponse.status}): ${errorText}`);
      }

      // Create transform stream for regular response
      const { readable: streamReadable, writable: streamWritable } = new TransformStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode("data: {\"type\": \"start\"}\n\n"));
        },
        transform(chunk, controller) {
          controller.enqueue(chunk);
        },
        flush(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        }
      });

      streamResponse.body?.pipeTo(streamWritable);
      
      // Return the readable stream
      return new Response(streamReadable, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    console.log('✅ IRIS streaming response initiated');

  } catch (error) {
    console.error('❌ IRIS Streaming Chat Error:', error);
    
    // Return error as SSE stream
    const errorStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const errorData = {
          error: error.message,
          type: 'error'
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    });

    return new Response(errorStream, {
      status: 200, // Use 200 to allow SSE to work
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }
});
