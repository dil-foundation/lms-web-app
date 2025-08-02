import { useState, useEffect } from 'react';
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
  Archive,
  Trash2,
  Users,
  Shield,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { 
  UserForMessaging, 
  Conversation, 
  Message as APIMessage,
  wsManager,
  initializeWebSocket,
  disconnectWebSocket,
  getUsersForAdminMessaging,
  getStudentsForTeacherMessaging,
  getTeachersForStudentMessaging,
  searchUsersForMessaging,
  searchStudentsForTeacherMessaging,
  searchTeachersForStudentMessaging,
  createConversation,
  getConversations,
  getMessages,
  sendMessage,
  getUserStatus,
  updateUserStatus
} from '@/services/messagingService';
import { UserRole } from '@/config/roleNavigation';

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  sender: 'me' | 'other';
  isRead: boolean;
}

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  isOnline: boolean;
  messages: Message[];
  isStarred: boolean;
  userId?: string;
  role?: UserRole;
  email?: string;
}

// Convert API Message to Chat Message
const convertAPIMessageToChatMessage = (apiMessage: APIMessage, currentUserId: string): Message => {
  return {
    id: apiMessage.id,
    content: apiMessage.content,
    timestamp: new Date(apiMessage.created_at),
    sender: apiMessage.sender_id === currentUserId ? 'me' : 'other',
    isRead: apiMessage.status === 'read'
  };
};

// Convert API Conversation to Chat
const convertAPIConversationToChat = (conversation: Conversation, currentUserId: string): Chat => {
  // For direct conversations, get the other participant's info
  const otherParticipant = conversation.participants?.find(p => p.user_id !== currentUserId);
  
  // Handle both user object and profiles object structures
  let participantName = 'Unknown';
  let participantRole: UserRole | undefined;
  let participantEmail: string | undefined;
  
  if (otherParticipant) {
    // Check if we have a user object (expected structure)
    if (otherParticipant.user) {
      participantName = `${otherParticipant.user.first_name || ''} ${otherParticipant.user.last_name || ''}`.trim() || 'Unknown';
      participantRole = otherParticipant.user.role as UserRole;
      participantEmail = otherParticipant.user.email;
    }
    // Check if we have a profiles object (actual backend structure)
    else if (otherParticipant.profiles) {
      participantName = `${otherParticipant.profiles.first_name || ''} ${otherParticipant.profiles.last_name || ''}`.trim() || 'Unknown';
      // We need to get role from the participant's role field or from profiles if available
      participantRole = (otherParticipant.role === 'admin' ? 'admin' : 
                        otherParticipant.role === 'teacher' ? 'teacher' : 
                        otherParticipant.role === 'student' ? 'student' : undefined) as UserRole;
      // Email might not be available in profiles object, so we'll leave it undefined
    }
  }
  
  return {
    id: conversation.id,
    name: conversation.title || participantName,
    avatar: '/placeholder.svg', // Always use placeholder since no avatar column
    lastMessage: conversation.last_message || '',
    timestamp: new Date(conversation.last_message_at),
    unreadCount: conversation.unread_count || 0,
    isOnline: false, // Will be updated with user status
    messages: [], // Will be loaded separately
    isStarred: false,
    userId: otherParticipant?.user_id,
    role: participantRole,
    email: participantEmail
  };
};

// Helper function to get role icon
const getRoleIcon = (role: UserRole) => {
  switch (role) {
    case 'admin':
      return Shield;
    case 'teacher':
      return GraduationCap;
    case 'student':
      return Users;
    default:
      return Users;
  }
};

