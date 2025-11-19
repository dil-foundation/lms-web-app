import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, BookCheck } from 'lucide-react';
import CourseManagement from '@/components/admin/CourseManagement';
import { CourseCategories } from '@/components/admin/CourseCategories';

const CoursesAndCategories = () => {
  const [activeTab, setActiveTab] = useState('courses');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <TabsTrigger 
              value="courses" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 rounded-md transition-all"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Courses
            </TabsTrigger>
            <TabsTrigger 
              value="categories" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 rounded-md transition-all"
            >
              <BookCheck className="w-4 h-4 mr-2" />
              Course Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="mt-0">
            <CourseManagement />
          </TabsContent>

          <TabsContent value="categories" className="mt-0">
            <CourseCategories />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CoursesAndCategories;

