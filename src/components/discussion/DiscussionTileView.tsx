import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, ThumbsUp, Clock, User, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

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

interface DiscussionTileViewProps {
  discussions: Discussion[];
  onDiscussionClick?: (discussion: Discussion) => void;
  onLike?: (discussionId: string) => void;
  onEdit?: (discussion: Discussion) => void;
  onDelete?: (discussionId: string) => void;
  canModerate?: boolean;
  className?: string;
}

export const DiscussionTileView: React.FC<DiscussionTileViewProps> = ({
  discussions,
  onDiscussionClick,
  onLike,
  onEdit,
  onDelete,
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
      // Small delay for smooth UI transition
      setTimeout(() => {
        onDelete(discussionId);
      }, 100);
    }
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {discussions.map((discussion) => {
          const creatorInfo = getCreatorInfo(discussion);
          return (
          <Card
            key={discussion.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 shadow-sm bg-card/95 backdrop-blur-sm dark:bg-card dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/30 h-40 flex flex-col overflow-hidden"
            onClick={() => handleDiscussionClick(discussion)}
          >
            <CardContent className="p-3 flex flex-col h-full">
              {/* Compact Header with badges */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex flex-wrap gap-1">
                  {discussion.discussion_type && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                      {discussion.discussion_type}
                    </Badge>
                  )}
                  {discussion.is_pinned && (
                    <Badge variant="default" className="text-xs px-1.5 py-0.5 bg-primary">
                      Pinned
                    </Badge>
                  )}
                </div>
              </div>

              {/* Compact Title */}
              <h3 className="font-medium text-xs leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors mb-2 flex-1">
                {discussion.title}
              </h3>

              {/* Compact Author info */}
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                    {creatorInfo.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {creatorInfo.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(discussion.created_at), 'MMM d')}
                  </p>
                </div>
              </div>

              {/* Compact Engagement stats and actions */}
              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    <span className="font-medium">{discussion.replies_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" />
                    <span className="font-medium">{discussion.likes_count}</span>
                  </div>
                </div>

                {/* Compact Action buttons */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-primary/10 hover:text-primary"
                    onClick={(e) => handleLike(e, discussion.id)}
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </Button>
                  
                  {canModerate && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-blue-500/10 hover:text-blue-500"
                        onClick={(e) => handleEdit(e, discussion)}
                      >
                        <User className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-red-500/10 hover:text-red-500"
                        onClick={(e) => handleDelete(e, discussion.id)}
                      >
                        <Clock className="w-3 h-3" />
                      </Button>
                    </>
                  )}
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
