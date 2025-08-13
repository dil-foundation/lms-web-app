import React from 'react';
import { ComingSoon } from '@/components/ComingSoon';
import { Award } from 'lucide-react';

export const AdminAssessments = () => {
  return (
    <ComingSoon 
      title="Assessments"
      description="Grade quizzes and assignments for your courses - comprehensive assessment management tools are coming soon."
      icon={Award}
    />
  );
};

/*
// This is a dedicated Admin Assessments Coming Soon page
// The original GradeAssignments component is preserved for Teacher use
// When ready, this can be replaced with admin-specific assessment features
*/
