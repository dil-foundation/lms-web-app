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
import { Search, Plus, BookOpen, Edit, Trash2, Eye, RefreshCw, Users, MoreHorizontal, MapPin, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

interface Class {
  id: string;
  name: string;
  code: string;
  grade: string;
  school: string;
  board: string;
  description: string;
  teachers: string[];
  students: string[];
  created_at: string;
  updated_at: string;
}

// Mock data for teachers and students
const MOCK_TEACHERS_FOR_SELECT = [
  { value: 'Ms. Sarah Ahmed', label: 'Ms. Sarah Ahmed' },
  { value: 'Mr. Ali Hassan', label: 'Mr. Ali Hassan' },
  { value: 'Dr. Fatima Khan', label: 'Dr. Fatima Khan' },
  { value: 'Mr. Usman Khan', label: 'Mr. Usman Khan' },
];

const MOCK_STUDENTS_FOR_SELECT = [
  { value: 'Ahmed Khan', label: 'Ahmed Khan' },
  { value: 'Fatima Ali', label: 'Fatima Ali' },
  { value: 'Omar Hassan', label: 'Omar Hassan' },
  { value: 'Zara Ahmed', label: 'Zara Ahmed' },
  { value: 'Bilal Khan', label: 'Bilal Khan' },
  { value: 'Hassan Ali', label: 'Hassan Ali' },
  { value: 'Aisha Khan', label: 'Aisha Khan' },
  { value: 'Usman Ahmed', label: 'Usman Ahmed' },
];

const ClassManagement: React.FC = () => {

  
  const [classes, setClasses] = useState<Class[]>([
    {
      id: '1',
      name: 'Class 10A',
      code: 'C10A-001',
      grade: '10',
      school: 'Beaconhouse School System',
      board: 'CBSE',
      description: 'Advanced Mathematics and Science focused class',
      teachers: ['Ms. Sarah Ahmed', 'Mr. Ali Hassan'],
      students: ['Ahmed Khan', 'Fatima Ali', 'Omar Hassan'],
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '2',
      name: 'Class 9B',
      code: 'C9B-001',
      grade: '9',
      school: 'Lahore Grammar School',
      board: 'MSBSHSE',
      description: 'Literature and Humanities focused class',
      teachers: ['Mr. Ali Hassan'],
      students: ['Zara Ahmed', 'Bilal Khan'],
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '3',
      name: 'Class 11C',
      code: 'C11C-001',
      grade: '11',
      school: 'Karachi Public School',
      board: 'IB',
      description: 'International Baccalaureate Diploma Programme',
      teachers: ['Dr. Fatima Khan'],
      students: ['Hassan Ali', 'Aisha Khan', 'Usman Ahmed'],
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [viewingClass, setViewingClass] = useState<Class | null>(null);
  
  // Search states for teachers and students
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [filteredTeachers, setFilteredTeachers] = useState(MOCK_TEACHERS_FOR_SELECT);
  const [filteredStudents, setFilteredStudents] = useState(MOCK_STUDENTS_FOR_SELECT);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    grade: '',
    school: '',
    board: '',
    description: '',
    teachers: [] as string[],
    students: [] as string[]
  });

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = gradeFilter === 'all' || !gradeFilter || cls.grade === gradeFilter;
    const matchesSchool = schoolFilter === 'all' || !schoolFilter || cls.school === schoolFilter;
    return matchesSearch && matchesGrade && matchesSchool;
  });

  const handleCreate = () => {
    if (!formData.name || !formData.code || !formData.grade || !formData.school || !formData.board) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newClass: Class = {
      id: Date.now().toString(),
      name: formData.name,
      code: formData.code.toUpperCase(),
      grade: formData.grade,
      school: formData.school,
      board: formData.board,
      description: formData.description,
      teachers: formData.teachers,
      students: formData.students,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0]
    };

    setClasses([...classes, newClass]);
    setIsCreateDialogOpen(false);
    resetForm();
    toast.success('Class created successfully');
  };

  const handleEdit = () => {
    if (!editingClass || !formData.name || !formData.code || !formData.grade || !formData.school || !formData.board) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedClasses = classes.map(cls =>
      cls.id === editingClass.id
        ? {
            ...cls,
            name: formData.name,
            code: formData.code.toUpperCase(),
            grade: formData.grade,
            school: formData.school,
            board: formData.board,
            description: formData.description,
            teachers: formData.teachers,
            students: formData.students,
            updated_at: new Date().toISOString().split('T')[0]
          }
        : cls
    );

    setClasses(updatedClasses);
    setIsEditDialogOpen(false);
    setEditingClass(null);
    resetForm();
    toast.success('Class updated successfully');
  };

  const handleDelete = (classId: string) => {
    setClasses(classes.filter(cls => cls.id !== classId));
    toast.success('Class deleted successfully');
  };

  const openEditDialog = (cls: Class) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      code: cls.code,
      grade: cls.grade,
      school: cls.school,
      board: cls.board,
      description: cls.description,
      teachers: cls.teachers,
      students: cls.students
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (cls: Class) => {
    setViewingClass(cls);
    setIsViewDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      grade: '',
      school: '',
      board: '',
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
             <div className="text-2xl font-bold">{classes.length}</div>
             <p className="text-xs text-muted-foreground">All classes in the system</p>
           </CardContent>
         </Card>

         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
             <GraduationCap className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{new Set(classes.map(c => c.school)).size}</div>
             <p className="text-xs text-muted-foreground">Unique schools</p>
           </CardContent>
         </Card>

         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Boards</CardTitle>
             <Users className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{new Set(classes.map(c => c.board)).size}</div>
             <p className="text-xs text-muted-foreground">Unique boards</p>
           </CardContent>
         </Card>

         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
             <Users className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{new Set(classes.flatMap(c => c.teachers)).size}</div>
             <p className="text-xs text-muted-foreground">Unique teachers</p>
           </CardContent>
         </Card>

         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Students</CardTitle>
             <Users className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{new Set(classes.flatMap(c => c.students)).size}</div>
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
                <SelectItem value="Beaconhouse School System">Beaconhouse School System</SelectItem>
                <SelectItem value="Lahore Grammar School">Lahore Grammar School</SelectItem>
                <SelectItem value="Karachi Public School">Karachi Public School</SelectItem>
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
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
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
        </CardContent>
      </Card>

      {/* Create Class Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
            <DialogDescription>
              Add a new class or academic section to the system. Fill in the required information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
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
                 value={formData.board}
                 onValueChange={(value) => setFormData({ ...formData, board: value })}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Select board" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="CBSE">CBSE</SelectItem>
                   <SelectItem value="MSBSHSE">MSBSHSE</SelectItem>
                   <SelectItem value="IB">IB</SelectItem>
                   <SelectItem value="Cambridge">Cambridge</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label htmlFor="school">School *</Label>
               <Select
                 value={formData.school}
                 onValueChange={(value) => setFormData({ ...formData, school: value })}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Select school" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="Beaconhouse School System">Beaconhouse School System</SelectItem>
                   <SelectItem value="Lahore Grammar School">Lahore Grammar School</SelectItem>
                   <SelectItem value="Karachi Public School">Karachi Public School</SelectItem>
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
                   <div className="text-xs text-gray-500">
                     Current teachers: {formData.teachers.length > 0 ? formData.teachers.join(', ') : 'None selected'}
                   </div>
                   <div className="space-y-2">
                     <div className="relative">
                       <Input
                         placeholder="Search teachers..."
                         value={teacherSearchTerm}
                         onChange={(e) => {
                           const searchTerm = e.target.value;
                           setTeacherSearchTerm(searchTerm);
                           const filtered = MOCK_TEACHERS_FOR_SELECT.filter(teacher =>
                             teacher.label.toLowerCase().includes(searchTerm.toLowerCase())
                           );
                           setFilteredTeachers(filtered);
                         }}
                         className="pr-8"
                       />
                       <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                     </div>
                     
                     {/* Filtered teachers list */}
                     {teacherSearchTerm && filteredTeachers.length > 0 && (
                       <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                         {filteredTeachers.map(teacher => (
                           <div
                             key={teacher.value}
                             className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                             onClick={() => {
                               if (!formData.teachers.includes(teacher.value)) {
                                 setFormData({
                                   ...formData,
                                   teachers: [...formData.teachers, teacher.value]
                                 });
                               }
                               setTeacherSearchTerm('');
                               setFilteredTeachers(MOCK_TEACHERS_FOR_SELECT);
                             }}
                           >
                             <span className="text-sm">{teacher.label}</span>
                             {formData.teachers.includes(teacher.value) && (
                               <Badge variant="secondary" className="text-xs">Added</Badge>
                             )}
                           </div>
                         ))}
                       </div>
                     )}
                     
                     {/* Show all available teachers when no search */}
                     {!teacherSearchTerm && (
                       <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                         {MOCK_TEACHERS_FOR_SELECT.map(teacher => (
                           <div
                             key={teacher.value}
                             className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                             onClick={() => {
                               if (!formData.teachers.includes(teacher.value)) {
                                 setFormData({
                                   ...formData,
                                   teachers: [...formData.teachers, teacher.value]
                                 });
                               }
                             }}
                           >
                             <span className="text-sm">{teacher.label}</span>
                             {formData.teachers.includes(teacher.value) && (
                               <Badge variant="secondary" className="text-xs">Added</Badge>
                             )}
                           </div>
                         ))}
                       </div>
                     )}
                     
                     {/* Display selected teachers as chips */}
                     {formData.teachers.length > 0 && (
                       <div className="flex flex-wrap gap-2">
                         {formData.teachers.map((teacher, index) => (
                           <Badge key={index} variant="default" className="bg-green-600">
                             {teacher}
                             <button
                               type="button"
                               onClick={() => setFormData({
                                 ...formData,
                                 teachers: formData.teachers.filter((_, i) => i !== index)
                               })}
                               className="ml-2 text-white hover:text-green-200"
                             >
                               ×
                             </button>
                           </Badge>
                         ))}
                       </div>
                     )}
                   </div>

                 </div>
                 <p className="text-xs text-muted-foreground">Teachers can edit course content, manage students, and view analytics</p>
               </div>

                              <div className="space-y-2">
                 <Label>Manage Students</Label>
                 <div className="space-y-2">
                   <div className="text-xs text-gray-500">
                     Current students: {formData.students.length > 0 ? formData.students.join(', ') : 'None selected'}
                   </div>
                   <div className="space-y-2">
                     <div className="relative">
                       <Input
                         placeholder="Search students..."
                         value={studentSearchTerm}
                         onChange={(e) => {
                           const searchTerm = e.target.value;
                           setStudentSearchTerm(searchTerm);
                           const filtered = MOCK_STUDENTS_FOR_SELECT.filter(student =>
                             student.label.toLowerCase().includes(searchTerm.toLowerCase())
                           );
                           setFilteredStudents(filtered);
                         }}
                         className="pr-8"
                       />
                       <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                     </div>
                     
                     {/* Filtered students list */}
                     {studentSearchTerm && filteredStudents.length > 0 && (
                       <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                         {filteredStudents.map(student => (
                           <div
                             key={student.value}
                             className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                             onClick={() => {
                               if (!formData.students.includes(student.value)) {
                                 setFormData({
                                   ...formData,
                                   students: [...formData.students, student.value]
                                 });
                               }
                               setStudentSearchTerm('');
                               setFilteredStudents(MOCK_STUDENTS_FOR_SELECT);
                             }}
                           >
                             <span className="text-sm">{student.label}</span>
                             {formData.students.includes(student.value) && (
                               <Badge variant="secondary" className="text-xs">Added</Badge>
                             )}
                           </div>
                         ))}
                       </div>
                     )}
                     
                     {/* Show all available students when no search */}
                     {!studentSearchTerm && (
                       <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                         {MOCK_STUDENTS_FOR_SELECT.map(student => (
                           <div
                             key={student.value}
                             className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                             onClick={() => {
                               if (!formData.students.includes(student.value)) {
                                 setFormData({
                                   ...formData,
                                   students: [...formData.students, student.value]
                                 });
                               }
                             }}
                           >
                             <span className="text-sm">{student.label}</span>
                             {formData.students.includes(student.value) && (
                               <Badge variant="secondary" className="text-xs">Added</Badge>
                             )}
                           </div>
                         ))}
                       </div>
                     )}
                     
                     {/* Display selected students as chips */}
                     {formData.students.length > 0 && (
                       <div className="flex flex-wrap gap-2">
                         {formData.students.map((student, index) => (
                           <Badge key={index} variant="outline" className="border-blue-300 text-blue-700">
                             {student}
                             <button
                               type="button"
                               onClick={() => setFormData({
                                 ...formData,
                                 students: formData.students.filter((_, i) => i !== index)
                               })}
                               className="ml-2 text-blue-600 hover:text-blue-800"
                             >
                               ×
                             </button>
                           </Badge>
                         ))}
                       </div>
                     )}
                   </div>

                 </div>
                 <p className="text-xs text-muted-foreground">Students can access course content, submit assignments, and track progress</p>
               </div>
             </div>
          </div>
          <DialogFooter>
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
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>
              Update the information for {editingClass?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
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
                 value={formData.board}
                 onValueChange={(value) => setFormData({ ...formData, board: value })}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Select board" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="CBSE">CBSE</SelectItem>
                   <SelectItem value="MSBSHSE">MSBSHSE</SelectItem>
                   <SelectItem value="IB">IB</SelectItem>
                   <SelectItem value="Cambridge">Cambridge</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label htmlFor="edit-school">School *</Label>
               <Select
                 value={formData.school}
                 onValueChange={(value) => setFormData({ ...formData, school: value })}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Select school" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="Beaconhouse School System">Beaconhouse School System</SelectItem>
                   <SelectItem value="Lahore Grammar School">Lahore Grammar School</SelectItem>
                   <SelectItem value="Karachi Public School">Karachi Public School</SelectItem>
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
                   <div className="space-y-2">
                     <div className="relative">
                       <Input
                         placeholder="Search teachers..."
                         value={teacherSearchTerm}
                         onChange={(e) => {
                           const searchTerm = e.target.value;
                           setTeacherSearchTerm(searchTerm);
                           const filtered = MOCK_TEACHERS_FOR_SELECT.filter(teacher =>
                             teacher.label.toLowerCase().includes(searchTerm.toLowerCase())
                           );
                           setFilteredTeachers(filtered);
                         }}
                         className="pr-8"
                       />
                       <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                     </div>
                     
                     {/* Filtered teachers list */}
                     {teacherSearchTerm && filteredTeachers.length > 0 && (
                       <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                         {filteredTeachers.map(teacher => (
                           <div
                             key={teacher.value}
                             className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                             onClick={() => {
                               if (!formData.teachers.includes(teacher.value)) {
                                 setFormData({
                                   ...formData,
                                   teachers: [...formData.teachers, teacher.value]
                                 });
                               }
                               setTeacherSearchTerm('');
                               setFilteredTeachers(MOCK_TEACHERS_FOR_SELECT);
                             }}
                           >
                             <span className="text-sm">{teacher.label}</span>
                             {formData.teachers.includes(teacher.value) && (
                               <Badge variant="secondary" className="text-xs">Added</Badge>
                             )}
                           </div>
                         ))}
                       </div>
                     )}
                     
                     {/* Show all available teachers when no search */}
                     {!teacherSearchTerm && (
                       <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                         {MOCK_TEACHERS_FOR_SELECT.map(teacher => (
                           <div
                             key={teacher.value}
                             className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                             onClick={() => {
                               if (!formData.teachers.includes(teacher.value)) {
                                 setFormData({
                                   ...formData,
                                   teachers: [...formData.teachers, teacher.value]
                                 });
                               }
                             }}
                           >
                             <span className="text-sm">{teacher.label}</span>
                             {formData.teachers.includes(teacher.value) && (
                               <Badge variant="secondary" className="text-xs">Added</Badge>
                             )}
                           </div>
                         ))}
                       </div>
                     )}
                     
                     {/* Display selected teachers as chips */}
                     {formData.teachers.length > 0 && (
                       <div className="flex flex-wrap gap-2">
                         {formData.teachers.map((teacher, index) => (
                           <Badge key={index} variant="default" className="bg-green-600">
                             {teacher}
                             <button
                               type="button"
                               onClick={() => setFormData({
                                 ...formData,
                                 teachers: formData.teachers.filter((_, i) => i !== index)
                               })}
                               className="ml-2 text-white hover:text-green-200"
                             >
                               ×
                             </button>
                           </Badge>
                         ))}
                       </div>
                     )}
                   </div>
                   <p className="text-xs text-muted-foreground">Teachers can edit course content, manage students, and view analytics</p>
                 </div>
               </div>

               <div className="space-y-2">
                 <Label>Manage Students</Label>
                 <div className="space-y-2">
                   <div className="space-y-2">
                     <div className="relative">
                       <Input
                         placeholder="Search students..."
                         value={studentSearchTerm}
                         onChange={(e) => {
                           const searchTerm = e.target.value;
                           setStudentSearchTerm(searchTerm);
                           const filtered = MOCK_STUDENTS_FOR_SELECT.filter(student =>
                             student.label.toLowerCase().includes(searchTerm.toLowerCase())
                           );
                           setFilteredStudents(filtered);
                         }}
                         className="pr-8"
                       />
                       <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                     </div>
                     
                     {/* Filtered students list */}
                     {studentSearchTerm && filteredStudents.length > 0 && (
                       <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                         {filteredStudents.map(student => (
                           <div
                             key={student.value}
                             className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                             onClick={() => {
                               if (!formData.students.includes(student.value)) {
                                 setFormData({
                                   ...formData,
                                   students: [...formData.students, student.value]
                                 });
                               }
                               setStudentSearchTerm('');
                               setFilteredStudents(MOCK_STUDENTS_FOR_SELECT);
                             }}
                           >
                             <span className="text-sm">{student.label}</span>
                             {formData.students.includes(student.value) && (
                               <Badge variant="secondary" className="text-xs">Added</Badge>
                             )}
                           </div>
                         ))}
                       </div>
                     )}
                     
                     {/* Show all available students when no search */}
                     {!studentSearchTerm && (
                       <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                         {MOCK_STUDENTS_FOR_SELECT.map(student => (
                           <div
                             key={student.value}
                             className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                             onClick={() => {
                               if (!formData.students.includes(student.value)) {
                                 setFormData({
                                   ...formData,
                                   students: [...formData.students, student.value]
                                 });
                               }
                             }}
                           >
                             <span className="text-sm">{student.label}</span>
                             {formData.students.includes(student.value) && (
                               <Badge variant="secondary" className="text-xs">Added</Badge>
                             )}
                           </div>
                         ))}
                       </div>
                     )}
                     
                     {/* Display selected students as chips */}
                     {formData.students.length > 0 && (
                       <div className="flex flex-wrap gap-2">
                         {formData.students.map((student, index) => (
                           <Badge key={index} variant="outline" className="border-blue-300 text-blue-700">
                             {student}
                             <button
                               type="button"
                               onClick={() => setFormData({
                                 ...formData,
                                 students: formData.students.filter((_, i) => i !== index)
                               })}
                               className="ml-2 text-blue-600 hover:text-blue-800"
                             >
                               ×
                             </button>
                           </Badge>
                         ))}
                       </div>
                     )}
                   </div>
                   <div className="text-xs text-gray-500 mt-1">
                     Available options: {MOCK_STUDENTS_FOR_SELECT.map(s => s.label).join(', ')}
                   </div>
                   <p className="text-xs text-muted-foreground">Students can access course content, submit assignments, and track progress</p>
                 </div>
               </div>
             </div>
          </div>
          <DialogFooter>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Class Name</Label>
                    <p className="text-lg font-semibold">{viewingClass.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Class Code</Label>
                    <Badge variant="outline" className="text-lg">{viewingClass.code}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Grade</Label>
                    <div className="mt-1">{getGradeBadge(viewingClass.grade)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">School</Label>
                    <p className="text-lg">{viewingClass.school}</p>
                  </div>
                                     <div>
                     <Label className="text-sm font-medium text-muted-foreground">Board</Label>
                     <Badge variant="outline" className="text-lg">{viewingClass.board}</Badge>
                   </div>
                   
                   <div>
                     <Label className="text-sm font-medium text-muted-foreground">Teachers</Label>
                     <div className="flex flex-wrap gap-2 mt-1">
                       {viewingClass.teachers.map((teacher, index) => (
                         <Badge key={index} variant="default" className="bg-green-600">
                           {teacher}
                         </Badge>
                       ))}
                     </div>
                   </div>
                   
                   <div>
                     <Label className="text-sm font-medium text-muted-foreground">Students</Label>
                     <div className="flex flex-wrap gap-2 mt-1">
                       {viewingClass.students.map((student, index) => (
                         <Badge key={index} variant="outline" className="border-blue-300 text-blue-700">
                           {student}
                         </Badge>
                       ))}
                   </div>
                 </div>
                   
                   <div>
                     <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                     <p className="text-lg">{viewingClass.created_at}</p>
                   </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-lg">{viewingClass.updated_at}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                    <p className="text-lg">{viewingClass.description}</p>
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
