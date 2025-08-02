import { supabase } from '@/integrations/supabase/client';

export interface UserForMessaging {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  isOnline?: boolean;
}

export interface Conversation {
  id: string;
  title?: string;
  type: 'direct' | 'group';
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  is_archived: boolean;
  is_deleted: boolean;
  participants?: ConversationParticipant[];
  unread_count?: number;
  last_message?: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'participant' | 'admin' | 'moderator' | 'teacher' | 'student';
  joined_at: string;
  left_at?: string;
  is_muted: boolean;
  is_blocked: boolean;
  last_read_at: string;
  user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
    role: 'admin' | 'teacher' | 'student';
  };
  profiles?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: 'admin' | 'teacher' | 'student';
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  reply_to_id?: string;
  reply_to_content?: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  is_deleted: boolean;
  metadata?: Record<string, any>;
  status?: 'sent' | 'delivered' | 'read';
}

export interface CreateConversationRequest {
  title?: string;
  type: 'direct' | 'group';
  participant_ids: string[];
}

export interface SendMessageRequest {
  content: string;
  message_type?: 'text' | 'image' | 'file' | 'system';
  reply_to_id?: string;
  metadata?: Record<string, any>;
}

// API Base URL - update this to match your FastAPI backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = supabase.auth.getSession().then(session => session.data.session?.access_token);
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

