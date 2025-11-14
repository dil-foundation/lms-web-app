import { supabase } from "@/integrations/supabase/client";

/**
 * Service for tracking user activity and updating last_active_at timestamp
 */

/**
 * Update the user's last_active_at timestamp to current time
 * This should be called on sign-in and periodically during active sessions
 */
export const updateUserLastActive = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase.rpc('update_user_last_active', {
      user_id: userId
    });

    if (error) {
      console.error('Error updating last active timestamp:', error);
      throw error;
    }

    console.log('✅ User last active timestamp updated for user:', userId);
  } catch (error) {
    console.error('Failed to update last active timestamp:', error);
    // Don't throw error to prevent breaking the user experience
    // This is a non-critical operation
  }
};

/**
 * Update last active via direct update (fallback method)
 * Use this if the RPC function is not available
 */
export const updateUserLastActiveDirect = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('Error updating last active timestamp (direct):', error);
      throw error;
    }

    console.log('✅ User last active timestamp updated (direct) for user:', userId);
  } catch (error) {
    console.error('Failed to update last active timestamp (direct):', error);
  }
};

/**
 * Initialize periodic last active updates
 * Updates the timestamp every 5 minutes if the user is active
 * Returns a cleanup function to stop the interval
 */
export const startActivityTracking = (userId: string): (() => void) => {
  // Update immediately on start
  updateUserLastActive(userId);

  // Set up periodic updates every 5 minutes
  const intervalId = setInterval(() => {
    updateUserLastActive(userId);
  }, 5 * 60 * 1000); // 5 minutes

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
};

/**
 * Throttled version of updateUserLastActive
 * Prevents too frequent updates (max once per minute)
 */
let lastUpdateTime = 0;
const THROTTLE_INTERVAL = 60 * 1000; // 1 minute

export const updateUserLastActiveThrottled = async (userId: string): Promise<void> => {
  const now = Date.now();

  if (now - lastUpdateTime < THROTTLE_INTERVAL) {
    // Skip update if we updated recently
    return;
  }

  lastUpdateTime = now;
  await updateUserLastActive(userId);
};
