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

    // Get platform context data
    const contextData = await getPlatformContext(supabase)

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

async function getPlatformContext(supabase: any) {
  try {
    console.log('=== Starting getPlatformContext function ===')
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisYear = new Date(now.getFullYear(), 0, 1)
    
    console.log('Date ranges:', {
      thisMonth: thisMonth.toISOString(),
      lastMonth: lastMonth.toISOString(),
      thisYear: thisYear.toISOString()
    })

    // Get total users from profiles
    console.log('Querying profiles table with SERVICE_ROLE_KEY...')
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    
    console.log('Profiles query result:', { totalUsers, error: usersError })
    
    if (usersError) {
      console.error('Error querying profiles:', usersError)
    } else {
      console.log(`✅ Found ${totalUsers} users in database`)
    }

    // Get new users this month
    const { count: newUsersThisMonth } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thisMonth.toISOString())

    // Get AI Tutor active users this month from daily analytics
    const { count: aiTutorActiveUsers } = await supabase
      .from('ai_tutor_daily_learning_analytics')
      .select('user_id', { count: 'exact', head: true })
      .gte('analytics_date', thisMonth.toISOString().split('T')[0])
      .gt('sessions_count', 0)

    // Get LMS active users this month from content progress
    const { count: lmsActiveUsers } = await supabase
      .from('user_content_item_progress')
      .select('user_id', { count: 'exact', head: true })
      .gte('updated_at', thisMonth.toISOString())

    // Get total published courses
    const { count: totalCourses } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Published')

    // Get comprehensive AI Tutor analytics data for this month
    const { data: aiTutorAnalytics } = await supabase
      .from('ai_tutor_daily_learning_analytics')
      .select('sessions_count, total_time_minutes, average_session_duration, average_score, exercises_completed, exercises_attempted, urdu_usage_count')
      .gte('analytics_date', thisMonth.toISOString().split('T')[0])

    // Get AI Tutor progress summaries
    const { data: progressSummaries } = await supabase
      .from('ai_tutor_user_progress_summary')
      .select('overall_progress_percentage, total_exercises_completed, total_time_spent_minutes, streak_days, longest_streak, weekly_learning_hours, monthly_learning_hours')
      .gte('last_activity_date', thisMonth.toISOString().split('T')[0])

    // Get AI Tutor milestones and achievements
    const { data: milestones } = await supabase
      .from('ai_tutor_learning_milestones')
      .select('milestone_type, milestone_title, earned_at')
      .gte('earned_at', thisMonth.toISOString())

    // Get AI Tutor unlocks data
    const { data: unlocks } = await supabase
      .from('ai_tutor_learning_unlocks')
      .select('stage_id, exercise_id, is_unlocked, unlocked_at')
      .eq('is_unlocked', true)
      .gte('unlocked_at', thisMonth.toISOString())

    // Get AI Tutor stage progress
    const { data: stageProgress } = await supabase
      .from('ai_tutor_user_stage_progress')
      .select('stage_id, completed, average_score, progress_percentage, time_spent_minutes')
      .gte('updated_at', thisMonth.toISOString())

    // Get AI Tutor topic progress details
    const { data: topicProgress } = await supabase
      .from('ai_tutor_user_topic_progress')
      .select('stage_id, exercise_id, topic_id, score, completed, total_time_seconds, urdu_used')
      .gte('created_at', thisMonth.toISOString())

    // Get AI Tutor weekly summaries
    const { data: weeklySummaries } = await supabase
      .from('ai_tutor_weekly_progress_summaries')
      .select('total_sessions, total_time_hours, average_score, consistency_score, stages_completed, exercises_mastered, milestones_earned')
      .gte('week_start_date', thisMonth.toISOString().split('T')[0])

    // Get AI Tutor user settings for analytics
    const { data: tutorSettings } = await supabase
      .from('ai_tutor_settings')
      .select('personality_type, response_style, voice_enabled, learning_analytics, progress_tracking')
      .eq('learning_analytics', true)

    // Get comprehensive LMS data
    
    // Course enrollment data
    const { data: courseMembers } = await supabase
      .from('course_members')
      .select('course_id, user_id, role, created_at')
      .gte('created_at', thisMonth.toISOString())

    // Assignment submissions
    const { data: assignments } = await supabase
      .from('assignment_submissions')
      .select('assignment_id, user_id, status, grade, submitted_at')
      .gte('submitted_at', thisMonth.toISOString())

    // Quiz submissions and performance
    const { data: quizSubmissions } = await supabase
      .from('quiz_submissions')
      .select('user_id, course_id, score, submitted_at, manual_grading_required, manual_grading_completed')
      .gte('submitted_at', thisMonth.toISOString())

    // Discussion engagement
    const { data: discussions } = await supabase
      .from('discussions')
      .select('id, title, creator_id, course_id, created_at, type')
      .gte('created_at', thisMonth.toISOString())

    const { data: discussionReplies } = await supabase
      .from('discussion_replies')
      .select('discussion_id, user_id, created_at')
      .gte('created_at', thisMonth.toISOString())

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

    // LMS completion tracking
    const { data: lmsCompletionData } = await supabase
      .from('user_content_item_progress')
      .select('status, progress_data, completed_at, user_id, course_id')
      .gte('updated_at', thisMonth.toISOString())

    // User session data
    const { data: userSessions } = await supabase
      .from('user_sessions')
      .select('user_id, created_at, last_activity, is_active')
      .gte('created_at', thisMonth.toISOString())
      .eq('is_active', true)

    // Access logs for detailed analytics
    const { data: accessLogs } = await supabase
      .from('access_logs')
      .select('user_id, action, status, created_at')
      .gte('created_at', thisMonth.toISOString())
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
    const contentTypes = [...new Set((lessonContent || []).map(c => c.content_type))]

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
    const avgProgressPercentage = progressStats.length > 0 ?
      Math.round(progressStats.reduce((sum, p) => sum + (p.overall_progress_percentage || 0), 0) / progressStats.length) : 0
    const totalStreakDays = progressStats.reduce((sum, p) => sum + (p.streak_days || 0), 0)

    return {
      totalUsers: totalUsers || 0,
      newUsersThisMonth: newUsersThisMonth || 0,
      activeUsersThisMonth: Math.max(uniqueActiveUsers, uniqueActiveUsersFromLogs),
      totalCourses: totalCourses || 0,
      completionRate: Math.round((aiCompletionRate + lmsCompletionRate) / 2),
      engagementRate: engagementRate,
      averageSessionDuration: avgAiSessionDuration,
      timeRange: 'Current Month',
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
      lmsTotalSections: totalSections,
      lmsTotalLessons: totalLessons,
      lmsTotalContent: totalContent,
      lmsContentTypes: contentTypes,
      
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
      }
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
      timeRange: 'Current Month',
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
