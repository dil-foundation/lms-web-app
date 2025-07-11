import { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';

// Mock data for discussions - in production this would come from a database
const discussionStats = [
  {
    title: 'Total Discussions',
    value: '1',
    description: 'Across all courses',
    icon: MessageSquare,
    color: 'text-blue-600'
  },
  {
    title: 'Course Discussions',
    value: '0',
    description: 'Course-specific topics',
    icon: FileText,
    color: 'text-green-600'
  },
  {
    title: 'Announcements',
    value: '0',
    description: 'Official announcements',
    icon: Megaphone,
    color: 'text-purple-600'
  },
  {
    title: 'Recent Activity',
    value: '1',
    description: 'New in the last 7 days',
    icon: Clock,
    color: 'text-orange-600'
  }
];

const mockDiscussions = [
  {
    id: 1,
    title: 'test',
    content: 'Hello',
    author: 'Demo Teacher',
    authorInitials: 'DT',
    date: 'Just now',
    fullDate: 'Jul 10, 2025, 06:47 PM',
    type: 'Regular Post',
    replies: 0,
    likes: 8,
    course: null,
    isLiked: false,
    avatar: null
  }
];

export default function DiscussionsPage() {
  const [isNewDiscussionOpen, setIsNewDiscussionOpen] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  // New discussion form state
  const [newDiscussion, setNewDiscussion] = useState({
    type: 'regular',
    title: '',
    course: 'general',
    content: ''
  });

  const handleNewDiscussion = () => {
    // In production, this would create a new discussion
    console.log('Creating new discussion:', newDiscussion);
    setIsNewDiscussionOpen(false);
    setNewDiscussion({
      type: 'regular',
      title: '',
      course: 'general',
      content: ''
    });
  };

  const handleDiscussionClick = (discussion: any) => {
    setSelectedDiscussion(discussion);
  };

  const handleBackToDiscussions = () => {
    setSelectedDiscussion(null);
  };

  const handleLike = (discussionId: number) => {
    // In production, this would toggle like status
    console.log('Toggling like for discussion:', discussionId);
  };

  const handleReply = (content: string) => {
    // In production, this would add a reply
    console.log('Adding reply:', content);
  };

  // Filter discussions based on search and filters
  const filteredDiscussions = mockDiscussions.filter(discussion => {
    const matchesSearch = discussion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         discussion.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = selectedCourse === 'all' || 
                         discussion.course === selectedCourse || 
                         (selectedCourse === 'general' && !discussion.course);
    const matchesType = selectedType === 'all' || discussion.type.toLowerCase().includes(selectedType.toLowerCase());
    
    return matchesSearch && matchesCourse && matchesType;
  });

  if (selectedDiscussion) {
    return <DiscussionDetailView 
      discussion={selectedDiscussion}
      onBack={handleBackToDiscussions}
      onLike={handleLike}
      onReply={handleReply}
    />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discussions</h1>
          <p className="text-muted-foreground">
            Engage with the community and participate in course discussions.
          </p>
        </div>
        <Button 
          onClick={() => setIsNewDiscussionOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Discussion
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {discussionStats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search discussions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              <SelectItem value="general">General Discussion</SelectItem>
              <SelectItem value="javascript">JavaScript Basics</SelectItem>
              <SelectItem value="react">React Fundamentals</SelectItem>
              <SelectItem value="nodejs">Node.js Backend</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="regular">Regular Post</SelectItem>
              <SelectItem value="announcement">Announcement</SelectItem>
              <SelectItem value="question">Question</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Most Recent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="replies">Most Replies</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Discussions List */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">
            Discussions ({filteredDiscussions.length})
          </h2>
        </div>

        {filteredDiscussions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No discussions found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Try adjusting your search or filters' : 'Start the conversation by creating a new discussion'}
              </p>
              <Button 
                onClick={() => setIsNewDiscussionOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Discussion
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredDiscussions.map((discussion) => (
              <Card 
                key={discussion.id} 
                className="hover:shadow-md transition-all cursor-pointer hover:bg-muted/50"
                onClick={() => handleDiscussionClick(discussion)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={discussion.avatar} />
                      <AvatarFallback className="bg-green-100 text-green-700">
                        {discussion.authorInitials}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-base truncate">
                          {discussion.title}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {discussion.type}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {discussion.content}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-medium">{discussion.author}</span>
                        <span>•</span>
                        <span>{discussion.date}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>{discussion.replies}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-4 w-4" />
                        <span>{discussion.likes}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Pin</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New Discussion Dialog */}
      <Dialog open={isNewDiscussionOpen} onOpenChange={setIsNewDiscussionOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              Start a New Discussion
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Share your thoughts, ask questions, or make an announcement.
            </p>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select 
                value={newDiscussion.type} 
                onValueChange={(value) => setNewDiscussion({...newDiscussion, type: value})}
              >
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

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter title (optional)"
                value={newDiscussion.title}
                onChange={(e) => setNewDiscussion({...newDiscussion, title: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              <Select 
                value={newDiscussion.course} 
                onValueChange={(value) => setNewDiscussion({...newDiscussion, course: value})}
              >
                <SelectTrigger id="course">
                  <SelectValue placeholder="Select course (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Discussion</SelectItem>
                  <SelectItem value="javascript">JavaScript Basics</SelectItem>
                  <SelectItem value="react">React Fundamentals</SelectItem>
                  <SelectItem value="nodejs">Node.js Backend</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Leave empty for general discussions visible to everyone.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content <span className="text-red-500">*</span></Label>
              <Textarea
                id="content"
                placeholder="What would you like to discuss?"
                className="min-h-[100px]"
                value={newDiscussion.content}
                onChange={(e) => setNewDiscussion({...newDiscussion, content: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsNewDiscussionOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleNewDiscussion}
              disabled={!newDiscussion.content.trim()}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Create Discussion
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Discussion Detail View Component
function DiscussionDetailView({ 
  discussion, 
  onBack, 
  onLike, 
  onReply 
}: { 
  discussion: any;
  onBack: () => void;
  onLike: (id: number) => void;
  onReply: (content: string) => void;
}) {
  const [replyContent, setReplyContent] = useState('');

  const handleReplySubmit = () => {
    if (replyContent.trim()) {
      onReply(replyContent);
      setReplyContent('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Discussions
      </Button>

      {/* Discussion Content */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={discussion.avatar} />
              <AvatarFallback className="bg-green-100 text-green-700">
                {discussion.authorInitials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">{discussion.title}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <span className="font-medium text-foreground">{discussion.author}</span>
                  <span>•</span>
                  <span>{discussion.fullDate}</span>
                </div>
                <p className="text-base leading-relaxed">{discussion.content}</p>
              </div>
              
              <div className="flex items-center gap-4 pt-4 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onLike(discussion.id)}
                  className="flex items-center gap-2"
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>{discussion.likes}</span>
                </Button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  <span>{discussion.replies} replies</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Pin</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reply Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-2 mb-4">
            <MessageCircle className="h-5 w-5 text-primary mt-0.5" />
            <h3 className="text-lg font-semibold">Add Your Reply</h3>
          </div>
          
          <div className="space-y-4">
            <Textarea
              placeholder="Write your reply here..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleReplySubmit}
                disabled={!replyContent.trim()}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Send className="mr-2 h-4 w-4" />
                Post Reply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Replies Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Replies ({discussion.replies})</h3>
          </div>
          
          {discussion.replies === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-medium mb-2">No replies yet. Be the first to reply!</h4>
              <p className="text-muted-foreground">
                Share your thoughts and engage with the discussion.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Replies would be rendered here */}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 