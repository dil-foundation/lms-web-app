import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Video, 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  User, 
  Edit, 
  Trash2, 
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ContentLoader } from '@/components/ContentLoader';

interface TeacherMeetingsProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    teacher_id?: string;
  };
}

interface ZoomMeeting {
  id: string;
  title: string;
  description?: string;
  meeting_type: '1-on-1' | 'class';
  scheduled_time: string;
  duration: number;
  student_id?: string;
  student_name?: string;
  course_id?: string;
  course_title?: string;
  zoom_meeting_id?: string;
  zoom_join_url?: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  created_at: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Course {
  id: string;
  title: string;
}

const mockMeetings: ZoomMeeting[] = [
  {
    id: '1',
    title: 'Math Tutoring Session',
    description: 'One-on-one algebra help',
    meeting_type: '1-on-1',
    scheduled_time: '2024-01-20T14:00:00Z',
    duration: 60,
    student_id: 'student1',
    student_name: 'John Smith',
    zoom_meeting_id: '123456789',
    zoom_join_url: 'https://zoom.us/j/123456789',
    status: 'scheduled',
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    title: 'Physics Class - Chapter 5',
    description: 'Quantum mechanics introduction',
    meeting_type: 'class',
    scheduled_time: '2024-01-22T10:00:00Z',
    duration: 90,
    course_id: 'course1',
    course_title: 'Advanced Physics',
    zoom_meeting_id: '987654321',
    zoom_join_url: 'https://zoom.us/j/987654321',
    status: 'scheduled',
    created_at: '2024-01-15T11:00:00Z'
  }
];

const mockStudents: Student[] = [
  { id: 'student1', first_name: 'John', last_name: 'Smith', email: 'john@example.com' },
  { id: 'student2', first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' },
  { id: 'student3', first_name: 'Mike', last_name: 'Johnson', email: 'mike@example.com' }
];

const mockCourses: Course[] = [
  { id: 'course1', title: 'Advanced Physics' },
  { id: 'course2', title: 'Calculus I' },
  { id: 'course3', title: 'Chemistry Basics' }
];

export const TeacherMeetings = ({ userProfile }: TeacherMeetingsProps) => {
  const [meetings, setMeetings] = useState<ZoomMeeting[]>(mockMeetings);
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [courses, setCourses] = useState<Course[]>(mockCourses);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meeting_type: '1-on-1' as '1-on-1' | 'class',
    scheduled_date: '',
    scheduled_time: '',
    duration: 60,
    student_id: '',
    course_id: ''
  });

