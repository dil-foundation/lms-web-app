import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, Award, BookOpen, Clock, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface StudentDashboardProps {
  userProfile: any;
}

export const StudentDashboard = ({ userProfile }: StudentDashboardProps) => {
  const { t } = useTranslation();
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
    <div className="w-full space-y-4 sm:space-y-6 min-w-0 max-w-7xl">
      {/* Welcome Section */}
      <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
        <Avatar className="h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-lg sm:text-xl font-bold">
            {getInitials(userProfile?.first_name, userProfile?.last_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">
            {t('student_dashboard.welcome_back', { name: userProfile?.first_name || 'Student' })}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {userProfile?.grade ? t('student_dashboard.grade', { grade: userProfile.grade }) : t('student_dashboard.continue_learning_journey')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{t('student_dashboard.current_streak')}</p>
                <p className="text-lg sm:text-2xl font-bold">7 days</p>
              </div>
              <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{t('student_dashboard.completed_lessons')}</p>
                <p className="text-lg sm:text-2xl font-bold">24</p>
              </div>
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{t('student_dashboard.points_earned')}</p>
                <p className="text-lg sm:text-2xl font-bold">1,250</p>
              </div>
              <Award className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{t('student_dashboard.study_time')}</p>
                <p className="text-lg sm:text-2xl font-bold">45h</p>
              </div>
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Continue Learning Section */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">{t('student_dashboard.continue_learning')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
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
                  className="w-full h-28 sm:h-32 object-cover"
                />
                <Badge 
                  className="absolute top-2 left-2 bg-green-600 hover:bg-green-700 text-white border-0 text-xs"
                >
                  {t('student_dashboard.ai_tutor')}
                </Badge>
              </div>
              <CardContent className="p-3 sm:p-4">
                <h3 className="font-semibold text-xs sm:text-sm mb-2 text-card-foreground line-clamp-2 leading-tight">
                  {course.title}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {course.duration}
                </p>
                <Button 
                  className={`w-full text-xs sm:text-sm ${
                    course.status === 'locked' 
                      ? 'bg-muted hover:bg-muted text-muted-foreground cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                  size="sm"
                  disabled={course.status === 'locked'}
                  onClick={() => {
                    if (course.status !== 'locked') {
                      navigate(`/dashboard/course/${course.id}`);
                    }
                  }}
                >
                  {course.status === 'locked' && <Lock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />}
                  <span className="truncate">{course.buttonText}</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
