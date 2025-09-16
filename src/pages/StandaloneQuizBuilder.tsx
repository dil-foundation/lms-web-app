import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StandaloneQuizBuilder as QuizBuilder } from '@/components/standaloneQuiz/StandaloneQuizBuilder';
import { StandaloneQuiz } from '@/types/standaloneQuiz';

const StandaloneQuizBuilder: React.FC = () => {
  const { quizId } = useParams<{ quizId?: string }>();
  const navigate = useNavigate();

  const handleSave = (quiz: StandaloneQuiz) => {
    // Quiz saved successfully, could show a toast or redirect
    console.log('Quiz saved:', quiz);
  };

  const handlePublish = (quiz: StandaloneQuiz) => {
    // Quiz published successfully, redirect to management page
    navigate('/dashboard/standalone-quizzes');
  };

  const handleCancel = () => {
    // Navigate back to quiz management
    navigate('/dashboard/standalone-quizzes');
  };

  return (
    <QuizBuilder
      quizId={quizId}
      onSave={handleSave}
      onPublish={handlePublish}
      onCancel={handleCancel}
    />
  );
};

export default StandaloneQuizBuilder;
