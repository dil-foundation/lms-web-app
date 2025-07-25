import { getWebSocketUrl, API_ENDPOINTS } from '../config/api';

let socket: WebSocket | null = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 5; // Increase from 2 to 5 for better reliability
let reconnectDelay = 1000; // Start with 1 second instead of 2
let isIntentionalClose = false;
let isReconnecting = false; // Prevent multiple simultaneous reconnection attempts

export interface WebSocketMessage {
  step?: string;
  response?: string;
  words?: string[];
  english_sentence?: string;
  urdu_sentence?: string;
  [key: string]: unknown;
}

export interface WebSocketCallbacks {
  onMessage: (data: WebSocketMessage) => void;
  onAudioData?: (arrayBuffer: ArrayBuffer) => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onReconnect?: () => void;
}

let callbacks: WebSocketCallbacks | null = null;

// WebSocket endpoint - only use the correct endpoint as confirmed by backend
const getWebSocketEndpoint = (baseWsUrl: string): string => {
  return `${baseWsUrl}${API_ENDPOINTS.WEBSOCKET_LEARN}`; // /api/ws/learn
};

export const connectLearnSocket = (
  onMessage: (data: WebSocketMessage) => void,
  onAudioData?: (arrayBuffer: ArrayBuffer) => void,
  onClose?: () => void,
  onError?: (error: Event) => void,
  onReconnect?: () => void
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    callbacks = { onMessage, onAudioData, onClose, onError, onReconnect };
    
    const wsUrl = getWebSocketUrl();
    const fullUrl = getWebSocketEndpoint(wsUrl);
    
    console.log("🔌 WebSocket connecting to:", fullUrl);
    console.log("🔌 Using endpoint:", API_ENDPOINTS.WEBSOCKET_LEARN);
    
    // Close existing connection if any
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      isIntentionalClose = true;
      socket.close();
      socket = null;
      
      setTimeout(() => {
        createNewConnection();
      }, 500); // Increase delay to 500ms for better stability
    } else {
      createNewConnection();
    }
    
    function createNewConnection() {
      isIntentionalClose = false;
      
      console.log("🔍 Browser headers:");
      console.log("🔍 Origin:", window.location.origin);
      console.log("🔍 User-Agent:", navigator.userAgent);
      
      try {
        // Create WebSocket with additional headers to mimic mobile app behavior
        socket = new WebSocket(fullUrl);
        socket.binaryType = 'arraybuffer';
        
        console.log("📡 WebSocket created, readyState:", socket.readyState);
        
        // Increase connection timeout for better reliability
        const connectionTimeout = setTimeout(() => {
          if (socket && socket.readyState !== WebSocket.OPEN) {
            console.error("⏰ WebSocket connection timeout after 15 seconds");
            console.error("Failed to connect to:", fullUrl);
            
            isIntentionalClose = true;
            socket?.close();
            
            console.error("❌ Connection timed out to correct endpoint");
            reject(new Error('WebSocket connection timeout'));
          }
        }, 15000); // Increase from 10s to 15s
        
        socket.onopen = () => {
          console.log("✅ Learn WebSocket Connected successfully!");
          console.log(`🎯 Connected to: ${fullUrl}`);
          clearTimeout(connectionTimeout);
          reconnectAttempts = 0; // Reset on successful connection
          reconnectDelay = 1000; // Reset delay
          isReconnecting = false; // Reset reconnection flag
          
          // Simple connection verification
          if (socket && socket.readyState === WebSocket.OPEN) {
            console.log("✅ WebSocket connection verified, readyState:", socket.readyState);
            resolve(true);
          } else {
            console.error("❌ WebSocket connection failed, readyState:", socket?.readyState);
            reject(new Error('WebSocket connection failed'));
          }
        };
        
        socket.onmessage = (event: MessageEvent) => {
          if (event.data instanceof ArrayBuffer) {
            callbacks?.onAudioData?.(event.data);
          } else {
            try {
              const data: WebSocketMessage = JSON.parse(event.data);
              callbacks?.onMessage(data);
            } catch (error) {
              console.error("Failed to parse WebSocket message:", error);
            }
          }
        };
        
        socket.onerror = (error: Event) => {
          console.error("❌ WebSocket connection error:", error);
          console.error("Failed to connect to:", fullUrl);
          clearTimeout(connectionTimeout);
          callbacks?.onError?.(error);
          
          if (socket?.readyState === WebSocket.CONNECTING || socket?.readyState === WebSocket.CLOSED) {
            console.error("❌ WebSocket connection failed in onerror");
            
            // Don't immediately reject - let the onclose handler manage reconnection
            console.log(`Connection error. onclose will handle reconnection if needed.`);
          }
        };
        
        socket.onclose = (event: CloseEvent) => {
          console.log("❌ ===========================================");
          console.log("❌ WebSocket CLOSED by SERVER!");
          console.log("❌ Code:", event.code, "Reason:", event.reason || 'No reason provided');
          console.log("❌ Was Clean:", event.wasClean);
          console.log("❌ ===========================================");
          
          // Explain common error codes
          switch (event.code) {
            case 1005:
              console.log("💡 Code 1005 = No status received / Server rejected connection");
              console.log("💡 This may indicate server-side connection filtering");
              break;
            case 1006:
              console.log("💡 Code 1006 = Abnormal closure / Connection lost");
              break;
            case 1011:
              console.log("💡 Code 1011 = Server error / Internal server error");
              break;
            case 1012:
              console.log("💡 Code 1012 = Service restart / Server restarting");
              break;
            default:
              console.log("💡 Unknown close code:", event.code);
          }
          
          clearTimeout(connectionTimeout);
          
          // Only attempt reconnect if it wasn't an intentional close and we haven't exceeded max attempts
          if (!isIntentionalClose && reconnectAttempts < maxReconnectAttempts && !isReconnecting) {
            isReconnecting = true; // Prevent multiple simultaneous reconnection attempts
            
            // Use exponential backoff with jitter to prevent thundering herd
            const jitter = Math.random() * 1000; // Add up to 1 second of random delay
            const delay = Math.min(reconnectDelay + jitter, 30000); // Cap at 30 seconds
            
            console.log(`🔄 Attempting reconnect ${reconnectAttempts + 1}/${maxReconnectAttempts} in ${Math.round(delay)}ms`);
            
            setTimeout(() => {
              reconnectAttempts++;
              reconnectDelay = Math.min(reconnectDelay * 1.8, 30000); // Gentler exponential backoff with cap
              
              connectLearnSocket(
                callbacks!.onMessage,
                callbacks?.onAudioData,
                callbacks?.onClose,
                callbacks?.onError,
                callbacks?.onReconnect
              ).then(() => {
                console.log("🎉 Reconnection successful!");
                callbacks?.onReconnect?.();
              }).catch((error) => {
                console.error('Reconnection failed:', error);
                isReconnecting = false; // Reset flag on failure
                
                if (reconnectAttempts >= maxReconnectAttempts) {
                  console.error("❌ Max reconnection attempts reached");
                  callbacks?.onClose?.();
                }
              });
            }, delay);
          } else {
            if (isIntentionalClose) {
              console.log("✅ Connection closed intentionally");
            } else if (reconnectAttempts >= maxReconnectAttempts) {
              console.log("❌ Max reconnection attempts reached, stopping");
            } else if (isReconnecting) {
              console.log("⏳ Reconnection already in progress");
            }
            
            if (!isReconnecting) {
              callbacks?.onClose?.();
            }
          }
        };
        
      } catch (error) {
        console.error("❌ Error creating WebSocket:", error);
        reject(error);
      }
    }
  });
};