// WebSocket connection management
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventHandlers: Map<string, Function[]> = new Map();

  connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    console.log('Attempting to connect to WebSocket:', `${API_BASE_URL.replace('http', 'ws')}/api/ws/${token}`);
    this.ws = new WebSocket(`${API_BASE_URL.replace('http', 'ws')}/api/ws/${token}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect(token);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private attemptReconnect(token: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect(token);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private handleMessage(data: any) {
    console.log('Received WebSocket message:', data);
    
    // Handle connection confirmation
    if (data.type === 'connection_confirmed') {
      console.log('WebSocket connection confirmed by backend');
    }
    
    // Handle join confirmation
    if (data.type === 'join_confirmed') {
      console.log('Successfully joined conversation:', data.conversation_id);
    }
    
    // Handle new messages
    if (data.type === 'new_message') {
      console.log('Received new message via WebSocket:', data.message);
    }
    
    const handlers = this.eventHandlers.get(data.type) || [];
    handlers.forEach(handler => handler(data));
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function) {
    const handlers = this.eventHandlers.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('Sending WebSocket message:', data);
      this.ws.send(JSON.stringify(data));
    } else {
      console.log('WebSocket not open, cannot send message:', data);
    }
  }

  joinConversation(conversationId: string) {
    console.log(`Joining WebSocket conversation: ${conversationId}`);
    this.send({
      type: 'join_conversation',
      conversation_id: conversationId
    });
  }

  leaveConversation(conversationId: string) {
    this.send({
      type: 'leave_conversation',
      conversation_id: conversationId
    });
  }

  startTyping(conversationId: string) {
    this.send({
      type: 'typing_start',
      conversation_id: conversationId
    });
  }

  stopTyping(conversationId: string) {
    this.send({
      type: 'typing_stop',
      conversation_id: conversationId
    });
  }

  markMessageRead(messageId: string, conversationId: string) {
    this.send({
      type: 'message_read',
      message_id: messageId,
      conversation_id: conversationId
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Global WebSocket manager instance
export const wsManager = new WebSocketManager();

// Existing user fetching functions (keep these as they are)
export const getUsersForAdminMessaging = async (page: number = 1, limit: number = 10) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Get total count
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // Get data
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role')
    .range(from, to)
    .order('first_name');

  if (error) {
    throw error;
  }

  return {
    users: users || [],
    hasMore: count ? from + limit < count : false,
    total: count || 0
  };
};

export const getStudentsForTeacherMessaging = async (teacherId: string, page: number = 1, limit: number = 10) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    // Get students for this teacher by querying course_members
    // First, get all courses where this teacher is a member
    const { data: teacherCourses, error: teacherCoursesError } = await supabase
      .from('course_members')
      .select('course_id')
      .eq('user_id', teacherId)
      .eq('role', 'teacher');

    if (teacherCoursesError) throw teacherCoursesError;

    if (!teacherCourses || teacherCourses.length === 0) {
      return {
        users: [],
        hasMore: false,
        total: 0
      };
    }

    const courseIds = teacherCourses.map(tc => tc.course_id);

    // Then get all students in those courses
    const { data: courseMembers, error: courseError } = await supabase
      .from('course_members')
      .select(`
        profiles!inner(
          id, first_name, last_name, email, role
        )
      `)
      .in('course_id', courseIds)
      .eq('role', 'student')
      .eq('profiles.role', 'student');

    if (courseError) throw courseError;

    const students = courseMembers?.map(cm => cm.profiles) || [];

    // Get all admins
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .eq('role', 'admin');

    if (adminsError) throw adminsError;

    // Combine and sort
    const allUsers = [...(students || []), ...(admins || [])];
    const sortedUsers = allUsers.sort((a, b) => {
      const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
      const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
      return nameA.localeCompare(nameB);
    });

    // Apply client-side pagination
    const paginatedUsers = sortedUsers.slice(from, from + limit);

    return {
      users: paginatedUsers,
      hasMore: from + limit < allUsers.length,
      total: allUsers.length
    };
  } catch (error) {
    console.error('Error fetching students for teacher:', error);
    throw error;
  }
};

export const getTeachersForStudentMessaging = async (studentId: string, page: number = 1, limit: number = 10) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    // Get teachers for this student by querying course_members
    // First, get all courses where this student is a member
    const { data: studentCourses, error: studentCoursesError } = await supabase
      .from('course_members')
      .select('course_id')
      .eq('user_id', studentId)
      .eq('role', 'student');

    if (studentCoursesError) throw studentCoursesError;

    if (!studentCourses || studentCourses.length === 0) {
      return {
        users: [],
        hasMore: false,
        total: 0
      };
    }

    const courseIds = studentCourses.map(sc => sc.course_id);

    // Then get all teachers in those courses
    const { data: courseMembers, error: courseError } = await supabase
      .from('course_members')
      .select(`
        profiles!inner(
          id, first_name, last_name, email, role
        )
      `)
      .in('course_id', courseIds)
      .eq('role', 'teacher')
      .eq('profiles.role', 'teacher');

    if (courseError) throw courseError;

    const teachers = courseMembers?.map(cm => cm.profiles) || [];

    // Apply client-side pagination
    const paginatedTeachers = teachers.slice(from, from + limit);

    return {
      users: paginatedTeachers,
      hasMore: from + limit < teachers.length,
      total: teachers.length
    };
  } catch (error) {
    console.error('Error fetching teachers for student:', error);
    throw error;
  }
};

// Search functions (keep existing)
export const searchUsersForMessaging = async (searchTerm: string, page: number = 1, limit: number = 10) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role')
    .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    .range(from, to)
    .order('first_name');

  if (error) {
    throw error;
  }

  return {
    users: users || [],
    hasMore: users ? users.length === limit : false,
    total: users?.length || 0
  };
};

export const searchStudentsForTeacherMessaging = async (teacherId: string, searchTerm: string, page: number = 1, limit: number = 10) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    // Get students for this teacher by querying course_members
    // First, get all courses where this teacher is a member
    const { data: teacherCourses, error: teacherCoursesError } = await supabase
      .from('course_members')
      .select('course_id')
      .eq('user_id', teacherId)
      .eq('role', 'teacher');

    if (teacherCoursesError) throw teacherCoursesError;

    if (!teacherCourses || teacherCourses.length === 0) {
      return {
        users: [],
        hasMore: false,
        total: 0
      };
    }

    const courseIds = teacherCourses.map(tc => tc.course_id);

    // Then get all students in those courses
    const { data: courseMembers, error: courseError } = await supabase
      .from('course_members')
      .select(`
        profiles!inner(
          id, first_name, last_name, email, role
        )
      `)
      .in('course_id', courseIds)
      .eq('role', 'student')
      .eq('profiles.role', 'student');

    if (courseError) throw courseError;

    const students = courseMembers?.map(cm => cm.profiles) || [];

    // Get all admins
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .eq('role', 'admin');

    if (adminsError) throw adminsError;

    // Combine and filter by search term
    const allUsers = [...(students || []), ...(admins || [])];
    const filteredUsers = allUsers.filter(user => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Sort and paginate
    const sortedUsers = filteredUsers.sort((a, b) => {
      const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
      const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
      return nameA.localeCompare(nameB);
    });
    const paginatedUsers = sortedUsers.slice(from, from + limit);

    return {
      users: paginatedUsers,
      hasMore: from + limit < filteredUsers.length,
      total: filteredUsers.length
    };
  } catch (error) {
    console.error('Error searching students for teacher:', error);
    throw error;
  }
};

export const searchTeachersForStudentMessaging = async (studentId: string, searchTerm: string, page: number = 1, limit: number = 10) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    // Get teachers for this student by querying course_members
    // First, get all courses where this student is a member
    const { data: studentCourses, error: studentCoursesError } = await supabase
      .from('course_members')
      .select('course_id')
      .eq('user_id', studentId)
      .eq('role', 'student');

    if (studentCoursesError) throw studentCoursesError;

    if (!studentCourses || studentCourses.length === 0) {
      return {
        users: [],
        hasMore: false,
        total: 0
      };
    }

    const courseIds = studentCourses.map(sc => sc.course_id);

    // Then get all teachers in those courses
    const { data: courseMembers, error: courseError } = await supabase
      .from('course_members')
      .select(`
        profiles!inner(
          id, first_name, last_name, email, role
        )
      `)
      .in('course_id', courseIds)
      .eq('role', 'teacher')
      .eq('profiles.role', 'teacher');

    if (courseError) throw courseError;

    const teachers = courseMembers?.map(cm => cm.profiles) || [];

    // Filter by search term
    const filteredTeachers = teachers.filter(teacher => {
      const fullName = `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim();
      return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.email.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Sort and paginate
    const sortedTeachers = filteredTeachers.sort((a, b) => {
      const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
      const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
      return nameA.localeCompare(nameB);
    });
    const paginatedTeachers = sortedTeachers.slice(from, from + limit);

    return {
      users: paginatedTeachers,
      hasMore: from + limit < filteredTeachers.length,
      total: filteredTeachers.length
    };
  } catch (error) {
    console.error('Error searching teachers for student:', error);
    throw error;
  }
};

