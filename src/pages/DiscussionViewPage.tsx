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
  ChevronLeft,
  ChevronRight,
  Loader2,
  ChevronDown,
  ChevronUp,
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import React from 'react'; // Added missing import for React.useEffect

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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [repliesPerPage] = useState(10);
  
  // Collapsible state for replies - default to collapsed
  const [collapsedReplies, setCollapsedReplies] = useState<Set<string>>(new Set());
  
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

  // Initialize all replies as collapsed by default
  React.useEffect(() => {
    if (replies.length > 0) {
      const allReplyIds = replies.map(reply => reply.id);
      setCollapsedReplies(new Set(allReplyIds));
    }
  }, [replies]);

  // Client-side pagination
  const totalReplies = replies.length;
  const totalPages = Math.ceil(totalReplies / repliesPerPage);
  const startReply = (currentPage - 1) * repliesPerPage + 1;
  const endReply = Math.min(currentPage * repliesPerPage, totalReplies);
  
  // Get paginated replies
  const paginatedReplies = replies.slice((currentPage - 1) * repliesPerPage, currentPage * repliesPerPage);

  // Reset to first page when new replies are added
  React.useEffect(() => {
    if (replies.length > 0 && currentPage > Math.ceil(replies.length / repliesPerPage)) {
      setCurrentPage(1);
    }
  }, [replies.length, currentPage, repliesPerPage]);

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of replies section smoothly
    const repliesSection = document.getElementById('replies-section');
    if (repliesSection) {
      repliesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleReplyCollapse = (replyId: string) => {
    setCollapsedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(replyId)) {
        newSet.delete(replyId);
      } else {
        newSet.add(replyId);
      }
      return newSet;
    });
  };

  const isReplyCollapsed = (replyId: string) => collapsedReplies.has(replyId);

  if (isLoadingDiscussion) {
    return <p>Loading discussion...</p>;
  }

  if (!discussion) {
    return <p>Discussion not found.</p>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Premium Header Navigation */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
          <div className="relative p-6">
            <Link
              to="/dashboard/discussion"
              className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background/90 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Discussions
            </Link>
          </div>
        </div>

        {/* Main Discussion Card - Enhanced */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-card to-card/95 border-0 shadow-xl shadow-black/5">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"></div>
          <CardContent className="relative p-8">
            <div className="flex items-start space-x-6">
              <div className="relative">
                <Avatar className="h-12 w-12 ring-4 ring-background shadow-lg">
                  <AvatarImage
                    src={undefined}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold text-lg">
                    {discussion.creator_first_name?.[0]}{discussion.creator_last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-bold text-lg text-foreground">{discussion.creator_first_name} {discussion.creator_last_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(discussion.created_at), 'MMM d, yyyy, p')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {discussion.discussion_type && (
                      <Badge variant="blue" className="capitalize text-xs font-medium">
                        {discussion.discussion_type}
                      </Badge>
                    )}
                    {discussion.course_title ? (
                      <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary">
                        {discussion.course_title}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary">
                        General Discussion
                      </Badge>
                    )}
                    {(user?.id === discussion.creator_id || profile?.role === 'admin') && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-9 w-9 p-0 rounded-lg hover:bg-accent/50 transition-all duration-300">
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
                <h3 className="font-bold text-2xl mb-3 text-foreground">{discussion.title}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">{discussion.content}</p>
                <div className="flex items-center gap-6 text-sm">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`gap-2 px-4 py-2 rounded-lg border-primary/30 hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 ${discussion.is_liked_by_user ? 'text-primary border-primary bg-primary/5' : ''}`}
                    onClick={() => toggleLikeMutation.mutate({ discussionId: discussion.id })}
                    disabled={toggleLikeMutation.isPending}
                  >
                    <ThumbsUp className={`h-4 w-4 ${discussion.is_liked_by_user ? 'fill-current' : ''}`} />
                    {discussion.likes_count} {discussion.likes_count === 1 ? 'like' : 'likes'}
                  </Button>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    {totalReplies} {totalReplies === 1 ? 'reply' : 'replies'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Reply Section - Enhanced */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-card to-card/95 border-0 shadow-xl shadow-black/5">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"></div>
          <CardContent className="relative p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Add Your Reply</h3>
            </div>
            <div className="space-y-4">
              <Textarea
                placeholder="Write your reply here..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[120px] text-base border-2 border-border/50 focus:border-primary/50 transition-all duration-300 rounded-xl resize-none"
              />
              <div className="flex justify-end">
                <Button 
                  onClick={handleReplySubmit} 
                  disabled={createReplyMutation.isPending}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  {createReplyMutation.isPending ? 'Posting...' : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Post Reply
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Replies Section - Sophisticated Redesign */}
        <div className="space-y-6" id="replies-section">
          {/* Replies Header - Enhanced */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-secondary/10 to-secondary/20 rounded-xl flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Replies ({totalReplies})</h3>
                {totalReplies > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Showing {startReply}-{endReply} of {totalReplies} replies
                  </p>
                )}
              </div>
            </div>
            
            {/* Replies per page selector */}
            {totalReplies > 10 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Show:</span>
                <select 
                  value={repliesPerPage} 
                  onChange={(e) => {
                    // This would need to be implemented with state management
                    console.log('Change replies per page:', e.target.value);
                  }}
                  className="bg-background border border-border rounded-md px-2 py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            )}
          </div>
          
          {isLoadingReplies ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading replies...</span>
              </div>
            </div>
          ) : paginatedReplies.length === 0 ? (
            <Card className="relative overflow-hidden bg-gradient-to-br from-card to-card/95 border-0 shadow-lg shadow-black/5">
              <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 via-transparent to-secondary/5"></div>
              <CardContent className="relative p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-secondary/10 to-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-secondary" />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">No replies yet</h4>
                <p className="text-muted-foreground">Be the first to share your thoughts on this discussion.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {paginatedReplies.map((reply, index) => (
                <div key={reply.id} className="group">
                  <Card className="relative overflow-hidden bg-gradient-to-br from-card to-card/95 border-0 shadow-sm shadow-black/5 hover:shadow-lg transition-all duration-300 group-hover:shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Collapsible Header */}
                    <div className="relative p-4 border-b border-border/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
                            <AvatarImage
                              src={undefined}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground font-medium text-xs">
                              {reply.user_first_name?.[0]}{reply.user_last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground text-sm">{reply.user_first_name} {reply.user_last_name}</p>
                            <span className="text-xs text-muted-foreground">•</span>
                            <p className="text-xs text-muted-foreground">{format(new Date(reply.created_at), 'MMM d, p')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(user?.id === reply.user_id || profile?.role === 'admin') && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-6 w-6 p-0 rounded-md hover:bg-accent/50 transition-all duration-300 opacity-0 group-hover:opacity-100">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleReplyCollapse(reply.id)}
                            className="h-6 w-6 p-0 rounded-md hover:bg-accent/50 transition-all duration-300"
                          >
                            {isReplyCollapsed(reply.id) ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronUp className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Content */}
                    {!isReplyCollapsed(reply.id) && (
                      <CardContent className="relative p-4 pt-3">
                        {editingReplyId === reply.id ? (
                          <div className="space-y-3">
                            <Textarea
                              value={editedReplyContent}
                              onChange={(e) => setEditedReplyContent(e.target.value)}
                              className="min-h-[80px] text-sm border-2 border-border/50 focus:border-primary/50 transition-all duration-300 rounded-lg resize-none"
                            />
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setEditingReplyId(null)}
                                className="px-3 py-1.5 text-xs rounded-lg border-border/50 hover:border-primary/50 transition-all duration-300"
                              >
                                Cancel
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={handleUpdateReply} 
                                disabled={updateReplyMutation.isPending}
                                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-medium shadow-md hover:shadow-lg transition-all duration-300"
                              >
                                {updateReplyMutation.isPending ? 'Saving...' : 'Update'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-foreground text-sm leading-relaxed mb-3">
                              {reply.content}
                            </p>
                            <div className="flex items-center gap-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`gap-1.5 px-2 py-1 text-xs rounded-md hover:bg-accent/50 transition-all duration-300 ${reply.is_liked_by_user ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}
                                onClick={() => toggleLikeMutation.mutate({ replyId: reply.id })}
                                disabled={toggleLikeMutation.isPending}
                              >
                                <ThumbsUp className={`h-3 w-3 ${reply.is_liked_by_user ? 'fill-current' : ''}`} />
                                {reply.likes_count > 0 && <span className="text-xs">{reply.likes_count}</span>}
                              </Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    )}
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) handlePageChange(currentPage - 1);
                    }}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <PaginationItem key={page}>
                    <PaginationLink 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(page);
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
                      if (currentPage < totalPages) handlePageChange(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
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