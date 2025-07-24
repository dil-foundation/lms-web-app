import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Home, GraduationCap } from 'lucide-react';

interface PracticeBreadcrumbProps {
  className?: string;
}

interface StageInfo {
  id: number;
  title: string;
  shortTitle: string;
}

interface LessonInfo {
  id: string;
  title: string;
  path: string;
}

const stageMapping: Record<string, StageInfo> = {
  'stage-0': { id: 0, title: 'Stage 0 – Beginner English for Urdu Speakers', shortTitle: 'Stage 0' },
  'stage-1': { id: 1, title: 'Stage 1 – Building Confidence', shortTitle: 'Stage 1' },
  'stage-2': { id: 2, title: 'Stage 2 – Elementary English', shortTitle: 'Stage 2' },
  'stage-3': { id: 3, title: 'Stage 3 – Intermediate English', shortTitle: 'Stage 3' },
  'stage-4': { id: 4, title: 'Stage 4 – Upper Intermediate', shortTitle: 'Stage 4' },
  'stage-5': { id: 5, title: 'Stage 5 – C1 Advanced', shortTitle: 'Stage 5' },
  'stage-6': { id: 6, title: 'Stage 6 – C2 Proficiency', shortTitle: 'Stage 6' },
};

const lessonMapping: Record<string, LessonInfo> = {
  'repeat-after-me': { id: 'repeat-after-me', title: 'Repeat After Me', path: 'repeat-after-me' },
  'quick-response': { id: 'quick-response', title: 'Quick Response', path: 'quick-response' },
  'listen-and-reply': { id: 'listen-and-reply', title: 'Listen and Reply', path: 'listen-and-reply' },
  'daily-routine': { id: 'daily-routine', title: 'Daily Routine', path: 'daily-routine' },
  'quick-answer': { id: 'quick-answer', title: 'Quick Answer', path: 'quick-answer' },
  'roleplay-simulation': { id: 'roleplay-simulation', title: 'Roleplay Simulation', path: 'roleplay-simulation' },
  'group-dialogue': { id: 'group-dialogue', title: 'Group Dialogue', path: 'group-dialogue' },
  'critical-opinion-builder': { id: 'critical-opinion-builder', title: 'Critical Opinion Builder', path: 'critical-opinion-builder' },
  'sensitive-scenario-roleplay': { id: 'sensitive-scenario-roleplay', title: 'Sensitive Scenario Roleplay', path: 'sensitive-scenario-roleplay' },
  'ai-guided-spontaneous-speech': { id: 'ai-guided-spontaneous-speech', title: 'AI Guided Spontaneous Speech', path: 'ai-guided-spontaneous-speech' },
  'in-depth-interview-simulation': { id: 'in-depth-interview-simulation', title: 'In Depth Interview Simulation', path: 'in-depth-interview-simulation' },
  'academic-presentations': { id: 'academic-presentations', title: 'Academic Presentations', path: 'academic-presentations' },
  'critical-thinking-dialogues': { id: 'critical-thinking-dialogues', title: 'Critical Thinking Dialogues', path: 'critical-thinking-dialogues' },
  'news-summary-challenge': { id: 'news-summary-challenge', title: 'News Summary Challenge', path: 'news-summary-challenge' },
  'mock-interview-practice': { id: 'mock-interview-practice', title: 'Mock Interview Practice', path: 'mock-interview-practice' },
  'abstract-topic-monologue': { id: 'abstract-topic-monologue', title: 'Abstract Topic Monologue', path: 'abstract-topic-monologue' },
  'problem-solving-simulations': { id: 'problem-solving-simulations', title: 'Problem Solving Simulations', path: 'problem-solving-simulations' },
  'storytelling-practice': { id: 'storytelling-practice', title: 'Storytelling Practice', path: 'storytelling-practice' },
  'sight-words-lesson': { id: 'sight-words-lesson', title: 'Sight Words Lesson', path: 'sight-words-lesson' },
  'app-ui-words-lesson': { id: 'app-ui-words-lesson', title: 'App UI Words Lesson', path: 'app-ui-words-lesson' },
};

// Stage 0 lesson mapping for lesson/id pattern
const stage0LessonMapping: Record<string, string> = {
  '1': 'The English Alphabet',
  '2': 'Phonics & Sounds',
  '3': 'Numbers & Days',
  '4': 'Sight Words & Phrases',
  '5': 'App Navigation Words',
};

export const PracticeBreadcrumb: React.FC<PracticeBreadcrumbProps> = ({ className }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Parse the current path to extract stage and lesson information
  const pathParts = location.pathname.split('/');
  const isInPractice = pathParts.includes('practice');
  const stageIndex = pathParts.findIndex(part => part.startsWith('stage-'));
  const stagePart = stageIndex !== -1 ? pathParts[stageIndex] : null;
  
  // Check for lesson/id pattern (stage-0/lesson/1)
  const isLessonId = stageIndex !== -1 && pathParts[stageIndex + 1] === 'lesson' && pathParts[stageIndex + 2];
  const lessonId = isLessonId ? pathParts[stageIndex + 2] : null;
  
  // Check for regular lesson pattern (stage-1/repeat-after-me)
  const lessonPart = stageIndex !== -1 && pathParts[stageIndex + 1] && pathParts[stageIndex + 1] !== 'lesson' 
    ? pathParts[stageIndex + 1] 
    : null;

  const currentStage = stagePart ? stageMapping[stagePart] : null;
  const currentLesson = lessonPart ? lessonMapping[lessonPart] : null;
  const currentLessonTitle = lessonId && stagePart === 'stage-0' ? stage0LessonMapping[lessonId] : null;

  // Don't show breadcrumb if we're not in a practice context
  if (!isInPractice) {
    return null;
  }

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  const handlePracticeClick = () => {
    navigate('/dashboard');
  };

  const handleStageClick = () => {
    if (currentStage && stagePart) {
      navigate(`/dashboard/practice/${stagePart}`);
    }
  };

  return (
    <div className={className}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              onClick={handleDashboardClick}
              className="flex items-center gap-2 cursor-pointer hover:text-primary"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          
          <BreadcrumbSeparator />
          
          <BreadcrumbItem>
            <BreadcrumbLink
              onClick={handlePracticeClick}
              className="flex items-center gap-2 cursor-pointer hover:text-primary"
            >
              <GraduationCap className="h-4 w-4" />
              Practice
            </BreadcrumbLink>
          </BreadcrumbItem>

          {currentStage && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {currentLesson || currentLessonTitle ? (
                  <BreadcrumbLink
                    onClick={handleStageClick}
                    className="cursor-pointer hover:text-primary"
                  >
                    {currentStage.shortTitle}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{currentStage.shortTitle}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </>
          )}

          {currentLesson && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{currentLesson.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}

          {currentLessonTitle && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{currentLessonTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}; 