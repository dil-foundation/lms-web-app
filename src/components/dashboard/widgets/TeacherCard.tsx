import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, Users, TrendingUp, Mail } from 'lucide-react';

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  classesCount: number;
  studentsCount: number;
  averagePerformance?: number;
  status: 'active' | 'inactive';
}

interface TeacherCardProps {
  teacher: Teacher;
  onClick?: () => void;
}

export const TeacherCard = ({ teacher, onClick }: TeacherCardProps) => {
  const initials = `${teacher.firstName.charAt(0)}${teacher.lastName.charAt(0)}`.toUpperCase();
  const fullName = `${teacher.firstName} ${teacher.lastName}`;

  return (
    <Card 
      className={`hover:shadow-lg transition-all duration-300 cursor-pointer ${onClick ? 'hover:border-primary' : ''}`}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{fullName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{teacher.email}</p>
              </div>
            </div>
          </div>
          <Badge variant={teacher.status === 'active' ? 'default' : 'secondary'}>
            {teacher.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{teacher.classesCount}</p>
              <p className="text-xs text-muted-foreground">Classes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{teacher.studentsCount}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </div>
          </div>
        </div>

        {teacher.averagePerformance !== undefined && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Avg Performance</span>
              <span className="font-semibold flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {teacher.averagePerformance}%
              </span>
            </div>
            <Progress value={teacher.averagePerformance} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

