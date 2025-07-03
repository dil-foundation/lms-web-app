
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
      <div className="space-y-6">
        {/* User Welcome Section */}
        <div className="flex items-center space-x-4 mb-8">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-red-500 text-white text-xl font-bold">
              AV
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Good Afternoon, Arun Super User</h1>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Streak</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <Flame className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Words Learned</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <Award className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Points</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <Award className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Lessons</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <Gift className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Continue Learning Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Continue Learning</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Course Card 1 - Available */}
            <Card className="bg-card border border-border overflow-hidden">
              <div className="relative">
                <div className="h-32 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full absolute top-2 left-2">
                    AI Tutor
                  </span>
                  <BookOpen className="h-12 w-12 text-blue-600" />
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-1">Stage 0 - Beginner English for Urdu Speakers</h3>
                <p className="text-xs text-muted-foreground mb-3">Duration not set</p>
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  Continue →
                </Button>
              </CardContent>
            </Card>

            {/* Course Card 2 - Locked */}
            <Card className="bg-card border border-border overflow-hidden opacity-75">
              <div className="relative">
                <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full absolute top-2 left-2">
                    AI Tutor
                  </span>
                  <BookOpen className="h-12 w-12 text-gray-500" />
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-1">Stage 1 - Building Confidence</h3>
                <p className="text-xs text-muted-foreground mb-3">Duration not set</p>
                <Button variant="secondary" className="w-full" disabled>
                  Locked
                </Button>
              </CardContent>
            </Card>

            {/* Course Card 3 - Locked */}
            <Card className="bg-card border border-border overflow-hidden opacity-75">
              <div className="relative">
                <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full absolute top-2 left-2">
                    AI Tutor
                  </span>
                  <BookOpen className="h-12 w-12 text-gray-500" />
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-1">Stage 2 - Elementary English</h3>
                <p className="text-xs text-muted-foreground mb-3">Duration not set</p>
                <Button variant="secondary" className="w-full" disabled>
                  Locked
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">LMS Dashboard</h2>
        <p className="text-muted-foreground">
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
        <div className="space-y-6">
          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center mb-6">
              <TabsList className="grid w-auto grid-cols-2 bg-muted">
                <TabsTrigger 
                  value="ai-tutor" 
                  className="px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  🤖 AI Tutor
                </TabsTrigger>
                <TabsTrigger 
                  value="lms"
                  className="px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
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