// Helper function to get role color
const getRoleColor = (role: UserRole) => {
  switch (role) {
    case 'admin':
      return 'text-red-500';
    case 'teacher':
      return 'text-blue-500';
    case 'student':
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
};

export default function MessagesPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [availableUsers, setAvailableUsers] = useState<UserForMessaging[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [dialogJustOpened, setDialogJustOpened] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !user?.id) return;

    try {
      // Send message via API
      const apiMessage = await sendMessage(selectedChat.id, {
        content: newMessage,
        message_type: 'text'
      });

      // Convert to chat message format
      const message: Message = convertAPIMessageToChatMessage(apiMessage, user.id);

      // Update chat with new message
      const updatedChat = {
        ...selectedChat,
        messages: [message, ...selectedChat.messages],
        lastMessage: newMessage,
        timestamp: new Date(),
        unreadCount: 0 // Reset unread count since we sent the message
      };

      setChats(chats.map(chat => 
        chat.id === selectedChat.id ? updatedChat : chat
      ));
      setSelectedChat(updatedChat);
      setNewMessage('');

      // Note: The backend should automatically broadcast the message via WebSocket
      // after it's saved to the database via the REST API
      // We don't need to send it again via WebSocket from the frontend
    } catch (error) {
      console.error('Error sending message:', error);
      // You might want to show a toast notification here
    }
  };

  // Fetch available users for messaging based on user role
  useEffect(() => {
    const fetchUsers = async () => {
      if (!profile || !user?.id) {
        return;
      }
      
      // Only allow admin, teacher, and student roles to fetch users
      if (profile.role !== 'admin' && profile.role !== 'teacher' && profile.role !== 'student') {
        return;
      }
      
      // Clear users when search query changes (for page 1)
      if (currentPage === 1 && userSearchQuery.trim()) {
        setAvailableUsers([]);
      }
      
      // Always fetch when search is empty and we're on page 1
      // This ensures we get all users when search is cleared
      if (currentPage === 1 && !userSearchQuery.trim() && availableUsers.length > 0) {
        setAvailableUsers([]);
        // Continue with the fetch
      }
      
      setUsersLoading(true);
      try {
        let result;
        if (profile.role === 'admin') {
          // Admin can message all users
          if (userSearchQuery.trim()) {
            result = await searchUsersForMessaging(userSearchQuery, currentPage, 10);
          } else {
            result = await getUsersForAdminMessaging(currentPage, 10);
          }
        } else if (profile.role === 'teacher') {
          // Teacher can message their students and all admins
          if (userSearchQuery.trim()) {
            result = await searchStudentsForTeacherMessaging(user.id, userSearchQuery, currentPage, 10);
          } else {
            result = await getStudentsForTeacherMessaging(user.id, currentPage, 10);
          }
        } else if (profile.role === 'student') {
          // Student can message their enrolled teachers
          if (userSearchQuery.trim()) {
            result = await searchTeachersForStudentMessaging(user.id, userSearchQuery, currentPage, 10);
          } else {
            result = await getTeachersForStudentMessaging(user.id, currentPage, 10);
          }
        } else {
          return;
        }
        
        // Filter out the current user
        const filteredUsers = result.users.filter(u => u.id !== user?.id);
        
        if (currentPage === 1) {
          setAvailableUsers(filteredUsers);
        } else {
          setAvailableUsers(prev => {
            // Filter out duplicates based on user ID
            const existingIds = new Set(prev.map(user => user.id));
            const uniqueNewUsers = filteredUsers.filter(user => !existingIds.has(user.id));
            const newList = [...prev, ...uniqueNewUsers];
            return newList;
          });
        }
        
        setHasMoreUsers(result.hasMore);
        
        // Reset the dialog just opened flag after successful fetch
        if (dialogJustOpened) {
          setDialogJustOpened(false);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, [profile, user?.id, currentPage, userSearchQuery]);

  // Trigger initial fetch when dialog opens
  useEffect(() => {
    if (showNewChatDialog && (profile?.role === 'admin' || profile?.role === 'teacher' || profile?.role === 'student')) {
      setCurrentPage(1);
      // Reset search query when dialog opens
      setUserSearchQuery('');
      // Set flag to indicate dialog just opened
      setDialogJustOpened(true);
    }
  }, [showNewChatDialog, profile?.role]);

  // Reset states when dialog closes
  useEffect(() => {
    if (!showNewChatDialog) {
      setAvailableUsers([]);
      setCurrentPage(1);
      setHasMoreUsers(true);
      setSelectedUser('');
      setUserSearchQuery('');
      setDialogJustOpened(false);
    }
  }, [showNewChatDialog]);

  // Debounced search effect - only trigger fetch, don't clear users
  useEffect(() => {
    if (!showNewChatDialog) return;
    
    const timer = setTimeout(() => {
      setCurrentPage(1);
      setHasMoreUsers(true);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [userSearchQuery, showNewChatDialog]);

  // Load conversations on component mount
  useEffect(() => {
    const loadConversations = async () => {
      if (!user?.id) return;
      
      setConversationsLoading(true);
      try {
        const result = await getConversations(1, 50);
        const convertedChats = result.conversations.map(conv => 
          convertAPIConversationToChat(conv, user.id)
        );
        
        // Set default online status since user status API is not working
        const chatsWithDefaultStatus = convertedChats.map(chat => ({
          ...chat,
          isOnline: true // Default to online until backend fixes user status API
        }));
        
        setChats(chatsWithDefaultStatus);

        // Fetch user status for all participants
        const participantIds = convertedChats
          .map(chat => chat.userId)
          .filter(id => id && id !== user.id);

        if (participantIds.length > 0) {
          try {
            console.log('Fetching user status for participants:', participantIds);
            const userStatuses = await getUserStatus(participantIds);
            console.log('Received user statuses:', userStatuses);
            
            setChats(prevChats => 
              prevChats.map(chat => {
                if (chat.userId && userStatuses[chat.userId]) {
                  return {
                    ...chat,
                    isOnline: userStatuses[chat.userId].status === 'online'
                  };
                }
                return chat;
              })
            );
          } catch (statusError) {
            console.error('Error fetching user status:', statusError);
            // Keep default online status if API fails
          }
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setConversationsLoading(false);
      }
    };

    loadConversations();
  }, [user?.id]);

  // Periodic status check to keep UI in sync
  useEffect(() => {
    if (!user?.id || chats.length === 0) return;

    const checkUserStatus = async () => {
      try {
        const participantIds = chats
          .map(chat => chat.userId)
          .filter(id => id && id !== user.id);

        if (participantIds.length > 0) {
          const userStatuses = await getUserStatus(participantIds);
          
          setChats(prevChats => 
            prevChats.map(chat => {
              if (chat.userId && userStatuses[chat.userId]) {
                return {
                  ...chat,
                  isOnline: userStatuses[chat.userId].status === 'online'
                };
              }
              return chat;
            })
          );

          // Also update selected chat
          setSelectedChat(prevSelected => {
            if (prevSelected?.userId && userStatuses[prevSelected.userId]) {
              return {
                ...prevSelected,
                isOnline: userStatuses[prevSelected.userId].status === 'online'
              };
            }
            return prevSelected;
          });
        }
      } catch (error) {
        console.error('Error checking user status:', error);
      }
    };

    // Check status every 30 seconds
    const interval = setInterval(checkUserStatus, 30000);
    
    return () => clearInterval(interval);
  }, [user?.id, chats.length]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (user?.id) {
      initializeWebSocket();
      
      // Update user status to online when connecting
      const updateStatus = async () => {
        try {
          console.log('Updating user status to online');
          await updateUserStatus({ status: 'online' });
          console.log('User status updated to online successfully');
        } catch (error) {
          console.error('Error updating user status to online:', error);
        }
      };
      updateStatus();
    }

    return () => {
      // Update user status to offline when disconnecting
      const updateStatus = async () => {
        try {
          console.log('Updating user status to offline');
          await updateUserStatus({ status: 'offline' });
          console.log('User status updated to offline successfully');
        } catch (error) {
          console.error('Error updating user status to offline:', error);
        }
      };
      updateStatus();
      disconnectWebSocket();
    };
  }, [user?.id]);

  // Handle WebSocket events
  useEffect(() => {
    // Handle new messages
    const handleNewMessage = (data: any) => {
      if (data.message && user?.id) {
        const chatMessage = convertAPIMessageToChatMessage(data.message, user.id);
        
        setChats(prevChats => {
          return prevChats.map(chat => {
            if (chat.id === data.message.conversation_id) {
              return {
                ...chat,
                messages: [chatMessage, ...chat.messages],
                lastMessage: data.message.content,
                timestamp: new Date(data.message.created_at),
                unreadCount: chat.unreadCount + (data.message.sender_id !== user.id ? 1 : 0)
              };
            }
            return chat;
          });
        });

        // Update selected chat if it's the current conversation
        setSelectedChat(prevSelected => {
          if (prevSelected?.id === data.message.conversation_id) {
            return {
              ...prevSelected,
              messages: [chatMessage, ...prevSelected.messages],
              lastMessage: data.message.content,
              timestamp: new Date(data.message.created_at),
              unreadCount: prevSelected.unreadCount + (data.message.sender_id !== user.id ? 1 : 0)
            };
          }
          return prevSelected;
        });
      }
    };

    // Handle user status changes
    const handleUserStatusChange = (data: any) => {
      console.log('Received user status change:', data);
      
      // Handle different data formats
      const userId = data.user_id || data.userId;
      const status = data.status || data.user_status;
      
      if (!userId || !status) {
        console.warn('Invalid user status change data:', data);
        return;
      }

      const isOnline = status === 'online';
      console.log(`Updating status for user ${userId} to ${isOnline ? 'online' : 'offline'}`);

      setChats(prevChats => {
        return prevChats.map(chat => {
          if (chat.userId === userId) {
            return {
              ...chat,
              isOnline: isOnline
            };
          }
          return chat;
        });
      });

      // Also update selected chat if it's the same user
      setSelectedChat(prevSelected => {
        if (prevSelected?.userId === userId) {
          return {
            ...prevSelected,
            isOnline: isOnline
          };
        }
        return prevSelected;
      });
    };

    // Register event handlers
    wsManager.on('new_message', handleNewMessage);
    wsManager.on('user_status_change', handleUserStatusChange);

    return () => {
      wsManager.off('new_message', handleNewMessage);
      wsManager.off('user_status_change', handleUserStatusChange);
    };
  }, [user?.id]);



  const handleCreateNewChat = async () => {
    if (!selectedUser || !user?.id) return;

    const userToChat = availableUsers.find(u => u.id === selectedUser);
    if (!userToChat) return;

    try {
      // Create conversation via API
      const conversation = await createConversation({
        type: 'direct',
        participant_ids: [userToChat.id]
      });

      // Convert to chat format
      const newChat: Chat = convertAPIConversationToChat(conversation, user.id);
      newChat.name = `${userToChat.first_name || ''} ${userToChat.last_name || ''}`.trim() || 'Unknown';
      newChat.avatar = '/placeholder.svg'; // Always use placeholder since no avatar column
      newChat.userId = userToChat.id;
      newChat.role = userToChat.role;
      newChat.email = userToChat.email;

      setChats([newChat, ...chats]);
      setSelectedChat(newChat);
      
      // Join WebSocket room for the new conversation
      wsManager.joinConversation(conversation.id);
      
      setShowNewChatDialog(false);
      setSelectedUser('');
    } catch (error) {
      console.error('Error creating conversation:', error);
      // You might want to show a toast notification here
    }
  };

  const handleStarChat = (chatId: string) => {
    setChats(chats.map(chat =>
      chat.id === chatId ? { ...chat, isStarred: !chat.isStarred } : chat
    ));
  };

  const handleSelectChat = async (chat: Chat) => {
    setSelectedChat(chat);
    setCurrentConversationId(chat.id);

    // Join WebSocket room for this conversation
    wsManager.joinConversation(chat.id);

    // Load messages if not already loaded
    if (chat.messages.length === 0) {
      setMessagesLoading(true);
      try {
        const result = await getMessages(chat.id, 1, 50);
        const convertedMessages = result.messages.map(msg => 
          convertAPIMessageToChatMessage(msg, user?.id || '')
        );

        const updatedChat = {
          ...chat,
          messages: convertedMessages
        };

        setSelectedChat(updatedChat);
        setChats(prevChats => 
          prevChats.map(c => c.id === chat.id ? updatedChat : c)
        );
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setMessagesLoading(false);
      }
    }
  };

  const handleArchiveChat = (chatId: string) => {
    setChats(chats.filter(chat => chat.id !== chatId));
    if (selectedChat?.id === chatId) {
      setSelectedChat(null);
    }
  };



  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return formatTime(date);
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {chats.length > 0 ? (
        <>
          {/* Chat List Sidebar */}
          <div className="w-80 border-r border-border flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold">Messages</h1>
                <Button
                  size="sm"
                  onClick={() => setShowNewChatDialog(true)}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

                    {/* Chat List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {conversationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading conversations...</div>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">No conversations yet</div>
              </div>
            ) : (
              filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedChat?.id === chat.id
                        ? 'bg-accent'
                        : 'hover:bg-accent/50'
                    }`}
                    onClick={() => handleSelectChat(chat)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={chat.avatar} alt={chat.name} />
                          <AvatarFallback>{chat.name[0]}</AvatarFallback>
                        </Avatar>
                        {chat.isOnline && (
                          <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{chat.name}</h3>
                            {profile?.role === 'admin' && chat.role && (
                              <div className="flex items-center gap-1">
                                {(() => {
                                  const RoleIcon = getRoleIcon(chat.role);
                                  return (
                                    <RoleIcon className={`h-3 w-3 ${getRoleColor(chat.role)}`} />
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(chat.timestamp)}
                            </span>
                          </div>
                        </div>
                      
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground truncate">
                            {chat.lastMessage}
                          </p>
                          {chat.unreadCount > 0 && (
                            <Badge variant="secondary" className="h-5 min-w-5 text-xs">
                              {chat.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          </div>

          {/* Chat View */}
          <div className="flex-1 flex flex-col">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedChat.avatar} alt={selectedChat.name} />
                        <AvatarFallback>{selectedChat.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-semibold">{selectedChat.name}</h2>
                          {profile?.role === 'admin' && selectedChat.role && (
                            <div className="flex items-center gap-1">
                              {(() => {
                                const RoleIcon = getRoleIcon(selectedChat.role);
                                return (
                                  <RoleIcon className={`h-4 w-4 ${getRoleColor(selectedChat.role)}`} />
                                );
                              })()}
                              <span className={`text-xs font-medium ${getRoleColor(selectedChat.role)}`}>
                                {selectedChat.role.charAt(0).toUpperCase() + selectedChat.role.slice(1)}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {selectedChat.isOnline ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleArchiveChat(selectedChat.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">Loading messages...</div>
                  </div>
                ) : selectedChat.messages.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">No messages yet</div>
                  </div>
                ) : (
                  selectedChat.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.sender === 'me'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender === 'me' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="min-h-[60px] max-h-[120px] resize-none"
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No conversation selected</h3>
                  <p className="text-muted-foreground mb-4">
                    Choose a conversation from the list or start a new one.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* No Conversations State - Centered Create Button */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-2xl font-semibold mb-3">No conversations yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Start messaging with other users by creating your first conversation.
            </p>
            <Button 
              size="lg" 
              onClick={() => setShowNewChatDialog(true)}
              className="px-8 py-3"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Conversation
            </Button>
          </div>
        </div>
      )}

      {/* New Chat Dialog */}
      <Dialog open={showNewChatDialog} onOpenChange={(open) => {
        setShowNewChatDialog(open);
        if (!open) {
          // Reset when dialog closes
          setAvailableUsers([]);
          setCurrentPage(1);
          setHasMoreUsers(true);
          setSelectedUser('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                <div 
                  className={`overflow-y-auto ${
                    usersLoading && currentPage === 1
                      ? 'max-h-[120px]' // Small height when loading initially
                      : availableUsers.length <= 3 
                        ? 'max-h-[140px]' // Just enough for 3 users
                        : availableUsers.length <= 6 
                          ? 'max-h-[200px]' // Comfortable for 6 users
                          : availableUsers.length <= 10
                            ? 'max-h-[280px]' // Good for 10 users
                            : 'max-h-[350px]' // Max height for many users
                  }`}
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    
                    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 10) {
                      if (hasMoreUsers && !usersLoading) {
                        setCurrentPage(prev => prev + 1);
                      }
                    }
                  }}
                >
                {usersLoading && currentPage === 1 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Loading {profile?.role === 'admin' ? 'users' : profile?.role === 'teacher' ? 'students and admins' : 'teachers'}...
                  </div>
                ) : (
                  <>
                    {availableUsers.map((user) => {
                      const RoleIcon = getRoleIcon(user.role);
                      return (
                        <SelectItem key={user.id} value={user.id} className="focus:bg-accent group">
                          <div className="flex items-center gap-2">
                                                          <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs font-medium bg-muted text-foreground">
                                  {(() => {
                                    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                                    const initials = fullName.length > 0 
                                      ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                      : user.email ? user.email[0].toUpperCase() : 'U';
                                    return initials;
                                  })()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium text-foreground">{`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown'}</span>
                                <RoleIcon className={`h-3 w-3 ${getRoleColor(user.role)} group-hover:text-foreground`} />
                                <span className={`text-xs font-medium ${getRoleColor(user.role)} group-hover:text-foreground`}>
                                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                    {usersLoading && currentPage > 1 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Loading more {profile?.role === 'admin' ? 'users' : profile?.role === 'teacher' ? 'students and admins' : 'teachers'}...
                      </div>
                    )}
                    {!hasMoreUsers && availableUsers.length > 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No more {profile?.role === 'admin' ? 'users' : profile?.role === 'teacher' ? 'students and admins' : 'teachers'}
                      </div>
                    )}
                  </>
                )}
                </div>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewChatDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateNewChat} disabled={!selectedUser}>
                Start Chat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 