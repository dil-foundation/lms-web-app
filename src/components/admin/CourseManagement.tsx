
import { useState } from 'react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Mock course data - using same structure as StudentDashboard
  const courses = [
    {
      id: 1,
      title: "Stage 0 - Beginner English for Urdu Speakers",
      instructor: "Sarah Johnson",
      category: "Language Learning",
      status: "published",
      enrolledStudents: 245,
      image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      duration: "8 weeks",
      lessons: 24,
      createdAt: "2024-01-15"
    },
    {
      id: 2,
      title: "Stage 1 - Building Confidence",
      instructor: "Michael Chen",
      category: "Language Learning",
      status: "draft",
      enrolledStudents: 0,
      image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      duration: "6 weeks",
      lessons: 18,
      createdAt: "2024-02-01"
    },
    {
      id: 3,
      title: "Stage 2 - Elementary English",
      instructor: "Emily Rodriguez",
      category: "Language Learning",
      status: "published",
      enrolledStudents: 189,
      image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2028&q=80",
      duration: "10 weeks",
      lessons: 30,
      createdAt: "2024-01-20"
    },
    {
      id: 4,
      title: "Stage 3 - Intermediate English",
      instructor: "David Kim",
      category: "Language Learning",
      status: "under-review",
      enrolledStudents: 67,
      image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1973&q=80",
      duration: "12 weeks",
      lessons: 36,
      createdAt: "2024-02-10"
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      published: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Published' },
      draft: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', label: 'Draft' },
      'under-review': { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'Under Review' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <Badge className={`${config.color} border-0 text-xs`}>
        {config.label}
      </Badge>
    );
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.instructor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Course Management</h1>
          <p className="text-muted-foreground">Manage all courses in the system</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Course
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Course</DialogTitle>
              <DialogDescription>
                You'll be redirected to the Course Builder to create a new course.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline">Cancel</Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                Open Course Builder
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Courses</p>
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
                <p className="text-sm text-muted-foreground">Published</p>
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
                <p className="text-sm text-muted-foreground">Draft Courses</p>
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
                <p className="text-sm text-muted-foreground">Total Students</p>
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
            placeholder="Search courses by title or instructor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="under-review">Under Review</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Language Learning">Language Learning</SelectItem>
              <SelectItem value="Mathematics">Mathematics</SelectItem>
              <SelectItem value="Science">Science</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCourses.map((course) => (
          <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow bg-card border border-border">
            <div className="relative">
              <img 
                src={course.image} 
                alt={course.title}
                className="w-full h-40 object-cover"
              />
              <div className="absolute top-2 left-2">
                {getStatusBadge(course.status)}
              </div>
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="bg-white/80 hover:bg-white/90">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Course
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2 text-card-foreground line-clamp-2">
                {course.title}
              </h3>
              
              <p className="text-xs text-muted-foreground mb-2">
                by {course.instructor}
              </p>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {course.duration}
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {course.lessons} lessons
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {course.enrolledStudents} students
                </div>
              </div>
              
              <Button 
                className="w-full text-sm bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  // Navigate to course builder with course ID
                  console.log(`Edit course ${course.id}`);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Course
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No courses found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first course.'}
          </p>
          {(!searchTerm && statusFilter === 'all' && categoryFilter === 'all') && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Course
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Course</DialogTitle>
                  <DialogDescription>
                    You'll be redirected to the Course Builder to create a new course.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline">Cancel</Button>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    Open Course Builder
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );
};
