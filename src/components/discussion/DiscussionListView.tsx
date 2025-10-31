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
      <div className="space-y-2">
        {discussions.map((discussion) => {
          const creatorInfo = getCreatorInfo(discussion);
          return (
          <Card
            key={discussion.id}
            className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-muted/50 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-border dark:hover:border-border border-l-4 border-l-transparent hover:border-l-primary"
            onClick={() => handleDiscussionClick(discussion)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {creatorInfo.initials}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Title and badges */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors truncate">
                          {discussion.title}
                        </h3>
                        
                        {discussion.is_pinned && (
                          <Badge variant="default" className="text-xs bg-primary">
                            <Pin className="w-3 h-3 mr-1" />
                            Pinned
                          </Badge>
                        )}

                        {discussion.discussion_type && (
                          <Badge variant="secondary" className="text-xs">
                            {discussion.discussion_type}
                          </Badge>
                        )}

                        {discussion.course_title && (
                          <Badge variant="outline" className="text-xs">
                            <BookOpen className="w-3 h-3 mr-1" />
                            {discussion.course_title}
                          </Badge>
                        )}
                      </div>

                      {/* Content preview */}
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                        {discussion.content}
                      </p>

                      {/* Author and date */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{creatorInfo.fullName}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{format(new Date(discussion.created_at), 'MMM d, yyyy')}</span>
                        </div>

                        {discussion.last_activity && (
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>Last activity {format(new Date(discussion.last_activity), 'MMM d')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Engagement stats and actions */}
                    <div className="flex items-center gap-4 ml-4">
                      {/* Engagement stats */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          <span className="font-medium">{discussion.replies_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4" />
                          <span className="font-medium">{discussion.likes_count}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                          onClick={(e) => handleLike(e, discussion.id)}
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </Button>

                        {canModerate && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-muted"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="w-4 h-4" />
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
