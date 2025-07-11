import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Search,
  Plus,
  Send,
  MoreVertical,
  Info,
  Archive,
  Trash2,
  Pin,
  Clock,
  Check,
  CheckCheck,
  Users,
  MessageCircle,
  Edit3,
  Paperclip
} from 'lucide-react';

// Mock data for chats and messages
interface Message {
  id: string;
  content: string;
  timestamp: string;
  isFromTeacher: boolean;
  status: 'sent' | 'delivered' | 'read';
}

interface Chat {
  id: string;
  studentName: string;
  studentEmail: string;
  studentAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  isPinned: boolean;
  course: string;
  messages: Message[];
}

interface Student {
  id: string;
  name: string;
  email: string;
  avatar: string;
  course: string;
  isOnline: boolean;
}

const mockChats: Chat[] = [
  {
    id: '1',
    studentName: 'Emma Johnson',
    studentEmail: 'emma.j@email.com',
    studentAvatar: 'EJ',
    lastMessage: 'Thank you for the feedback on my assignment!',
    lastMessageTime: '2 mins ago',
    unreadCount: 0,
    isOnline: true,
    isPinned: true,
    course: 'React Fundamentals',
    messages: [
      {
        id: '1',
        content: 'Hi Ms. Johnson, I have a question about the React hooks assignment.',
        timestamp: '10:30 AM',
        isFromTeacher: false,
        status: 'read'
      },
      {
        id: '2',
        content: 'Hi Emma! Of course, what would you like to know?',
        timestamp: '10:32 AM',
        isFromTeacher: true,
        status: 'read'
      },
      {
        id: '3',
        content: 'I\'m having trouble understanding useEffect dependencies.',
        timestamp: '10:35 AM',
        isFromTeacher: false,
        status: 'read'
      },
      {
        id: '4',
        content: 'Great question! Dependencies in useEffect determine when the effect runs. Think of them as "watchers" - the effect only runs when one of these values changes.',
        timestamp: '10:37 AM',
        isFromTeacher: true,
        status: 'read'
      },
      {
        id: '5',
        content: 'Thank you for the feedback on my assignment!',
        timestamp: '2 mins ago',
        isFromTeacher: false,
        status: 'delivered'
      }
    ]
  },
  {
    id: '2',
    studentName: 'Michael Chen',
    studentEmail: 'michael.c@email.com',
    studentAvatar: 'MC',
    lastMessage: 'Could you review my project proposal?',
    lastMessageTime: '1 hour ago',
    unreadCount: 2,
    isOnline: false,
    isPinned: false,
    course: 'JavaScript Basics',
    messages: [
      {
        id: '1',
        content: 'Hello! Could you review my project proposal?',
        timestamp: '1 hour ago',
        isFromTeacher: false,
        status: 'delivered'
      },
      {
        id: '2',
        content: 'I\'ve attached the document with my ideas.',
        timestamp: '1 hour ago',
        isFromTeacher: false,
        status: 'delivered'
      }
    ]
  },
  {
    id: '3',
    studentName: 'Sarah Williams',
    studentEmail: 'sarah.w@email.com',
    studentAvatar: 'SW',
    lastMessage: 'When is the next assignment due?',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
    isOnline: false,
    isPinned: false,
    course: 'Node.js Backend',
    messages: [
      {
        id: '1',
        content: 'When is the next assignment due?',
        timestamp: 'Yesterday',
        isFromTeacher: false,
        status: 'read'
      }
    ]
  }
];

const mockStudents: Student[] = [
  { id: '4', name: 'David Rodriguez', email: 'david.r@email.com', avatar: 'DR', course: 'React Fundamentals', isOnline: true },
  { id: '5', name: 'Lisa Thompson', email: 'lisa.t@email.com', avatar: 'LT', course: 'JavaScript Basics', isOnline: false },
  { id: '6', name: 'James Wilson', email: 'james.w@email.com', avatar: 'JW', course: 'Node.js Backend', isOnline: true },
];

