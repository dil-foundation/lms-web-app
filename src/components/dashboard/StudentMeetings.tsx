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
  Copy,
  ChevronUp,
  ChevronDown
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
  const [showAllPast, setShowAllPast] = useState(false);
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
    
    // If meeting has started but still within join window (2 hours)
    if (diffMs < 0) {
      const absDiffMs = Math.abs(diffMs);
      const twoHours = 2 * 60 * 60 * 1000;
      
      if (absDiffMs <= twoHours) {
        const elapsedHours = Math.floor(absDiffMs / (1000 * 60 * 60));
        const elapsedMinutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (elapsedHours === 0) {
          return elapsedMinutes === 0 ? 'Just started' : `Started ${elapsedMinutes}m ago`;
        } else {
          return `Started ${elapsedHours}h ${elapsedMinutes}m ago`;
        }
      } else {
        return 'Past';
      }
    }
    
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
    .filter(m => {
      if (m.status !== 'scheduled') return false;
      
      const now = new Date();
      const meetingTime = new Date(m.scheduled_time);
      const diffMs = meetingTime.getTime() - now.getTime();
      
      // Keep in upcoming if meeting hasn't started yet OR is within 2-hour join window
      return diffMs > 0 || diffMs >= -2 * 60 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
  
  const pastMeetings = meetings
    .filter(m => {
      if (m.status === 'completed' || m.status === 'cancelled') return true;
      
      if (m.status === 'scheduled') {
        const now = new Date();
        const meetingTime = new Date(m.scheduled_time);
        const diffMs = meetingTime.getTime() - now.getTime();
        
        // Move to past only after 2-hour join window expires
        return diffMs < -2 * 60 * 60 * 1000;
      }
      
      return false;
    })
    .sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime());


  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <ContentLoader />
      </div>
    );
  }

  return (
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
                  My Meetings
                </h1>
                <p className="text-sm md:text-lg text-muted-foreground font-light">
                  View and join your scheduled Zoom meetings
                </p>
              </div>
            </div>
            
            <Button variant="outline" onClick={loadMeetings} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      </div>

      {/* Upcoming Meetings */}
      <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              Upcoming Meetings
            </CardTitle>
            {upcomingMeetings.length > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                {upcomingMeetings.length} meeting{upcomingMeetings.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {upcomingMeetings.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Video className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No upcoming meetings</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Your teachers will schedule meetings that will appear here. Check back later or contact your teacher.
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
                    className="group p-4 border rounded-xl transition-all duration-200 hover:shadow-md hover:border-primary/30 bg-gradient-to-r from-card to-muted/30"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl">
                          {meeting.meeting_type === '1-on-1' ? (
                            <User className="h-5 w-5 text-primary" />
                          ) : (
                            <Users className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-semibold mb-1 group-hover:text-primary transition-colors">
                            {meeting.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            with {teacherName}
                            {courseTitle && (
                              <span className="ml-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                                {courseTitle}
                              </span>
                            )}
                          </p>
                          
                          {meeting.description && (
                            <p className="text-sm text-muted-foreground mb-2 p-2 bg-muted/50 rounded-lg">
                              {meeting.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{time}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              <span>{meeting.duration} min</span>
                            </div>
                            <Badge 
                              variant="secondary" 
                              className="bg-primary/10 text-primary border-primary/20 text-xs"
                            >
                              {timeUntil}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {meeting.zoom_join_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyMeetingLink(meeting)}
                            className="hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        {canJoin ? (
                          <Button
                            onClick={() => handleJoinMeeting(meeting)}
                            className="bg-gradient-to-r from-brand-green-500 to-brand-green-600 hover:from-brand-green-600 hover:to-brand-green-500 text-white shadow-lg hover:shadow-xl hover:shadow-brand-green-500/25 transition-all duration-300 hover:-translate-y-0.5"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Join Meeting
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            disabled
                            className="opacity-50"
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
      <Card className="bg-gradient-to-br from-card to-slate-500/5 dark:bg-card border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-br from-slate-500/10 to-slate-500/20 rounded-xl">
                <CheckCircle className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              Past Meetings
            </CardTitle>
            {pastMeetings.length > 0 && (
              <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                {pastMeetings.length} meeting{pastMeetings.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pastMeetings.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-500/10 to-slate-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-slate-600 dark:text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No past meetings yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Completed and cancelled meetings will appear here for your reference.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pastMeetings.slice(0, showAllPast ? pastMeetings.length : 5).map((meeting) => {
                const { date, time } = formatDateTime(meeting.scheduled_time);
                const teacherName = getTeacherName(meeting);
                const courseTitle = getCourseTitle(meeting);
                
                return (
                  <div
                    key={meeting.id}
                    className="group p-4 border rounded-xl transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 bg-gradient-to-r from-card to-slate-50/50 dark:to-slate-900/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${
                          meeting.status === 'completed' 
                            ? 'bg-green-100 dark:bg-green-900/50' 
                            : meeting.status === 'cancelled'
                            ? 'bg-orange-100 dark:bg-orange-900/50'
                            : 'bg-slate-100 dark:bg-slate-800'
                        }`}>
                          {meeting.meeting_type === '1-on-1' ? (
                            <User className={`h-4 w-4 ${
                              meeting.status === 'completed' 
                                ? 'text-green-600 dark:text-green-400' 
                                : meeting.status === 'cancelled'
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-slate-600 dark:text-slate-400'
                            }`} />
                          ) : (
                            <Users className={`h-4 w-4 ${
                              meeting.status === 'completed' 
                                ? 'text-green-600 dark:text-green-400' 
                                : meeting.status === 'cancelled'
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-slate-600 dark:text-slate-400'
                            }`} />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
                            {meeting.title}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="font-medium">{teacherName}</span>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {date}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {time}
                            </div>
                            {courseTitle && (
                              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                                {courseTitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="secondary"
                          className={`font-medium ${
                            meeting.status === 'completed' 
                              ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700' 
                              : meeting.status === 'cancelled'
                              ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700'
                              : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {meeting.status}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Timer className="h-3 w-3" />
                          <span className="font-medium">{meeting.duration} min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {pastMeetings.length > 5 && (
                <div className="text-center pt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAllPast(!showAllPast)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                  >
                    {showAllPast ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show All {pastMeetings.length} Meetings
                      </>
                    )}
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