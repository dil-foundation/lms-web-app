import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const MCP_ADAPTER_URL = Deno.env.get("MCP_ADAPTER_URL") || "http://localhost:8080";
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

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAIMessage extends ChatMessage {
  tool_calls?: ToolCall[];
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
5. Suggest relevant follow-up questions

RESPONSE FORMATTING:
- Use markdown tables for structured data
- Include summary statistics and key insights
- Provide actionable recommendations when appropriate
- Be conversational yet professional
- Always respect data privacy and user permissions

SECURITY GUIDELINES:
- Only access data the user has permission to view
- Use read-only queries unless explicitly authorized for writes
- Filter sensitive information based on user role
- Log all database interactions for audit purposes

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
    console.log('🚀 IRIS Chat request received');
    
    const { messages, context }: { messages: ChatMessage[], context: IRISContext } = await req.json();

    // Validate required inputs
    if (!context?.userId) {
      throw new Error('User context with userId is required');
    }

    if (!messages || messages.length === 0) {
      throw new Error('Messages array is required');
    }

    console.log(`👤 Processing request for user: ${context.userId}, role: ${context.role}`);

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
      // Add timeout for MCP requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const toolsResponse = await fetch(`${MCP_ADAPTER_URL}/tools`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (toolsResponse.ok) {
        const toolsData = await toolsResponse.json();
        tools = toolsData.tools || toolsData || []; // Handle different response formats
        console.log(`📋 Retrieved ${tools.length} MCP tools`);
        
        // Log tool names for debugging
        if (tools.length > 0) {
          const toolNames = tools.map((t: any) => t.function?.name || t.name).filter(Boolean);
          console.log('🛠️ Available tools:', toolNames);
        }
      } else {
        const errorText = await toolsResponse.text().catch(() => 'Unknown error');
        console.warn(`⚠️ MCP tools fetch failed: ${toolsResponse.status} ${toolsResponse.statusText}`);
        console.warn('Response body:', errorText);
      }
    } catch (mcpError) {
      if (mcpError.name === 'AbortError') {
        console.warn('⚠️ MCP server request timed out');
      } else {
        console.warn('⚠️ MCP server not available, continuing without tools:', mcpError.message);
      }
    }

    // Step 2: Initial OpenAI call with tools
    console.log('🤖 Calling OpenAI with tools...');
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
        temperature: 0.1, // Lower temperature for more consistent responses
        max_tokens: 2000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error (${openaiResponse.status}): ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const assistantMessage: OpenAIMessage = openaiData.choices[0].message;

    console.log(`🎯 OpenAI response received, tool calls: ${assistantMessage.tool_calls?.length || 0}`);

    // Step 3: Handle tool calls if present
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log(`🛠️ Processing ${assistantMessage.tool_calls.length} tool calls`);
      
      // Add assistant message with tool calls to conversation
      fullMessages.push(assistantMessage);

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        try {
          console.log(`🔍 Executing tool: ${toolCall.function.name}`);
          
          let args;
          try {
            args = JSON.parse(toolCall.function.arguments || "{}");
          } catch (parseError) {
            throw new Error(`Invalid tool arguments: ${parseError.message}`);
          }
          
          // Add user context to tool arguments for security and filtering
          const enhancedArgs = {
            ...args,
            userContext: {
              userId: context.userId,
              role: context.role,
              permissions: context.permissions || [],
              tenantId: context.tenantId
            }
          };

          // Invoke MCP tool with timeout
          const toolController = new AbortController();
          const toolTimeoutId = setTimeout(() => toolController.abort(), 30000); // 30 second timeout

          const toolResponse = await fetch(`${MCP_ADAPTER_URL}/invoke`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({
              name: toolCall.function.name,
              arguments: enhancedArgs
            }),
            signal: toolController.signal
          });

          clearTimeout(toolTimeoutId);

          if (!toolResponse.ok) {
            const errorText = await toolResponse.text();
            throw new Error(`Tool execution failed (${toolResponse.status}): ${errorText}`);
          }

          const toolResult = await toolResponse.json();
          console.log(`✅ Tool ${toolCall.function.name} executed successfully`);

          // Add tool result to conversation
          const toolContent = typeof toolResult.content === 'string' 
            ? toolResult.content 
            : JSON.stringify(toolResult.content || toolResult);

          fullMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: toolContent
          });

        } catch (toolError) {
          console.error(`❌ Tool execution error for ${toolCall.function.name}:`, toolError);
          
          // Handle different types of errors
          let errorMessage = `Error executing ${toolCall.function.name}: `;
          
          if (toolError.name === 'AbortError') {
            errorMessage += 'Request timed out. The database query may be taking too long.';
          } else if (toolError.message.includes('fetch')) {
            errorMessage += 'Unable to connect to database service.';
          } else {
            errorMessage += toolError.message;
          }
          
          // Add error message to conversation so AI can handle gracefully
          fullMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: errorMessage
          });
        }
      }

      // Step 4: Final OpenAI call with tool results
      console.log('🤖 Final OpenAI call with tool results...');
      const finalResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4-turbo-preview",
          messages: fullMessages,
          temperature: 0.1,
          max_tokens: 2000,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        }),
      });

      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
        throw new Error(`Final OpenAI API error (${finalResponse.status}): ${errorText}`);
      }

      const finalData = await finalResponse.json();
      const finalMessage = finalData.choices[0].message;

      // Log successful interaction for analytics
      try {
        await supabase
          .from('iris_chat_logs')
          .insert({
            user_id: context.userId,
            user_role: context.role,
            query: messages[messages.length - 1]?.content || '',
            response_preview: finalMessage.content?.substring(0, 200) || '',
            tools_used: assistantMessage.tool_calls?.map(tc => tc.function.name) || [],
            tokens_used: (openaiData.usage?.total_tokens || 0) + (finalData.usage?.total_tokens || 0),
            success: true,
            created_at: new Date().toISOString()
          });
      } catch (logError) {
        console.warn('Failed to log interaction:', logError);
      }

      console.log('✅ IRIS request completed successfully with tools');
      return new Response(JSON.stringify({
        message: finalMessage,
        toolsUsed: assistantMessage.tool_calls?.map(tc => tc.function.name) || [],
        tokensUsed: (openaiData.usage?.total_tokens || 0) + (finalData.usage?.total_tokens || 0),
        success: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 5: No tool calls - return direct response
    console.log('💬 Returning direct response (no tools used)');
    
    // Log interaction without tools
    try {
      await supabase
        .from('iris_chat_logs')
        .insert({
          user_id: context.userId,
          user_role: context.role,
          query: messages[messages.length - 1]?.content || '',
          response_preview: assistantMessage.content?.substring(0, 200) || '',
          tools_used: [],
          tokens_used: openaiData.usage?.total_tokens || 0,
          success: true,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.warn('Failed to log interaction:', logError);
    }

    console.log('✅ IRIS request completed successfully');
    return new Response(JSON.stringify({
      message: assistantMessage,
      toolsUsed: [],
      tokensUsed: openaiData.usage?.total_tokens || 0,
      success: true
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('❌ IRIS Chat Error:', error);
    
    // Log error for debugging
    try {
      const { context } = await req.json().catch(() => ({ context: null }));
      if (context?.userId) {
        await supabase
          .from('iris_chat_logs')
          .insert({
            user_id: context.userId,
            user_role: context.role || 'unknown',
            query: 'Error occurred',
            response_preview: error.message,
            tools_used: [],
            tokens_used: 0,
            success: false,
            error_message: error.message,
            created_at: new Date().toISOString()
          });
      }
    } catch (logError) {
      console.warn('Failed to log error:', logError);
    }
    
    return new Response(JSON.stringify({
      error: error.message,
      message: {
        role: 'assistant',
        content: `I apologize, but I encountered an error processing your request. Please try again or rephrase your question.

**Error Details:** ${error.message}

**Suggestions:**
- Try a simpler query
- Check if you have the necessary permissions
- Contact support if the issue persists`
      },
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});