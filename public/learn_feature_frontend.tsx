/**
 * Conversation Screen - AI Tutor Real-time Learning
 * 
 * Features:
 * - Real-time voice conversation with AI tutor
 * - Automatic speech detection and processing
 * - Word-by-word pronunciation practice
 * - Immediate exit functionality via wrong button (X)
 * - Comprehensive cleanup on screen focus/blur and manual exit
 * 
 * Exit Behavior:
 * - Wrong button (X) immediately stops all processes and navigates to learn index
 * - Works in all states: playing intro, AI speaking, processing, no speech detected, etc.
 * - No confirmation dialog - immediate action for better UX
 */

import { Ionicons } from '@expo/vector-icons';
import { Buffer } from 'buffer';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Speech from 'expo-speech';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Dimensions,
    Platform,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { closeLearnSocket, connectLearnSocket, isSocketConnected, sendLearnMessage } from '../../utils/websocket';
import { useLanguageMode } from '../../context/LanguageModeContext';
import CHATGPT_TIMING_CONFIG, { getSilenceDuration, logTimingInfo } from '../../../utils/chatgptTimingConfig';


const { width, height } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isAI: boolean;
  timestamp: Date;
  audioUri?: string;
}

interface ConversationState {
  messages: Message[];
  currentStep: 'waiting' | 'listening' | 'processing' | 'speaking' | 'error' | 'playing_intro' | 'playing_await_next' | 'playing_retry' | 'playing_feedback' | 'word_by_word' | 'playing_you_said' | 'english_input_edge_case';
  isConnected: boolean;
  inputText: string;
  currentAudioUri?: string;
  lastStopWasSilence: boolean;
  isIntroAudioPlaying: boolean;
  isAwaitNextPlaying: boolean;
  isRetryPlaying: boolean;
  isProcessingAudio: boolean;
  isListening: boolean; // New state for tracking listening animation
  isVoiceDetected: boolean; // New state for tracking voice detected animation
  isAISpeaking: boolean; // New state for tracking AI speaking animation
  isPlayingIntro: boolean; // New state for tracking intro playing animation
  isContinuingConversation: boolean; // New state for tracking continuing conversation animation
  isPlayingRetry: boolean; // New state for tracking retry playing animation
  isPlayingFeedback: boolean; // New state for tracking feedback playing animation
  currentMessageText: string; // New state for tracking current message to display above animation
  isNoSpeechDetected: boolean; // New state for tracking no speech detected animation
  // New states for word-by-word speaking
  isWordByWordSpeaking: boolean; // New state for tracking word-by-word speaking animation
  currentSentence: {
    english: string;
    urdu: string;
    words: string[];
  } | null;
  currentWordIndex: number;
  currentWordChunk: string;
  isDisplayingSentence: boolean;
  // New state for "you said" audio
  isPlayingYouSaid: boolean; // New state for tracking "you said" audio playing
  // New state to prevent auto-recording after "you said" audio
  isWaitingForRepeatPrompt: boolean; // New state to prevent auto-recording after "you said" audio
  // New state for full sentence text to display during listening
  fullSentenceText: string; // New state for full sentence text to display during listening
  // New state for loading animation after word-by-word completion
  isLoadingAfterWordByWord: boolean; // New state for loading animation after word-by-word
  // New state for English input edge case
  isEnglishInputEdgeCase: boolean; // New state for tracking English input edge case
  isFirstRecordingPreparation: boolean; // New state for first recording preparation
}

// A tiny, silent audio file as a base64 string to prime the audio session on iOS
const SILENT_AUDIO_CLIP = 'data:audio/mp4;base64,AAAAHGZ0eXBNNEEgAAACAE00QSAgAAAAH212aGQAAAAA4v//AAAAAAAAAAAAAAABAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABDVycmIAAAAB3BtZGF0';