export const sendLearnMessage = (message: string | ArrayBuffer): boolean => {
  if (!socket) {
    console.error("❌ WebSocket is null");
    return false;
  }
  
  console.log("WebSocket readyState:", socket.readyState, "Expected:", WebSocket.OPEN);
  
  if (socket.readyState === WebSocket.OPEN) {
    try {
      if (typeof message === 'string') {
        console.log("📤 Sending text message:", message.substring(0, 100) + "...");
        socket.send(message);
      } else {
        console.log("📤 Sending binary message:", message.byteLength, "bytes");
        socket.send(message);
      }
      return true;
    } catch (error) {
      console.error("❌ Error sending message:", error);
      return false;
    }
  } else if (socket.readyState === WebSocket.CONNECTING) {
    console.warn("⚠️ WebSocket is still connecting, message will be queued");
    
    // Try to send the message after a longer delay
    setTimeout(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("🔄 Retrying message send after connection established");
        try {
          if (typeof message === 'string') {
            socket.send(message);
          } else {
            socket.send(message);
          }
        } catch (error) {
          console.error("❌ Error sending delayed message:", error);
        }
      } else {
        console.error("❌ WebSocket still not ready for delayed send, state:", socket?.readyState);
      }
    }, 1000); // Increase delay to 1 second
    
    return false;
  } else {
    console.error("❌ WebSocket is not open. Current state:", socket.readyState);
    const stateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
    console.error("State name:", stateNames[socket.readyState] || 'UNKNOWN');
    return false;
  }
};

export const closeLearnSocket = (): void => {
  if (socket) {
    isIntentionalClose = true;
    isReconnecting = false; // Stop any ongoing reconnection attempts
    socket.close(1000, 'Client closing connection');
    socket = null;
    callbacks = null;
    console.log("🔌 WebSocket connection closed intentionally");
  }
};

export const isSocketConnected = (): boolean => {
  return socket !== null && socket.readyState === WebSocket.OPEN;
};

export const getSocketState = (): string => {
  if (!socket) return 'CLOSED';
  
  switch (socket.readyState) {
    case WebSocket.CONNECTING: return 'CONNECTING';
    case WebSocket.OPEN: return 'OPEN';
    case WebSocket.CLOSING: return 'CLOSING';
    case WebSocket.CLOSED: return 'CLOSED';
    default: return 'UNKNOWN';
  }
};

// Additional utility functions for better connection management
export const isWebSocketReady = (): boolean => {
  return socket !== null && socket.readyState === WebSocket.OPEN;
};

export const waitForWebSocketReady = (timeout: number = 10000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (isWebSocketReady()) {
      resolve(true);
      return;
    }
    
    const checkInterval = setInterval(() => {
      if (isWebSocketReady()) {
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
        resolve(true);
      }
    }, 100);
    
    const timeoutId = setTimeout(() => {
      clearInterval(checkInterval);
      resolve(false);
    }, timeout);
  });
};

// Reset connection state (useful for testing)
export const resetConnectionState = (): void => {
  reconnectAttempts = 0;
  reconnectDelay = 1000;
  isReconnecting = false;
  console.log("🔄 WebSocket connection state reset");
};