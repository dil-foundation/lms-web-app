import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Mic, X, Target, Volume2, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { connectLearnSocket, sendLearnMessage, closeLearnSocket, WebSocketMessage, isMockMode, getSocketState, waitForWebSocketReady } from '../../utils/websocket';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';

type LearnStep = 'welcome' | 'translate' | 'conversation';
type ConversationState = 'waiting' | 'listening' | 'processing' | 'speaking' | 'playing_intro' | 'word_by_word';
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
  
  const { isRecording, audioBlob, startRecording, stopRecording, error: recordingError } = useAudioRecorder();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Helper function for translations
  const t = useCallback((en: string, ur: string): string => languageMode === 'english' ? en : ur, [languageMode]);

  // Cleanup audio resources
  const cleanupAudio = useCallback((): void => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
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
    console.log('WebSocket message:', data);
    setConversationState((data.step as ConversationState) || 'waiting');
    setCurrentMessage(data.response || '');
    
    switch (data.step) {
      case 'retry':
        setCurrentMessage(languageMode === 'english' ? 'Try again' : 'دوبارہ کوشش کریں');
        break;
      case 'repeat_prompt':
        if (data.words && Array.isArray(data.words)) {
          playWordByWord(data.words);
        }
        break;
      case 'feedback_step':
        setCurrentMessage(data.response || (languageMode === 'english' ? 'Here is your feedback' : 'یہاں آپ کی رائے ہے'));
        break;
      default:
        break;
    }
  }, [languageMode]);

  const handleAudioData = useCallback((audioBuffer: ArrayBuffer): void => {
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(blob);
    playAudio(audioUrl);
    setConversationState('speaking');
  }, []);

  const handleConnectionClose = useCallback((): void => {
    setIsConnected(false);
    setConversationState('waiting');
    setCurrentMessage(languageMode === 'english' ? 'Connection lost. Please try again.' : 'کنکشن ٹوٹ گیا۔ دوبارہ کوشش کریں۔');
  }, [languageMode]);

  // Handle WebSocket reconnection
  const handleReconnect = useCallback((): void => {
    console.log('WebSocket reconnected');
    setIsConnected(true);
    setCurrentMessage(languageMode === 'english' ? 'Reconnected successfully' : 'کامیابی سے دوبارہ جڑ گیا');
  }, [languageMode]);

  const handleError = useCallback((error: Event): void => {
    console.error('WebSocket error:', error);
    setCurrentMessage(languageMode === 'english' ? 'Connection error. Retrying...' : 'کنکشن میں خرابی۔ دوبارہ کوشش کر رہے ہیں...');
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
            setCurrentMessage(languageMode === 'english' ? 'Connected successfully' : 'کامیابی سے جڑ گئے');
            
            setTimeout(() => {
              if (isCurrentConnection) {
                setIsConnected(true);
                setCurrentMessage(languageMode === 'english' ? 'Ready to listen' : 'سننے کے لیے تیار');
                
                // Play intro audio only once
                if (!hasPlayedGreeting) {
                  playIntroAudio();
                  setHasPlayedGreeting(true);
                }
              }
            }, 300);
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
    setConversationState('word_by_word');
    setCurrentMessage(languageMode === 'english' ? 'Listen and repeat' : 'سنیں اور دہرائیں');
    
    words.forEach((word: string, index: number) => {
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.rate = 0.5;
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
      }, index * 1000);
    });
    
    setTimeout(() => {
      setConversationState('waiting');
      setCurrentMessage(languageMode === 'english' ? 'Now you try!' : 'اب آپ کوشش کریں!');
    }, words.length * 1000 + 1000);
  }, [languageMode]);

  const uploadAudio = useCallback(async (blob: Blob): Promise<void> => {
    try {
      setConversationState('processing');
      setCurrentMessage(languageMode === 'english' ? 'Processing your speech...' : 'آپ کی بات پروسیس کر رہے ہیں...');
      
      // Check connection state before processing
      const socketState = getSocketState();
      console.log('Current socket state before upload:', socketState);
      
      if (!isConnected && !isMockMode()) {
        console.error('Cannot upload audio: WebSocket not connected');
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
            
            console.log('Attempting to send audio message...');
            
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
                console.error('Failed to send audio message');
                setConversationState('waiting');
                setCurrentMessage(languageMode === 'english' ? 'Failed to send audio' : 'آڈیو بھیجنے میں ناکامی');
              } else {
                console.log('Audio message sent successfully');
                
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
  }, [languageMode, isConnected]);

  const handleMicPress = useCallback((): void => {
    if (conversationState === 'processing' || conversationState === 'speaking') return;
    
    console.log('Starting recording...');
    setConversationState('listening');
    setCurrentMessage(languageMode === 'english' ? 'Hold the button and speak clearly...' : 'بٹن دبائیں اور صاف بولیں...');
    
    startRecording().catch((error: Error) => {
      console.error('Error starting recording:', error);
      setConversationState('waiting');
      setCurrentMessage(languageMode === 'english' ? 'Microphone access denied' : 'مائیکروفون کی رسائی مسترد');
    });
  }, [conversationState, startRecording, languageMode]);

  const handleMicRelease = useCallback((): void => {
    if (isRecording) {
      console.log('Stopping recording...');
      setCurrentMessage(languageMode === 'english' ? 'Processing your recording...' : 'آپ کی ریکارڈنگ پروسیس کر رہے ہیں...');
      stopRecording();
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
            {isConnected ? (isMockMode() ? 'Connected (Demo Mode)' : 'Connected') : 'Disconnected'}
          </span>
        </div>
      </Card>
      
      {/* Error Banner */}
      {(recordingError || !isConnected) && (
        <Card className="w-full max-w-md shadow-lg mb-4 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <X className="w-4 h-4" />
              <p className="text-sm font-medium">
                {recordingError || (languageMode === 'english' ? 'Connection lost' : 'کنکشن ٹوٹ گیا')}
              </p>
            </div>
            {recordingError && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 text-red-700 border-red-300 hover:bg-red-100"
                onClick={() => window.location.reload()}
              >
                {languageMode === 'english' ? 'Refresh Page' : 'صفحہ تازہ کریں'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      
      <Card className="w-full max-w-md shadow-lg mb-12">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-2">
            {conversationState === 'speaking' && <Volume2 className="w-4 h-4 text-green-500" />}
            <Badge variant="outline" className={`${getStatusColor()} text-white`}>
              {conversationState.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {displayMessage}
          </p>
        </CardContent>
      </Card>
      
      <div className="relative mb-12">
        <div className={`w-64 h-64 border-4 border-dashed rounded-full flex items-center justify-center transition-all duration-300 ${
          conversationState === 'listening' ? 'border-blue-500 bg-blue-50' :
          conversationState === 'processing' ? 'border-orange-500 bg-orange-50' :
          conversationState === 'speaking' ? 'border-green-500 bg-green-50' :
          recordingError ? 'border-red-500 bg-red-50' :
          !isConnected ? 'border-gray-400 bg-gray-50' :
          'border-gray-300'
        }`}>
          <div className="text-center">
            <Mic className={`w-16 h-16 mx-auto mb-2 ${
              conversationState === 'listening' ? 'text-blue-500' :
              conversationState === 'processing' ? 'text-orange-500' :
              conversationState === 'speaking' ? 'text-green-500' :
              recordingError ? 'text-red-500' :
              !isConnected ? 'text-gray-400' :
              'text-gray-400'
            }`} />
            <p className="text-sm text-muted-foreground">
              {conversationState === 'listening' ? (languageMode === 'english' ? 'Listening...' : 'سن رہے ہیں...') :
               conversationState === 'processing' ? (languageMode === 'english' ? 'Processing...' : 'پروسیسنگ...') :
               conversationState === 'speaking' ? (languageMode === 'english' ? 'AI Speaking...' : 'AI بول رہا ہے...') :
               recordingError ? (languageMode === 'english' ? 'Error' : 'خرابی') :
               !isConnected ? (languageMode === 'english' ? 'Disconnected' : 'ڈسکنیکٹ') :
               (languageMode === 'english' ? 'Ready to listen' : 'سننے کے لیے تیار')}
            </p>
          </div>
        </div>
      </div>
      
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
        <Button 
          size="icon" 
          className={`w-24 h-24 rounded-full transition-all duration-200 ${
            isRecording ? 'bg-red-500 hover:bg-red-600 scale-110' : 
            !isConnected || recordingError ? 'bg-gray-400 cursor-not-allowed' :
            'bg-green-500 hover:bg-green-600'
          }`}
          onMouseDown={handleMicPress}
          onMouseUp={handleMicRelease}
          onMouseLeave={handleMicRelease}
          disabled={conversationState === 'processing' || conversationState === 'speaking' || !isConnected || !!recordingError}
          title={!isConnected ? (languageMode === 'english' ? 'Connect first' : 'پہلے کنکٹ کریں') : 
                 recordingError ? (languageMode === 'english' ? 'Fix microphone error' : 'مائیکروفون کی خرابی ٹھیک کریں') :
                 (languageMode === 'english' ? 'Press and hold to speak' : 'بولنے کے لیے دبائیں اور رکھیں')}
        >
          <Mic className="w-12 h-12" />
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground mt-4">
        {!isConnected ? (languageMode === 'english' ? 'Please wait for connection' : 'کنکشن کا انتظار کریں') :
         recordingError ? (languageMode === 'english' ? 'Please refresh the page' : 'برائے کرم صفحہ تازہ کریں') :
         conversationState === 'listening' ? (languageMode === 'english' ? 'Keep holding and speak now...' : 'بٹن دبائے رکھیں اور اب بولیں...') :
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