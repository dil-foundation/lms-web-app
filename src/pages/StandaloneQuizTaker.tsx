import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QuizTaker from '@/components/standaloneQuiz/StandaloneQuizTaker';
import { QuizResult } from '@/types/standaloneQuiz';

const StandaloneQuizTaker: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const handleComplete = (result: QuizResult) => {
    // Quiz completed, redirect to results page
    navigate(`/dashboard/quiz-results/${result.quiz_id}/${result.attempt_id}`);
  };

  const handleExit = () => {
    // Navigate back to quizzes list
    navigate('/dashboard/quizzes');
  };

  if (!quizId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Quiz Not Found</h2>
          <p className="text-muted-foreground">The requested quiz could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <QuizTaker
      quizId={quizId}
      onComplete={handleComplete}
      onExit={handleExit}
    />
  );
};

export default StandaloneQuizTaker;
