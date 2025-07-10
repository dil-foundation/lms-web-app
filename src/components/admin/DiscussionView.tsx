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
} from 'lucide-react';
import { Link } from 'react-router-dom';

const discussion = {
  id: 1,
  author: 'Nasir Mahmood',
  authorInitials: 'NM',
  title: 'THIS IS TEST ANNOUNCEMENT',
  content: 'BRING YOU IDS',
  type: 'Announcement',
  date: 'Jun 24, 2025, 01:11 AM',
  likes: 0,
  repliesCount: 4,
};

const replies = [
  {
    id: 1,
    author: 'Student2',
    authorInitials: 'S',
    content: 'Thanks Teacher',
    date: 'Jun 24, 2025, 01:13 AM',
    likes: 0,
  },
  {
    id: 2,
    author: 'Demo Admin',
    authorInitials: 'DA',
    content: 'Hi',
    date: 'Jul 5, 2025, 12:34 PM',
    likes: 1,
  },
];

export const DiscussionView = () => {
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
                src={`https://api.dicebear.com/6.x/initials/svg?seed=${discussion.author}`}
              />
              <AvatarFallback>{discussion.authorInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{discussion.author}</p>
                  <span className="text-xs text-muted-foreground">•</span>
                  <p className="text-xs text-muted-foreground">
                    {discussion.date}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      discussion.type === 'Announcement' ? 'default' : 'secondary'
                    }
                  >
                    {discussion.type}
                  </Badge>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <h3 className="font-bold text-lg mt-2">{discussion.title}</h3>
              <p className="text-muted-foreground mt-1">{discussion.content}</p>
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ThumbsUp className="h-4 w-4" /> {discussion.likes}
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  {discussion.repliesCount} replies
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
            <Textarea placeholder="Write your reply here..." />
            <div className="flex justify-end">
              <Button>
                <Send className="mr-2 h-4 w-4" />
                Post Reply
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
        <div className="space-y-4">
          {replies.map((reply) => (
            <Card key={reply.id}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={`https://api.dicebear.com/6.x/initials/svg?seed=${reply.author}`}
                    />
                    <AvatarFallback>{reply.authorInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <p className="font-semibold">{reply.author}</p>
                        <p className="text-muted-foreground">{reply.date}</p>
                      </div>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-foreground mt-1">
                      {reply.content}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 px-2"
                      >
                        <ThumbsUp className="h-4 w-4" /> {reply.likes}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}; 