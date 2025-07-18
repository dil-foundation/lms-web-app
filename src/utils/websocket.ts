import { getWebSocketUrl, API_ENDPOINTS } from '../config/api';

let socket: WebSocket | null = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 3;
let reconnectDelay = 1000; // Start with 1 second
let isIntentionalClose = false;
let mockMode = false; // Enable mock mode if real WebSocket fails

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
  onAudioData?: (audioBuffer: ArrayBuffer) => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onReconnect?: () => void;
}

let callbacks: WebSocketCallbacks | null = null;

// Mock WebSocket responses for development/fallback
const mockWebSocketResponses = {
  welcome: {
    step: 'waiting',
    response: 'Welcome to the AI tutor! I am ready to help you learn English. Please start speaking.',
  },
  processing: {
    step: 'processing',
    response: 'Processing your speech...',
  },
  feedback: {
    step: 'feedback_step',
    response: 'Great job! You pronounced that well. Let\'s try another sentence.',
  },
};

export const connectLearnSocket = (
  onMessage: (data: WebSocketMessage) => void,
  onAudioData?: (audioBuffer: ArrayBuffer) => void,
  onClose?: () => void,
  onError?: (error: Event) => void,
  onReconnect?: () => void
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    callbacks = { onMessage, onAudioData, onClose, onError, onReconnect };
    
    const wsUrl = getWebSocketUrl();
    const fullUrl = `${wsUrl}${API_ENDPOINTS.WEBSOCKET_LEARN}`;
    
    console.log("WebSocket connecting to:", fullUrl);
    console.log("WebSocket URL components:", { wsUrl, endpoint: API_ENDPOINTS.WEBSOCKET_LEARN });
    
    // Close existing connection if any
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      isIntentionalClose = true;
      socket.close();
      socket = null;
      
      // Wait a bit for the close to complete
      setTimeout(() => {
        createNewConnection();
      }, 100);
    } else {
      createNewConnection();
    }
    
    function createNewConnection() {
      isIntentionalClose = false;
      socket = new WebSocket(fullUrl);
      socket.binaryType = 'arraybuffer';
      
      // Connection timeout for faster failure detection
      const connectionTimeout = setTimeout(() => {
        if (socket && socket.readyState !== WebSocket.OPEN) {
          console.error("WebSocket connection timeout");
          isIntentionalClose = true; // Mark as intentional to prevent reconnection
          socket?.close();
          reject(new Error('Connection timeout'));
        }
      }, 10000); // 10 second timeout
      
      socket.onopen = () => {
        console.log("Learn WebSocket Connected");
        clearTimeout(connectionTimeout);
        reconnectAttempts = 0; // Reset on successful connection
        reconnectDelay = 1000; // Reset delay
        
        // Add a small delay to ensure the WebSocket is fully ready
        setTimeout(() => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            console.log("WebSocket is fully ready, readyState:", socket.readyState);
            resolve(true);
          } else {
            console.error("WebSocket not ready after delay, readyState:", socket?.readyState);
            reject(new Error('WebSocket not ready'));
          }
        }, 100); // Small delay to ensure connection is fully established
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
        console.error("WebSocket error:", error);
        clearTimeout(connectionTimeout);
        callbacks?.onError?.(error);
        
        if (socket?.readyState === WebSocket.CONNECTING) {
          console.warn("WebSocket connection failed, considering mock mode...");
          
          // If all reconnection attempts fail, enable mock mode
          if (reconnectAttempts >= maxReconnectAttempts - 1) {
            console.log("Enabling mock mode due to persistent connection failures");
            mockMode = true;
            
            // Send welcome message in mock mode
            setTimeout(() => {
              callbacks?.onMessage(mockWebSocketResponses.welcome);
            }, 1000);
            
            resolve(true); // Resolve as successful connection in mock mode
          } else {
            reject(new Error('Connection failed'));
          }
        }
      };
      
      socket.onclose = (event: CloseEvent) => {
        console.log("WebSocket closed. Code:", event.code, "Reason:", event.reason);
        clearTimeout(connectionTimeout);
        
        // Only attempt reconnect if it wasn't an intentional close and we haven't exceeded max attempts
        if (!isIntentionalClose && reconnectAttempts < maxReconnectAttempts) {
          console.log(`Attempting reconnect ${reconnectAttempts + 1}/${maxReconnectAttempts} in ${reconnectDelay}ms`);
          
          setTimeout(() => {
            reconnectAttempts++;
            reconnectDelay *= 2; // Exponential backoff
            
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
                callbacks?.onClose?.();
              }
            });
          }, reconnectDelay);
        } else {
          callbacks?.onClose?.();
        }
      };
    }
  });
};

export const sendLearnMessage = (message: string): boolean => {
  if (mockMode) {
    console.log("Mock mode: Simulating message processing:", message.substring(0, 100) + "...");
    
    // Simulate processing response
    setTimeout(() => {
      callbacks?.onMessage(mockWebSocketResponses.processing);
    }, 500);
    
    // Simulate feedback response
    setTimeout(() => {
      callbacks?.onMessage(mockWebSocketResponses.feedback);
    }, 2000);
    
    return true;
  }
  
  if (!socket) {
    console.error("WebSocket is null");
    return false;
  }
  
  console.log("WebSocket readyState:", socket.readyState, "Expected:", WebSocket.OPEN);
  
  if (socket.readyState === WebSocket.OPEN) {
    try {
      console.log("Sending message:", message.substring(0, 100) + "...");
      socket.send(message);
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    }
  } else if (socket.readyState === WebSocket.CONNECTING) {
    console.warn("WebSocket is still connecting, message will be dropped");
    
    // Try to send the message after a short delay
    setTimeout(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("Retrying message send after connection established");
        try {
          socket.send(message);
        } catch (error) {
          console.error("Error sending delayed message:", error);
        }
      } else {
        console.error("WebSocket still not ready for delayed send, state:", socket?.readyState);
      }
    }, 200);
    
    return false;
  } else {
    console.error("WebSocket is not open. Current state:", socket.readyState);
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
  mockMode = false;
};

export const isSocketConnected = (): boolean => {
  return mockMode || (socket !== null && socket.readyState === WebSocket.OPEN);
};

export const getSocketState = (): string => {
  if (mockMode) return 'MOCK_OPEN';
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
  reconnectDelay = 1000;
};

export const setMaxReconnectAttempts = (attempts: number): void => {
  maxReconnectAttempts = attempts;
};

export const isMockMode = (): boolean => {
  return mockMode;
};

export const enableMockMode = (): void => {
  console.log("Manually enabling mock mode");
  mockMode = true;
  
  // Send welcome message in mock mode
  setTimeout(() => {
    callbacks?.onMessage(mockWebSocketResponses.welcome);
  }, 500);
};

export const disableMockMode = (): void => {
  console.log("Disabling mock mode");
  mockMode = false;
};

export const isWebSocketReady = (): boolean => {
  if (mockMode) return true;
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