export default function MessagesPage() {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(mockChats[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');

  // Filter chats based on search
  const filteredChats = mockChats.filter(chat =>
    chat.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get students not in current chats
  const availableStudents = mockStudents.filter(student =>
    !mockChats.some(chat => chat.studentName === student.name)
  );

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedChat) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: messageInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isFromTeacher: true,
      status: 'sent'
    };

    // In a real app, this would update the chat via API
    setSelectedChat({
      ...selectedChat,
      messages: [...selectedChat.messages, newMessage],
      lastMessage: messageInput,
      lastMessageTime: 'Just now'
    });

    setMessageInput('');
  };

  const handleNewChat = () => {
    if (!selectedStudent || !newChatMessage.trim()) return;

    const student = availableStudents.find(s => s.id === selectedStudent);
    if (!student) return;

    const newChat: Chat = {
      id: Date.now().toString(),
      studentName: student.name,
      studentEmail: student.email,
      studentAvatar: student.avatar,
      lastMessage: newChatMessage,
      lastMessageTime: 'Just now',
      unreadCount: 0,
      isOnline: student.isOnline,
      isPinned: false,
      course: student.course,
      messages: [
        {
          id: '1',
          content: newChatMessage,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isFromTeacher: true,
          status: 'sent'
        }
      ]
    };

    // In a real app, this would create a new chat via API
    mockChats.unshift(newChat);
    setSelectedChat(newChat);
    setIsNewChatOpen(false);
    setSelectedStudent('');
    setNewChatMessage('');
  };

  const formatTime = (timeStr: string) => {
    if (timeStr.includes('ago') || timeStr === 'Just now' || timeStr === 'Yesterday') {
      return timeStr;
    }
    return timeStr;
  };

  const getMessageStatus = (message: Message) => {
    if (!message.isFromTeacher) return null;
    
    switch (message.status) {
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[800px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Communicate with your students</p>
        </div>
        <Button onClick={() => setIsNewChatOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Chat List */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Chats</CardTitle>
              <Badge variant="secondary">{filteredChats.length}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-4 pt-0">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedChat?.id === chat.id ? 'bg-primary/10 border border-primary/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${chat.studentName}`} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {chat.studentAvatar}
                        </AvatarFallback>
                      </Avatar>
                      {chat.isOnline && (
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background" />
                      )}
                      {chat.isPinned && (
                        <Pin className="absolute -top-1 -right-1 h-3 w-3 text-blue-500 fill-current" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium truncate">{chat.studentName}</h4>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(chat.lastMessageTime)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate flex-1">
                          {chat.lastMessage}
                        </p>
                        {chat.unreadCount > 0 && (
                          <Badge variant="default" className="ml-2 min-w-[20px] h-5 px-1.5 py-0 rounded-full text-xs flex items-center justify-center">
                            {chat.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredChats.length === 0 && (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No conversations found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchTerm ? 'Try adjusting your search' : 'Start a new chat with a student'}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat View */}
        <Card className="lg:col-span-2 flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${selectedChat.studentName}`} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {selectedChat.studentAvatar}
                        </AvatarFallback>
                      </Avatar>
                      {selectedChat.isOnline && (
                        <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-semibold">{selectedChat.studentName}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{selectedChat.isOnline ? 'Online' : 'Offline'}</span>
                        <span>•</span>
                        <span>{selectedChat.course}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Info className="h-4 w-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Pin className="h-4 w-4 mr-2" />
                          {selectedChat.isPinned ? 'Unpin Chat' : 'Pin Chat'}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive Chat
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              
              <Separator />
              
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {selectedChat.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isFromTeacher ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          message.isFromTeacher
                            ? 'bg-primary text-primary-foreground ml-4'
                            : 'bg-muted mr-4'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <div className={`flex items-center justify-end gap-1 mt-1 ${
                          message.isFromTeacher ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          <span className="text-xs">{message.timestamp}</span>
                          {getMessageStatus(message)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <Separator />
              
              {/* Message Input */}
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <div className="flex-1">
                    <Textarea
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="min-h-[40px] max-h-[120px] resize-none"
                      rows={1}
                    />
                  </div>
                  <Button 
                    size="sm" 
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">
                  Choose a chat from the list to start messaging
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Start New Chat
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Select a student to start a new conversation.
            </p>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Student</label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {availableStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id} className="cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-muted text-foreground">
                            {student.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{student.name}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Type your message..."
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsNewChatOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleNewChat}
              disabled={!selectedStudent || !newChatMessage.trim()}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Start Chat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 