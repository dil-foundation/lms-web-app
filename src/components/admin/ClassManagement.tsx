import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Plus, BookOpen, Edit, Trash2, Eye, RefreshCw, Users, MoreHorizontal, MapPin, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { useClasses, useTeachers, useStudents, useBoards, useSchools } from '@/hooks/useClasses';
import { ClassWithMembers, CreateClassData, UpdateClassData } from '@/services/classService';


const ClassManagement: React.FC = () => {
  // Use custom hooks for data management
  const { classes, loading, stats, createClass, updateClass, deleteClass } = useClasses();
  const { teachers, loading: teachersLoading } = useTeachers();
  const { students, loading: studentsLoading } = useStudents();
  const { boards, loading: boardsLoading } = useBoards();

  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithMembers | null>(null);
  const [viewingClass, setViewingClass] = useState<ClassWithMembers | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    grade: '',
    school_id: '',
    board_id: '',
    description: '',
    teachers: [] as string[],
    students: [] as string[]
  });

  // Use schools hook with board filtering - must be after formData declaration
  const { schools, loading: schoolsLoading } = useSchools(formData.board_id);


  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = gradeFilter === 'all' || !gradeFilter || cls.grade === gradeFilter;
    const matchesSchool = schoolFilter === 'all' || !schoolFilter || cls.school === schoolFilter;
    return matchesSearch && matchesGrade && matchesSchool;
  });

  // Handle member changes (teachers/students)
  const handleMembersChange = (role: 'teachers' | 'students', selectedIds: string[]) => {
    setFormData(prev => ({
      ...prev,
      [role]: selectedIds
    }));
  };

  // Handle board change - reset school selection when board changes
  const handleBoardChange = (boardId: string) => {
    setFormData(prev => ({
      ...prev,
      board_id: boardId,
      school_id: '' // Reset school selection when board changes
    }));
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.code || !formData.grade || !formData.school_id || !formData.board_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    const classData: CreateClassData = {
      name: formData.name,
      code: formData.code.toUpperCase(),
      grade: formData.grade,
      school_id: formData.school_id,
      board_id: formData.board_id,
      description: formData.description,
      teacher_ids: formData.teachers,
      student_ids: formData.students
    };

    const result = await createClass(classData);
    if (result) {
      setIsCreateDialogOpen(false);
      resetForm();
    }
  };

  const handleEdit = async () => {
    if (!editingClass || !formData.name || !formData.code || !formData.grade || !formData.school_id || !formData.board_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    const classData: UpdateClassData = {
      id: editingClass.id,
      name: formData.name,
      code: formData.code.toUpperCase(),
      grade: formData.grade,
      school_id: formData.school_id,
      board_id: formData.board_id,
      description: formData.description,
      teacher_ids: formData.teachers,
      student_ids: formData.students
    };

    const result = await updateClass(classData);
    if (result) {
      setIsEditDialogOpen(false);
      setEditingClass(null);
      resetForm();
    }
  };

  const handleDelete = async (classId: string) => {
    const success = await deleteClass(classId);
    if (success) {
      // The hook will handle updating the UI
    }
  };

  const openEditDialog = (cls: ClassWithMembers) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      code: cls.code,
      grade: cls.grade,
      school_id: cls.school_id || '',
      board_id: cls.board_id || '',
      description: cls.description,
      teachers: cls.teachers.map(t => t.id),
      students: cls.students.map(s => s.id)
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (cls: ClassWithMembers) => {
    setViewingClass(cls);
    setIsViewDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      grade: '',
      school_id: '',
      board_id: '',
      description: '',
      teachers: [],
      students: []
    });
  };

  const getGradeBadge = (grade: string) => {
    const gradeNum = parseInt(grade);
    if (gradeNum <= 5) return <Badge variant="default" className="bg-blue-600">Grade {grade}</Badge>;
    if (gradeNum <= 8) return <Badge variant="default" className="bg-green-600">Grade {grade}</Badge>;
    if (gradeNum <= 10) return <Badge variant="default" className="bg-yellow-600">Grade {grade}</Badge>;
    return <Badge variant="default" className="bg-purple-600">Grade {grade}</Badge>;
  };



  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading classes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-green-600">Class Management</h1>
          <p className="text-muted-foreground">Manage all classes and academic sections in the system</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Class
          </Button>
        </div>
      </div>

             {/* Summary Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
             <BookOpen className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{stats.totalClasses}</div>
             <p className="text-xs text-muted-foreground">All classes in the system</p>
           </CardContent>
         </Card>

         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
             <GraduationCap className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{stats.totalSchools}</div>
             <p className="text-xs text-muted-foreground">Unique schools</p>
           </CardContent>
         </Card>

         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Boards</CardTitle>
             <Users className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{stats.totalBoards}</div>
             <p className="text-xs text-muted-foreground">Unique boards</p>
           </CardContent>
         </Card>

         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
             <Users className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{stats.totalTeachers}</div>
             <p className="text-xs text-muted-foreground">Unique teachers</p>
           </CardContent>
         </Card>

         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Students</CardTitle>
             <Users className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{stats.totalStudents}</div>
             <p className="text-xs text-muted-foreground">Unique students</p>
           </CardContent>
         </Card>
       </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Class Directory</CardTitle>
          <CardDescription>Search and filter classes by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search classes by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                <SelectItem value="1">Grade 1</SelectItem>
                <SelectItem value="2">Grade 2</SelectItem>
                <SelectItem value="3">Grade 3</SelectItem>
                <SelectItem value="4">Grade 4</SelectItem>
                <SelectItem value="5">Grade 5</SelectItem>
                <SelectItem value="6">Grade 6</SelectItem>
                <SelectItem value="7">Grade 7</SelectItem>
                <SelectItem value="8">Grade 8</SelectItem>
                <SelectItem value="9">Grade 9</SelectItem>
                <SelectItem value="10">Grade 10</SelectItem>
                <SelectItem value="11">Grade 11</SelectItem>
                <SelectItem value="12">Grade 12</SelectItem>
              </SelectContent>
            </Select>

            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Schools" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
                {classes.map((cls) => cls.school).filter((school, index, self) => 
                  self.indexOf(school) === index
                ).map((school) => (
                  <SelectItem key={school} value={school}>
                    {school}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Classes Table */}
      <Card>
        <CardContent className="p-0">
          {filteredClasses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Board</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{cls.code}</Badge>
                    </TableCell>
                    <TableCell>{getGradeBadge(cls.grade)}</TableCell>
                    <TableCell>{cls.school}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{cls.board}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openViewDialog(cls)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(cls)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Class
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              onSelect={(e) => e.preventDefault()}
                              className="text-red-600 hover:text-white hover:bg-red-600 focus:text-white focus:bg-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Class
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Class</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{cls.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(cls.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No classes found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
                {searchTerm || gradeFilter !== 'all' || schoolFilter !== 'all' 
                  ? 'No classes match your current search and filter criteria. Try adjusting your filters.'
                  : 'Create your first class to get started with class management.'
                }
              </p>
              {(!searchTerm && gradeFilter === 'all' && schoolFilter === 'all') && (
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Class
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Class Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Create New Class</DialogTitle>
            <DialogDescription>
              Add a new class or academic section to the system. Fill in the required information below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Class Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Class 10A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Class Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., C10A-001"
                maxLength={10}
              />
            </div>
                         <div className="space-y-2">
               <Label htmlFor="grade">Grade *</Label>
               <Select
                 value={formData.grade}
                 onValueChange={(value) => setFormData({ ...formData, grade: value })}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Select grade" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="1">Grade 1</SelectItem>
                   <SelectItem value="2">Grade 2</SelectItem>
                   <SelectItem value="3">Grade 3</SelectItem>
                   <SelectItem value="4">Grade 4</SelectItem>
                   <SelectItem value="5">Grade 5</SelectItem>
                   <SelectItem value="6">Grade 6</SelectItem>
                   <SelectItem value="7">Grade 7</SelectItem>
                   <SelectItem value="8">Grade 8</SelectItem>
                   <SelectItem value="9">Grade 9</SelectItem>
                   <SelectItem value="10">Grade 10</SelectItem>
                   <SelectItem value="11">Grade 11</SelectItem>
                   <SelectItem value="12">Grade 12</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label htmlFor="board">Board *</Label>
               <Select
                 value={formData.board_id}
                 onValueChange={handleBoardChange}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Select board" />
                 </SelectTrigger>
                 <SelectContent>
                   {boards.map((board) => (
                     <SelectItem key={board.id} value={board.id}>
                       {board.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label htmlFor="school">School *</Label>
               <Select
                 value={formData.school_id}
                 onValueChange={(value) => setFormData({ ...formData, school_id: value })}
                 disabled={!formData.board_id}
               >
                 <SelectTrigger className={!formData.board_id ? "opacity-50 cursor-not-allowed" : ""}>
                   <SelectValue placeholder={!formData.board_id ? "Select a board first" : "Select school"} />
                 </SelectTrigger>
                 <SelectContent>
                   {schools.length > 0 ? (
                     schools.map((school) => (
                       <SelectItem key={school.id} value={school.id}>
                         {school.name}
                       </SelectItem>
                     ))
                   ) : (
                     <SelectItem value="" disabled>
                       {formData.board_id ? "No schools found for this board" : "Select a board first"}
                     </SelectItem>
                   )}
                 </SelectContent>
               </Select>
             </div>

            
                                        <div className="space-y-2 md:col-span-2">
                 <Label htmlFor="description">Description</Label>
                 <Textarea
                   id="description"
                   value={formData.description}
                   onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                   placeholder="Class description and focus areas..."
                   rows={3}
                 />
               </div>

             {/* Access Management Section */}
             <div className="space-y-4 md:col-span-2">
               <div className="space-y-2">
                 <Label>Manage Teachers</Label>
                 <div className="space-y-2">
                   <MultiSelect
                     options={teachers.map(teacher => ({
  value: teacher.id,
  label: teacher.name,
  subLabel: teacher.email,
  imageUrl: teacher.avatar_url
}))}
                     onValueChange={(selectedIds) => handleMembersChange('teachers', selectedIds)}
                     value={formData.teachers}
                     placeholder="Search and select teachers..."
                     className="min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                   />
                 </div>
                 <p className="text-xs text-muted-foreground">Teachers can edit course content, manage students, and view analytics</p>
               </div>

               <div className="space-y-2">
                 <Label>Manage Students</Label>
                 <div className="space-y-2">
                   <MultiSelect
                     options={students.map(student => ({
  value: student.id,
  label: student.name,
  subLabel: student.email,
  imageUrl: student.avatar_url
}))}
                     onValueChange={(selectedIds) => handleMembersChange('students', selectedIds)}
                     value={formData.students}
                     placeholder="Search and select students..."
                     className="min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                   />
                 </div>
                 <p className="text-xs text-muted-foreground">Students can access course content, submit assignments, and track progress</p>
               </div>
             </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700">
              Create Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>
              Update the information for {editingClass?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Class Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Class 10A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Class Code *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., C10A-001"
                maxLength={10}
              />
            </div>
                         <div className="space-y-2">
               <Label htmlFor="edit-grade">Grade *</Label>
               <Select
                 value={formData.grade}
                 onValueChange={(value) => setFormData({ ...formData, grade: value })}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Select grade" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="1">Grade 1</SelectItem>
                   <SelectItem value="2">Grade 2</SelectItem>
                   <SelectItem value="3">Grade 3</SelectItem>
                   <SelectItem value="4">Grade 4</SelectItem>
                   <SelectItem value="5">Grade 5</SelectItem>
                   <SelectItem value="6">Grade 6</SelectItem>
                   <SelectItem value="7">Grade 7</SelectItem>
                   <SelectItem value="8">Grade 8</SelectItem>
                   <SelectItem value="9">Grade 9</SelectItem>
                   <SelectItem value="10">Grade 10</SelectItem>
                   <SelectItem value="11">Grade 11</SelectItem>
                   <SelectItem value="12">Grade 12</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label htmlFor="edit-board">Board *</Label>
               <Select
                 value={formData.board_id}
                 onValueChange={handleBoardChange}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Select board" />
                 </SelectTrigger>
                 <SelectContent>
                   {boards.map((board) => (
                     <SelectItem key={board.id} value={board.id}>
                       {board.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label htmlFor="edit-school">School *</Label>
               <Select
                 value={formData.school_id}
                 onValueChange={(value) => setFormData({ ...formData, school_id: value })}
                 disabled={!formData.board_id}
               >
                 <SelectTrigger className={!formData.board_id ? "opacity-50 cursor-not-allowed" : ""}>
                   <SelectValue placeholder={!formData.board_id ? "Select a board first" : "Select school"} />
                 </SelectTrigger>
                 <SelectContent>
                   {schools.length > 0 ? (
                     schools.map((school) => (
                       <SelectItem key={school.id} value={school.id}>
                         {school.name}
                       </SelectItem>
                     ))
                   ) : (
                     <SelectItem value="" disabled>
                       {formData.board_id ? "No schools found for this board" : "Select a board first"}
                     </SelectItem>
                   )}
                 </SelectContent>
               </Select>
             </div>

            
                         <div className="space-y-2 md:col-span-2">
               <Label htmlFor="edit-description">Description</Label>
               <Textarea
                 id="edit-description"
                 value={formData.description}
                 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                 placeholder="Class description and focus areas..."
                 rows={3}
               />
             </div>

             {/* Access Management Section */}
             <div className="space-y-4 md:col-span-2">
               <div className="space-y-2">
                 <Label>Manage Teachers</Label>
                 <div className="space-y-2">
                   <MultiSelect
                     options={teachers.map(teacher => ({
  value: teacher.id,
  label: teacher.name,
  subLabel: teacher.email,
  imageUrl: teacher.avatar_url
}))}
                     onValueChange={(selectedIds) => handleMembersChange('teachers', selectedIds)}
                     value={formData.teachers}
                     placeholder="Search and select teachers..."
                     className="min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                   />
                 </div>
                 <p className="text-xs text-muted-foreground">Teachers can edit course content, manage students, and view analytics</p>
               </div>

               <div className="space-y-2">
                 <Label>Manage Students</Label>
                 <div className="space-y-2">
                   <MultiSelect
                     options={students.map(student => ({
  value: student.id,
  label: student.name,
  subLabel: student.email,
  imageUrl: student.avatar_url
}))}
                     onValueChange={(selectedIds) => handleMembersChange('students', selectedIds)}
                     value={formData.students}
                     placeholder="Search and select students..."
                     className="min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                   />
                 </div>
                 <p className="text-xs text-muted-foreground">Students can access course content, submit assignments, and track progress</p>
               </div>
             </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">
              Update Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Class Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Class Details</DialogTitle>
            <DialogDescription>
              View detailed information about {viewingClass?.name}.
            </DialogDescription>
          </DialogHeader>
          {viewingClass && (
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Class Name</Label>
                    <p className="text-lg font-semibold">{viewingClass.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Class Code</Label>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-sm">{viewingClass.code}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Grade</Label>
                    <div className="mt-1">{getGradeBadge(viewingClass.grade)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">School</Label>
                    <p className="text-lg">{viewingClass.school}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Board</Label>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-sm">{viewingClass.board}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="text-sm text-muted-foreground">{new Date(viewingClass.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-sm text-muted-foreground">{new Date(viewingClass.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {viewingClass.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">{viewingClass.description}</p>
                </div>
              )}

              {/* Members Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Teachers ({viewingClass.teachers.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {viewingClass.teachers.length > 0 ? (
                      viewingClass.teachers.map((teacher, index) => (
                        <Badge key={index} variant="default" className="bg-green-600 text-white">
                          {teacher.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No teachers assigned</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Students ({viewingClass.students.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {viewingClass.students.length > 0 ? (
                      viewingClass.students.map((student, index) => (
                        <Badge key={index} variant="outline" className="border-blue-300 text-blue-700">
                          {student.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No students enrolled</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {viewingClass && (
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                openEditDialog(viewingClass);
              }} className="bg-blue-600 hover:bg-blue-700">
                Edit Class
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassManagement;
