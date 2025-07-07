import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, Award, BookOpen, Clock, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StudentDashboardProps {
  userProfile: any;
}

export const StudentDashboard = ({ userProfile }: StudentDashboardProps) => {
  const navigate = useNavigate();
  
  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const courses = [
    {
      id: 1,
      title: "Stage 0 - Beginner English for Urdu Speakers",
      progress: 65,
      status: "available",
      image: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=6000&q=80",
      duration: "Duration not set",
      buttonText: "Continue"
    },
    {
      id: 2,
      title: "Stage 1 - Building Confidence",
      progress: 0,
      status: "locked",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=5530&q=80",
      duration: "Duration not set",
      buttonText: "Locked"
    },
    {
      id: 3,
      title: "Stage 2 - Elementary English",
      progress: 0,
      status: "locked",
      image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=3543&q=80",
      duration: "Duration not set",
      buttonText: "Locked"
    },
    {
      id: 4,
      title: "Stage 3 - Intermediate English",
      progress: 0,
      status: "locked",
      image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=4076&q=80",
      duration: "Duration not set",
      buttonText: "Locked"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center space-x-4 mb-8">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
            {getInitials(userProfile?.first_name, userProfile?.last_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {userProfile?.first_name || 'Student'}!
          </h1>
          <p className="text-muted-foreground">
            {userProfile?.grade ? `Grade ${userProfile.grade}` : 'Continue your learning journey'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="text-2xl font-bold">7 days</p>
              </div>
              <Flame className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed Lessons</p>
                <p className="text-2xl font-bold">24</p>
              </div>
              <BookOpen className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Points Earned</p>
                <p className="text-2xl font-bold">1,250</p>
              </div>
              <Award className="h-6 w-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Study Time</p>
                <p className="text-2xl font-bold">45h</p>
              </div>
              <Clock className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Continue Learning Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Continue Learning</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {courses.map((course) => (
            <Card 
              key={course.id} 
              className="overflow-hidden hover:shadow-lg transition-shadow bg-card border border-border cursor-pointer"
                                onClick={(e) => {
                    e.stopPropagation();
                    if (course.status !== 'locked') {
                      navigate(`/dashboard/course/${course.id}`);
                    }
                  }}
            >
              <div className="relative">
                <img 
                  src={course.image} 
                  alt={course.title}
                  className="w-full h-32 object-cover"
                />
                <Badge 
                  className="absolute top-2 left-2 bg-green-600 hover:bg-green-700 text-white border-0"
                >
                  AI Tutor
                </Badge>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-2 text-card-foreground line-clamp-2">
                  {course.title}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {course.duration}
                </p>
                <Button 
                  className={`w-full text-sm ${
                    course.status === 'locked' 
                      ? 'bg-muted hover:bg-muted text-muted-foreground cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                  disabled={course.status === 'locked'}
                  onClick={() => {
                    if (course.status !== 'locked') {
                      navigate(`/dashboard/course/${course.id}`);
                    }
                  }}
                >
                  {course.status === 'locked' && <Lock className="w-4 h-4 mr-2" />}
                  {course.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
