import { useState, useEffect } from 'react';
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
  Send,
  Filter,
  SortDesc,
  Users,
  BookOpen,
  AlertCircle,
  Edit,
  Trash
} from 'lucide-react';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
  const { user } = useAuth();
  const { profile, loading: isProfileLoading } = useUserProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

      const participantsToInsert = newDiscussion.participants.map((role: string) => ({
        discussion_id: discussionData.id,
        role,
      }));

      const { error: participantsError } = await supabase
        .from('discussion_participants')
        .insert(participantsToInsert);

      if (participantsError) throw new Error(participantsError.message);

      return discussionData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
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

      // Delete and re-insert participants
      await supabase.from('discussion_participants').delete().eq('discussion_id', discussionToUpdate.id);
      
      const participantsToInsert = discussionToUpdate.participants.map((role: string) => ({
        discussion_id: discussionToUpdate.id,
        role,
      }));

      await supabase.from('discussion_participants').insert(participantsToInsert);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      closeAndResetDialog();
    },
  });

  const deleteDiscussionMutation = useMutation({
    mutationFn: async (discussionId: string) => {
      const { error } = await supabase.from('discussions').delete().eq('id', discussionId);
      if (error) throw new Error(error.message);
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
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  Discussions
                </h1>
                <p className="text-lg text-muted-foreground font-light">
                  Engage with the community and participate in course discussions
                </p>
              </div>
            </div>
            
            {profile?.role !== 'student' && (
              <Button 
                onClick={() => setIsNewDiscussionOpen(true)}
                className="h-10 px-6 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
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
                {searchTerm ? 'Try adjusting your search or filters' : (profile?.role !== 'student' ? 'Start the conversation by creating a new discussion' : 'No discussions available to view.')}
              </p>
              {profile?.role !== 'student' && (
              <Button 
                onClick={() => setIsNewDiscussionOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Discussion
              </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {discussions.map((discussion) => (
              <Card 
                key={discussion.id} 
                className="hover:shadow-md transition-all cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/dashboard/discussion/${discussion.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={undefined} />
                      <AvatarFallback className="bg-green-100 text-green-700">
                          {discussion.creator_first_name?.[0]}{discussion.creator_last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-base truncate">
                          {discussion.title}
                        </h3>
                          {discussion.discussion_type && (
                            <Badge variant="secondary" className="text-xs capitalize">
                              {discussion.discussion_type}
                            </Badge>
                          )}
                          {discussion.course_title ? (
                            <Badge variant="outline" className="text-xs">
                              {discussion.course_title}
                            </Badge>
                          ) : (
                        <Badge variant="outline" className="text-xs">
                              General Discussion
                        </Badge>
                          )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {discussion.content}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="font-medium">{discussion.creator_first_name} {discussion.creator_last_name}</span>
                        <span>•</span>
                          <span>{format(new Date(discussion.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                          <span>{discussion.replies_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-4 w-4" />
                          <span>{discussion.likes_count}</span>
                      </div>
                        {(user?.id === discussion.creator_id || profile?.role === 'admin') && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(discussion);
                              }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                          <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
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

        {!isFetching && totalPages > 0 && (
          <Pagination className="mt-6">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage((prev) => Math.max(1, prev - 1));
                  }}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(page);
                    }}
                    isActive={currentPage === page}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                  }}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
            </div>

      <DiscussionDialog
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