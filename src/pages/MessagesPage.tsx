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
  updateUserStatus,
  markConversationAsRead,
  markMessageAsDelivered,
  markMessageAsRead
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

// Helper function to get message status tick icon
const getMessageStatusIcon = (status: string) => {
  switch (status) {
    case 'sent':
      return <Check className="h-3 w-3 text-muted-foreground" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    case 'read':
      return <CheckCheck className="h-3 w-3 text-green-500" />;
    default:
      return <Check className="h-3 w-3 text-muted-foreground" />;
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
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [conversationsPage, setConversationsPage] = useState(1);
  const [hasMoreConversations, setHasMoreConversations] = useState(true);
  const [conversationsSearchQuery, setConversationsSearchQuery] = useState('');
  const [conversationsSearchLoading, setConversationsSearchLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [loadingMessagesForChat, setLoadingMessagesForChat] = useState<string | null>(null);
  const initialLoadCompleteRef = useRef(false);
  const autoSelectionCompleteRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const conversationsContainerRef = useRef<any>(null);



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

  // Load conversations on component mount
  useEffect(() => {
    // Prevent multiple simultaneous loads
    if (initialLoadCompleteRef.current) {
      return;
    }
    
    const loadConversations = async () => {
      if (!user?.id) {
        return;
      }
      
      // Double-check to prevent race conditions
      if (initialLoadCompleteRef.current) {
        return;
      }
      setConversationsLoading(true);
      setConversationsLoaded(false); // Reset loaded state
      
      try {
        // Use getConversations with optional search query
        const result = await getConversations(1, 10, conversationsSearchQuery); // Limit to 10 for testing
        
        const convertedChats = result.conversations.map(conv => 
          convertAPIConversationToChat(conv, user.id)
        );
        
        // Set default offline status - will be updated with actual status from API
        const chatsWithDefaultStatus = convertedChats.map(chat => ({
          ...chat,
          isOnline: false // Default to offline, will be updated with actual status
        }));
        
        setChats(chatsWithDefaultStatus);
        setHasMoreConversations(result.hasMore);
        setConversationsPage(1);

        // Clear selected chat if no conversations found
        if (chatsWithDefaultStatus.length === 0) {
          setSelectedChat(null);
          setCurrentConversationId(null);
          return; // Exit early since there are no conversations to process
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
            
            // Note: Auto-selection is handled in the consolidated logic below
      } catch (statusError) {
        console.error('Error fetching user status:', statusError);
        // Keep default online status if API fails
        // Don't auto-select here - it will be handled below
      }
    } else {
      // No participants to fetch status for
    }
    
    // Auto-select first conversation if not already selected (consolidated logic)
    if (!selectedChat && chatsWithDefaultStatus.length > 0 && !autoSelectionCompleteRef.current) {
      const firstChat = chatsWithDefaultStatus[0];
      autoSelectionCompleteRef.current = true;
      setSelectedChat(firstChat);
      setCurrentConversationId(firstChat.id);
      
      // Join WebSocket room for the first conversation
      wsManager.joinConversation(firstChat.id);
      
      // Load messages for the first conversation
      loadMessagesForChat(firstChat);
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
      }
    };

    loadConversations();
  }, [user?.id]); // Removed initialLoadComplete from dependencies to prevent re-runs

  // Debounced search effect for conversations
  useEffect(() => {
    // Don't run search effect on initial load
    if (!initialLoadCompleteRef.current) {
      return;
    }
    
    // Set search loading state immediately when query changes
    setConversationsSearchLoading(true);
    
    const timer = setTimeout(() => {
      // Reset to page 1 when search changes
      setConversationsPage(1);
      setHasMoreConversations(true);
      setConversationsSearchLoading(false);
      
      // Trigger conversation loading with debounced search query
      if (user?.id) {
        const loadConversations = async () => {
          setConversationsLoading(true);
          setConversationsLoaded(false);
          
          try {
            const result = await getConversations(1, 10, conversationsSearchQuery);
            
            const convertedChats = result.conversations.map(conv => 
              convertAPIConversationToChat(conv, user.id)
            );
            
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
                
                // Auto-select the first conversation if no conversation is currently selected
                if (!selectedChat && updatedChats.length > 0) {
                  const firstChat = updatedChats[0];
                  setSelectedChat(firstChat);
                  setCurrentConversationId(firstChat.id);
                  wsManager.joinConversation(firstChat.id);
                  loadMessagesForChat(firstChat);
                }
              } catch (statusError) {
                console.error('Error fetching user status:', statusError);
                
                if (!selectedChat && chatsWithDefaultStatus.length > 0) {
                  const firstChat = chatsWithDefaultStatus[0];
                  setSelectedChat(firstChat);
                  setCurrentConversationId(firstChat.id);
                  wsManager.joinConversation(firstChat.id);
                  loadMessagesForChat(firstChat);
                }
              }
            } else {
              if (!selectedChat && chatsWithDefaultStatus.length > 0) {
                const firstChat = chatsWithDefaultStatus[0];
                setSelectedChat(firstChat);
                setCurrentConversationId(firstChat.id);
                wsManager.joinConversation(firstChat.id);
                loadMessagesForChat(firstChat);
              }
            }
            
            setConversationsLoaded(true);
          } catch (error) {
            console.error('Error loading conversations:', error);
          } finally {
            setConversationsLoading(false);
          }
        };
        
        loadConversations();
      }
    }, 800); // Increased delay to reduce API calls

    return () => {
      clearTimeout(timer);
    };
  }, [conversationsSearchQuery, user?.id]);



  // Auto-scroll to bottom when new messages arrive and mark messages as read
  useEffect(() => {
    scrollToBottom();
    // Mark messages as read when they come into view
    markMessagesAsRead();
  }, [selectedChat?.messages]);

  // Initialize WebSocket connection and status management
  useEffect(() => {
    if (user?.id) {
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
          
          // If no conversation is currently selected, auto-select this new one
          if (!selectedChat) {
            setSelectedChat(newChat);
            setCurrentConversationId(newChat.id);
            wsManager.joinConversation(newChat.id);
          }
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

        // If this is a message from another user, mark it as delivered immediately
        if (data.message.sender_id !== user.id) {
          // Send WebSocket event to mark message as delivered
          wsManager.markMessageDelivered(data.message.id, data.message.conversation_id);
          
          // Update local message status to "delivered"
          setTimeout(() => {
            setChats(prevChats => {
              return prevChats.map(chat => {
                if (chat.id === data.message.conversation_id) {
                  return {
                    ...chat,
                    messages: chat.messages.map(msg => 
                      msg.id === data.message.id ? { ...msg, status: 'delivered' } : msg
                    )
                  };
                }
                return chat;
              });
            });

            setSelectedChat(prevSelected => {
              if (prevSelected?.id === data.message.conversation_id) {
                return {
                  ...prevSelected,
                  messages: prevSelected.messages.map(msg => 
                    msg.id === data.message.id ? { ...msg, status: 'delivered' } : msg
                  )
                };
              }
              return prevSelected;
            });
          }, 100); // Small delay to ensure message is added first
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

    // Handle message delivered status changes
    const handleMessageDelivered = (data: any) => {
      if (data.message_id && data.conversation_id) {
        // Update message status to "delivered" in all chats
        setChats(prevChats => {
          return prevChats.map(chat => {
            if (chat.id === data.conversation_id) {
              return {
                ...chat,
                messages: chat.messages.map(msg => 
                  msg.id === data.message_id ? { ...msg, status: 'delivered' } : msg
                )
              };
            }
            return chat;
          });
        });

        // Also update selected chat
        setSelectedChat(prevSelected => {
          if (prevSelected?.id === data.conversation_id) {
            return {
              ...prevSelected,
              messages: prevSelected.messages.map(msg => 
                msg.id === data.message_id ? { ...msg, status: 'delivered' } : msg
              )
            };
          }
          return prevSelected;
        });
      }
    };

    // Handle message read status changes
    const handleMessageRead = (data: any) => {
      if (data.message_id && data.conversation_id) {
        // Update message status to "read" in all chats
        setChats(prevChats => {
          return prevChats.map(chat => {
            if (chat.id === data.conversation_id) {
              return {
                ...chat,
                messages: chat.messages.map(msg => 
                  msg.id === data.message_id ? { ...msg, status: 'read' } : msg
                )
              };
            }
            return chat;
          });
        });

        // Also update selected chat
        setSelectedChat(prevSelected => {
          if (prevSelected?.id === data.conversation_id) {
            return {
              ...prevSelected,
              messages: prevSelected.messages.map(msg => 
                msg.id === data.message_id ? { ...msg, status: 'read' } : msg
              )
            };
          }
          return prevSelected;
        });
      }
    };

    // Register event handlers
    wsManager.on('new_conversation', handleNewConversation);
    wsManager.on('new_message', handleNewMessage);
    wsManager.on('user_status_change', handleUserStatusChange);
    wsManager.on('message_delivered', handleMessageDelivered);
    wsManager.on('message_read', handleMessageRead);

    return () => {
      wsManager.off('new_conversation', handleNewConversation);
      wsManager.off('new_message', handleNewMessage);
      wsManager.off('user_status_change', handleUserStatusChange);
      wsManager.off('message_delivered', handleMessageDelivered);
      wsManager.off('message_read', handleMessageRead);
    };
  }, [user?.id]);



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

  // Function to mark messages as read when they come into view
  const markMessagesAsRead = async () => {
    if (!selectedChat || !user?.id) return;

    // Get all unread messages from other users in the current conversation
    const unreadMessages = selectedChat.messages.filter(msg => 
      msg.sender === 'other' && msg.status !== 'read'
    );

    if (unreadMessages.length === 0) return;

    try {
      // Mark all unread messages as read
      for (const message of unreadMessages) {
        // Send WebSocket event
        wsManager.markMessageRead(message.id, selectedChat.id);
        
        // Update local message status
        setChats(prevChats => {
          return prevChats.map(chat => {
            if (chat.id === selectedChat.id) {
              return {
                ...chat,
                messages: chat.messages.map(msg => 
                  msg.id === message.id ? { ...msg, status: 'read' } : msg
                ),
                unreadCount: 0 // Reset unread count
              };
            }
            return chat;
          });
        });

        setSelectedChat(prevSelected => {
          if (prevSelected?.id === selectedChat.id) {
            return {
              ...prevSelected,
              messages: prevSelected.messages.map(msg => 
                msg.id === message.id ? { ...msg, status: 'read' } : msg
              ),
              unreadCount: 0 // Reset unread count
            };
          }
          return prevSelected;
        });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
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
    if (!selectedChat || !hasMoreMessages || messagesLoading) return;

    setMessagesLoading(true);
    try {
      const nextPage = messagesPage + 1;
      const result = await getMessages(selectedChat.id, nextPage, 50);
      
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
      setMessagesLoading(false);
    }
  };

  // Handle scroll to load more messages
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0 && hasMoreMessages && !messagesLoading) {
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
    setHasMoreMessages(true);

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
      setHasMoreMessages(result.hasMore);
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
    <div className="flex h-screen bg-background">
      {/* Always show the main layout structure */}
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
                value={conversationsSearchQuery}
                onChange={(e) => setConversationsSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Chat List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {(conversationsLoading && conversationsPage === 1) || (conversationsSearchLoading && conversationsSearchQuery.trim()) ? (
                <div className="flex items-center justify-center py-8">
                  <ContentLoader message={conversationsSearchQuery.trim() ? "Searching conversations..." : "Loading conversations..."} />
                </div>
              ) : chats.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    {conversationsSearchQuery.trim() ? (
                      <>
                        <div className="text-4xl mb-4">🔍</div>
                        <h2 className="text-lg font-semibold mb-2">No conversations found</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                          No conversations match "{conversationsSearchQuery}"
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={() => setConversationsSearchQuery('')}
                          className="text-xs"
                        >
                          Clear search
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="text-4xl mb-4">💬</div>
                        <h2 className="text-lg font-semibold mb-2">No conversations yet</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                          Start messaging with other users by creating your first conversation.
                        </p>
                        <Button onClick={() => setShowNewChatDialog(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Conversation
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedChat?.id === chat.id
                          ? 'bg-green-100 dark:bg-accent'
                          : 'hover:bg-green-50 dark:hover:bg-green-900/30'
                      }`}
                      onClick={() => handleSelectChat(chat)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={chat.avatar} alt={chat.name} />
                            <AvatarFallback className="bg-gray-200 dark:bg-muted text-gray-900 dark:text-white font-semibold">
                              {getUserInitials(chat.name, chat.email)}
                            </AvatarFallback>
                          </Avatar>
                          {chat.isOnline && (
                            <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                                                      <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h3 className={`font-medium truncate ${selectedChat?.id === chat.id ? 'text-gray-900' : 'text-black dark:text-white'}`}>{chat.name}</h3>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={`text-xs ${selectedChat?.id === chat.id ? 'text-gray-700' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {formatDate(chat.timestamp)}
                                </span>
                              </div>
                            </div>
                        
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                              {chat.role && (
                                <div className="flex items-center gap-1">
                                  {(() => {
                                    const RoleIcon = getRoleIcon(chat.role);
                                    const isSelected = selectedChat?.id === chat.id;
                                    return (
                                      <RoleIcon className={`h-3 w-3 ${isSelected ? 'text-gray-700' : 'text-gray-600 dark:text-gray-400'}`} />
                                    );
                                  })()}
                                  <span className={`text-xs font-medium ${selectedChat?.id === chat.id ? 'text-gray-800 bg-white/80 px-1 rounded' : 'text-gray-800 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 px-1 rounded'}`}>
                                    {chat.role.charAt(0).toUpperCase() + chat.role.slice(1)}
                                  </span>
                                </div>
                              )}
                            </div>
                            {chat.unreadCount > 0 && (
                              <Badge variant="secondary" className={`h-5 min-w-5 text-xs ${selectedChat?.id === chat.id ? 'bg-white/20 text-white' : ''}`}>
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
        <div className="flex-1 flex flex-col h-full">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedChat.avatar} alt={selectedChat.name} />
                      <AvatarFallback className="bg-gray-200 dark:bg-muted text-gray-900 dark:text-white font-semibold">
                        {getUserInitials(selectedChat.name, selectedChat.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold">{selectedChat.name}</h2>
                        {selectedChat.role && (
                          <div className="flex items-center gap-1">
                            {(() => {
                              const RoleIcon = getRoleIcon(selectedChat.role);
                              return (
                                <RoleIcon className={`h-3 w-3 ${getSelectedRoleColor(selectedChat.role)}`} />
                              );
                            })()}
                            <span className={`text-xs font-medium ${getSelectedRoleColor(selectedChat.role)} px-1 rounded`}>
                              {selectedChat.role.charAt(0).toUpperCase() + selectedChat.role.slice(1)}
                            </span>
                          </div>
                        )}
                      </div>
                      <Badge 
                        variant={selectedChat.isOnline ? "default" : "destructive"} 
                        className={`text-xs ${selectedChat.isOnline ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                      >
                        {selectedChat.isOnline ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              {messagesLoading && messagesPage === 1 ? (
                <div className="flex-1 flex items-center justify-center">
                  <ContentLoader message="Loading messages..." />
                </div>
              ) : (
                <ScrollArea 
                  className="flex-1 p-4 min-h-0" 
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
                        {messagesLoading && (
                          <div className="flex items-center justify-center py-4">
                            <ContentLoader message="Loading more messages..." />
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
                </ScrollArea>
              )}

              {/* Message Input */}
              <div className="p-4 border-t border-border flex-shrink-0">
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
          ) : chats.length === 0 ? (
            /* No conversations available */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {conversationsSearchQuery.trim() ? 'No conversations found' : 'No conversations yet'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {conversationsSearchQuery.trim() 
                    ? `No conversations match "${conversationsSearchQuery}"`
                    : 'Start messaging with other users by creating your first conversation.'
                  }
                </p>
                {!conversationsSearchQuery.trim() && (
                  <Button onClick={() => setShowNewChatDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Conversation
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* No conversation selected but conversations exist */
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                placeholder="Search users by name or email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-10 placeholder:text-gray-500 dark:placeholder:text-gray-400"
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
                  <div className="px-2 py-1.5 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500 dark:text-gray-400" />
                  </div>
                ) : availableUsers.length === 0 && !usersLoading ? (
                  <div className="px-2 py-1.5 text-sm text-gray-600 dark:text-gray-300 text-center">
                    {userSearchQuery.trim() 
                      ? `No ${profile?.role === 'admin' ? 'users' : profile?.role === 'teacher' ? 'students or admins' : 'teachers'} found matching "${userSearchQuery}"`
                      : `No ${profile?.role === 'admin' ? 'users' : profile?.role === 'teacher' ? 'students or admins' : 'teachers'} available to message`
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