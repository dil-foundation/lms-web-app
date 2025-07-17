import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguageMode } from '../contexts/LanguageModeContext.js';
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';
import { useAudioPlayer } from '../hooks/useAudioPlayer.js';
import { playAudio, stopCurrentAudio, isAnyAudioPlaying, addAudioListener, removeAudioListener } from '../utils/audioManager.js';
import { 
  connectLearnSocket, 
  sendLearnMessage, 
  closeLearnSocket, 
  isSocketConnected,
  addMessageListener,
  removeMessageListener,
  addOpenListener,
  removeOpenListener,
  addCloseListener,
  removeCloseListener,
  addErrorListener,
  removeErrorListener,
  blobToBase64
} from '../utils/websocket.js';
import { CHATGPT_TIMING_CONFIG, STATE_TIMINGS, LANGUAGE_CONFIGS } from '../utils/chatgptTimingConfig.js';

// Conversation states
const CONVERSATION_STATES = {
  WAITING: 'waiting',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
  ERROR: 'error',
  PLAYING_INTRO: 'playing_intro',
  PLAYING_AWAIT_NEXT: 'playing_await_next',
  PLAYING_RETRY: 'playing_retry',
  PLAYING_FEEDBACK: 'playing_feedback',
  WORD_BY_WORD: 'word_by_word',
  PLAYING_YOU_SAID: 'playing_you_said',
  ENGLISH_INPUT_EDGE_CASE: 'english_input_edge_case',
  INITIALIZING: 'initializing',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected'
};

