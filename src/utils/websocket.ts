import { getWebSocketUrl, API_ENDPOINTS } from '../config/api';

let socket: WebSocket | null = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 2; // Reduce to match mobile app behavior
let reconnectDelay = 2000; // Start with 2 seconds
let isIntentionalClose = false;

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
      }, 100);
    } else {
      createNewConnection();
    }
    
    function createNewConnection() {
      isIntentionalClose = false;
      
      console.log("🔍 Browser headers:");
      console.log("🔍 Origin:", window.location.origin);
      console.log("🔍 User-Agent:", navigator.userAgent);
      
      // Simple WebSocket connection - using correct /api/ws/learn endpoint
      socket = new WebSocket(fullUrl);
      socket.binaryType = 'arraybuffer';
      
      console.log("📡 WebSocket created, readyState:", socket.readyState);
      
      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (socket && socket.readyState !== WebSocket.OPEN) {
          console.error("⏰ WebSocket connection timeout after 10 seconds");
          console.error("Failed to connect to:", fullUrl);
          
          isIntentionalClose = true;
          socket?.close();
          
          // Since we only have one correct endpoint, just reject on timeout
          console.error("❌ Connection timed out to correct endpoint");
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
      
      socket.onopen = () => {
        console.log("✅ Learn WebSocket Connected successfully!");
        console.log(`🎯 Connected to: ${fullUrl}`);
        clearTimeout(connectionTimeout);
        reconnectAttempts = 0; // Reset on successful connection
        reconnectDelay = 2000; // Reset delay
        
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
          
          // Try reconnection if attempts remain
          if (reconnectAttempts < maxReconnectAttempts - 1) {
            console.log(`Connection failed. Will retry connection attempt ${reconnectAttempts + 2}/${maxReconnectAttempts}`);
            reject(new Error('Connection failed - will retry'));
          } else {
            console.error("❌ All reconnection attempts failed.");
            console.error("💡 Server may be blocking browser connections!");
            reject(new Error('All WebSocket connection attempts failed'));
          }
        }
      };
      
      socket.onclose = (event: CloseEvent) => {
        console.log("❌ ===========================================");
        console.log("❌ WebSocket CLOSED by SERVER!");
        console.log("❌ Code:", event.code, "Reason:", event.reason);
        console.log("❌ Was Clean:", event.wasClean);
        console.log("❌ ===========================================");
        
        // Explain the error code
        if (event.code === 1005) {
          console.log("💡 Code 1005 = Server actively rejected connection");
          console.log("💡 This suggests server blocks browser connections!");
          console.log("💡 Your mobile app works, but browser is blocked");
        }
        
        clearTimeout(connectionTimeout);
        
        // Only attempt reconnect if it wasn't an intentional close and we haven't exceeded max attempts
        if (!isIntentionalClose && reconnectAttempts < maxReconnectAttempts) {
          console.log(`Attempting reconnect ${reconnectAttempts + 1}/${maxReconnectAttempts} in ${reconnectDelay}ms`);
          
          setTimeout(() => {
            reconnectAttempts++;
            reconnectDelay = Math.min(reconnectDelay * 1.5, 10000); // Gentler exponential backoff
            
            connectLearnSocket(
              callbacks!.onMessage,
              callbacks?.onAudioData,
              callbacks?.onClose,
              callbacks?.onError,
              callbacks?.onReconnect
            ).then(() => {
              callbacks?.onReconnect?.();
            }).catch((error) => {
              console.error('Reconnection failed:', error);
              if (reconnectAttempts >= maxReconnectAttempts) {
                console.error("Max reconnection attempts reached");
                callbacks?.onClose?.();
              }
            });
          }, reconnectDelay);
        } else {
          if (isIntentionalClose) {
            console.log("Connection closed intentionally");
          } else {
            console.log("Max reconnection attempts reached, stopping");
          }
          callbacks?.onClose?.();
        }
      };
    }
  });
};

export const sendLearnMessage = (message: string): boolean => {
  if (!socket) {
    console.error("❌ WebSocket is null");
    return false;
  }
  
  console.log("WebSocket readyState:", socket.readyState, "Expected:", WebSocket.OPEN);
  
  if (socket.readyState === WebSocket.OPEN) {
    try {
      console.log("📤 Sending message:", message.substring(0, 100) + "...");
      socket.send(message);
      return true;
    } catch (error) {
      console.error("❌ Error sending message:", error);
      return false;
    }
  } else if (socket.readyState === WebSocket.CONNECTING) {
    console.warn("⚠️ WebSocket is still connecting, message will be dropped");
    
    // Try to send the message after a short delay
    setTimeout(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("🔄 Retrying message send after connection established");
        try {
          socket.send(message);
        } catch (error) {
          console.error("❌ Error sending delayed message:", error);
        }
      } else {
        console.error("❌ WebSocket still not ready for delayed send, state:", socket?.readyState);
      }
    }, 200);
    
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
    socket.close(1000, 'Intentional close');
    socket = null;
  }
  
  // Reset all state
  callbacks = null;
  reconnectAttempts = 0;
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

export const resetReconnectAttempts = (): void => {
  reconnectAttempts = 0;
  reconnectDelay = 2000;
};

export const setMaxReconnectAttempts = (attempts: number): void => {
  maxReconnectAttempts = attempts;
};

export const isWebSocketReady = (): boolean => {
  return socket !== null && socket.readyState === WebSocket.OPEN;
};

export const waitForWebSocketReady = (timeout: number = 5000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (isWebSocketReady()) {
      resolve(true);
      return;
    }
    
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (isWebSocketReady()) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 100); // Check every 100ms
  });
};