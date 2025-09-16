// Types for Standalone Quiz System

export interface StandaloneQuiz {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  time_limit_minutes?: number;
  max_attempts: number;
  passing_score: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_correct_answers: boolean;
  show_results_immediately: boolean;
  allow_retake: boolean;
  retry_settings: QuizRetrySettings;
  status: 'draft' | 'published' | 'archived';
  visibility: 'private' | 'public' | 'restricted';
  tags: string[];
  difficulty_level: 'easy' | 'medium' | 'hard';
  estimated_duration_minutes?: number;
  author_id: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  members?: QuizMember[];
}

export interface QuizMember {
  id: string;
  user_id: string;
  role: 'teacher' | 'student';
  created_at: string;
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface StandaloneQuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'text_answer' | 'math_expression';
  position: number;
  points: number;
  explanation?: string;
  // Math-specific fields
  math_expression?: string;
  math_tolerance?: number;
  math_hint?: string;
  math_allow_drawing?: boolean;
  // Additional fields
  is_required: boolean;
  created_at: string;
  updated_at: string;
  options?: StandaloneQuestionOption[];
}

export interface StandaloneQuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  position: number;
  created_at: string;
}

export interface StandaloneQuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  attempt_number: number;
  answers: Record<string, any>;
  results: Record<string, any>;
  score?: number;
  time_taken_minutes?: number;
  submitted_at: string;
  retry_reason?: string;
  teacher_approval_required: boolean;
  teacher_approved?: boolean;
  teacher_approved_by?: string;
  teacher_approved_at?: string;
  teacher_approval_notes?: string;
  study_materials_completed: boolean;
  study_materials_completed_at?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
  // Manual grading fields
  manual_grading_required?: boolean;
  manual_grading_completed?: boolean;
  manual_grading_score?: number;
  manual_grading_feedback?: string;
  manual_grading_completed_at?: string;
  manual_grading_completed_by?: string;
}

