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
  Timer
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ContentLoader } from '@/components/ContentLoader';

interface StudentMeetingsProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
  };
}

interface ZoomMeeting {
  id: string;
  title: string;
  description?: string;
  meeting_type: '1-on-1' | 'class';
  scheduled_time: string;
  duration: number;
  teacher_name: string;
  course_title?: string;
  zoom_meeting_id?: string;
  zoom_join_url?: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  created_at: string;
}

const mockMeetings: ZoomMeeting[] = [
  {
    id: '1',
    title: 'Math Tutoring Session',
    description: 'One-on-one algebra help',
    meeting_type: '1-on-1',
    scheduled_time: '2024-01-20T14:00:00Z',
    duration: 60,
    teacher_name: 'Dr. Sarah Johnson',
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
    teacher_name: 'Prof. Michael Chen',
    course_title: 'Advanced Physics',
    zoom_meeting_id: '987654321',
    zoom_join_url: 'https://zoom.us/j/987654321',
    status: 'scheduled',
    created_at: '2024-01-15T11:00:00Z'
  },
  {
    id: '3',
    title: 'Chemistry Lab Review',
    description: 'Review of last week\'s experiments',
    meeting_type: 'class',
    scheduled_time: '2024-01-18T15:30:00Z',
    duration: 45,
    teacher_name: 'Dr. Emily Rodriguez',
    course_title: 'Chemistry Basics',
    zoom_meeting_id: '456789123',
    zoom_join_url: 'https://zoom.us/j/456789123',
    status: 'completed',
    created_at: '2024-01-10T09:00:00Z'
  }
];

export const StudentMeetings = ({ userProfile }: StudentMeetingsProps) => {
  const [meetings, setMeetings] = useState<ZoomMeeting[]>(mockMeetings);
  const [loading, setLoading] = useState(false);

  const handleJoinMeeting = (meeting: ZoomMeeting) => {
    if (meeting.zoom_join_url) {
      window.open(meeting.zoom_join_url, '_blank');
      toast.success(`Joining ${meeting.title}...`);
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
    
    // Allow joining 15 minutes before and up to meeting duration after
    return diffMs <= 15 * 60 * 1000 && diffMs >= -2 * 60 * 60 * 1000;
  };

  const upcomingMeetings = meetings
    .filter(m => m.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
  
  const pastMeetings = meetings
    .filter(m => m.status === 'completed' || m.status === 'cancelled')
    .sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime());

  const nextMeeting = upcomingMeetings[0];

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
      </div>

      {/* Next Meeting Alert */}
      {nextMeeting && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <Video className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <strong>Next Meeting:</strong> {nextMeeting.title} with {nextMeeting.teacher_name}
                <br />
                <span className="text-sm">
                  {formatDateTime(nextMeeting.scheduled_time).date} at {formatDateTime(nextMeeting.scheduled_time).time}
                  {' • '}{getTimeUntilMeeting(nextMeeting.scheduled_time)}
                </span>
              </div>
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
                              with {meeting.teacher_name}
                              {meeting.course_title && ` • ${meeting.course_title}`}
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
                          {meeting.teacher_name} • {date} at {time}
                          {meeting.course_title && ` • ${meeting.course_title}`}
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
                    View All Past Meetings
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
