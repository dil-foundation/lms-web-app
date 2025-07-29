import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Target, Mic, X, Volume2, Wifi, WifiOff } from 'lucide-react';
import { 
  connectEnglishOnlySocket, 
  disconnectEnglishOnlySocket, 
  isEnglishOnlySocketConnected,
  sendEnglishOnlyMessage 
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
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const greetingAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const webAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  // Get user information
  const { user } = useAuth();
  const { profile } = useUserProfile();

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

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // Remove the data:audio/webm;codecs=opus;base64, prefix
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Process recorded audio and send to server
  const processRecordedAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      console.log('⚠️ No audio chunks to process');
      setIsProcessing(false);
      return;
    }

    try {
      setIsProcessing(true);
      console.log('🔄 Processing recorded audio...');
      
      // Create blob from audio chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
      console.log('📦 Audio blob created:', audioBlob.size, 'bytes');
      
      // Convert to base64
      const base64Audio = await blobToBase64(audioBlob);
      console.log('🔤 Audio converted to base64:', base64Audio.length, 'characters');
      
      // Send message to server
      const userName = getUserName();
      const messagePayload = {
        audio_base64: base64Audio,
        filename: `english_only_recording-${Date.now()}.wav`,
        user_name: userName,
      };
      
      console.log('📤 Sending audio to server for processing...');
      const success = sendEnglishOnlyMessage(messagePayload);
      
      if (success) {
        console.log('✅ Audio sent successfully');
        setConnectionMessage('Processing your speech...');
      } else {
        console.error('❌ Failed to send audio');
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

  // Handle audio playback and visibility change
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

    // Handle tab visibility change - stop audio if tab becomes hidden
    const handleVisibilityChange = () => {
      if (document.hidden && audio && !audio.paused) {
        console.log('⏸️ Stopping audio due to tab visibility change');
        audio.pause();
        audio.currentTime = 0;
        setIsAudioPlaying(false);
        setShowStartButton(true);
        sessionStorage.setItem(AUDIO_PLAYED_KEY, 'true');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

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
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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

  // WebSocket event handlers
  const handleWebSocketMessage = (data: any) => {
    console.log('📨 Received WebSocket message:', data);
    
    // Handle different message types
    if (data.type === 'greeting_audio') {
      console.log('🎵 Received greeting audio response');
      // The audio should be handled by handleAudioData function
    } else if (data.type === 'audio_response') {
      console.log('🎵 Received audio processing response');
      // The audio should be handled by handleAudioData function
      setIsProcessing(false);
      setConnectionMessage('');
    }
    
    // Handle other message types as needed
    // This will be expanded later based on the message types
  };

  const handleAudioData = (audioBuffer: ArrayBuffer) => {
    console.log('🎵 Received audio data:', audioBuffer.byteLength, 'bytes');
    
    try {
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
          // This is AI response audio after user speech
          console.log('🤖 Playing AI response audio');
          audioType = 'response';
          setIsAIResponsePlaying(true);
          setIsProcessing(false);
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
          }
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
        setExpectingGreeting(false);
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
      setExpectingGreeting(false);
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
    setCurrentView('greeting');
    setIsListening(false);
    // Don't reset audio played status - it should remain played
  };

  const handleMicToggle = async () => {
    if (connectionState !== 'connected') {
      console.log('⚠️ Cannot start listening: WebSocket not connected');
      return;
    }
    
    // Don't allow mic toggle while greeting audio is playing, AI responding, or processing
    if (isGreetingAudioPlaying || isAIResponsePlaying || isProcessing) {
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
    } else if (isProcessing) {
      return 'Processing...';
    } else if (isListening) {
      return 'Listening...';
    } else {
      return 'Tap microphone to start';
    }
  };

  // Get blob visual state - different colors/effects for different states
  const getBlobState = () => {
    if (isListening) {
      return {
        bgColor: 'bg-blue-500/20 border-blue-500/30 shadow-lg shadow-blue-500/20',
        innerGlow: 'bg-gradient-to-br from-blue-500/30 to-blue-500/10',
        pulseColor: 'border-blue-500/40',
        pulseBorder: 'border-blue-500/30',
        dotColor: 'bg-blue-500'
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
    } else if (isProcessing) {
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
  const isActiveState = isListening || isGreetingAudioPlaying || isAIResponsePlaying || isProcessing;

  // Greeting Screen (View 1)
  if (currentView === 'greeting') {
    return (
      <div className="bg-background flex flex-col items-center justify-center p-4 space-y-8">
        {/* Logo/Icon */}
        <div className="relative">
          <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-lg">
            <Target className="h-10 w-10 text-primary-foreground" />
          </div>
          {isAudioPlaying && (
            <div className="absolute -inset-2 border-2 border-primary rounded-full animate-ping opacity-75"></div>
          )}
        </div>

        {/* Welcome Text */}
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome to Your Learning Journey
          </h1>
          <p className="text-lg text-muted-foreground">
            Let's begin your English speaking adventure
          </p>
        </div>

        {/* Greeting Message Card */}
        <Card className="p-6 max-w-md w-full bg-muted/30 border-0 rounded-2xl">
          <div className="text-center space-y-3">
            <p className="text-lg font-medium text-foreground" dir="rtl">
              سیکھنے کے پلیٹ فارم میں خوش آمدید، آئیے انگریزی سیکھتے ہیں؟
            </p>
            <p className="text-base text-muted-foreground">
              Welcome to the learning platform, shall we learn English?
            </p>
          </div>
        </Card>

        {/* Audio Playing Indicator */}
        {isAudioPlaying && (
          <div className="flex items-center gap-3 text-primary">
            <Volume2 className="h-5 w-5 animate-pulse" />
            <span className="text-sm font-medium">Playing greeting...</span>
          </div>
        )}

        {/* Start Practicing Button */}
        <div className={`transition-all duration-500 ${
          showStartButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}>
          <Button
            onClick={handleStartPracticing}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Target className="h-5 w-5 mr-2" />
            Continue to Learning
            <span className="ml-2">→</span>
          </Button>
        </div>
      </div>
    );
  }

  // Practice Conversation Screen (View 2)
  return (
    <div className=" bg-background flex flex-col items-center justify-center p-4 relative">
      {/* Back Button */}
      <button
        onClick={handleBackToGreeting}
        className="absolute top-8 left-8 w-12 h-12 bg-destructive/10 hover:bg-destructive/20 border-2 border-destructive/20 rounded-full flex items-center justify-center transition-all duration-200"
      >
        <X className="h-5 w-5 text-destructive" />
      </button>

      {/* Connection Status Indicator */}
      <div className="absolute top-8 right-8 flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 border">
        {connectionState === 'connected' ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : connectionState === 'connecting' ? (
          <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        <span className="text-xs font-medium">
          {connectionState === 'connected' ? 'Connected' : 
           connectionState === 'connecting' ? 'Connecting...' : 
           connectionState === 'error' ? 'Error' : 'Disconnected'}
        </span>
      </div>

      {/* Main Conversation Blob */}
      <div className="flex-1 flex items-center justify-center mt-10 pt-10">
        <div className={`relative transition-all duration-300 ${
          isActiveState ? 'scale-110' : 'scale-100'
        }`}>
          {/* Main Blob with dynamic colors */}
          <div className={`w-80 h-80 rounded-full backdrop-blur-sm border transition-all duration-500 ${blobState.bgColor}`}>
            {/* Inner glow effect with dynamic colors */}
            <div className={`absolute inset-4 rounded-full transition-all duration-500 ${blobState.innerGlow}`}></div>
            
            {/* Pulse effect with dynamic colors */}
            {isActiveState && (
              <>
                <div className={`absolute inset-0 rounded-full border-2 animate-ping ${blobState.pulseColor}`}></div>
                <div className={`absolute inset-2 rounded-full border animate-ping delay-200 ${blobState.pulseBorder}`}></div>
              </>
            )}
          </div>

          {/* Status indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className={`w-3 h-3 rounded-full mx-auto transition-all duration-300 ${
                isActiveState ? `${blobState.dotColor} animate-pulse` : blobState.dotColor
              }`}></div>
              <p className="text-sm text-muted-foreground font-medium">
                {getStatusMessage()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Microphone Button */}
      <div className="pb-8 pt-10 mt-10">
        <button
          onClick={handleMicToggle}
          disabled={connectionState !== 'connected' || isGreetingAudioPlaying || isAIResponsePlaying || isProcessing}
          className={`w-20 h-20 rounded-full shadow-lg transition-all duration-200 ${
            (connectionState !== 'connected' || isGreetingAudioPlaying || isAIResponsePlaying || isProcessing)
              ? 'bg-muted cursor-not-allowed opacity-50'
              : isListening 
                ? 'bg-primary hover:bg-primary/90 scale-110' 
                : 'bg-primary hover:bg-primary/90'
          }`}
        >
          <Mic className={`h-8 w-8 mx-auto ${
            (connectionState !== 'connected' || isGreetingAudioPlaying || isAIResponsePlaying || isProcessing) 
              ? 'text-muted-foreground' 
              : 'text-primary-foreground'
          }`} />
        </button>
      </div>

    </div>
  );
};