  const handleCreateMeeting = async () => {
    try {
      setLoading(true);
      
      // Validate form
      if (!formData.title || !formData.scheduled_date || !formData.scheduled_time) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (formData.meeting_type === '1-on-1' && !formData.student_id) {
        toast.error('Please select a student for 1-on-1 meeting');
        return;
      }

      if (formData.meeting_type === 'class' && !formData.course_id) {
        toast.error('Please select a course for class meeting');
        return;
      }

      // Create meeting object
      const scheduledDateTime = `${formData.scheduled_date}T${formData.scheduled_time}:00Z`;
      const selectedStudent = students.find(s => s.id === formData.student_id);
      const selectedCourse = courses.find(c => c.id === formData.course_id);

      const newMeeting: ZoomMeeting = {
        id: Date.now().toString(),
        title: formData.title,
        description: formData.description,
        meeting_type: formData.meeting_type,
        scheduled_time: scheduledDateTime,
        duration: formData.duration,
        student_id: formData.meeting_type === '1-on-1' ? formData.student_id : undefined,
        student_name: selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : undefined,
        course_id: formData.meeting_type === 'class' ? formData.course_id : undefined,
        course_title: selectedCourse?.title,
        zoom_meeting_id: Math.random().toString().substring(2, 11),
        zoom_join_url: `https://zoom.us/j/${Math.random().toString().substring(2, 11)}`,
        status: 'scheduled',
        created_at: new Date().toISOString()
      };

      // Add to meetings list
      setMeetings(prev => [newMeeting, ...prev]);
      
      // Reset form and close modal
      setFormData({
        title: '',
        description: '',
        meeting_type: '1-on-1',
        scheduled_date: '',
        scheduled_time: '',
        duration: 60,
        student_id: '',
        course_id: ''
      });
      setIsCreateModalOpen(false);
      
      toast.success('Meeting scheduled successfully!');
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMeetingLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Meeting link copied to clipboard!');
  };

  const handleDeleteMeeting = (meetingId: string) => {
    setMeetings(prev => prev.filter(m => m.id !== meetingId));
    toast.success('Meeting cancelled successfully');
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const getStatusColor = (status: ZoomMeeting['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'active':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'completed':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled');
  const pastMeetings = meetings.filter(m => m.status === 'completed' || m.status === 'cancelled');

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Zoom Meetings
          </h1>
          <p className="text-muted-foreground">
            Schedule and manage virtual meetings with students
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Meeting
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-blue-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meetings.length}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{upcomingMeetings.length}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-purple-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">1-on-1 Sessions</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {meetings.filter(m => m.meeting_type === '1-on-1').length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-orange-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Class Meetings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {meetings.filter(m => m.meeting_type === 'class').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meetings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming Meetings</TabsTrigger>
          <TabsTrigger value="past">Past Meetings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingMeetings.length === 0 ? (
                <div className="text-center py-8">
                  <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No upcoming meetings scheduled</p>
                  <Button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-4"
                    variant="outline"
                  >
                    Schedule Your First Meeting
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Meeting</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Participant(s)</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingMeetings.map((meeting) => (
                      <TableRow key={meeting.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{meeting.title}</div>
                            {meeting.description && (
                              <div className="text-sm text-muted-foreground">{meeting.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={meeting.meeting_type === '1-on-1' ? 'secondary' : 'default'}>
                            {meeting.meeting_type === '1-on-1' ? '1-on-1' : 'Class'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {meeting.meeting_type === '1-on-1' 
                            ? meeting.student_name 
                            : meeting.course_title
                          }
                        </TableCell>
                        <TableCell>{formatDateTime(meeting.scheduled_time)}</TableCell>
                        <TableCell>{meeting.duration} min</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(meeting.status)}>
                            {meeting.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {meeting.zoom_join_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyMeetingLink(meeting.zoom_join_url!)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteMeeting(meeting.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="past" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Past Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              {pastMeetings.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No past meetings yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Meeting</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Participant(s)</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastMeetings.map((meeting) => (
                      <TableRow key={meeting.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{meeting.title}</div>
                            {meeting.description && (
                              <div className="text-sm text-muted-foreground">{meeting.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={meeting.meeting_type === '1-on-1' ? 'secondary' : 'default'}>
                            {meeting.meeting_type === '1-on-1' ? '1-on-1' : 'Class'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {meeting.meeting_type === '1-on-1' 
                            ? meeting.student_name 
                            : meeting.course_title
                          }
                        </TableCell>
                        <TableCell>{formatDateTime(meeting.scheduled_time)}</TableCell>
                        <TableCell>{meeting.duration} min</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(meeting.status)}>
                            {meeting.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Meeting Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule New Meeting</DialogTitle>
            <DialogDescription>
              Create a new Zoom meeting for your students
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Meeting Title *</Label>
              <Input
                id="title"
                placeholder="Enter meeting title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Meeting description (optional)"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="meeting_type">Meeting Type *</Label>
              <Select
                value={formData.meeting_type}
                onValueChange={(value: '1-on-1' | 'class') => 
                  setFormData(prev => ({ ...prev, meeting_type: value, student_id: '', course_id: '' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-on-1">1-on-1 Session</SelectItem>
                  <SelectItem value="class">Class Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.meeting_type === '1-on-1' && (
              <div className="space-y-2">
                <Label htmlFor="student">Select Student *</Label>
                <Select
                  value={formData.student_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, student_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.first_name} {student.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {formData.meeting_type === 'class' && (
              <div className="space-y-2">
                <Label htmlFor="course">Select Course *</Label>
                <Select
                  value={formData.course_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, course_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select
                value={formData.duration.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, duration: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateMeeting} disabled={loading}>
              {loading ? 'Scheduling...' : 'Schedule Meeting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
