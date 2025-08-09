import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  MessageCircle,
  MoreHorizontal,
  Send,
  ThumbsUp,
  Edit,
  Trash,
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { useUserProfile } from '@/hooks/useUserProfile';
import { DiscussionDialog } from '@/components/discussions/DiscussionDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

const fetchDiscussion = async (id: string) => {
  const { data, error } = await supabase
    .rpc('get_discussion_details', { p_discussion_id: id })
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const fetchReplies = async (discussionId: string) => {
  const { data, error } = await supabase.rpc('get_discussion_replies', { p_discussion_id: discussionId });

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
  if (error) throw new Error(error.message);
  return data;
};

export const DiscussionViewPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();
  const [replyContent, setReplyContent] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDiscussion, setEditingDiscussion] = useState<any | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [replyToDelete, setReplyToDelete] = useState<any | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editedReplyContent, setEditedReplyContent] = useState('');
  const navigate = useNavigate();

  const { data: discussion, isLoading: isLoadingDiscussion } = useQuery({
    queryKey: ['discussion', id],
    queryFn: () => fetchDiscussion(id!),
    enabled: !!id,
  });

  const { data: courses = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ['userCourses'],
    queryFn: fetchUserCourses,
  });

  const { data: replies = [], isLoading: isLoadingReplies } = useQuery({
    queryKey: ['replies', id],
    queryFn: () => fetchReplies(id!),
    enabled: !!id,
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
      
      await supabase.from('discussion_participants').delete().eq('discussion_id', discussionToUpdate.id);
      
      const participantsToInsert = discussionToUpdate.participants.map((role: string) => ({
        discussion_id: discussionToUpdate.id,
        role,
      }));

      await supabase.from('discussion_participants').insert(participantsToInsert);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion', id] });
      setIsEditDialogOpen(false);
      setEditingDiscussion(null);
    },
  });

  const deleteDiscussionMutation = useMutation({
    mutationFn: async (discussionId: string) => {
      const { error } = await supabase.from('discussions').delete().eq('id', discussionId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      navigate('/dashboard/discussion');
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (replyId: string) => {
      const { error } = await supabase.from('discussion_replies').delete().eq('id', replyId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replies', id] });
      setReplyToDelete(null);
    },
  });

  const updateReplyMutation = useMutation({
    mutationFn: async (replyToUpdate: { id: string; content: string }) => {
      const { error } = await supabase
        .from('discussion_replies')
        .update({ content: replyToUpdate.content })
        .eq('id', replyToUpdate.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replies', id] });
      setEditingReplyId(null);
      setEditedReplyContent('');
    },
  });

  const createReplyMutation = useMutation({
    mutationFn: async (newReply: { content: string; parent_reply_id?: string }) => {
      const { data, error } = await supabase
        .from('discussion_replies')
        .insert({
          discussion_id: id,
          user_id: user?.id,
          content: newReply.content,
          parent_reply_id: newReply.parent_reply_id,
        });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replies', id] });
      setReplyContent('');
    },
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async ({ discussionId, replyId }: { discussionId?: string; replyId?: string }) => {
      if (!user) return;
      const { error } = await supabase.rpc('toggle_like', {
        p_user_id: user.id,
        p_discussion_id: discussionId,
        p_reply_id: replyId,
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion', id] });
      queryClient.invalidateQueries({ queryKey: ['replies', id] });
    },
  });

  const handleReplySubmit = () => {
    if (replyContent.trim()) {
      createReplyMutation.mutate({ content: replyContent });
    }
  };

  const handleUpdateReply = () => {
    if (editingReplyId && editedReplyContent.trim()) {
      updateReplyMutation.mutate({ id: editingReplyId, content: editedReplyContent });
    }
  };

  const handleSaveDiscussion = (discussionData: any) => {
    if (editingDiscussion) {
      updateDiscussionMutation.mutate({ ...discussionData, id: editingDiscussion.id });
    }
  };

  const openEditDialog = async () => {
    if (!discussion) return;
    const participants = await fetchDiscussionParticipants(discussion.id);
    const discussionForEdit = {
      ...discussion,
      participants,
      course_id: discussion.course_id,
      discussion_type: discussion.discussion_type
    };
    setEditingDiscussion(discussionForEdit);
    setIsEditDialogOpen(true);
  };

  if (isLoadingDiscussion) {
    return <p>Loading discussion...</p>;
  }

  if (!discussion) {
    return <p>Discussion not found.</p>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <Link
        to="/dashboard/discussion"
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Discussions
      </Link>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <Avatar>
              <AvatarImage
                src={undefined}
              />
              <AvatarFallback>{discussion.creator_first_name?.[0]}{discussion.creator_last_name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{discussion.creator_first_name} {discussion.creator_last_name}</p>
                  <span className="text-xs text-muted-foreground">•</span>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(discussion.created_at), 'MMM d, yyyy, p')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {discussion.discussion_type && (
                    <Badge variant="secondary" className="capitalize text-xs">
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
                  {(user?.id === discussion.creator_id || profile?.role === 'admin') && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={openEditDialog}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => setIsDeleteDialogOpen(true)}>
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
              <h3 className="font-bold text-lg mt-2">{discussion.title}</h3>
              <p className="text-muted-foreground mt-1">{discussion.content}</p>
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                    <Button
                                variant="outline"
                                size="sm"
                                className={`gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${discussion.is_liked_by_user ? 'text-primary border-primary' : ''}`}
                                onClick={() => toggleLikeMutation.mutate({ discussionId: discussion.id })}
                                disabled={toggleLikeMutation.isPending}
                            >
                                <ThumbsUp className={`h-4 w-4 ${discussion.is_liked_by_user ? 'fill-current' : ''}`} /> {discussion.likes_count}
                    </Button>
                </div>
                <div className="flex items-center gap-1">
                  {replies.length} replies
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Add Your Reply</h3>
          </div>
          <div className="grid w-full gap-2">
            <Textarea
              placeholder="Write your reply here..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={handleReplySubmit} disabled={createReplyMutation.isPending}>
                {createReplyMutation.isPending ? 'Replying...' : <><Send className="mr-2 h-4 w-4" />Post Reply</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Replies ({replies.length})</h3>
        </div>
        {isLoadingReplies ? (
          <p>Loading replies...</p>
        ) : (
          <div className="space-y-4">
            {replies.map((reply) => (
              <Card key={reply.id}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={undefined}
                      />
                      <AvatarFallback>{reply.user_first_name?.[0]}{reply.user_last_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <p className="font-semibold">{reply.user_first_name} {reply.user_last_name}</p>
                          <p className="text-muted-foreground">{format(new Date(reply.created_at), 'MMM d, yyyy, p')}</p>
                        </div>
                        {(user?.id === reply.user_id || profile?.role === 'admin') && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => {
                                setEditingReplyId(reply.id);
                                setEditedReplyContent(reply.content);
                              }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => setReplyToDelete(reply)}>
                                <Trash className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      {editingReplyId === reply.id ? (
                        <div className="mt-2 space-y-2">
                          <Textarea
                            value={editedReplyContent}
                            onChange={(e) => setEditedReplyContent(e.target.value)}
                            className="min-h-[80px]"
                          />
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setEditingReplyId(null)}
                              className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleUpdateReply} disabled={updateReplyMutation.isPending}>
                              {updateReplyMutation.isPending ? 'Saving...' : 'Update Reply'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-foreground mt-1">
                            {reply.content}
                          </p>
                          <div className="flex items-center gap-1 mt-2">
                                                        <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`gap-1.5 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${reply.is_liked_by_user ? 'text-primary' : ''}`}
                                    onClick={() => toggleLikeMutation.mutate({ replyId: reply.id })}
                                    disabled={toggleLikeMutation.isPending}
                                >
                                    <ThumbsUp className={`h-4 w-4 ${reply.is_liked_by_user ? 'fill-current' : ''}`} />
                                    {reply.likes_count > 0 && <span>{reply.likes_count}</span>}
                                </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <DiscussionDialog
        isOpen={isEditDialogOpen}
        onOpenChange={(isOpen) => {
          setIsEditDialogOpen(isOpen);
          if (!isOpen) setEditingDiscussion(null);
        }}
        editingDiscussion={editingDiscussion}
        onSave={handleSaveDiscussion}
        isSaving={updateDiscussionMutation.isPending}
        courses={courses}
        isLoadingCourses={isLoadingCourses}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this discussion and all of its replies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteDiscussionMutation.mutate(discussion.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!replyToDelete} onOpenChange={(isOpen) => !isOpen && setReplyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this reply.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteReplyMutation.mutate(replyToDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}; 