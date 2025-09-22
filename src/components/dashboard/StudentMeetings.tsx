import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Video, 
  Calendar, 
  Clock, 
  User, 
  Users, 
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Play,
  BookOpen,
  Timer,
  RefreshCw,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { ContentLoader } from '@/components/ContentLoader';
import meetingService, { ZoomMeeting } from '@/services/meetingService';

interface StudentMeetingsProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
  };
}

interface StudentMeetingStats {
  total: number;
  upcoming: number;
  oneOnOne: number;
  classMeetings: number;
}

export const StudentMeetings = ({ userProfile }: StudentMeetingsProps) => {
  const [meetings, setMeetings] = useState<ZoomMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StudentMeetingStats>({ 
    total: 0, 
    upcoming: 0, 
    oneOnOne: 0, 
    classMeetings: 0 
  });

  // Load meetings data
  useEffect(() => {
    loadMeetings();
  }, [userProfile.id]);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      console.log('Loading student meetings for:', userProfile.id);
      
      const meetingsData = await meetingService.getStudentMeetings(userProfile.id);
      console.log('Student meetings loaded:', meetingsData);
      
      setMeetings(meetingsData);
      
      // Calculate stats
      const now = new Date();
      const calculatedStats: StudentMeetingStats = {
        total: meetingsData.length,
        upcoming: meetingsData.filter(m => 
          m.status === 'scheduled' && new Date(m.scheduled_time) > now
        ).length,
        oneOnOne: meetingsData.filter(m => m.meeting_type === '1-on-1').length,
        classMeetings: meetingsData.filter(m => m.meeting_type === 'class').length
      };
      
      setStats(calculatedStats);
    } catch (error) {
      console.error('Error loading student meetings:', error);
      toast.error('Failed to load meetings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = (meeting: ZoomMeeting) => {
    if (meeting.zoom_join_url) {
      window.open(meeting.zoom_join_url, '_blank');
      toast.success(`Joining ${meeting.title}...`);
    } else {
      toast.error('Meeting link not available');
    }
  };

  const handleCopyMeetingLink = (meeting: ZoomMeeting) => {
    if (meeting.zoom_join_url) {
      navigator.clipboard.writeText(meeting.zoom_join_url);
      toast.success('Meeting link copied to clipboard');
    } else {
      toast.error('Meeting link not available');
    }
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getTimeUntilMeeting = (scheduledTime: string) => {
    const now = new Date();
    const meetingTime = new Date(scheduledTime);
    const diffMs = meetingTime.getTime() - now.getTime();
    
    if (diffMs < 0) return 'Past';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours === 0 && diffMinutes <= 15) {
      return 'Starting soon';
    } else if (diffHours === 0) {
      return `${diffMinutes}m`;
    } else if (diffHours < 24) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d`;
    }
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

  const canJoinMeeting = (scheduledTime: string) => {
    const now = new Date();
    const meetingTime = new Date(scheduledTime);
    const diffMs = meetingTime.getTime() - now.getTime();
    
    // Allow joining 15 minutes before and up to 2 hours after meeting start
    return diffMs <= 15 * 60 * 1000 && diffMs >= -2 * 60 * 60 * 1000;
  };

  const getTeacherName = (meeting: ZoomMeeting) => {
    // The enhanced getStudentMeetings method stores teacher name in student_name field
    return meeting.student_name || 'Teacher';
  };

  const getCourseTitle = (meeting: ZoomMeeting) => {
    return meeting.course_title || (meeting.meeting_type === 'class' ? 'Class Meeting' : undefined);
  };

  const upcomingMeetings = meetings
    .filter(m => m.status === 'scheduled' && new Date(m.scheduled_time) > new Date())
    .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
  
  const pastMeetings = meetings
    .filter(m => m.status === 'completed' || m.status === 'cancelled' || 
      (m.status === 'scheduled' && new Date(m.scheduled_time) <= new Date()))
    .sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime());

  const nextMeeting = upcomingMeetings[0];

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
            My Meetings
          </h1>
          <p className="text-muted-foreground">
            View and join your scheduled Zoom meetings
          </p>
        </div>
        <Button variant="outline" onClick={loadMeetings} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Next Meeting Alert */}
      {nextMeeting && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <Video className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <strong>Next Meeting:</strong> {nextMeeting.title} with {getTeacherName(nextMeeting)}
                <br />
                <span className="text-sm">
                  {formatDateTime(nextMeeting.scheduled_time).date} at {formatDateTime(nextMeeting.scheduled_time).time}
                  {' • '}{getTimeUntilMeeting(nextMeeting.scheduled_time)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {nextMeeting.zoom_join_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyMeetingLink(nextMeeting)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
                {canJoinMeeting(nextMeeting.scheduled_time) && (
                  <Button
                    onClick={() => handleJoinMeeting(nextMeeting)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Join Now
                  </Button>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

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

      {/* Upcoming Meetings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Meetings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingMeetings.length === 0 ? (
            <div className="text-center py-8">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No upcoming meetings scheduled</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your teachers will schedule meetings that will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingMeetings.map((meeting) => {
                const { date, time } = formatDateTime(meeting.scheduled_time);
                const timeUntil = getTimeUntilMeeting(meeting.scheduled_time);
                const canJoin = canJoinMeeting(meeting.scheduled_time);
                const teacherName = getTeacherName(meeting);
                const courseTitle = getCourseTitle(meeting);
                
                return (
                  <div
                    key={meeting.id}
                    className={`p-4 border rounded-lg transition-all ${
                      canJoin 
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' 
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-muted rounded-lg">
                            {meeting.meeting_type === '1-on-1' ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Users className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold">{meeting.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              with {teacherName}
                              {courseTitle && ` • ${courseTitle}`}
                            </p>
                          </div>
                        </div>
                        
                        {meeting.description && (
                          <p className="text-sm text-muted-foreground mb-3 ml-11">
                            {meeting.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 ml-11 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {date}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {time}
                          </div>
                          <div className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {meeting.duration} min
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {timeUntil}
                          </Badge>
                          <Badge className={getStatusColor(meeting.status)}>
                            {meeting.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {meeting.zoom_join_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyMeetingLink(meeting)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        {canJoin ? (
                          <Button
                            onClick={() => handleJoinMeeting(meeting)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Join Meeting
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            disabled
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Not Yet Available
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Meetings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Past Meetings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pastMeetings.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No past meetings yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pastMeetings.slice(0, 5).map((meeting) => {
                const { date, time } = formatDateTime(meeting.scheduled_time);
                const teacherName = getTeacherName(meeting);
                const courseTitle = getCourseTitle(meeting);
                
                return (
                  <div
                    key={meeting.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        {meeting.meeting_type === '1-on-1' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Users className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{meeting.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {teacherName} • {date} at {time}
                          {courseTitle && ` • ${courseTitle}`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(meeting.status)}>
                        {meeting.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {meeting.duration} min
                      </span>
                    </div>
                  </div>
                );
              })}
              
              {pastMeetings.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="outline" size="sm">
                    View All Past Meetings ({pastMeetings.length - 5} more)
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};