import { useState, useEffect, useRef } from 'react';
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
  DialogDescription,
  DialogFooter,
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
  Loader2,
  Check,
  CheckCheck,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Clock,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ContentLoader } from '@/components/ContentLoader';

import { 
  UserForMessaging, 
  Conversation, 
  Message as APIMessage,
  wsManager,
  initializeWebSocket,
  disconnectWebSocket,
  startTokenRefreshInterval,
  stopTokenRefreshInterval,
  getUsersForAdminMessaging,
  getStudentsForTeacherMessaging,
  getUsersForStudentMessaging,
  searchUsersForMessaging,
  searchStudentsForTeacherMessaging,
  searchUsersForStudentMessaging,
  createConversation,
  getConversations,
  getMessages,
  sendMessage,
  deleteConversation,
  getUserStatus,
  updateUserStatus,
  markConversationAsRead,
  markMessageAsDelivered,
  markMessageAsRead,
} from '@/services/messagingService';
import { UserRole } from '@/config/roleNavigation';

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  sender: 'me' | 'other';
  isRead: boolean;
  status: 'sent' | 'delivered' | 'read';
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
  created_by?: string;
}

// Convert API Message to Chat Message
const convertAPIMessageToChatMessage = (apiMessage: APIMessage, currentUserId: string): Message => {
  return {
    id: apiMessage.id,
    content: apiMessage.content,
    timestamp: new Date(apiMessage.created_at),
    sender: apiMessage.sender_id === currentUserId ? 'me' : 'other',
    isRead: apiMessage.status === 'read',
    status: (apiMessage.status as 'sent' | 'delivered' | 'read') || 'sent'
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
      // Get role from the profiles object (this is the correct source)
      participantRole = otherParticipant.profiles.role as UserRole;
      // Email might not be available in profiles object, so we'll leave it undefined
    }
    // If no user or profiles object, try to get role from the participant's role field
    else if (otherParticipant.role) {
      participantRole = (otherParticipant.role === 'admin' ? 'admin' : 
                        otherParticipant.role === 'teacher' ? 'teacher' : 
                        otherParticipant.role === 'student' ? 'student' : undefined) as UserRole;
    }
  }
  
  return {
    id: conversation.id,
    name: conversation.title || participantName,
    avatar: '', // Empty string to show initials instead of placeholder
    lastMessage: conversation.last_message || '',
    timestamp: new Date(conversation.last_message_at),
    unreadCount: conversation.unread_count || 0,
    isOnline: false, // Will be updated with user status
    messages: [], // Will be loaded separately
    isStarred: false,
    userId: otherParticipant?.user_id,
    role: participantRole,
    email: participantEmail,
    created_by: conversation.created_by
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
      return 'text-[#1582B4]';
    case 'student':
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
};

const getSelectedRoleColor = (role: UserRole) => {
  switch (role) {
    case 'admin':
      return 'text-white';
    case 'teacher':
      return 'text-white';
    case 'student':
      return 'text-white';
    default:
      return 'text-white';
  }
};

// Helper function to generate user initials
const getUserInitials = (name: string, email?: string) => {
  if (name && name !== 'Unknown') {
    const fullName = name.trim();
    if (fullName.length > 0) {
      const nameParts = fullName.split(' ').filter(part => part.length > 0);
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
      } else if (nameParts.length === 1) {
        return nameParts[0][0].toUpperCase();
      }
    }
  }
  
  // Fallback to email if name is not available
  if (email) {
    return email[0].toUpperCase();
  }
  
  return 'U'; // Default fallback
};