// New API functions for conversations and messages
export const createConversation = async (data: CreateConversationRequest): Promise<Conversation> => {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  
  const response = await fetch(`${API_BASE_URL}/api/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create conversation');
  }

  return response.json();
};

export const getConversations = async (page: number = 1, limit: number = 50): Promise<{ conversations: Conversation[], hasMore: boolean, total: number }> => {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  
  const response = await fetch(`${API_BASE_URL}/api/conversations?page=${page}&limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch conversations');
  }

  const data = await response.json();
  
  // Handle both array response and object response formats
  if (Array.isArray(data)) {
    // Backend returns array directly
    return {
      conversations: data,
      hasMore: false, // We don't have pagination info in this case
      total: data.length
    };
  } else {
    // Backend returns object with conversations property
    return data;
  }
};

export const getConversation = async (conversationId: string): Promise<Conversation> => {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  
  const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch conversation');
  }

  return response.json();
};

export const updateConversation = async (conversationId: string, data: Partial<Conversation>): Promise<Conversation> => {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  
  const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update conversation');
  }

  return response.json();
};

export const deleteConversation = async (conversationId: string): Promise<void> => {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  
  const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete conversation');
  }
};

export const sendMessage = async (conversationId: string, data: SendMessageRequest): Promise<Message> => {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  
  const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to send message');
  }

  return response.json();
};

export const getMessages = async (conversationId: string, page: number = 1, limit: number = 50): Promise<{ messages: Message[], hasMore: boolean, total: number }> => {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  
  const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/messages?page=${page}&limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch messages');
  }

  return response.json();
};

export const editMessage = async (messageId: string, content: string): Promise<Message> => {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  
  const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${token}`,
    },
    body: `content=${encodeURIComponent(content)}`,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to edit message');
  }

  return response.json();
};

export const deleteMessage = async (messageId: string): Promise<void> => {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  
  const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete message');
  }
};

export const markMessageAsRead = async (messageId: string): Promise<void> => {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  
  const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}/read`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to mark message as read');
  }
};

export const getUserStatus = async (userIds: string[]): Promise<Record<string, { status: string, last_seen_at: string, is_typing: boolean }>> => {
  try {
    // Try backend API first
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    
    const queryParams = userIds.map(id => `user_ids=${id}`).join('&');
    const response = await fetch(`${API_BASE_URL}/api/users/status?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      return response.json();
    }
  } catch (error) {
    console.log('Backend user status API failed, using direct database query');
  }

  // Fallback to direct database query
  try {
    const { data: userStatuses, error } = await supabase
      .from('user_status')
      .select('user_id, status, last_seen_at, is_typing')
      .in('user_id', userIds);

    if (error) throw error;

    const result: Record<string, { status: string, last_seen_at: string, is_typing: boolean }> = {};
    
    userStatuses?.forEach(status => {
      result[status.user_id] = {
        status: status.status || 'offline',
        last_seen_at: status.last_seen_at || new Date().toISOString(),
        is_typing: status.is_typing || false
      };
    });

    // Set default status for users not found in database
    userIds.forEach(userId => {
      if (!result[userId]) {
        result[userId] = {
          status: 'offline',
          last_seen_at: new Date().toISOString(),
          is_typing: false
        };
      }
    });

    return result;
  } catch (error) {
    console.error('Error fetching user status from database:', error);
    throw new Error('Failed to fetch user status');
  }
};

export const updateUserStatus = async (data: { status?: string, is_typing?: boolean, typing_in_conversation?: string }): Promise<void> => {
  try {
    // Try backend API first
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    
    const response = await fetch(`${API_BASE_URL}/api/users/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      return;
    }
  } catch (error) {
    console.log('Backend user status API failed, using direct database update');
  }

  // Fallback to direct database update
  try {
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user?.id;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (data.status) {
      updateData.status = data.status;
      updateData.last_seen_at = new Date().toISOString();
    }

    if (data.is_typing !== undefined) {
      updateData.is_typing = data.is_typing;
    }

    if (data.typing_in_conversation) {
      updateData.typing_in_conversation = data.typing_in_conversation;
    }

    const { error } = await supabase
      .from('user_status')
      .upsert({
        user_id: userId,
        ...updateData
      }, {
        onConflict: 'user_id'
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error updating user status in database:', error);
    throw new Error('Failed to update user status');
  }
};

// Initialize WebSocket connection
export const initializeWebSocket = async () => {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  
  if (token) {
    wsManager.connect(token);
  }
};

// Disconnect WebSocket
export const disconnectWebSocket = () => {
  wsManager.disconnect();
}; 