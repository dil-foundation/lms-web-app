/// <reference types="https://deno.land/x/deno@v1.28.0/lib/deno.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with SERVICE_ROLE_KEY for full database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get the authorization header
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the user token
    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user has admin role for reports access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'teacher'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse query parameters
    const url = new URL(req.url);
    const timeframe = url.searchParams.get('timeframe');
    const rawQuery = url.searchParams.get('rawQuery') || url.searchParams.get('query'); // NEW: Raw user query
    const getPrompt = url.searchParams.get('getPrompt'); // NEW: Prompt fetching
    
    console.log('🤖 Processing request:', { timeframe, rawQuery: rawQuery ? 'present' : 'none', getPrompt });
    
    // Handle prompt requests
    if (getPrompt) {
      try {
        const promptContent = await supabase.rpc('get_ai_prompt', { prompt_name: getPrompt });
        return new Response(
          JSON.stringify({ systemPrompt: promptContent.data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Error fetching prompt:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch prompt', systemPrompt: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }
    
    let contextData;
    
    if (rawQuery) {
      // 🚀 NEW AI-POWERED APPROACH: Use raw query to determine data needs
      console.log('🧠 AI-Powered Query Processing:', rawQuery);
      contextData = await getAIPoweredContext(supabase, rawQuery, timeframe, profile.role);
    } else {
      // 📊 LEGACY APPROACH: Backward compatibility with parameter-based queries
      console.log('🔄 Legacy Parameter-Based Processing');
      const list = url.searchParams.get('list');
      const search = url.searchParams.get('search') || '';
      const teacherName = url.searchParams.get('teacherName') || '';
      const courseName = url.searchParams.get('courseName') || '';
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
      const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '25')));
      const includeRawProgress = url.searchParams.get('includeRawProgress') === 'true';
      const includeRawStages = url.searchParams.get('includeRawStages') === 'true';
      const includeRawTopics = url.searchParams.get('includeRawTopics') === 'true';
      
      contextData = await getPlatformContext(supabase, timeframe, {
        list,
        search,
        teacherName,
        courseName,
        page,
        pageSize,
        includeRawProgress,
        includeRawStages,
        includeRawTopics,
      });
    }

    return new Response(
      JSON.stringify(contextData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in reports-context function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

type Options = {
  list?: string | null
  search?: string
  teacherName?: string
  courseName?: string
  page?: number
  pageSize?: number
  role?: string
  includeRawProgress?: boolean
  includeRawStages?: boolean
  includeRawTopics?: boolean
}

// =====================================================================================
// AI-POWERED CONTEXT FUNCTION (ChatGPT's Approach)
// =====================================================================================

/**
 * AI-Powered Context Fetcher - Uses dynamic prompts and comprehensive data
 * This implements ChatGPT's approach for true AI flexibility without hardcoded patterns
 */
async function getAIPoweredContext(supabase: any, rawQuery: string, timeframe?: string | null, userRole?: string) {
  console.log('🤖 AI-Powered Context Analysis Starting...');
  console.log('📝 Query:', rawQuery);
  console.log('🕐 Timeframe:', timeframe);
  console.log('👤 User Role:', userRole);

  try {
    // Step 1: Get dynamic system prompt from database
    const { data: systemPromptData, error: promptError } = await supabase
      .rpc('get_ai_prompt', { prompt_name: 'iris_system_prompt' });
    
    if (promptError) {
      console.warn('⚠️ Could not fetch dynamic prompt, using fallback:', promptError.message);
    }

    // Step 2: Analyze query intent (this could be enhanced with AI in the future)
    const queryAnalysis = analyzeQueryIntent(rawQuery);
    console.log('🧠 Query Analysis:', queryAnalysis);

    // Step 3: Fetch comprehensive data based on analysis
    const contextData = await fetchComprehensiveData(supabase, queryAnalysis, timeframe);

    // Step 4: Add AI-specific metadata
    (contextData as any).aiMetadata = {
      originalQuery: rawQuery,
      queryAnalysis: queryAnalysis,
      systemPrompt: systemPromptData || 'Default IRIS system prompt',
      processingMode: 'ai_powered',
      timestamp: new Date().toISOString()
    };

    console.log('✅ AI-Powered Context Generated Successfully');
    return contextData;

  } catch (error) {
    console.error('❌ Error in AI-powered context generation:', error);
    // Fallback to legacy approach
    return await getPlatformContext(supabase, timeframe, {});
  }
}

/**
 * AI-POWERED INTENT ANALYSIS
 * Let the AI determine what data to fetch instead of hardcoded patterns
 */
async function analyzeQueryIntent(query: string) {
  console.log('🧠 AI-Powered Intent Analysis for:', query);
  
  // For now, always return comprehensive data and let the main AI decide
  // The AI is smart enough to understand what the user wants from the query
  // and extract the relevant data from the comprehensive context
  
  return { 
    intent: 'comprehensive', 
    confidence: 1.0,
    reasoning: 'Let AI analyze the query and extract relevant data from comprehensive context'
  };
}

/**
 * AI-POWERED DATA FETCHING
 * Always fetch comprehensive data and let AI extract what's needed
 */
async function fetchComprehensiveData(supabase: any, analysis: any, timeframe?: string | null) {
  console.log('📊 Fetching comprehensive data - AI will handle the complexity');

  // Always fetch comprehensive data with multiple data sources
  // The AI is smart enough to extract what it needs from the full context
  const options: Options = { 
    page: 1, 
    pageSize: 50,
    // Include all possible data sources
    list: 'students', // This will trigger comprehensive data fetching
    includeRawProgress: true,
    includeRawStages: true,
    includeRawTopics: true
  };

  return await getPlatformContext(supabase, timeframe, options);
}

// =====================================================================================
// LEGACY PLATFORM CONTEXT FUNCTION (Backward Compatibility)
// =====================================================================================

async function getPlatformContext(supabase: any, timeframe?: string | null, opts: Options = {}) {
  // Declare timeRangeLabel outside try block so it's accessible in catch
  let timeRangeLabel = 'All Time Data';
  
  try {
    console.log('📊 Fetching platform context for timeframe:', timeframe)
    
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    
    // Calculate date filters based on timeframe
    let startDate: Date | null = null;
    
    if (timeframe) {
      switch (timeframe) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          timeRangeLabel = 'Today';
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
          timeRangeLabel = 'Yesterday';
          break;
        case '24_hours':
          const twentyFourHoursAgo = new Date(now);
          twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
          startDate = twentyFourHoursAgo;
          timeRangeLabel = 'Past 24 Hours';
          break;
        case 'this_week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          startDate = weekStart;
          timeRangeLabel = 'This Week';
          break;
        case 'this_month':
          startDate = thisMonth;
          timeRangeLabel = 'This Month';
          break;
        case 'last_week':
          const lastWeekStart = new Date(now);
          lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
          startDate = lastWeekStart;
          timeRangeLabel = 'Last Week';
          break;
        case 'last_month':
          startDate = lastMonth;
          timeRangeLabel = 'Last Month';
          break;
      }
    }
    const thisYear = new Date(now.getFullYear(), 0, 1)

    // Get total users from profiles
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    
    if (usersError) {
      console.error('Error querying profiles:', usersError)
    }

    // Get new users this month
    const { count: newUsersThisMonth } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thisMonth.toISOString())

    // Get AI Tutor active users with optional date filter
    let aiTutorQuery = supabase
      .from('ai_tutor_daily_learning_analytics')
      .select('user_id', { count: 'exact' })
      .gt('sessions_count', 0); // Only users with actual sessions
    
    if (startDate) {
      aiTutorQuery = aiTutorQuery.gte('analytics_date', startDate.toISOString().split('T')[0]);
    }
    
    const { data: aiTutorUsersData, count: aiTutorActiveUsers } = await aiTutorQuery;

    // Get LMS active users (ALL TIME - no date filter)
    const { data: lmsUsersData, count: lmsActiveUsers } = await supabase
      .from('user_content_item_progress')
      .select('user_id', { count: 'exact' })

    // Get total courses (all statuses for consistency with allCoursesList)
    const { count: totalCourses } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })

    // Get comprehensive AI Tutor analytics data with optional date filter
    let analyticsQuery = supabase
      .from('ai_tutor_daily_learning_analytics')
      .select('sessions_count, total_time_minutes, average_session_duration, average_score, exercises_completed, exercises_attempted, urdu_usage_count');
    
    if (startDate) {
      analyticsQuery = analyticsQuery.gte('analytics_date', startDate.toISOString().split('T')[0]);
    }
    
    const { data: aiTutorAnalytics } = await analyticsQuery;

    // Get AI Tutor progress summaries (ALL TIME)
    const { data: progressSummaries } = await supabase
      .from('ai_tutor_user_progress_summary')
      .select('overall_progress_percentage, total_exercises_completed, total_time_spent_minutes, streak_days, longest_streak, weekly_learning_hours, monthly_learning_hours')

    // Get AI Tutor milestones and achievements (ALL TIME)
    const { data: milestones } = await supabase
      .from('ai_tutor_learning_milestones')
      .select('milestone_type, milestone_title, earned_at')

    // Get AI Tutor unlocks data (ALL TIME)
    const { data: unlocks } = await supabase
      .from('ai_tutor_learning_unlocks')
      .select('stage_id, exercise_id, is_unlocked, unlocked_at')
      .eq('is_unlocked', true)

    // Get AI Tutor stage progress (ALL TIME)
    const { data: stageProgress } = await supabase
      .from('ai_tutor_user_stage_progress')
      .select('stage_id, completed, average_score, progress_percentage, time_spent_minutes')

    // Get AI Tutor topic progress details (ALL TIME)
    const { data: topicProgress } = await supabase
      .from('ai_tutor_user_topic_progress')
      .select('stage_id, exercise_id, topic_id, score, completed, total_time_seconds, urdu_used')

    // Get AI Tutor weekly summaries (ALL TIME)
    const { data: weeklySummaries } = await supabase
      .from('ai_tutor_weekly_progress_summaries')
      .select('total_sessions, total_time_hours, average_score, consistency_score, stages_completed, exercises_mastered, milestones_earned')

    // Get AI Tutor user settings for analytics
    const { data: tutorSettings } = await supabase
      .from('ai_tutor_settings')
      .select('personality_type, response_style, voice_enabled, learning_analytics, progress_tracking')
      .eq('learning_analytics', true)

    // Get comprehensive LMS data
    
    // Course enrollment data (ALL TIME)
    const { data: courseMembers } = await supabase
      .from('course_members')
      .select('course_id, user_id, role, created_at')

    // Assignment submissions (ALL TIME)
    const { data: assignments } = await supabase
      .from('assignment_submissions')
      .select('assignment_id, user_id, status, grade, submitted_at')

    // Quiz submissions and performance (ALL TIME)
    const { data: quizSubmissions } = await supabase
      .from('quiz_submissions')
      .select('user_id, course_id, score, submitted_at, manual_grading_required, manual_grading_completed')

    // Discussion engagement (ALL TIME) - Enhanced for analytics
    const { data: discussions } = await supabase
      .from('discussions')
      .select('id, title, creator_id, course_id, created_at, type')

    const { data: discussionReplies } = await supabase
      .from('discussion_replies')
      .select('discussion_id, user_id, created_at')

    // Enhanced content management data (ALL TIME)
    const { data: detailedCourses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title, subtitle, description, status, created_at, updated_at, image_url')

    // Get course categories if available
    let courseCategories: any[] = [];
    try {
      const { data } = await supabase
        .from('course_categories')
        .select('id, name, description, course_count');
      courseCategories = data || [];
    } catch (error) {
      // Table might not exist - that's okay
    }

    // Get course languages if available
    let courseLanguages: any[] = [];
    try {
      const { data } = await supabase
        .from('course_languages')
        .select('course_id, language_code, language_name');
      courseLanguages = data || [];
    } catch (error) {
      // Table might not exist - that's okay
    }

    // Get course levels if available
    let courseLevels: any[] = [];
    try {
      const { data } = await supabase
        .from('course_levels')
        .select('course_id, level_name, difficulty_rating');
      courseLevels = data || [];
    } catch (error) {
      // Table might not exist - that's okay
    }

    // Course structure data
    const { data: courseSections } = await supabase
      .from('course_sections')
      .select('course_id, title, position')

    const { data: courseLessons } = await supabase
      .from('course_lessons')
      .select('section_id, title, duration_text')

    const { data: lessonContent } = await supabase
      .from('course_lesson_content')
      .select('lesson_id, title, content_type')

    // LMS completion tracking (ALL TIME)
    const { data: lmsCompletionData } = await supabase
      .from('user_content_item_progress')
      .select('status, progress_data, completed_at, user_id, course_id')

    // User session data
    const { data: userSessions } = await supabase
      .from('user_sessions')
      .select('user_id, created_at, last_activity, is_active')
      .eq('is_active', true)

    // Access logs for detailed analytics (ALL TIME)
    const { data: accessLogs } = await supabase
      .from('access_logs')
      .select('user_id, action, status, created_at')
      .eq('status', 'success')

    // Calculate comprehensive AI Tutor metrics
    const aiAnalytics = aiTutorAnalytics || []
    const totalAiSessions = aiAnalytics.reduce((sum, a) => sum + (a.sessions_count || 0), 0)
    const totalAiTime = aiAnalytics.reduce((sum, a) => sum + (a.total_time_minutes || 0), 0)
    const avgAiSessionDuration = aiAnalytics.length > 0 ? 
      Math.round(aiAnalytics.reduce((sum, a) => sum + (a.average_session_duration || 0), 0) / aiAnalytics.length) : 0
    const avgAiScore = aiAnalytics.length > 0 ?
      Math.round(aiAnalytics.reduce((sum, a) => sum + (a.average_score || 0), 0) / aiAnalytics.length) : 0
    const totalExercisesCompleted = aiAnalytics.reduce((sum, a) => sum + (a.exercises_completed || 0), 0)
    const totalExercisesAttempted = aiAnalytics.reduce((sum, a) => sum + (a.exercises_attempted || 0), 0)
    const totalUrduUsage = aiAnalytics.reduce((sum, a) => sum + (a.urdu_usage_count || 0), 0)

    // AI Tutor completion rate
    const aiCompletionRate = totalExercisesAttempted > 0 ? 
      Math.round((totalExercisesCompleted / totalExercisesAttempted) * 100) : 0

    // Advanced AI Tutor metrics
    const milestonesData = milestones || []
    const totalMilestones = milestonesData.length
    const milestonesTypes = [...new Set(milestonesData.map(m => m.milestone_type))]

    const unlocksData = unlocks || []
    const totalUnlocks = unlocksData.length
    const stagesUnlocked = [...new Set(unlocksData.map(u => u.stage_id))].length

    const stageProgressData = stageProgress || []
    const completedStages = stageProgressData.filter(s => s.completed).length
    const avgStageScore = stageProgressData.length > 0 ?
      Math.round(stageProgressData.reduce((sum, s) => sum + (s.average_score || 0), 0) / stageProgressData.length) : 0

    const topicProgressData = topicProgress || []
    const completedTopics = topicProgressData.filter(t => t.completed).length
    const topicUrduUsage = topicProgressData.filter(t => t.urdu_used).length
    const avgTopicTime = topicProgressData.length > 0 ?
      Math.round(topicProgressData.reduce((sum, t) => sum + (t.total_time_seconds || 0), 0) / topicProgressData.length / 60) : 0

    const weeklyData = weeklySummaries || []
    const totalWeeklyMilestones = weeklyData.reduce((sum, w) => sum + (w.milestones_earned || 0), 0)
    const avgConsistencyScore = weeklyData.length > 0 ?
      Math.round(weeklyData.reduce((sum, w) => sum + (w.consistency_score || 0), 0) / weeklyData.length * 100) : 0

    // Calculate comprehensive LMS metrics
    const membersData = courseMembers || []
    const totalEnrollments = membersData.length
    const newEnrollments = membersData.filter(m => new Date(m.created_at) >= thisMonth).length

    const assignmentsData = assignments || []
    const submittedAssignments = assignmentsData.length
    const gradedAssignments = assignmentsData.filter(a => a.grade !== null).length
    const avgAssignmentGrade = gradedAssignments > 0 ?
      Math.round(assignmentsData.filter(a => a.grade !== null).reduce((sum, a) => sum + (a.grade || 0), 0) / gradedAssignments) : 0

    const quizData = quizSubmissions || []
    const totalQuizzes = quizData.length
    const avgQuizScore = quizData.length > 0 ?
      Math.round(quizData.reduce((sum, q) => sum + (q.score || 0), 0) / quizData.length) : 0
    const manualGradingRequired = quizData.filter(q => q.manual_grading_required).length

    const discussionsData = discussions || []
    const repliesData = discussionReplies || []
    const totalDiscussions = discussionsData.length
    const totalReplies = repliesData.length
    const discussionParticipants = [...new Set(repliesData.map(r => r.user_id))].length

    // Content management analytics
    const detailedCoursesData = detailedCourses || []
    const courseCategoriesData = courseCategories || []
    const courseLanguagesData = courseLanguages || []
    const courseLevelsData = courseLevels || []
    
    // Content structure analysis
    const totalDetailedCourses = detailedCoursesData.length
    const publishedCourses = detailedCoursesData.filter(c => c.status === 'Published').length
    const draftCourses = detailedCoursesData.filter(c => c.status === 'Draft').length
    const coursesWithImages = detailedCoursesData.filter(c => c.image_url).length
    const coursesWithSubtitles = detailedCoursesData.filter(c => c.subtitle).length
    
    // Content creation trends
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const coursesCreatedThisMonth = detailedCoursesData.filter(c => 
      new Date(c.created_at) >= currentMonth
    ).length
    
    const coursesUpdatedThisMonth = detailedCoursesData.filter(c => 
      new Date(c.updated_at) >= currentMonth
    ).length
    
    // Course structure metrics (using existing data)
    const sectionsData = courseSections || []
    const lessonsData = courseLessons || []
    const contentData = lessonContent || []
    
    const avgSectionsPerCourse = totalDetailedCourses > 0 ? 
      Math.round((sectionsData.length / totalDetailedCourses) * 10) / 10 : 0
    const avgLessonsPerCourse = totalDetailedCourses > 0 ? 
      Math.round((lessonsData.length / totalDetailedCourses) * 10) / 10 : 0
    const avgContentItemsPerCourse = totalDetailedCourses > 0 ? 
      Math.round((contentData.length / totalDetailedCourses) * 10) / 10 : 0
    
    // Content completion analysis (using existing progress data)
    const progressData = lmsCompletionData || []
    const totalContentProgress = progressData.length
    const completedContent = progressData.filter(p => p.status === 'completed').length
    const inProgressContent = progressData.filter(p => p.status === 'in_progress').length
    const contentCompletionRate = totalContentProgress > 0 ? 
      Math.round((completedContent / totalContentProgress) * 100) : 0
    
    // Most accessed courses (based on progress data)
    const courseAccessCounts = progressData.reduce((acc: any, progress: any) => {
      if (progress.course_id) {
        acc[progress.course_id] = (acc[progress.course_id] || 0) + 1
      }
      return acc
    }, {})
    
    const topAccessedCourses = Object.entries(courseAccessCounts)
      .sort(([,a]: any, [,b]: any) => b - a)
      .slice(0, 5)
      .map(([courseId, accessCount]) => {
        const course = detailedCoursesData.find(c => c.id === courseId)
        return { 
          courseId, 
          title: course?.title || 'Unknown Course',
          accessCount 
        }
      })
    
    // Content types analysis
    const uniqueContentTypes = [...new Set(contentData.map(c => c.content_type))].filter(Boolean)
    const contentTypeDistribution = uniqueContentTypes.map(type => ({
      type,
      count: contentData.filter(c => c.content_type === type).length
    }))
    
    // Course categories analysis
    const totalCategories = courseCategoriesData.length
    const avgCoursesPerCategory = totalCategories > 0 ? 
      Math.round(courseCategoriesData.reduce((sum, cat) => sum + (cat.course_count || 0), 0) / totalCategories) : 0
    
    // Language distribution
    const languageDistribution = courseLanguagesData.reduce((acc: any, lang: any) => {
      acc[lang.language_name] = (acc[lang.language_name] || 0) + 1
      return acc
    }, {})
    
    const topLanguages = Object.entries(languageDistribution)
      .sort(([,a]: any, [,b]: any) => b - a)
      .slice(0, 5)
      .map(([language, count]) => ({ language, count }))

    const sessionsData = userSessions || []
    const activeSessions = sessionsData.length
    const uniqueActiveUsers = [...new Set(sessionsData.map(s => s.user_id))].length

    const logsData = accessLogs || []
    const totalSuccessfulActions = logsData.length
    const uniqueActiveUsersFromLogs = [...new Set(logsData.map(l => l.user_id))].length

    // Course structure metrics
    const totalSections = (courseSections || []).length
    const totalLessons = (courseLessons || []).length
    const totalContent = (lessonContent || []).length
    const allContentTypes = [...new Set((lessonContent || []).map(c => c.content_type))]

    // Calculate LMS completion rate
    const lmsCompletions = lmsCompletionData || []
    const lmsCompletedCount = lmsCompletions.filter(c => c.status === 'completed').length
    const lmsCompletionRate = lmsCompletions.length > 0 ? 
      Math.round((lmsCompletedCount / lmsCompletions.length) * 100) : 0

    // Calculate overall engagement rate
    const totalActiveUsers = Math.max(aiTutorActiveUsers || 0, lmsActiveUsers || 0)
    const engagementRate = totalUsers > 0 ? Math.round((totalActiveUsers / totalUsers) * 100) : 0

    // Get popular courses
    const { data: popularCourses } = await supabase
      .from('courses')
      .select('title')
      .eq('status', 'Published')
      .limit(5)

    const courseNames = popularCourses?.map(c => c.title) || []

    // Get user roles distribution
    const { data: userRoles } = await supabase
      .from('profiles')
      .select('role')
      .not('role', 'is', null)

    const roleDistribution = userRoles?.reduce((acc: any, user: any) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {}) || {}

    // Get AI Tutor user progress stats
    const progressStats = progressSummaries || []
    
    // Calculate overall progress percentage using multiple data sources
    let avgProgressPercentage = 0;
    
    if (progressStats.length > 0) {
      const summaryProgressPercentage = Math.round(progressStats.reduce((sum, p) => sum + (p.overall_progress_percentage || 0), 0) / progressStats.length);
      
      if (summaryProgressPercentage > 0) {
        avgProgressPercentage = summaryProgressPercentage;
      } else {
        // Fallback: Calculate from stage progress data
        const stageProgressData = stageProgress || []
        if (stageProgressData.length > 0) {
          avgProgressPercentage = Math.round(stageProgressData.reduce((sum, s) => sum + (s.progress_percentage || 0), 0) / stageProgressData.length);
        } else if (totalExercisesCompleted > 0 && totalExercisesAttempted > 0) {
          avgProgressPercentage = Math.round((totalExercisesCompleted / totalExercisesAttempted) * 100);
        }
      }
    } else if (totalExercisesCompleted > 0) {
      // Estimate progress: ~20 exercises per stage, 6 stages total
      const estimatedTotalExercises = 120;
      avgProgressPercentage = Math.min(100, Math.round((totalExercisesCompleted / estimatedTotalExercises) * 100));
    }
    
    const totalStreakDays = progressStats.reduce((sum, p) => sum + (p.streak_days || 0), 0)

    // ALWAYS FETCH ALL USER DATA - Let AI decide what to use
    let studentList: any[] = []
    let studentTotal: number = 0
    let teacherList: any[] = []
    let teacherTotal: number = 0
    let adminList: any[] = []
    let adminTotal: number = 0
    let activeTodayList: any[] = []
    let activeTodayTotal: number = 0
    let enrolledStudentsList: any[] = []
    let enrolledStudentsTotal: number = 0
    let nonEnrolledStudentsList: any[] = []
    let nonEnrolledStudentsTotal: number = 0
    
    // OPTIMIZED USER DATA FETCHING - Limit data to reduce token usage
    console.log('📊 Fetching optimized user data for AI analysis');
    
    try {
      // Fetch students (limited to 10 for token efficiency)
      const { data: allStudents, count: studentsCount } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, created_at', { count: 'exact' })
        .eq('role', 'student')
        .order('created_at', { ascending: false })
        .limit(10);
      studentList = allStudents || [];
      studentTotal = studentsCount || 0;
      
      // Fetch teachers (limited to 10 for token efficiency)
      const { data: allTeachers, count: teachersCount } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, created_at', { count: 'exact' })
        .eq('role', 'teacher')
        .order('created_at', { ascending: false })
        .limit(10);
      teacherList = allTeachers || [];
      teacherTotal = teachersCount || 0;
      
      // Fetch admins (limited to 10 for token efficiency)
      const { data: allAdmins, count: adminsCount } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, created_at', { count: 'exact' })
        .eq('role', 'admin')
        .order('created_at', { ascending: false })
        .limit(10);
      adminList = allAdmins || [];
      adminTotal = adminsCount || 0;
      
      // Fetch recently active users (last 24 hours)
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      console.log('🔍 Fetching active users since:', twentyFourHoursAgo.toISOString());
      
      // First, get all access logs from the last 24 hours
      const { data: recentAccessLogs, error: accessLogsError } = await supabase
        .from('access_logs')
        .select('user_id, created_at, action, status')
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .eq('status', 'success')
        .order('created_at', { ascending: false });
      
      if (accessLogsError) {
        console.error('❌ Error fetching access logs:', accessLogsError);
      } else {
        console.log('📊 Found', recentAccessLogs?.length || 0, 'access logs in last 24 hours');
      }
      
      // Get unique user IDs from recent access logs
      const activeUserIds = new Set();
      recentAccessLogs?.forEach(log => {
        if (log.user_id) {
          activeUserIds.add(log.user_id);
        }
      });
      
      console.log('👥 Unique active user IDs:', activeUserIds.size);
      
      // Now fetch profile data for these active users (limited for tokens)
      if (activeUserIds.size > 0) {
        const { data: activeUserProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('first_name, last_name, email, created_at')
          .in('id', Array.from(activeUserIds))
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (profilesError) {
          console.error('❌ Error fetching active user profiles:', profilesError);
          activeTodayList = [];
          activeTodayTotal = 0;
        } else {
          activeTodayList = activeUserProfiles || [];
          activeTodayTotal = activeUserIds.size; // Use actual count, not limited list
          console.log('✅ Active users fetched:', activeTodayTotal);
        }
      } else {
        activeTodayList = [];
        activeTodayTotal = 0;
        console.log('ℹ️ No active users found in the last 24 hours');
      }
      
      // Fetch enrolled students (optimized)
      const { data: enrolledStudentIds } = await supabase
        .from('course_members')
        .select('user_id')
        .eq('role', 'student')
        .limit(100);
      
      const enrolledIds = new Set(enrolledStudentIds?.map(e => e.user_id) || []);
      enrolledStudentsTotal = enrolledIds.size;
      
      if (enrolledIds.size > 0) {
        const { data: enrolledStudents } = await supabase
          .from('profiles')
          .select('first_name, last_name, email, created_at')
          .eq('role', 'student')
          .in('id', Array.from(Array.from(enrolledIds).slice(0, 10)))
          .order('created_at', { ascending: false });
        enrolledStudentsList = enrolledStudents || [];
      }
      
      // Calculate non-enrolled students (optimized)
      nonEnrolledStudentsTotal = Math.max(0, studentTotal - enrolledStudentsTotal);
      nonEnrolledStudentsList = allStudents?.filter(student => 
        !enrolledIds.has((student as any).id)
      ).slice(0, 10) || [];
      
      console.log('✅ Comprehensive user data fetched:', {
        students: studentTotal,
        teachers: teacherTotal,
        admins: adminTotal,
        recentlyActive: activeTodayTotal,
        enrolled: enrolledStudentsTotal,
        nonEnrolled: nonEnrolledStudentsTotal
      });
      
    } catch (error) {
      console.error('❌ Error fetching comprehensive user data:', error);
    }
    
    if (opts.list === 'active_today') {
      const from = ((opts.page || 1) - 1) * (opts.pageSize || 25)
      const to = from + (opts.pageSize || 25) - 1

      // Use the timeframe-based startDate if available, otherwise default to today
      let activeStartDate: Date;
      if (startDate) {
        activeStartDate = startDate;
      } else {
        activeStartDate = new Date();
        activeStartDate.setHours(0, 0, 0, 0);
      }
      const activeStartISO = activeStartDate.toISOString()
      
      // First, try to get users from user_sessions
      const { data: sessionUsers, error: sessionError } = await supabase
        .from('profiles')
        .select(`
          id, first_name, last_name, email, role, created_at,
          user_sessions!inner(last_activity)
        `)
        .gte('user_sessions.last_activity', activeStartISO)
        .eq('user_sessions.is_active', true)
        .order('user_sessions.last_activity', { ascending: false })

      if (sessionError) {
        console.error('Session query error:', sessionError);
      }

      // Also get users from login_attempts (successful logins)
      // First try direct query on login_attempts table
      const { data: recentLogins, error: directLoginError } = await supabase
        .from('login_attempts')
        .select(`
          user_id, attempt_time, success,
          profiles!inner(id, first_name, last_name, email, role, created_at)
        `)
        .gte('attempt_time', activeStartISO)
        .eq('success', true)
        .order('attempt_time', { ascending: false })

      if (directLoginError) {
        console.error('Login query error:', directLoginError);
      }

      // Convert to user format
      const loginUsers = recentLogins?.map(login => ({
        ...login.profiles,
        login_attempts: [{ attempt_time: login.attempt_time }]
      })) || [];

      const loginError = directLoginError;

      // Combine and deduplicate users from both sources
      const allActiveUsers = new Map();
      
      // Add session users
      if (sessionUsers) {
        sessionUsers.forEach(user => {
          allActiveUsers.set(user.id, {
            ...user,
            last_activity: user.user_sessions?.[0]?.last_activity
          });
        });
      }
      
      // Add login users (will overwrite if same user, keeping most recent activity)
      if (loginUsers) {
        loginUsers.forEach(user => {
          const existingUser = allActiveUsers.get(user.id);
          const loginTime = user.login_attempts?.[0]?.attempt_time;
          
          if (!existingUser || (loginTime && (!existingUser.last_activity || loginTime > existingUser.last_activity))) {
            allActiveUsers.set(user.id, {
              ...user,
              last_activity: loginTime
            });
          }
        });
      }

      // Convert to array and apply pagination
      const activeUsersArray = Array.from(allActiveUsers.values())
        .sort((a, b) => new Date(b.last_activity || 0).getTime() - new Date(a.last_activity || 0).getTime());
      
      const count = activeUsersArray.length;
      const activeUsers = activeUsersArray.slice(from, to + 1);
      
      const activeError = sessionError || loginError;

      // Use the combined results
      activeTodayList = activeUsers || []
      activeTodayTotal = count || 0
    } else if (opts.list === 'users') {
      const from = ((opts.page || 1) - 1) * (opts.pageSize || 25)
      const to = from + (opts.pageSize || 25) - 1

      let base = supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, created_at', { count: 'exact' })

      // Filter by role if specified
      if (opts.role) {
        base = base.eq('role', opts.role)
      }

      if (opts.search) {
        const s = `%${opts.search.toLowerCase()}%`
        base = base.or(`first_name.ilike.${s},last_name.ilike.${s},email.ilike.${s}`)
      }

      const { data: users, count, error: userError } = await base
        .range(from, to)
        .order('created_at', { ascending: false })

      if (userError) {
        console.error('Error fetching users:', userError)
      } else {
        // Users data now handled by comprehensive fetching above
        console.log('✅ User list query handled by comprehensive data fetching');
      }
    } else if (opts.list === 'teachers') {
      const from = ((opts.page || 1) - 1) * (opts.pageSize || 25)
      const to = from + (opts.pageSize || 25) - 1

      let base = supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, created_at', { count: 'exact' })
        .eq('role', 'teacher')

      if (opts.search) {
        const s = `%${opts.search.toLowerCase()}%`
        base = base.or(`first_name.ilike.${s},last_name.ilike.${s},email.ilike.${s}`)
      }

      const { data: teachers, count, error: teacherError } = await base
        .range(from, to)
        .order('created_at', { ascending: false })

      if (teacherError) {
        console.error('Error fetching teachers:', teacherError)
      } else {
        teacherList = teachers || []
        teacherTotal = count || 0
      }
    } else if (opts.list === 'students') {
      const from = ((opts.page || 1) - 1) * (opts.pageSize || 25)
      const to = from + (opts.pageSize || 25) - 1

      let base = supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, created_at', { count: 'exact' })
        .eq('role', 'student')

      if (opts.search) {
        const s = `%${opts.search.toLowerCase()}%`
        base = base.or(
          `lower(first_name).like.${s},lower(last_name).like.${s},lower(email).like.${s}`
        )
      }

      const { data: students, count } = await base.range(from, to)
      studentList = students || []
      studentTotal = count || 0
    } else if (opts.list === 'non_enrolled_students') {
      const from = ((opts.page || 1) - 1) * (opts.pageSize || 25)
      const to = from + (opts.pageSize || 25) - 1

      // Find students who are not enrolled in any course
      // First get all student IDs who are enrolled
      const { data: enrolledStudentIds } = await supabase
        .from('course_members')
        .select('user_id')
        .eq('role', 'student')

      const enrolledIds = new Set(enrolledStudentIds?.map(e => e.user_id) || [])
      console.log('📚 Found enrolled student IDs:', enrolledIds.size)

      // Get all students
      const { data: allStudents, count: totalStudents, error: studentsError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, created_at', { count: 'exact' })
        .eq('role', 'student')

      let nonEnrolledStudents: any[] = []
      let nonEnrolledError = studentsError

      if (!studentsError && allStudents) {
        // Filter out enrolled students
        nonEnrolledStudents = allStudents.filter(student => !enrolledIds.has(student.id))
        console.log('📚 Total students:', allStudents.length, 'Non-enrolled:', nonEnrolledStudents.length)
        
        // Apply pagination
        const startIndex = from
        const endIndex = Math.min(startIndex + (opts.pageSize || 25), nonEnrolledStudents.length)
        nonEnrolledStudents = nonEnrolledStudents.slice(startIndex, endIndex)
      }

      if (nonEnrolledError) {
        console.error('Error fetching non-enrolled students:', nonEnrolledError)
        studentList = []
        studentTotal = 0
      } else {
        console.log('📚 Found non-enrolled students:', nonEnrolledStudents?.length || 0)
        studentList = nonEnrolledStudents || []
        studentTotal = nonEnrolledStudents?.length || 0
      }
    } else if (opts.list === 'enrolled_students') {
      const from = ((opts.page || 1) - 1) * (opts.pageSize || 25)
      const to = from + (opts.pageSize || 25) - 1

      // Find students who ARE enrolled in at least one course
      // Get all student IDs who are enrolled
      const { data: enrolledStudentIds } = await supabase
        .from('course_members')
        .select('user_id')
        .eq('role', 'student')

      const enrolledIds = new Set(enrolledStudentIds?.map(e => e.user_id) || [])
      console.log('📚 Found enrolled student IDs:', enrolledIds.size)

      if (enrolledIds.size > 0) {
        // Get student details for enrolled students
        const { data: enrolledStudents, count, error: enrolledError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, role, created_at', { count: 'exact' })
          .eq('role', 'student')
          .in('id', Array.from(enrolledIds))
          .range(from, to)

        if (enrolledError) {
          console.error('Error fetching enrolled students:', enrolledError)
          studentList = []
          studentTotal = 0
        } else {
          console.log('📚 Found enrolled students:', enrolledStudents?.length || 0)
          studentList = enrolledStudents || []
          studentTotal = count || 0
        }
      } else {
        console.log('📚 No enrolled students found')
        studentList = []
        studentTotal = 0
      }
    }
    
    // Handle teacher-specific course queries
    let teacherCourses: any[] | undefined = undefined
    let teacherCoursesTotal: number | undefined = undefined
    
    if (opts.teacherName) {
      try {
        // First, find the teacher by name
        const { data: teachers, error: teacherError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .eq('role', 'teacher')
          .or(`first_name.ilike.%${opts.teacherName}%,last_name.ilike.%${opts.teacherName}%,email.ilike.%${opts.teacherName}%`)
        
        if (teacherError) {
          console.error('Error finding teacher:', teacherError);
        } else if (teachers && teachers.length > 0) {
          // Get courses for all matching teachers
          const teacherIds = teachers.map(t => t.id);
          
          const { data: courseData, error: courseError } = await supabase
            .from('course_members')
            .select(`
              course_id,
              courses!inner(id, title, subtitle, status, created_at),
              profiles!inner(id, first_name, last_name, email)
            `)
            .in('user_id', teacherIds)
            .eq('role', 'teacher')
          
          if (courseError) {
            console.error('Error fetching teacher courses:', courseError);
          } else {
            teacherCourses = courseData?.map(item => ({
              ...item.courses,
              teacher: item.profiles
            })) || [];
            teacherCoursesTotal = teacherCourses?.length || 0;
          }
        }
      } catch (error) {
        console.error('Error in teacher course query:', error);
      }
    }
    
    // Handle course list queries (all courses)
    let allCoursesList: any[] | undefined = undefined
    let allCoursesTotal: number | undefined = undefined
    
    if (opts.list === 'courses') {
      try {
        const { data: coursesData, count, error: coursesListError } = await supabase
          .from('courses')
          .select('id, title, subtitle, status, created_at, updated_at, image_url', { count: 'exact' })
          .order('created_at', { ascending: false })
        
        if (coursesListError) {
          console.error('Error fetching courses list:', coursesListError);
        } else {
          allCoursesList = coursesData || [];
          allCoursesTotal = count || 0;
        }
      } catch (error) {
        console.error('Error in courses list query:', error);
      }
    }
    
    // Handle course-specific enrollment queries
    let courseEnrollments: any[] | undefined = undefined
    let courseEnrollmentTotal: number | undefined = undefined
    let courseDetails: any | undefined = undefined
    
    if (opts.courseName) {
      try {
        // Find the course by name (fuzzy search)
        const { data: courses, error: courseError } = await supabase
          .from('courses')
          .select('id, title, subtitle, status, created_at')
          .ilike('title', `%${opts.courseName}%`)
        
        if (courseError) {
          console.error('Error finding course:', courseError);
        } else if (courses && courses.length > 0) {
          // Use the first matching course
          const course = courses[0];
          courseDetails = course;
          
          // Get enrollment data for this course
          const { data: enrollmentData, count, error: enrollmentError } = await supabase
            .from('course_members')
            .select(`
              user_id, role, created_at,
              profiles!inner(id, first_name, last_name, email, role)
            `, { count: 'exact' })
            .eq('course_id', course.id)
            .eq('role', 'student')
          
          if (enrollmentError) {
            console.error('Error fetching course enrollments:', enrollmentError);
          } else {
            courseEnrollments = enrollmentData?.map(item => ({
              ...item.profiles,
              enrolled_at: item.created_at,
              course_title: course.title
            })) || [];
            courseEnrollmentTotal = count || 0;
          }
        }
      } catch (error) {
        console.error('Error in course enrollment query:', error);
      }
    }

    return {
      totalUsers: totalUsers || 0,
      newUsersThisMonth: newUsersThisMonth || 0,
      activeUsersThisMonth: Math.max(uniqueActiveUsers, uniqueActiveUsersFromLogs),
      totalCourses: totalCourses || 0,
      completionRate: Math.round((aiCompletionRate + lmsCompletionRate) / 2),
      engagementRate: engagementRate,
      averageSessionDuration: avgAiSessionDuration,
      timeRange: timeRangeLabel,
      popularCourses: courseNames,
      userRoles: roleDistribution,
      totalPracticeSessions: totalAiSessions,
      
      // Comprehensive AI Tutor metrics
      aiTutorActiveUsers: aiTutorActiveUsers || 0,
      aiTutorSessions: totalAiSessions,
      aiTutorTotalTime: totalAiTime,
      aiTutorAverageScore: avgAiScore,
      aiTutorCompletionRate: aiCompletionRate,
      aiTutorExercisesCompleted: totalExercisesCompleted,
      aiTutorExercisesAttempted: totalExercisesAttempted,
      aiTutorProgressPercentage: avgProgressPercentage,
      aiTutorStreakDays: totalStreakDays,
      aiTutorUrduUsage: totalUrduUsage,
      aiTutorMilestones: totalMilestones,
      aiTutorMilestoneTypes: milestonesTypes,
      aiTutorUnlocks: totalUnlocks,
      aiTutorStagesUnlocked: stagesUnlocked,
      aiTutorCompletedStages: completedStages,
      aiTutorAvgStageScore: avgStageScore,
      aiTutorCompletedTopics: completedTopics,
      aiTutorTopicUrduUsage: topicUrduUsage,
      aiTutorAvgTopicTime: avgTopicTime,
      aiTutorWeeklyMilestones: totalWeeklyMilestones,
      aiTutorConsistencyScore: avgConsistencyScore,
      
      // Comprehensive LMS metrics
      lmsActiveUsers: lmsActiveUsers || 0,
      lmsCompletionRate: lmsCompletionRate,
      lmsEnrollments: totalEnrollments,
      lmsNewEnrollments: newEnrollments,
      lmsAssignmentsSubmitted: submittedAssignments,
      lmsAssignmentsGraded: gradedAssignments,
      lmsAvgAssignmentGrade: avgAssignmentGrade,
      lmsTotalQuizzes: totalQuizzes,
      lmsAvgQuizScore: avgQuizScore,
      lmsManualGradingRequired: manualGradingRequired,
      lmsTotalDiscussions: totalDiscussions,
      lmsTotalReplies: totalReplies,
      lmsDiscussionParticipants: discussionParticipants,
      
      // Content management analytics
      lmsTotalDetailedCourses: totalDetailedCourses,
      lmsPublishedCourses: publishedCourses,
      lmsDraftCourses: draftCourses,
      lmsCoursesWithImages: coursesWithImages,
      lmsCoursesWithSubtitles: coursesWithSubtitles,
      lmsCoursesCreatedThisMonth: coursesCreatedThisMonth,
      lmsCoursesUpdatedThisMonth: coursesUpdatedThisMonth,
      lmsAvgSectionsPerCourse: avgSectionsPerCourse,
      lmsAvgLessonsPerCourse: avgLessonsPerCourse,
      lmsAvgContentItemsPerCourse: avgContentItemsPerCourse,
      lmsContentCompletionRate: contentCompletionRate,
      lmsTopAccessedCourses: topAccessedCourses,
      lmsContentTypeDistribution: contentTypeDistribution,
      lmsTotalCategories: totalCategories,
      lmsAvgCoursesPerCategory: avgCoursesPerCategory,
      lmsTopLanguages: topLanguages,
      lmsTotalSections: totalSections,
      lmsTotalLessons: totalLessons,
      lmsTotalContent: totalContent,
      lmsContentTypes: allContentTypes,
      
      // Platform-wide metrics
      activeSessions: activeSessions,
      totalSuccessfulActions: totalSuccessfulActions,
      uniqueActiveUsersFromSessions: uniqueActiveUsers,
      uniqueActiveUsersFromLogs: uniqueActiveUsersFromLogs,
      
      availableMetrics: [
        'AI Tutor Sessions & Progress',
        'Learning Milestones & Achievements', 
        'Stage & Topic Progress',
        'Exercise Completion & Scores',
        'Learning Streaks & Consistency',
        'Urdu Language Usage',
        'LMS Course Enrollments',
        'Assignment & Quiz Performance',
        'Discussion Engagement',
        'Course Structure Analytics',
        'User Session Tracking',
        'Platform Activity Logs',
        'Cross-Platform Insights'
      ],
      lastUpdated: new Date().toISOString(),
      dataQuality: {
        userDataComplete: (totalUsers || 0) > 0,
        courseDataComplete: (totalCourses || 0) > 0,
        engagementDataComplete: totalAiSessions > 0 || totalSuccessfulActions > 0,
        aiTutorDataComplete: totalAiSessions > 0,
        lmsDataComplete: totalEnrollments > 0 || submittedAssignments > 0,
        milestonesDataComplete: totalMilestones > 0,
        discussionDataComplete: totalDiscussions > 0 || totalReplies > 0,
        sessionDataComplete: activeSessions > 0,
        confidenceScore: Math.min(100, Math.max(0, 
          ((totalUsers || 0) > 0 ? 15 : 0) +
          ((totalCourses || 0) > 0 ? 15 : 0) +
          (totalAiSessions > 0 ? 20 : 0) +
          (totalEnrollments > 0 ? 15 : 0) +
          (totalMilestones > 0 ? 10 : 0) +
          (totalDiscussions > 0 ? 10 : 0) +
          (activeSessions > 0 ? 15 : 0)
        )),
        note: 'Comprehensive real data from all AI Tutor and LMS tables'
      },
      // COMPREHENSIVE USER DATA - Always available for AI analysis
      studentList,
      studentTotal,
      teacherList,
      teacherTotal,
      adminList,
      adminTotal,
      activeTodayList,
      activeTodayTotal,
      enrolledStudentsList,
      enrolledStudentsTotal,
      nonEnrolledStudentsList,
      nonEnrolledStudentsTotal,
      teacherCourses,
      teacherCoursesTotal,
      courseEnrollments,
      courseEnrollmentTotal,
      courseDetails,
      allCoursesList,
      allCoursesTotal,
      
      // Course categories and content management data
      courseCategories: courseCategoriesData,
      totalCategories,
      avgCoursesPerCategory,
      courseLanguages: courseLanguagesData,
      courseLevels: courseLevelsData,
      languageDistribution,
      topLanguages,
      
      // Content structure analytics
      detailedCourses: detailedCoursesData,
      publishedCourses,
      draftCourses,
      coursesWithImages,
      coursesWithSubtitles,
      contentTypeDistribution,
      
      progressSummariesRaw: opts.includeRawProgress ? (progressSummaries || []) : undefined,
      stageProgressRaw: opts.includeRawStages ? (stageProgress || []) : undefined,
      topicProgressRaw: opts.includeRawTopics ? (topicProgress || []) : undefined,
    }
  } catch (error) {
    console.error('Error fetching platform context:', error)
    
    // Return empty fallback data - NO MOCK DATA in production
    return {
      totalUsers: 0,
      newUsersThisMonth: 0,
      activeUsersThisMonth: 0,
      totalCourses: 0,
      completionRate: 0,
      engagementRate: 0,
      averageSessionDuration: 0,
      timeRange: timeRangeLabel,
      popularCourses: [],
      userRoles: {},
      totalPracticeSessions: 0,
      availableMetrics: [
        'User Registration',
        'Course Completion',
        'Engagement Rate',
        'Session Duration',
        'Login Frequency',
        'Practice Scores',
        'Course Progress',
        'User Activity',
        'Platform Analytics'
      ],
      lastUpdated: new Date().toISOString(),
      dataQuality: {
        userDataComplete: false,
        courseDataComplete: false,
        engagementDataComplete: false,
        confidenceScore: 0,
        note: 'Database connection failed - no real data available. Production system requires valid database connection.'
      }
    }
  }
}
