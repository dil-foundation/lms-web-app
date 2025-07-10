import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckSquare,
  BookOpen,
  Clock,
  TrendingUp,
  Search,
  MoreHorizontal,
  Plus,
  Calendar as CalendarIcon,
  FileText,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const statCards = [
  {
    title: 'Total Assignments',
    value: '2',
    icon: CheckSquare,
  },
  {
    title: 'Active',
    value: '2',
    icon: BookOpen,
  },
  {
    title: 'Pending Grading',
    value: '0',
    icon: Clock,
  },
  {
    title: 'Avg. Score',
    value: '0.0%',
    icon: TrendingUp,
  },
];

const assignments = [
  {
    id: 1,
    title: 'QUIZTESTING',
    course: 'DIL-SE',
    dueDate: '6/22/2025',
    submissions: 0,
    graded: 0,
    avgScore: '0.0%',
    type: 'quiz',
    status: 'active',
    overdue: true,
  },
  {
    id: 2,
    title: 'NASLEO',
    course: 'Mathematics-SOW (2025-26)',
    dueDate: '6/23/2025',
    submissions: 0,
    graded: 0,
    avgScore: '0.0%',
    type: 'quiz',
    status: 'active',
    overdue: true,
  },
];

const CreateAssignmentDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [date, setDate] = useState<Date>();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create New Assignments</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Create a new quiz, assignment, or exam for your students
          </p>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" placeholder="Enter assignment title..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type *</Label>
              <Select>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="exam">Exam</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Project or homework assignment with file submission capability</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="course">Course *</Label>
                <Select>
                  <SelectTrigger id="course">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dil-se">DIL-SE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="due-date">Due Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'justify-start text-left font-normal',
                        !date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Provide a detailed description of the assignment..." />
            </div>
          </div>
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Assignment Settings</h3>
            <div className="grid gap-2">
                <Label htmlFor="score">Maximum Score</Label>
                <Input id="score" defaultValue="100" />
            </div>
             <div className="grid gap-2">
                <Label>Status</Label>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary">Draft</Badge>
                    <p className="text-sm text-muted-foreground">Assignment will be saved as draft</p>
                </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="instructions">Instructions for Students</Label>
              <Textarea
                id="instructions"
                placeholder="Provide detailed instructions for completing this assignment..."
                className="min-h-[200px]"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button>Create Assignment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const GradeAssignments = () => {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Grade Assignments</h1>
          <p className="text-muted-foreground">
            Manage quizzes, assignments, and exams for your courses
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Assignment
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 md:grow-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search assignments..."
                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Select>
                <SelectTrigger className="w-full sm:w-auto">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-full sm:w-auto">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-full sm:w-auto">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-full sm:w-auto">
                  <SelectValue placeholder="Due Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Due Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Assignments ({assignments.length})</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Click on an assignment to view and grade student submissions
            </p>
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <Link to={`/dashboard/grade-assignments/${assignment.id}`} key={assignment.id} className="block">
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="bg-primary/10 text-primary p-3 rounded-lg">
                        <CheckSquare className="h-6 w-6" />
                      </div>
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 items-center">
                        <div className="col-span-2 md:col-span-2">
                          <p className="font-semibold text-base">{assignment.title}</p>
                          <p className="text-sm text-muted-foreground">{assignment.course}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {assignment.overdue && <Badge variant="destructive">Overdue</Badge>}
                          <p className="mt-1">Due: {assignment.dueDate}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>{assignment.submissions} submissions</p>
                          <p>{assignment.graded} graded</p>
                        </div>
                        <div className="text-sm text-center">
                            <p className="font-semibold text-base">{assignment.avgScore}</p>
                            <p className="text-muted-foreground">Average</p>
                        </div>
                        <div className="flex items-center gap-2 justify-self-end">
                            <Badge variant="outline">{assignment.type}</Badge>
                            <Badge>{assignment.status}</Badge>
                            <Button variant="ghost" size="icon" onClick={(e) => e.preventDefault()}>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      <CreateAssignmentDialog open={isCreateModalOpen} onOpenChange={setCreateModalOpen} />
    </div>
  );
}; 