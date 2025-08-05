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



// Helper function to get a valid access token
const getValidToken = async (): Promise<string> => {
  try {
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      throw new Error('Failed to get session');
    }
    
    if (!session) {
      console.error('No active session found');
      throw new Error('No active session');
    }
    
    // Decode and inspect the JWT token (without verification)
    if (session.access_token) {
      try {
        const tokenParts = session.access_token.split('.');
        if (tokenParts.length === 3) {
          const header = JSON.parse(atob(tokenParts[0]));
          const payload = JSON.parse(atob(tokenParts[1]));
          
          // Check if token is actually expired by comparing with current time
          const currentTime = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp < currentTime) {
            // Force refresh the session
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('Error refreshing expired token:', refreshError);
              throw new Error('Failed to refresh expired token');
            }
            
            if (!refreshData.session) {
              throw new Error('No session after refresh');
            }
            
            return refreshData.session.access_token;
          }
        }
      } catch (decodeError) {
        console.error('Error decoding JWT token:', decodeError);
      }
    }
    
    // Check if token is expired or will expire soon (within 5 minutes)
    const tokenExpiry = new Date(session.expires_at! * 1000);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    if (tokenExpiry <= fiveMinutesFromNow) {
      // Refresh the token
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Error refreshing token:', refreshError);
        throw new Error('Failed to refresh token');
      }
      
      if (!refreshData.session) {
        throw new Error('No session after refresh');
      }
      
      return refreshData.session.access_token;
    }
    
    return session.access_token;
  } catch (error) {
    console.error('Error getting valid token:', error);
    
    // Try to get a fresh session as fallback
    try {
      const { data: { session: freshSession }, error: freshError } = await supabase.auth.getSession();
      
      if (freshError) {
        console.error('Fresh session error:', freshError);
        throw new Error('Failed to get fresh session');
      }
      
      if (!freshSession) {
        throw new Error('No fresh session available');
      }
      
      return freshSession.access_token;
    } catch (fallbackError) {
      console.error('Fallback session failed:', fallbackError);
      
      // If both the main session and fallback failed, the user might need to re-authenticate
      throw new Error('Authentication required - please log in again');
    }
  }
};

// Helper function to get auth headers with valid token
const getAuthHeaders = async () => {
  const token = await getValidToken();
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

  async connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const token = await getValidToken();
      
      const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/api/ws/${token}`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
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

      this.ws.onclose = (event) => {
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      throw error;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private handleMessage(data: any) {
    // Handle connection confirmation
    if (data.type === 'connection_confirmed') {
      // Connection confirmed
    }
    
    // Handle join confirmation
    if (data.type === 'join_confirmed') {
      // Successfully joined conversation
    }
    
    // Handle new conversations
    if (data.type === 'new_conversation') {
      // Received new conversation via WebSocket
    }
    
    // Handle new messages
    if (data.type === 'new_message') {
      // Received new message via WebSocket
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
      this.ws.send(JSON.stringify(data));
    }
  }

  joinConversation(conversationId: string) {
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

  markMessageDelivered(messageId: string, conversationId: string) {
    this.send({
      type: 'message_delivered',
      message_id: messageId,
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

    const students: any[] = [];
    const teachers: any[] = [];

    if (teacherCourses && teacherCourses.length > 0) {
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
      students.push(...(courseMembers?.map(cm => cm.profiles) || []));

      // Get all teachers in those courses (excluding the current teacher)
      const { data: courseTeachers, error: teachersError } = await supabase
        .from('course_members')
        .select(`
          profiles!inner(
            id, first_name, last_name, email, role
          )
        `)
        .in('course_id', courseIds)
        .eq('role', 'teacher')
        .eq('profiles.role', 'teacher')
        .neq('user_id', teacherId);

      if (teachersError) throw teachersError;
      teachers.push(...(courseTeachers?.map(cm => cm.profiles) || []));
    }

    // Get all admins
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .eq('role', 'admin');

    if (adminsError) throw adminsError;

    // Get all other teachers (excluding the current teacher)
    const { data: allTeachers, error: allTeachersError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .eq('role', 'teacher')
      .neq('id', teacherId);

    if (allTeachersError) throw allTeachersError;

    // Combine all teachers (course teachers + all other teachers, removing duplicates)
    const allTeacherIds = new Set();
    const allTeacherUsers = [...teachers, ...(allTeachers || [])];
    const uniqueTeachers = allTeacherUsers.filter(teacher => {
      if (allTeacherIds.has(teacher.id)) {
        return false;
      }
      allTeacherIds.add(teacher.id);
      return true;
    });

    // Combine and sort
    const allUsers = [...students, ...uniqueTeachers, ...(admins || [])];
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
    console.error('Error fetching users for teacher:', error);
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

    const students: any[] = [];
    const teachers: any[] = [];

    if (teacherCourses && teacherCourses.length > 0) {
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
      students.push(...(courseMembers?.map(cm => cm.profiles) || []));

      // Get all teachers in those courses (excluding the current teacher)
      const { data: courseTeachers, error: teachersError } = await supabase
        .from('course_members')
        .select(`
          profiles!inner(
            id, first_name, last_name, email, role
          )
        `)
        .in('course_id', courseIds)
        .eq('role', 'teacher')
        .eq('profiles.role', 'teacher')
        .neq('user_id', teacherId);

      if (teachersError) throw teachersError;
      teachers.push(...(courseTeachers?.map(cm => cm.profiles) || []));
    }

    // Get all admins
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .eq('role', 'admin');

    if (adminsError) throw adminsError;

    // Get all other teachers (excluding the current teacher)
    const { data: allTeachers, error: allTeachersError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .eq('role', 'teacher')
      .neq('id', teacherId);

    if (allTeachersError) throw allTeachersError;

    // Combine all teachers (course teachers + all other teachers, removing duplicates)
    const allTeacherIds = new Set();
    const allTeacherUsers = [...teachers, ...(allTeachers || [])];
    const uniqueTeachers = allTeacherUsers.filter(teacher => {
      if (allTeacherIds.has(teacher.id)) {
        return false;
      }
      allTeacherIds.add(teacher.id);
      return true;
    });

    // Combine and filter by search term
    const allUsers = [...students, ...uniqueTeachers, ...(admins || [])];
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
    console.error('Error searching users for teacher:', error);
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
  const token = await getValidToken();
  
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

export const getConversations = async (page: number = 1, limit: number = 50, searchQuery?: string): Promise<{ conversations: Conversation[], hasMore: boolean, total: number }> => {
  try {
    const token = await getValidToken();
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    // Build query parameters
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (searchQuery && searchQuery.trim()) {
      params.append('q', searchQuery.trim());
    }
    
    const url = `${API_BASE_URL}/api/conversations?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      
      let errorDetail = 'Failed to fetch conversations';
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.detail || errorJson.message || errorDetail;
      } catch (parseError) {
        errorDetail = errorText || errorDetail;
      }
      
      throw new Error(errorDetail);
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
  } catch (error) {
    console.error('Error in getConversations:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - conversations took too long to load');
    }
    throw error;
  }
};



