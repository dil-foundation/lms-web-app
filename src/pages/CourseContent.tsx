import { useTranslation } from 'react-i18next';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface CourseContentProps {
  courseId?: string;
}

export const CourseContent = ({ courseId }: CourseContentProps) => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentLessonId, setCurrentLessonId] = useState('lesson-1-1');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  // Mock course data - in real app, this would come from API
  const course = {
    id: courseId || id || '1',
    title: t('course_content.course.title'),
    totalProgress: 45,
    modules: [
      {
        id: 'module-1',
        title: t('course_content.course.modules.0.title'),
        duration: t('course_content.course.modules.0.duration'),
        lessons: [
          {
            id: 'lesson-1-1',
            title: t('course_content.course.modules.0.lessons.0.title'),
            type: 'video',
            duration: '5:30',
            completed: true,
            content: {
              videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
              transcript: t('course_content.course.modules.0.lessons.0.content.transcript'),
              description: t('course_content.course.modules.0.lessons.0.content.description')
            }
          },
          {
            id: 'lesson-1-2',
            title: t('course_content.course.modules.0.lessons.1.title'),
            type: 'text',
            duration: '10 min',
            completed: true,
            content: {
              title: t('course_content.course.modules.0.lessons.1.content.title'),
              text: t('course_content.course.modules.0.lessons.1.content.text')
            }
          },
          {
            id: 'lesson-1-3',
            title: t('course_content.course.modules.0.lessons.2.title'),
            type: 'quiz',
            duration: '5 min',
            completed: false,
            content: {
              questions: [
                {
                  id: 'q1',
                  question: t('course_content.course.modules.0.lessons.2.content.questions.0.question'),
                  options: [
                    t('course_content.course.modules.0.lessons.2.content.questions.0.options.0'),
                    t('course_content.course.modules.0.lessons.2.content.questions.0.options.1'),
                    t('course_content.course.modules.0.lessons.2.content.questions.0.options.2'),
                    t('course_content.course.modules.0.lessons.2.content.questions.0.options.3')
                  ],
                  correct: 1
                },
                {
                  id: 'q2',
                  question: t('course_content.course.modules.0.lessons.2.content.questions.1.question'),
                  options: [
                    t('course_content.course.modules.0.lessons.2.content.questions.1.options.0'),
                    t('course_content.course.modules.0.lessons.2.content.questions.1.options.1'),
                    t('course_content.course.modules.0.lessons.2.content.questions.1.options.2'),
                    t('course_content.course.modules.0.lessons.2.content.questions.1.options.3')
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
        title: t('course_content.course.modules.1.title'),
        duration: t('course_content.course.modules.1.duration'),
        lessons: [
          {
            id: 'lesson-2-1',
            title: t('course_content.course.modules.1.lessons.0.title'),
            type: 'video',
            duration: '15:20',
            completed: false,
            content: {
              videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
              transcript: t('course_content.course.modules.1.lessons.0.content.transcript'),
              description: t('course_content.course.modules.1.lessons.0.content.description')
            }
          },
          {
            id: 'lesson-2-2',
            title: t('course_content.course.modules.1.lessons.1.title'),
            type: 'text',
            duration: '20 min',
            completed: false,
            content: {
              title: t('course_content.course.modules.1.lessons.1.content.title'),
              text: t('course_content.course.modules.1.lessons.1.content.text')
            }
          }
        ]
      },
      {
        id: 'module-3',
        title: t('course_content.course.modules.2.title'),
        duration: t('course_content.course.modules.2.duration'),
        lessons: [
          {
            id: 'lesson-3-1',
            title: t('course_content.course.modules.2.lessons.0.title'),
            type: 'video',
            duration: '18:45',
            completed: false,
            content: {
              videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
              transcript: t('course_content.course.modules.2.lessons.0.content.transcript'),
              description: t('course_content.course.modules.2.lessons.0.content.description')
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
                    <PlayCircle className="w-4 h-4" />
                  </Button>
                  <div className="w-48">
                    <Progress value={videoProgress} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary">
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="secondary">
                    <Maximize className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Title and Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-0">
                {currentLesson.title}
              </h1>
              <div className="flex items-center gap-2">
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" /> {t('course_content.actions.download')}
                </Button>
                <Button variant="outline">
                  <Share2 className="w-4 h-4 mr-2" /> {t('course_content.actions.share')}
                </Button>
              </div>
            </div>

            {/* Lesson Content Sections */}
            <Tabs defaultValue="description" className="w-full">
              <TabsList>
                <TabsTrigger value="description">{t('course_content.tabs.description')}</TabsTrigger>
                <TabsTrigger value="transcript">{t('course_content.tabs.transcript')}</TabsTrigger>
                <TabsTrigger value="downloads">{t('course_content.tabs.downloads')}</TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <p>{currentLesson.content.description}</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="transcript" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <p>{currentLesson.content.transcript}</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="downloads" className="mt-4">
                 <Card>
                   <CardContent className="pt-6">
                     <p>{t('course_content.downloads.no_downloads')}</p>
                   </CardContent>
                 </Card>
              </TabsContent>
            </Tabs>
          </div>
        );
      case 'text':
        return (
          <div className="prose dark:prose-invert max-w-none">
            <h1>{currentLesson.content.title}</h1>
            <div dangerouslySetInnerHTML={{ __html: currentLesson.content.text }} />
          </div>
        );
      case 'quiz':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">{t('course_content.quiz.title')}</h2>
            <Card>
              <CardContent className="p-6 space-y-6">
                {currentLesson.content.questions.map((q, index) => (
                  <div key={q.id}>
                    <p className="font-semibold mb-2">{t('course_content.quiz.question', { current: index + 1, total: currentLesson.content.questions.length })}</p>
                    <p className="mb-4">{q.question}</p>
                    <div className="space-y-2">
                      {q.options.map((opt, i) => (
                        <Button key={i} variant="outline" className="w-full justify-start text-left h-auto py-2">
                          {opt}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline">{t('course_content.quiz.retake')}</Button>
                  <Button>{t('course_content.quiz.submit')}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return <div>{t('course_content.unknown_lesson_type')}</div>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <PlayCircle className="w-5 h-5" />;
      case 'text': return <FileText className="w-5 h-5" />;
      case 'quiz': return <HelpCircle className="w-5 h-5" />;
      default: return <BookOpen className="w-5 h-5" />;
    }
  };
  
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
       <div className="p-4 border-b">
        <Button variant="ghost" onClick={() => navigate('/dashboard/courses')} className="mb-4">
          <ChevronLeft className="w-4 h-4 mr-2" />
          {t('course_content.sidebar.back_to_course')}
        </Button>
        <h2 className="text-xl font-bold truncate">{course.title}</h2>
        <div className="flex items-center gap-2 mt-2">
          <Progress value={course.totalProgress} className="w-full" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">{course.totalProgress}%</span>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <Accordion type="multiple" defaultValue={[`module-${currentModule?.id}`]} className="w-full">
          {course.modules.map(module => (
            <AccordionItem value={`module-${module.id}`} key={module.id}>
              <AccordionTrigger className="px-4 py-3 text-base font-semibold hover:bg-muted/50">
                <div className="flex-1 text-left">
                  <p>{module.title}</p>
                  <p className="text-sm text-muted-foreground font-normal">{module.duration}</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-0">
                <ul className="space-y-1">
                  {module.lessons.map(lesson => (
                    <li key={lesson.id}>
                      <button
                        onClick={() => {
                          setCurrentLessonId(lesson.id);
                          if(isSidebarOpen) setIsSidebarOpen(false);
                        }}
                        className={cn(
                          'flex items-center gap-3 w-full text-left p-4 pr-2 text-sm transition-colors',
                          currentLessonId === lesson.id 
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        {lesson.completed ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                        <span className="flex-1">{lesson.title}</span>
                        <Badge variant="outline" className="text-xs">{lesson.type}</Badge>
                        <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-80 xl:w-96 border-r flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b lg:border-none">
          <Button variant="ghost" className="lg:hidden" size="icon" onClick={() => setIsSidebarOpen(true)}>
            <Menu />
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => prevLesson && setCurrentLessonId(prevLesson.id)} disabled={!prevLesson}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('course_content.navigation.previous')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => nextLesson && setCurrentLessonId(nextLesson.id)} disabled={!nextLesson}>
              {t('course_content.navigation.next')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div>
            <Button onClick={() => markLessonComplete(currentLessonId)} disabled={currentLesson?.completed}>
              {currentLesson?.completed ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" /> {t('course_content.navigation.completed')}
                </>
              ) : (
                t('course_content.navigation.mark_complete')
              )}
            </Button>
          </div>
        </header>

        {/* Lesson Content Area */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {renderLessonContent()}
        </main>
      </div>
      
      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative w-80 bg-background h-full border-r">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">{t('course_content.mobile_sidebar.title')}</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}
    </div>
  );
}; 