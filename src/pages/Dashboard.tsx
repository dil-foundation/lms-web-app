import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header } from '@/components/Header';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Home, BookOpen, FileQuestion, TrendingUp, Flame, Award, Gift, PlayCircle } from 'lucide-react';

const DashboardOverview = ({ activeTab }: { activeTab: string }) => {
  if (activeTab === 'ai-tutor') {
    return (
      <div className="space-y-8">
        {/* User Welcome Section */}
        <div className="flex items-center space-x-6 mb-8">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-2xl font-bold">
              AV
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Good Afternoon, Arun</h1>
            <p className="text-muted-foreground">Ready to continue your learning journey?</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">Streak</p>
                  <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">0</p>
                </div>
                <div className="p-3 bg-orange-500 rounded-full">
                  <Flame className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Words Learned</p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">0</p>
                </div>
                <div className="p-3 bg-blue-500 rounded-full">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">Points</p>
                  <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">0</p>
                </div>
                <div className="p-3 bg-purple-500 rounded-full">
                  <Award className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Lessons</p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-300">0</p>
                </div>
                <div className="p-3 bg-green-500 rounded-full">
                  <Gift className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Continue Learning Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-foreground">Continue Learning</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Course Card 1 - Available */}
            <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
              <div className="relative overflow-hidden">
                <div className="h-40 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="absolute top-3 left-3 text-xs bg-white/90 text-blue-700 px-3 py-1 rounded-full font-medium">
                    AI Tutor
                  </span>
                  <BookOpen className="h-16 w-16 text-white/90" />
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-2 text-foreground">Stage 0 - Beginner English</h3>
                <p className="text-sm text-muted-foreground mb-4">For Urdu Speakers • Duration not set</p>
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  Continue Learning →
                </Button>
              </CardContent>
            </Card>

            {/* Course Card 2 - Locked */}
            <Card className="group opacity-60 hover:opacity-80 transition-opacity duration-300">
              <div className="relative overflow-hidden">
                <div className="h-40 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                  <span className="absolute top-3 left-3 text-xs bg-white/90 text-gray-700 px-3 py-1 rounded-full font-medium">
                    AI Tutor
                  </span>
                  <BookOpen className="h-16 w-16 text-white/70" />
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-2 text-foreground">Stage 1 - Building Confidence</h3>
                <p className="text-sm text-muted-foreground mb-4">Duration not set</p>
                <Button variant="secondary" className="w-full" disabled>
                  🔒 Locked
                </Button>
              </CardContent>
            </Card>

            {/* Course Card 3 - Locked */}
            <Card className="group opacity-60 hover:opacity-80 transition-opacity duration-300">
              <div className="relative overflow-hidden">
                <div className="h-40 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                  <span className="absolute top-3 left-3 text-xs bg-white/90 text-gray-700 px-3 py-1 rounded-full font-medium">
                    AI Tutor
                  </span>
                  <BookOpen className="h-16 w-16 text-white/70" />
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-2 text-foreground">Stage 2 - Elementary English</h3>
                <p className="text-sm text-muted-foreground mb-4">Duration not set</p>
                <Button variant="secondary" className="w-full" disabled>
                  🔒 Locked
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center py-16">
        <div className="bg-muted/30 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
          <BookOpen className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-3xl font-bold mb-4 text-foreground">LMS Dashboard</h2>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Learning Management System features will be available here.
        </p>
      </div>
    </div>
  );
};

const DashboardCourses = ({ activeTab }: { activeTab: string }) => (
  <div className="text-center py-12">
    <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
    <h2 className="text-2xl font-semibold mb-2">
      {activeTab === 'ai-tutor' ? 'AI Tutor Courses' : 'LMS Courses'}
    </h2>
    <p className="text-muted-foreground">
      {activeTab === 'ai-tutor' 
        ? 'Explore AI-powered courses and interactive learning experiences.'
        : 'Explore traditional courses and learning materials.'
      }
    </p>
  </div>
);

const DashboardQuizzes = ({ activeTab }: { activeTab: string }) => (
  <div className="text-center py-12">
    <FileQuestion className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
    <h2 className="text-2xl font-semibold mb-2">
      {activeTab === 'ai-tutor' ? 'AI Tutor Quizzes' : 'LMS Quizzes'}
    </h2>
    <p className="text-muted-foreground">
      {activeTab === 'ai-tutor' 
        ? 'Take AI-generated quizzes to test your knowledge and get personalized feedback.'
        : 'Take traditional quizzes and assessments to track your progress.'
      }
    </p>
  </div>
);

const DashboardProgress = ({ activeTab }: { activeTab: string }) => (
  <div className="text-center py-12">
    <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
    <h2 className="text-2xl font-semibold mb-2">
      {activeTab === 'ai-tutor' ? 'AI Learning Progress' : 'LMS Progress'}
    </h2>
    <p className="text-muted-foreground">
      {activeTab === 'ai-tutor' 
        ? 'Monitor your AI-powered learning journey with detailed analytics and personalized insights.'
        : 'Monitor your traditional learning progress with standard metrics and reports.'
      }
    </p>
  </div>
);

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('ai-tutor');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <DashboardSidebar>
        <div className="space-y-8">
          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="grid w-auto grid-cols-2 bg-muted/50 p-1 rounded-lg">
                <TabsTrigger 
                  value="ai-tutor" 
                  className="px-8 py-3 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-md transition-all"
                >
                  🤖 AI Tutor
                </TabsTrigger>
                <TabsTrigger 
                  value="lms"
                  className="px-8 py-3 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-md transition-all"
                >
                  📚 LMS
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="ai-tutor" className="mt-0">
              <Routes>
                <Route path="/" element={<DashboardOverview activeTab={activeTab} />} />
                <Route path="/courses" element={<DashboardCourses activeTab={activeTab} />} />
                <Route path="/quizzes" element={<DashboardQuizzes activeTab={activeTab} />} />
                <Route path="/progress" element={<DashboardProgress activeTab={activeTab} />} />
              </Routes>
            </TabsContent>

            <TabsContent value="lms" className="mt-0">
              <Routes>
                <Route path="/" element={<DashboardOverview activeTab={activeTab} />} />
                <Route path="/courses" element={<DashboardCourses activeTab={activeTab} />} />
                <Route path="/quizzes" element={<DashboardQuizzes activeTab={activeTab} />} />
                <Route path="/progress" element={<DashboardProgress activeTab={activeTab} />} />
              </Routes>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardSidebar>
    </div>
  );
};

export default Dashboard;