export interface StandaloneQuizRetryRequest {
  id: string;
  quiz_id: string;
  user_id: string;
  attempt_id: string;
  request_reason: string;
  request_details?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface StandaloneQuizMathAnswer {
  id: string;
  quiz_submission_id?: string;
  question_id?: string;
  user_id?: string;
  latex_expression: string;
  simplified_form?: string;
  is_correct?: boolean;
  similarity_score?: number;
  evaluated_at: string;
  created_at: string;
}

export interface QuizCourseLink {
  id: string;
  quiz_id: string;
  course_id: string;
  lesson_content_id?: string;
  link_type: 'standalone' | 'embedded';
  position: number;
  is_required: boolean;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface QuizRetrySettings {
  max_retries: number;
  require_teacher_approval: boolean;
  allow_immediate_retry: boolean;
  cooldown_minutes: number;
  require_study_materials: boolean;
  study_materials_url?: string | null;
  auto_approve_after_hours?: number | null;
}

export interface QuizWithQuestions extends StandaloneQuiz {
  questions: StandaloneQuizQuestion[];
}

export interface QuizAttemptWithDetails extends StandaloneQuizAttempt {
  quiz: StandaloneQuiz;
  user_name?: string;
  user_email?: string;
}

export interface QuizStatistics {
  total_attempts: number;
  unique_users: number;
  average_score: number;
  pass_rate: number;
  completion_rate: number;
}

export interface QuestionPerformanceAnalytics {
  question_id: string;
  question_text: string;
  question_type: string;
  position: number;
  total_attempts: number;
  correct_attempts: number;
  accuracy_rate: number;
  average_time_seconds: number;
}

export interface QuizPerformanceAnalytics {
  metric_name: string;
  metric_value: number;
  metric_description: string;
}

export interface UserQuizHistory {
  quiz_id: string;
  quiz_title: string;
  quiz_status: string;
  quiz_visibility: string;
  attempt_id: string;
  attempt_number: number;
  score?: number;
  time_taken_minutes?: number;
  submitted_at: string;
  can_retake: boolean;
  author_name: string;
}

export interface QuizLeaderboardEntry {
  user_id: string;
  user_name: string;
  user_email: string;
  best_score: number;
  best_attempt_id: string;
  total_attempts: number;
  first_attempt_at: string;
  last_attempt_at: string;
}

export interface UserQuizCompletionStatus {
  quiz_id: string;
  user_id: string;
  has_attempted: boolean;
  total_attempts: number;
  best_score?: number;
  passed: boolean;
  can_retake: boolean;
  next_attempt_number: number;
  last_attempt_at?: string;
}

export interface CourseLinkedQuiz {
  quiz_id: string;
  quiz_title: string;
  quiz_description?: string;
  link_type: string;
  position: number;
  is_required: boolean;
  due_date?: string;
  lesson_content_id?: string;
  lesson_title?: string;
  section_title?: string;
  quiz_status: string;
  quiz_visibility: string;
  total_questions: number;
  author_name: string;
}

export interface AvailableQuizForCourse {
  quiz_id: string;
  quiz_title: string;
  quiz_description?: string;
  difficulty_level: string;
  estimated_duration_minutes?: number;
  total_questions: number;
  author_name: string;
  is_already_linked: boolean;
  created_at: string;
}

export interface BulkLinkResult {
  quiz_id: string;
  success: boolean;
  message: string;
}

export interface QuizSearchFilters {
  search_term?: string;
  difficulty_filter?: string;
  status_filter?: string;
  author_filter?: string;
  limit_count?: number;
  offset_count?: number;
}

export interface QuizFormData {
  title: string;
  description?: string;
  instructions?: string;
  time_limit_minutes?: number | null;
  max_attempts: number;
  passing_score: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_correct_answers: boolean;
  show_results_immediately: boolean;
  allow_retake: boolean;
  retry_settings: QuizRetrySettings;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  estimated_duration_minutes?: number | null;
}

export interface QuestionFormData {
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'text_answer' | 'math_expression';
  position: number;
  points: number;
  explanation?: string;
  math_expression?: string;
  math_tolerance?: number;
  math_hint?: string;
  math_allow_drawing?: boolean;
  is_required: boolean;
  options?: QuestionOptionFormData[];
}

export interface QuestionOptionFormData {
  option_text: string;
  is_correct: boolean;
  position: number;
}

export interface QuizAnswer {
  question_id: string;
  question_type: 'single_choice' | 'multiple_choice' | 'text_answer' | 'math_expression';
  selected_option?: string;
  selected_options?: string[];
  text_answer?: string;
  math_expression?: string;
  time_spent_seconds?: number;
}

export interface QuizSubmission {
  quiz_id: string;
  answers: QuizAnswer[];
  time_taken_minutes: number;
  retry_reason?: string;
}

export interface QuizResult {
  quiz_id: string;
  attempt_id: string;
  score: number | null;
  total_points: number;
  passed: boolean;
  question_results: QuestionResult[];
  time_taken_minutes: number;
  submitted_at: string;
  can_retake: boolean;
  retry_available: boolean;
  // Manual grading fields
  manual_grading_required?: boolean;
  manual_grading_completed?: boolean;
}

export interface QuestionResult {
  question_id: string;
  question_text: string;
  question_type: string;
  points: number;
  earned_points: number;
  is_correct: boolean;
  user_answer: any;
  correct_answer: any;
  explanation?: string;
  time_spent_seconds?: number;
}

// Default values
export const DEFAULT_QUIZ_RETRY_SETTINGS: QuizRetrySettings = {
  max_retries: 3,
  require_teacher_approval: true,
  allow_immediate_retry: false,
  cooldown_minutes: 60,
  require_study_materials: false,
  auto_approve_after_hours: 24
};

export const DEFAULT_QUIZ_FORM_DATA: QuizFormData = {
  title: '',
  description: '',
  instructions: '',
  time_limit_minutes: null,
  max_attempts: 1,
  passing_score: 70,
  shuffle_questions: false,
  shuffle_options: false,
  show_correct_answers: true,
  show_results_immediately: true,
  allow_retake: false,
  retry_settings: DEFAULT_QUIZ_RETRY_SETTINGS,
  status: 'draft',
  tags: [],
  estimated_duration_minutes: null
};

export const DEFAULT_QUESTION_FORM_DATA: QuestionFormData = {
  question_text: '',
  question_type: 'single_choice',
  position: 1,
  points: 1,
  explanation: '',
  math_expression: '',
  math_tolerance: 0.0001,
  math_hint: '',
  math_allow_drawing: false,
  is_required: true,
  options: []
};