// Helper function to get message status tick icon - TEMPORARILY DISABLED
const getMessageStatusIcon = (status: string) => {
  // Temporarily disabled - return null for all statuses
  return null;
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
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [conversationsPage, setConversationsPage] = useState(1);
  const [hasMoreConversations, setHasMoreConversations] = useState(true);
  const [conversationsSearchQuery, setConversationsSearchQuery] = useState('');
  const [conversationsSearchLoading, setConversationsSearchLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [loadingMessagesForChat, setLoadingMessagesForChat] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState<string | null>(null);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archivingConversation, setArchivingConversation] = useState<string | null>(null);
  const [showStarDialog, setShowStarDialog] = useState(false);
  const [starringConversation, setStarringConversation] = useState<string | null>(null);
  const [showUnstarDialog, setShowUnstarDialog] = useState(false);
  const [unstarringConversation, setUnstarringConversation] = useState<string | null>(null);
  const [showDeleteMessageDialog, setShowDeleteMessageDialog] = useState(false);
  const [deletingMessage, setDeletingMessage] = useState<string | null>(null);
  const [showArchiveMessageDialog, setShowArchiveMessageDialog] = useState(false);
  const [archivingMessage, setArchivingMessage] = useState<string | null>(null);
  const [showStarMessageDialog, setShowStarMessageDialog] = useState(false);
  const [starringMessage, setStarringMessage] = useState<string | null>(null);
  const [showUnstarMessageDialog, setShowUnstarMessageDialog] = useState(false);
  const [unstarringMessage, setUnstarringMessage] = useState<string | null>(null);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [showArchiveUserDialog, setShowArchiveUserDialog] = useState(false);
  const [archivingUser, setArchivingUser] = useState<string | null>(null);
  const [showStarUserDialog, setShowStarUserDialog] = useState(false);
  const [starringUser, setStarringUser] = useState<string | null>(null);
  const [showUnstarUserDialog, setShowUnstarUserDialog] = useState(false);
  const [unstarringUser, setUnstarringUser] = useState<string | null>(null);

  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationsContainerRef = useRef<HTMLDivElement>(null);
  const conversationsEndRef = useRef<HTMLDivElement>(null);
  const componentMountedRef = useRef(false);
  const loadingOlderMessagesRef = useRef(false);
  const justLoadedMessagesRef = useRef(false);
  const initialLoadCompleteRef = useRef(false);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !user?.id) return;

    try {
      // Send message via API
      const apiMessage = await sendMessage(selectedChat.id, {
        content: newMessage,
        message_type: 'text'
      });

      // Convert to chat message format with "sent" status
      const message: Message = {
        ...convertAPIMessageToChatMessage(apiMessage, user.id),
        status: 'sent' // Start with "sent" status
      };

      // Update chat with new message
      const updatedChat = {
        ...selectedChat,
        messages: [...selectedChat.messages, message], // Add to end for proper ordering
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
      // Don't fetch if dialog is not open
      if (!showNewChatDialog) {
        return;
      }
      
      // Don't fetch if profile or user is not loaded yet
      if (!profile || !user?.id) {
        return;
      }
      
      // Only allow admin, teacher, and student roles to fetch users
      if (profile.role !== 'admin' && profile.role !== 'teacher' && profile.role !== 'student') {
        return;
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
            result = await searchUsersForStudentMessaging(user.id, userSearchQuery, currentPage, 10);
          } else {
            result = await getUsersForStudentMessaging(user.id, currentPage, 10);
          }
        } else {
          return;
        }
        
        // Filter out the current user and ensure no duplicates
        const filteredUsers = result.users.filter(u => u.id !== user?.id);
        
        // Additional deduplication to ensure no duplicate IDs
        const uniqueUsers = filteredUsers.filter((user, index, self) => 
          index === self.findIndex(u => u.id === user.id)
        );
        
        if (currentPage === 1) {
          setAvailableUsers(uniqueUsers);
        } else {
          setAvailableUsers(prev => {
            // Filter out duplicates based on user ID
            const existingIds = new Set(prev.map(user => user.id));
            const uniqueNewUsers = uniqueUsers.filter(user => !existingIds.has(user.id));
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
        // Set empty array on error to show proper state
        setAvailableUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, [showNewChatDialog, profile, user?.id, currentPage, userSearchQuery]);

  // Trigger initial fetch when dialog opens
  useEffect(() => {
    if (showNewChatDialog && profile?.role && (profile.role === 'admin' || profile.role === 'teacher' || profile.role === 'student')) {
      setCurrentPage(1);
      setUserSearchQuery('');
      setAvailableUsers([]); // Clear existing users
      setHasMoreUsers(true);
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

  // Debounced search effect for users - only trigger fetch, don't clear users
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

  // Debounced search effect for conversations
  useEffect(() => {
    // Set search loading state immediately when query changes
    if (conversationsSearchQuery.trim()) {
      setConversationsSearchLoading(true);
    }
    
    const timer = setTimeout(() => {
      // Reset to page 1 when search changes
      setConversationsPage(1);
      setHasMoreConversations(true);
      setConversationsSearchLoading(false);
    }, 800); // Increased delay to reduce API calls

    return () => {
      clearTimeout(timer);
    };
  }, [conversationsSearchQuery]);

    // Consolidated conversation loading effect
  useEffect(() => {

    
    // Prevent duplicate requests by checking if we're already loading
    if (conversationsLoading) {
      return;
    }
    
    // Only prevent duplicate initial loads if we have conversations already loaded
    if (!conversationsSearchQuery.trim() && initialLoadCompleteRef.current && chats.length > 0) {
        return;
      }
      
    const loadConversations = async () => {
      if (!user?.id) {
        return;
      }
      
      setConversationsLoading(true);
      setConversationsLoaded(false);
      
      try {
        // Use getConversations with optional search query
        const result = await getConversations(1, 10, conversationsSearchQuery);
        
        const convertedChats = result.conversations.map(conv => 
          convertAPIConversationToChat(conv, user.id)
        );
        
        // Set default offline status - will be updated with actual status from API
        const chatsWithDefaultStatus = convertedChats.map(chat => ({
          ...chat,
          isOnline: false
        }));
        
        setChats(chatsWithDefaultStatus);
        setHasMoreConversations(result.hasMore);
        setConversationsPage(1);

        // Clear selected chat if no conversations found
        if (chatsWithDefaultStatus.length === 0) {
          setSelectedChat(null);
          setCurrentConversationId(null);
          setConversationsLoaded(true);
          setInitialLoadComplete(true);
          initialLoadCompleteRef.current = true;
          return;
        }

        // Fetch user status for all participants
        const participantIds = convertedChats
          .map(chat => chat.userId)
          .filter(id => id && id !== user.id);

        if (participantIds.length > 0) {
          try {
            const userStatuses = await getUserStatus(participantIds);
            
            const updatedChats = chatsWithDefaultStatus.map(chat => {
              if (chat.userId && userStatuses[chat.userId]) {
                const isOnline = userStatuses[chat.userId].status === 'online';
                return {
                  ...chat,
                  isOnline: isOnline
                };
              }
              return chat;
            });
            
            setChats(updatedChats);
      } catch (statusError) {
        console.error('Error fetching user status:', statusError);
        // Keep default online status if API fails
          }
    }
    
    // Mark as loaded only after we've successfully processed the data
    setConversationsLoaded(true);
    setInitialLoadComplete(true);
    initialLoadCompleteRef.current = true;
      } catch (error) {
        console.error('Error loading conversations:', error);
        // Don't set conversationsLoaded to true on error
        // Keep loading state active so user can retry
      } finally {
        setConversationsLoading(false);
        setConversationsSearchLoading(false);
      }
    };

    // Debounced loading for search queries
    if (conversationsSearchQuery.trim()) {
    setConversationsSearchLoading(true);
    const timer = setTimeout(() => {
        loadConversations();
      }, 800);
      
      return () => {
        clearTimeout(timer);
      };
            } else {
      // Immediate loading for initial load or when search is cleared
        loadConversations();
      }
  }, [user?.id, conversationsSearchQuery]);



  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Only auto-scroll if we have messages and we're not in the middle of loading more messages
    // Also check if we're loading older messages (pagination) to prevent auto-scroll
    if (selectedChat?.messages.length > 0 && !messagesLoading && !loadingMoreMessages && !loadingOlderMessagesRef.current) {
    scrollToBottom();
    }
    // Message read marking temporarily disabled
  }, [selectedChat?.messages, messagesLoading, loadingMoreMessages]);

  // Set component as mounted after initial render
  useEffect(() => {
    componentMountedRef.current = true;
  }, []);



  // Initialize WebSocket connection and status management
  useEffect(() => {
    if (user?.id) {
      // Start proactive token refresh
      startTokenRefreshInterval();
      

      
      initializeWebSocket();
      
      // Update user status to online immediately when connecting
      updateUserStatus({ status: 'online' }).catch(error => {
        console.error('Error updating user status to online:', error);
      });

      // Set up periodic status refresh to keep status synchronized
      const statusRefreshInterval = setInterval(async () => {
        try {
          await updateUserStatus({ status: 'online' });
        } catch (error) {
          console.error('Error refreshing user status:', error);
        }
      }, 30000); // Refresh every 30 seconds

      return () => {
        clearInterval(statusRefreshInterval);
        
        // Stop proactive token refresh
        stopTokenRefreshInterval();
        
        // Update user status to offline when disconnecting
        updateUserStatus({ status: 'offline' }).catch(error => {
          console.error('Error updating user status to offline:', error);
        });
        disconnectWebSocket();
      };
    }
  }, [user?.id]);

  // Handle WebSocket events
  useEffect(() => {
    // Handle new conversations
    const handleNewConversation = (data: any) => {
      if (data.conversation && user?.id) {
        // Convert API conversation to chat format
        const newChat = convertAPIConversationToChat(data.conversation, user.id);
        
        // Check if conversation already exists to prevent duplicates
        const existingChat = chats.find(chat => chat.id === newChat.id);
        if (!existingChat) {
          setChats(prevChats => [newChat, ...prevChats]);
          
          // Auto-selection removed - user must manually select a conversation
        }
      }
    };

    // Handle new messages
    const handleNewMessage = (data: any) => {
      if (data.message && user?.id) {
        // Convert to chat message format with "sent" status initially
        const chatMessage = {
          ...convertAPIMessageToChatMessage(data.message, user.id),
          status: 'sent' as const
        };
        
        setChats(prevChats => {
          return prevChats.map(chat => {
            if (chat.id === data.message.conversation_id) {
              return {
                ...chat,
                messages: [...chat.messages, chatMessage], // Add to end for proper ordering
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
              messages: [...prevSelected.messages, chatMessage], // Add to end for proper ordering
              lastMessage: data.message.content,
              timestamp: new Date(data.message.created_at),
              unreadCount: prevSelected.unreadCount + (data.message.sender_id !== user.id ? 1 : 0)
            };
          }
          return prevSelected;
        });

        // Message status logic temporarily disabled
      }
    };

    // Handle conversation deletion
    const handleConversationDeleted = (data: any) => {
      if (data.conversation_id) {
        // Remove the conversation from the chats list
        setChats(prevChats => prevChats.filter(chat => chat.id !== data.conversation_id));
        
        // If the deleted conversation was selected, clear the selection
        setSelectedChat(prevSelected => {
          if (prevSelected?.id === data.conversation_id) {
            return null;
          }
          return prevSelected;
        });
        
        // Clear current conversation ID if it was the deleted one
        if (currentConversationId === data.conversation_id) {
          setCurrentConversationId(null);
        }
      }
    };

    // Handle user status changes
    const handleUserStatusChange = (data: any) => {
      // Handle different data formats
      const userId = data.user_id || data.userId;
      const status = data.status || data.user_status;
      
      if (!userId || !status) {
        return;
      }

      const isOnline = status === 'online';

      setChats(prevChats => {
        const updatedChats = prevChats.map(chat => {
          if (chat.userId === userId) {
            return {
              ...chat,
              isOnline: isOnline
            };
          }
          return chat;
        });
        return updatedChats;
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

    // Message status handlers temporarily disabled
    const handleMessageDelivered = (data: any) => {
      // Temporarily disabled
    };

    const handleMessageRead = (data: any) => {
      // Temporarily disabled
    };

    // Register event handlers
    wsManager.on('new_conversation', handleNewConversation);
    wsManager.on('new_message', handleNewMessage);
    wsManager.on('conversation_deleted', handleConversationDeleted);
    wsManager.on('user_status_change', handleUserStatusChange);
    wsManager.on('message_delivered', handleMessageDelivered);
    wsManager.on('message_read', handleMessageRead);

    return () => {
      wsManager.off('new_conversation', handleNewConversation);
      wsManager.off('new_message', handleNewMessage);
      wsManager.off('conversation_deleted', handleConversationDeleted);
      wsManager.off('user_status_change', handleUserStatusChange);
      wsManager.off('message_delivered', handleMessageDelivered);
      wsManager.off('message_read', handleMessageRead);
    };
  }, [user?.id, currentConversationId]);



  const handleCreateNewChat = async () => {
    if (!selectedUser || !user?.id) return;

    const userToChat = availableUsers.find(u => u.id === selectedUser);
    if (!userToChat) return;

    // Check if conversation already exists with this user
    const existingChat = chats.find(chat => chat.userId === selectedUser);
    if (existingChat) {
      // Close dialog immediately
      setShowNewChatDialog(false);
      setSelectedUser('');
      
      // Select the existing conversation instead of creating a new one
      setSelectedChat(existingChat);
      setCurrentConversationId(existingChat.id);
      
      // Join WebSocket room for the existing conversation
      wsManager.joinConversation(existingChat.id);
      
      // Load messages if not already loaded (this will happen in background)
      if (existingChat.messages.length === 0) {
        loadMessagesForChat(existingChat);
      }
      
      return;
    }

    try {
      // Create conversation via API
      const conversation = await createConversation({
        type: 'direct',
        participant_ids: [userToChat.id]
      });

      // Convert to chat format
      const newChat: Chat = convertAPIConversationToChat(conversation, user.id);
      newChat.name = `${userToChat.first_name || ''} ${userToChat.last_name || ''}`.trim() || 'Unknown';
      newChat.avatar = ''; // Empty string to show initials instead of placeholder
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

  // Auto-scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Function to mark messages as read when they come into view - TEMPORARILY DISABLED
  const markMessagesAsRead = async () => {
    // Temporarily disabled
  };

  // Load more conversations function
  const loadMoreConversations = async () => {
    if (!hasMoreConversations || conversationsLoading) return;

    setConversationsLoading(true);
    try {
      const nextPage = conversationsPage + 1;
      const result = await getConversations(nextPage, 10); // Limit to 10 for testing
      
      if (result.conversations.length > 0) {
        const convertedChats = result.conversations.map(conv => 
          convertAPIConversationToChat(conv, user?.id || '')
        );
        
        // Set default online status
        const chatsWithDefaultStatus = convertedChats.map(chat => ({
          ...chat,
          isOnline: true
        }));

        // Append new conversations to existing ones
        setChats(prevChats => {
          // Filter out duplicates based on conversation ID
          const existingIds = new Set(prevChats.map(chat => chat.id));
          const uniqueNewChats = chatsWithDefaultStatus.filter(chat => !existingIds.has(chat.id));
          return [...prevChats, ...uniqueNewChats];
        });
        
        setConversationsPage(nextPage);
        setHasMoreConversations(result.hasMore);
      } else {
        setHasMoreConversations(false);
      }
    } catch (error) {
      console.error('Error loading more conversations:', error);
    } finally {
      setConversationsLoading(false);
    }
  };

  // Load more messages function
  const loadMoreMessages = async () => {
    if (!selectedChat || !hasMoreMessages || messagesLoading || loadingMoreMessages) {
      return;
    }

    setLoadingMoreMessages(true);
    loadingOlderMessagesRef.current = true;
    try {
      const nextPage = messagesPage + 1;
      const result = await getMessages(selectedChat.id, nextPage, 20);
      
      if (result.messages.length > 0) {
        const convertedMessages = result.messages.map(msg => 
          convertAPIMessageToChatMessage(msg, user?.id || '')
        );

        const updatedChat = {
          ...selectedChat,
          messages: [...convertedMessages, ...selectedChat.messages] // Prepend older messages
        };

        setSelectedChat(updatedChat);
        setChats(prevChats => 
          prevChats.map(c => c.id === selectedChat.id ? updatedChat : c)
        );
        setMessagesPage(nextPage);
        setHasMoreMessages(result.hasMore);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setLoadingMoreMessages(false);
      // Set flag to prevent immediate scroll-triggered loading
      justLoadedMessagesRef.current = true;
      setTimeout(() => {
        justLoadedMessagesRef.current = false;
      }, 500); // Prevent scroll loading for 500ms after loading more messages
      
      // Reset the loading older messages flag after a short delay
      setTimeout(() => {
        loadingOlderMessagesRef.current = false;
      }, 100); // Small delay to ensure state updates are complete
    }
  };

  // Handle scroll to load more messages
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    // Check if we're near the top (within 100px) to account for padding and other UI elements
    // Also check if we just loaded messages to prevent immediate loading
    // And ensure component is fully mounted
    if (scrollTop <= 100 && hasMoreMessages && !messagesLoading && !loadingMoreMessages && !justLoadedMessagesRef.current && componentMountedRef.current) {
      loadMoreMessages();
    }
  };

  // Handle scroll to load more conversations
  const handleConversationsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 10 && hasMoreConversations && !conversationsLoading) {
      loadMoreConversations();
    }
  };

  const handleSelectChat = async (chat: Chat) => {
    // Prevent duplicate selection
    if (selectedChat?.id === chat.id) {
      return;
    }
    
    setSelectedChat(chat);
    setCurrentConversationId(chat.id);
    setMessagesPage(1);
    setHasMoreMessages(true); // Will be updated by loadMessagesForChat if needed

    // Join WebSocket room for this conversation
    wsManager.joinConversation(chat.id);

    // Mark messages as read when selecting a chat
    if (chat.unreadCount > 0) {
      try {
        // Mark all messages in this conversation as read
        await markConversationAsRead(chat.id);
        
        // Update the chat's unread count to 0
        const updatedChat = { ...chat, unreadCount: 0 };
        setSelectedChat(updatedChat);
        setChats(prevChats => 
          prevChats.map(c => c.id === chat.id ? updatedChat : c)
        );
      } catch (error) {
        console.error('Error marking conversation as read:', error);
      }
    }

    // Load messages if not already loaded
    if (chat.messages.length === 0) {
      await loadMessagesForChat(chat);
    }
  };

  const handleDeleteConversation = async (chatId: string) => {
    if (!user?.id) return;
    
    setDeletingConversation(chatId);
    try {
      await deleteConversation(chatId);
      
      // Remove from local state immediately for better UX
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
      
      // If the deleted conversation was selected, clear the selection
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
        setCurrentConversationId(null);
      }
      
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      // You might want to show a toast notification here
    } finally {
      setDeletingConversation(null);
    }
  };

  // Helper function to check if user can delete conversation
  const canDeleteConversation = (chat: Chat) => {
    if (!user?.id || !profile?.role) return false;
    
    // Only admin can delete conversations
    if (profile.role === 'admin') return true;
    
    // Students and teachers cannot delete conversations
    return false;
  };

  const handleArchiveChat = (chatId: string) => {
    setChats(chats.filter(chat => chat.id !== chatId));
    if (selectedChat?.id === chatId) {
      setSelectedChat(null);
    }
  };

  // Helper function to load messages for a chat
  const loadMessagesForChat = async (chat: Chat) => {
    if (chat.messages.length > 0) {
      return; // Already loaded
    }
    
    // Prevent duplicate message loading for the same chat
    if (loadingMessagesForChat === chat.id) {
      return;
    }
    
    setLoadingMessagesForChat(chat.id);
    setMessagesLoading(true);
    loadingOlderMessagesRef.current = false; // Initial load should allow auto-scroll
    try {
      const result = await getMessages(chat.id, 1, 20);
      
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
      setHasMoreMessages(result.hasMore);
      setMessagesPage(1); // Reset to page 1 for this chat
      
      // Set flag to prevent immediate scroll-triggered loading
      justLoadedMessagesRef.current = true;
      setTimeout(() => {
        justLoadedMessagesRef.current = false;
      }, 1000); // Prevent scroll loading for 1 second after initial load
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setMessagesLoading(false);
      setLoadingMessagesForChat(null);
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
    <div className="flex flex-col h-[80vh] bg-background">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ lineHeight: '3rem' }}>
                  Messages
                </h1>
                <p className="text-lg text-muted-foreground font-light">
                  Connect and communicate with your team
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowNewChatDialog(true)}
              className="h-12 px-6 bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {conversationsLoading && !conversationsLoaded ? (
        <div className="flex-1 flex items-center justify-center">
          <ContentLoader message="Loading conversations..." />
        </div>
      ) : chats.length === 0 ? (
        /* Empty State - No Conversations */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-8 h-8 text-primary dark:text-primary/90" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-3">No conversations yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Start messaging with other users by creating your first conversation.
            </p>
            <Button 
              onClick={() => setShowNewChatDialog(true)}
              className="bg-gradient-to-br from-primary to-primary/90 dark:from-primary/90 dark:to-primary/70 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 text-white dark:text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Conversation
            </Button>
          </div>
        </div>
      ) : (
        /* Main Content - Show Chat UI only when conversations exist */
        <div className="flex flex-1 overflow-hidden">
          {/* Chat List Sidebar */}
          <div className="w-80 border-r border-border flex flex-col">
            {/* Enhanced Search */}
            <div className="relative p-6 border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={profile?.role === 'student' 
                    ? "Search teachers and fellow students by name or email..." 
                    : "Search users by name or email..."
                  }
                  value={conversationsSearchQuery}
                  onChange={(e) => setConversationsSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-background/50 dark:bg-background/30 border-border/50 focus:border-primary/50 transition-all duration-300 rounded-xl"
                />
              </div>
            </div>

            {/* Chat List */}
            <ScrollArea className="flex-1">
              <div className="p-2">
                {(conversationsSearchLoading && conversationsSearchQuery.trim()) ? (
                  <div className="flex items-center justify-center py-8">
                    <ContentLoader message="Searching conversations..." />
                  </div>
                ) : conversationsSearchQuery.trim() && chats.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Search className="w-8 h-8 text-primary dark:text-primary/90" />
                      </div>
                      <h2 className="text-xl font-bold text-foreground mb-3">No conversations found</h2>
                      <p className="text-muted-foreground mb-6 max-w-sm">
                        No conversations match "{conversationsSearchQuery}"
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => setConversationsSearchQuery('')}
                        className="bg-background/50 dark:bg-background/30 border-border/50 hover:border-primary/50 transition-all duration-300"
                      >
                        Clear search
                      </Button>
                    </div>
                  </div>
                ) : (
                <>
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg ${
                        selectedChat?.id === chat.id
                          ? 'bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30 border border-primary/30 dark:border-primary/40 shadow-lg'
                          : 'hover:bg-gradient-to-br hover:from-primary/5 hover:to-primary/10 dark:hover:from-primary/10 dark:hover:to-primary/20 border border-transparent hover:border-primary/20 dark:hover:border-primary/30'
                      }`}
                      onClick={() => handleSelectChat(chat)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12 border-2 border-background dark:border-background/50 shadow-lg">
                            <AvatarImage src={chat.avatar} alt={chat.name} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30 text-primary dark:text-primary/90 font-semibold">
                              {getUserInitials(chat.name, chat.email)}
                            </AvatarFallback>
                          </Avatar>
                          {chat.isOnline && (
                            <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 dark:bg-green-400 rounded-full border-2 border-background dark:border-background/50 shadow-sm" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <h3 className={`font-semibold truncate ${selectedChat?.id === chat.id ? 'text-gray-900 dark:text-gray-100' : 'text-gray-900 dark:text-gray-100'}`}>
                                {chat.name}
                              </h3>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`text-xs font-medium ${selectedChat?.id === chat.id ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                                {formatDate(chat.timestamp)}
                              </span>
                            </div>
                          </div>
                        
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                              {chat.role && (
                                <div className="flex items-center gap-1">
                                  {(() => {
                                    const RoleIcon = getRoleIcon(chat.role);
                                    const isSelected = selectedChat?.id === chat.id;
                                    return (
                                      <RoleIcon className={`h-3 w-3 ${isSelected ? 'text-primary dark:text-primary/90' : 'text-muted-foreground'}`} />
                                    );
                                  })()}
                                  <span className={`text-xs font-medium ${selectedChat?.id === chat.id ? 'text-primary dark:text-primary/90 bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded-full' : 'text-muted-foreground bg-muted dark:bg-muted/50 px-2 py-0.5 rounded-full'}`}>
                                    {chat.role.charAt(0).toUpperCase() + chat.role.slice(1)}
                                  </span>
                                </div>
                              )}
                            </div>
                            {chat.unreadCount > 0 && (
                              <Badge variant="secondary" className={`h-5 min-w-5 text-xs font-semibold ${selectedChat?.id === chat.id ? 'bg-primary/20 text-primary dark:text-primary/90' : 'bg-primary text-primary-foreground'}`}>
                                {chat.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {conversationsLoading && conversationsPage > 1 && (
                    <div className="flex items-center justify-center py-4">
                      <ContentLoader message="Loading more conversations..." />
                    </div>
                  )}
                  {!hasMoreConversations && chats.length > 0 && (
                    <div className="flex items-center justify-center py-4">
                      <div className="text-sm text-gray-700 dark:text-gray-300">No more conversations</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
                </div>

        {/* Chat View */}
        <div className="flex-1 flex flex-col h-full border-r border-border/50">
          {selectedChat ? (
            <>
              {/* Enhanced Chat Header */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 dark:from-primary/10 dark:via-transparent dark:to-primary/10"></div>
                <div className="relative p-6 border-b border-border/50 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-12 w-12 border-2 border-background dark:border-background/50">
                      <AvatarImage src={selectedChat.avatar} alt={selectedChat.name} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30 text-primary dark:text-primary/90 font-semibold">
                        {getUserInitials(selectedChat.name, selectedChat.email)}
                      </AvatarFallback>
                    </Avatar>
                        {selectedChat.isOnline && (
                          <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 dark:bg-green-400 rounded-full border-2 border-background dark:border-background/50 shadow-sm" />
                        )}
                      </div>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-xl font-bold text-foreground">{selectedChat.name}</h2>
                        {selectedChat.role && (
                            <div className="flex items-center gap-2">
                            {(() => {
                              const RoleIcon = getRoleIcon(selectedChat.role);
                              return (
                                  <RoleIcon className="h-4 w-4 text-primary dark:text-primary/90" />
                              );
                            })()}
                              <span className="text-sm font-medium text-primary dark:text-primary/90 bg-primary/10 dark:bg-primary/20 px-3 py-1 rounded-full">
                              {selectedChat.role.charAt(0).toUpperCase() + selectedChat.role.slice(1)}
                            </span>
                          </div>
                        )}
                      </div>
                      <Badge 
                        variant={selectedChat.isOnline ? "default" : "destructive"} 
                          className={`text-xs font-semibold ${selectedChat.isOnline ? 'bg-green-500 dark:bg-green-400 hover:bg-green-600 dark:hover:bg-green-500' : 'bg-red-500 dark:bg-red-400 hover:bg-red-600 dark:hover:bg-red-500'}`}
                      >
                        {selectedChat.isOnline ? 'Online' : 'Offline'}
                      </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canDeleteConversation(selectedChat) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteDialog(true)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 border-red-200 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              {messagesLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <ContentLoader message="Loading messages..." />
                </div>
              ) : (
                <div 
                  className="flex-1 p-4 min-h-0 overflow-y-auto" 
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                >
                  <div className="space-y-4">
                    {selectedChat.messages.length === 0 ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-sm text-muted-foreground">No messages yet</div>
                      </div>
                    ) : (
                      <>
                        {loadingMoreMessages && (
                          <div className="flex items-center justify-center py-4">
                            <ContentLoader message="Loading more messages..." />
                          </div>
                        )}
                        {hasMoreMessages && !messagesLoading && !loadingMoreMessages && (
                          <div className="flex items-center justify-center py-4">
                            <Button 
                              variant="outline" 
                              onClick={loadMoreMessages}
                              className="text-sm"
                            >
                              Load More Messages
                            </Button>
                          </div>
                        )}
                        {selectedChat.messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className="flex items-end gap-1">
                              <div
                                className={` rounded-lg p-4 ${
                                  message.sender === 'me'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <div className="flex flex-col">
                                  <p className="text-sm leading-relaxed">{message.content}</p>
                                  <p className={`text-xs mt-2 ${
                                    message.sender === 'me' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                  }`}>
                                    {formatTime(message.timestamp)}
                                  </p>
                                </div>
                              </div>
                              {/* Temporarily hidden tick marks
                              {message.sender === 'me' && (
                                <div className="mb-1">
                                  {getMessageStatusIcon(message.status)}
                                </div>
                              )}
                              */}
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Enhanced Message Input */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 dark:from-primary/10 dark:via-transparent dark:to-primary/10"></div>
                <div className="relative p-6 border-t border-border/50 flex-shrink-0">
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
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
                        className="min-h-[60px] max-h-[120px] resize-none bg-background/50 dark:bg-background/30 border-border/50 focus:border-primary/50 transition-all duration-300 rounded-xl"
                      />
                    </div>
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!newMessage.trim()}
                      className="h-[60px] w-[60px] p-0 bg-gradient-to-br from-primary to-primary/90 dark:from-primary/90 dark:to-primary/70 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 rounded-xl"
                    >
                      <Send className="h-5 w-5 text-primary-foreground" />
                  </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* No conversation selected but conversations exist */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-8 h-8 text-primary dark:text-primary/90" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">No conversation selected</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  Choose a conversation from the list or start a new one.
                </p>
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {/* Enhanced New Chat Dialog - Always available */}
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
        <DialogContent className="bg-gradient-to-br from-background to-background/95 dark:from-background dark:to-background/90 border border-border/50">
          <DialogHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary/15 to-primary/25 dark:from-primary/20 dark:to-primary/30 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary dark:text-primary/90" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">Start New Conversation</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {profile?.role === 'student' 
                    ? 'Connect with your teachers and fellow students' 
                    : 'Connect with your team members'
                  }
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-6">

            {/* Enhanced Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={profile?.role === 'student' 
                  ? "Search teachers and fellow students by name or email..." 
                  : "Search users by name or email..."
                }
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-background/50 dark:bg-background/30 border-border/50 focus:border-primary/50 transition-all duration-300"
              />
            </div>
            
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder={profile?.role === 'student' ? "Select a teacher or fellow student" : "Select a user"} />
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
                  <div className="px-2 py-1.5 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500 dark:text-gray-400" />
                  </div>
                ) : availableUsers.length === 0 && !usersLoading ? (
                  <div className="px-2 py-1.5 text-sm text-gray-600 dark:text-gray-300 text-center">
                    {userSearchQuery.trim() 
                      ? `No ${profile?.role === 'admin' ? 'users' : profile?.role === 'teacher' ? 'students or admins' : 'teachers and fellow students'} found matching "${userSearchQuery}"`
                      : `No ${profile?.role === 'admin' ? 'users' : profile?.role === 'teacher' ? 'students or admins' : 'teachers and fellow students'} available to message`
                    }
                  </div>
                ) : (
                  <>
                    {availableUsers.map((user) => {
                      const RoleIcon = getRoleIcon(user.role);
                      return (
                        <SelectItem key={user.id} value={user.id} className="focus:bg-green-100 focus:text-gray-900 dark:focus:bg-green-900 dark:focus:text-white [&[data-highlighted]]:bg-green-100 [&[data-highlighted]]:text-gray-900 dark:[&[data-highlighted]]:bg-green-900 dark:[&[data-highlighted]]:text-white group">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs font-semibold bg-gray-200 dark:bg-muted text-gray-900 dark:text-white group-hover:bg-white/20 group-hover:text-white group-focus:bg-white/20 group-focus:text-white" data-avatar>
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
                                <span className="font-medium text-gray-900 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white group-focus:text-gray-900 dark:group-focus:text-white">{`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown'}</span>
                                {user.role ? (
                                  <>
                                    <RoleIcon className={`h-3 w-3 ${getRoleColor(user.role)} group-hover:text-gray-700 dark:group-hover:text-gray-300 group-focus:text-gray-700 dark:group-focus:text-gray-300`} />
                                    <span className={`text-xs font-medium ${getRoleColor(user.role)} px-1 rounded group-hover:text-gray-800 group-hover:bg-gray-100 dark:group-hover:text-white dark:group-hover:bg-gray-700 group-focus:text-gray-800 group-focus:bg-gray-100 dark:group-focus:text-white dark:group-focus:bg-gray-700`}>
                                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-xs text-red-500 font-medium bg-red-100 px-1 rounded group-hover:text-red-700 group-hover:bg-red-200 dark:group-hover:text-red-300 dark:group-hover:bg-red-900 group-focus:text-red-700 group-focus:bg-red-200 dark:group-focus:text-red-300 dark:group-focus:bg-red-900">
                                    No Role
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 group-focus:text-gray-700 dark:group-focus:text-gray-200">{user.email}</span>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                    {usersLoading && currentPage > 1 && (
                      <div className="px-2 py-1.5 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-500 dark:text-gray-400" />
                      </div>
                    )}
                    {!hasMoreUsers && availableUsers.length > 0 && (
                      <div className="px-2 py-1.5 text-sm text-gray-600 dark:text-gray-300">
                        No more {profile?.role === 'admin' ? 'users' : profile?.role === 'teacher' ? 'students and admins' : 'teachers and fellow students'}
                      </div>
                    )}
                  </>
                )}
                </div>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowNewChatDialog(false)}
                className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateNewChat} 
                disabled={!selectedUser}
                className="bg-gradient-to-br from-primary to-primary/90 dark:from-primary/90 dark:to-primary/70 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 text-white dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Chat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Conversation Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-gradient-to-br from-background to-background/95 dark:from-background dark:to-background/90 border border-border/50">
          <DialogHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500/15 to-red-500/25 dark:from-red-500/20 dark:to-red-500/30 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">Delete Conversation</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Are you sure you want to delete this conversation? This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={deletingConversation === selectedChat?.id}
              className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedChat && handleDeleteConversation(selectedChat.id)}
              disabled={deletingConversation === selectedChat?.id}
              className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
            >
              {deletingConversation === selectedChat?.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Conversation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 