import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageSquare,
  FileText,
  Megaphone,
  Clock,
  Search,
  MoreHorizontal,
  ThumbsUp,
  MessageCircle,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const statCards = [
  {
    title: 'Total Discussions',
    value: '2',
    description: 'Across all courses',
    icon: MessageSquare,
  },
  {
    title: 'Course Discussions',
    value: '2',
    description: 'Course-specific topics',
    icon: FileText,
  },
  {
    title: 'Announcements',
    value: '2',
    description: 'Official announcements',
    icon: Megaphone,
  },
  {
    title: 'Recent Activity',
    value: '0',
    description: 'New in the last 7 days',
    icon: Clock,
  },
];

const discussions = [
  {
    id: 1,
    author: 'Nasir Mahmood',
    authorInitials: 'NM',
    title: 'THIS IS TEST ANNOUNCEMENT',
    content: 'BRING YOU IDS',
    type: 'Announcement',
    date: 'Jun 24',
    comments: 4,
    likes: 8,
  },
  {
    id: 2,
    author: 'Nasir Mahmood',
    authorInitials: 'NM',
    title: 'THIS IS A TEST ANNOUNCEMENT',
    content: 'BRING YOU IDs to the principal\'s office to pick up replacements',
    type: 'Announcement',
    date: 'Jun 24',
    comments: 0,
    likes: 7,
  },
];

const NewDiscussionDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <div className="flex items-center space-x-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <DialogTitle>Start a New Discussion</DialogTitle>
            <DialogDescription>
              Share your thoughts, ask questions, or make an announcement.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="type">Type</Label>
          <Select defaultValue="regular">
            <SelectTrigger id="type">
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="regular">Regular Post</SelectItem>
              <SelectItem value="announcement">Announcement</SelectItem>
              <SelectItem value="question">Question</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="title">Title (optional)</Label>
          <Input id="title" placeholder="Enter title" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="course">Course (optional)</Label>
          <Select>
            <SelectTrigger id="course">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="course1">Course 1</SelectItem>
              <SelectItem value="course2">Course 2</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Leave empty for general discussions visible to everyone.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="content">Content *</Label>
          <Textarea id="content" placeholder="What would you like to discuss?" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button>Create Discussion</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const Discussions = () => {
  const [isNewDiscussionOpen, setIsNewDiscussionOpen] = useState(false);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Discussions</h1>
          <p className="text-muted-foreground">
            Engage with the community and participate in course discussions.
          </p>
        </div>
        <Button onClick={() => setIsNewDiscussionOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Discussion
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="relative flex-1 md:grow-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search discussions..."
                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Select>
                <SelectTrigger className="w-full sm:w-auto">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-full sm:w-auto">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-full sm:w-auto">
                  <SelectValue placeholder="Most Recent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Discussions (2)</h2>
            </div>
            <div className="space-y-4">
              {discussions.map((discussion) => (
                <Link to={`/dashboard/discussion/${discussion.id}`} key={discussion.id} className="block hover:bg-muted/50 rounded-lg">
                  <div className="flex items-start space-x-4 p-4">
                    <Avatar>
                      <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${discussion.author}`} />
                      <AvatarFallback>{discussion.authorInitials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{discussion.author}</p>
                          <span className="text-xs text-muted-foreground">•</span>
                          <p className="text-xs text-muted-foreground">{discussion.date}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => e.preventDefault()}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => e.preventDefault()}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <h3 className="font-bold text-lg">{discussion.title}</h3>
                      <p className="text-muted-foreground mt-1">{discussion.content}</p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <Badge variant={discussion.type === 'Announcement' ? 'default' : 'secondary'}>
                          {discussion.type}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" /> {discussion.comments}
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4" /> {discussion.likes}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <NewDiscussionDialog
        open={isNewDiscussionOpen}
        onOpenChange={setIsNewDiscussionOpen}
      />
    </div>
  );
}; 