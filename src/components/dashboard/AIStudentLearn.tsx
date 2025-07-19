import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Mic, X, Target, Volume2, Play, Square } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { connectLearnSocket, sendLearnMessage, closeLearnSocket, WebSocketMessage, getSocketState, waitForWebSocketReady, isWebSocketReady } from '../../utils/websocket';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';

type LearnStep = 'welcome' | 'translate' | 'conversation';
type ConversationState = 'waiting' | 'listening' | 'processing' | 'speaking' | 'playing_intro' | 'word_by_word' | 'you_said' | 'full_sentence' | 'feedback' | 'no_speech';
type LanguageMode = 'urdu' | 'english';

// Props interface for AIStudentLearn component (empty by design)
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AIStudentLearnProps {}

export const AIStudentLearn: React.FC<AIStudentLearnProps> = () => {
  const [step, setStep] = useState<LearnStep>('welcome');
  const [languageMode, setLanguageMode] = useState<LanguageMode>('urdu');
  const [conversationState, setConversationState] = useState<ConversationState>('waiting');
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [hasPlayedGreeting, setHasPlayedGreeting] = useState<boolean>(false);
  const [hasPlayedWelcomeAudio, setHasPlayedWelcomeAudio] = useState<boolean>(false);
  const [isPlayingWelcomeAudio, setIsPlayingWelcomeAudio] = useState<boolean>(false);
  const [showManualPlayButton, setShowManualPlayButton] = useState<boolean>(false);
  const [hasTriedAutoplay, setHasTriedAutoplay] = useState<boolean>(false);
  
  // Learning flow state
  const [currentWords, setCurrentWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [fullSentence, setFullSentence] = useState<string>('');
  const [userSaidText, setUserSaidText] = useState<string>('');
  const [englishSentence, setEnglishSentence] = useState<string>('');
  const [urduSentence, setUrduSentence] = useState<string>('');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  
  // State recovery timeout refs
  const stateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { isRecording, audioBlob, startRecording, stopRecording, error: recordingError } = useAudioRecorder();
  const [connectionError, setConnectionError] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sendCompletionEventRef = useRef<((eventType: 'word_by_word_complete' | 'feedback_complete' | 'you_said_complete') => void) | null>(null);

  // Helper function for translations
  const t = useCallback((en: string, ur: string): string => languageMode === 'english' ? en : ur, [languageMode]);

  // Reset learning state for next sentence
  const resetLearningState = useCallback((): void => {
    setCurrentWords([]);
    setCurrentWordIndex(0);
    setFullSentence('');
    setUserSaidText('');
    setEnglishSentence('');
    setUrduSentence('');
    setFeedbackText('');
    
    // Clear any state recovery timeouts
    if (stateTimeoutRef.current) {
      clearTimeout(stateTimeoutRef.current);
      stateTimeoutRef.current = null;
    }
  }, []);

  // State recovery mechanism - automatically recover from stuck states
  const setConversationStateWithRecovery = useCallback((newState: ConversationState): void => {
    // Clear existing timeout
    if (stateTimeoutRef.current) {
      clearTimeout(stateTimeoutRef.current);
      stateTimeoutRef.current = null;
    }
    
    // Set the new state
    setConversationState(newState);
    console.log(`🔄 State changed to: ${newState}`);
    
    // Set recovery timeout for states that might get stuck
    const recoveryTime = (() => {
      switch (newState) {
        case 'processing': return 25000;      // 25 seconds for server processing
        case 'word_by_word': return 30000;    // 30 seconds for word-by-word playback
        case 'you_said': return 8000;         // 8 seconds for "you said" display
        case 'feedback': return 12000;        // 12 seconds for feedback display
        case 'full_sentence': return 15000;   // 15 seconds for full sentence state
        case 'speaking': return 20000;        // 20 seconds for AI speaking
        default: return null; // No timeout for waiting, listening states
      }
    })();
    
    if (recoveryTime) {
      console.log(`🕐 Setting recovery timeout for ${newState} state: ${recoveryTime}ms`);
      stateTimeoutRef.current = setTimeout(() => {
        console.warn(`⚠️ State '${newState}' timeout after ${recoveryTime}ms - forcing recovery`);
        
        // Force recovery to waiting state
        setConversationState('waiting');
        setCurrentMessage(languageMode === 'english' ? 
          `Recovered from stuck state. Ready to continue.` : 
          `رک گئی حالت سے بازیابی۔ جاری رکھنے کے لیے تیار۔`
        );
        
        // Clean up any audio or learning state
        cleanupAudio();
        resetLearningState();
        
        stateTimeoutRef.current = null;
      }, recoveryTime);
    }
     }, [languageMode]);

  // General error recovery function will be defined later with cleanupAudio

  // Enhanced error recovery with retry mechanism
  const recoverFromError = useCallback((errorType: string, errorMessage?: string): void => {
    console.warn(`🔄 Recovering from error: ${errorType}`);
    console.warn(`Error message: ${errorMessage || 'Unknown error'}`);
    
    // Clear any timeouts or ongoing operations
    if (typeof window !== 'undefined' && (window as any).currentProcessingTimeout) {
      clearTimeout((window as any).currentProcessingTimeout);
      (window as any).currentProcessingTimeout = null;
    }
    
         // Clean up audio and state will be handled by individual functions
     resetLearningState();
    
    // Set appropriate recovery message
    const recoveryMessage = (() => {
      switch (errorType) {
        case 'audio_upload_failed':
          return languageMode === 'english' ? 
            'Audio upload failed. Please try speaking again.' : 
            'آڈیو اپ لوڈ ناکام۔ براہ کرم دوبارہ بولیں۔';
        case 'processing_timeout':
          return languageMode === 'english' ? 
            'Server processing timeout. Please try again.' : 
            'سرور پروسیسنگ ٹائم آؤٹ۔ براہ کرم دوبارہ کوشش کریں۔';
        case 'connection_lost':
          return languageMode === 'english' ? 
            'Connection lost. Please check your internet.' : 
            'کنکشن ٹوٹ گیا۔ اپنا انٹرنیٹ چیک کریں۔';
        default:
          return languageMode === 'english' ? 
            'An error occurred. Ready to try again.' : 
            'خرابی ہوئی۔ دوبارہ کوشش کے لیے تیار۔';
      }
    })();
    
    // Reset to waiting state with recovery message
    setConversationStateWithRecovery('waiting');
    setCurrentMessage(recoveryMessage);
    
    console.log(`✅ Recovery complete. Ready for user input.`);
     }, [languageMode, resetLearningState]);

  // Cleanup audio resources
  const cleanupAudio = useCallback((): void => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
  }, []);

  // Play welcome audio using pre-recorded S3 file
  const playWelcomeAudio = useCallback((isAutomatic: boolean = false): void => {
    if (isPlayingWelcomeAudio) return; // Prevent multiple plays
    
    // If this is an automatic attempt and we've already tried or user has played it, skip
    if (isAutomatic && (hasTriedAutoplay || hasPlayedWelcomeAudio)) {
      return;
    }
    
    setIsPlayingWelcomeAudio(true);
    
    // Play pre-recorded static audio from S3
    const audio = new Audio('https://dil-lms.s3.us-east-1.amazonaws.com/greeting_message_multilingual.mp3');
    
    audio.play().then(() => {
      // Audio started playing successfully
      console.log('Welcome audio started playing');
      setShowManualPlayButton(false); // Hide manual button if autoplay worked
    }).catch((error: Error) => {
      console.error('Error playing welcome audio:', error);
      setIsPlayingWelcomeAudio(false);
      
      // If this was an automatic attempt and failed, show manual button
      if (isAutomatic) {
        setShowManualPlayButton(true);
        console.log('Autoplay blocked, showing manual play button');
      }
    });
    
    audio.onended = () => {
      console.log('Welcome audio finished playing');
      setIsPlayingWelcomeAudio(false);
      setHasPlayedWelcomeAudio(true);
    };

    audio.onerror = () => {
      console.error('Error loading welcome audio');
      setIsPlayingWelcomeAudio(false);
      if (isAutomatic) {
        setShowManualPlayButton(true);
      }
    };
  }, [isPlayingWelcomeAudio, hasTriedAutoplay, hasPlayedWelcomeAudio]);

  // Handler for manual play button click
  const handleManualPlayClick = useCallback((): void => {
    playWelcomeAudio(false);
  }, [playWelcomeAudio]);

  // Always start with welcome screen
  // useEffect(() => {
  //   const hasVisited = localStorage.getItem('hasVisitedLearn');
  //   if (hasVisited === 'true') {
  //     setStep('translate');
  //   }
  // }, []);

  // Try to play welcome audio automatically when step changes to welcome
  useEffect(() => {
    if (step === 'welcome' && !hasPlayedWelcomeAudio && !hasTriedAutoplay) {
      // Try automatic playback only once, will show manual button if blocked
      const timeoutId = setTimeout(() => {
        setHasTriedAutoplay(true);
        playWelcomeAudio(true);
      }, 500); // Small delay to ensure page is fully loaded
      
      return () => clearTimeout(timeoutId);
    }
    
    // Reset autoplay attempt when leaving welcome screen
    if (step !== 'welcome') {
      setHasTriedAutoplay(false);
      setShowManualPlayButton(false);
    }
  }, [step, hasPlayedWelcomeAudio, hasTriedAutoplay, playWelcomeAudio]);

  // Handle audio upload when recording stops
  useEffect(() => {
    if (audioBlob && step === 'conversation') {
      // Check if audio blob has sufficient size (minimum 1KB to filter out empty recordings)
      if (audioBlob.size < 1000) {
        console.warn('Audio blob too small, likely empty recording:', audioBlob.size, 'bytes');
        setConversationState('waiting');
        setCurrentMessage(languageMode === 'english' ? 'Recording too short. Please hold the button and speak clearly.' : 'ریکارڈنگ بہت چھوٹی ہے۔ براہ کرم بٹن دبائیں اور صاف بولیں۔');
        return;
      }
      
      console.log('Processing audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);
      uploadAudio(audioBlob);
    }
  }, [audioBlob, step, languageMode]);

    // Memoized message and audio handlers - stabilized dependencies
  const handleWebSocketMessage = useCallback((data: WebSocketMessage): void => {
    console.log('🔽 ==============================================');
    console.log('🔽 WebSocket message received:', data);
    console.log('🔽 Message step:', data.step);
    console.log('🔽 Full message data:', JSON.stringify(data, null, 2));
    console.log('🔽 Current conversation state:', conversationState);
    console.log('🔽 Data keys available:', Object.keys(data || {}));
    console.log('🔽 Data type:', typeof data);
    console.log('🔽 Has step?', !!data.step);
    console.log('🔽 Has response?', !!data.response);
    console.log('🔽 Has words?', !!data.words);
    console.log('🔽 Has english_sentence?', !!data.english_sentence);
    console.log('🔽 Has urdu_sentence?', !!data.urdu_sentence);
    console.log('🔽 ==============================================');
    
    // Clear any processing timeout since we got a response
    if (typeof window !== 'undefined' && (window as any).currentProcessingTimeout) {
      clearTimeout((window as any).currentProcessingTimeout);
      (window as any).currentProcessingTimeout = null;
    }
    
    // Enhanced message format detection and handling
    if (!data.step) {
      console.log('🔍 No step found in message, analyzing message format...');
      console.log('🔍 Available properties:', Object.keys(data || {}));
      
      // Check for different possible message formats from server
      
      // Format 1: Direct response with transcription (You said format)
      if (data.response && typeof data.response === 'string') {
        console.log('🔍 Found direct response - treating as "you_said"');
        setConversationStateWithRecovery('you_said');
        setUserSaidText(data.response);
        if (data.english_sentence) setEnglishSentence(data.english_sentence);
        if (data.urdu_sentence) setUrduSentence(data.urdu_sentence);
        setCurrentMessage(`${languageMode === 'english' ? 'You said:' : 'آپ نے کہا:'} ${data.response}. ${languageMode === 'english' ? 'Now repeat after me.' : 'اب میرے پیچھے دہرائیں۔'}`);
        
        // Auto-progress to word_by_word after 3 seconds
        setTimeout(() => {
          sendCompletionEventRef.current?.('you_said_complete');
        }, 3000);
        return;
      }
      
      // Format 2: Word array for word-by-word learning
      if (data.words && Array.isArray(data.words) && data.words.length > 0) {
        console.log('🔍 Found words array - treating as "word_by_word"');
        setConversationStateWithRecovery('word_by_word');
        setCurrentWords(data.words);
        setCurrentWordIndex(0);
        if (data.english_sentence) setEnglishSentence(data.english_sentence);
        if (data.urdu_sentence) setUrduSentence(data.urdu_sentence);
        setCurrentMessage(languageMode === 'english' ? 'Repeat after me.' : 'میرے پیچھے دہرائیں۔');
        playWordByWord(data.words);
        return;
      }
      
      // Format 3: English sentence for full sentence practice
      if (data.english_sentence && typeof data.english_sentence === 'string') {
        console.log('🔍 Found english_sentence - treating as "full_sentence"');
        setConversationStateWithRecovery('full_sentence');
        setFullSentence(data.english_sentence);
        setEnglishSentence(data.english_sentence);
        if (data.urdu_sentence) setUrduSentence(data.urdu_sentence);
        setCurrentMessage(`${languageMode === 'english' ? 'Now repeat the full sentence:' : 'اب پورا جملہ دہرائیں:'} ${data.english_sentence}.`);
        return;
      }
      
      // Format 4: Feedback or completion message
      if ((data.feedback && typeof data.feedback === 'string') || (data.message && typeof data.message === 'string')) {
        const feedbackMsg = (typeof data.feedback === 'string' ? data.feedback : '') || (typeof data.message === 'string' ? data.message : '');
        console.log('🔍 Found feedback/message - treating as "feedback"');
        setConversationStateWithRecovery('feedback');
        setFeedbackText(feedbackMsg);
        setCurrentMessage(feedbackMsg);
        setTimeout(() => {
          sendCompletionEventRef.current?.('feedback_complete');
          setTimeout(() => {
            setConversationStateWithRecovery('waiting');
            setCurrentMessage(languageMode === 'english' ? 'Ready for next sentence. Press and hold to speak.' : 'اگلے جملے کے لیے تیار۔ بولنے کے لیے دبائیں اور رکھیں۔');
            resetLearningState();
          }, 2000);
        }, 5000);
        return;
      }
      
      // Format 5: Status or error messages
      if ((data.status && typeof data.status === 'string') || (data.error && typeof data.error === 'string')) {
        const statusMsg = (typeof data.error === 'string' ? data.error : '') || (typeof data.status === 'string' ? data.status : '');
        console.log('🔍 Found status/error message:', statusMsg);
        
        if (statusMsg && statusMsg.toLowerCase().includes('no speech')) {
          setConversationStateWithRecovery('no_speech');
          setCurrentMessage(languageMode === 'english' ? 'No speech detected. Please try again.' : 'کوئی آواز نہیں سنائی دی۔ براہ کرم دوبارہ کوشش کریں۔');
          setTimeout(() => {
            setConversationStateWithRecovery('waiting');
            setCurrentMessage(languageMode === 'english' ? 'Press and hold to speak' : 'بولنے کے لیے دبائیں اور رکھیں');
          }, 3000);
        } else {
          setConversationStateWithRecovery('feedback');
          setCurrentMessage(statusMsg || 'Server response received');
        }
        return;
      }
      
      // Format 6: Unknown format - log and provide generic feedback
      console.warn('🔍 Unknown message format received');
      console.warn('🔍 Message data:', data);
      console.warn('🔍 Will treat as generic feedback and continue');
      
      setConversationStateWithRecovery('feedback');
      setFeedbackText('Message received from server');
      setCurrentMessage(languageMode === 'english' ? 'Processing complete. Let\'s continue!' : 'پروسیسنگ مکمل۔ آئیے جاری رکھتے ہیں!');
      setTimeout(() => {
        sendCompletionEventRef.current?.('feedback_complete');
        setTimeout(() => {
          setConversationStateWithRecovery('waiting');
          setCurrentMessage(languageMode === 'english' ? 'Ready for next sentence. Press and hold to speak.' : 'اگلے جملے کے لیے تیار۔ بولنے کے لیے دبائیں اور رکھیں۔');
          resetLearningState();
        }, 2000);
      }, 3000);
      return;
    }
    
    switch (data.step) {
      case 'retry':
        setConversationStateWithRecovery('waiting');
        setCurrentMessage(languageMode === 'english' ? 'Try again' : 'دوبارہ کوشش کریں');
        break;
        
      case 'you_said_audio':
        setConversationStateWithRecovery('you_said');
        setUserSaidText(data.response || '');
        if (data.english_sentence) {
          setEnglishSentence(data.english_sentence);
        }
        if (data.urdu_sentence) {
          setUrduSentence(data.urdu_sentence);
        }
        setCurrentMessage(`${languageMode === 'english' ? 'You said:' : 'آپ نے کہا:'} ${data.response || ''}. ${languageMode === 'english' ? 'Now repeat after me.' : 'اب میرے پیچھے دہرائیں۔'}`);
        // Auto-complete you_said step after a brief delay
        setTimeout(() => {
          sendCompletionEventRef.current?.('you_said_complete');
        }, 3000);
        break;
        
      case 'repeat_prompt':
      case 'word_by_word':
        setConversationStateWithRecovery('word_by_word');
        if (data.words && Array.isArray(data.words)) {
          setCurrentWords(data.words);
          setCurrentWordIndex(0);
          if (data.english_sentence) {
            setEnglishSentence(data.english_sentence);
          }
          if (data.urdu_sentence) {
            setUrduSentence(data.urdu_sentence);
          }
          setCurrentMessage(languageMode === 'english' ? 'Repeat after me.' : 'میرے پیچھے دہرائیں۔');
          playWordByWord(data.words);
        }
        break;
        
      case 'full_sentence_audio':
        setConversationStateWithRecovery('full_sentence');
        if (data.english_sentence) {
          setFullSentence(data.english_sentence);
          setEnglishSentence(data.english_sentence);
        }
        if (data.urdu_sentence) {
          setUrduSentence(data.urdu_sentence);
        }
        setCurrentMessage(`${languageMode === 'english' ? 'Now repeat the full sentence:' : 'اب پورا جملہ دہرائیں:'} ${data.english_sentence || data.response || ''}.`);
        break;
        
      case 'feedback_step':
        setConversationStateWithRecovery('feedback');
        setFeedbackText(data.response || '');
        setCurrentMessage(data.response || (languageMode === 'english' ? 'Great job!' : 'شاباش!'));
        // Auto-complete feedback step after allowing user to read it
        setTimeout(() => {
          sendCompletionEventRef.current?.('feedback_complete');
          // Reset for next sentence
          setTimeout(() => {
            setConversationStateWithRecovery('waiting');
            setCurrentMessage(languageMode === 'english' ? 'Ready for next sentence. Press and hold to speak.' : 'اگلے جملے کے لیے تیار۔ بولنے کے لیے دبائیں اور رکھیں۔');
            resetLearningState();
          }, 2000);
        }, 5000);
        break;
        
      case 'no_speech':
        setConversationStateWithRecovery('no_speech');
        setCurrentMessage(languageMode === 'english' ? 'No speech detected. Please try again.' : 'کوئی آواز نہیں سنائی دی۔ براہ کرم دوبارہ کوشش کریں۔');
        setTimeout(() => {
          setConversationStateWithRecovery('waiting');
          setCurrentMessage(languageMode === 'english' ? 'Press and hold to speak' : 'بولنے کے لیے دبائیں اور رکھیں');
        }, 3000);
        break;
        
      case 'await_next':
        setConversationStateWithRecovery('waiting');
        setCurrentMessage(data.response || (languageMode === 'english' ? 'Please continue' : 'براہ کرم جاری رکھیں'));
        break;
        
      case 'english_input_edge_case':
        console.log('English input edge case detected:', data.response);
        setConversationState('feedback');
        setFeedbackText(data.response || '');
        setCurrentMessage(data.response || (languageMode === 'english' ? 'Please try speaking in Urdu instead.' : 'براہ کرم اردو میں بولنے کی کوشش کریں۔'));
        // Auto-complete after showing message
        setTimeout(() => {
          sendCompletionEventRef.current?.('feedback_complete');
          setTimeout(() => {
            setConversationState('waiting');
            setCurrentMessage(languageMode === 'english' ? 'Ready for next sentence. Press and hold to speak.' : 'اگلے جملے کے لیے تیار۔ بولنے کے لیے دبائیں اور رکھیں۔');
            resetLearningState();
          }, 2000);
        }, 4000);
        break;
        
             default:
         console.warn('Unknown message step:', data.step, 'Full data:', data);
         // If we're in processing state and get an unknown message, try to handle it as feedback
         if (conversationState === 'processing') {
           console.log('Processing state - treating unknown message as feedback');
           setConversationState('feedback');
           setFeedbackText(data.response || 'Message received');
           setCurrentMessage(data.response || 'Great job! Let\'s continue.');
                       setTimeout(() => {
              sendCompletionEventRef.current?.('feedback_complete');
              setTimeout(() => {
                setConversationState('waiting');
                setCurrentMessage(languageMode === 'english' ? 'Ready for next sentence. Press and hold to speak.' : 'اگلے جملے کے لیے تیار۔ بولنے کے لیے دبائیں اور رکھیں۔');
                resetLearningState();
              }, 2000);
            }, 3000);
         }
         break;
    }
  }, [languageMode, resetLearningState]);

  // Send completion events to server
  const sendCompletionEvent = useCallback((eventType: 'word_by_word_complete' | 'feedback_complete' | 'you_said_complete'): void => {
    console.log(`Attempting to send ${eventType} event`);
    
    // Check if WebSocket is connected before sending
    if (!isConnected) {
      console.error(`❌ Cannot send ${eventType} event - WebSocket not connected`);
      return;
    }
    
    const payload = {
      type: eventType,
      language_mode: languageMode,
      timestamp: Date.now()
    };
    
    console.log(`📤 Sending ${eventType} event to server`);
    const success = sendLearnMessage(JSON.stringify(payload));
    
    if (!success) {
      console.error(`❌ Failed to send ${eventType} event`);
    } else {
      console.log(`✅ ${eventType} event sent successfully`);
    }
  }, [languageMode, isConnected]);

  // Set the completion event function ref so it can be called from handleWebSocketMessage
  useEffect(() => {
    sendCompletionEventRef.current = sendCompletionEvent;
  }, [sendCompletionEvent]);

  const handleAudioData = useCallback((audioBuffer: ArrayBuffer): void => {
    console.log('Received binary audio data:', audioBuffer.byteLength, 'bytes');
    
    // Clear any processing timeout since we got a response
    if (typeof window !== 'undefined' && (window as any).currentProcessingTimeout) {
      clearTimeout((window as any).currentProcessingTimeout);
      (window as any).currentProcessingTimeout = null;
    }
    
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(blob);
    playAudio(audioUrl);
    setConversationState('speaking');
  }, []);

  const handleConnectionClose = useCallback((): void => {
    console.warn('🔌 WebSocket connection closed - initiating recovery');
    setIsConnected(false);
    setConversationStateWithRecovery('waiting');
    setCurrentMessage(languageMode === 'english' ? 
      'Connection lost. Attempting to reconnect...' : 
      'کنکشن ٹوٹ گیا۔ دوبارہ جڑنے کی کوشش...');
    
    // Clear any ongoing audio or state
    cleanupAudio();
    resetLearningState();
  }, [languageMode]);

  // Handle WebSocket reconnection
  const handleReconnect = useCallback((): void => {
    console.log('WebSocket reconnected');
    setIsConnected(true);
    setConnectionError(''); // Clear error on successful connection
    setCurrentMessage(languageMode === 'english' ? 'Connected successfully! Ready to learn.' : 'کامیابی سے جڑ گیا! سیکھنے کے لیے تیار۔');
  }, [languageMode]);

  const handleError = useCallback((error: Event): void => {
    console.error('WebSocket error:', error);
    setConnectionError(languageMode === 'english' ? 
      'Failed to connect to learning server. Server may be unavailable.' : 
      'لرننگ سرور سے رابطہ ناکام۔ سرور دستیاب نہیں ہو سکتا۔');
    setCurrentMessage(languageMode === 'english' ? 'Connection error. Please check server status.' : 'کنکشن میں خرابی۔ سرور کی حالت چیک کریں۔');
  }, [languageMode]);

  // WebSocket connection for conversation - simplified dependencies
  useEffect(() => {
    if (step === 'conversation') {
      let isCurrentConnection = true; // Flag to prevent stale connections
      
      setCurrentMessage(languageMode === 'english' ? 'Connecting...' : 'رابطہ قائم کر رہے ہیں...');
      
      const connectSocket = async () => {
        try {
          const connected = await connectLearnSocket(
            handleWebSocketMessage,
            handleAudioData,
            handleConnectionClose,
            handleError,
            handleReconnect
          );
          
          if (connected && isCurrentConnection) {
            setConnectionError(''); // Clear any previous connection errors
            console.log("🔌 WebSocket connection established, verifying...");
            
            // Enhanced connection verification with immediate check
            if (isWebSocketReady()) {
              console.log("🟢 ==========================================");
              console.log("🟢 Socket already connected!");
              console.log("🟢 WebSocket state:", getSocketState());
              console.log("🟢 Ready for audio input");
              console.log("🟢 ==========================================");
              setIsConnected(true);
              setCurrentMessage(languageMode === 'english' ? 'Connected! Ready to learn.' : 'جڑ گئے! سیکھنے کے لیے تیار۔');
              
              // Play intro audio only once
              if (!hasPlayedGreeting && isCurrentConnection) {
                setTimeout(() => {
                  playIntroAudio();
                  setHasPlayedGreeting(true);
                }, 500);
              }
            } else {
              // Fallback: Wait for connection verification like mobile app
              console.log("🔄 Socket not immediately ready, waiting for verification...");
              let verificationAttempts = 0;
              const maxVerificationAttempts = 50; // 5 seconds max
              
              const verificationInterval = setInterval(() => {
                verificationAttempts++;
                
                if (isWebSocketReady()) {
                  console.log("🟢 ==========================================");
                  console.log(`🟢 Socket verified after ${verificationAttempts * 100}ms!`);
                  console.log("🟢 WebSocket state:", getSocketState());
                  console.log("🟢 Ready for audio input");
                  console.log("🟢 ==========================================");
                  setIsConnected(true);
                  setCurrentMessage(languageMode === 'english' ? 'Connected! Ready to learn.' : 'جڑ گئے! سیکھنے کے لیے تیار۔');
                  clearInterval(verificationInterval);
                  
                  // Play intro audio only once
                  if (!hasPlayedGreeting && isCurrentConnection) {
                    setTimeout(() => {
                      playIntroAudio();
                      setHasPlayedGreeting(true);
                    }, 500);
                  }
                } else if (verificationAttempts >= maxVerificationAttempts) {
                  console.warn(`⚠️ Connection verification timeout after ${maxVerificationAttempts * 100}ms`);
                  console.warn("WebSocket state:", getSocketState());
                  clearInterval(verificationInterval);
                  
                  // Still set as connected if WebSocket is in OPEN state
                  if (getSocketState() === 'OPEN') {
                    console.log("🟡 Proceeding with OPEN socket despite verification timeout");
                    setIsConnected(true);
                    setCurrentMessage(languageMode === 'english' ? 'Connected! Ready to learn.' : 'جڑ گئے! سیکھنے کے لیے تیار۔');
                  } else {
                    console.error("❌ Connection verification failed");
                    setCurrentMessage(languageMode === 'english' ? 'Connection verification failed' : 'کنکشن کی تصدیق ناکام');
                  }
                }
              }, 100); // Check every 100ms like mobile app
            }
          }
        } catch (error) {
          console.error('Failed to connect:', error);
          if (isCurrentConnection) {
            setIsConnected(false);
            setCurrentMessage(languageMode === 'english' ? 'Failed to connect. Please try again.' : 'کنکشن نہیں ہو سکا۔ دوبارہ کوشش کریں۔');
          }
        }
      };
      
      connectSocket();
      
      return () => {
        isCurrentConnection = false; // Prevent stale state updates
        closeLearnSocket();
        cleanupAudio();
      };
    }
  }, [step, languageMode, hasPlayedGreeting, handleWebSocketMessage, handleAudioData, handleConnectionClose, handleError, handleReconnect, cleanupAudio]);

  const playAudio = useCallback((audioUrl: string): void => {
    cleanupAudio();
    
    audioRef.current = new Audio(audioUrl);
    audioRef.current.play().catch((error: Error) => {
      console.error('Error playing audio:', error);
      setConversationState('waiting');
      setCurrentMessage(languageMode === 'english' ? 'Audio playback failed' : 'آڈیو چلانے میں خرابی');
    });
    
    audioRef.current.onended = () => {
      setConversationState('waiting');
      setCurrentMessage(languageMode === 'english' ? 'Press and hold to speak' : 'بولنے کے لیے دبائیں اور رکھیں');
      // Clean up the object URL to prevent memory leaks
      URL.revokeObjectURL(audioUrl);
    };

    audioRef.current.onerror = () => {
      setConversationState('waiting');
      setCurrentMessage(languageMode === 'english' ? 'Audio error occurred' : 'آڈیو میں خرابی ہوئی');
      URL.revokeObjectURL(audioUrl);
    };
  }, [cleanupAudio, languageMode]);

  const playIntroAudio = useCallback((): void => {
    setConversationState('playing_intro');
    setCurrentMessage(languageMode === 'english' ? 'Welcome to your AI tutor conversation!' : 'آپ کے AI استاد کی گفتگو میں خوش آمدید!');
    
    // Simulate intro - replace with actual intro audio if available
    setTimeout(() => {
      setConversationState('waiting');
      setCurrentMessage(languageMode === 'english' ? 'Press and hold to speak' : 'بولنے کے لیے دبائیں اور رکھیں');
    }, 3000);
  }, [languageMode]);

  const playWordByWord = useCallback((words: string[]): void => {
    if (!words || words.length === 0) return;
    
    setIsPlayingAudio(true);
    
    const playNextWord = (index: number) => {
      if (index >= words.length) {
        // Word-by-word playback complete
        setIsPlayingAudio(false);
        setTimeout(() => {
          sendCompletionEvent('word_by_word_complete');
        }, 1000);
        return;
      }
      
      setCurrentWordIndex(index);
      const word = words[index];
      
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = 0.6;
      utterance.lang = 'en-US';
      
      utterance.onend = () => {
        setTimeout(() => {
          playNextWord(index + 1);
        }, 800); // Pause between words
      };
      
      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        setIsPlayingAudio(false);
        setTimeout(() => {
          sendCompletionEvent('word_by_word_complete');
        }, 1000);
      };
      
      speechSynthesis.speak(utterance);
    };
    
    // Start playing words
    playNextWord(0);
  }, [sendCompletionEvent]);

  const uploadAudio = useCallback(async (blob: Blob): Promise<void> => {
    try {
      setConversationStateWithRecovery('processing');
      setCurrentMessage(languageMode === 'english' ? 'Processing your speech...' : 'آپ کی بات پروسیس کر رہے ہیں...');
      
      // Set a timeout to prevent getting stuck in processing state - reduced timeout for faster recovery
      const processingTimeout = setTimeout(() => {
        console.warn('⚠️ Processing timeout - no response received within 20 seconds');
        console.warn('🔄 Attempting to recover from stuck state...');
        
        // Clear any existing timeout
        if (typeof window !== 'undefined' && (window as any).currentProcessingTimeout) {
          clearTimeout((window as any).currentProcessingTimeout);
          (window as any).currentProcessingTimeout = null;
        }
        
                 // Reset to waiting state with retry message
         setConversationStateWithRecovery('waiting');
         setCurrentMessage(languageMode === 'english' ? 
           'No response received from server. Please try again or check connection.' : 
           'سرور سے کوئی جواب نہیں ملا۔ دوبارہ کوشش کریں یا کنکشن چیک کریں۔'
         );
         
         // Also reset any learning state that might be stuck
         resetLearningState();
      }, 20000); // 20 second timeout (reduced from 30)
      
      // Store timeout in a ref so we can clear it when we get a response
      if (typeof window !== 'undefined') {
        (window as any).currentProcessingTimeout = processingTimeout;
      }
      
      // Check connection state before processing
      const socketState = getSocketState();
      console.log('Current socket state before upload:', socketState);
      
      if (!isConnected) {
        console.error('❌ Cannot upload audio: WebSocket not connected');
        setConversationState('waiting');
        setCurrentMessage(languageMode === 'english' ? 'Connection lost. Please try again.' : 'کنکشن ٹوٹ گیا۔ دوبارہ کوشش کریں۔');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          const base64 = result.split(',')[1];
          if (base64) {
            const payload = {
              audio_base64: base64,
              filename: `recording-${Date.now()}.wav`,
              language_mode: languageMode,
            };
            
            console.log('🔼 ==============================================');
            console.log('🔼 Attempting to send audio message...');
            console.log('🔼 Audio payload size:', base64.length, 'characters');
            console.log('🔼 Language mode:', languageMode);
            console.log('🔼 WebSocket ready state:', getSocketState());
            console.log('🔼 Is connected:', isConnected);
            console.log('🔼 ==============================================')
            
            // Wait for WebSocket to be ready before sending
            waitForWebSocketReady(3000).then((ready) => {
              if (!ready) {
                console.error('WebSocket not ready after waiting');
                setConversationState('waiting');
                setCurrentMessage(languageMode === 'english' ? 'Connection not ready. Please wait a moment and try again.' : 'کنکشن تیار نہیں۔ تھوڑا انتظار کریں اور دوبارہ کوشش کریں۔');
                return;
              }
              
              const success = sendLearnMessage(JSON.stringify(payload));
              
              if (!success) {
                console.error('❌ ==========================================');
                console.error('❌ Failed to send audio message');
                console.error('❌ WebSocket state:', getSocketState());
                console.error('❌ Is connected:', isConnected);
                console.error('❌ ==========================================');
                setConversationState('waiting');
                setCurrentMessage(languageMode === 'english' ? 'Failed to send audio' : 'آڈیو بھیجنے میں ناکامی');
              } else {
                console.log('✅ ==========================================');
                console.log('✅ Audio message sent successfully');
                console.log('✅ Now waiting for server response...');
                console.log('✅ Conversation state set to: processing');
                console.log('✅ ==========================================');
                
                // No mock mode - audio will be sent to real server only
                
                // Add a timeout to reset state if no response is received
                setTimeout(() => {
                  if (conversationState === 'processing') {
                    console.warn('No response received within timeout, resetting state');
                    setConversationState('waiting');
                    setCurrentMessage(languageMode === 'english' ? 'No response received. Please try again.' : 'کوئی جواب نہیں ملا۔ دوبارہ کوشش کریں۔');
                  }
                }, 15000); // 15 second timeout
              }
            }).catch((error) => {
              console.error('Error waiting for WebSocket:', error);
              setConversationState('waiting');
              setCurrentMessage(languageMode === 'english' ? 'Connection error. Please try again.' : 'کنکشن میں خرابی۔ دوبارہ کوشش کریں۔');
            });
          }
        }
      };
      reader.onerror = () => {
        setConversationState('waiting');
        setCurrentMessage(languageMode === 'english' ? 'Error processing audio' : 'آڈیو پروسیسنگ میں خرابی');
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error uploading audio:', error);
      setConversationState('waiting');
      setCurrentMessage(languageMode === 'english' ? 'Error processing audio' : 'آڈیو پروسیسنگ میں خرابی');
    }
  }, [languageMode, isConnected, handleWebSocketMessage]);

  const handleMicPress = useCallback((): void => {
    console.log('🎤 ==========================================');
    console.log('🎤 Mic button pressed!');
    console.log('🎤 Current conversation state:', conversationState);
    console.log('🎤 Is connected:', isConnected);
    console.log('🎤 ==========================================');
    
    if (conversationState === 'processing' || conversationState === 'speaking') {
      console.log('🎤 Ignoring mic press - currently processing or speaking');
      return;
    }
    
    console.log('🎤 Starting audio recording...');
    setConversationState('listening');
    setCurrentMessage(languageMode === 'english' ? 'Hold the button and speak clearly...' : 'بٹن دبائیں اور صاف بولیں...');
    
    startRecording().catch((error: Error) => {
      console.error('❌ Error starting recording:', error);
      setConversationState('waiting');
      setCurrentMessage(languageMode === 'english' ? 'Microphone access denied' : 'مائیکروفون کی رسائی مسترد');
    });
  }, [conversationState, startRecording, languageMode, isConnected]);

  const handleMicRelease = useCallback((): void => {
    console.log('🛑 ==========================================');
    console.log('🛑 Mic button released!');
    console.log('🛑 Is currently recording:', isRecording);
    console.log('🛑 ==========================================');
    
    if (isRecording) {
      console.log('🛑 Stopping recording and starting processing...');
      setCurrentMessage(languageMode === 'english' ? 'Processing your recording...' : 'آپ کی ریکارڈنگ پروسیس کر رہے ہیں...');
      stopRecording();
    } else {
      console.log('🛑 Not currently recording, ignoring release');
    }
  }, [isRecording, stopRecording, languageMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      closeLearnSocket();
    };
  }, [cleanupAudio]);

  const getStatusColor = (): string => {
    switch (conversationState) {
      case 'listening': return 'bg-blue-500';
      case 'processing': return 'bg-orange-500';
      case 'speaking': return 'bg-green-500';
      case 'word_by_word': return 'bg-purple-500';
      case 'you_said': return 'bg-teal-500';
      case 'full_sentence': return 'bg-indigo-500';
      case 'feedback': return 'bg-emerald-500';
      case 'no_speech': return 'bg-red-500';
      default: return 'bg-green-500';
    }
  };

  // Display recording error if any
  const displayMessage: string = recordingError || currentMessage || (languageMode === 'english' ? 'Welcome to your AI tutor conversation!' : 'آپ کے AI استاد کی گفتگو میں خوش آمدید!');

  const WelcomeScreen = () => (
    <div className="text-center max-w-2xl mx-auto flex flex-col items-center">
      <div className="bg-primary/10 rounded-full p-4 mb-6">
        <Target className="w-12 h-12 text-primary" />
      </div>
      <h1 className="text-4xl font-bold mb-2">Welcome to Your Learning Journey</h1>
      <p className="text-muted-foreground text-lg mb-8">Let's begin your English speaking adventure</p>
      
      {/* Audio Play Button - Only show if automatic playback failed and audio hasn't been played */}
      {(showManualPlayButton && !hasPlayedWelcomeAudio) && (
        <div className="mb-6">
          <Button 
            variant="outline" 
            size="lg"
            onClick={handleManualPlayClick}
            disabled={isPlayingWelcomeAudio}
            className="flex items-center gap-2"
          >
            <Play className={`w-5 h-5 ${isPlayingWelcomeAudio ? 'animate-pulse' : ''}`} />
            {isPlayingWelcomeAudio ? 'Playing Welcome Message...' : 'Play Welcome Message'}
          </Button>
        </div>
      )}
      
      {/* Show a subtle indicator when audio is playing automatically */}
      {isPlayingWelcomeAudio && !showManualPlayButton && (
        <div className="mb-6">
          <div className="flex items-center gap-2 text-green-600">
            <Volume2 className="w-5 h-5 animate-pulse" />
            <span className="text-sm">Playing welcome message...</span>
          </div>
        </div>
      )}
      
      {/* Show success message when audio has been played */}
      {hasPlayedWelcomeAudio && !isPlayingWelcomeAudio && (
        <div className="mb-6">
          <div className="flex items-center gap-2 text-green-600">
            <Volume2 className="w-5 h-5" />
            <span className="text-sm">✓ Welcome message played successfully</span>
          </div>
        </div>
      )}
      
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-6 text-center">
          <p className="text-xl font-urdu mb-4">سیکھنے کے پلیٹ فارم میں خوش آمدید، آئیے انگریزی سیکھتے ہیں؟</p>
          <p className="text-muted-foreground">Welcome to the learning platform, shall we learn English?</p>
        </CardContent>
      </Card>
      <Button 
        size="lg" 
        className="mt-8 w-full max-w-md" 
        onClick={() => {
          localStorage.setItem('hasVisitedLearn', 'true');
          setStep('translate');
        }}
      >
        Continue to Learning
        <span className="ml-2">→</span>
      </Button>
    </div>
  );

  const TranslateScreen = () => (
    <div className="text-center max-w-2xl mx-auto flex flex-col items-center">
      <div className="bg-primary/10 rounded-full p-4 mb-6">
        <Mic className="w-16 h-16 text-primary" />
      </div>
      <h1 className="text-4xl font-bold mb-2">Speak to Translate</h1>
      <p className="text-muted-foreground text-lg mb-8">Transform your Urdu into English</p>
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant={languageMode === 'urdu' ? 'default' : 'outline'} 
          size="lg"
          onClick={() => setLanguageMode('urdu')}
        >
          <Globe className="mr-2 h-5 w-5"/>Urdu
        </Button>
        <Button 
          variant={languageMode === 'english' ? 'default' : 'outline'} 
          size="lg"
          onClick={() => setLanguageMode('english')}
        >
          English
        </Button>
      </div>
              <Card className="w-full max-w-md shadow-lg mb-8">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              {languageMode === 'english' ? 'Press the button and speak in Urdu to get started' : 'شروع کرنے کے لیے بٹن دبائیں اور اردو میں بولیں'}
            </p>
          </CardContent>
        </Card>
      <Button size="lg" className="w-full max-w-md" onClick={() => setStep('conversation')}>
        Start Real-time Conversation
        <span className="ml-2">→</span>
      </Button>
      <div className="flex gap-4 mt-8">
        <Card className="p-4 flex-1 text-center shadow-lg">Perfect for daily conversations</Card>
        <Card className="p-4 flex-1 text-center shadow-lg">Learn at your own pace</Card>
      </div>
    </div>
  );

  // Render different content based on conversation state
  const renderLearningContent = () => {
    switch (conversationState) {
      case 'you_said':
        return (
          <Card className="w-full max-w-lg shadow-lg mb-8">
            <CardContent className="p-6 text-center">
              <p className="text-lg mb-4">
                {currentMessage}
              </p>
            </CardContent>
          </Card>
        );
        
      case 'word_by_word':
        return (
          <Card className="w-full max-w-lg shadow-lg mb-8">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <h3 className="text-green-500 font-medium text-lg mb-4">
                  {languageMode === 'english' ? 'Repeat after me.' : 'میرے پیچھے دہرائیں۔'}
                </h3>
                
                {englishSentence && (
                  <div className="mb-3">
                    <p className="font-medium text-gray-700">English:</p>
                    <p className="text-lg font-medium">{englishSentence}</p>
                  </div>
                )}
                
                {urduSentence && (
                  <div className="mb-4">
                    <p className="font-medium text-gray-700">Urdu:</p>
                    <p className="text-lg font-urdu">{urduSentence}</p>
                  </div>
                )}
                
                {currentWords.length > 0 && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-green-600 mb-2">
                      Word {currentWordIndex + 1} of {currentWords.length}
                    </p>
                    <p className="text-2xl font-bold text-gray-800">
                      "{currentWords[currentWordIndex] || currentWords[0]}"
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
        
      case 'full_sentence':
        return (
          <Card className="w-full max-w-lg shadow-lg mb-8">
            <CardContent className="p-6 text-center">
              <p className="text-lg mb-4">
                {currentMessage}
              </p>
            </CardContent>
          </Card>
        );
        
      case 'feedback':
        return (
          <Card className="w-full max-w-lg shadow-lg mb-8">
            <CardContent className="p-6 text-center">
              <p className="text-lg text-green-600">
                {feedbackText || currentMessage}
              </p>
            </CardContent>
          </Card>
        );
        
      default:
        return (
          <Card className="w-full max-w-md shadow-lg mb-12">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                {(conversationState === 'speaking' || isPlayingAudio) && <Volume2 className="w-4 h-4 text-green-500 animate-pulse" />}
                <Badge variant="outline" className={`${getStatusColor()} text-white`}>
                  {conversationState.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {displayMessage}
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  const ConversationScreen = () => (
    <div className="text-center max-w-2xl mx-auto flex flex-col items-center h-full">
      <Card className="w-full max-w-3xl shadow-lg mb-8 flex items-center p-4">
        <div className="bg-primary/10 rounded-full p-3 mr-4">
          <Mic className="w-8 h-8 text-primary" />
        </div>
        <div className="flex-grow text-left">
          <h2 className="font-semibold text-lg">AI Tutor Conversation</h2>
          <p className="text-muted-foreground">Real-time learning experience</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={`h-3 w-3 p-0 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></Badge>
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </Card>


      {/* Error Banner */}
      {(recordingError || connectionError || !isConnected) && (
        <Card className="w-full max-w-md shadow-lg mb-4 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <X className="w-4 h-4" />
              <div className="flex-grow">
                <p className="text-sm font-medium">
                  {recordingError || connectionError || (languageMode === 'english' ? 'Server Connection Failed' : 'سرور کنکشن ناکام')}
                </p>
                {!isConnected && !recordingError && (
                  <div className="text-xs text-red-600 mt-2 space-y-1">
                    <p>{languageMode === 'english' ? '• WebSocket server is not responding' : '• ویب ساکٹ سرور جواب نہیں دے رہا'}</p>
                    <p>{languageMode === 'english' ? '• Server may be down or endpoint missing' : '• سرور بند ہو سکتا ہے یا اینڈ پوائنٹ غائب'}</p>
                    <p>{languageMode === 'english' ? '• Check network connection' : '• نیٹ ورک کنکشن چیک کریں'}</p>
                  </div>
                )}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3 text-red-700 border-red-300 hover:bg-red-100"
              onClick={() => window.location.reload()}
            >
              {languageMode === 'english' ? 'Retry Connection' : 'دوبارہ کنکشن کی کوشش کریں'}
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Enhanced Debug Information */}
      {(window.location.hostname === 'localhost' || process.env.NODE_ENV === 'development') && (
        <Card className="w-full max-w-md shadow-lg mb-4 border-gray-200 bg-gray-50">
          <CardContent className="p-4">
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>🔌 Connection State:</strong> <span className={isConnected ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{isConnected ? 'Connected' : 'Disconnected'}</span></p>
              <p><strong>🎯 Conversation State:</strong> <span className="font-mono font-bold text-blue-600">{conversationState}</span></p>
              <p><strong>🎤 Recording:</strong> <span className={isRecording ? 'text-red-600 font-bold' : 'text-gray-600'}>{isRecording ? 'Yes' : 'No'}</span></p>
              <p><strong>🌐 WebSocket State:</strong> <span className="font-mono">{getSocketState()}</span></p>
              <p><strong>🗣️ Language:</strong> {languageMode}</p>
              <p><strong>📝 Current Message:</strong> <span className="text-xs italic">{currentMessage}</span></p>
              {connectionError && (
                <p><strong>❌ Connection Error:</strong> <span className="text-red-600 text-xs">{connectionError}</span></p>
              )}
            </div>
            
            {/* Test UI Flow Buttons */}
            <div className="mt-3 pt-3 border-t border-gray-300">
              <p className="text-xs font-semibold text-gray-700 mb-2">🧪 Test UI Flow:</p>
              <div className="flex gap-1 flex-wrap">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs px-2 py-1 h-6"
                  onClick={() => {
                    console.log('🧪 Testing You Said view');
                    setConversationStateWithRecovery('you_said');
                    setUserSaidText('میں اسکول جا رہا ہوں');
                    setEnglishSentence('I am going to school');
                    setUrduSentence('میں اسکول جا رہا ہوں');
                    setCurrentMessage('You said: میں اسکول جا رہا ہوں. Now repeat after me.');
                  }}
                >
                  Test You Said
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs px-2 py-1 h-6"
                  onClick={() => {
                    console.log('🧪 Testing Word by Word view');
                    setConversationStateWithRecovery('word_by_word');
                    setCurrentWords(['I', 'am', 'going', 'to', 'school']);
                    setCurrentWordIndex(0);
                    setEnglishSentence('I am going to school');
                    setUrduSentence('میں اسکول جا رہا ہوں');
                    setCurrentMessage('Repeat after me.');
                  }}
                >
                  Test Word by Word
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs px-2 py-1 h-6"
                  onClick={() => {
                    console.log('🧪 Testing Full Sentence view');
                    setConversationStateWithRecovery('full_sentence');
                    setFullSentence('I am going to school');
                    setEnglishSentence('I am going to school');
                    setUrduSentence('میں اسکول جا رہا ہوں');
                    setCurrentMessage('Now repeat the full sentence: I am going to school.');
                  }}
                >
                  Test Full Sentence
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs px-2 py-1 h-6"
                  onClick={() => {
                    console.log('🧪 Testing Feedback view');
                    setConversationStateWithRecovery('feedback');
                    setFeedbackText('Excellent pronunciation! Great job!');
                    setCurrentMessage('Excellent pronunciation! Great job!');
                  }}
                >
                  Test Feedback
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs px-2 py-1 h-6"
                  onClick={() => {
                    console.log('🧪 Resetting to waiting state');
                    setConversationStateWithRecovery('waiting');
                    setCurrentMessage('Press and hold to speak');
                    resetLearningState();
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Dynamic Learning Content */}
      {renderLearningContent()}
      
      {/* Visual Indicator */}
      <div className="relative mb-12">
        {(conversationState === 'processing' || conversationState === 'listening') && (
          <div className={`w-64 h-64 border-4 border-dashed rounded-full flex items-center justify-center transition-all duration-300 ${
            conversationState === 'listening' ? 'border-blue-500 bg-blue-50' :
            conversationState === 'processing' ? 'border-orange-500 bg-orange-50' :
            'border-gray-300'
          }`}>
            <div className="text-center">
              <Mic className={`w-16 h-16 mx-auto mb-2 ${
                conversationState === 'listening' ? 'text-blue-500' :
                conversationState === 'processing' ? 'text-orange-500' :
                'text-gray-400'
              }`} />
              <p className="text-sm text-muted-foreground">
                {conversationState === 'listening' ? (languageMode === 'english' ? 'Listening...' : 'سن رہے ہیں...') :
                 conversationState === 'processing' ? (languageMode === 'english' ? 'Processing...' : 'پروسیسنگ...') :
                 (languageMode === 'english' ? 'Ready to listen' : 'سننے کے لیے تیار')}
              </p>
            </div>
          </div>
        )}
        
        {(conversationState === 'speaking' || conversationState === 'word_by_word' || conversationState === 'feedback') && isPlayingAudio && (
          <div className="w-64 h-64 border-4 border-dashed rounded-full flex items-center justify-center border-green-500 bg-green-50 transition-all duration-300">
            <div className="text-center">
              <div className="relative">
                <div className="w-16 h-16 mx-auto mb-2 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                <Volume2 className="w-8 h-8 text-green-500 absolute inset-0 m-auto" />
              </div>
              <p className="text-sm text-green-600 font-medium">
                {conversationState === 'word_by_word' ? (languageMode === 'english' ? 'Playing words...' : 'الفاظ چل رہے ہیں...') :
                 (languageMode === 'english' ? 'AI Speaking...' : 'AI بول رہا ہے...')}
              </p>
            </div>
          </div>
        )}
        
        {conversationState === 'full_sentence' && !isPlayingAudio && (
          <div className="w-64 h-64 border-4 border-dashed rounded-full flex items-center justify-center border-purple-500 bg-purple-50 transition-all duration-300">
            <div className="text-center">
              <Mic className="w-16 h-16 mx-auto mb-2 text-purple-500" />
              <p className="text-sm text-purple-600 font-medium">
                {languageMode === 'english' ? 'Your turn to speak' : 'آپ کی باری ہے'}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Control Buttons */}
      <div className="flex items-center gap-8">
        <Button 
          variant="outline" 
          size="icon" 
          className="w-16 h-16 rounded-full" 
          onClick={() => setStep('translate')}
          title={languageMode === 'english' ? 'Go back' : 'واپس جائیں'}
        >
          <X className="w-8 h-8" />
        </Button>
        
        {/* Main Action Button */}
        {conversationState === 'full_sentence' && !isRecording ? (
          <Button 
            size="icon" 
            className="w-24 h-24 rounded-full transition-all duration-200 bg-green-500 hover:bg-green-600"
            onMouseDown={handleMicPress}
            onMouseUp={handleMicRelease}
            onMouseLeave={handleMicRelease}
            disabled={!isConnected || !!recordingError}
            title={languageMode === 'english' ? 'Press and hold to speak the full sentence' : 'پورا جملہ بولنے کے لیے دبائیں اور رکھیں'}
          >
            <Mic className="w-12 h-12" />
          </Button>
        ) : conversationState === 'waiting' ? (
          <Button 
            size="icon" 
            className="w-24 h-24 rounded-full transition-all duration-200 bg-green-500 hover:bg-green-600"
            onMouseDown={handleMicPress}
            onMouseUp={handleMicRelease}
            onMouseLeave={handleMicRelease}
            disabled={!isConnected || !!recordingError}
            title={languageMode === 'english' ? 'Press and hold to speak' : 'بولنے کے لیے دبائیں اور رکھیں'}
          >
            <Mic className="w-12 h-12" />
          </Button>
        ) : isRecording ? (
          <Button 
            size="icon" 
            className="w-24 h-24 rounded-full transition-all duration-200 bg-red-500 hover:bg-red-600 scale-110"
            onMouseUp={handleMicRelease}
            onMouseLeave={handleMicRelease}
            title={languageMode === 'english' ? 'Release to stop recording' : 'ریکارڈنگ بند کرنے کے لیے چھوڑیں'}
          >
            <Square className="w-12 h-12" />
          </Button>
        ) : null}
      </div>
      
      {/* Help Text */}
      <p className="text-sm text-muted-foreground mt-4 text-center max-w-md">
        {!isConnected ? (languageMode === 'english' ? 'Please wait for connection' : 'کنکشن کا انتظار کریں') :
         recordingError ? (languageMode === 'english' ? 'Please refresh the page' : 'برائے کرم صفحہ تازہ کریں') :
         conversationState === 'listening' ? (languageMode === 'english' ? 'Keep holding and speak now...' : 'بٹن دبائے رکھیں اور اب بولیں...') :
         conversationState === 'word_by_word' ? (languageMode === 'english' ? 'Listen carefully to each word' : 'ہر لفظ کو غور سے سنیں') :
         conversationState === 'full_sentence' ? (languageMode === 'english' ? 'Now repeat the complete sentence' : 'اب مکمل جملہ دہرائیں') :
         conversationState === 'feedback' ? (languageMode === 'english' ? 'Great work! Get ready for the next sentence' : 'بہترین کام! اگلے جملے کے لیے تیار ہوں') :
         (languageMode === 'english' ? 'Press and hold the green button to speak' : 'بولنے کے لیے سبز بٹن دبائیں اور رکھیں')}
      </p>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return <WelcomeScreen />;
      case 'translate':
        return <TranslateScreen />;
      case 'conversation':
        return <ConversationScreen />;
      default:
        return <WelcomeScreen />;
    }
  };

  return (
    <Card className="h-full w-full max-w-4xl mx-auto">
      <CardContent className="p-8 h-full flex items-center justify-center">
        {renderStep()}
      </CardContent>
    </Card>
  );
};