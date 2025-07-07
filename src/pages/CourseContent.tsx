import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Play, 
  PlayCircle,
  CheckCircle, 
  Circle,
  Clock, 
  BookOpen,
  FileText,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  Download,
  Share2
} from 'lucide-react';

interface CourseContentProps {
  courseId?: string;
}

export const CourseContent = ({ courseId }: CourseContentProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentLessonId, setCurrentLessonId] = useState('lesson-1-1');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  // Mock course data - in real app, this would come from API
  const course = {
    id: courseId || id || '1',
    title: "Complete English Language Mastery",
    totalProgress: 45,
    modules: [
      {
        id: 'module-1',
        title: 'Getting Started',
        duration: '2h 30m',
        lessons: [
          {
            id: 'lesson-1-1',
            title: 'Welcome to the Course',
            type: 'video',
            duration: '5:30',
            completed: true,
            content: {
              videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
              transcript: 'Welcome to our comprehensive English language course...',
              description: 'In this introductory lesson, we will cover the course structure and learning objectives.'
            }
          },
          {
            id: 'lesson-1-2',
            title: 'Course Navigation',
            type: 'text',
            duration: '10 min',
            completed: true,
            content: {
              title: 'How to Navigate This Course',
              text: `
                <h2>Getting Around</h2>
                <p>This course is designed to be intuitive and easy to navigate. Here's how to make the most of your learning experience:</p>
                
                <h3>Lesson Types</h3>
                <ul>
                  <li><strong>Video Lessons:</strong> Watch and learn from expert instructors</li>
                  <li><strong>Text Lessons:</strong> Read detailed explanations and examples</li>
                  <li><strong>Quizzes:</strong> Test your knowledge and reinforce learning</li>
                </ul>
                
                <h3>Progress Tracking</h3>
                <p>Your progress is automatically saved as you complete each lesson. You can see your overall progress in the sidebar.</p>
                
                <h3>Interactive Features</h3>
                <p>Take advantage of:</p>
                <ul>
                  <li>Downloadable resources</li>
                  <li>Note-taking capabilities</li>
                  <li>Discussion forums</li>
                  <li>AI-powered assistance</li>
                </ul>
              `
            }
          },
          {
            id: 'lesson-1-3',
            title: 'Learning Objectives Quiz',
            type: 'quiz',
            duration: '5 min',
            completed: false,
            content: {
              questions: [
                {
                  id: 'q1',
                  question: 'What is the main goal of this course?',
                  options: [
                    'To learn basic English vocabulary',
                    'To achieve English language mastery',
                    'To prepare for English exams',
                    'To practice conversation skills'
                  ],
                  correct: 1
                },
                {
                  id: 'q2',
                  question: 'Which learning method is NOT mentioned in this course?',
                  options: [
                    'Video lessons',
                    'Text lessons',
                    'Group projects',
                    'Quizzes'
                  ],
                  correct: 2
                }
              ]
            }
          }
        ]
      },
      {
        id: 'module-2',
        title: 'Basic Grammar Foundation',
        duration: '8h 45m',
        lessons: [
          {
            id: 'lesson-2-1',
            title: 'Parts of Speech',
            type: 'video',
            duration: '15:20',
            completed: false,
            content: {
              videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
              transcript: 'Let\'s explore the fundamental parts of speech...',
              description: 'Learn about nouns, verbs, adjectives, and more in this comprehensive lesson.'
            }
          },
          {
            id: 'lesson-2-2',
            title: 'Sentence Structure',
            type: 'text',
            duration: '20 min',
            completed: false,
            content: {
              title: 'Understanding Sentence Structure',
              text: `
                <h2>Basic Sentence Patterns</h2>
                <p>English sentences follow predictable patterns. Understanding these patterns will help you construct clear, grammatically correct sentences.</p>
                
                <h3>Subject + Verb (SV)</h3>
                <p>The simplest sentence pattern:</p>
                <ul>
                  <li>Birds fly.</li>
                  <li>She laughed.</li>
                  <li>Time passes.</li>
                </ul>
                
                <h3>Subject + Verb + Object (SVO)</h3>
                <p>Adding an object to receive the action:</p>
                <ul>
                  <li>She reads books.</li>
                  <li>They play football.</li>
                  <li>I drink coffee.</li>
                </ul>
              `
            }
          }
        ]
      },
      {
        id: 'module-3',
        title: 'Vocabulary Building',
        duration: '12h 15m',
        lessons: [
          {
            id: 'lesson-3-1',
            title: 'Essential Daily Vocabulary',
            type: 'video',
            duration: '18:45',
            completed: false,
            content: {
              videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
              transcript: 'Today we\'ll learn essential vocabulary for daily conversations...',
              description: 'Master 100 essential words used in everyday English conversations.'
            }
          }
        ]
      }
    ]
  };

  const currentLesson = course.modules
    .flatMap(module => module.lessons)
    .find(lesson => lesson.id === currentLessonId);

  const currentModule = course.modules.find(module => 
    module.lessons.some(lesson => lesson.id === currentLessonId)
  );

  const allLessons = course.modules.flatMap(module => module.lessons);
  const currentIndex = allLessons.findIndex(lesson => lesson.id === currentLessonId);
  const nextLesson = allLessons[currentIndex + 1];
  const prevLesson = allLessons[currentIndex - 1];

  const markLessonComplete = (lessonId: string) => {
    // In real app, this would update the backend
    console.log(`Marking lesson ${lessonId} as complete`);
  };

  const renderLessonContent = () => {
    if (!currentLesson) return null;

    switch (currentLesson.type) {
      case 'video':
        return (
          <div className="space-y-6">
            {/* Video Player */}
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <iframe
                src={currentLesson.content.videoUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              
              {/* Video Controls Overlay */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setIsVideoMuted(!isVideoMuted)}>
                    {isVideoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" variant="secondary">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
                <Button size="sm" variant="secondary">
                  <Maximize className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Video Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Video Progress</span>
                <span className="text-sm font-medium">{videoProgress}% Complete</span>
              </div>
              <Progress value={videoProgress} className="h-2" />
            </div>

            {/* Video Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-green-500" />
                  Lesson Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  {currentLesson.content.description}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Transcript */}
            <Card>
              <CardHeader>
                <CardTitle>Transcript</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  <p className="text-sm leading-relaxed">{currentLesson.content.transcript}</p>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  {currentLesson.content.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: currentLesson.content.text }}
                />
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        );

      case 'quiz':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-purple-500" />
                  Knowledge Check
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentLesson.content.questions.map((question, index) => (
                  <div key={question.id} className="space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-3">{question.question}</h4>
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <Button
                              key={optionIndex}
                              variant="outline"
                              className="w-full justify-start h-auto p-3 text-left"
                            >
                              <div className="flex items-center gap-3">
                                <Circle className="w-4 h-4" />
                                <span>{option}</span>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {index < currentLesson.content.questions.length - 1 && <Separator />}
                  </div>
                ))}
                
                <div className="flex gap-2 pt-4">
                  <Button className="bg-green-600 hover:bg-green-700">
                    Submit Quiz
                  </Button>
                  <Button variant="outline">
                    Reset Answers
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <PlayCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'text':
        return <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'quiz':
        return <HelpCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      default:
        return <Circle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 border-r border-border bg-background overflow-hidden`}>
        <div className="p-6 border-b border-border bg-card/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground truncate text-lg">{course.title}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden hover:bg-accent"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Course Progress</span>
              <span className="text-sm font-semibold text-green-600">{course.totalProgress}%</span>
            </div>
            <Progress value={course.totalProgress} className="h-3 bg-muted" />
            <p className="text-xs text-muted-foreground">Keep up the great work!</p>
          </div>
        </div>

        <ScrollArea className="flex-1 p-2">
          <Accordion type="multiple" defaultValue={[currentModule?.id || '']}>
            {course.modules.map((module) => (
              <AccordionItem key={module.id} value={module.id} className="border-none">
                <AccordionTrigger className="hover:no-underline hover:bg-accent/50 rounded-lg px-3 py-4 transition-colors">
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-semibold text-foreground">{module.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="space-y-2 mt-3 ml-4">
                    {module.lessons.map((lesson) => (
                      <Button
                        key={lesson.id}
                        variant="ghost"
                        className={`w-full justify-start h-auto p-4 rounded-xl transition-all ${
                          lesson.id === currentLessonId 
                            ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 shadow-sm' 
                            : 'hover:bg-accent/50'
                        }`}
                        onClick={() => setCurrentLessonId(lesson.id)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="flex-shrink-0">
                            {lesson.completed ? (
                              <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                              </div>
                            ) : (
                              <div className={`p-1 rounded-full ${
                                lesson.type === 'video' ? 'bg-red-100 dark:bg-red-900/30' :
                                lesson.type === 'text' ? 'bg-blue-100 dark:bg-blue-900/30' :
                                'bg-purple-100 dark:bg-purple-900/30'
                              }`}>
                                {getTypeIcon(lesson.type)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <div className={`font-medium text-sm ${
                              lesson.id === currentLessonId ? 'text-green-700 dark:text-green-300' : 'text-foreground'
                            }`}>
                              {lesson.title}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{lesson.duration}</span>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`text-xs capitalize ${
                                  lesson.type === 'video' ? 'border-red-200 text-red-600 dark:border-red-800 dark:text-red-400' :
                                  lesson.type === 'text' ? 'border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400' :
                                  'border-purple-200 text-purple-600 dark:border-purple-800 dark:text-purple-400'
                                }`}
                              >
                                {lesson.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-background p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hover:bg-accent"
              >
                <Menu className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="font-semibold text-foreground text-lg">
                  {currentLesson?.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {currentModule?.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="hover:bg-accent">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Course
              </Button>
              {!currentLesson?.completed && (
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                  onClick={() => markLessonComplete(currentLessonId)}
                >
                  Mark Complete
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Lesson Content */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            {renderLessonContent()}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-border bg-background p-6">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              {prevLesson && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentLessonId(prevLesson.id)}
                  className="hover:bg-accent"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {nextLesson && (
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                  onClick={() => setCurrentLessonId(nextLesson.id)}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 