// Main conversation component
const ConversationScreen = ({ 
  onExit, 
  conversationId,
  lessonId,
  stageId,
  initialPrompt,
  ...props 
}) => {
  const { languageMode, currentLanguageFormatting } = useLanguageMode();
  
  // Main conversation state
  const [conversationState, setConversationState] = useState({
    currentStep: CONVERSATION_STATES.INITIALIZING,
    messages: [],
    isConnected: false,
    inputText: '',
    lastStopWasSilence: false,
    isFirstRecording: true,
    currentAudioId: null,
    currentWords: [],
    wordIndex: 0,
    sessionId: null,
    conversationContext: {},
    retryCount: 0,
    maxRetries: 3,
    lastUserInput: null,
    lastAiResponse: null,
    isWaitingForResponse: false,
    hasReceivedFirstResponse: false,
    silenceTimeoutId: null,
    stateTimeoutId: null,
    processingStartTime: null,
    recordingStartTime: null,
    lastActivity: Date.now(),
    
    // Error state
    error: null,
    lastError: null,
    errorRecoveryAttempts: 0,
    
    // Audio state
    currentPlayingAudio: null,
    audioQueue: [],
    isAudioPlaying: false,
    
    // UI state
    showMicButton: true,
    showStopButton: false,
    showRetryButton: false,
    microphoneAnimation: 'idle', // 'idle', 'listening', 'processing', 'speaking'
    volumeIndicator: 0,
    
    // Timing state
    recordingDuration: 0,
    processingDuration: 0,
    responseTime: 0,
    
    // Advanced state
    conversationFlow: [],
    currentFlowStep: 0,
    userEngagement: 'active', // 'active', 'passive', 'disengaged'
    adaptiveSettings: {
      vadThreshold: currentLanguageFormatting.vadThreshold,
      speechRate: currentLanguageFormatting.speechRate,
      responseTimeout: CHATGPT_TIMING_CONFIG.POST_AI_SPEECH_DELAY
    }
  });
  
  // Hooks
  const audioRecorder = useAudioRecorder({
    isFirstRecording: conversationState.isFirstRecording
  });
  
  const audioPlayer = useAudioPlayer({
    volume: 0.8,
    onEnded: handleAudioEnded,
    onError: handleAudioError
  });
  
  // Refs
  const stateTimeoutRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const activityTimeoutRef = useRef(null);
  const wordPlaybackTimeoutRef = useRef(null);
  const conversationLogRef = useRef([]);
  const mountedRef = useRef(true);
  const isInitializedRef = useRef(false);
  const speechSynthesisRef = useRef(null);
  
  // State management helpers
  const updateConversationState = useCallback((updates) => {
    setConversationState(prev => ({
      ...prev,
      ...updates,
      lastActivity: Date.now()
    }));
  }, []);
  
  const transitionToState = useCallback((newState, delay = 0) => {
    if (!mountedRef.current) return;
    
    const transition = () => {
      console.log(`State transition: ${conversationState.currentStep} -> ${newState}`);
      
      updateConversationState({
        currentStep: newState,
        lastActivity: Date.now()
      });
      
      // Log state transition
      conversationLogRef.current.push({
        timestamp: Date.now(),
        type: 'state_transition',
        from: conversationState.currentStep,
        to: newState,
        languageMode
      });
      
      // Handle state-specific logic
      handleStateTransition(newState);
    };
    
    if (delay > 0) {
      stateTimeoutRef.current = setTimeout(transition, delay);
    } else {
      transition();
    }
  }, [conversationState.currentStep, updateConversationState, languageMode]);
  
  // Handle state transitions
  const handleStateTransition = useCallback((newState) => {
    switch (newState) {
      case CONVERSATION_STATES.WAITING:
        updateConversationState({
          microphoneAnimation: 'idle',
          showMicButton: true,
          showStopButton: false,
          isWaitingForResponse: false
        });
        break;
        
      case CONVERSATION_STATES.LISTENING:
        updateConversationState({
          microphoneAnimation: 'listening',
          showMicButton: false,
          showStopButton: true,
          recordingStartTime: Date.now()
        });
        break;
        
      case CONVERSATION_STATES.PROCESSING:
        updateConversationState({
          microphoneAnimation: 'processing',
          showMicButton: false,
          showStopButton: false,
          processingStartTime: Date.now(),
          isWaitingForResponse: true
        });
        break;
        
      case CONVERSATION_STATES.SPEAKING:
        updateConversationState({
          microphoneAnimation: 'speaking',
          showMicButton: false,
          showStopButton: false,
          isAudioPlaying: true
        });
        break;
        
      case CONVERSATION_STATES.ERROR:
        updateConversationState({
          microphoneAnimation: 'idle',
          showMicButton: false,
          showStopButton: false,
          showRetryButton: true,
          isWaitingForResponse: false,
          isAudioPlaying: false
        });
        break;
        
      default:
        break;
    }
  }, [updateConversationState]);
  
  // WebSocket message handler
  const handleWebSocketMessage = useCallback((messageData) => {
    if (!mountedRef.current) return;
    
    console.log('Received WebSocket message:', messageData);
    
    if (messageData.type === 'binary') {
      // Handle binary audio data
      handleAudioData(messageData.data);
    } else if (messageData.type === 'text') {
      // Handle text messages
      const data = messageData.data;
      
      // Update conversation state
      updateConversationState({
        lastActivity: Date.now(),
        sessionId: data.session_id || conversationState.sessionId
      });
      
      // Process message based on step
      switch (data.step) {
        case 'retry':
          handleRetryStep(data);
          break;
        case 'await_next':
          handleAwaitNextStep(data);
          break;
        case 'feedback_step':
          handleFeedbackStep(data);
          break;
        case 'you_said_audio':
          handleYouSaidAudioStep(data);
          break;
        case 'repeat_prompt':
          handleRepeatPromptStep(data);
          break;
        case 'word_by_word':
          handleWordByWordStep(data);
          break;
        case 'conversation_response':
          handleConversationResponse(data);
          break;
        case 'error':
          handleServerError(data);
          break;
        default:
          console.warn('Unknown message step:', data.step);
          break;
      }
      
      // Add to conversation log
      conversationLogRef.current.push({
        timestamp: Date.now(),
        type: 'websocket_message',
        step: data.step,
        data: data,
        languageMode
      });
    }
  }, [updateConversationState, conversationState.sessionId, languageMode]);
  
  // Handle binary audio data
  const handleAudioData = useCallback(async (audioBuffer) => {
    try {
      console.log('Processing audio data:', audioBuffer.byteLength, 'bytes');
      
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      
      // Generate unique audio ID
      const audioId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Play audio using audio manager
      await playAudio(audioId, audioUrl, {
        fadeIn: 200,
        fadeOut: 200
      });
      
      updateConversationState({
        currentAudioId: audioId,
        currentPlayingAudio: audioUrl,
        isAudioPlaying: true
      });
      
      // Transition to speaking state
      transitionToState(CONVERSATION_STATES.SPEAKING);
      
    } catch (error) {
      console.error('Error processing audio data:', error);
      handleError(error);
    }
  }, [updateConversationState, transitionToState]);
  
  // Handle different message steps
  const handleRetryStep = useCallback((data) => {
    console.log('Handling retry step:', data);
    
    updateConversationState({
      retryCount: (conversationState.retryCount || 0) + 1,
      lastAiResponse: data.message || "Let's try again."
    });
    
    transitionToState(CONVERSATION_STATES.PLAYING_RETRY);
  }, [updateConversationState, conversationState.retryCount, transitionToState]);
  
  const handleAwaitNextStep = useCallback((data) => {
    console.log('Handling await next step:', data);
    
    updateConversationState({
      lastAiResponse: data.message || "Please continue.",
      hasReceivedFirstResponse: true
    });
    
    transitionToState(CONVERSATION_STATES.PLAYING_AWAIT_NEXT);
  }, [updateConversationState, transitionToState]);
  
  const handleFeedbackStep = useCallback((data) => {
    console.log('Handling feedback step:', data);
    
    updateConversationState({
      lastAiResponse: data.message || data.feedback || "Good job!",
      conversationContext: {
        ...conversationState.conversationContext,
        ...data.context
      }
    });
    
    transitionToState(CONVERSATION_STATES.PLAYING_FEEDBACK);
  }, [updateConversationState, conversationState.conversationContext, transitionToState]);
  
  const handleYouSaidAudioStep = useCallback((data) => {
    console.log('Handling you said audio step:', data);
    
    updateConversationState({
      lastUserInput: data.user_input || conversationState.lastUserInput,
      lastAiResponse: data.message || `You said: ${data.user_input || 'something'}`
    });
    
    transitionToState(CONVERSATION_STATES.PLAYING_YOU_SAID);
  }, [updateConversationState, conversationState.lastUserInput, transitionToState]);
  
  const handleRepeatPromptStep = useCallback((data) => {
    console.log('Handling repeat prompt step:', data);
    
    const words = data.words || data.text?.split(' ') || [];
    
    updateConversationState({
      currentWords: words,
      wordIndex: 0,
      lastAiResponse: data.message || "Let me say this word by word."
    });
    
    transitionToState(CONVERSATION_STATES.WORD_BY_WORD);
  }, [updateConversationState, transitionToState]);
  
  const handleWordByWordStep = useCallback((data) => {
    console.log('Handling word by word step:', data);
    
    const words = data.words || data.text?.split(' ') || [];
    
    updateConversationState({
      currentWords: words,
      wordIndex: 0,
      lastAiResponse: data.message || "Listen carefully to each word."
    });
    
    playWordByWord(words);
  }, [updateConversationState]);
  
  const handleConversationResponse = useCallback((data) => {
    console.log('Handling conversation response:', data);
    
    const responseTime = Date.now() - (conversationState.processingStartTime || Date.now());
    
    updateConversationState({
      lastAiResponse: data.message || data.response || "I understand.",
      responseTime: responseTime,
      hasReceivedFirstResponse: true,
      conversationContext: {
        ...conversationState.conversationContext,
        ...data.context
      }
    });
    
    // Add to messages
    const newMessage = {
      id: `msg_${Date.now()}`,
      type: 'ai',
      content: data.message || data.response,
      timestamp: Date.now(),
      languageMode,
      context: data.context
    };
    
    updateConversationState({
      messages: [...conversationState.messages, newMessage]
    });
    
    transitionToState(CONVERSATION_STATES.SPEAKING);
  }, [updateConversationState, conversationState.processingStartTime, conversationState.conversationContext, conversationState.messages, languageMode, transitionToState]);
  
  const handleServerError = useCallback((data) => {
    console.error('Server error:', data);
    
    const error = new Error(data.message || 'Server error occurred');
    error.code = data.code || 'SERVER_ERROR';
    error.details = data.details || {};
    
    handleError(error);
  }, []);
  
  // Word-by-word pronunciation using Web Speech API
  const playWordByWord = useCallback(async (words) => {
    try {
      console.log('Playing word by word:', words);
      
      transitionToState(CONVERSATION_STATES.WORD_BY_WORD);
      
      const languageConfig = LANGUAGE_CONFIGS[languageMode] || LANGUAGE_CONFIGS.urdu;
      
      for (let i = 0; i < words.length; i += 2) {
        if (!mountedRef.current) break;
        
        const wordChunk = i + 1 < words.length 
          ? `${words[i]} ${words[i + 1]}`
          : words[i];
        
        updateConversationState({
          wordIndex: i,
          currentWords: words
        });
        
        // Use Web Speech API
        const utterance = new SpeechSynthesisUtterance(wordChunk);
        utterance.lang = languageConfig.SPEECH_LANG;
        utterance.rate = languageConfig.SPEECH_RATE;
        utterance.pitch = languageConfig.SPEECH_PITCH;
        utterance.volume = CHATGPT_TIMING_CONFIG.SPEECH_VOLUME;
        
        // Play using speech synthesis
        speechSynthesis.speak(utterance);
        
        // Wait for speech to complete
        await new Promise(resolve => {
          utterance.onend = resolve;
          utterance.onerror = resolve;
        });
        
        // Delay between words
        await new Promise(resolve => {
          wordPlaybackTimeoutRef.current = setTimeout(resolve, CHATGPT_TIMING_CONFIG.WORD_BY_WORD_DELAY);
        });
      }
      
      // After word-by-word completion, transition to waiting
      if (mountedRef.current) {
        setTimeout(() => {
          transitionToState(CONVERSATION_STATES.WAITING);
        }, CHATGPT_TIMING_CONFIG.POST_AI_SPEECH_DELAY);
      }
      
    } catch (error) {
      console.error('Error in word-by-word playback:', error);
      handleError(error);
    }
  }, [languageMode, updateConversationState, transitionToState]);
  
  // Audio event handlers
  const handleAudioEnded = useCallback(() => {
    console.log('Audio playback ended');
    
    updateConversationState({
      isAudioPlaying: false,
      currentAudioId: null,
      currentPlayingAudio: null
    });
    
    // Transition based on current state
    switch (conversationState.currentStep) {
      case CONVERSATION_STATES.PLAYING_INTRO:
      case CONVERSATION_STATES.PLAYING_AWAIT_NEXT:
      case CONVERSATION_STATES.PLAYING_RETRY:
        transitionToState(CONVERSATION_STATES.WAITING, CHATGPT_TIMING_CONFIG.POST_AI_SPEECH_DELAY);
        break;
        
      case CONVERSATION_STATES.PLAYING_FEEDBACK:
      case CONVERSATION_STATES.PLAYING_YOU_SAID:
        transitionToState(CONVERSATION_STATES.WAITING, CHATGPT_TIMING_CONFIG.POST_AI_SPEECH_DELAY);
        break;
        
      case CONVERSATION_STATES.SPEAKING:
        transitionToState(CONVERSATION_STATES.WAITING, CHATGPT_TIMING_CONFIG.POST_AI_SPEECH_DELAY);
        break;
        
      default:
        break;
    }
  }, [updateConversationState, conversationState.currentStep, transitionToState]);
  
  const handleAudioError = useCallback((error) => {
    console.error('Audio playback error:', error);
    
    updateConversationState({
      isAudioPlaying: false,
      currentAudioId: null,
      currentPlayingAudio: null
    });
    
    handleError(error);
  }, [updateConversationState]);
  
  // Recording handlers
  const startRecording = useCallback(async () => {
    try {
      console.log('Starting recording...');
      
      if (conversationState.currentStep !== CONVERSATION_STATES.WAITING) {
        console.warn('Cannot start recording in current state:', conversationState.currentStep);
        return;
      }
      
      // Stop any current audio
      if (isAnyAudioPlaying()) {
        await stopCurrentAudio();
      }
      
      // Start recording
      await audioRecorder.startRecording();
      
      transitionToState(CONVERSATION_STATES.LISTENING);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      handleError(error);
    }
  }, [conversationState.currentStep, audioRecorder, transitionToState]);
  
  const stopRecording = useCallback(async () => {
    try {
      console.log('Stopping recording...');
      
      if (!audioRecorder.isRecording) {
        console.warn('Not currently recording');
        return;
      }
      
      audioRecorder.stopRecording();
      
      // Wait for audio to be available
      setTimeout(async () => {
        try {
          const audioBlob = audioRecorder.getAudioBlob();
          if (!audioBlob) {
            throw new Error('No audio data available');
          }
          
          await sendAudioMessage(audioBlob);
          
        } catch (error) {
          console.error('Error processing recorded audio:', error);
          handleError(error);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error stopping recording:', error);
      handleError(error);
    }
  }, [audioRecorder]);
  
  // Send audio message via WebSocket
  const sendAudioMessage = useCallback(async (audioBlob) => {
    try {
      console.log('Sending audio message...');
      
      if (!isSocketConnected()) {
        throw new Error('WebSocket not connected');
      }
      
      transitionToState(CONVERSATION_STATES.PROCESSING);
      
      // Convert blob to base64
      const base64Audio = await blobToBase64(audioBlob);
      
      const messagePayload = {
        audio_base64: base64Audio,
        filename: `recording-${Date.now()}.wav`,
        language_mode: languageMode,
        session_id: conversationState.sessionId,
        conversation_id: conversationId,
        lesson_id: lessonId,
        stage_id: stageId,
        context: conversationState.conversationContext,
        timestamp: Date.now()
      };
      
      sendLearnMessage(JSON.stringify(messagePayload));
      
      // Add user message to conversation
      const userMessage = {
        id: `msg_${Date.now()}`,
        type: 'user',
        content: '[Audio Message]',
        timestamp: Date.now(),
        languageMode,
        audioBlob: audioBlob
      };
      
      updateConversationState({
        messages: [...conversationState.messages, userMessage],
        lastUserInput: '[Audio Message]',
        isFirstRecording: false
      });
      
      console.log('Audio message sent successfully');
      
    } catch (error) {
      console.error('Error sending audio message:', error);
      handleError(error);
    }
  }, [languageMode, conversationState.sessionId, conversationId, lessonId, stageId, conversationState.conversationContext, conversationState.messages, updateConversationState, transitionToState]);
  
  // Error handling
  const handleError = useCallback((error) => {
    console.error('Handling error:', error);
    
    const errorObj = {
      message: error.message || 'An error occurred',
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: Date.now(),
      context: {
        currentStep: conversationState.currentStep,
        languageMode,
        isConnected: conversationState.isConnected
      }
    };
    
    updateConversationState({
      error: errorObj,
      lastError: errorObj,
      errorRecoveryAttempts: (conversationState.errorRecoveryAttempts || 0) + 1
    });
    
    transitionToState(CONVERSATION_STATES.ERROR);
    
    // Log error
    conversationLogRef.current.push({
      timestamp: Date.now(),
      type: 'error',
      error: errorObj,
      languageMode
    });
  }, [conversationState.currentStep, conversationState.isConnected, conversationState.errorRecoveryAttempts, languageMode, updateConversationState, transitionToState]);
  
  // Retry conversation
  const retryConversation = useCallback(async () => {
    try {
      console.log('Retrying conversation...');
      
      updateConversationState({
        error: null,
        retryCount: (conversationState.retryCount || 0) + 1
      });
      
      // Attempt to reconnect if needed
      if (!isSocketConnected()) {
        await connectWebSocket();
      }
      
      transitionToState(CONVERSATION_STATES.WAITING);
      
    } catch (error) {
      console.error('Error retrying conversation:', error);
      handleError(error);
    }
  }, [updateConversationState, conversationState.retryCount, transitionToState]);
  
  // WebSocket connection
  const connectWebSocket = useCallback(async () => {
    try {
      console.log('Connecting to WebSocket...');
      
      transitionToState(CONVERSATION_STATES.CONNECTING);
      
      await connectLearnSocket();
      
      updateConversationState({
        isConnected: true,
        error: null
      });
      
      console.log('WebSocket connected successfully');
      
      // Send initial message if provided
      if (initialPrompt) {
        setTimeout(() => {
          sendInitialMessage();
        }, CHATGPT_TIMING_CONFIG.POST_AI_SPEECH_DELAY);
      } else {
        transitionToState(CONVERSATION_STATES.WAITING);
      }
      
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      handleError(error);
    }
  }, [updateConversationState, transitionToState, initialPrompt]);
  
  const sendInitialMessage = useCallback(async () => {
    try {
      if (!initialPrompt) return;
      
      const messagePayload = {
        type: 'initial_prompt',
        message: initialPrompt,
        language_mode: languageMode,
        conversation_id: conversationId,
        lesson_id: lessonId,
        stage_id: stageId,
        timestamp: Date.now()
      };
      
      sendLearnMessage(JSON.stringify(messagePayload));
      
      transitionToState(CONVERSATION_STATES.PROCESSING);
      
    } catch (error) {
      console.error('Error sending initial message:', error);
      handleError(error);
    }
  }, [initialPrompt, languageMode, conversationId, lessonId, stageId, transitionToState]);
  
  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('Cleaning up conversation...');
    
    mountedRef.current = false;
    
    // Clear timeouts
    if (stateTimeoutRef.current) {
      clearTimeout(stateTimeoutRef.current);
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    if (wordPlaybackTimeoutRef.current) {
      clearTimeout(wordPlaybackTimeoutRef.current);
    }
    
    // Stop speech synthesis
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    
    // Clean up audio
    audioRecorder.cleanup();
    audioPlayer.cleanup();
    stopCurrentAudio();
    
    // Close WebSocket
    closeLearnSocket();
    
    // Clean up object URLs
    if (conversationState.currentPlayingAudio) {
      URL.revokeObjectURL(conversationState.currentPlayingAudio);
    }
    
    // Remove event listeners
    removeMessageListener(handleWebSocketMessage);
    removeOpenListener(handleWebSocketOpen);
    removeCloseListener(handleWebSocketClose);
    removeErrorListener(handleWebSocketError);
    removeAudioListener(handleAudioManagerEvent);
    
    console.log('Conversation cleanup completed');
  }, [conversationState.currentPlayingAudio, audioRecorder, audioPlayer, handleWebSocketMessage]);
  
  // WebSocket event handlers
  const handleWebSocketOpen = useCallback(() => {
    console.log('WebSocket opened');
    
    updateConversationState({
      isConnected: true,
      error: null
    });
  }, [updateConversationState]);
  
  const handleWebSocketClose = useCallback(() => {
    console.log('WebSocket closed');
    
    updateConversationState({
      isConnected: false
    });
    
    transitionToState(CONVERSATION_STATES.DISCONNECTED);
  }, [updateConversationState, transitionToState]);
  
  const handleWebSocketError = useCallback((error) => {
    console.error('WebSocket error:', error);
    
    updateConversationState({
      isConnected: false
    });
    
    handleError(error);
  }, [updateConversationState, handleError]);
  
  // Audio manager event handler
  const handleAudioManagerEvent = useCallback((event, data) => {
    switch (event) {
      case 'play':
        updateConversationState({
          isAudioPlaying: true,
          currentAudioId: data.id
        });
        break;
        
      case 'ended':
        if (data.id === conversationState.currentAudioId) {
          handleAudioEnded();
        }
        break;
        
      case 'error':
        if (data.id === conversationState.currentAudioId) {
          handleAudioError(data.error);
        }
        break;
        
      default:
        break;
    }
  }, [conversationState.currentAudioId, updateConversationState, handleAudioEnded, handleAudioError]);
  
  // Initialize component
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      
      // Add event listeners
      addMessageListener(handleWebSocketMessage);
      addOpenListener(handleWebSocketOpen);
      addCloseListener(handleWebSocketClose);
      addErrorListener(handleWebSocketError);
      addAudioListener(handleAudioManagerEvent);
      
      // Initialize WebSocket connection
      connectWebSocket();
    }
    
    // Cleanup on unmount
    return cleanup;
  }, [handleWebSocketMessage, handleWebSocketOpen, handleWebSocketClose, handleWebSocketError, handleAudioManagerEvent, connectWebSocket, cleanup]);
  
  // Handle audio recorder state changes
  useEffect(() => {
    if (audioRecorder.isVoiceDetected) {
      updateConversationState({
        volumeIndicator: audioRecorder.volumeLevel
      });
    }
  }, [audioRecorder.isVoiceDetected, audioRecorder.volumeLevel, updateConversationState]);
  
  // Handle screen focus/blur
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, pause any active operations
        if (audioRecorder.isRecording) {
          audioRecorder.pauseRecording();
        }
      } else {
        // Page is visible, resume operations
        if (audioRecorder.isRecording) {
          audioRecorder.resumeRecording();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [audioRecorder]);
  
  // Render component
  return (
    <div className="conversation-screen flex flex-col h-full bg-gray-50" {...props}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center space-x-4">
          <button
            onClick={onExit}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              conversationState.isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-sm font-medium text-gray-700">
              {conversationState.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            {languageMode === 'urdu' ? 'اردو' : 'English'}
          </div>
          
          <div className="text-sm text-gray-600">
            {conversationState.currentStep.replace('_', ' ').toUpperCase()}
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversationState.messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-800 border'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>
      
      {/* Controls */}
      <div className="p-4 bg-white border-t">
        <div className="flex items-center justify-center space-x-4">
          {/* Volume Indicator */}
          {conversationState.microphoneAnimation === 'listening' && (
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-8 rounded-full transition-all ${
                    i <= conversationState.volumeIndicator / 20 ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
          
          {/* Microphone Button */}
          {conversationState.showMicButton && (
            <button
              onClick={startRecording}
              disabled={!conversationState.isConnected || audioRecorder.isRecording}
              className={`
                w-16 h-16 rounded-full flex items-center justify-center
                transition-all duration-200 transform hover:scale-105
                ${conversationState.microphoneAnimation === 'idle'
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-gray-400'
                }
                ${!conversationState.isConnected ? 'opacity-50 cursor-not-allowed' : ''}
                text-white shadow-lg
              `}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}
          
          {/* Stop Button */}
          {conversationState.showStopButton && (
            <button
              onClick={stopRecording}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9V10z" />
              </svg>
            </button>
          )}
          
          {/* Retry Button */}
          {conversationState.showRetryButton && (
            <button
              onClick={retryConversation}
              className="w-16 h-16 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center text-white shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Status Text */}
        <div className="text-center mt-4">
          <div className="text-sm text-gray-600">
            {getStatusText(conversationState.currentStep, conversationState.microphoneAnimation)}
          </div>
          
          {conversationState.error && (
            <div className="text-sm text-red-600 mt-2">
              {conversationState.error.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to get status text
const getStatusText = (currentStep, microphoneAnimation) => {
  switch (currentStep) {
    case CONVERSATION_STATES.INITIALIZING:
      return 'Initializing...';
    case CONVERSATION_STATES.CONNECTING:
      return 'Connecting...';
    case CONVERSATION_STATES.WAITING:
      return 'Tap to speak';
    case CONVERSATION_STATES.LISTENING:
      return 'Listening...';
    case CONVERSATION_STATES.PROCESSING:
      return 'Processing...';
    case CONVERSATION_STATES.SPEAKING:
      return 'Speaking...';
    case CONVERSATION_STATES.PLAYING_INTRO:
      return 'Playing introduction...';
    case CONVERSATION_STATES.PLAYING_AWAIT_NEXT:
      return 'Waiting for your response...';
    case CONVERSATION_STATES.PLAYING_RETRY:
      return 'Let\'s try again...';
    case CONVERSATION_STATES.PLAYING_FEEDBACK:
      return 'Providing feedback...';
    case CONVERSATION_STATES.WORD_BY_WORD:
      return 'Playing word by word...';
    case CONVERSATION_STATES.PLAYING_YOU_SAID:
      return 'Confirming what you said...';
    case CONVERSATION_STATES.ERROR:
      return 'Error occurred. Tap retry to continue.';
    case CONVERSATION_STATES.DISCONNECTED:
      return 'Disconnected. Attempting to reconnect...';
    default:
      return 'Ready';
  }
};

export default ConversationScreen; 