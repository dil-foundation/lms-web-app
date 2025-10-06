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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  RefreshCw,
  Ban
} from 'lucide-react';
import { toast } from 'sonner';
import { ContentLoader } from '@/components/ContentLoader';
import meetingService, { ZoomMeeting, CreateMeetingRequest, MeetingStats, MeetingType } from '@/services/meetingService';

interface TeacherMeetingsProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    teacher_id?: string;
    role?: string;
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

interface Class {
  id: string;
  name: string;
  code: string;
  grade: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface Admin {
  id: string;
  name: string;
  email: string;
}

export const TeacherMeetings = ({ userProfile }: TeacherMeetingsProps) => {
  // Check if user is admin
  const isAdmin = userProfile.role === 'admin';
  
  const [meetings, setMeetings] = useState<ZoomMeeting[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<Class[]>([]); // State for classes
  const [teachers, setTeachers] = useState<Teacher[]>([]); // NEW: State for teachers
  const [admins, setAdmins] = useState<Admin[]>([]); // NEW: State for admins
  const [stats, setStats] = useState<MeetingStats>({ total: 0, upcoming: 0, oneOnOne: 0, classMeetings: 0, teacherToTeacher: 0, adminToTeacher: 0 });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [editingMeeting, setEditingMeeting] = useState<ZoomMeeting | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meeting_type: (isAdmin ? 'admin-to-teacher' : '1-on-1') as MeetingType,
    scheduled_date: '',
    scheduled_time: '',
    duration: 60,
    student_id: '',
    participant_id: '', // NEW: Generic participant
    participant_role: '' as 'student' | 'teacher' | 'admin' | '', // NEW: Participant role
    course_id: '',
    class_id: '' // Support for class-based meetings
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [userProfile.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [meetingsData, studentsData, coursesData, classesData, teachersData, adminsData, statsData] = await Promise.all([
        meetingService.getTeacherMeetings(userProfile.id),
        meetingService.getAvailableStudents(userProfile.id),
        meetingService.getTeacherCourses(userProfile.id),
        meetingService.getTeacherClasses(userProfile.id), // Load teacher's classes
        meetingService.getAvailableTeachers(userProfile.id), // NEW: Load teachers
        meetingService.getAvailableAdmins(userProfile.id), // NEW: Load admins
        meetingService.getMeetingStats(userProfile.id)
      ]);

      setMeetings(meetingsData);
      setStudents(studentsData);
      setCourses(coursesData);
      setClasses(classesData); // Set classes data
      setTeachers(teachersData); // NEW: Set teachers data
      setAdmins(adminsData); // NEW: Set admins data
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

      if (formData.meeting_type === 'class' && !formData.class_id) {
        toast.error('Please select a class for class meeting');
        return;
      }

      if (formData.meeting_type === 'teacher-to-teacher' && !formData.participant_id) {
        toast.error('Please select a teacher');
        return;
      }

      if (formData.meeting_type === 'admin-to-teacher' && !formData.participant_id) {
        toast.error(isAdmin ? 'Please select a teacher' : 'Please select an admin');
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
        // Set participant_id for ALL meeting types that have participants
        participant_id: formData.meeting_type === '1-on-1' 
          ? formData.student_id  // For 1-on-1, participant is the student
          : ['teacher-to-teacher', 'admin-to-teacher'].includes(formData.meeting_type) 
            ? formData.participant_id  // For teacher/admin meetings, use selected participant
            : undefined,
        participant_role: formData.meeting_type === '1-on-1'
          ? 'student'  // For 1-on-1, role is always student
          : formData.participant_role || undefined,
        course_id: undefined, // No longer using courses for class meetings
        class_id: formData.meeting_type === 'class' ? formData.class_id : undefined
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
        meeting_type: isAdmin ? 'admin-to-teacher' : '1-on-1',
        scheduled_date: '',
        scheduled_time: '',
        duration: 60,
        student_id: '',
        participant_id: '',
        participant_role: '',
        course_id: '',
        class_id: ''
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

  // Add 2-hour grace period: meetings stay in "Upcoming" for 2 hours after scheduled time
  const now = new Date();
  const twoHoursInMs = 2 * 60 * 60 * 1000;
  
  const upcomingMeetings = meetings.filter(m => {
    if (m.status !== 'scheduled') return false;
    const scheduledTime = new Date(m.scheduled_time);
    const gracePeriodEnd = new Date(scheduledTime.getTime() + twoHoursInMs);
    return now < gracePeriodEnd; // Show as upcoming until 2 hours after scheduled time
  });
  
  const pastMeetings = meetings.filter(m => {
    if (m.status === 'completed' || m.status === 'cancelled') return true;
    if (m.status === 'scheduled') {
      const scheduledTime = new Date(m.scheduled_time);
      const gracePeriodEnd = new Date(scheduledTime.getTime() + twoHoursInMs);
      return now >= gracePeriodEnd; // Move to past after 2 hours
    }
    return false;
  });

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <ContentLoader />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-4 md:p-8 rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <Video className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  Zoom Meetings
                </h1>
                <p className="text-sm md:text-lg text-muted-foreground font-light">
                  Schedule and manage virtual meetings with students
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="h-10 px-6 rounded-xl bg-gradient-to-r from-brand-green-500 to-brand-green-600 hover:from-brand-green-600 hover:to-brand-green-500 text-white shadow-lg hover:shadow-xl hover:shadow-brand-green-500/25 transition-all duration-300 hover:-translate-y-0.5"
              >
                <Plus className="mr-2 h-4 w-4" />
                Schedule Meeting
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
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
            <div className="text-2xl font-bold">{stats.upcoming}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">1-on-1 Sessions</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.oneOnOne}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Class Meetings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.classMeetings}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teacher Meetings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teacherToTeacher}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Meetings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.adminToTeacher}</div>
          </CardContent>
        </Card>
      </div>

      {/* Meetings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">
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
                      <TableHead>Host</TableHead>
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
                            {meeting.meeting_type === '1-on-1' && '1-on-1'}
                            {meeting.meeting_type === 'class' && 'Class'}
                            {meeting.meeting_type === 'teacher-to-teacher' && 'Teacher-to-Teacher'}
                            {meeting.meeting_type === 'admin-to-teacher' && 'Admin-to-Teacher'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {meeting.teacher_id === userProfile.id ? (
                              <span className="text-green-600 font-medium">You</span>
                            ) : (
                              meeting.host_name || 'Unknown'
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          {meeting.meeting_type === '1-on-1' && (meeting.student_name || 'Unknown Student')}
                          {meeting.meeting_type === 'class' && (meeting.course_title || 'Unknown Course')}
                          {meeting.meeting_type === 'teacher-to-teacher' && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {meeting.participant_name || 'Unknown Teacher'}
                            </span>
                          )}
                          {meeting.meeting_type === 'admin-to-teacher' && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {/* Show host name if user is participant, participant name if user is host */}
                              {meeting.teacher_id === userProfile.id 
                                ? (meeting.participant_name || 'Unknown Participant')
                                : (meeting.host_name || 'Unknown Host')}
                            </span>
                          )}
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
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyMeetingLink(meeting.zoom_join_url!)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Copy meeting link</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {meeting.zoom_join_url && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(meeting.zoom_join_url, '_blank')}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Open meeting in new tab</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {/* Only show cancel and delete buttons for meetings created by the current user */}
                            {meeting.teacher_id === userProfile.id && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleCancelMeeting(meeting.id)}
                                      className="hover:bg-orange-50 dark:hover:bg-orange-950/20"
                                    >
                                      <Ban className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Cancel meeting (keeps record)</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDeleteMeeting(meeting.id)}
                                      className="hover:bg-red-50 dark:hover:bg-red-950/20"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete meeting permanently</p>
                                  </TooltipContent>
                                </Tooltip>
                              </>
                            )}
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
                      <TableHead>Host</TableHead>
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
                            {meeting.meeting_type === '1-on-1' && '1-on-1'}
                            {meeting.meeting_type === 'class' && 'Class'}
                            {meeting.meeting_type === 'teacher-to-teacher' && 'Teacher-to-Teacher'}
                            {meeting.meeting_type === 'admin-to-teacher' && 'Admin-to-Teacher'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {meeting.teacher_id === userProfile.id ? (
                              <span className="text-green-600 font-medium">You</span>
                            ) : (
                              meeting.host_name || 'Unknown'
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          {meeting.meeting_type === '1-on-1' && (meeting.student_name || 'Unknown Student')}
                          {meeting.meeting_type === 'class' && (meeting.course_title || 'Unknown Course')}
                          {meeting.meeting_type === 'teacher-to-teacher' && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {meeting.participant_name || 'Unknown Teacher'}
                            </span>
                          )}
                          {meeting.meeting_type === 'admin-to-teacher' && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {/* Show host name if user is participant, participant name if user is host */}
                              {meeting.teacher_id === userProfile.id 
                                ? (meeting.participant_name || 'Unknown Participant')
                                : (meeting.host_name || 'Unknown Host')}
                            </span>
                          )}
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
                onValueChange={(value: MeetingType) => 
                  setFormData(prev => ({ 
                    ...prev, 
                    meeting_type: value,
                    student_id: '',
                    participant_id: '',
                    participant_role: '',
                    course_id: '',
                    class_id: ''
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin ? (
                    // Admin can only create Admin-to-Teacher meetings
                    <>
                      <SelectItem value="admin-to-teacher">Admin-to-Teacher Meeting</SelectItem>
                    </>
                  ) : (
                    // Teachers can create meetings with students, teachers, and admins
                    <>
                      <SelectItem value="1-on-1">1-on-1 with Student</SelectItem>
                      <SelectItem value="class">Class Meeting</SelectItem>
                      <SelectItem value="teacher-to-teacher">Teacher-to-Teacher Meeting</SelectItem>
                      <SelectItem value="admin-to-teacher">Teacher-to-Admin Meeting</SelectItem>
                    </>
                  )}
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
                <Label htmlFor="class">Class *</Label>
                <Select
                  value={formData.class_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, class_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{classItem.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {classItem.code} • Grade {classItem.grade}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.meeting_type === 'teacher-to-teacher' && (
              <div className="grid gap-2">
                <Label htmlFor="teacher">Select Teacher *</Label>
                <Select
                  value={formData.participant_id}
                  onValueChange={(value) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      participant_id: value,
                      participant_role: 'teacher'
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No other teachers available</div>
                    ) : (
                      teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{teacher.name}</span>
                            <span className="text-xs text-muted-foreground">{teacher.email}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.meeting_type === 'admin-to-teacher' && (
              <div className="grid gap-2">
                <Label htmlFor="participant">
                  {isAdmin ? 'Select Teacher *' : 'Select Admin *'}
                </Label>
                <Select
                  value={formData.participant_id}
                  onValueChange={(value) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      participant_id: value,
                      participant_role: isAdmin ? 'teacher' : 'admin'
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isAdmin ? "Select a teacher" : "Select an admin"} />
                  </SelectTrigger>
                  <SelectContent>
                    {isAdmin ? (
                      // Admin selects a teacher
                      teachers.length > 0 ? (
                        teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{teacher.name}</span>
                              <span className="text-xs text-muted-foreground">{teacher.email}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No teachers available</div>
                      )
                    ) : (
                      // Teacher selects an admin
                      admins.length > 0 ? (
                        admins.map((admin) => (
                          <SelectItem key={admin.id} value={admin.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{admin.name}</span>
                              <span className="text-xs text-muted-foreground">{admin.email}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No admins available</div>
                      )
                    )}
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
    </TooltipProvider>
  );
};