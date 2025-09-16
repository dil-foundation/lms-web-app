import { supabase } from '@/integrations/supabase/client';
import {
  StandaloneQuiz,
  StandaloneQuizQuestion,
  StandaloneQuestionOption,
  StandaloneQuizAttempt,
  StandaloneQuizRetryRequest,
  StandaloneQuizMathAnswer,
  QuizCourseLink,
  QuizWithQuestions,
  QuizAttemptWithDetails,
  QuizStatistics,
  QuestionPerformanceAnalytics,
  QuizPerformanceAnalytics,
  UserQuizHistory,
  QuizLeaderboardEntry,
  UserQuizCompletionStatus,
  CourseLinkedQuiz,
  AvailableQuizForCourse,
  BulkLinkResult,
  QuizSearchFilters,
  QuizFormData,
  QuestionFormData,
  QuizSubmission,
  QuizResult,
  QuestionResult,
  DEFAULT_QUIZ_FORM_DATA,
  DEFAULT_QUESTION_FORM_DATA
} from '@/types/standaloneQuiz';

export class StandaloneQuizService {
  // Quiz Management
  static async createQuiz(quizData: QuizFormData): Promise<StandaloneQuiz> {
    // Remove members field as it's not a column in standalone_quizzes table
    const { members, ...quizDataWithoutMembers } = quizData as any;
    
    const { data, error } = await supabase
      .from('standalone_quizzes')
      .insert([{
        ...quizDataWithoutMembers,
        author_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateQuiz(quizId: string, quizData: Partial<QuizFormData>): Promise<StandaloneQuiz> {
    // Remove members field as it's not a column in standalone_quizzes table
    const { members, ...quizDataWithoutMembers } = quizData as any;
    
    const { data, error } = await supabase
      .from('standalone_quizzes')
      .update(quizDataWithoutMembers)
      .eq('id', quizId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteQuiz(quizId: string): Promise<void> {
    const { error } = await supabase
      .from('standalone_quizzes')
      .delete()
      .eq('id', quizId);

    if (error) throw error;
  }

  static async getQuiz(quizId: string): Promise<StandaloneQuiz | null> {
    const { data, error } = await supabase
      .from('standalone_quizzes')
      .select('*')
      .eq('id', quizId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getQuizWithQuestions(quizId: string): Promise<QuizWithQuestions> {
    // First try the RPC function
    try {
      const { data, error } = await supabase.rpc('get_standalone_quiz_with_questions', {
        input_quiz_id: quizId
      });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('Quiz not found');
      }
      
      const quiz = data[0];
      
      // Check if quiz is null (function returned NULL values for not found)
      if (!quiz || !quiz.id) {
        throw new Error('Quiz not found');
      }
      
      // Fetch members separately to avoid schema cache issues (only for authorized users)
      try {
        const members = await this.getQuizMembers(quizId);
        quiz.members = members;
      } catch (memberError) {
        // Silently skip member fetching for unauthorized users (like students taking quizzes)
        quiz.members = [];
      }
      
      return quiz;
    } catch (rpcError) {
      console.warn('RPC function failed, falling back to direct table query:', rpcError);
      
      // Fallback: fetch quiz data directly from tables
      const { data: quiz, error: quizError } = await supabase
        .from('standalone_quizzes')
        .select('*')
        .eq('id', quizId)
        .maybeSingle();

      if (quizError) throw quizError;
      if (!quiz) throw new Error('Quiz not found');

      // Fetch questions
      const { data: questions, error: questionsError } = await supabase
        .from('standalone_quiz_questions')
        .select(`
          *,
          options:standalone_question_options(*)
        `)
        .eq('quiz_id', quizId)
        .order('position');

      if (questionsError) throw questionsError;

      // Fetch members (only for authorized users)
      let members = [];
      try {
        members = await this.getQuizMembers(quizId);
      } catch (memberError) {
        // Silently skip member fetching for unauthorized users (like students taking quizzes)
        members = [];
      }

      return {
        ...quiz,
        questions: questions || [],
        members: members
      };
    }
  }

  static async getQuizzesByAuthor(authorId?: string, includeDrafts: boolean = true): Promise<StandaloneQuiz[]> {
    const { data, error } = await supabase.rpc('get_quizzes_by_author', {
      author_id: authorId || (await supabase.auth.getUser()).data.user?.id,
      include_drafts: includeDrafts
    });

    if (error) throw error;
    return data;
  }

  static async searchQuizzes(filters: QuizSearchFilters): Promise<StandaloneQuiz[]> {
    const { data, error } = await supabase.rpc('search_standalone_quizzes', {
      search_term: filters.search_term || '',
      difficulty_filter: filters.difficulty_filter || '',
      status_filter: filters.status_filter || '',
      author_filter: filters.author_filter || null,
      limit_count: filters.limit_count || 20,
      offset_count: filters.offset_count || 0
    });

    if (error) throw error;
    return data;
  }

  static async duplicateQuiz(originalQuizId: string, newTitle: string): Promise<string> {
    const { data, error } = await supabase.rpc('duplicate_standalone_quiz', {
      original_quiz_id: originalQuizId,
      new_title: newTitle,
      new_author_id: (await supabase.auth.getUser()).data.user?.id
    });

    if (error) throw error;
    return data;
  }

  // Question Management
  static async createQuestion(quizId: string, questionData: QuestionFormData): Promise<StandaloneQuizQuestion> {
    const { data, error } = await supabase
      .from('standalone_quiz_questions')
      .insert([{
        ...questionData,
        quiz_id: quizId
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateQuestion(questionId: string, questionData: Partial<QuestionFormData>): Promise<StandaloneQuizQuestion> {
    const { data, error } = await supabase
      .from('standalone_quiz_questions')
      .update(questionData)
      .eq('id', questionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteQuestion(questionId: string): Promise<void> {
    const { error } = await supabase
      .from('standalone_quiz_questions')
      .delete()
      .eq('id', questionId);

    if (error) throw error;
  }

  static async deleteAllQuestions(quizId: string): Promise<void> {
    const { error } = await supabase
      .from('standalone_quiz_questions')
      .delete()
      .eq('quiz_id', quizId);

    if (error) throw error;
  }

  static async getQuestions(quizId: string): Promise<StandaloneQuizQuestion[]> {
    const { data, error } = await supabase
      .from('standalone_quiz_questions')
      .select(`
        *,
        options:standalone_question_options(*)
      `)
      .eq('quiz_id', quizId)
      .order('position');

    if (error) throw error;
    return data;
  }

  // Option Management
  static async createOption(questionId: string, optionData: { option_text: string; is_correct: boolean; position: number }): Promise<StandaloneQuestionOption> {
    const { data, error } = await supabase
      .from('standalone_question_options')
      .insert([{
        ...optionData,
        question_id: questionId
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateOption(optionId: string, optionData: Partial<{ option_text: string; is_correct: boolean; position: number }>): Promise<StandaloneQuestionOption> {
    const { data, error } = await supabase
      .from('standalone_question_options')
      .update(optionData)
      .eq('id', optionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteOption(optionId: string): Promise<void> {
    const { error } = await supabase
      .from('standalone_question_options')
      .delete()
      .eq('id', optionId);

    if (error) throw error;
  }

  // Quiz Taking
  static async startQuizAttempt(quizId: string): Promise<StandaloneQuizAttempt> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // Get quiz details using the accessible quizzes method to ensure proper access control
    const accessibleQuizzes = await this.getUserAccessibleQuizzes(user.user.id);
    const quiz = accessibleQuizzes.find(q => q.id === quizId);

    if (!quiz) {
      throw new Error('Quiz not found or you do not have access to it');
    }
    
    // Check if quiz is published (for students)
    if (quiz.status !== 'published') {
      throw new Error('This quiz is not available for taking. It may not be published yet.');
    }

    // Get current attempt number and check if user has reached max attempts
    const { data: existingAttempts } = await supabase
      .from('standalone_quiz_attempts')
      .select('attempt_number, submitted_at, score')
      .eq('quiz_id', quizId)
      .eq('user_id', user.user.id)
      .order('attempt_number', { ascending: false });

    const currentAttemptCount = existingAttempts?.length || 0;
    const maxAttempts = quiz.max_attempts || 1;

    // Check if user has reached max attempts
    if (currentAttemptCount >= maxAttempts) {
      // Check if retake is allowed and user has passed
      if (!quiz.allow_retake) {
        throw new Error(`You have reached the maximum number of attempts (${maxAttempts}) for this quiz.`);
      }
      
      // If retake is allowed, check if user has passed
      const latestAttempt = existingAttempts?.[0];
      const passingScore = quiz.passing_score || 70;
      if (latestAttempt && latestAttempt.score !== undefined && latestAttempt.score >= passingScore) {
        throw new Error('You have already passed this quiz and cannot retake it.');
      }
    }

    const attemptNumber = currentAttemptCount + 1;

    const { data, error } = await supabase
      .from('standalone_quiz_attempts')
      .insert([{
        quiz_id: quizId,
        user_id: user.user.id,
        attempt_number: attemptNumber,
        answers: {},
        results: {}
      }])
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Failed to create quiz attempt');
    return data;
  }

  static async submitQuiz(submission: QuizSubmission): Promise<QuizResult> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // Get the current attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('standalone_quiz_attempts')
      .select('*')
      .eq('quiz_id', submission.quiz_id)
      .eq('user_id', user.user.id)
      .order('attempt_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (attemptError) throw attemptError;
    if (!attempt) throw new Error('No quiz attempt found');

    // Calculate results
    const quiz = await this.getQuizWithQuestions(submission.quiz_id);
    const results = this.calculateQuizResults(quiz, submission.answers);

    // Check if quiz has text answer questions that require manual grading
    const hasTextAnswers = quiz.questions.some(q => q.question_type === 'text_answer');

    // Update the attempt
    const { data: updatedAttempt, error: updateError } = await supabase
      .from('standalone_quiz_attempts')
      .update({
        answers: submission.answers,
        results: results,
        score: hasTextAnswers ? null : results.score, // Set to null for text answer quizzes until manual grading
        time_taken_minutes: submission.time_taken_minutes,
        submitted_at: new Date().toISOString(),
        manual_grading_required: hasTextAnswers, // Explicitly set manual grading flags
        manual_grading_completed: !hasTextAnswers
      })
      .eq('id', attempt.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      quiz_id: submission.quiz_id,
      attempt_id: updatedAttempt.id,
      score: hasTextAnswers ? null : results.score, // Return null for text answer quizzes
      total_points: results.total_points,
      passed: hasTextAnswers ? false : (results.score >= quiz.passing_score), // Can't determine if passed until manual grading
      question_results: results.question_results,
      time_taken_minutes: submission.time_taken_minutes,
      submitted_at: updatedAttempt.submitted_at,
      can_retake: quiz.allow_retake && updatedAttempt.attempt_number < quiz.max_attempts,
      retry_available: quiz.allow_retake && updatedAttempt.attempt_number < quiz.max_attempts,
      manual_grading_required: hasTextAnswers,
      manual_grading_completed: !hasTextAnswers
    };
  }

  private static calculateQuizResults(quiz: QuizWithQuestions, answers: Record<string, any>): {
    score: number;
    total_points: number;
    question_results: QuestionResult[];
  } {
    let totalPoints = 0;
    let earnedPoints = 0;
    const questionResults: QuestionResult[] = [];

    for (const question of quiz.questions) {
      totalPoints += question.points;
      const userAnswer = answers[question.id];
      const result = this.evaluateQuestion(question, userAnswer);
      
      if (result.is_correct) {
        earnedPoints += question.points;
      }

      questionResults.push({
        question_id: question.id,
        question_text: question.question_text,
        question_type: question.question_type,
        points: question.points,
        earned_points: result.is_correct ? question.points : 0,
        is_correct: result.is_correct,
        user_answer: userAnswer,
        correct_answer: result.correct_answer,
        explanation: question.explanation,
        time_spent_seconds: userAnswer?.time_spent_seconds
      });
    }

    // Return earned points, not percentage, to avoid double calculation
    return {
      score: earnedPoints, // Return actual points earned, not percentage
      total_points: totalPoints,
      question_results: questionResults
    };
  }

  private static evaluateQuestion(question: StandaloneQuizQuestion, userAnswer: any): {
    is_correct: boolean;
    correct_answer: any;
  } {
    if (!userAnswer) {
      return { is_correct: false, correct_answer: null };
    }

    switch (question.question_type) {
      case 'single_choice':
        const correctOption = question.options?.find(opt => opt.is_correct);
        // Handle both selected_option (singular) and selectedOptions (plural array) formats
        const selectedOption = userAnswer.selected_option || (userAnswer.selectedOptions && userAnswer.selectedOptions[0]);
        return {
          is_correct: selectedOption === correctOption?.id,
          correct_answer: correctOption
        };

      case 'multiple_choice':
        const correctOptions = question.options?.filter(opt => opt.is_correct).map(opt => opt.id) || [];
        // Handle both selected_options and selectedOptions formats
        const userOptions = userAnswer.selected_options || userAnswer.selectedOptions || [];
        const isMultipleChoiceCorrect = correctOptions.length === userOptions.length &&
          correctOptions.every(opt => userOptions.includes(opt));
        return {
          is_correct: isMultipleChoiceCorrect,
          correct_answer: correctOptions
        };

      case 'text_answer':
        // For text answers, we'll consider it correct if there's any text provided
        // In a real implementation, you might want more sophisticated text matching
        return {
          is_correct: userAnswer.text_answer && userAnswer.text_answer.trim().length > 0,
          correct_answer: 'Text answer provided'
        };

      case 'math_expression':
        // For math expressions, compare the user's answer to the correct answer
        const userMathExpression = userAnswer.mathExpression || userAnswer.math_expression;
        const correctMathExpression = question.math_expression;
        
        // Normalize both expressions (trim whitespace, handle case sensitivity if needed)
        const normalizedUserAnswer = userMathExpression ? userMathExpression.trim() : '';
        const normalizedCorrectAnswer = correctMathExpression ? correctMathExpression.trim() : '';
        
        const isMathExpressionCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
        
        console.log('🔍 Math Expression Evaluation:', {
          questionId: question.id,
          userAnswer: userMathExpression,
          correctAnswer: correctMathExpression,
          normalizedUserAnswer,
          normalizedCorrectAnswer,
          isCorrect: isMathExpressionCorrect
        });
        
        return {
          is_correct: isMathExpressionCorrect,
          correct_answer: correctMathExpression
        };

      default:
        return { is_correct: false, correct_answer: null };
    }
  }

  // Attempt Management
  static async getUserAttempts(userId?: string, quizId?: string): Promise<StandaloneQuizAttempt[]> {
    const actualUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    console.log('🔍 getUserAttempts called with:', { userId: actualUserId, quizId });
    
    const { data, error } = await supabase.rpc('get_user_quiz_attempts', {
      input_user_id: actualUserId,
      input_quiz_id: quizId || null
    });

    if (error) {
      console.error('❌ Error in getUserAttempts RPC:', error);
      throw error;
    }
    
    console.log('📊 getUserAttempts RPC result:', {
      dataLength: data?.length || 0,
      data: data?.map(attempt => ({
        id: attempt.id,
        quiz_id: attempt.quiz_id,
        score: attempt.score,
        submitted_at: attempt.submitted_at,
        results: attempt.results
      }))
    });
    
    return data || [];
  }

  static async getUserQuizHistory(userId?: string, limit: number = 50): Promise<UserQuizHistory[]> {
    const { data, error } = await supabase.rpc('get_user_quiz_history', {
      input_user_id: userId || (await supabase.auth.getUser()).data.user?.id,
      limit_count: limit
    });

    if (error) throw error;
    return data;
  }

  // Get all attempts for a specific quiz (for admin/teacher view)
  static async getQuizAttempts(quizId: string): Promise<StandaloneQuizAttempt[]> {
    console.log('🔍 getQuizAttempts called with quizId:', quizId);
    
    const { data, error } = await supabase.rpc('get_quiz_attempts', {
      input_quiz_id: quizId
    });

    console.log('📊 getQuizAttempts RPC result:', { data, error });

    if (error) throw error;
    return data || [];
  }

  static async getUserQuizCompletionStatus(userId: string, quizId: string): Promise<UserQuizCompletionStatus> {
    const { data, error } = await supabase.rpc('get_user_quiz_completion_status', {
      user_id: userId,
      input_quiz_id: quizId
    });

    if (error) throw error;
    return data[0];
  }

  // Analytics
  static async getQuizStatistics(quizId: string): Promise<QuizStatistics> {
    const { data, error } = await supabase.rpc('get_quiz_statistics', {
      input_quiz_id: quizId
    });

    if (error) throw error;
    return data[0];
  }

  static async getQuizPerformanceAnalytics(quizId: string): Promise<QuizPerformanceAnalytics[]> {
    const { data, error } = await supabase.rpc('get_quiz_performance_analytics', {
      input_quiz_id: quizId
    });

    if (error) throw error;
    return data;
  }

  static async getQuestionPerformanceAnalytics(quizId: string): Promise<QuestionPerformanceAnalytics[]> {
    console.log('🔍 [DEBUG] getQuestionPerformanceAnalytics called with quizId:', quizId);
    
    const { data, error } = await supabase.rpc('get_question_performance_analytics', {
      input_quiz_id: quizId
    });

    console.log('🔍 [DEBUG] get_question_performance_analytics RPC result:', { data, error });

    if (error) throw error;
    return data;
  }

  static async getQuizLeaderboard(quizId: string, limit: number = 10): Promise<QuizLeaderboardEntry[]> {
    const { data, error } = await supabase.rpc('get_quiz_leaderboard', {
      input_quiz_id: quizId,
      limit_count: limit
    });

    if (error) throw error;
    return data;
  }

  // Retry Requests
  static async createRetryRequest(quizId: string, attemptId: string, reason: string, details?: string): Promise<StandaloneQuizRetryRequest> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('standalone_quiz_retry_requests')
      .insert([{
        quiz_id: quizId,
        user_id: user.user.id,
        attempt_id: attemptId,
        request_reason: reason,
        request_details: details
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getRetryRequests(quizId?: string): Promise<StandaloneQuizRetryRequest[]> {
    const { data, error } = await supabase
      .from('standalone_quiz_retry_requests')
      .select(`
        *,
        quiz:standalone_quizzes(title),
        attempt:standalone_quiz_attempts(score, submitted_at)
      `)
      .eq(quizId ? 'quiz_id' : 'id', quizId || '')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Get user profiles separately to avoid foreign key relationship issues
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(request => request.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);
      
      // Merge profile data with retry requests
      return data.map(request => ({
        ...request,
        user: profiles?.find(profile => profile.id === request.user_id) || null
      }));
    }
    
    return data;
  }

  static async approveRetryRequest(requestId: string, notes?: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('standalone_quiz_retry_requests')
      .update({
        status: 'approved',
        reviewed_by: user.user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes
      })
      .eq('id', requestId);

    if (error) throw error;
  }

  static async rejectRetryRequest(requestId: string, notes?: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('standalone_quiz_retry_requests')
      .update({
        status: 'rejected',
        reviewed_by: user.user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes
      })
      .eq('id', requestId);

    if (error) throw error;
  }

  // Course Integration
  static async getCourseLinkedQuizzes(courseId: string): Promise<CourseLinkedQuiz[]> {
    const { data, error } = await supabase.rpc('get_course_linked_quizzes', {
      course_id: courseId
    });

    if (error) throw error;
    return data;
  }

  static async getAvailableQuizzesForCourse(courseId: string, filters?: {
    authorId?: string;
    searchTerm?: string;
    difficultyFilter?: string;
    limit?: number;
  }): Promise<AvailableQuizForCourse[]> {
    const { data, error } = await supabase.rpc('get_available_quizzes_for_course', {
      course_id: courseId,
      author_id: filters?.authorId || null,
      search_term: filters?.searchTerm || '',
      difficulty_filter: filters?.difficultyFilter || '',
      limit_count: filters?.limit || 20
    });

    if (error) throw error;
    return data;
  }

  static async linkQuizToCourse(quizId: string, courseId: string, options?: {
    linkType?: 'standalone' | 'embedded';
    isRequired?: boolean;
    dueDate?: string;
  }): Promise<QuizCourseLink> {
    const { data, error } = await supabase
      .from('quiz_course_links')
      .insert([{
        quiz_id: quizId,
        course_id: courseId,
        link_type: options?.linkType || 'standalone',
        is_required: options?.isRequired || true,
        due_date: options?.dueDate || null
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async bulkLinkQuizzesToCourse(courseId: string, quizIds: string[], options?: {
    linkType?: 'standalone' | 'embedded';
    isRequired?: boolean;
  }): Promise<BulkLinkResult[]> {
    const { data, error } = await supabase.rpc('bulk_link_quizzes_to_course', {
      course_id: courseId,
      quiz_ids: quizIds,
      link_type: options?.linkType || 'standalone',
      is_required: options?.isRequired || true
    });

    if (error) throw error;
    return data;
  }

  static async unlinkQuizFromCourse(quizId: string, courseId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('unlink_quiz_from_course', {
      input_quiz_id: quizId,
      input_course_id: courseId
    });

    if (error) throw error;
    return data;
  }

  // Math Answers
  static async saveMathAnswer(answer: {
    quiz_submission_id?: string;
    question_id?: string;
    latex_expression: string;
    simplified_form?: string;
    is_correct?: boolean;
    similarity_score?: number;
  }): Promise<StandaloneQuizMathAnswer> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('standalone_quiz_math_answers')
      .insert([{
        ...answer,
        user_id: user.user.id
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Utility Methods
  static async publishQuiz(quizId: string): Promise<StandaloneQuiz> {
    const { data, error } = await supabase
      .from('standalone_quizzes')
      .update({
        status: 'published',
        published_at: new Date().toISOString()
      })
      .eq('id', quizId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async archiveQuiz(quizId: string): Promise<StandaloneQuiz> {
    return this.updateQuiz(quizId, { status: 'archived' });
  }

  static async unpublishQuiz(quizId: string): Promise<StandaloneQuiz> {
    return this.updateQuiz(quizId, { status: 'draft' });
  }

  // Quiz Member Management
  static async getQuizWithMembers(quizId: string): Promise<StandaloneQuiz | null> {
    const { data, error } = await supabase
      .rpc('get_quiz_with_members', { input_quiz_id: quizId })
      .maybeSingle();

    if (error) throw error;
    return data as StandaloneQuiz;
  }

  static async addQuizMember(quizId: string, userId: string, role: 'teacher' | 'student'): Promise<any> {
    // First check if user has access to manage this quiz
    const { data: quiz, error: quizError } = await supabase
      .from('standalone_quizzes')
      .select('author_id')
      .eq('id', quizId)
      .maybeSingle();

    if (quizError) throw quizError;
    if (!quiz) throw new Error('Quiz not found');

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user is quiz author or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAuthor = quiz.author_id === user.id;
    const isAdmin = profile?.role === 'admin';

    if (!isAuthor && !isAdmin) {
      throw new Error('Insufficient permissions to add quiz members');
    }

    const { data, error } = await supabase
      .rpc('add_quiz_member', {
        input_quiz_id: quizId,
        input_user_id: userId,
        input_role: role
      });

    if (error) throw error;
    return data;
  }

  static async removeQuizMember(quizId: string, userId: string): Promise<boolean> {
    // First check if user has access to manage this quiz
    const { data: quiz, error: quizError } = await supabase
      .from('standalone_quizzes')
      .select('author_id')
      .eq('id', quizId)
      .maybeSingle();

    if (quizError) throw quizError;
    if (!quiz) throw new Error('Quiz not found');

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user is quiz author or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAuthor = quiz.author_id === user.id;
    const isAdmin = profile?.role === 'admin';

    if (!isAuthor && !isAdmin) {
      throw new Error('Insufficient permissions to remove quiz members');
    }

    const { data, error } = await supabase
      .rpc('remove_quiz_member', {
        input_quiz_id: quizId,
        input_user_id: userId
      });

    if (error) throw error;
    return data;
  }

  static async getUserAccessibleQuizzes(userId: string): Promise<StandaloneQuiz[]> {
    const { data, error } = await supabase
      .rpc('get_user_accessible_quizzes', { input_user_id: userId });

    if (error) throw error;
    return data || [];
  }

  static async getQuizMembers(quizId: string): Promise<any[]> {
    // First check if user has access to this quiz
    const { data: quiz, error: quizError } = await supabase
      .from('standalone_quizzes')
      .select('author_id')
      .eq('id', quizId)
      .maybeSingle();

    if (quizError) throw quizError;
    if (!quiz) throw new Error('Quiz not found');

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user is quiz author or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAuthor = quiz.author_id === user.id;
    const isAdmin = profile?.role === 'admin';

    if (!isAuthor && !isAdmin) {
      throw new Error('Insufficient permissions to view quiz members');
    }

    // First get the quiz members
    const { data: members, error } = await supabase
      .from('quiz_members')
      .select('*')
      .eq('quiz_id', quizId);

    if (error) throw error;
    if (!members || members.length === 0) return [];

    // Get all user IDs from members
    const userIds = members.map(m => m.user_id);

    // Fetch profiles for these users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, avatar_url')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    // Merge members with their profiles
    const membersWithProfiles = members.map(member => ({
      ...member,
      profile: profiles?.find(p => p.id === member.user_id) || null
    }));

    return membersWithProfiles;
  }

  // Additional methods for quiz taking
  static async submitQuizAttempt(attemptId: string, answers: any): Promise<QuizResult> {
    // First, get the attempt to find the quiz_id
    const { data: attemptData, error: attemptError } = await supabase
      .from('standalone_quiz_attempts')
      .select('quiz_id, created_at')
      .eq('id', attemptId)
      .maybeSingle();

    if (attemptError) throw attemptError;
    if (!attemptData) throw new Error('Quiz attempt not found');

    // Get the quiz with questions for scoring
    const quiz = await this.getQuizWithQuestions(attemptData.quiz_id);
    if (!quiz) throw new Error('Quiz not found');

    // Check if quiz has text answer questions that require manual grading
    const hasTextAnswers = quiz.questions.some(q => q.question_type === 'text_answer');
    
    console.log('🔍 Quiz submission debug:', {
      quizId: attemptData.quiz_id,
      attemptId: attemptId,
      totalQuestions: quiz.questions.length,
      textAnswerQuestions: quiz.questions.filter(q => q.question_type === 'text_answer').length,
      hasTextAnswers: hasTextAnswers,
      questionTypes: quiz.questions.map(q => q.question_type)
    });
    
    // Calculate the score using the existing calculateQuizResults method
    const results = this.calculateQuizResults(quiz, answers);
    
    // Calculate additional properties with bounds checking
    let scorePercentage = 0;
    let passed = false;
    
    if (hasTextAnswers) {
      // For quizzes with text answers, only calculate score for auto-graded questions
      const autoGradedQuestions = quiz.questions.filter(q => q.question_type !== 'text_answer');
      const autoGradedResults = this.calculateQuizResults({ ...quiz, questions: autoGradedQuestions }, answers);
      
      if (autoGradedResults.total_points > 0) {
        scorePercentage = (autoGradedResults.score / autoGradedResults.total_points) * 100;
        scorePercentage = Math.max(0, Math.min(999.99, scorePercentage));
        scorePercentage = Math.round(scorePercentage * 100) / 100;
      }
      
      // For text answer quizzes, we can't determine if passed until manual grading is complete
      passed = false; // Will be updated after manual grading
      
      console.log('📝 Text answer quiz submitted - manual grading required:', {
        autoGradedPoints: autoGradedResults.score,
        autoGradedTotal: autoGradedResults.total_points,
        textAnswerQuestions: quiz.questions.filter(q => q.question_type === 'text_answer').length,
        autoGradedPercentage: scorePercentage
      });
    } else {
      // For non-text answer quizzes, calculate normally
      if (results.total_points > 0) {
        scorePercentage = (results.score / results.total_points) * 100;
        scorePercentage = Math.max(0, Math.min(999.99, scorePercentage));
        scorePercentage = Math.round(scorePercentage * 100) / 100;
      }
      passed = scorePercentage >= (quiz.passing_score || 70);
      
      console.log('📊 Auto-graded quiz submitted:', {
        earnedPoints: results.score,
        totalPoints: results.total_points,
        calculatedPercentage: (results.total_points > 0 ? (results.score / results.total_points) * 100 : 0),
        finalScore: scorePercentage,
        passingScore: quiz.passing_score || 70,
        passed
      });
    }
    
    const timeTakenMinutes = attemptData.created_at ? 
      Math.round((new Date().getTime() - new Date(attemptData.created_at).getTime()) / (1000 * 60)) : 0;
    
    // Update the attempt with calculated score and results
    // Explicitly set manual grading flags based on text answer questions
    const { data, error } = await supabase
      .from('standalone_quiz_attempts')
      .update({
        answers: answers,
        submitted_at: new Date().toISOString(),
        score: hasTextAnswers ? null : scorePercentage, // Set to null for text answer quizzes until manual grading
        results: results.question_results,
        time_taken_minutes: timeTakenMinutes,
        manual_grading_required: hasTextAnswers, // Explicitly set manual grading flags
        manual_grading_completed: !hasTextAnswers
      })
      .eq('id', attemptId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Failed to update quiz attempt');
    
    console.log('✅ Quiz attempt updated:', {
      attemptId: attemptId,
      manual_grading_required: data.manual_grading_required,
      manual_grading_completed: data.manual_grading_completed,
      score: data.score,
      hasTextAnswers: hasTextAnswers
    });
    
    // Return the calculated result
    return {
      attempt_id: data.id,
      quiz_id: data.quiz_id,
      score: hasTextAnswers ? null : scorePercentage, // Return null for text answer quizzes
      total_points: results.total_points,
      passed: hasTextAnswers ? false : passed, // Can't determine pass/fail until manual grading
      question_results: results.question_results,
      time_taken_minutes: timeTakenMinutes,
      submitted_at: data.submitted_at,
      can_retake: quiz.allow_retake,
      retry_available: quiz.allow_retake,
      manual_grading_required: hasTextAnswers,
      manual_grading_completed: !hasTextAnswers
    };
  }

  static async getQuizAttempt(attemptId: string): Promise<QuizAttemptWithDetails | null> {
    const { data, error } = await supabase
      .from('standalone_quiz_attempts')
      .select(`
        *,
        quiz:standalone_quizzes(*)
      `)
      .eq('id', attemptId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  // Manual grading methods
  static async getAttemptsRequiringGrading(teacherId?: string): Promise<any[]> {
    const { data, error } = await supabase.rpc('get_standalone_quiz_attempts_requiring_grading', {
      input_teacher_id: teacherId || null
    });

    if (error) throw error;
    return data || [];
  }

  static async getTextAnswersForGrading(attemptId: string): Promise<any[]> {
    const { data, error } = await supabase.rpc('get_standalone_quiz_text_answers_for_grading', {
      input_attempt_id: attemptId
    });

    if (error) throw error;
    return data || [];
  }

  static async completeManualGrading(
    attemptId: string, 
    teacherId: string, 
    gradesData: Array<{question_id: string, grade: number, feedback?: string}>,
    overallFeedback?: string
  ): Promise<void> {
    console.log('🔍 [DEBUG] Starting manual grading completion:', {
      attemptId,
      teacherId,
      gradesData,
      overallFeedback,
      gradesDataLength: gradesData.length
    });

    // Validate input data
    if (!attemptId || !teacherId) {
      throw new Error('Missing required parameters: attemptId and teacherId are required');
    }

    if (!Array.isArray(gradesData)) {
      throw new Error('gradesData must be an array');
    }

    // Validate each grade item
    for (const grade of gradesData) {
      if (!grade.question_id || grade.grade === undefined || grade.grade === null) {
        throw new Error(`Invalid grade data: ${JSON.stringify(grade)}`);
      }
      if (grade.grade < 0 || grade.grade > 100) {
        throw new Error(`Grade must be between 0 and 100, got: ${grade.grade}`);
      }
    }

    console.log('🔍 [DEBUG] Calling complete_standalone_quiz_manual_grading RPC...');

    const { data, error } = await supabase.rpc('complete_standalone_quiz_manual_grading', {
      input_attempt_id: attemptId,
      input_teacher_id: teacherId,
      grades_data: gradesData,
      overall_feedback: overallFeedback || null
    });

    if (error) {
      console.error('❌ [ERROR] Manual grading completion failed:', {
        error,
        attemptId,
        teacherId,
        gradesData,
        overallFeedback
      });
      throw error;
    }

    console.log('✅ [SUCCESS] Manual grading completed successfully:', {
      attemptId,
      teacherId,
      data
    });
  }
}
