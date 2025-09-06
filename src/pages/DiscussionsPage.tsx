import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquare,
  FileText,
  Megaphone,
  Clock,
  Search,
  Plus,
  MoreHorizontal,
  ThumbsUp,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Filter,
  SortDesc,
  Users,
  BookOpen,
  AlertCircle,
  Edit,
  Trash,
  X
} from 'lucide-react';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useDebounce } from '@/hooks/useDebounce';
import NotificationService from '@/services/notificationService';
import AccessLogService from '@/services/accessLogService';

import { ContentLoader } from '@/components/ContentLoader';
import { DiscussionDialog } from '@/components/discussions/DiscussionDialog';

const fetchDiscussions = async (searchTerm: string, courseFilter: string, typeFilter: string, page: number, rowsPerPage: number) => {
  const { data, error } = await supabase.rpc('get_discussions_for_user', {
    p_search_term: searchTerm,
    p_course_filter: courseFilter,
    p_type_filter: typeFilter,
    p_page: page,
    p_rows_per_page: rowsPerPage,
  });

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const fetchDiscussionsCount = async (searchTerm: string, courseFilter: string, typeFilter: string) => {
  const { data, error } = await supabase.rpc('get_discussions_for_user_count', {
    p_search_term: searchTerm,
    p_course_filter: courseFilter,
    p_type_filter: typeFilter,
  });

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const fetchDiscussionParticipants = async (discussionId: string) => {
  const { data, error } = await supabase
    .from('discussion_participants')
    .select('role')
    .eq('discussion_id', discussionId);
  if (error) {
    console.error("Failed to fetch participants", error);
    return ['admin']; // Fallback
  }
  return data.map(p => p.role);
};

const fetchUserCourses = async () => {
  const { data, error } = await supabase.rpc('get_courses_for_user');
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const roles = [
  { value: 'student', label: 'Students' },
  { value: 'teacher', label: 'Teachers' },
  { value: 'admin', label: 'Admins', disabled: true },
];

export default function DiscussionsPage() {
  const [isNewDiscussionOpen, setIsNewDiscussionOpen] = useState(false);
  const [editingDiscussion, setEditingDiscussion] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [discussionToDelete, setDiscussionToDelete] = useState<any | null>(null);
  const [showDeletedMessage, setShowDeletedMessage] = useState(false);
  const hasShownDeletedMessage = useRef(false);
  const { user } = useAuth();
  const { profile, loading: isProfileLoading } = useUserProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: discussionsCount = 0 } = useQuery({
    queryKey: ['discussionsCount', debouncedSearchTerm, selectedCourse, selectedType],
    queryFn: () => fetchDiscussionsCount(debouncedSearchTerm, selectedCourse, selectedType),
  });

  const { data: discussions = [], isFetching } = useQuery({
    queryKey: ['discussions', debouncedSearchTerm, selectedCourse, selectedType, currentPage],
    queryFn: () => fetchDiscussions(debouncedSearchTerm, selectedCourse, selectedType, currentPage, rowsPerPage),
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCourse, selectedType]);

  // Check if user was redirected due to deleted discussion
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('deleted') === 'true' && !hasShownDeletedMessage.current) {
      hasShownDeletedMessage.current = true;
      setShowDeletedMessage(true);
      // Don't clear the query parameter immediately - let the user see the message
      // The message will be dismissed when they click the X button
    }
  }, [location.search]);



  const { data: courses = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ['userCourses'],
    queryFn: fetchUserCourses,
  });

  const createDiscussionMutation = useMutation({
    mutationFn: async (newDiscussion: any) => {
      const { data: discussionData, error: discussionError } = await supabase
        .from('discussions')
        .insert({
          title: newDiscussion.title,
          content: newDiscussion.content,
          creator_id: user?.id,
          course_id: newDiscussion.course === 'general' ? null : newDiscussion.course,
          type: newDiscussion.type,
        })
        .select()
        .single();

      if (discussionError) throw new Error(discussionError.message);

      // Log discussion creation
      if (user) {
        try {
          await AccessLogService.logDiscussionAction(
            user.id,
            user.email || 'unknown@email.com',
            'created',
            discussionData.id,
            discussionData.title,
            {
              course_id: newDiscussion.course === 'general' ? null : newDiscussion.course,
              type: newDiscussion.type,
              participants: newDiscussion.participants
            }
          );
        } catch (logError) {
          console.error('Error logging discussion creation:', logError);
        }
      }

      const participantsToInsert = newDiscussion.participants.map((role: string) => ({
        discussion_id: discussionData.id,
        role,
      }));

      const { error: insertParticipantsError } = await supabase
        .from('discussion_participants')
        .insert(participantsToInsert);

      if (insertParticipantsError) throw new Error(insertParticipantsError.message);

      // After successful creation, invoke the unified notification function
      // Get discussion participants to exclude the creator
      const { data: creationParticipants, error: creationParticipantsError } = await supabase
        .from('discussion_participants')
        .select('role')
        .eq('discussion_id', discussionData.id);

      if (!creationParticipantsError && creationParticipants.length > 0) {
        // Get all users with these roles except the current user (creator)
        const { data: targetUsers, error: usersError } = await supabase
          .from('profiles')
          .select('id')
          .in('role', creationParticipants.map(p => p.role))
          .neq('id', user.id);

        if (!usersError && targetUsers && targetUsers.length > 0) {
          await supabase.functions.invoke('send-notification', {
            body: {
              type: 'new_discussion',
              title: 'New Discussion Created',
              body: `A new discussion "${discussionData.title}" has been started.`,
              data: {
                discussionId: discussionData.id,
                discussionTitle: discussionData.title
              },
              targetUsers: targetUsers.map(u => u.id)
            },
          });
        }
      }

      return discussionData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      queryClient.invalidateQueries({ queryKey: ['discussionsCount'] });
      closeAndResetDialog();
    },
  });

  const updateDiscussionMutation = useMutation({
    mutationFn: async (discussionToUpdate: any) => {
      const { data, error } = await supabase
        .from('discussions')
        .update({
          title: discussionToUpdate.title,
          content: discussionToUpdate.content,
          course_id: discussionToUpdate.course === 'general' ? null : discussionToUpdate.course,
          type: discussionToUpdate.type,
        })
        .eq('id', discussionToUpdate.id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);

      // Log discussion update
      if (user) {
        try {
          await AccessLogService.logDiscussionAction(
            user.id,
            user.email || 'unknown@email.com',
            'updated',
            discussionToUpdate.id,
            discussionToUpdate.title,
            {
              course_id: discussionToUpdate.course === 'general' ? null : discussionToUpdate.course,
              type: discussionToUpdate.type,
              participants: discussionToUpdate.participants
            }
          );
        } catch (logError) {
          console.error('Error logging discussion update:', logError);
        }
      }

      // Delete and re-insert participants
      await supabase.from('discussion_participants').delete().eq('discussion_id', discussionToUpdate.id);
      
      const participantsToInsert = discussionToUpdate.participants.map((role: string) => ({
        discussion_id: discussionToUpdate.id,
        role,
      }));

      await supabase.from('discussion_participants').insert(participantsToInsert);

      // Send notification for discussion update
      if (user) {
        try {
          // Get discussion participants to exclude the updater
          const { data: updateParticipants, error: updateParticipantsError } = await supabase
            .from('discussion_participants')
            .select('role')
            .eq('discussion_id', discussionToUpdate.id);

          if (!updateParticipantsError && updateParticipants.length > 0) {
            // Get all users with these roles except the current user
            const { data: targetUsers, error: usersError } = await supabase
              .from('profiles')
              .select('id')
              .in('role', updateParticipants.map(p => p.role))
              .neq('id', user.id);

            if (!usersError && targetUsers && targetUsers.length > 0) {
              await supabase.functions.invoke('send-notification', {
                body: {
                  type: 'course_update',
                  title: 'Discussion Updated',
                  body: `${user.user_metadata?.first_name || user.email} updated the discussion "${discussionToUpdate.title}".`,
                  data: {
                    discussionId: discussionToUpdate.id,
                    discussionTitle: discussionToUpdate.title,
                    updateType: 'discussion_updated'
                  },
                  targetUsers: targetUsers.map(u => u.id)
                },
              });
            }
          }
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
          // Don't throw error here as the update was successfully completed
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      queryClient.invalidateQueries({ queryKey: ['discussionsCount'] });
      closeAndResetDialog();
    },
  });

  const deleteDiscussionMutation = useMutation({
    mutationFn: async (discussionId: string) => {
      // Get discussion details and participants BEFORE deletion for notification
      const { data: discussionData, error: fetchError } = await supabase
        .from('discussions')
        .select('title')
        .eq('id', discussionId)
        .single();

      if (fetchError) {
        console.error('Failed to fetch discussion for notification:', fetchError);
      }

      // Get discussion participants BEFORE deletion
      const { data: participants, error: participantsError } = await supabase
        .from('discussion_participants')
        .select('role')
        .eq('discussion_id', discussionId);

      if (participantsError) {
        console.error('Failed to fetch participants for notification:', participantsError);
      }

      // Log discussion deletion
      if (user && discussionData) {
        try {
          await AccessLogService.logDiscussionAction(
            user.id,
            user.email || 'unknown@email.com',
            'deleted',
            discussionId,
            discussionData.title,
            {
              participants: participants?.map(p => p.role) || []
            }
          );
        } catch (logError) {
          console.error('Error logging discussion deletion:', logError);
        }
      }

      // Now delete the discussion
      const { error } = await supabase.from('discussions').delete().eq('id', discussionId);
      if (error) throw new Error(error.message);

      // Mark all notifications related to this discussion as read for all users
      try {
        // Get all users with these roles
        const { data: targetUsers, error: usersError } = await supabase
          .from('profiles')
          .select('id')
          .in('role', participants.map(p => p.role));

        if (!usersError && targetUsers && targetUsers.length > 0) {
          // Mark notifications as read for all users
          await Promise.all(
            targetUsers.map(user => 
              NotificationService.markDiscussionNotificationsAsRead(user.id, discussionId)
            )
          );
        }
      } catch (markReadError) {
        console.error('Failed to mark discussion notifications as read:', markReadError);
        // Don't throw error here as the deletion was successfully completed
      }

      // Send notification for discussion deletion
      if (user && discussionData && participants && participants.length > 0) {
        try {
          // Get all users with these roles except the current user
          const { data: targetUsers, error: usersError } = await supabase
            .from('profiles')
            .select('id')
            .in('role', participants.map(p => p.role))
            .neq('id', user.id);

          if (!usersError && targetUsers && targetUsers.length > 0) {
            await supabase.functions.invoke('send-notification', {
              body: {
                type: 'system_maintenance',
                title: 'Discussion Deleted',
                body: `${user.user_metadata?.first_name || user.email} deleted the discussion "${discussionData.title}".`,
                data: {
                  discussionTitle: discussionData.title,
                  deletedBy: user.user_metadata?.first_name || user.email,
                  deleteType: 'discussion_deleted'
                },
                targetUsers: targetUsers.map(u => u.id)
              },
            });
          }
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
          // Don't throw error here as the deletion was successfully completed
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      queryClient.invalidateQueries({ queryKey: ['discussionsCount'] });
      setDiscussionToDelete(null);
    },
  });

  const handleSaveDiscussion = (discussionData: any) => {
    if (editingDiscussion) {
      updateDiscussionMutation.mutate({ ...discussionData, id: editingDiscussion.id });
    } else {
      createDiscussionMutation.mutate(discussionData);
    }
  };

  const openEditDialog = async (discussion: any) => {
    const participants = await fetchDiscussionParticipants(discussion.id);
    setEditingDiscussion({ ...discussion, participants });
    setIsNewDiscussionOpen(true);
  };

  const closeAndResetDialog = () => {
    setIsNewDiscussionOpen(false);
    setEditingDiscussion(null);
  };

  const totalPages = Math.ceil(discussionsCount / rowsPerPage);

  return (
    <div className="space-y-8">
      {/* Deleted Discussion Message */}
      {showDeletedMessage && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-700 rounded-2xl p-6 mb-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-800 dark:text-amber-200 mb-2">
                Discussion Not Found
              </h3>
              <p className="text-base text-amber-700 dark:text-amber-300 leading-relaxed">
                The discussion you were looking for has been deleted. All related notifications have been automatically marked as read.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowDeletedMessage(false);
                hasShownDeletedMessage.current = false;
                // Clear the query parameter when dismissing
                navigate(location.pathname, { replace: true });
              }}
              className="flex-shrink-0 h-10 w-10 p-0 text-amber-600 dark:text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/20 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
      


      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-4 md:p-8 rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  Discussions
                </h1>
                <p className="text-sm md:text-lg text-muted-foreground font-light">
                  Engage with the community and participate in course discussions
                </p>
              </div>
            </div>
            
            {!isProfileLoading && profile?.role !== 'student' && (
              <Button 
                onClick={() => setIsNewDiscussionOpen(true)}
                className="h-10 px-6 rounded-xl bg-gradient-to-r from-brand-green-500 to-brand-green-600 hover:from-brand-green-600 hover:to-brand-green-500 text-white shadow-lg hover:shadow-xl hover:shadow-brand-green-500/25 transition-all duration-300 hover:-translate-y-0.5"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Discussion
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards - Clean Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Discussions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{discussionsCount}</div>
            <p className="text-xs text-muted-foreground">
              All discussions
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Discussions</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{discussions.filter(d => d.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Announcements</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{discussions.filter(d => d.discussion_type === 'announcement').length}</div>
            <p className="text-xs text-muted-foreground">
              Official announcements
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{discussions.filter(d => d.discussion_type === 'question').length}</div>
            <p className="text-xs text-muted-foreground">
              Student questions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search discussions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5">
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              <SelectItem value="general">General Discussion</SelectItem>
              {isLoadingCourses ? (
                <SelectItem value="loading" disabled>Loading courses...</SelectItem>
              ) : (
                courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full sm:w-[120px] h-9 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="regular">Regular Post</SelectItem>
              <SelectItem value="announcement">Announcement</SelectItem>
              <SelectItem value="question">Question</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Discussions List */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">
            Discussions ({discussions.length})
          </h2>
        </div>

        {isFetching ? (
          <ContentLoader message="Loading discussions..." />
        ) : discussions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No discussions found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Try adjusting your search or filters' : (!isProfileLoading && profile?.role !== 'student' ? 'Start the conversation by creating a new discussion' : 'No discussions available to view.')}
              </p>
              {!isProfileLoading && profile?.role !== 'student' && (
              <Button 
                onClick={() => setIsNewDiscussionOpen(true)}
                className="bg-gradient-to-r from-brand-green-500 to-brand-green-600 hover:from-brand-green-600 hover:to-brand-green-500 text-white shadow-lg hover:shadow-xl hover:shadow-brand-green-500/25 transition-all duration-300 hover:-translate-y-0.5 rounded-xl px-6 py-2"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Discussion
              </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {discussions.map((discussion) => (
              <Card 
                key={discussion.id} 
                className="group relative bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/60 dark:border-gray-700/60 hover:border-gray-300/80 dark:hover:border-gray-600/80 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 rounded-3xl overflow-hidden backdrop-blur-sm cursor-pointer hover:-translate-y-1"
                onClick={() => navigate(`/dashboard/discussion/${discussion.id}`)}
              >
                {/* Subtle accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <CardContent className="p-6">
                  <div className="flex items-start gap-5">
                    {/* Enhanced Avatar */}
                    <div className="flex-shrink-0">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300">
                        <AvatarImage src={undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 via-primary/30 to-primary/40 text-primary font-semibold text-lg shadow-lg">
                          {discussion.creator_first_name?.[0]}{discussion.creator_last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    {/* Main Content */}
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Title and Badges */}
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors duration-300">
                          {discussion.title}
                        </h3>
                        {discussion.discussion_type && (
                          <Badge variant="blue" className="text-xs capitalize font-medium shadow-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
                            {discussion.discussion_type}
                          </Badge>
                        )}
                        {discussion.course_title ? (
                          <Badge variant="outline" className="text-xs font-medium shadow-sm border-gray-300/60 dark:border-gray-600/60 bg-gray-50/80 dark:bg-gray-800/80">
                            {discussion.course_title}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs font-medium shadow-sm border-gray-300/60 dark:border-gray-600/60 bg-gray-50/80 dark:bg-gray-800/80">
                            General Discussion
                          </Badge>
                        )}
                      </div>
                      
                      {/* Content Preview */}
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed font-medium">
                        {discussion.content}
                      </p>
                      
                      {/* Author and Date */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{discussion.creator_first_name} {discussion.creator_last_name}</span>
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        <span className="font-medium">{format(new Date(discussion.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    
                    {/* Engagement Metrics and Actions */}
                    <div className="flex flex-col items-end gap-4 text-sm text-muted-foreground">
                      {/* Engagement Stats */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 group/stat">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-400/20 via-blue-500/30 to-blue-600/20 rounded-xl flex items-center justify-center shadow-lg ring-1 ring-blue-500/20 group-hover/stat:ring-blue-500/40 transition-all duration-300">
                            <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                          </div>
                          <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-[20px] text-center">
                            {discussion.replies_count}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 group/stat">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-400/20 via-green-500/30 to-green-600/20 rounded-xl flex items-center justify-center shadow-lg ring-1 ring-green-500/20 group-hover/stat:ring-green-500/40 transition-all duration-300">
                            <ThumbsUp className="h-4 w-4 text-green-600 dark:text-green-500" />
                          </div>
                          <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-[20px] text-center">
                            {discussion.likes_count}
                          </span>
                        </div>
                      </div>
                      
                      {/* Action Menu */}
                      {!isProfileLoading && (user?.id === discussion.creator_id || profile?.role === 'admin') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-9 w-9 p-0 rounded-xl hover:bg-gray-100/80 hover:text-gray-900 dark:hover:bg-gray-800/80 dark:hover:text-gray-100 hover:shadow-lg transition-all duration-300"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60">
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(discussion);
                              }}
                              className="rounded-xl cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-gray-200/60 dark:bg-gray-700/60" />
                            <DropdownMenuItem
                              className="text-red-600 rounded-xl cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDiscussionToDelete(discussion);
                              }}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Enhanced Pagination */}
        {!isFetching && totalPages > 0 && (
          <div className="mt-8 flex justify-center">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-9 px-4 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
                             <div className="flex items-center space-x-1">
                 {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                   <Button
                     key={page}
                     variant={currentPage === page ? "default" : "outline"}
                     size="sm"
                     onClick={() => setCurrentPage(page)}
                     className={`w-9 h-9 rounded-xl transition-all duration-300 ${
                       currentPage === page
                         ? "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 border-0"
                         : "bg-background border border-input shadow-sm hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                     }`}
                   >
                     {page}
                   </Button>
                 ))}
               </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-9 px-4 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
            </div>

      <DiscussionDialog
        key={isNewDiscussionOpen ? 'new' : 'edit'} // Force re-render when dialog opens
        isOpen={isNewDiscussionOpen}
        onOpenChange={closeAndResetDialog}
        editingDiscussion={editingDiscussion}
        onSave={handleSaveDiscussion}
        isSaving={createDiscussionMutation.isPending || updateDiscussionMutation.isPending}
        courses={courses}
        isLoadingCourses={isLoadingCourses}
      />

      <AlertDialog open={!!discussionToDelete} onOpenChange={(isOpen) => !isOpen && setDiscussionToDelete(null)}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this discussion and all of its replies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteDiscussionMutation.mutate(discussionToDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 