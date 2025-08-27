import { QuizQuestion, QuizData } from '@/pages/CourseBuilder';
import { BASE_API_URL } from '@/config/api';
import { getAuthToken } from '@/utils/authUtils';

// Types for PDF parsing
export interface ExtractedQuestion {
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  type: 'single_choice' | 'multiple_choice' | 'text_answer';
}

export interface ParseResult {
  success: boolean;
  questions: ExtractedQuestion[];
  method: 'ai';
  confidence: number;
  error?: string;
}

// Backend API response structure
interface BackendQuizResponse {
  title?: string;
  questions: Array<{
    question: string;
    options: string[];
    answer: string;
    type: string;
  }>;
}

// Main parsing function - calls backend API
export async function parseQuizFromPDF(file: File): Promise<ParseResult> {
  console.log('Starting PDF parsing via backend API for:', file.name, 'Size:', file.size);
  
  try {
    // Validate file
    if (!file.type.includes('pdf')) {
      console.log('Invalid file type:', file.type);
      return {
        success: false,
        questions: [],
        method: 'ai',
        confidence: 0,
        error: 'File must be a PDF'
      };
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      console.log('File too large:', file.size);
      return {
        success: false,
        questions: [],
        method: 'ai',
        confidence: 0,
        error: 'File size must be less than 10MB'
      };
    }
    
    // Call backend API
    console.log('🚀 Calling backend API...');
    const formData = new FormData();
    formData.append('file', file);
    
    // Get auth token for authenticated request
    const authToken = getAuthToken();
    if (!authToken) {
      return {
        success: false,
        questions: [],
        method: 'ai',
        confidence: 0,
        error: 'Authentication required. Please log in again.'
      };
    }
    
    const response = await fetch(`${BASE_API_URL}/api/quiz/ai-based-quiz-from-pdf-upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend API error:', response.status, errorText);
      return {
        success: false,
        questions: [],
        method: 'ai',
        confidence: 0,
        error: `Failed to process PDF: ${response.status} - ${errorText}`
      };
    }
    
    const backendResponse: BackendQuizResponse = await response.json();
    console.log('✅ Backend response received:', backendResponse);
    
    if (!backendResponse.questions || backendResponse.questions.length === 0) {
      return {
        success: false,
        questions: [],
        method: 'ai',
        confidence: 0,
        error: 'No quiz questions found in the PDF. Please ensure the PDF contains clear quiz questions with multiple choice options.'
      };
    }
    
    // Convert backend response to our format
    const questions: ExtractedQuestion[] = backendResponse.questions.map((q) => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.answer,
      type: (q.type === 'single' ? 'single_choice' : q.type) as 'single_choice' | 'multiple_choice' | 'text_answer'
    }));
    
    console.log(`✅ Successfully extracted ${questions.length} questions via backend AI`);
    
    // High confidence since backend uses AI
    const confidence = 0.95;
    
    return {
      success: true,
      questions,
      method: 'ai',
      confidence
    };
    
  } catch (error) {
    console.error('❌ Failed to call backend API:', error);
    return {
      success: false,
      questions: [],
      method: 'ai',
      confidence: 0,
      error: error instanceof Error ? error.message : 'Failed to process PDF via backend API'
    };
  }
}

// Convert extracted questions to QuizData format
export function convertToQuizFormat(extractedQuestions: ExtractedQuestion[]): QuizData {
  const questions: QuizQuestion[] = extractedQuestions.map((eq, index) => ({
    id: `extracted_${Date.now()}_${index}`,
    question_text: eq.question,
    question_type: eq.type,
    options: eq.options ? eq.options.map((option, optIndex) => ({
      id: `option_${Date.now()}_${index}_${optIndex}`,
      option_text: option,
      is_correct: eq.correctAnswer ? 
        (Array.isArray(eq.correctAnswer) ? 
          eq.correctAnswer.includes(option) : 
          eq.correctAnswer === option || eq.correctAnswer === String.fromCharCode(65 + optIndex)) : 
        optIndex === 0, // Default first option as correct if no answer provided
      position: optIndex + 1
    })) : [],
    position: index + 1
  }));
  
  return {
    id: `quiz_${Date.now()}`,
    questions
  };
}