export default function ConversationScreen() {
  const { autoStart } = useLocalSearchParams();
  const router = useRouter();
  const { mode } = useLanguageMode();
  // Define t() immediately after mode is available
  const t = (en: string, ur: string) => (mode === 'english' ? en : ur);

  // Full screen mode - hide status bar and tab bar
  useEffect(() => {
    // Hide status bar for full screen experience
    StatusBar.setHidden(true);
    
    // Return function to restore status bar when component unmounts
    return () => {
      StatusBar.setHidden(false);
    };
  }, []);
  const [state, setState] = useState<ConversationState>({
    messages: [],
    currentStep: 'waiting',
    isConnected: false,
    inputText: '',
    lastStopWasSilence: false,
    isIntroAudioPlaying: false,
    isAwaitNextPlaying: false,
    isRetryPlaying: false,
    isProcessingAudio: false,
    isListening: false,
    isVoiceDetected: false,
    isAISpeaking: false,
    isPlayingIntro: false,
    isContinuingConversation: false,
    isPlayingRetry: false,
    isPlayingFeedback: false,
    currentMessageText: '',
    isNoSpeechDetected: false,
    isWordByWordSpeaking: false,
    currentSentence: null,
    currentWordIndex: 0,
    currentWordChunk: '', 
    isDisplayingSentence: false,
    isPlayingYouSaid: false,
    isWaitingForRepeatPrompt: false,
    fullSentenceText: '',
    isLoadingAfterWordByWord: false,
    isEnglishInputEdgeCase: false,
    isFirstRecordingPreparation: false, // New state for first recording preparation
  });

  const previousStepRef = useRef<ConversationState["currentStep"]>('waiting');
  const currentStepRef = useRef<ConversationState["currentStep"]>('waiting');
  useEffect(() => {
    currentStepRef.current = state.currentStep;
    console.log('Current step:', state.currentStep);
  }, [state.currentStep]);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const introSoundRef = useRef<Audio.Sound | null>(null);
  const retrySoundRef = useRef<Audio.Sound | null>(null);
  const feedbackSoundRef = useRef<Audio.Sound | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isTalking, setIsTalking] = useState(false); // True voice activity detection
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechStartTimeRef = useRef<number | null>(null);
  const micAnim = useRef(new Animated.Value(1)).current;
  const isScreenFocusedRef = useRef<boolean>(false); // Track if screen is focused
  const isWordByWordActiveRef = useRef<boolean>(false); // Track if word-by-word is active
  const isStoppingRef = useRef(false);
  const isFirstRecordingRef = useRef(true); // Track if this is the first recording session

  // --- UI Animations for Listening State ---
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Voice Activity Detection threshold (in dB) - from ChatGPT timing config
  const VAD_THRESHOLD = CHATGPT_TIMING_CONFIG.VAD_THRESHOLD;
  
  // Use ChatGPT-optimized timing constants
  const SILENCE_DURATION = CHATGPT_TIMING_CONFIG.POST_SPEECH_SILENCE_DURATION;
  const MIN_SPEECH_DURATION = CHATGPT_TIMING_CONFIG.MIN_SPEECH_DURATION;
  const FIRST_RECORDING_DELAY = CHATGPT_TIMING_CONFIG.FIRST_RECORDING_DELAY;

  // --- iOS Silence Detection Calibration ---
  // This will store the highest metering value detected during the first second of recording
  const IOS_VAD_OFFSET_DB = 20; // dB below max for threshold (more aggressive)
  const IOS_VAD_MIN_THRESHOLD = -90; // Allow lower threshold
  const iOSMeteringCalibration = useRef({
    calibrated: false,
    maxMetering: -160,
    calibrationStart: 0,
    calibrationDuration: 1000, // ms
  });

  // ... existing code ...
  const [vadThreshold, setVadThreshold] = useState(Platform.OS === 'ios' ? -70 : -45); // Default, will auto-calibrate on iOS
  // ... existing code ...

  // Handle screen focus and blur events
  useFocusEffect(
    useCallback(() => {
      console.log('Conversation screen focused - initializing...');
      isScreenFocusedRef.current = true;
      
      // Initialize when screen comes into focus
      initializeAudio();
      connectToWebSocket();
      
      // Auto-start with intro audio if param is set
      if (autoStart === 'true') {
        setTimeout(() => {
          if (isScreenFocusedRef.current) {
            playIntroAudio();
          }
        }, 500);
      }

      // Cleanup function when screen loses focus
      return () => {
        console.log('Conversation screen losing focus - cleaning up...');
        isScreenFocusedRef.current = false;
        cleanup();
      };
    }, [autoStart])
  );

  // Additional cleanup on component unmount (fallback)
  useEffect(() => {
    return () => {
      console.log('Conversation component unmounting - final cleanup...');
      cleanup();
    };
  }, []);

  

  useEffect(() => {
    // Only auto-listen if we just finished speaking (AI audio done) and not during intro, await_next, or retry
    if (
      state.currentStep === 'waiting' &&
      state.isConnected &&
      autoStart === 'true' &&
      !state.lastStopWasSilence &&
      !state.isIntroAudioPlaying &&
      !state.isAwaitNextPlaying &&
      !state.isRetryPlaying &&
      !state.isPlayingFeedback &&
      !state.isWordByWordSpeaking &&
      !state.isWaitingForRepeatPrompt && // Prevent auto-recording when waiting for repeat prompt
      previousStepRef.current === 'speaking' &&
      isScreenFocusedRef.current // Only auto-listen if screen is focused
    ) {
      if (state.messages.length > 0 && state.messages[state.messages.length - 1].isAI) {
        setTimeout(() => {
          if (isScreenFocusedRef.current) { // Double-check focus before starting
            startRecording();
          }
        }, CHATGPT_TIMING_CONFIG.POST_AI_SPEECH_DELAY); // Use ChatGPT's natural pause timing
      }
    }
    // Update previousStepRef after every state change
    previousStepRef.current = state.currentStep;
  }, [state.currentStep, state.messages, state.isConnected, autoStart, state.lastStopWasSilence, state.isIntroAudioPlaying, state.isAwaitNextPlaying, state.isRetryPlaying, state.isPlayingFeedback, state.isWordByWordSpeaking, state.isWaitingForRepeatPrompt]);

  const initializeAudio = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      Alert.alert('Error', 'Failed to initialize audio permissions');
    }
  };

  // Function to clear audio buffers and warm up audio session
  const clearAudioBuffersAndWarmUp = async () => {
    console.log('🔧 Clearing audio buffers and warming up audio session...');
    
    try {
      // Stop any existing recording
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) {
          console.log('No active recording to stop');
        }
        recordingRef.current = null;
      }

      // Set audio mode to clear any cached state
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      });

      // Create a brief silent recording to clear buffers
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        () => {}, // No status callback for buffer clearing
        100 // Very short duration
      );
      
      // Stop immediately to clear buffers
      await recording.stopAndUnloadAsync();
      
      console.log('✅ Audio buffers cleared and session warmed up');
    } catch (error) {
      console.warn('Warning: Could not clear audio buffers:', error);
    }
  };

  const playIntroAudio = async () => {
    // Handle first recording session - clear buffers and warm up before playing intro
    if (isFirstRecordingRef.current) {
      console.log('🎤 First recording session detected - clearing buffers and warming up audio session...');
      
      setState(prev => ({ 
        ...prev, 
        currentStep: 'waiting',
        isFirstRecordingPreparation: true,
        currentMessageText: t('Preparing audio system...', 'آڈیو سسٹم تیار کر رہے ہیں...'),
      }));
      
      // Clear audio buffers and warm up session
      await clearAudioBuffersAndWarmUp();
      
      // Add a brief delay to allow the UI to update
      await new Promise(resolve => setTimeout(resolve, 250));

      // Double-check screen focus after delay
      if (!isScreenFocusedRef.current) {
        console.log('Screen lost focus during first recording preparation');
        return;
      }
      
      console.log('✅ First recording session prepared');
    }

    // Check if screen is focused before playing audio
    if (!isScreenFocusedRef.current) {
      console.log('Screen not focused, skipping intro audio');
      return;
    }

    try {
      console.log('Playing intro audio...');
      setState(prev => ({ 
        ...prev, 
        currentStep: 'playing_intro',
        isIntroAudioPlaying: true,
        isPlayingIntro: true,
        isFirstRecordingPreparation: false, // Clear preparation state
        currentMessageText: t('Welcome to your AI tutor conversation!', 'اپنے AI ٹیوٹر گفتگو میں خوش آمدید!'),
      }));

      // Unload any previous intro sound
      if (introSoundRef.current) {
        await introSoundRef.current.unloadAsync();
      }

      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      // Create sound from the Google Drive URL
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://dil-lms.s3.us-east-1.amazonaws.com/welcome_message_final_british.mp3' },
        { shouldPlay: true }
      );
      introSoundRef.current = sound;

      // Set up playback status update to handle completion
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log('Intro audio finished, starting conversation...');
          setState(prev => ({ 
            ...prev, 
            currentStep: 'listening',
            isIntroAudioPlaying: false,
            isPlayingIntro: false,
            isListening: true,
            currentMessageText: '', // Clear the message when intro ends
          }));
          
          // Start the conversation flow immediately after intro audio
          startRecording();
        }
      });

      await sound.playAsync();
    } catch (error) {
      console.error('Failed to play intro audio:', error);
      // If intro audio fails, start conversation anyway
      setState(prev => ({ 
        ...prev, 
        currentStep: 'listening',
        isIntroAudioPlaying: false,
        isPlayingIntro: false,
        isListening: true,
        currentMessageText: '', // Clear the message when intro ends
      }));
      startRecording();
    }
  };



  const playRetryAudio = async () => {
    // Check if screen is focused before playing audio
    if (!isScreenFocusedRef.current) {
      console.log('Screen not focused, skipping retry audio');
      return;
    }

    try {
      console.log('Playing retry audio...');
      setState(prev => ({ 
        ...prev, 
        currentStep: 'playing_retry',
        isRetryPlaying: true,
        isPlayingRetry: true,
        currentMessageText: t('Try again. Please repeat the sentence.', 'دوبارہ کوشش کریں۔ براہ کرم دہرائیں۔'),
      }));

      // Unload any previous retry sound
      if (retrySoundRef.current) {
        await retrySoundRef.current.unloadAsync();
      }

      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      // Create sound from the retry audio URL
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://dil-lms.s3.us-east-1.amazonaws.com/retry_sentence.mp3' }, // Replace with your actual retry audio URL for "Try again. Please say: 'hello how are you'"
        { shouldPlay: true }
      );
      retrySoundRef.current = sound;

      // Set up playback status update to handle completion
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log('Retry audio finished, continuing conversation...');
          setState(prev => ({ 
            ...prev, 
            currentStep: 'waiting',
            isRetryPlaying: false,
            isPlayingRetry: false,
            currentMessageText: '', // Clear the message when retry ends
          }));
          
          // Continue the conversation by starting to listen again
          setTimeout(() => {
            startRecording();
          }, 1000);
        }
      });

      await sound.playAsync();
    } catch (error) {
      console.error('Failed to play retry audio:', error);
      // If retry audio fails, continue conversation anyway
      setState(prev => ({ 
        ...prev, 
        currentStep: 'waiting',
        isRetryPlaying: false,
        isPlayingRetry: false,
        currentMessageText: '', // Clear the message when retry ends
      }));
      setTimeout(() => {
        startRecording();
      }, 1000);
    }
  };

  const playFeedbackAudio = async () => {
    // Check if screen is focused before playing audio
    if (!isScreenFocusedRef.current) {
      console.log('Screen not focused, skipping feedback audio');
      return;
    }

    try {
      console.log('Playing feedback audio...');
      // Set up feedback state but keep processing animation until audio arrives
      setState(prev => ({ 
        ...prev, 
        currentStep: 'playing_feedback',
        isPlayingFeedback: true,
        isProcessingAudio: true, // Keep processing animation until audio arrives
        // Don't clear currentMessageText - keep the feedback message
      }));

      // Unload any previous feedback sound
      if (feedbackSoundRef.current) {
        await feedbackSoundRef.current.unloadAsync();
      }

      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      // The feedback audio will be received via handleAudioData
      // This function just sets up the state for when audio arrives
    } catch (error) {
      console.error('Failed to set up feedback audio:', error);
      // If feedback audio setup fails, continue conversation anyway
      setState(prev => ({ 
        ...prev, 
        currentStep: 'waiting',
        isPlayingFeedback: false,
        isProcessingAudio: false, // Stop processing animation on error
        currentMessageText: '', // Clear the message when feedback ends
      }));
      setTimeout(() => {
        startRecording();
      }, 1000);
    }
  };



  // Function to play word-by-word audio
  const playWordByWord = async (words: string[]) => {
    // Check if screen is focused before starting word-by-word
    if (!isScreenFocusedRef.current) {
      console.log('Screen not focused, skipping word-by-word speaking');
      return;
    }

    try {
      console.log('🎤 Starting word-by-word speaking...');
      isWordByWordActiveRef.current = true;
      setState(prev => ({
        ...prev,
        currentStep: 'word_by_word',
        isWordByWordSpeaking: true,
        isProcessingAudio: false,
        currentWordIndex: 0,
      }));

      // --- NEW, MORE RELIABLE iOS Volume Fix ---
      // Explicitly set the audio mode to playback to ensure iOS uses the correct volume channel.
      if (Platform.OS === 'ios') {
        try {
          console.log('iOS: Setting audio mode for high-quality speech playback.');
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false, // We are only playing audio
            playsInSilentModeIOS: true, // We want to hear speech even if the ringer is off
            interruptionModeIOS: InterruptionModeIOS.DoNotMix,
            shouldDuckAndroid: true, // (Doesn't apply to iOS but good practice)
          });
        } catch (e) {
          console.error("iOS: Failed to set audio mode for speech playback:", e);
        }
      }
      // --- End of Fix ---

      for (let i = 0; i < words.length; i += 2) {
        if (!isScreenFocusedRef.current) {
          console.log('🎤 Word-by-word speaking interrupted - screen not focused');
          return;
        }
      
        const wordChunk =
          i + 1 < words.length
            ? `${words[i]} ${words[i + 1]}`
            : words[i]; // last word if odd count
      
        console.log(`🗣️ Speaking words ${i + 1}-${Math.min(i + 2, words.length)}: "${wordChunk}"`);
      
        setState(prev => ({
          ...prev,
          currentWordIndex: i,
          currentWordChunk: wordChunk,
          currentMessageText: t(`Speaking: "${wordChunk}"`, `"${wordChunk}" بول رہے ہیں`),
        }));
      
        Speech.speak(wordChunk, {
          language: 'en-US',
          rate: 0.5,
          pitch: 1.0,
        });
      
        // Wait for the chunk to finish
        for (let j = 0; j < 10; j++) { // 10 * 100ms = 1000ms
          await new Promise(resolve => setTimeout(resolve, 100));
          if (!isScreenFocusedRef.current) {
            console.log('🎤 Word-by-word speaking interrupted during word playback');
            return;
          }
        }
      
        // Short pause between chunks (except after last chunk)
        if (i + 2 < words.length) {
          await new Promise(resolve => setTimeout(resolve, 300)); // shorter pause
        }
      }
      

              // Only complete if screen is still focused
        if (isScreenFocusedRef.current) {
          console.log('✅ Word-by-word speaking completed');
          isWordByWordActiveRef.current = false;
          setState(prev => ({
            ...prev,
            isWordByWordSpeaking: false,
            currentMessageText: '',
            currentStep: 'waiting', // Set to waiting state
            isListening: false, // Don't show listening animation yet
            isLoadingAfterWordByWord: false, // Don't show loading animation - wait for full sentence audio step
          }));

        // Send completion signal to backend immediately for faster response
        setTimeout(() => {
          if (isScreenFocusedRef.current) {
            console.log('🔄 Sending word-by-word completion signal to backend...');
            sendLearnMessage(JSON.stringify({
              type: 'word_by_word_complete',
              sentence: state.currentSentence?.english || '',
              language_mode: mode,
            }));
          }
        }, 200); // Reduced from 2 seconds to 200ms for faster response
      }
    } catch (error) {
      console.error('Failed to play word-by-word:', error);
      isWordByWordActiveRef.current = false;
      setState(prev => ({
        ...prev,
        isWordByWordSpeaking: false,
        currentMessageText: '',
      }));
    }
  };

  const connectToWebSocket = () => {
    connectLearnSocket(
      (data: any) => handleWebSocketMessage(data),
      (audioBuffer: ArrayBuffer) => handleAudioData(audioBuffer),
      () => handleWebSocketClose()
    );
  
    // Wait for actual connection - reduced from 500ms to 100ms for faster response
    const interval = setInterval(() => {
      if (isSocketConnected()) {
        console.log("✅ Socket verified connected");
        setState(prev => ({ ...prev, isConnected: true }));
        clearInterval(interval);
      }
    }, 100);
  };

  const handleWebSocketMessage = (data: any) => {
    // Check if screen is focused before processing WebSocket messages
    if (!isScreenFocusedRef.current) {
      console.log('Screen not focused, ignoring WebSocket message');
      return;
    }

    const startTime = Date.now();
    console.log('Received WebSocket message:', data);
  
    const newMessage: Message = {
      id: Date.now().toString(),
      text: data.response || 'AI response',
      isAI: true,
      timestamp: new Date(),
    };
  
    // Update state with new message and prepare for next step
    // Keep processing animation active until audio data arrives for steps that need it
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      isListening: false,
      isVoiceDetected: false,
      isPlayingIntro: false,
      isContinuingConversation: false,
      isPlayingRetry: false,
      isPlayingFeedback: false,
      currentMessageText: data.response || 'AI response',
      isNoSpeechDetected: false,
      isAISpeaking: false, // Keep AI speaking false until audio actually starts
      // Keep isProcessingAudio true for steps that will have audio
      // isAISpeaking will be set to true in handleAudioData when audio starts
    }));
  
    // 🟡 Step 1: Handle `no_speech` step
    if (data.step === 'no_speech') {
      console.log('🟡 No speech detected from backend');
      setState(prev => ({
        ...prev,
        currentStep: 'waiting',
        isProcessingAudio: false, // Stop processing animation for no_speech
        isAISpeaking: false, // Ensure AI speaking is false for no_speech
        lastStopWasSilence: true, // ✅ Triggers "No speech detected" UI
        isNoSpeechDetected: true, // Show no speech detected animation
      }));
      return; // 🛑 Don't proceed further
    }
  
    // 🟢 Step 2: Default message update (for regular AI responses that will have audio)
    setState(prev => ({
      ...prev,
      currentStep: data.step === 'retry' ? 'waiting' : 'waiting',
      lastStopWasSilence: false, // ✅ Reset silence flag for other steps
      // Keep isProcessingAudio true for regular AI responses that will have audio
    }));
  
    // 🔁 Step 3: Handle retry playback
    if (data.step === 'retry') {
      console.log('🔁 Received retry step, playing retry audio...');
      setState(prev => ({
        ...prev,
        isProcessingAudio: false, // Stop processing animation for retry
        isAISpeaking: false, // Ensure AI speaking is false during retry setup
      }));
      setTimeout(() => {
        playRetryAudio();
      }, 200);
    }
  
    // 🔁 Step 4: Handle await_next playback
    if (data.step === 'await_next') {
      console.log('✅ Received await_next step, waiting for audio data...');
      setState(prev => ({
        ...prev,
        currentStep: 'playing_await_next',
        isProcessingAudio: false, // Stop processing animation for await_next
        isAwaitNextPlaying: true,
        isContinuingConversation: true,
        currentMessageText: data.response || 'Feedback text', // Use the actual feedback text from backend
      }));
    }

    // 🔁 Step 5: Handle feedback_step playback
    if (data.step === 'feedback_step') {
      console.log('📝 Received feedback_step, playing feedback audio...');
      // Keep processing animation active - it will be managed in playFeedbackAudio and handleAudioData

      setTimeout(() => {
        playFeedbackAudio();
      }, 200);
    }

    // 🎤 Step 6: Handle you_said_audio step
    if (data.step === 'you_said_audio') {
      console.log('🎤 Received you_said_audio step, waiting for audio data...');
      setState(prev => ({
        ...prev,
        currentStep: 'playing_you_said',
        isProcessingAudio: false, // Stop processing animation
        isPlayingYouSaid: true,
        currentMessageText: data.response || 'You said...',
      }));
    }

    // 🎤 Step 7: Handle repeat_prompt step (word-by-word speaking)
    if (data.step === 'repeat_prompt') {
      console.log('🎤 Received repeat_prompt step, starting word-by-word speaking...');
      
      // Store the sentence information
      const sentenceInfo = {
        english: data.english_sentence || '',
        urdu: data.urdu_sentence || '',
        words: data.words || [],
      };

      setState(prev => ({
        ...prev,
        currentSentence: sentenceInfo,
        isDisplayingSentence: true,
        isProcessingAudio: false, // Stop processing animation
        isWaitingForRepeatPrompt: false, // Clear the waiting flag
        // currentMessageText: 'Repeat after me:',
        currentMessageText: t('Repeat after me.', 'میرے بعد دہرائیں۔'),
      }));

      // Start word-by-word speaking immediately for faster response
      setTimeout(() => {
        playWordByWord(sentenceInfo.words);
      }, 300);
    }


    if (data.step === 'word_by_word') {
      console.log('🎤 Received word_by_word step (re-practice)...');
    
      const sentenceInfo = {
        english: data.english_sentence || '',
        urdu: data.urdu_sentence || '',
        words: data.words || [],
      };
    
      setState(prev => ({
        ...prev,
        currentStep: 'word_by_word',
        currentSentence: sentenceInfo,
        isDisplayingSentence: true,
        isProcessingAudio: false,
        currentMessageText: t('میرے بعد دہرائیں۔', 'Repeat after me.'),
      }));
    
      setTimeout(() => {
        playWordByWord(sentenceInfo.words);
      }, 300);
    }    

    // 🎤 Step 8: Handle full sentence audio after word-by-word
    if (data.step === 'full_sentence_audio') {
      console.log('🎤 Received full sentence audio after word-by-word...');
      // Store the full sentence text to display during listening and clear loading state
      setState(prev => ({
        ...prev,
        isDisplayingSentence: false, // Hide sentence display
        currentSentence: null,
        fullSentenceText: data.response || 'Now repeat the full sentence', // Store the text to display during listening
        currentStep: 'waiting', // Set to waiting state to show loading animation
        isProcessingAudio: false, // Don't show processing animation - we're waiting for audio to arrive
      }));
    }

    // 🎤 Step 9: Handle English input edge case
    if (data.step === 'english_input_edge_case') {
      console.log('🎤 Received English input edge case...');
      setState(prev => ({
        ...prev,
        currentStep: 'english_input_edge_case',
        isProcessingAudio: false, // Stop processing animation
        isEnglishInputEdgeCase: true,
        currentMessageText: data.response || 'Great job speaking English! However, the task is to translate from Urdu to English. Please say the Urdu sentence to proceed.',
      }));
    }
  
    // 📜 Step 9: Auto-scroll UI
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    // Performance tracking
    const endTime = Date.now();
    console.log(`⚡ WebSocket message processed in ${endTime - startTime}ms`);
  };
  

  const handleAudioData = async (audioBuffer: ArrayBuffer) => {
    // Check if screen is focused before processing audio data
    if (!isScreenFocusedRef.current) {
      console.log('Screen not focused, ignoring audio data');
      return;
    }

    // --- NEW: Centralized iOS Volume Fix ---
    if (Platform.OS === 'ios') {
      try {
        console.log('iOS: Setting audio mode for playback.');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          shouldDuckAndroid: true,
        });
      } catch (e) {
        console.error("iOS: Failed to set audio mode for playback:", e);
      }
    }
    // --- End of Fix ---

    try {
      const base64 = Buffer.from(audioBuffer).toString('base64'); // Convert buffer to base64
      const audioUri = `${FileSystem.cacheDirectory}ai_audio_${Date.now()}.mp3`;
  
      await FileSystem.writeAsStringAsync(audioUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
  
      // Check if we're currently in feedback mode or await_next mode
      if (state.currentStep === 'playing_feedback') {
        setState(prev => ({
          ...prev,
          currentAudioUri: audioUri,
          currentStep: 'speaking',
          isProcessingAudio: false, // Stop processing animation when feedback audio starts
          isAISpeaking: true, // Start AI speaking animation
          isPlayingFeedback: true, // Keep feedback flag for audio completion logic
        }));
      } else if (state.currentStep === 'playing_await_next') {
        setState(prev => ({
          ...prev,
          currentAudioUri: audioUri,
          currentStep: 'speaking',
          isProcessingAudio: false, // Stop processing animation
          isAISpeaking: true, // Start AI speaking animation
          isAwaitNextPlaying: true, // Keep await_next flag for audio completion logic
        }));
      } else if (state.currentStep === 'playing_you_said') {
        // "You said" audio
        // The specific audio mode fix that was here is now removed and handled by the centralized block above.
        setState(prev => ({
          ...prev,
          currentAudioUri: audioUri,
          currentStep: 'speaking',
          isProcessingAudio: false, // Stop processing animation
          isAISpeaking: true, // Start AI speaking animation
          isPlayingYouSaid: true, // Keep you_said flag for audio completion logic
        }));
      } else if (state.currentStep === 'waiting' && state.fullSentenceText) {
        // Full sentence audio after word-by-word - this is the feedback audio
        console.log('🎤 Received full sentence audio (feedback audio) after word-by-word...');
        setState(prev => ({
          ...prev,
          currentAudioUri: audioUri,
          currentStep: 'speaking',
          isProcessingAudio: false, // Stop processing animation
          isAISpeaking: true, // Start AI speaking animation
          isPlayingFeedback: true, // Mark as feedback audio for completion logic
          currentMessageText: prev.fullSentenceText, // Show the sentence text during AI speaking
        }));
      } else if (state.currentStep === 'english_input_edge_case') {
        // English input edge case audio
        setState(prev => ({
          ...prev,
          currentAudioUri: audioUri,
          currentStep: 'speaking',
          isProcessingAudio: false, // Stop processing animation
          isAISpeaking: true, // Start AI speaking animation
          isEnglishInputEdgeCase: true, // Keep English input edge case flag
        }));
      } else {
        setState(prev => ({
          ...prev,
          currentAudioUri: audioUri,
          currentStep: 'speaking',
          isProcessingAudio: false, // Stop processing animation
          isAISpeaking: true, // Start AI speaking animation
        }));
      }
  
      await playAudio(audioUri);
    } catch (error) {
      console.error('Failed to handle audio data:', error);
    }
  };

  const handleWebSocketClose = () => {
    setState(prev => ({
      ...prev,
      isConnected: false,
      currentStep: 'error',
      isProcessingAudio: false, // Stop processing animation on connection error
      isListening: false,
      isVoiceDetected: false,
      isAISpeaking: false,
      isPlayingIntro: false,
      isContinuingConversation: false,
      isPlayingRetry: false,
      isPlayingFeedback: false,
      isAwaitNextPlaying: false,
      isPlayingYouSaid: false,
      isWaitingForRepeatPrompt: false,
      fullSentenceText: '',
      currentMessageText: '',
      isNoSpeechDetected: false,
      isEnglishInputEdgeCase: false,
    }));
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.readAsDataURL(blob);
    });
  };

  const playAudio = async (audioUri: string) => {
    // Check if screen is focused before playing audio
    if (!isScreenFocusedRef.current) {
      console.log('Screen not focused, skipping audio playback');
      return;
    }

    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          // Use setState callback to access current state
          setState(prev => {
            // Check what type of audio just finished to determine next action
            if (prev.isPlayingFeedback) {
              // Feedback audio finished - stay on same sentence and restart listening
              console.log('📝 Feedback audio finished, staying on same sentence...');
              console.log('🔄 Starting recording again for the same sentence...');
              
              // Start listening again for the same sentence after a delay
              setTimeout(() => {
                if (isScreenFocusedRef.current) {
                  sendLearnMessage(JSON.stringify({
                    type: 'feedback_complete',
                    language_mode: mode,
                  }));
                }
              }, 500);
              
              return {
                ...prev, 
                currentStep: 'word_by_word', // Immediately show listening state
                isAISpeaking: false,
                isPlayingFeedback: false,
                isWordByWordSpeaking: true, // Show listening animation immediately
                currentMessageText: '', // Clear the message when feedback ends
                fullSentenceText: '', // Clear the full sentence text
              };
            } else if (prev.isPlayingYouSaid) {
              // "You said" audio finished - send completion signal to backend
              console.log('🎤 "You said" audio finished, sending completion signal...');
              
              // Send completion signal to backend
              setTimeout(() => {
                if (isScreenFocusedRef.current) {
                  console.log('🔄 Sending "you said" completion signal to backend...');
                  sendLearnMessage(JSON.stringify({
                    type: 'you_said_complete',
                    language_mode: mode,
                  }));
                }
              }, 500);
              
              return {
                ...prev, 
                currentStep: 'waiting',
                isAISpeaking: false,
                isPlayingYouSaid: false,
                isWaitingForRepeatPrompt: true, // Set flag to prevent auto-recording
                currentMessageText: '', // Clear the message when "you said" ends
              };
            } else if (prev.isAwaitNextPlaying) {
              // Await next audio finished - restart conversation from beginning
              console.log('✅ Await next audio finished, restarting conversation...');
              console.log('🔄 Starting fresh conversation...');
              
              // Clear all messages and restart from beginning
              setTimeout(() => {
                console.log('🔄 Clearing messages and restarting conversation...');
                setState(prev => ({
                  ...prev,
                  messages: [], // Clear all messages
                  currentStep: 'listening', // Immediately show listening state
                  isAISpeaking: false,
                  isAwaitNextPlaying: false,
                  isContinuingConversation: false,
                  isListening: true, // Show listening animation immediately
                  currentMessageText: '', // Clear the message when await next ends
                }));
                
                // Start fresh conversation by sending initial audio
                setTimeout(() => {
                  console.log('🎤 Starting fresh recording...');
                  startRecording();
                }, 500);
              }, 1000);
              
              return {
                ...prev, 
                currentStep: 'waiting',
                isAISpeaking: false,
                isAwaitNextPlaying: false,
                isContinuingConversation: false,
                currentMessageText: '', // Clear the message when await next ends
              };
            } else if (prev.isEnglishInputEdgeCase) {
              // English input edge case audio finished - restart listening for Urdu input
              console.log('🎤 English input edge case audio finished, restarting listening...');
              
              // Start listening again after a delay
              setTimeout(() => {
                if (isScreenFocusedRef.current) {
                  console.log('🔄 Starting recording for Urdu input...');
                  startRecording();
                }
              }, 500);
              
              return {
                ...prev, 
                currentStep: 'listening',
                isAISpeaking: false,
                isEnglishInputEdgeCase: false,
                isListening: true, // Show listening animation immediately
                currentMessageText: '', // Clear the message when English input edge case ends
              };
            } else {
              // Regular AI speaking finished
              return {
                ...prev, 
                currentStep: 'waiting',
                isAISpeaking: false,
                currentMessageText: '', // Clear the message when AI speaking ends
              };
            }
          });
        }
      });

      await sound.playAsync();

    } catch (error) {
      console.error('Failed to play audio:', error);
      setState(prev => ({ ...prev, currentStep: 'waiting' }));
    }
  };

  const startRecording = async () => {
    // Set audio mode to allow recording before anything else
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      });
    } catch (error) {
      console.error('Failed to set audio mode for recording:', error);
      Alert.alert('Error', 'Could not configure audio for recording.');
      setState(prev => ({ ...prev, currentStep: 'error' }));
      return;
    }

    isStoppingRef.current = false; // Reset the stopping flag

    // Check for permissions before starting
    const permission = await Audio.getPermissionsAsync();
    if (!permission.granted) {
      console.log('Requesting audio permissions again...');
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Required', 'Microphone access is needed to speak with the tutor.');
        setState(prev => ({ ...prev, currentStep: 'error' }));
        return;
      }
    }

    // Check if screen is still focused
    if (!isScreenFocusedRef.current) {
      console.log('Screen not focused, skipping recording start');
      return;
    }

    // Stop and unload any previous recording before starting a new one
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {}
      recordingRef.current = null;
    }

    if (!isSocketConnected()) {
      Alert.alert('Error', 'WebSocket connection is not available');
      return;
    }

    // --- iOS Metering Calibration Reset ---
    if (Platform.OS === 'ios') {
      iOSMeteringCalibration.current = {
        calibrated: false,
        maxMetering: -160,
        calibrationStart: Date.now(),
        calibrationDuration: 1000,
      };
    }

    try {
      // Immediately set listening state to prevent blank screen
      setState(prev => ({ 
        ...prev, 
        currentStep: 'listening',
        isListening: true,
        isVoiceDetected: false,
        isAISpeaking: false,
        isPlayingIntro: false,
        isContinuingConversation: false,
        isPlayingRetry: false,
        isPlayingFeedback: false,
        isAwaitNextPlaying: false,
        isProcessingAudio: false, // Stop processing animation when starting new recording
        currentMessageText: prev.fullSentenceText || '', // Display full sentence text if available
        fullSentenceText: prev.fullSentenceText || '', // Keep the full sentence text for display
        isNoSpeechDetected: false,
        lastStopWasSilence: false,
        isFirstRecordingPreparation: false, // Clear preparation state
      }));

      console.log('DEBUG: Recording started. Resetting speech start time.');
      speechStartTimeRef.current = null; // Reset for the new recording session.

      // Helper to clear and set silence timer with ChatGPT-optimized timing
      const resetSilenceTimer = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        
        // Use helper function to get appropriate silence duration
        const silenceTimeout = getSilenceDuration(!!speechStartTimeRef.current);
        const timingType = speechStartTimeRef.current ? 'post-speech' : 'initial';
        
        logTimingInfo('Conversation', silenceTimeout, timingType);
        
        silenceTimerRef.current = setTimeout(() => {
          // Use a callback to get current state
          setState(prevState => {
            if (prevState.currentStep === 'listening') {
              setIsTalking(false);
              console.log(`🎯 SILENCE DETECTED: Timer triggered after ${silenceTimeout}ms, stopping recording.`);
              stopRecording(true); // pass true to indicate silence
            }
            return prevState;
          });
        }, silenceTimeout);
      };

      // Enable metering in options
      const options = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      };

      const { recording } = await Audio.Recording.createAsync(
        options,
        (status) => {
          // Only process metering if we are not in the process of stopping
          if (status.metering != null && status.isRecording && !isStoppingRef.current) {
            const currentTime = Date.now();

            // --- iOS Metering Calibration ---
            if (Platform.OS === 'ios') {
              // Log metering for debugging
              console.log(`iOS Metering: ${status.metering} dB`);
              // During the first second, find the max metering value
              if (!iOSMeteringCalibration.current.calibrated) {
                if (status.metering > iOSMeteringCalibration.current.maxMetering) {
                  iOSMeteringCalibration.current.maxMetering = status.metering;
                }
                if (currentTime - iOSMeteringCalibration.current.calibrationStart > iOSMeteringCalibration.current.calibrationDuration) {
                  // Set threshold to OFFSET dB below max detected, but never below MIN_THRESHOLD
                  const newThreshold = Math.max(iOSMeteringCalibration.current.maxMetering - IOS_VAD_OFFSET_DB, IOS_VAD_MIN_THRESHOLD);
                  setVadThreshold(newThreshold);
                  iOSMeteringCalibration.current.calibrated = true;
                  console.log(`iOS VAD threshold auto-calibrated to: ${newThreshold}`);
                }
              }
            }

            // Use dynamic threshold
            const threshold = Platform.OS === 'ios' ? vadThreshold : VAD_THRESHOLD;

            if (status.metering > threshold) {
              // Voice detected
              if (speechStartTimeRef.current === null) {
                speechStartTimeRef.current = currentTime; // Set start time ONLY on the first detection
                console.log(`DEBUG: Speech start time set to: ${speechStartTimeRef.current}`);
              }

              if (!isTalking) {
                setIsTalking(true);
                setState(prev => ({ 
                  ...prev, 
                  isVoiceDetected: true,
                  isListening: false,
                }));
              }
              resetSilenceTimer(); // Reset silence timer when talking
            } else {
              // No voice detected
              if (isTalking) {
                setIsTalking(false);
                setState(prev => ({ 
                  ...prev, 
                  isVoiceDetected: false,
                  isListening: true,
                }));
              }
              // Don't reset timer - let it count down
            }
          } else if (Platform.OS === 'ios' && status.isRecording && !isStoppingRef.current) {
            // Fallback: If metering is always -160 (not working), use a timer to stop after 3s
            if (!iOSMeteringCalibration.current.calibrated && Date.now() - iOSMeteringCalibration.current.calibrationStart > 2000) {
              // If after 2s, maxMetering is still -160, metering is not working
              if (iOSMeteringCalibration.current.maxMetering <= -159) {
                console.warn('iOS metering not working, using fallback silence timer.');
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = setTimeout(() => {
                  setIsTalking(false);
                  stopRecording(true);
                }, 3000); // Stop after 3s if no metering
                iOSMeteringCalibration.current.calibrated = true;
              }
            }
          }
        },
        200 // update interval ms
      );
      recordingRef.current = recording;
      resetSilenceTimer(); // Start timer in case no voice at all
    } catch (error) {
      console.error('Failed to start recording:', error);
      setState(prev => ({ ...prev, currentStep: 'error' }));
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async (stoppedBySilence = false) => {
    isStoppingRef.current = true; // Immediately signal that we are stopping
    if (!recordingRef.current) return;

    try {
      // Immediately set processing state to prevent blank screen
      setState(prev => ({ 
        ...prev, 
        currentStep: 'processing',
        isListening: false,
        isVoiceDetected: false,
        isAISpeaking: false,
        isPlayingIntro: false,
        isContinuingConversation: false,
        isPlayingRetry: false,
        isPlayingFeedback: false,
        isAwaitNextPlaying: false,
        isPlayingYouSaid: false,
        isWaitingForRepeatPrompt: false,
        fullSentenceText: '',
        isProcessingAudio: true, // Show processing animation immediately
        currentMessageText: '',
        isNoSpeechDetected: false,
      }));

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      const speechStartedAt = speechStartTimeRef.current;
      const speechEndedAt = Date.now();
      const duration = speechStartedAt ? speechEndedAt - speechStartedAt : 0;
      const hadValidSpeech = speechStartedAt && duration >= MIN_SPEECH_DURATION;

      console.log(`DEBUG: Stop recording details - Start: ${speechStartedAt}, End: ${speechEndedAt}, Duration: ${duration}ms`);
      console.log(`Stopping recording. Reason: ${stoppedBySilence ? 'silence' : 'manual'}. Speech duration: ${duration}ms, valid: ${hadValidSpeech}`);

      if (uri && hadValidSpeech) {
        console.log("Valid speech detected. Uploading audio...");
        await uploadAudioAndSendMessage(uri);
      } else {
        if (stoppedBySilence) {
          console.log('Recording stopped by silence timer, but speech was too short or invalid.');
          setState(prev => ({
            ...prev,
            lastStopWasSilence: true,
            currentStep: 'waiting',
            isListening: false,
            isVoiceDetected: false,
            isNoSpeechDetected: true,
            isProcessingAudio: false,
            isLoadingAfterWordByWord: false,
            currentMessageText: t('No speech detected.', 'بے صدا کی تلاش کریں۔'),
          }));
        } else {
          console.log('Recording stopped manually, but was too short.');
          setState(prev => ({ 
            ...prev, 
            currentStep: 'waiting',
            isProcessingAudio: false,
            isLoadingAfterWordByWord: false,
          }));
        }
      }
      
      // Reset speech tracking
      speechStartTimeRef.current = null;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setState(prev => ({ ...prev, currentStep: 'error' }));
    }
  };

  const uploadAudioAndSendMessage = async (audioUri: string) => {
    try {
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
  
      // Construct WebSocket payload with base64 audio
      const messagePayload = {
        audio_base64: base64Audio,
        filename: `recording-${Date.now()}.wav`,
        language_mode: mode,
      };
  
      // Send JSON stringified base64 payload via WebSocket
      sendLearnMessage(JSON.stringify(messagePayload));
  
      // Set processing state to show processing animation (not AI speaking)
      setState(prev => ({
        ...prev,
        isProcessingAudio: true,
        isAISpeaking: false, // Ensure AI speaking is false during processing
        currentStep: 'processing',
        fullSentenceText: '', // Clear the full sentence text when processing starts
      }));
  
    } catch (error) {
      console.error('Failed to convert/send audio:', error);
      setState(prev => ({ 
        ...prev, 
        currentStep: 'error',
        isProcessingAudio: false, // Stop processing animation on error
        isListening: false,
        isVoiceDetected: false,
        isAISpeaking: false,
        isPlayingIntro: false,
        isContinuingConversation: false,
        isPlayingRetry: false,
        isPlayingFeedback: false,
        isAwaitNextPlaying: false,
        isPlayingYouSaid: false,
        isWaitingForRepeatPrompt: false,
        fullSentenceText: '',
        currentMessageText: '',
        isNoSpeechDetected: false,
        isLoadingAfterWordByWord: false,
      }));
    }
  };
  

  const sendTextMessage = () => {
    if (!state.inputText.trim() || !isSocketConnected()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: state.inputText,
      isAI: false,
      timestamp: new Date(),
    };

    sendLearnMessage(state.inputText);
    
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      inputText: '',
    }));

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const cleanup = () => {
    console.log('🧹 Starting comprehensive cleanup...');
    
    // Clear all timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    // Stop recording if active
    if (recordingRef.current) {
      console.log('🛑 Stopping recording...');
      recordingRef.current.stopAndUnloadAsync().catch(error => {
        console.warn('Error stopping recording during cleanup:', error);
      });
      recordingRef.current = null;
    }
    
    // Unload all audio sounds
    const unloadSound = async (soundRef: React.MutableRefObject<Audio.Sound | null>, name: string) => {
      if (soundRef.current) {
        console.log(`🔇 Unloading ${name}...`);
        try {
          await soundRef.current.unloadAsync();
        } catch (error) {
          console.warn(`Error unloading ${name}:`, error);
        }
        soundRef.current = null;
      }
    };
    
    unloadSound(soundRef, 'main sound');
    unloadSound(introSoundRef, 'intro sound');
    unloadSound(retrySoundRef, 'retry sound');
    unloadSound(feedbackSoundRef, 'feedback sound');
    
    // Stop Speech synthesis
    console.log('🔇 Stopping speech synthesis...');
    Speech.stop();
    
    // Close WebSocket connection
    console.log('🔌 Closing WebSocket connection...');
    closeLearnSocket();
    
    // Reset all state
    console.log('🔄 Resetting state...');
    setState(prev => ({
      ...prev,
      currentStep: 'waiting',
      isConnected: false,
      isProcessingAudio: false,
      isListening: false,
      isVoiceDetected: false,
      isAISpeaking: false,
      isPlayingIntro: false,
      isContinuingConversation: false,
      isPlayingRetry: false,
      isPlayingFeedback: false,
      isAwaitNextPlaying: false,
      isWordByWordSpeaking: false,
      isPlayingYouSaid: false,
      isWaitingForRepeatPrompt: false,
      fullSentenceText: '',
      currentMessageText: '',
      isNoSpeechDetected: false,
      currentSentence: null,
      currentWordIndex: 0,
      isDisplayingSentence: false,
      lastStopWasSilence: false,
      isLoadingAfterWordByWord: false,
      isFirstRecordingPreparation: false, // Reset preparation state
    }));
    
    // Reset refs
    speechStartTimeRef.current = null;
    setIsTalking(false);
    isWordByWordActiveRef.current = false;
    isFirstRecordingRef.current = true; // Reset first recording flag for next session
    
    console.log('✅ Cleanup completed');
  };

  // Enhanced cleanup function specifically for manual exit
  const performManualCleanup = () => {
    console.log('🚪 Performing immediate manual cleanup for user exit...');
    
    // Set screen as not focused immediately
    isScreenFocusedRef.current = false;
    
    // IMMEDIATE STOP - Stop all audio playback first
    console.log('🔇 Immediately stopping all audio playback...');
    
    // Stop all audio sounds immediately
    const stopAllAudio = async () => {
      const audioRefs = [
        { ref: soundRef, name: 'main sound' },
        { ref: introSoundRef, name: 'intro sound' },
        { ref: retrySoundRef, name: 'retry sound' },
        { ref: feedbackSoundRef, name: 'feedback sound' }
      ];
      
      for (const audioRef of audioRefs) {
        if (audioRef.ref.current) {
          try {
            console.log(`🔇 Stopping ${audioRef.name} immediately...`);
            await audioRef.ref.current.stopAsync();
            await audioRef.ref.current.unloadAsync();
            audioRef.ref.current = null;
          } catch (error) {
            console.warn(`Error stopping ${audioRef.name}:`, error);
          }
        }
      }
    };
    
    // Stop recording immediately
    if (recordingRef.current) {
      console.log('🛑 Stopping recording immediately...');
      recordingRef.current.stopAndUnloadAsync().catch(error => {
        console.warn('Error stopping recording during manual cleanup:', error);
      });
      recordingRef.current = null;
    }
    
    // Stop speech synthesis immediately
    console.log('🔇 Stopping speech synthesis immediately...');
    Speech.stop();
    
    // Stop word-by-word speaking immediately
    if (isWordByWordActiveRef.current) {
      console.log('🎤 Stopping word-by-word speaking immediately...');
      isWordByWordActiveRef.current = false;
    }
    
    // Clear all timers immediately
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    // Close WebSocket connection immediately
    console.log('🔌 Closing WebSocket connection immediately...');
    closeLearnSocket();
    
    // Reset all state immediately
    console.log('🔄 Resetting all state immediately...');
    setState(prev => ({
      ...prev,
      currentStep: 'waiting',
      isConnected: false,
      isProcessingAudio: false,
      isListening: false,
      isVoiceDetected: false,
      isAISpeaking: false,
      isPlayingIntro: false,
      isContinuingConversation: false,
      isPlayingRetry: false,
      isPlayingFeedback: false,
      isAwaitNextPlaying: false,
      isWordByWordSpeaking: false,
      isPlayingYouSaid: false,
      isWaitingForRepeatPrompt: false,
      fullSentenceText: '',
      currentMessageText: '',
      isNoSpeechDetected: false,
      currentSentence: null,
      currentWordIndex: 0,
      isDisplayingSentence: false,
      lastStopWasSilence: false,
      isLoadingAfterWordByWord: false,
      isFirstRecordingPreparation: false, // Reset preparation state
    }));
    
    // Reset refs immediately
    speechStartTimeRef.current = null;
    setIsTalking(false);
    isFirstRecordingRef.current = true; // Reset first recording flag for next session
    
    // Stop all audio asynchronously
    stopAllAudio();
    
    console.log('✅ Immediate manual cleanup completed');
  };

  // Helper function to determine which animation to show
  const getCurrentAnimation = (): {
    animation: any;
    text: string;
    showMessage: boolean;
    isSentenceDisplay?: boolean;
    hideAnimation?: boolean;
  } => {
    // Priority order for animations (most specific first)
    if (state.isProcessingAudio) {
      // Special case: If we're in playing_feedback, do NOT show animation, only feedback text
      if (state.currentStep === 'playing_feedback') {
        return {
          animation: null,
          text: '',
          showMessage: !!state.currentMessageText,
          hideAnimation: true,
        };
      }
      return {
        animation: require('../../../assets/animations/sent_audio_for_processing.json'),
        text: '', // Hide text below animation
        showMessage: false  // ✅ Hide feedback text during audio processing
      };
    }
    
    if (state.isFirstRecordingPreparation) {
      return {
        animation: require('../../../assets/animations/loading.json'),
        text: '', // Hide text below animation
        showMessage: true
      };
    }
    
    if (state.isListening) {
      return {
        animation: require('../../../assets/animations/listening.json'),
        text: '', // Hide text below animation
        showMessage: !!state.currentMessageText
      };
    }
    
    if (state.isVoiceDetected) {
      return {
        animation: require('../../../assets/animations/voice_detected.json'),
        text: '', // Hide text below animation
        showMessage: !!state.currentMessageText
      };
    }
    
    // AI Speaking animation only when actually speaking (not during processing)
    if (state.isAISpeaking && !state.isProcessingAudio) {
      return {
        animation: require('../../../assets/animations/ai_speaking.json'),
        text: '', // Hide text below animation
        showMessage: !!state.currentMessageText
      };
    }
    
    if (state.isPlayingIntro) {
      return {
        animation: require('../../../assets/animations/ai_speaking.json'),
        text: '', // Hide text below animation
        showMessage: !!state.currentMessageText
      };
    }
    
    if (state.isContinuingConversation) {
      return {
        animation: require('../../../assets/animations/ai_speaking.json'),
        text: '', // Hide text below animation
        showMessage: !!state.currentMessageText
      };
    }
    
    if (state.isPlayingRetry) {
      return {
        animation: require('../../../assets/animations/ai_speaking.json'),
        text: '', // Hide text below animation
        showMessage: !!state.currentMessageText
      };
    }
    
    if (state.isPlayingFeedback) {
      return {
        animation: require('../../../assets/animations/ai_speaking.json'),
        text: '', // Hide text below animation
        showMessage: !!state.currentMessageText
      };
    }
    
    if (state.isPlayingYouSaid) {
      return {
        animation: require('../../../assets/animations/ai_speaking.json'),
        text: '', // Hide text below animation
        showMessage: !!state.currentMessageText
      };
    }
    
    if (state.isNoSpeechDetected) {
      return {
        animation: require('../../../assets/animations/tap_the_mic_try_again.json'),
        text: '', // Hide text below animation
        showMessage: !!state.currentMessageText
      };
    }
    
    if (state.isDisplayingSentence) {
      // During word-by-word speaking, don't show any animation overlay
      if (state.isWordByWordSpeaking) {
        return {
          animation: null, // No animation during word-by-word speaking
          text: '',
          showMessage: false,
          isSentenceDisplay: true,
          hideAnimation: true // Flag to hide animation overlay
        };
      }
      
      // Before word-by-word starts, show loading animation instead of sentence display
      return {
        animation: require('../../../assets/animations/loading.json'),
        text: '', // Hide text below animation
        showMessage: false,
        isSentenceDisplay: false, // Don't show sentence display, just loading
        hideAnimation: false
      };
    }
    
    // ✅ NEW: Show loading animation when in waiting state with fullSentenceText (higher priority)
    if (state.currentStep === 'waiting' && state.fullSentenceText) {
      return {
        animation: require('../../../assets/animations/loading.json'),
        text: '', // Hide text below animation
        showMessage: true // Always show message when we have fullSentenceText
      };
    }
    
    // English input edge case animation
    if (state.isEnglishInputEdgeCase) {
      return {
        animation: require('../../../assets/animations/ai_speaking.json'),
        text: '', // Hide text below animation
        showMessage: !!state.currentMessageText
      };
    }
    
    // ✅ Show loading animation when in waiting state and there's a message to display
    if (state.currentStep === 'waiting') {
      // If we have fullSentenceText, show it as the message during loading
      const messageToShow = state.fullSentenceText || state.currentMessageText;
      return {
        animation: require('../../../assets/animations/loading.json'),
        text: '', // Hide text below animation
        showMessage: !!messageToShow
      };
    }
    
    // Fallback for any other state - show loading animation
    return {
      animation: require('../../../assets/animations/loading.json'),
      text: '', // Hide text below animation
      showMessage: false
    };
  };

  const renderMessage = (message: Message) => {
    // Don't render the "Sent audio for processing..." message
    if (message.text === "Sent audio for processing...") {
      return null;
    }
    
    return (
      <View key={message.id} style={[
        styles.messageContainer,
        message.isAI ? styles.aiMessage : styles.userMessage
      ]}>
        <View style={[
          styles.messageBubble,
          message.isAI ? styles.aiBubble : styles.userBubble
        ]}>
          <Text style={[
            styles.messageText,
            message.isAI ? styles.aiText : styles.userText
          ]}>
            {message.text}
          </Text>
          <Text style={styles.timestamp}>
            {message.timestamp.toLocaleTimeString()}
          </Text>
        </View>
      </View>
    );
  };

  const renderStatusIndicator = () => {
    switch (state.currentStep) {
      case 'playing_intro':
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="volume-high" size={20} color="#007AFF" />
            <Text style={styles.statusText}>{t('Playing Introduction...', 'درخواست کی تلاش کریں۔')}</Text>
          </View>
        );
      case 'playing_await_next':
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="volume-high" size={20} color="#007AFF" />
            <Text style={styles.statusText}>{t('Continuing Conversation...', 'درخواست کی تلاش کریں۔')}</Text>
          </View>
        );
      case 'playing_retry':
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="volume-high" size={20} color="#007AFF" />
            <Text style={styles.statusText}>{t('AI Speaking...', 'درخواست کی تلاش کریں۔')}</Text>
          </View>
        );
      case 'listening':
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.statusText}>
              {isTalking ? t('Voice Detected', 'آواز کی شناخت ہو رہی ہے') : t('Listening...', 'سن رہے ہیں')}
            </Text>
          </View>
        );
      case 'processing':
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.statusText}>{t('Processing...', 'پروسیسنگ ہو رہی ہے...')}</Text>
          </View>
        );
      case 'speaking':
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="volume-high" size={20} color="#007AFF" />
            <Text style={styles.statusText}>{t('AI Speaking...', 'درخواست کی تلاش کریں۔')}</Text>
          </View>
        );
      case 'error':
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="warning" size={20} color="#FF3B30" />
            <Text style={styles.statusText}>{t('Connection Error', 'کنکشن میں خرابی')}</Text>
          </View>
        );
      case 'english_input_edge_case':
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="volume-high" size={20} color="#007AFF" />
            <Text style={styles.statusText}>{t('English Input Detected...', 'انگریزی ان پٹ ملی')}</Text>
          </View>
        );
      default:
        return null;
    }
  };

  // Function to end conversation and go back
  const endConversation = () => {
    console.log('🎯 User manually ending conversation via wrong button...');
    console.log('Current state:', {
      currentStep: state.currentStep,
      isProcessingAudio: state.isProcessingAudio,
      isListening: state.isListening,
      isAISpeaking: state.isAISpeaking,
      isPlayingIntro: state.isPlayingIntro,
      isNoSpeechDetected: state.isNoSpeechDetected,
    });
    
    // Immediately stop all processes and navigate to learn index
    console.log('🚪 Immediately stopping all processes and navigating to learn index...');
    
    // Set screen as not focused immediately
    isScreenFocusedRef.current = false;
    
    // Perform immediate cleanup without confirmation
    performManualCleanup();
    
    // Navigate to learn index instead of going back
    router.replace('/(tabs)/learn');
  };

  // Prevent back navigation - only allow exit via wrong button
  useFocusEffect(
    useCallback(() => {
      const backHandler = () => {
        // Prevent default back navigation
        return true; // Return true to prevent default behavior
      };

      // This would require additional setup with react-native-gesture-handler
      // For now, we'll rely on the wrong button being the only exit method
    }, [])
  );

  // Animate mic button when listening or talking
  useEffect(() => {
    if (state.currentStep === 'listening') {
      Animated.timing(micAnim, {
        toValue: isTalking ? 0.5 : 0.7,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();
    } else {
      Animated.timing(micAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();
    }
  }, [state.currentStep, isTalking]);

  useEffect(() => {
    if (state.currentStep === 'listening') {
      Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
    }
  }, [state.currentStep]);

  useEffect(() => {
    console.log('Current step:', state.currentStep);
  }, [state.currentStep]);

  // Get current animation state
  const currentAnimation = getCurrentAnimation();

  // UI for real-time conversation mode
  return (
    <View style={styles.container}>
      {/* Connection Indicator Dot - Top Right */}
      <View style={[
        styles.connectionIndicator,
        { backgroundColor: state.isConnected ? '#58D68D' : '#FF6B6B' }
      ]} />

      {/* Unified Animation Overlay - Always show something */}
      <View style={currentAnimation.isSentenceDisplay ? styles.sentenceOverlay : styles.processingOverlay} pointerEvents="box-none">
        {/* Show message box if there's a message to display */}
        {currentAnimation.showMessage && (state.fullSentenceText || state.currentMessageText) ? (
          <View style={styles.messageBox}>
            <Text style={styles.currentMessageText}>{state.fullSentenceText || state.currentMessageText}</Text>
          </View>
        ) : null}
        
        {/* Show sentence display only during word-by-word speaking */}
        {currentAnimation.isSentenceDisplay && state.currentSentence && state.isWordByWordSpeaking ? (
          <View style={styles.sentenceDisplayContainer}>
            {/* Repeat after me */}
            <Text style={styles.sentenceTitle}>{t('Repeat after me.', 'میرے بعد دہرائیں۔')}</Text>
            
            {/* English Sentence */}
            <View style={styles.sentenceBox}>
              <Text style={styles.sentenceLabel}>{t('English:', 'English:')}</Text>
              <Text style={styles.sentenceText}>{state.currentSentence.english}</Text>
            </View>
            
            {/* Urdu Sentence */}
            <View style={styles.sentenceBox}>
              <Text style={styles.sentenceLabel}>{t('Urdu:', 'اردو:')}</Text>
              <Text style={styles.sentenceText}>{state.currentSentence.urdu}</Text>
            </View>
            
            {/* Word-by-word progress */}
            <View style={styles.wordProgressContainer}>
              <Text style={styles.wordProgressText}>
                {t('Word', 'Word')} {state.currentWordIndex + 1} of {state.currentSentence.words.length}
              </Text>
              <Text style={styles.currentWordText}>
                "{state.currentWordChunk || state.currentSentence.words[state.currentWordIndex]}"
              </Text>
            </View>
          </View>
        ) : null}
        
        {/* Show animation only if not hidden */}
        {!currentAnimation.hideAnimation && currentAnimation.animation && (
          <>
            <LottieView
              source={currentAnimation.animation}
              autoPlay
              loop
              style={styles.processingAnimation}
            />
            {/* Text below animation is now hidden for better UX */}
          </>
        )}
      </View>

      {/* Center round button and wrong button */}
      <View style={styles.bottomContainer}>
        {/* Wrong (X) button - Always accessible */}
        <TouchableOpacity 
          style={styles.wrongButton} 
          onPress={endConversation}
          activeOpacity={0.5}
          onPressIn={() => console.log('🎯 Wrong button pressed! Current state:', state.currentStep, 'Word-by-word active:', isWordByWordActiveRef.current)}
        >
          <View style={styles.wrongButtonContainer}>
            <LinearGradient
              colors={['#FFFFFF', '#F8F9FA']}
              style={styles.wrongButtonGradient}
            >
              <View style={styles.wrongButtonInner}>
                <Ionicons name="close" size={24} color="#000000" />
              </View>
            </LinearGradient>
            <View style={styles.wrongButtonShadow} />
          </View>
          {/* Exit label */}
          {/* <Text style={styles.exitLabel}>{t('Exit', 'خارج کریں')}</Text> */}
        </TouchableOpacity>
        {/* Center mic/stop button - Hide during word-by-word and sentence display */}
        {/* Note: Wrong button (X) is always accessible regardless of state */}
        {!state.isWordByWordSpeaking && !state.isDisplayingSentence && (
          <Animated.View style={{
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            left: 0, right: 0, bottom: 40,
            transform: [{ scale: micAnim }],
          }}>
            {/* Pulsing ring for listening state */}
            {state.currentStep === 'listening' && (
              <Animated.View
                style={[
                  styles.pulsingRing,
                  {
                    transform: [{
                      scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] })
                    }],
                    opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] })
                  }
                ]}
              />
            )}
            <TouchableOpacity
              style={[
                styles.centerMicButton,
                state.currentStep === 'listening'
                  ? styles.centerMicButtonActive
                  : state.currentStep === 'playing_intro'
                      ? styles.centerMicButtonIntro
                      : state.currentStep === 'playing_await_next'
                        ? styles.centerMicButtonAwaitNext
                        : state.currentStep === 'playing_retry'
                          ? styles.centerMicButtonRetry
                          : state.currentStep === 'playing_feedback'
                            ? styles.centerMicButtonFeedback
                            : styles.centerMicButtonIdle
              ]}
              onPress={() => {
                if (state.currentStep === 'listening') {
                  stopRecording();
                } else {
                  setState(prev => ({ ...prev, lastStopWasSilence: false }));
                  startRecording();
                }
              }}
              disabled={state.currentStep === 'processing' || state.currentStep === 'speaking' || state.currentStep === 'playing_intro' || state.currentStep === 'playing_await_next' || state.currentStep === 'playing_retry' || state.currentStep === 'playing_feedback' || state.currentStep === 'word_by_word' || state.currentStep === 'playing_you_said' || state.isWaitingForRepeatPrompt}
              activeOpacity={0.7}
            >
            <LinearGradient
              colors={
                state.currentStep === 'listening'
                  ? ['#D32F2F', '#B71C1C']
                  : state.currentStep === 'playing_intro'
                      ? ['#58D68D', '#45B7A8']
                      : state.currentStep === 'playing_await_next'
                        ? ['#58D68D', '#45B7A8']
                        : state.currentStep === 'playing_retry'
                          ? ['#58D68D', '#45B7A8']
                          : state.currentStep === 'playing_feedback'
                            ? ['#58D68D', '#45B7A8']
                            : state.currentStep === 'word_by_word'
                              ? ['#58D68D', '#45B7A8']
                              : ['#58D68D', '#45B7A8']
              }
              style={[
                styles.micButtonGradient,
                state.currentStep === 'playing_intro' && styles.introButtonGradient
              ]}
            >
              <Ionicons
                name={
                  state.currentStep === 'listening' 
                    ? 'stop' 
                    : state.currentStep === 'playing_intro'
                      ? 'volume-high'
                      : state.currentStep === 'playing_await_next'
                        ? 'volume-high'
                        : state.currentStep === 'playing_retry'
                          ? 'volume-high'
                          : state.currentStep === 'playing_feedback'
                            ? 'volume-high'
                            : state.currentStep === 'word_by_word'
                              ? 'volume-high'
                              : 'mic'
                }
                size={state.currentStep === 'playing_intro' ? 52 : 48}
                color="white"
              />
            </LinearGradient>
          </TouchableOpacity>
          {/* Show "Tap to speak" text only when no speech is detected */}
          {state.currentStep === 'waiting' && state.lastStopWasSilence && (
            <Text style={styles.tapToSpeakLabel}>{t('Tap to speak', 'بولنے کے لیے ٹیپ کریں')}</Text>
          )}
        </Animated.View>
        )}
      </View>

      {/* Decorative Elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />
      <View style={styles.particle1} />
      <View style={styles.particle2} />
      <View style={styles.particle3} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 30, // Adjust for full screen mode
    backgroundColor: '#FFFFFF',
  },
  connectionIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40, // Adjust for full screen mode
    right: 24,
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 1000,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  aiBubble: {
    backgroundColor: '#007AFF',
  },
  userBubble: {
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  aiText: {
    color: 'white',
  },
  userText: {
    color: '#1C1C1E',
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 20,
    marginVertical: 8,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#8E8E93',
  },
  inputContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    padding: 12,
    fontSize: 16,
    maxHeight: 100,
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  micButton: {
    backgroundColor: '#007AFF',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: '#FF3B30',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  bottomContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerMicButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerMicButtonIdle: {
    backgroundColor: 'transparent',
  },
  centerMicButtonActive: {
    backgroundColor: 'transparent',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 12,
  },
  centerMicButtonTalking: {
    backgroundColor: 'transparent',
  },
  centerMicButtonIntro: {
    backgroundColor: 'transparent',
  },
  centerMicButtonAwaitNext: {
    backgroundColor: 'transparent',
  },
  centerMicButtonRetry: {
    backgroundColor: 'transparent',
  },
  centerMicButtonFeedback: {
    backgroundColor: 'transparent',
  },
  wrongButton: {
    position: 'absolute',
    left: 32,
    bottom: 32,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999, // Ensure it's always on top of everything
    elevation: 15, // For Android - higher elevation
  },
  wrongButtonContainer: {
    position: 'relative',
    width: 64,
    height: 64,
  },
  tapToSpeakLabel: {
    marginTop: 12,
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    fontWeight: '500',
  },
  silenceInfoLabel: {
    marginTop: 12,
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    fontWeight: '500',
  },
  introLabel: {
    marginTop: 12,
    fontSize: 16,
    color: '#58D68D',
    textAlign: 'center',
    fontWeight: '600',
  },
  awaitNextLabel: {
    marginTop: 12,
    fontSize: 16,
    color: '#58D68D',
    textAlign: 'center',
    fontWeight: '600',
  },
  retryLabel: {
    marginTop: 12,
    fontSize: 16,
    color: '#58D68D',
    textAlign: 'center',
    fontWeight: '600',
  },
  feedbackLabel: {
    marginTop: 12,
    fontSize: 16,
    color: '#58D68D',
    textAlign: 'center',
    fontWeight: '600',
  },
  processingLabel: {
    marginTop: 12,
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    fontWeight: '500',
  },
  processingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -160, // Move everything up by 140 pixels
  },
  // Special overlay for sentence display - move content down
  sentenceOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -80, // Move sentence content down by reducing the negative margin
  },
  processingAnimation: {
    width: 200,
    height: 200,
  },
  processingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#000000',
    fontWeight: '600',
    textAlign: 'center',
  },
  messageBox: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  currentMessageText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  wrongButtonGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 0, 0, 0.5)', // More prominent red border
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  wrongButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  wrongButtonShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    zIndex: -1,
  },
  micButtonGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  introButtonGradient: {
    // No additional styling - clean appearance
  },
  decorativeCircle1: {
    position: 'absolute',
    top: height * 0.15,
    right: -60,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: height * 0.25,
    left: -40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: height * 0.7,
    right: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.015)',
  },
  particle1: {
    position: 'absolute',
    top: height * 0.3,
    left: width * 0.1,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6C757D',
    opacity: 0.3,
  },
  particle2: {
    position: 'absolute',
    top: height * 0.6,
    right: width * 0.15,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ADB5BD',
    opacity: 0.2,
  },
  particle3: {
    position: 'absolute',
    bottom: height * 0.3,
    left: width * 0.2,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#CED4DA',
    opacity: 0.25,
  },
  // Sentence display styles
  sentenceDisplayContainer: {
    backgroundColor: '#F8F9FA',
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
    marginTop: 40, // Add top margin to move card down
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  sentenceTitle: {
    fontSize: 18,
    color: '#58D68D',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sentenceBox: {
    marginBottom: 12,
  },
  sentenceLabel: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '600',
    marginBottom: 4,
  },
  sentenceText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    lineHeight: 22,
  },
  wordProgressContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(88, 214, 141, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
  },
  wordProgressText: {
    fontSize: 14,
    color: '#58D68D',
    fontWeight: '600',
    marginBottom: 4,
  },
  currentWordText: {
    fontSize: 18,
    color: '#000000',
    fontWeight: 'bold',
  },
  wordByWordLabel: {
    marginTop: 12,
    fontSize: 16,
    color: '#58D68D',
    textAlign: 'center',
    fontWeight: '600',
  },
  exitLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#6C757D',
    textAlign: 'center',
    fontWeight: '500',
  },
  youSaidLabel: {
    marginTop: 12,
    fontSize: 16,
    color: '#58D68D',
    textAlign: 'center',
    fontWeight: '600',
  },
  waitingLabel: {
    marginTop: 12,
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    fontWeight: '500',
  },
  pulsingRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderColor: '#D32F2F',
    borderWidth: 4,
    backgroundColor: 'rgba(211, 47, 47, 0.2)',
  },
}); 