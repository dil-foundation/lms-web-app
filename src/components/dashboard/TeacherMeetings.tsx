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
  Copy,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { ContentLoader } from '@/components/ContentLoader';
import meetingService, { ZoomMeeting, CreateMeetingRequest, MeetingStats } from '@/services/meetingService';

interface TeacherMeetingsProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    teacher_id?: string;
  };
}

interface Student {
  id: string;
  name: string;
  email: string;
}

interface Course {
  id: string;
  title: string;
}

export const TeacherMeetings = ({ userProfile }: TeacherMeetingsProps) => {
  const [meetings, setMeetings] = useState<ZoomMeeting[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<MeetingStats>({ total: 0, upcoming: 0, oneOnOne: 0, classMeetings: 0 });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [editingMeeting, setEditingMeeting] = useState<ZoomMeeting | null>(null);

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

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [userProfile.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [meetingsData, studentsData, coursesData, statsData] = await Promise.all([
        meetingService.getTeacherMeetings(userProfile.id),
        meetingService.getAvailableStudents(userProfile.id),
        meetingService.getTeacherCourses(userProfile.id),
        meetingService.getMeetingStats(userProfile.id)
      ]);

      setMeetings(meetingsData);
      setStudents(studentsData);
      setCourses(coursesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading meeting data:', error);
      toast.error('Failed to load meeting data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async () => {
    try {
      setCreating(true);
      
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

      // Create meeting object with proper timezone handling
      // Create a Date object in local timezone, then convert to ISO string
      const localDateTime = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`);
      const scheduledDateTime = localDateTime.toISOString();

      console.log('Creating meeting with datetime:', {
        input: `${formData.scheduled_date}T${formData.scheduled_time}`,
        localDateTime: localDateTime.toString(),
        isoString: scheduledDateTime
      });

      const meetingRequest: CreateMeetingRequest = {
        title: formData.title,
        description: formData.description,
        meeting_type: formData.meeting_type,
        scheduled_time: scheduledDateTime,
        duration: formData.duration,
        student_id: formData.meeting_type === '1-on-1' ? formData.student_id : undefined,
        course_id: formData.meeting_type === 'class' ? formData.course_id : undefined
      };

      const newMeeting = await meetingService.createMeeting(userProfile.id, meetingRequest);
      
      // Update local state
      setMeetings(prev => [...prev, newMeeting]);
      
      // Update stats
      const updatedStats = await meetingService.getMeetingStats(userProfile.id);
      setStats(updatedStats);

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
      toast.error(error instanceof Error ? error.message : 'Failed to create meeting');
    } finally {
      setCreating(false);
    }
  };

  const handleCancelMeeting = async (meetingId: string) => {
    try {
      await meetingService.cancelMeeting(meetingId, userProfile.id);
      
      // Update local state
      setMeetings(prev => prev.map(meeting => 
        meeting.id === meetingId 
          ? { ...meeting, status: 'cancelled' as const }
          : meeting
      ));
      
      // Update stats
      const updatedStats = await meetingService.getMeetingStats(userProfile.id);
      setStats(updatedStats);
      
      toast.success('Meeting cancelled successfully');
    } catch (error) {
      console.error('Error cancelling meeting:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel meeting');
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await meetingService.deleteMeeting(meetingId, userProfile.id);
      
      // Update local state
      setMeetings(prev => prev.filter(meeting => meeting.id !== meetingId));
      
      // Update stats
      const updatedStats = await meetingService.getMeetingStats(userProfile.id);
      setStats(updatedStats);
      
      toast.success('Meeting deleted successfully');
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete meeting');
    }
  };

  const copyMeetingLink = (joinUrl: string) => {
    navigator.clipboard.writeText(joinUrl);
    toast.success('Meeting link copied to clipboard');
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

  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled' && new Date(m.scheduled_time) > new Date());
  const pastMeetings = meetings.filter(m => m.status === 'completed' || m.status === 'cancelled' || (m.status === 'scheduled' && new Date(m.scheduled_time) <= new Date()));

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <ContentLoader />
      </div>
    );
  }

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Meeting
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-blue-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.upcoming}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-purple-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">1-on-1 Sessions</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.oneOnOne}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-orange-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Class Meetings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.classMeetings}</div>
          </CardContent>
        </Card>
      </div>

      {/* Meetings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming" className="text-green-600">
            Upcoming Meetings
          </TabsTrigger>
          <TabsTrigger value="past">
            Past Meetings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingMeetings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming meetings scheduled</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setIsCreateModalOpen(true)}
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
                              <div className="text-sm text-muted-foreground">
                                {meeting.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {meeting.meeting_type === '1-on-1' ? '1-on-1' : 'Class'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {meeting.meeting_type === '1-on-1' 
                            ? meeting.student_name || 'Unknown Student'
                            : meeting.course_title || 'Unknown Course'
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
                                onClick={() => copyMeetingLink(meeting.zoom_join_url!)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            {meeting.zoom_join_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(meeting.zoom_join_url, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelMeeting(meeting.id)}
                            >
                              <AlertCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteMeeting(meeting.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No past meetings found</p>
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
                              <div className="text-sm text-muted-foreground">
                                {meeting.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {meeting.meeting_type === '1-on-1' ? '1-on-1' : 'Class'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {meeting.meeting_type === '1-on-1' 
                            ? meeting.student_name || 'Unknown Student'
                            : meeting.course_title || 'Unknown Course'
                          }
                        </TableCell>
                        <TableCell>{formatDateTime(meeting.scheduled_time)}</TableCell>
                        <TableCell>
                          {meeting.actual_duration || meeting.duration} min
                        </TableCell>
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

      {/* Create Meeting Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Schedule New Meeting</DialogTitle>
            <DialogDescription>
              Create a new Zoom meeting with your students
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Meeting Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter meeting title"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional meeting description"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="meeting_type">Meeting Type *</Label>
              <Select
                value={formData.meeting_type}
                onValueChange={(value: '1-on-1' | 'class') => 
                  setFormData(prev => ({ 
                    ...prev, 
                    meeting_type: value,
                    student_id: '',
                    course_id: ''
                  }))
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
              <div className="grid gap-2">
                <Label htmlFor="student">Student *</Label>
                <Select
                  value={formData.student_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, student_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.meeting_type === 'class' && (
              <div className="grid gap-2">
                <Label htmlFor="course">Course *</Label>
                <Select
                  value={formData.course_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, course_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
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
              <div className="grid gap-2">
                <Label htmlFor="scheduled_date">Date *</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="[&::-webkit-calendar-picker-indicator]:dark:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="scheduled_time">Time *</Label>
                <Input
                  id="scheduled_time"
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                  className="[&::-webkit-calendar-picker-indicator]:dark:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Select
                value={formData.duration.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, duration: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateModalOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateMeeting} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};