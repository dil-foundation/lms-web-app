import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Eye, 
  BookOpen, 
  Users, 
  Clock,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const CourseManagement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Mock course data - using same structure as StudentDashboard
  const courses = [
    {
      id: 1,
      title: "course_management.courses.beginner_english.title",
      instructor: "course_management.courses.beginner_english.instructor",
      category: "course_management.category.language_learning",
      status: "published",
      enrolledStudents: 245,
      image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      duration: "course_management.courses.beginner_english.duration",
      lessons: 24,
      createdAt: "2024-01-15"
    },
    {
      id: 2,
      title: "course_management.courses.building_confidence.title",
      instructor: "course_management.courses.building_confidence.instructor",
      category: "course_management.category.language_learning",
      status: "draft",
      enrolledStudents: 0,
      image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      duration: "course_management.courses.building_confidence.duration",
      lessons: 18,
      createdAt: "2024-02-01"
    },
    {
      id: 3,
      title: "course_management.courses.elementary_english.title",
      instructor: "course_management.courses.elementary_english.instructor",
      category: "course_management.category.language_learning",
      status: "published",
      enrolledStudents: 189,
      image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2028&q=80",
      duration: "course_management.courses.elementary_english.duration",
      lessons: 30,
      createdAt: "2024-01-20"
    },
    {
      id: 4,
      title: "course_management.courses.intermediate_english.title",
      instructor: "course_management.courses.intermediate_english.instructor",
      category: "course_management.category.language_learning",
      status: "under-review",
      enrolledStudents: 67,
      image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1973&q=80",
      duration: "course_management.courses.intermediate_english.duration",
      lessons: 36,
      createdAt: "2024-02-10"
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      published: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: t('course_management.status.published') },
      draft: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', label: t('course_management.status.draft') },
      'under-review': { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: t('course_management.status.under_review') },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <Badge className={`${config.color} border-0 text-xs`}>
        {config.label}
      </Badge>
    );
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = t(course.title).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t(course.instructor).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || t(course.category) === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleCreateCourse = () => {
    navigate('/dashboard/courses/builder/new');
  };

  const handleEditCourse = (courseId: number) => {
    navigate(`/dashboard/courses/builder/${courseId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('course_management.title')}</h1>
          <p className="text-muted-foreground">{t('course_management.description')}</p>
        </div>
        
        <Button 
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={handleCreateCourse}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('course_management.create_course')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('course_management.total_courses')}</p>
                <p className="text-2xl font-bold">{courses.length}</p>
              </div>
              <BookOpen className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('course_management.published')}</p>
                <p className="text-2xl font-bold">
                  {courses.filter(c => c.status === 'published').length}
                </p>
              </div>
              <Eye className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('course_management.draft_courses')}</p>
                <p className="text-2xl font-bold">
                  {courses.filter(c => c.status === 'draft').length}
                </p>
              </div>
              <Edit className="h-6 w-6 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('course_management.total_students')}</p>
                <p className="text-2xl font-bold">
                  {courses.reduce((sum, course) => sum + course.enrolledStudents, 0)}
                </p>
              </div>
              <Users className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder={t('course_management.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-auto">
              <SelectValue placeholder={t('course_management.filter.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('course_management.filter.all_statuses')}</SelectItem>
              <SelectItem value="published">{t('course_management.status.published')}</SelectItem>
              <SelectItem value="draft">{t('course_management.status.draft')}</SelectItem>
              <SelectItem value="under-review">{t('course_management.status.under_review')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-auto">
              <SelectValue placeholder={t('course_management.filter.category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('course_management.filter.all_categories')}</SelectItem>
              <SelectItem value="language-learning">{t('course_management.category.language_learning')}</SelectItem>
              {/* Add other categories as needed */}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Course List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {filteredCourses.map(course => (
          <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
            <img src={course.image} alt={t(course.title)} className="w-full h-40 object-cover" />
            <CardContent className="p-4 space-y-3 flex-grow">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-foreground line-clamp-2 h-14">{t(course.title)}</h3>
                {getStatusBadge(course.status)}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('course_management.by_instructor', { instructor: t(course.instructor) })}
              </p>
              
              <div className="flex items-center text-sm text-muted-foreground space-x-4 pt-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>{t('course_management.lessons', { count: course.lessons })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{t('course_management.students', { count: course.enrolledStudents })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{t(course.duration)}</span>
                </div>
              </div>
            </CardContent>
            <div className="px-4 py-3 bg-muted/40 border-t border-border flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                {t('course_management.created_at', { date: new Date(course.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) })}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEditCourse(course.id)}>
                  <Edit className="w-3 h-3 mr-1" />
                  {t('course_management.edit')}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="w-4 h-4 mr-2" />
                      {t('course_management.view_details')}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500 hover:!text-red-500">
                      <Users className="w-4 h-4 mr-2" />
                      {t('course_management.manage_students')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
