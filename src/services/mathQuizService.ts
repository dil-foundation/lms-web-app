import { supabase } from '@/integrations/supabase/client';
import { 
  MathQuizAnswer, 
  MathQuizSubmission, 
  MathAnswerEvaluationRequest, 
  MathAnswerEvaluationResponse,
  MathQuestionFormData 
} from '@/types/mathQuiz';
import { evaluateMathExpression } from '@/utils/mathEvaluation';
import { toast } from '@/hooks/use-toast';

export class MathQuizService {
  /**
   * Save a math answer to the database
   */
  static async saveMathAnswer(
    submissionId: string,
    questionId: string,
    latexExpression: string,
    simplifiedForm?: string,
    isCorrect: boolean = false,
    similarityScore: number = 0
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('save_math_answer', {
        submission_id: submissionId,
        question_id: questionId,
        latex_expression: latexExpression,
        simplified_form: simplifiedForm,
        is_correct: isCorrect,
        similarity_score: similarityScore
      });

      if (error) {
        console.error('Error saving math answer:', error);
        toast.error('Failed to save math answer', { description: error.message });
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error saving math answer:', error);
      toast.error('Failed to save math answer', { description: 'An unexpected error occurred' });
      return null;
    }
  }

  /**
   * Evaluate a math answer against the correct answer
   */
  static async evaluateMathAnswer(
    request: MathAnswerEvaluationRequest
  ): Promise<MathAnswerEvaluationResponse | null> {
    try {
      const evaluation = evaluateMathExpression(
        request.user_answer,
        request.expected_answer,
        request.tolerance
      );

      // Save the math answer
      const answerId = await this.saveMathAnswer(
        request.submission_id,
        request.question_id,
        request.user_answer,
        evaluation.simplifiedAnswer,
        evaluation.isCorrect,
        evaluation.similarity
      );

      return {
        question_id: request.question_id,
        is_correct: evaluation.isCorrect,
        similarity_score: evaluation.similarity,
        simplified_answer: evaluation.simplifiedAnswer,
        evaluation_details: evaluation,
        answer_id: answerId || undefined
      };
    } catch (error) {
      console.error('Error evaluating math answer:', error);
      toast.error('Failed to evaluate math answer', { description: 'An unexpected error occurred' });
      return null;
    }
  }

  /**
   * Get math answers for a specific submission
   */
  static async getMathAnswers(submissionId: string): Promise<MathQuizAnswer[]> {
    try {
      const { data, error } = await supabase
        .from('quiz_math_answers')
        .select('*')
        .eq('quiz_submission_id', submissionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching math answers:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching math answers:', error);
      return [];
    }
  }

  /**
   * Get math question details
   */
  static async getMathQuestionDetails(questionId: string) {
    try {
      const { data, error } = await supabase.rpc('get_math_question_details', {
        question_id: questionId
      });

      if (error) {
        console.error('Error fetching math question details:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error fetching math question details:', error);
      return null;
    }
  }

  /**
   * Create a math question
   */
  static async createMathQuestion(
    lessonContentId: string,
    questionData: MathQuestionFormData
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .insert({
          lesson_content_id: lessonContentId,
          question_text: questionData.question_text,
          question_type: 'math_expression',
          math_expression: questionData.math_expression,
          math_tolerance: questionData.math_tolerance,
          math_hint: questionData.math_hint,
          position: questionData.position
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating math question:', error);
        toast.error('Failed to create math question', { description: error.message });
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error creating math question:', error);
      toast.error('Failed to create math question', { description: 'An unexpected error occurred' });
      return null;
    }
  }

  /**
   * Update a math question
   */
  static async updateMathQuestion(
    questionId: string,
    questionData: Partial<MathQuestionFormData>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('quiz_questions')
        .update({
          question_text: questionData.question_text,
          math_expression: questionData.math_expression,
          math_tolerance: questionData.math_tolerance,
          math_hint: questionData.math_hint,
          position: questionData.position
        })
        .eq('id', questionId);

      if (error) {
        console.error('Error updating math question:', error);
        toast.error('Failed to update math question', { description: error.message });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating math question:', error);
      toast.error('Failed to update math question', { description: 'An unexpected error occurred' });
      return false;
    }
  }

  /**
   * Delete a math question
   */
  static async deleteMathQuestion(questionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', questionId);

      if (error) {
        console.error('Error deleting math question:', error);
        toast.error('Failed to delete math question', { description: error.message });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting math question:', error);
      toast.error('Failed to delete math question', { description: 'An unexpected error occurred' });
      return false;
    }
  }

  /**
   * Get all math questions for a lesson content item
   */
  static async getMathQuestions(lessonContentId: string) {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('lesson_content_id', lessonContentId)
        .eq('question_type', 'math_expression')
        .order('position', { ascending: true });

      if (error) {
        console.error('Error fetching math questions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching math questions:', error);
      return [];
    }
  }

  /**
   * Batch evaluate multiple math answers
   */
  static async batchEvaluateMathAnswers(
    evaluations: MathAnswerEvaluationRequest[]
  ): Promise<MathAnswerEvaluationResponse[]> {
    try {
      const results: MathAnswerEvaluationResponse[] = [];

      for (const evaluation of evaluations) {
        const result = await this.evaluateMathAnswer(evaluation);
        if (result) {
          results.push(result);
        }
      }

      return results;
    } catch (error) {
      console.error('Error batch evaluating math answers:', error);
      toast.error('Failed to evaluate math answers', { description: 'An unexpected error occurred' });
      return [];
    }
  }

  /**
   * Get math quiz statistics for a teacher
   */
  static async getMathQuizStats(courseId: string, teacherId: string) {
    try {
      const { data, error } = await supabase.rpc('get_math_quiz_stats', {
        course_id: courseId,
        teacher_id: teacherId
      });

      if (error) {
        console.error('Error fetching math quiz stats:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching math quiz stats:', error);
      return null;
    }
  }
}
