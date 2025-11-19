import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Mic, X, Volume2, Wifi, WifiOff, BookOpen, Sparkles, TrendingUp, Award, Users, Clock } from 'lucide-react';
import { 
  connectEnglishOnlySocket, 
  disconnectEnglishOnlySocket, 
  isEnglishOnlySocketConnected,
  sendEnglishOnlyMessage,
  sendEnglishOnlyBinaryAudio
} from '@/utils/websocket';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';

// Props interface for AIStudentLearn component
interface AIStudentLearnProps {}

type ViewState = 'greeting' | 'practice';
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

const GREETING_AUDIO_URL = 'https://dil-lms.s3.us-east-1.amazonaws.com/greeting_message_multilingual.mp3';
const AUDIO_PLAYED_KEY = 'ai_learn_greeting_played';

export const AIStudentLearn: React.FC<AIStudentLearnProps> = () => {
  const [currentView, setCurrentView] = useState<ViewState>('greeting');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [showStartButton, setShowStartButton] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isGreetingAudioPlaying, setIsGreetingAudioPlaying] = useState(false);
  const [isAIResponsePlaying, setIsAIResponsePlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expectingGreeting, setExpectingGreeting] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [partialResponse, setPartialResponse] = useState<string>('');
  const [finalResponse, setFinalResponse] = useState<string>('');
  const [isWaitingForAudio, setIsWaitingForAudio] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const greetingAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const webAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  // Get user information
  const { user } = useAuth();
  const { profile } = useUserProfile();

  // Mock learning analytics data
  const learningAnalytics = {
    totalSessions: 47,
    avgSessionTime: 18,
    improvementRate: 23,
    currentStreak: 5
  };

  // Get user's full name
  const getUserName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    } else if (profile?.first_name) {
      return profile.first_name;
    } else if (user?.email) {
      // Fallback to email if no name is available
      return user.email.split('@')[0];
    }
    return 'Student'; // Default fallback
  };

  // Initialize audio recording
  const initializeAudioRecording = async () => {
    try {
      console.log('🎤 Initializing audio recording...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log('🎤 Recording stopped, processing audio...');
        await processRecordedAudio();
      };
      
      console.log('✅ Audio recording initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing audio recording:', error);
      return false;
    }
  };

  // Process recorded audio and send to server using binary transmission
  const processRecordedAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      console.log('⚠️ No audio chunks to process');
      setIsProcessing(false);
      return;
    }

    try {
      setIsProcessing(true);
      setTranscribedText('');
      setPartialResponse('');
      setFinalResponse('');
      setIsWaitingForAudio(false);
      console.log('🔄 Processing recorded audio...');
      
      // Create blob from audio chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
      console.log('📦 Audio blob created:', audioBlob.size, 'bytes');
      
      // Send binary audio directly (optimized - no base64 encoding)
      const userName = getUserName();
      console.log('📤 Sending binary audio to server for processing...');
      const success = sendEnglishOnlyBinaryAudio(audioBlob, userName);
      
      if (success) {
        console.log('✅ Binary audio sent successfully');
        setConnectionMessage('Processing your speech...');
      } else {
        console.error('❌ Failed to send binary audio');
        setConnectionMessage('Failed to send audio');
        setIsProcessing(false);
      }
      
      // Clear audio chunks for next recording
      audioChunksRef.current = [];
      
    } catch (error) {
      console.error('❌ Error processing recorded audio:', error);
      setIsProcessing(false);
      setConnectionMessage('Error processing audio');
    }
  };

  // Start recording
  const startRecording = async () => {
    if (!mediaRecorderRef.current || !streamRef.current) {
      const initialized = await initializeAudioRecording();
      if (!initialized) {
        console.error('❌ Failed to initialize audio recording');
        return;
      }
    }

    try {
      audioChunksRef.current = []; // Clear previous chunks
      mediaRecorderRef.current?.start(100); // Collect data every 100ms
      setIsRecording(true);
      setIsListening(true);
      console.log('🎤 Started recording...');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsListening(false);
      console.log('🎤 Stopped recording');
    }
  };

  // Cleanup audio resources
  const cleanupAudioResources = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
  };

  // Global visibility change handler to stop all audio when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('⏸️ Tab became hidden - stopping all audio');
        
        // Stop HTML Audio element (greeting audio)
        if (audioRef.current && !audioRef.current.paused) {
          console.log('⏸️ Stopping HTML audio due to tab visibility change');
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setIsAudioPlaying(false);
          setShowStartButton(true);
          sessionStorage.setItem(AUDIO_PLAYED_KEY, 'true');
        }
        
        // Stop Web Audio API source (WebSocket audio)
        if (webAudioSourceRef.current) {
          try {
            console.log('⏸️ Stopping Web Audio source due to tab visibility change');
            webAudioSourceRef.current.stop();
            webAudioSourceRef.current = null;
          } catch (error) {
            // AudioBufferSourceNode can only be stopped once
            console.log('Web audio source already stopped');
          }
        }
        
        // Reset all audio-related states
        setIsGreetingAudioPlaying(false);
        setIsAIResponsePlaying(false);
        setIsProcessing(false);
        setExpectingGreeting(false);
        
        // Stop any ongoing recording
        if (isRecording) {
          stopRecording();
        }
        
        // Clear connection message
        setConnectionMessage('');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRecording]); // Include isRecording as dependency to access current value

  // Handle audio playback for greeting view
  useEffect(() => {
    if (currentView !== 'greeting') return;

    // Check if audio has already been played in this session
    const hasAudioPlayed = sessionStorage.getItem(AUDIO_PLAYED_KEY) === 'true';
    
    if (hasAudioPlayed) {
      // If audio was already played, show the start button immediately
      setIsAudioPlaying(false);
      setShowStartButton(true);
      return;
    }

    // Create and configure audio element
    const audio = new Audio(GREETING_AUDIO_URL);
    audioRef.current = audio;
    
    // Configure audio settings
    audio.preload = 'auto';
    audio.volume = 1.0;

    // Audio event handlers
    const handleCanPlayThrough = () => {
      console.log('🎵 Greeting audio ready to play');
      setIsAudioPlaying(true);
      
      // Auto-play the audio
      audio.play().catch((error) => {
        console.error('❌ Audio auto-play failed:', error);
        // If auto-play fails, show the start button immediately
        setIsAudioPlaying(false);
        setShowStartButton(true);
        sessionStorage.setItem(AUDIO_PLAYED_KEY, 'true');
      });
    };

    const handleAudioStart = () => {
      console.log('▶️ Greeting audio started playing');
      setIsAudioPlaying(true);
    };

    const handleAudioEnd = () => {
      console.log('✅ Greeting audio finished');
      setIsAudioPlaying(false);
      
      // Mark audio as played in session
      sessionStorage.setItem(AUDIO_PLAYED_KEY, 'true');
      
      // Fade in the Start Practicing button after audio ends
      setTimeout(() => {
        setShowStartButton(true);
      }, 500);
    };

    const handleAudioError = (error: Event) => {
      console.error('❌ Audio loading error:', error);
      setIsAudioPlaying(false);
      setShowStartButton(true);
      sessionStorage.setItem(AUDIO_PLAYED_KEY, 'true');
    };

    // Add audio event listeners
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('play', handleAudioStart);
    audio.addEventListener('ended', handleAudioEnd);
    audio.addEventListener('error', handleAudioError);

    // Cleanup function
    return () => {
      if (audio) {
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
        audio.removeEventListener('play', handleAudioStart);
        audio.removeEventListener('ended', handleAudioEnd);
        audio.removeEventListener('error', handleAudioError);
        
        // Stop and cleanup audio
        if (!audio.paused) {
          audio.pause();
        }
        audio.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, [currentView]);

  // Cleanup when component unmounts or view changes
  useEffect(() => {
    return () => {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (greetingAudioRef.current && !greetingAudioRef.current.paused) {
        greetingAudioRef.current.pause();
        greetingAudioRef.current.currentTime = 0;
      }
      if (webAudioSourceRef.current) {
        try {
          webAudioSourceRef.current.stop();
          webAudioSourceRef.current.disconnect();
        } catch (error) {
          // AudioBufferSourceNode can only be stopped once
          console.log('Web audio source already stopped');
        }
        webAudioSourceRef.current = null;
      }
      // Cleanup audio resources
      cleanupAudioResources();
      // Disconnect WebSocket when component unmounts
      disconnectEnglishOnlySocket();
    };
  }, []);

  // WebSocket event handlers with support for partial responses and streaming
  const handleWebSocketMessage = (data: any) => {
    console.log('📨 Received WebSocket message:', data);
    
    // Handle partial responses (streaming optimization)
    if (data.partial === true) {
      console.log('📝 Received partial response');
      
      // Early analysis trigger - show transcribed text immediately
      if (data.status === 'processing' && data.transcribed_text) {
        console.log('⚡ Early trigger: Showing transcribed text:', data.transcribed_text);
        setTranscribedText(data.transcribed_text);
        setConnectionMessage('Analyzing your speech...');
        setIsProcessing(true);
        return;
      }
      
      // Partial response with conversation text (before TTS completes)
      if (data.response || data.conversation_text) {
        const responseText = data.response || data.conversation_text;
        console.log('📝 Partial response text:', responseText);
        setPartialResponse(responseText);
        setFinalResponse(''); // Clear final response if we have partial
        setIsWaitingForAudio(true);
        setConnectionMessage('AI is responding...');
        
        // Update transcribed text if available
        if (data.original_text) {
          setTranscribedText(data.original_text);
        }
      }
      return;
    }
    
    // Handle final complete response
    if (data.final === true || (!data.partial && (data.response || data.conversation_text))) {
      console.log('✅ Received final response');
      const responseText = data.response || data.conversation_text;
      setFinalResponse(responseText);
      setPartialResponse(''); // Clear partial when final arrives
      setIsProcessing(false);
      setIsWaitingForAudio(true); // Audio will come next
      setConnectionMessage('');
      
      // Update transcribed text if available
      if (data.original_text) {
        setTranscribedText(data.original_text);
      }
      
      // Update conversation state if provided
      if (data.conversation_stage) {
        console.log('🔄 Conversation stage:', data.conversation_stage);
      }
      return;
    }
    
    // Handle greeting message
    if (data.step === 'greeting') {
      console.log('👋 Received greeting response');
      setConnectionMessage('');
      // Audio will be handled by handleAudioData
      return;
    }
    
    // Handle error messages
    if (data.step === 'error') {
      console.error('❌ Error from server:', data.error_type);
      setIsProcessing(false);
      setConnectionMessage(data.response || 'An error occurred');
      return;
    }
    
    // Handle other message types
    if (data.step) {
      console.log(`📋 Message step: ${data.step}`);
      if (data.response) {
        setConnectionMessage(data.response);
      }
    }
  };

  const handleAudioData = (audioBuffer: ArrayBuffer) => {
    console.log('🎵 Received audio data:', audioBuffer.byteLength, 'bytes');
    
    try {
      // Stop any currently playing WebAudio source before starting new one
      if (webAudioSourceRef.current) {
        try {
          console.log('⏸️ Stopping previous audio source to prevent overlap');
          webAudioSourceRef.current.stop();
          webAudioSourceRef.current.disconnect();
        } catch (error) {
          console.log('Previous audio source already stopped');
        }
        webAudioSourceRef.current = null;
      }

      // Create audio context and play the received audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      audioContext.decodeAudioData(audioBuffer.slice(0), (decodedData) => {
        console.log('🎵 Audio decoded successfully, playing...');
        
        // Determine and capture the audio type
        let audioType: 'greeting' | 'response';
        
        if (expectingGreeting) {
          // This is greeting audio from initial connection
          console.log('🎵 Playing greeting audio from server');
          audioType = 'greeting';
          setIsGreetingAudioPlaying(true);
          setExpectingGreeting(false); // Reset the flag
          setConnectionMessage('');
        } else {
          // This is AI response audio after user speech (streaming optimization)
          console.log('🤖 Playing AI response audio (after partial text display)');
          audioType = 'response';
          setIsAIResponsePlaying(true);
          setIsProcessing(false);
          setIsWaitingForAudio(false); // Audio has arrived
          setConnectionMessage('');
        }
        
        // Create audio source
        const source = audioContext.createBufferSource();
        source.buffer = decodedData;
        source.connect(audioContext.destination);
        
        // Store reference for cleanup
        webAudioSourceRef.current = source;
        
        // Play the audio
        source.start(0);
        
        source.onended = () => {
          console.log(`🎵 ${audioType} audio finished playing`);
          if (audioType === 'greeting') {
            console.log('✅ Greeting audio completed');
            setIsGreetingAudioPlaying(false);
          } else if (audioType === 'response') {
            console.log('🤖 AI response audio completed');
            setIsAIResponsePlaying(false);
            // Clear response text after audio finishes
            setTimeout(() => {
              setFinalResponse('');
              setPartialResponse('');
              setTranscribedText('');
            }, 2000);
          }
          // Clear the reference when audio finishes
          webAudioSourceRef.current = null;
        };
        
      }, (error) => {
        console.error('❌ Error decoding audio data:', error);
        if (isGreetingAudioPlaying) {
          setIsGreetingAudioPlaying(false);
        }
        if (isAIResponsePlaying) {
          setIsAIResponsePlaying(false);
        }
        setIsProcessing(false);
        setIsWaitingForAudio(false);
        setExpectingGreeting(false);
        webAudioSourceRef.current = null;
      });
      
    } catch (error) {
      console.error('❌ Error playing audio data:', error);
      if (isGreetingAudioPlaying) {
        setIsGreetingAudioPlaying(false);
      }
      if (isAIResponsePlaying) {
        setIsAIResponsePlaying(false);
      }
      setIsProcessing(false);
      setIsWaitingForAudio(false);
      setExpectingGreeting(false);
      webAudioSourceRef.current = null;
    }
  };

  const handleWebSocketClose = () => {
    console.log('🔌 WebSocket connection closed');
    setConnectionState('disconnected');
    setConnectionMessage('Connection lost');
    setIsGreetingAudioPlaying(false);
    setIsAIResponsePlaying(false);
    setIsProcessing(false);
    setExpectingGreeting(false);
  };

  // Send greeting message after connection is established
  const sendGreetingMessage = () => {
    const userName = getUserName();
    console.log(`👋 Sending greeting message for user: ${userName}`);
    
    // Set flag to expect greeting audio
    setExpectingGreeting(true);
    
    const success = sendEnglishOnlyMessage({
      type: 'greeting',
      user_name: userName,
    });
    
    if (success) {
      console.log('✅ Greeting message sent successfully');
      setConnectionMessage('Requesting personalized greeting...');
    } else {
      console.error('❌ Failed to send greeting message');
      setConnectionMessage('Failed to request greeting');
      setExpectingGreeting(false);
    }
  };

  // Connect to WebSocket
  const connectToWebSocket = () => {
    console.log('🔌 Initiating WebSocket connection to English-only endpoint...');
    setConnectionState('connecting');
    setConnectionMessage('Connecting to learning service...');

    // Connect to English-only WebSocket endpoint
    connectEnglishOnlySocket(
      handleWebSocketMessage,
      handleAudioData,
      handleWebSocketClose
    );

    // Check connection status periodically
    const connectionCheckInterval = setInterval(() => {
      if (isEnglishOnlySocketConnected()) {
        console.log('✅ WebSocket connection verified');
        setConnectionState('connected');
        setConnectionMessage('Connected to learning service');
        clearInterval(connectionCheckInterval);
        
        // Send greeting message after connection is established
        setTimeout(() => {
          sendGreetingMessage();
        }, 500);
        
        // Clear the connection message after a short delay (only if no greeting audio is playing)
        setTimeout(() => {
          if (!isGreetingAudioPlaying) {
            setConnectionMessage('');
          }
        }, 3000);
      }
    }, 100);

    // Connection timeout
    setTimeout(() => {
      if (!isEnglishOnlySocketConnected()) {
        console.log('⚠️ WebSocket connection timeout');
        setConnectionState('error');
        setConnectionMessage('Connection failed. Please try again.');
        clearInterval(connectionCheckInterval);
      }
    }, 15000);
  };

  const handleStartPracticing = () => {
    // Stop any playing audio before transitioning
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Connect to WebSocket and transition to practice view
    connectToWebSocket();
    setCurrentView('practice');
  };

  const handleBackToGreeting = () => {
    console.log('🔙 Going back to greeting - stopping all audio');
    
    // Stop HTML Audio element (greeting audio)
    if (audioRef.current && !audioRef.current.paused) {
      console.log('⏸️ Stopping HTML audio due to close button click');
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsAudioPlaying(false);
    }
    
    // Stop Web Audio API source (WebSocket audio)
    if (webAudioSourceRef.current) {
      try {
        console.log('⏸️ Stopping Web Audio source due to close button click');
        webAudioSourceRef.current.stop();
        webAudioSourceRef.current.disconnect();
        webAudioSourceRef.current = null;
      } catch (error) {
        // AudioBufferSourceNode can only be stopped once
        console.log('Web audio source already stopped');
        webAudioSourceRef.current = null;
      }
    }
    
    // Stop any ongoing recording
    stopRecording();
    cleanupAudioResources();
    
    // Disconnect WebSocket when going back
    disconnectEnglishOnlySocket();
    setConnectionState('disconnected');
    setConnectionMessage('');
    setIsGreetingAudioPlaying(false);
    setIsAIResponsePlaying(false);
    setIsProcessing(false);
    setExpectingGreeting(false);
    setTranscribedText('');
    setPartialResponse('');
    setFinalResponse('');
    setIsWaitingForAudio(false);
    setCurrentView('greeting');
    setIsListening(false);
    // Don't reset audio played status - it should remain played
  };

  const handleMicToggle = async () => {
    if (connectionState !== 'connected') {
      console.log('⚠️ Cannot start listening: WebSocket not connected');
      return;
    }
    
    // Don't allow mic toggle while greeting audio is playing, AI responding, processing, or waiting for audio
    if (isGreetingAudioPlaying || isAIResponsePlaying || isProcessing || isWaitingForAudio) {
      console.log('⚠️ Cannot start listening: System is busy');
      return;
    }
    
    if (isRecording) {
      // Stop recording
      stopRecording();
    } else {
      // Start recording
      await startRecording();
    }
  };

  // Get status message for the practice screen
  const getStatusMessage = () => {
    if (connectionState !== 'connected') {
      return 'Connecting to service...';
    } else if (isGreetingAudioPlaying) {
      return 'Welcome';
    } else if (isAIResponsePlaying) {
      return 'AI Speaking...';
    } else if (isWaitingForAudio) {
      return 'Generating audio...';
    } else if (isProcessing) {
      return transcribedText ? 'Analyzing...' : 'Processing...';
    } else if (isListening) {
      return 'Listening...';
    } else {
      return 'Tap microphone to start';
    }
  };
  
  // Get display text (prioritize final, then partial, then transcribed)
  const getDisplayText = () => {
    if (finalResponse) return finalResponse;
    if (partialResponse) return partialResponse;
    if (transcribedText) return `You said: "${transcribedText}"`;
    return null;
  };

  // Get blob visual state - different colors/effects for different states
  const getBlobState = () => {
    if (isListening) {
      return {
        bgColor: 'bg-[#1582B4]/20 border-[#1582B4]/30 shadow-lg shadow-[#1582B4]/20',
        innerGlow: 'bg-gradient-to-br from-primary/30 to-primary/10',
        pulseColor: 'border-[#1582B4]/40',
        pulseBorder: 'border-[#1582B4]/30',
        dotColor: 'bg-[#1582B4]'
      };
    } else if (isGreetingAudioPlaying) {
      return {
        bgColor: 'bg-green-500/20 border-green-500/30 shadow-lg shadow-green-500/20',
        innerGlow: 'bg-gradient-to-br from-green-500/30 to-green-500/10',
        pulseColor: 'border-green-500/40',
        pulseBorder: 'border-green-500/30',
        dotColor: 'bg-green-500'
      };
    } else if (isAIResponsePlaying) {
      return {
        bgColor: 'bg-purple-500/20 border-purple-500/30 shadow-lg shadow-purple-500/20',
        innerGlow: 'bg-gradient-to-br from-purple-500/30 to-purple-500/10',
        pulseColor: 'border-purple-500/40',
        pulseBorder: 'border-purple-500/30',
        dotColor: 'bg-purple-500'
      };
    } else if (isProcessing || isWaitingForAudio) {
      return {
        bgColor: 'bg-amber-500/20 border-amber-500/30 shadow-lg shadow-amber-500/20',
        innerGlow: 'bg-gradient-to-br from-amber-500/30 to-amber-500/10',
        pulseColor: 'border-amber-500/40',
        pulseBorder: 'border-amber-500/30',
        dotColor: 'bg-amber-500'
      };
    } else {
      // Default inactive state
      return {
        bgColor: 'bg-muted/30 border-muted/50',
        innerGlow: 'bg-gradient-to-br from-muted/20 to-transparent',
        pulseColor: 'border-primary/40',
        pulseBorder: 'border-primary/30',
        dotColor: 'bg-muted-foreground/50'
      };
    }
  };

  const blobState = getBlobState();
  const isActiveState = isListening || isGreetingAudioPlaying || isAIResponsePlaying || isProcessing || isWaitingForAudio;

  // Greeting Screen (View 1)
  if (currentView === 'greeting') {
    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8 p-3 sm:p-4 md:p-6">
        {/* Premium Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-2xl sm:rounded-3xl"></div>
          <div className="relative p-4 sm:p-6 md:p-8 lg:p-10 rounded-2xl sm:rounded-3xl">
            <div className="flex flex-col gap-3 sm:gap-4 md:gap-6">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-primary leading-[1.2]">
                    AI Learning Hub
                  </h1>
                  <p className="text-sm sm:text-base md:text-lg text-muted-foreground font-light mt-1 sm:mt-2 md:mt-4 leading-relaxed">
                    Master English through intelligent conversation and personalized guidance
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Content */}
        <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6 md:space-y-8">
          {/* Enhanced Logo/Icon */}
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center shadow-lg border border-primary/20">
              <Target className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-primary" />
            </div>
            {isAudioPlaying && (
              <div className="absolute -inset-2 border-2 border-primary rounded-full animate-ping opacity-75"></div>
            )}
          </div>

          {/* Enhanced Welcome Text */}
          <div className="text-center space-y-2 sm:space-y-3 md:space-y-4 max-w-md px-4 sm:px-0">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
              Welcome to Your Learning Journey
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
              Let's begin your English speaking adventure with AI-powered guidance
            </p>
          </div>

          {/* Enhanced Greeting Message Card */}
          <Card className="p-4 sm:p-5 md:p-6 max-w-md w-full mx-3 sm:mx-0 bg-gradient-to-br from-white/50 via-white/30 to-gray-50/30 dark:from-gray-900/50 dark:via-gray-900/30 dark:to-gray-800/30 rounded-xl sm:rounded-2xl border border-border/50">
            <div className="text-center space-y-2 sm:space-y-3">
              <p className="text-base sm:text-lg font-medium text-foreground" dir="rtl">
                سیکھنے کے پلیٹ فارم میں خوش آمدید، آئیے انگریزی سیکھتے ہیں؟
              </p>
              <p className="text-sm sm:text-base text-muted-foreground">
                Welcome to the learning platform, shall we learn English?
              </p>
            </div>
          </Card>

          {/* Enhanced Audio Playing Indicator */}
          {isAudioPlaying && (
            <div className="flex items-center gap-2 sm:gap-3 text-primary bg-primary/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
              <Volume2 className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
              <span className="text-xs sm:text-sm font-medium">Playing greeting...</span>
            </div>
          )}

          {/* Enhanced Start Practicing Button */}
          <div className={`transition-all duration-500 ${
            showStartButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}>
            <Button
              onClick={handleStartPracticing}
              size="lg"
              className="group bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold px-5 sm:px-6 md:px-8 py-3 sm:py-3.5 md:py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 text-sm sm:text-base"
            >
              <Target className="h-4 w-4 sm:h-5 sm:w-5 mr-2 group-hover:animate-pulse" />
              Continue to Learning
              <span className="ml-2">→</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Practice Conversation Screen (View 2)
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 p-3 sm:p-4 md:p-6">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/3 to-[#1582B4]/5 rounded-2xl sm:rounded-3xl"></div>
        <div className="relative p-3 sm:p-4 md:p-6 lg:p-8 rounded-2xl sm:rounded-3xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-primary">AI Learning Hub</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Active Learning Session</p>
              </div>
            </div>
            
            {/* Enhanced Connection Status Indicator */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50">
              {connectionState === 'connected' ? (
                <Wifi className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
              ) : connectionState === 'connecting' ? (
                <Wifi className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500 animate-pulse" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
              )}
              <span className="text-[10px] sm:text-xs font-medium">
                {connectionState === 'connected' ? 'Connected' : 
                 connectionState === 'connecting' ? 'Connecting...' : 
                 connectionState === 'error' ? 'Error' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Conversation Interface */}
      <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6 md:space-y-8">
        {/* Enhanced Main Conversation Blob */}
        <div className={`relative transition-all duration-300 ${
          isActiveState ? 'scale-105 sm:scale-110' : 'scale-100'
        }`}>
          {/* Main Blob with dynamic colors */}
          <div className={`w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-80 lg:h-80 rounded-full backdrop-blur-sm border transition-all duration-500 ${blobState.bgColor}`}>
            {/* Inner glow effect with dynamic colors */}
            <div className={`absolute inset-3 sm:inset-4 rounded-full transition-all duration-500 ${blobState.innerGlow}`}></div>
            
            {/* Pulse effect with dynamic colors */}
            {isActiveState && (
              <>
                <div className={`absolute inset-0 rounded-full border-2 animate-ping ${blobState.pulseColor}`}></div>
                <div className={`absolute inset-2 rounded-full border animate-ping delay-200 ${blobState.pulseBorder}`}></div>
              </>
            )}
          </div>

          {/* Enhanced Status indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2 sm:space-y-3 px-3 sm:px-4">
              <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full mx-auto transition-all duration-300 ${
                isActiveState ? `${blobState.dotColor} animate-pulse` : blobState.dotColor
              }`}></div>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                {getStatusMessage()}
              </p>
            </div>
          </div>
        </div>

        {/* Response Text Display (Streaming Optimization) */}
        {getDisplayText() && (
          <Card className="w-full max-w-2xl mx-3 sm:mx-0 p-3 sm:p-4 md:p-6 bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-xl sm:rounded-2xl shadow-lg">
            <CardContent className="p-0">
              <div className="space-y-1.5 sm:space-y-2">
                {transcribedText && (
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1.5 sm:mb-2">
                    <span className="font-semibold">You:</span> {transcribedText}
                  </div>
                )}
                {(partialResponse || finalResponse) && (
                  <div className="text-xs sm:text-sm md:text-base text-foreground">
                    <span className="font-semibold text-primary">AI:</span>{' '}
                    <span className={partialResponse && !finalResponse ? 'opacity-70' : ''}>
                      {finalResponse || partialResponse}
                    </span>
                    {partialResponse && !finalResponse && (
                      <span className="inline-block w-1.5 sm:w-2 h-3 sm:h-4 ml-1 bg-primary animate-pulse" />
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Microphone Button */}
        <div className="flex flex-col items-center space-y-3 sm:space-y-4">
          <button
            onClick={handleMicToggle}
            disabled={connectionState !== 'connected' || isGreetingAudioPlaying || isAIResponsePlaying || isProcessing || isWaitingForAudio}
            className={`w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full shadow-lg transition-all duration-200 ${
              (connectionState !== 'connected' || isGreetingAudioPlaying || isAIResponsePlaying || isProcessing || isWaitingForAudio)
                ? 'bg-muted cursor-not-allowed opacity-50'
                : isListening 
                  ? 'bg-primary hover:bg-primary/90 scale-105 sm:scale-110' 
                  : 'bg-primary hover:bg-primary/90'
            }`}
          >
            <Mic className={`h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 mx-auto ${
              (connectionState !== 'connected' || isGreetingAudioPlaying || isAIResponsePlaying || isProcessing || isWaitingForAudio) 
                ? 'text-muted-foreground' 
                : 'text-primary-foreground'
            }`} />
          </button>
          
          <p className="text-[10px] sm:text-xs text-muted-foreground text-center max-w-xs px-3 sm:px-0">
            Tap the microphone to start speaking with your AI tutor
          </p>
        </div>
      </div>

      {/* Enhanced Back Button */}
      <div className="flex justify-center">
        <button
          onClick={handleBackToGreeting}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          End Session
        </button>
      </div>
    </div>
  );
};