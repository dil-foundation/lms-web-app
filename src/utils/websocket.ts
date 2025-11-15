// English-only WebSocket connection management
let englishOnlySocket: WebSocket | null = null;
let messageHandler: ((data: any) => void) | null = null;
let audioHandler: ((audioBuffer: ArrayBuffer) => void) | null = null;
let closeHandler: (() => void) | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let connectionAttempts = 0;
const maxConnectionAttempts = 3;
const connectionTimeout = 15000; // 15 seconds
const retryTimeout = 12000; // 12 seconds

/**
 * Establishes connection to English-only WebSocket endpoint
 * @param onMessage - Handler for JSON messages
 * @param onAudio - Handler for binary audio data
 * @param onClose - Handler for connection close events
 */
export const connectEnglishOnlySocket = (
  onMessage: (data: any) => void,
  onAudio: (audioBuffer: ArrayBuffer) => void,
  onClose: () => void
): void => {
  // Store handlers for reconnection
  messageHandler = onMessage;
  audioHandler = onAudio;
  closeHandler = onClose;

  // Prevent multiple simultaneous connections
  if (englishOnlySocket && englishOnlySocket.readyState === WebSocket.CONNECTING) {
    console.log('🔌 WebSocket connection already in progress');
    return;
  }

  // Close existing connection if any
  if (englishOnlySocket) {
    disconnectEnglishOnlySocket();
  }

  try {
    // Get base URL from environment variable, fallback to staging production server
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api-prod.dil.lms-staging.com';
    
    // Convert HTTP(S) URL to WebSocket URL (ws:// for http, wss:// for https)
    let wsUrl: string;
    if (baseUrl.startsWith('https://')) {
      wsUrl = baseUrl.replace(/^https:\/\//, 'wss://') + '/api/ws/english-only';
    } else if (baseUrl.startsWith('http://')) {
      wsUrl = baseUrl.replace(/^http:\/\//, 'ws://') + '/api/ws/english-only';
    } else {
      // If no protocol, assume https for production
      wsUrl = `wss://${baseUrl}/api/ws/english-only`;
    }
    
    console.log(`🔌 Connecting to English-only WebSocket: ${wsUrl}`);
    englishOnlySocket = new WebSocket(wsUrl);

    // Connection timeout handler
    const timeoutId = setTimeout(() => {
      if (englishOnlySocket && englishOnlySocket.readyState === WebSocket.CONNECTING) {
        console.log('⏰ WebSocket connection timeout');
        englishOnlySocket.close();
        handleConnectionError();
      }
    }, connectionTimeout);

    englishOnlySocket.onopen = (event) => {
      console.log('✅ English-only WebSocket connected successfully');
      console.log('📊 WebSocket details:', {
        url: wsUrl,
        readyState: englishOnlySocket?.readyState,
        protocol: englishOnlySocket?.protocol,
        extensions: englishOnlySocket?.extensions
      });
      clearTimeout(timeoutId);
      connectionAttempts = 0; // Reset attempts on successful connection
      
      // Clear any pending reconnection attempts
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    };

    englishOnlySocket.onmessage = async (event) => {
      try {
        if (event.data instanceof Blob) {
          // Handle binary audio data
          const arrayBuffer = await event.data.arrayBuffer();
          if (audioHandler) {
            audioHandler(arrayBuffer);
          }
        } else {
          // Handle JSON messages
          const data = JSON.parse(event.data);
          if (messageHandler) {
            messageHandler(data);
          }
        }
      } catch (error) {
        console.error('❌ Error processing WebSocket message:', error);
      }
    };

    englishOnlySocket.onclose = (event) => {
      console.log(`🔌 English-only WebSocket closed: ${event.code} - ${event.reason}`);
      clearTimeout(timeoutId);
      
      // Only attempt reconnection if it wasn't a manual close (code 1000)
      if (event.code !== 1000 && connectionAttempts < maxConnectionAttempts) {
        handleConnectionError();
      } else {
        englishOnlySocket = null;
        if (closeHandler) {
          closeHandler();
        }
      }
    };

    englishOnlySocket.onerror = (error) => {
      console.error('❌ English-only WebSocket error:', error);
      console.error('🔍 Error details:', {
        url: wsUrl,
        readyState: englishOnlySocket?.readyState,
        type: error.type,
        target: error.target
      });
      clearTimeout(timeoutId);
      handleConnectionError();
    };

  } catch (error) {
    console.error('❌ Failed to create WebSocket connection:', error);
    handleConnectionError();
  }
};

/**
 * Handles connection errors and implements retry logic
 */
const handleConnectionError = (): void => {
  connectionAttempts++;
  
  if (connectionAttempts >= maxConnectionAttempts) {
    console.log('❌ Max connection attempts reached, stopping retries');
    englishOnlySocket = null;
    if (closeHandler) {
      closeHandler();
    }
    return;
  }

  console.log(`🔄 Retrying connection (attempt ${connectionAttempts + 1}/${maxConnectionAttempts}) in ${retryTimeout / 1000}s...`);
  
  reconnectTimeout = setTimeout(() => {
    if (messageHandler && audioHandler && closeHandler) {
      connectEnglishOnlySocket(messageHandler, audioHandler, closeHandler);
    }
  }, retryTimeout);
};

/**
 * Sends a message through the English-only WebSocket
 * @param message - Message to send (will be JSON stringified)
 */
export const sendEnglishOnlyMessage = (message: any): boolean => {
  if (!englishOnlySocket || englishOnlySocket.readyState !== WebSocket.OPEN) {
    console.warn('⚠️ Cannot send message: WebSocket not connected');
    return false;
  }

  try {
    englishOnlySocket.send(JSON.stringify(message));
    return true;
  } catch (error) {
    console.error('❌ Failed to send WebSocket message:', error);
    return false;
  }
};

/**
 * Sends binary audio data through the English-only WebSocket
 * This is optimized to send binary directly without base64 encoding
 * @param audioBlob - Audio blob to send as binary
 * @param user_name - User name for metadata
 * @returns true if sent successfully, false otherwise
 */
export const sendEnglishOnlyBinaryAudio = (audioBlob: Blob, user_name: string): boolean => {
  if (!englishOnlySocket || englishOnlySocket.readyState !== WebSocket.OPEN) {
    console.warn('⚠️ Cannot send binary audio: WebSocket not connected');
    return false;
  }

  try {
    // Step 1: Send metadata message first (as per backend expectation)
    const metadataMessage = {
      type: 'audio_binary_metadata',
      user_name: user_name,
      audio_size: audioBlob.size,
    };
    
    console.log(`📤 [BINARY] Sending metadata: ${audioBlob.size} bytes for user: ${user_name}`);
    englishOnlySocket.send(JSON.stringify(metadataMessage));
    
    // Step 2: Send binary audio data directly
    console.log(`📤 [BINARY] Sending binary audio: ${audioBlob.size} bytes`);
    englishOnlySocket.send(audioBlob);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to send binary audio:', error);
    return false;
  }
};

/**
 * Checks if the English-only WebSocket is connected
 * @returns true if connected, false otherwise
 */
export const isEnglishOnlySocketConnected = (): boolean => {
  return englishOnlySocket !== null && englishOnlySocket.readyState === WebSocket.OPEN;
};

/**
 * Disconnects the English-only WebSocket
 */
export const disconnectEnglishOnlySocket = (): void => {
  console.log('🔌 Disconnecting English-only WebSocket');
  
  // Clear any pending reconnection attempts
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Close the WebSocket connection
  if (englishOnlySocket) {
    if (englishOnlySocket.readyState === WebSocket.OPEN || 
        englishOnlySocket.readyState === WebSocket.CONNECTING) {
      englishOnlySocket.close(1000, 'Manual disconnect');
    }
    englishOnlySocket = null;
  }

  // Reset state
  connectionAttempts = 0;
  messageHandler = null;
  audioHandler = null;
  closeHandler = null;
};

/**
 * Gets the current connection state
 * @returns WebSocket ready state or null if no connection
 */
export const getEnglishOnlySocketState = (): number | null => {
  return englishOnlySocket ? englishOnlySocket.readyState : null;
};
