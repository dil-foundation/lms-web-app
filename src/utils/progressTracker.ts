import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';
import { getAuthHeadersWithAccept } from '@/utils/authUtils';

// Track initialization status to prevent multiple calls
let isProgressInitialized = false;
let initializationPromise: Promise<any> | null = null;

interface ProgressInitializationResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

/**
 * Initialize user progress tracking for practice lessons
 * This API creates initial progress records, sets up tracking infrastructure,
 * initializes user statistics, and unlocks initial content
 */
export const initializeUserProgress = async (userId: string): Promise<ProgressInitializationResponse> => {
  // Return immediately if already initialized
  if (isProgressInitialized) {
    return { success: true, message: 'Progress already initialized' };
  }

  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Create and cache the initialization promise
  initializationPromise = performInitialization(userId);
  
  try {
    const result = await initializationPromise;
    if (result.success) {
      isProgressInitialized = true;
    }
    return result;
  } catch (error) {
    console.error('Progress initialization failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to initialize progress'
    };
  } finally {
    // Clear the promise regardless of outcome
    initializationPromise = null;
  }
};

/**
 * Actual API call to initialize progress
 */
const performInitialization = async (userId: string): Promise<ProgressInitializationResponse> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.INITIALIZE_PROGRESS}`, {
      method: 'POST',
      headers: getAuthHeadersWithAccept(),
      body: JSON.stringify({
        user_id: userId
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response text');
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const responseText = await response.text();
    
    // Try to parse JSON response
    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Invalid JSON response from server');
    }

    // Handle different response formats
    if (result.success === false) {
      throw new Error(result.message || result.error || 'Progress initialization failed');
    }

    return {
      success: true,
      message: result.message || 'Progress initialized successfully',
      data: result.data || result
    };

  } catch (error) {
    console.error('Error initializing progress:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    
    if (error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    throw error;
  }
};

/**
 * Reset initialization status (useful for testing or re-initialization)
 */
export const resetProgressInitialization = () => {
  isProgressInitialized = false;
  initializationPromise = null;
};

/**
 * Check if progress has been initialized
 */
export const isProgressAlreadyInitialized = () => {
  return isProgressInitialized;
};

interface CurrentTopicResponse {
  success: boolean;
  data?: {
    success: boolean;
    current_topic_id: number;
    is_new_exercise: boolean;
    is_completed: boolean;
    exercise_data: {
      id: number;
      user_id: string;
      stage_id: number;
      exercise_id: number;
      attempts: number;
      scores: number[];
      last_5_scores: number[];
      average_score: number;
      urdu_used: boolean[];
      mature: boolean;
      total_score: number;
      best_score: number;
      time_spent_minutes: number;
      started_at: string;
      completed_at: string | null;
      last_attempt_at: string;
      created_at: string;
      updated_at: string;
      current_topic_id: number;
    };
  };
  message?: string;
  error?: string;
}

/**
 * Get the user's current topic/lesson progress to resume where they left off
 * This API returns the current stage, exercise, and progress within that exercise
 */
export const getCurrentTopicProgress = async (userId: string, stageId: number, exerciseId: number): Promise<CurrentTopicResponse> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.GET_CURRENT_TOPIC}`, {
      method: 'POST',
      headers: getAuthHeadersWithAccept(),
      body: JSON.stringify({
        user_id: userId,
        stage_id: stageId,
        exercise_id: exerciseId
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response text');
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const responseText = await response.text();
    
    // Try to parse JSON response
    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Invalid JSON response from server');
    }

    // Handle different response formats
    if (result.success === false) {
      return {
        success: false,
        error: result.message || result.error || 'Failed to get current topic'
      };
    }

    return {
      success: true,
      data: result.data,
      message: result.message || 'Current topic retrieved successfully'
    };

  } catch (error) {
    console.error('Error getting current topic:', error);
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timed out. Please check your internet connection.'
      };
    }
    
    if (error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Unable to connect to the server. Please check your internet connection.'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to get current topic'
    };
  }
};

interface UpdateProgressResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Update user's current topic/prompt within a specific exercise
 * This allows the user to resume from where they left off
 */
export const updateCurrentTopic = async (
  userId: string, 
  stageId: number, 
  exerciseId: number,
  topicId: number
): Promise<UpdateProgressResponse> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.GET_CURRENT_TOPIC}`, {
      method: 'POST',
      headers: getAuthHeadersWithAccept(),
      body: JSON.stringify({
        user_id: userId,
        stage_id: stageId,
        exercise_id: exerciseId,
        topic_id: topicId
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response text');
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const responseText = await response.text();
    
    // Try to parse JSON response
    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Invalid JSON response from server');
    }

    // Handle different response formats
    if (result.success === false) {
      return {
        success: false,
        error: result.message || result.error || 'Failed to update topic progress'
      };
    }

    return {
      success: true,
      message: result.message || 'Topic progress updated successfully'
    };

  } catch (error) {
    console.error('Error updating topic progress:', error);
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timed out. Please check your internet connection.'
      };
    }
    
    if (error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Unable to connect to the server. Please check your internet connection.'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to update topic progress'
    };
  }
};

/**
 * Update user's current progress for a specific stage and exercise
 * This notifies the backend that the user has made progress
 */
export const updateCurrentProgress = async (
  userId: string, 
  stageId: number, 
  exerciseId: number
): Promise<UpdateProgressResponse> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.GET_CURRENT_TOPIC}`, {
      method: 'POST', // Use POST to update progress
      headers: getAuthHeadersWithAccept(),
      body: JSON.stringify({
        user_id: userId,
        stage_id: stageId,
        exercise_id: exerciseId
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response text');
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const responseText = await response.text();
    
    // Try to parse JSON response
    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Invalid JSON response from server');
    }

    // Handle different response formats
    if (result.success === false) {
      return {
        success: false,
        error: result.message || result.error || 'Failed to update progress'
      };
    }

    return {
      success: true,
      message: result.message || 'Progress updated successfully'
    };

  } catch (error) {
    console.error('Error updating progress:', error);
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timed out. Please check your internet connection.'
      };
    }
    
    if (error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Unable to connect to the server. Please check your internet connection.'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to update progress'
    };
  }
}; 