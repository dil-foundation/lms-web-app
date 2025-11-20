import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building2, Users, TrendingUp, MapPin } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  code: string;
  schoolsCount: number;
  studentsCount: number;
  teachersCount: number;
  averagePerformance: number;
  status: 'active' | 'inactive';
  location?: string;
}

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

export const ProjectCard = ({ project, onClick }: ProjectCardProps) => {
  return (
    <Card 
      className={`hover:shadow-lg transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-primary' : ''}`}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{project.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">Code: {project.code}</p>
            </div>
          </div>
          <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
            {project.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{project.schoolsCount}</p>
              <p className="text-xs text-muted-foreground">Schools</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{project.studentsCount}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{project.averagePerformance}%</p>
              <p className="text-xs text-muted-foreground">Performance</p>
            </div>
          </div>
        </div>

        {project.location && (
          <div className="flex items-center gap-2 text-sm pt-2 border-t">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{project.location}</span>
          </div>
        )}

        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Performance</span>
            <span className="font-semibold">{project.averagePerformance}%</span>
          </div>
          <Progress value={project.averagePerformance} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
};

