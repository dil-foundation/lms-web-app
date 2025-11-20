import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Users, GraduationCap, Phone, Mail } from 'lucide-react';

interface SchoolInfo {
  id: string;
  name: string;
  code: string;
  schoolType: string;
  address?: string;
  phone?: string;
  email?: string;
  principalName?: string;
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  status: 'active' | 'inactive' | 'suspended';
}

interface SchoolInfoCardProps {
  school: SchoolInfo;
}

export const SchoolInfoCard = ({ school }: SchoolInfoCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{school.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Code: {school.code}</p>
            </div>
          </div>
          <Badge className={getStatusColor(school.status)}>
            {school.status.charAt(0).toUpperCase() + school.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{school.totalStudents}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{school.totalTeachers}</p>
              <p className="text-xs text-muted-foreground">Teachers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{school.totalClasses}</p>
              <p className="text-xs text-muted-foreground">Classes</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t">
          {school.schoolType && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{school.schoolType}</span>
            </div>
          )}
          {school.principalName && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Principal:</span>
              <span className="font-medium">{school.principalName}</span>
            </div>
          )}
          {school.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">{school.address}</span>
            </div>
          )}
          {school.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{school.phone}</span>
            </div>
          )}
          {school.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{school.email}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

