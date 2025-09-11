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
- "courses in AI tutor" → AI Tutor stages/exercises (NOT LMS courses)
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
- "courses in AI tutor" → Query ai_tutor_user_stage_progress for stages OR ai_tutor_user_topic_progress for exercises (NOT LMS courses table)
- "AI tutor progress" → Query ai_tutor_user_progress_summary, ai_tutor_user_stage_progress
- "learning milestones" → Query ai_tutor_learning_milestones
- "exercise completion" → Query ai_tutor_user_topic_progress
- "daily learning analytics" → Query ai_tutor_daily_learning_analytics
- "AI tutor settings" → Query ai_tutor_settings
- "stages in AI tutor" → Query ai_tutor_user_stage_progress
- "topics in AI tutor" → Query ai_tutor_user_topic_progress

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

NEVER confuse AI Tutor platform data with LMS course data - they are separate systems!`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('🚀 IRIS Simple Chat request received');
    
    const { messages, context }: { messages: ChatMessage[], context: IRISContext } = await req.json();

    // Validate required inputs
    if (!context?.userId) {
      throw new Error('User context with userId is required');
    }

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
      throw new Error(`MCP Adapter error (${adapterResponse.status}): ${errorText}`);
    }

    const adapterResult = await adapterResponse.json();
    
    if (!adapterResult.ok) {
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

  } catch (error) {
    console.error('❌ IRIS Simple Chat Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: {
        role: 'assistant',
        content: `I apologize, but I encountered an error while processing your request: ${error.message}`
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
