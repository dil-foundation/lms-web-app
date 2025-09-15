/**
 * IRIS (Intelligent Response & Insight System) Type Definitions
 */

export interface IRISMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
  timestamp?: Date;
  // Export support fields
  data?: any;
  reportData?: any;
}

export interface IRISContext {
  userId: string;
  role: string;
  permissions: string[];
  tenantId?: string;
}

export interface IRISResponse {
  success: boolean;
  message: IRISMessage;
  toolsUsed?: string[];
  tokensUsed?: number;
  error?: string;
}

export interface IRISChatState {
  messages: IRISMessage[];
  isLoading: boolean;
  userContext: IRISContext | null;
  suggestions: string[];
  error?: string;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  prompt: string;
  category: 'analytics' | 'management' | 'reports' | 'general';
}

export interface IRISCapability {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  enabled: boolean;
}

export interface IRISConfig {
  maxMessages: number;
  maxMessageLength: number;
  enableTools: boolean;
  enableLogging: boolean;
  platforms: ('lms' | 'ai_tutor')[];
}

export interface IRISAnalytics {
  totalQueries: number;
  successfulQueries: number;
  errorRate: number;
  avgResponseTime: number;
  popularQueries: string[];
  toolUsage: Record<string, number>;
}

export interface IRISChatLog {
  id: string;
  user_id: string;
  user_role: string;
  query: string;
  response_preview: string;
  tools_used: string[];
  tokens_used: number;
  success: boolean;
  error_message?: string;
  created_at: string;
}

// Platform-specific types
export type PlatformType = 'lms' | 'ai_tutor';

export interface PlatformAction extends QuickAction {
  platform: PlatformType;
}

// Error types
export interface IRISError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export type IRISErrorCode = 
  | 'AUTH_REQUIRED'
  | 'PERMISSION_DENIED' 
  | 'SERVICE_UNAVAILABLE'
  | 'INVALID_REQUEST'
  | 'DATABASE_ERROR'
  | 'AI_SERVICE_ERROR'
  | 'UNKNOWN_ERROR';

// Validation types
export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

// Service health types
export interface ServiceHealth {
  iris: boolean;
  openai: boolean;
  mcp: boolean;
  database: boolean;
  lastChecked: Date;
}
