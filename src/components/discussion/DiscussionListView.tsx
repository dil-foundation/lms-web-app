import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, ThumbsUp, Clock, User, BookOpen, Pin, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Discussion {
  id: string;
  title: string;
  content: string;
  discussion_type?: string;
  course_title?: string;
  creator_first_name?: string;
  creator_last_name?: string;
  creator_id: string | null;
  created_at: string;
  replies_count: number;
  likes_count: number;
  is_pinned?: boolean;
  last_activity?: string;
}

// Helper function to get creator display info
const getCreatorInfo = (discussion: Discussion) => {
  if (!discussion.creator_first_name && !discussion.creator_last_name) {
    return {
      fullName: 'Deleted User',
      initials: 'DU'
    };
  }
  return {
    fullName: `${discussion.creator_first_name || ''} ${discussion.creator_last_name || ''}`.trim(),
    initials: `${discussion.creator_first_name?.[0] || ''}${discussion.creator_last_name?.[0] || ''}`.toUpperCase()
  };
};

interface DiscussionListViewProps {
  discussions: Discussion[];
  onDiscussionClick?: (discussion: Discussion) => void;
  onLike?: (discussionId: string) => void;
  onEdit?: (discussion: Discussion) => void;
  onDelete?: (discussionId: string) => void;
  onPin?: (discussionId: string) => void;
  canModerate?: boolean;
  className?: string;
}

export const DiscussionListView: React.FC<DiscussionListViewProps> = ({
  discussions,
  onDiscussionClick,
  onLike,
  onEdit,
  onDelete,
  onPin,
  canModerate = false,
  className
}) => {
  const handleDiscussionClick = (discussion: Discussion) => {
    if (onDiscussionClick) {
      onDiscussionClick(discussion);
    }
  };

  const handleLike = (e: React.MouseEvent, discussionId: string) => {
    e.stopPropagation();
    if (onLike) {
      onLike(discussionId);
    }
  };

  const handleEdit = (e: React.MouseEvent, discussion: Discussion) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(discussion);
    }
  };

  const handleDelete = (e: React.MouseEvent, discussionId: string) => {
    e.stopPropagation();
    if (onDelete) {
      // Small delay to ensure dropdown is fully closed
      setTimeout(() => {
        onDelete(discussionId);
      }, 100);
    }
  };

  const handlePin = (e: React.MouseEvent, discussionId: string) => {
    e.stopPropagation();
    if (onPin) {
      onPin(discussionId);
    }
  };

  return (
    <div className={className}>
      <div className="space-y-2 sm:space-y-3">
        {discussions.map((discussion) => {
          const creatorInfo = getCreatorInfo(discussion);
          return (
          <Card
            key={discussion.id}
            className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-muted/50 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-border dark:hover:border-border border-l-4 border-l-transparent hover:border-l-primary"
            onClick={() => handleDiscussionClick(discussion)}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0 flex items-center gap-2 sm:flex-col sm:items-center">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                    <AvatarImage src={undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs sm:text-sm">
                      {creatorInfo.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1 sm:hidden text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span className="truncate">{creatorInfo.fullName}</span>
                  </div>
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title and badges */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate flex-1 min-w-0">
                          {discussion.title}
                        </h3>
                        
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {discussion.is_pinned && (
                            <Badge variant="default" className="text-[10px] sm:text-xs bg-primary flex-shrink-0">
                              <Pin className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                              Pinned
                            </Badge>
                          )}

                          {discussion.discussion_type && (
                            <Badge variant="secondary" className="text-[10px] sm:text-xs flex-shrink-0">
                              {discussion.discussion_type}
                            </Badge>
                          )}

                          {discussion.course_title && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs flex-shrink-0">
                              <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                              <span className="hidden sm:inline">{discussion.course_title}</span>
                              <span className="sm:hidden truncate max-w-[80px]">{discussion.course_title}</span>
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Content preview */}
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 sm:line-clamp-2 mb-2">
                        {discussion.content}
                      </p>

                      {/* Author and date */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <div className="hidden sm:flex items-center gap-1">
                          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">{creatorInfo.fullName}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">{format(new Date(discussion.created_at), 'MMM d, yyyy')}</span>
                        </div>

                        {discussion.last_activity && (
                          <div className="hidden sm:flex items-center gap-1">
                            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span>Last activity {format(new Date(discussion.last_activity), 'MMM d')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Engagement stats and actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 sm:ml-4 flex-shrink-0 w-full sm:w-auto">
                      {/* Engagement stats */}
                      <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="font-medium">{discussion.replies_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="font-medium">{discussion.likes_count}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-primary/10 hover:text-primary"
                          onClick={(e) => handleLike(e, discussion.id)}
                        >
                          <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>

                        {canModerate && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-muted"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => handleEdit(e, discussion)}>
                                <User className="w-4 h-4 mr-2" />
                                Edit Discussion
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => handlePin(e, discussion.id)}>
                                <Pin className="w-4 h-4 mr-2" />
                                {discussion.is_pinned ? 'Unpin' : 'Pin'} Discussion
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={(e) => handleDelete(e, discussion.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Clock className="w-4 h-4 mr-2" />
                                Delete Discussion
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>
    </div>
  );
};
