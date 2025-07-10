import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Search,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const assignmentDetails = {
  title: 'QUIZTESTING',
  course: 'DIL-SE',
  type: 'quiz',
  status: 'active',
};

const statCards = [
  {
    title: 'Total Students',
    value: '2',
    icon: Users,
  },
  {
    title: 'Submitted',
    value: '0',
    icon: FileText,
  },
  {
    title: 'Pending Grading',
    value: '0',
    icon: Clock,
  },
  {
    title: 'Average Score',
    value: '0.0%',
    icon: CheckCircle2,
  },
];

const submissions = [
  {
    id: 1,
    studentName: 'Student1',
    studentInitials: 'S',
    status: 'not submitted',
    score: null,
  },
  {
    id: 2,
    studentName: 'Student2',
    studentInitials: 'S',
    status: 'not submitted',
    score: null,
  },
];

export const AssignmentSubmissions = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <Link
        to="/dashboard/grade-assignments"
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assignments
      </Link>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {assignmentDetails.title}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">
              Grade submissions and provide feedback • {assignmentDetails.course}
            </p>
            <Badge variant="outline">{assignmentDetails.type}</Badge>
            <Badge>{assignmentDetails.status}</Badge>
          </div>
        </div>
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
                placeholder="Search students..."
                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
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
                  <SelectValue placeholder="Name" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">
                Student Submissions ({submissions.length})
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Review and grade student submissions for this assignment
            </p>
            <div className="space-y-4">
              {submissions.map((sub) => (
                <Card key={sub.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={`https://api.dicebear.com/6.x/initials/svg?seed=${sub.studentName}`}
                        />
                        <AvatarFallback>{sub.studentInitials}</AvatarFallback>
                      </Avatar>
                      <p className="font-semibold">{sub.studentName}</p>
                    </div>
                    <div className="text-right">
                        <Badge variant="warning" className="capitalize">{sub.status}</Badge>
                        <p className="text-sm text-muted-foreground mt-1">{sub.score ?? '%'}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 