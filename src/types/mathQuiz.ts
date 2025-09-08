// Math Quiz Types and Interfaces

export interface MathQuizQuestion {
  id: string;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'text_answer' | 'math_expression';
  options?: QuestionOption[];
  position: number;
  // Math-specific fields
  math_expression?: string; // LaTeX expression for expected answer
  math_tolerance?: number; // Acceptable variance for math answers (0.01 = 1%)
  math_hint?: string; // Optional hint for students
}

export interface QuestionOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  position: number;
}

export interface MathQuizAnswer {
  id: string;
  quiz_submission_id: string;
  question_id: string;
  user_id: string;
  latex_expression: string;
  simplified_form?: string;
  is_correct: boolean;
  similarity_score?: number;
  evaluated_at?: string;
  created_at: string;
}

export interface MathQuizSubmission {
  id: string;
  user_id: string;
  lesson_content_id: string;
  lesson_id: string;
  course_id: string;
  answers: Record<string, any>;
  results: Record<string, boolean>;
  score: number | null;
  manual_grading_required: boolean;
  manual_grading_completed: boolean;
  manual_grading_score?: number;
  manual_grading_feedback?: string;
  manual_grading_completed_at?: string;
  manual_grading_completed_by?: string;
  created_at: string;
  updated_at: string;
  // Math-specific fields
  math_answers?: MathQuizAnswer[];
}

export interface MathEvaluationResult {
  isCorrect: boolean;
  similarity: number;
  simplifiedAnswer: string;
  expectedAnswer: string;
  error?: string;
}

export interface MathQuestionSettings {
  allowRetries: boolean;
  maxRetries: number;
  retryCooldownHours: number;
  retryThreshold: number;
  requireTeacherApproval: boolean;
  generateNewQuestions: boolean;
  requireStudyMaterials: boolean;
  studyMaterialsRequired: string[];
  // Math-specific settings
  mathTolerance: number; // Default tolerance for math answers
  allowApproximateAnswers: boolean; // Allow answers within tolerance
  requireExactForm: boolean; // Require exact mathematical form
  showMathPreview: boolean; // Show LaTeX preview while typing
  enableMathHints: boolean; // Show hints for math questions
}

export const DEFAULT_MATH_QUESTION_SETTINGS: Partial<MathQuestionSettings> = {
  mathTolerance: 0.01, // 1% tolerance
  allowApproximateAnswers: true,
  requireExactForm: false,
  showMathPreview: true,
  enableMathHints: true,
};

// Math expression validation result
export interface MathValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

// Math toolbar configuration
export interface MathToolbarConfig {
  showBasicSymbols: boolean;
  showMathFunctions: boolean;
  showGreekLetters: boolean;
  showAdvancedSymbols: boolean;
  customSymbols?: Array<{
    symbol: string;
    label: string;
    icon?: string;
  }>;
}

export const DEFAULT_MATH_TOOLBAR_CONFIG: MathToolbarConfig = {
  showBasicSymbols: true,
  showMathFunctions: true,
  showGreekLetters: true,
  showAdvancedSymbols: false,
};

// Math question creation form data
export interface MathQuestionFormData {
  question_text: string;
  question_type: 'math_expression';
  math_expression: string;
  math_tolerance: number;
  math_hint?: string;
  position: number;
}

// Math answer evaluation request
export interface MathAnswerEvaluationRequest {
  question_id: string;
  user_answer: string;
  expected_answer: string;
  tolerance: number;
  submission_id: string;
}

// Math answer evaluation response
export interface MathAnswerEvaluationResponse {
  question_id: string;
  is_correct: boolean;
  similarity_score: number;
  simplified_answer: string;
  evaluation_details: MathEvaluationResult;
  answer_id?: string; // ID of the saved math answer
}
