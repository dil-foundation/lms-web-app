import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Play, 
  Clock, 
  Users, 
  Star, 
  BookOpen, 
  Award, 
  CheckCircle,
  Globe,
  Smartphone,
  Download,
  ArrowLeft,
  PlayCircle,
  FileText,
  HelpCircle,
  TrendingUp,
  Target
} from 'lucide-react';

interface CourseOverviewProps {
  courseId?: string;
}

export const CourseOverview = ({ courseId }: CourseOverviewProps) => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Mock course data - in real app, this would come from API
  const course = {
    id: courseId || id || '1',
    title: "Complete English Language Mastery",
    subtitle: "Master English from beginner to advanced level with AI-powered learning",
    description: "This comprehensive course takes you from basic English fundamentals to advanced fluency. Learn with interactive lessons, real-world examples, and personalized AI tutoring that adapts to your learning style.",
    thumbnail: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Mock video URL
    instructor: {
      name: "Dr. Sarah Johnson",
      title: "English Language Expert",
      avatar: "SJ",
      rating: 4.8,
      students: 12000,
      courses: 15
    },
    stats: {
      rating: 4.9,
      totalRatings: 2847,
      students: 18500,
      duration: "42 hours",
      lessons: 156,
      level: "All Levels",
      language: "English",
      lastUpdated: "March 2024"
    },
    progress: {
      completed: 12,
      total: 156,
      percentage: 8,
      lastAccessed: "2 days ago",
      nextLesson: "Parts of Speech"
    },
    features: [
      "42 hours of on-demand video",
      "156 downloadable lessons",
      "AI-powered personalized tutoring",
      "Interactive quizzes and exercises",
      "Mobile and desktop access",
      "Certificate of completion",
      "Lifetime access",
      "30-day money-back guarantee"
    ],
    whatYouLearn: [
      "Speak English confidently in any situation",
      "Understand native English speakers clearly",
      "Write professional emails and documents",
      "Master English grammar and vocabulary",
      "Develop natural pronunciation",
      "Build business English skills"
    ],
    requirements: [
      "Basic understanding of English alphabet",
      "Willingness to practice daily",
      "Internet connection for video lessons",
      "No prior English experience required"
    ],
    curriculum: [
      {
        id: 'module-1',
        title: 'Getting Started',
        duration: '2h 30m',
        lessons: 3,
        description: 'Introduction to the course and basic navigation',
        topics: [
          'Welcome to the Course',
          'Course Navigation',
          'Learning Objectives Quiz'
        ]
      },
      {
        id: 'module-2',
        title: 'Basic Grammar Foundation',
        duration: '8h 45m',
        lessons: 12,
        description: 'Fundamental grammar concepts and sentence structure',
        topics: [
          'Parts of Speech',
          'Sentence Structure',
          'Tenses Overview',
          'Common Grammar Mistakes'
        ]
      },
      {
        id: 'module-3',
        title: 'Vocabulary Building',
        duration: '12h 15m',
        lessons: 18,
        description: 'Essential vocabulary for daily communication',
        topics: [
          'Daily Conversation Words',
          'Business Vocabulary',
          'Academic Terms',
          'Idioms and Expressions'
        ]
      },
      {
        id: 'module-4',
        title: 'Speaking & Pronunciation',
        duration: '10h 30m',
        lessons: 15,
        description: 'Develop natural pronunciation and speaking confidence',
        topics: [
          'Phonetic Sounds',
          'Stress and Intonation',
          'Conversation Practice',
          'Public Speaking'
        ]
      },
      {
        id: 'module-5',
        title: 'Reading & Writing',
        duration: '8h 0m',
        lessons: 14,
        description: 'Improve reading comprehension and writing skills',
        topics: [
          'Reading Strategies',
          'Writing Techniques',
          'Essay Structure',
          'Professional Writing'
        ]
      }
    ]
  };

  const handleStartLearning = () => {
    // Navigate to course content
    navigate(`/dashboard/course/${course.id}/content`);
  };

  const handlePreview = () => {
    setIsVideoPlaying(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('course_overview.back_to_courses')}
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-12">
          <div className="space-y-8">
            {/* Course Info */}
            <div className="text-center space-y-6">
              <div>
                <Badge className="bg-green-600 hover:bg-green-700 text-white mb-4">
                  {t('course_overview.ai_tutor_enabled')}
                </Badge>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  {course.title}
                </h1>
                <p className="text-lg text-muted-foreground mb-6 max-w-3xl mx-auto">
                  {course.subtitle}
                </p>
              </div>

              {/* Course Stats */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="font-semibold">{course.stats.rating}</span>
                  <span className="text-muted-foreground">({course.stats.totalRatings.toLocaleString()})</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>{course.stats.students.toLocaleString()} {t('course_overview.students')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-green-500" />
                  <span>{course.stats.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4 text-purple-500" />
                  <span>{course.stats.lessons} {t('course_overview.lessons')}</span>
                </div>
              </div>
            </div>

            {/* Full-width Video Player */}
            <div className="mx-auto">
              <Card>
                <CardContent className="p-0">
                  {/* Video/Image Preview - Full Width */}
                  <div className="relative aspect-video bg-gray-100 rounded-t-lg overflow-hidden min-h-[400px] md:min-h-[500px]">
                    {isVideoPlaying ? (
                      <iframe
                        src={course.videoUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <>
                        <img 
                          src={course.thumbnail} 
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Button 
                            variant="secondary"
                            size="lg"
                            className="text-lg"
                            onClick={handlePreview}
                          >
                            <PlayCircle className="w-6 h-6 mr-2" />
                            {t('course_overview.preview_course')}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Sidebar & Main Content */}
      <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Side: Main content */}
          <div className="lg:col-span-2 space-y-12">
             {/* Progress Card - if user is enrolled */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="text-blue-500" />
                  {t('course_overview.your_progress')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={course.progress.percentage} />
                <div className="flex justify-between items-center text-sm">
                  <p><span className="font-semibold">{course.progress.completed}/{course.progress.total}</span> {t('course_overview.lessons')}</p>
                  <Button onClick={handleStartLearning}>
                    <Play className="w-4 h-4 mr-2" />
                    {t('course_overview.continue_learning')}
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>{t('course_overview.last_accessed')}: {course.progress.lastAccessed}</p>
                  <p>{t('course_overview.next_up')}: <span className="font-semibold text-foreground">{course.progress.nextLesson}</span></p>
                </div>
              </CardContent>
            </Card>

            {/* What you'll learn */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="text-green-500" />
                  {t('course_overview.what_you_learn')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0">
                  {course.whatYouLearn.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Course curriculum */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="text-purple-500" />
                    {t('course_overview.course_curriculum')}
                  </CardTitle>
                  <Button variant="link" className="p-0 h-auto">{t('course_overview.show_all_sections', { count: course.curriculum.length })}</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {course.curriculum.map((module) => (
                    <AccordionItem value={module.id} key={module.id}>
                      <AccordionTrigger className="text-base font-semibold">
                        <div className="flex-1 text-left">
                          <p>{module.title}</p>
                          <p className="text-sm text-muted-foreground font-normal">{t('course_overview.lessons_count', { count: module.lessons })}</p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2 pl-4">
                          {module.topics.map((topic, index) => (
                            <li key={index} className="flex items-center gap-2 text-muted-foreground">
                              <FileText className="w-4 h-4" />
                              <span>{topic}</span>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>{t('course_overview.requirements')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2">
                  {course.requirements.map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* About this course */}
            <Card>
              <CardHeader>
                <CardTitle>{t('course_overview.about_this_course')}</CardTitle>
              </CardHeader>
              <CardContent className="prose dark:prose-invert max-w-none">
                <p>{course.description}</p>
              </CardContent>
            </Card>
            
            {/* Instructor */}
            <Card>
              <CardHeader>
                <CardTitle>{t('course_overview.instructor')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback>{course.instructor.avatar}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-bold">{course.instructor.name}</p>
                    <p className="text-muted-foreground">{course.instructor.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span>{course.instructor.rating} {t('course_overview.instructor_rating')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>{course.instructor.students.toLocaleString()} {t('course_overview.students')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4 text-purple-500" />
                    <span>{course.instructor.courses} {t('course_overview.courses')}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Dr. Johnson is a world-renowned linguist with over 20 years of experience...
                </p>
              </CardContent>
            </Card>

             {/* Reviews */}
            <Card>
              <CardHeader>
                 <div className="flex justify-between items-center">
                  <CardTitle>{t('course_overview.reviews')}</CardTitle>
                  <Button variant="link" className="p-0 h-auto">{t('course_overview.show_all_reviews')}</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Placeholder for reviews */}
                <div className="text-center text-muted-foreground py-8">
                  {t('course_overview.no_reviews')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side: Sticky Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <Card className="overflow-hidden">
                <CardHeader className="p-0">
                   <div className="relative aspect-video">
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-center justify-center">
                        <Button 
                          variant="secondary"
                          className="text-white bg-white/20 backdrop-blur-sm hover:bg-white/30"
                          onClick={handlePreview}
                        >
                          <PlayCircle className="w-5 h-5 mr-2" /> {t('course_overview.preview_course')}
                        </Button>
                     </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">$49.99</span>
                    <span className="text-muted-foreground line-through">$199.99</span>
                  </div>
                  <Button className="w-full" size="lg" onClick={handleStartLearning}>
                    {t('course_overview.start_learning')}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" className="w-full">{t('course_overview.share_course')}</Button>
                    <Button variant="outline" className="w-full">{t('course_overview.gift_course')}</Button>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-semibold">{t('course_overview.course_features_title')}</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {course.features.map((feature, index) => (
                         <li key={index} className="flex items-center gap-3">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 