export const getConversation = async (conversationId: string): Promise<Conversation> => {
  const token = await getValidToken();
  
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
  const token = await getValidToken();
  
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
  const token = await getValidToken();
  
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
  const token = await getValidToken();
  
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
  const token = await getValidToken();
  
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
  const token = await getValidToken();
  
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
  const token = await getValidToken();
  
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

export const markMessageAsDelivered = async (messageId: string): Promise<void> => {
  const token = await getValidToken();
  
  const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}/delivered`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to mark message as delivered');
  }
};

export const markMessageAsRead = async (messageId: string): Promise<void> => {
  const token = await getValidToken();
  
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
    const token = await getValidToken();
    
    const queryParams = userIds.map(id => `user_ids=${id}`).join('&');
    const response = await fetch(`${API_BASE_URL}/api/users/status?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      
      // Transform array response to object with user_id as keys
      if (Array.isArray(data)) {
        const result: Record<string, { status: string, last_seen_at: string, is_typing: boolean }> = {};
        data.forEach(item => {
          result[item.user_id] = {
            status: item.status || 'offline',
            last_seen_at: item.last_seen_at || new Date().toISOString(),
            is_typing: item.is_typing || false
          };
        });
        return result;
      }
      
      return data;
    }
  } catch (error) {
    // Backend user status API failed, using direct database query
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
    
    // Return all users as offline if database query fails
    const result: Record<string, { status: string, last_seen_at: string, is_typing: boolean }> = {};
    userIds.forEach(userId => {
      result[userId] = {
        status: 'offline',
        last_seen_at: new Date().toISOString(),
        is_typing: false
      };
    });
    
    return result;
  }
};

export const updateUserStatus = async (data: { status?: string, is_typing?: boolean, typing_in_conversation?: string }): Promise<void> => {
  try {
    // Try backend API first
    const token = await getValidToken();
    
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
    // Backend user status API failed, using direct database update
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

export const markConversationAsRead = async (conversationId: string): Promise<void> => {
  try {
    // Try backend API first
    const token = await getValidToken();
    
    const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      return;
    }
  } catch (error) {
    // Backend mark as read API failed, using direct database update
  }

  // Fallback to direct database update
  try {
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user?.id;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Update last_read_at in conversation_participants
    const { error: participantError } = await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (participantError) throw participantError;

    // Update message_status to 'read' for all unread messages in this conversation
    // First get all message IDs for this conversation
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId);

    if (messagesError) throw messagesError;

    if (messages && messages.length > 0) {
      const messageIds = messages.map(m => m.id);
      
      const { error: messageError } = await supabase
        .from('message_status')
        .update({ status: 'read', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .in('message_id', messageIds);

      if (messageError) throw messageError;
    }
  } catch (error) {
    console.error('Error marking conversation as read in database:', error);
    throw new Error('Failed to mark conversation as read');
  }
};

// Initialize WebSocket connection
export const initializeWebSocket = async () => {
  try {
    await wsManager.connect();
  } catch (error) {
    console.error('Error initializing WebSocket:', error);
  }
};

// Disconnect WebSocket
export const disconnectWebSocket = () => {
  wsManager.disconnect();
};

// Proactive token refresh mechanism
let tokenRefreshInterval: NodeJS.Timeout | null = null;

export const startTokenRefreshInterval = () => {
  // Clear any existing interval
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
  }
  
  // Refresh token every 45 minutes (before the 1-hour expiry)
  tokenRefreshInterval = setInterval(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error during proactive refresh:', error);
        return;
      }
      
      if (!session) {
        return;
      }
      
      // Check if token will expire in the next 15 minutes
      const tokenExpiry = new Date(session.expires_at! * 1000);
      const now = new Date();
      const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
      
      if (tokenExpiry <= fifteenMinutesFromNow) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('Error during proactive refresh:', refreshError);
        }
      }
    } catch (error) {
      console.error('Error in proactive token refresh:', error);
    }
  }, 45 * 60 * 1000); // 45 minutes
};

export const stopTokenRefreshInterval = () => {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
  }
};

 