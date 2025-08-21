import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { ArrowLeft, BookOpen, Mic, Lightbulb, Play, Pause, Loader2, CheckCircle, XCircle, MessageSquare, Trophy, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';
import { useAuth } from '@/hooks/useAuth';
import { getAuthHeadersWithAccept, getAuthHeaders } from '@/utils/authUtils';

// TypeScript interfaces
interface StorytellingPrompt {
  id: string;
  title: string;
  prompt: string;
  hints: string[];
  example_keywords: string[];
  model_answer: string;
  order_index: number;
  stage: number;
  created_at: string;
  updated_at?: string;
}

interface StorytellingPromptResponse {
  prompts: StorytellingPrompt[];
  total: number;
}

interface EvaluationFeedback {
  score?: number;
  feedback?: string;
  accuracy?: number;
  pronunciation?: string;
  suggestions?: string[];
  suggested_improvement?: string;
  message?: string;
}

// API Functions
const fetchStorytellingPrompts = async (): Promise<StorytellingPrompt[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.STORYTELLING_PROMPTS}`, {
      method: 'GET',
      headers: getAuthHeadersWithAccept(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response text');
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const responseText = await response.text();
    
    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Invalid JSON response from server');
    }

    // Handle different possible response formats
    let prompts: any[] = [];

    if (Array.isArray(result)) {
      prompts = result;
    } else if (result && typeof result === 'object' && result.data && Array.isArray(result.data)) {
      prompts = result.data;
    } else if (result && typeof result === 'object' && result.prompts && Array.isArray(result.prompts)) {
      prompts = result.prompts;
    } else if (result && typeof result === 'object') {
      const arrayProperties = Object.keys(result).filter(key => Array.isArray(result[key]));
      if (arrayProperties.length > 0) {
        prompts = result[arrayProperties[0]];
      } else {
        throw new Error('No array of prompts found in response');
      }
    } else {
      throw new Error('Invalid response format: expected array or object with prompts');
    }

    // Validate and transform prompts data
    const validPrompts: StorytellingPrompt[] = prompts.map((prompt: any, index: number) => {
      if (!prompt || typeof prompt !== 'object') {
        throw new Error(`Invalid prompt data at index ${index}`);
      }

      return {
        id: prompt.id || `prompt-${index}`,
        title: prompt.title || `Story Prompt ${index + 1}`,
        prompt: prompt.prompt || prompt.question || prompt.text || '',
        hints: Array.isArray(prompt.hints) ? prompt.hints : (prompt.hints ? [prompt.hints] : []),
        example_keywords: Array.isArray(prompt.example_keywords) ? prompt.example_keywords : (prompt.example_keywords ? [prompt.example_keywords] : []),
        model_answer: prompt.model_answer || prompt.sample_answer || prompt.example_answer || '',
        order_index: typeof prompt.order_index === 'number' ? prompt.order_index : index + 1,
        stage: typeof prompt.stage === 'number' ? prompt.stage : 3,
        created_at: prompt.created_at || new Date().toISOString(),
        updated_at: prompt.updated_at
      };
    });

    return validPrompts.sort((a, b) => a.order_index - b.order_index);

  } catch (error: any) {
    console.error('Error fetching storytelling prompts:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    
    if (error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    throw error;
  }
};

const fetchStorytellingPromptById = async (promptId: string): Promise<StorytellingPrompt> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.STORYTELLING_PROMPT_DETAIL(promptId)}`, {
      method: 'GET',
      headers: getAuthHeadersWithAccept(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Storytelling prompt not found');
      }
      const errorText = await response.text().catch(() => 'No response text');
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const result = await response.json();
    
    return {
      id: result.id,
      title: result.title,
      prompt: result.prompt,
      hints: Array.isArray(result.hints) ? result.hints : [],
      example_keywords: Array.isArray(result.example_keywords) ? result.example_keywords : [],
      model_answer: result.model_answer || result.sample_answer || result.example_answer || '',
      order_index: result.order_index || 1,
      stage: result.stage || 3,
      created_at: result.created_at || new Date().toISOString(),
      updated_at: result.updated_at
    };

  } catch (error: any) {
    console.error('Error fetching storytelling prompt by ID:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    
    if (error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    throw error;
  }
};

// Fetch audio for a storytelling prompt
const fetchStorytellingAudio = async (promptId: string): Promise<string> => {
  try {
    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.STORYTELLING_PROMPT_AUDIO(promptId)}`, {
      method: 'POST',
      headers: getAuthHeadersWithAccept(),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response text');
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const responseText = await response.text();
    
    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Invalid JSON response from server');
    }

    // Handle different possible response formats
    let audioUrl: string | null = null;
    
    if (typeof result === 'string') {
      audioUrl = result;
    } else if (result && typeof result === 'object') {
      // Check for base64 audio data first
      if (result.audio_base64) {
        try {
          const base64Data = result.audio_base64.replace(/^data:audio\/[^;]+;base64,/, '');
          
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
          audioUrl = URL.createObjectURL(audioBlob);
        } catch (base64Error) {
          throw new Error('Failed to process base64 audio data');
        }
      } else {
        audioUrl = result.audio_url || result.audioUrl || result.url || result.audio || result.file_url;
      }
    }

    if (!audioUrl) {
      throw new Error('No audio URL or base64 data found in response');
    }

    return audioUrl;
  } catch (error) {
    console.error('Error fetching storytelling audio:', error);
    throw error;
  }
};

export default function StorytellingPractice() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [feedback, setFeedback] = useState<EvaluationFeedback | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [storyPrompts, setStoryPrompts] = useState<StorytellingPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [showExample, setShowExample] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const hasFetchedData = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentStoryPrompt = storyPrompts[currentPrompt];

  // Timer effect for recording
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Cleanup audio and recording on component unmount
  useEffect(() => {
    return () => {
      cleanupCurrentAudio();
      // Stop any active recording
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      }
    };
  }, []);

  // Fetch storytelling prompts on component mount
  useEffect(() => {
    const fetchPrompts = async () => {
      if (hasFetchedData.current) return; // Prevent multiple calls
      hasFetchedData.current = true;
      
      try {
        setIsLoading(true);
        setError(null);
        // Fetch storytelling prompts
        const fetchedPrompts = await fetchStorytellingPrompts();
        if (fetchedPrompts && fetchedPrompts.length > 0) {
          setStoryPrompts(fetchedPrompts);
        } else {
          // Fallback to hardcoded prompts if API returns empty
          setStoryPrompts([
            {
              id: 'fallback-1',
              title: 'Share a Special Day',
              prompt: 'Tell me about a memorable day you had recently. What made it special?',
              hints: ['Use past tense verbs', 'Include details about what you did', 'Describe your feelings'],
              example_keywords: ['yesterday', 'exciting', 'memorable', 'enjoyed', 'special'],
              model_answer: 'Yesterday was really special because I went to the park with my family. We had a picnic and played games together. It was memorable because we laughed so much and enjoyed each other\'s company.',
              order_index: 1,
              stage: 3,
              created_at: new Date().toISOString()
            },
            {
              id: 'fallback-2',
              title: 'Describe Your Weekend',
              prompt: 'How did you spend your last weekend? What activities did you enjoy?',
              hints: ['Use sequence words like "first", "then", "after that"', 'Mention specific activities', 'Talk about who you were with'],
              example_keywords: ['weekend', 'Saturday', 'Sunday', 'activities', 'relaxing', 'fun'],
              model_answer: 'Last weekend was very relaxing. On Saturday, I went shopping with my friends, and then we had lunch at a nice restaurant. On Sunday, I stayed home and read a book. It was fun and peaceful.',
              order_index: 2,
              stage: 3,
              created_at: new Date().toISOString()
            },
            {
              id: 'fallback-3',
              title: 'A Favorite Memory',
              prompt: 'Share a favorite childhood memory. Why is it special to you?',
              hints: ['Use descriptive language', 'Explain why it was meaningful', 'Include sensory details'],
              example_keywords: ['childhood', 'remember', 'favorite', 'family', 'happy', 'nostalgic'],
              model_answer: 'My favorite childhood memory is when my grandmother taught me how to bake cookies. I remember the sweet smell of vanilla and the warm kitchen. It\'s special because it was our bonding time together.',
              order_index: 3,
              stage: 3,
              created_at: new Date().toISOString()
            },
            {
              id: 'fallback-4',
              title: 'Future Plans',
              prompt: 'What are your plans for the upcoming holidays or vacation?',
              hints: ['Use future tense', 'Be specific about activities', 'Mention who you plan to spend time with'],
              example_keywords: ['planning', 'vacation', 'holidays', 'travel', 'family', 'excited'],
              model_answer: 'I\'m planning to visit my relatives during the holidays. We\'re going to travel to the mountains and spend time together. I\'m excited because we haven\'t seen each other for a long time.',
              order_index: 4,
              stage: 3,
              created_at: new Date().toISOString()
            }
          ]);
        }
      } catch (err: any) {
        console.error('Error fetching storytelling prompts:', err);
        setError(err.message);
        // Use fallback prompts on error
        setStoryPrompts([
          {
            id: 'fallback-1',
            title: 'Share a Special Day',
            prompt: 'Tell me about a memorable day you had recently. What made it special?',
            hints: ['Use past tense verbs', 'Include details about what you did', 'Describe your feelings'],
            example_keywords: ['yesterday', 'exciting', 'memorable', 'enjoyed', 'special'],
            model_answer: 'Yesterday was really special because I went to the park with my family. We had a picnic and played games together. It was memorable because we laughed so much and enjoyed each other\'s company.',
            order_index: 1,
            stage: 3,
            created_at: new Date().toISOString()
          },
          {
            id: 'fallback-2',
            title: 'Describe Your Weekend',
            prompt: 'How did you spend your last weekend? What activities did you enjoy?',
            hints: ['Use sequence words like "first", "then", "after that"', 'Mention specific activities', 'Talk about who you were with'],
            example_keywords: ['weekend', 'Saturday', 'Sunday', 'activities', 'relaxing', 'fun'],
            model_answer: 'Last weekend was very relaxing. On Saturday, I went shopping with my friends, and then we had lunch at a nice restaurant. On Sunday, I stayed home and read a book. It was fun and peaceful.',
            order_index: 2,
            stage: 3,
            created_at: new Date().toISOString()
          },
          {
            id: 'fallback-3',
            title: 'A Favorite Memory',
            prompt: 'Share a favorite childhood memory. Why is it special to you?',
            hints: ['Use descriptive language', 'Explain why it was meaningful', 'Include sensory details'],
            example_keywords: ['childhood', 'remember', 'favorite', 'family', 'happy', 'nostalgic'],
            model_answer: 'My favorite childhood memory is when my grandmother taught me how to bake cookies. I remember the sweet smell of vanilla and the warm kitchen. It\'s special because it was our bonding time together.',
            order_index: 3,
            stage: 3,
            created_at: new Date().toISOString()
          },
          {
            id: 'fallback-4',
            title: 'Future Plans',
            prompt: 'What are your plans for the upcoming holidays or vacation?',
            hints: ['Use future tense', 'Be specific about activities', 'Mention who you plan to spend time with'],
            example_keywords: ['planning', 'vacation', 'holidays', 'travel', 'family', 'excited'],
            model_answer: 'I\'m planning to visit my relatives during the holidays. We\'re going to travel to the mountains and spend time together. I\'m excited because we haven\'t seen each other for a long time.',
            order_index: 4,
            stage: 3,
            created_at: new Date().toISOString()
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrompts();
  }, []);

  // Cleanup current audio properly
  const cleanupCurrentAudio = () => {
    if (audioRef.current) {
      const audio = audioRef.current;
      audio.pause();
      audio.currentTime = 0;
      
      // Remove all event listeners to prevent memory leaks
      audio.oncanplaythrough = null;
      audio.onerror = null;
      audio.onended = null;
      
      audioRef.current = null;
    }
  };

  // Play audio from URL
  const playAudio = async (audioUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Stop and cleanup any currently playing audio
      cleanupCurrentAudio();
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      const cleanup = () => {
        if (audioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(audioUrl);
        }
      };
      
      const handleError = (error: string) => {
        cleanup();
        cleanupCurrentAudio();
        reject(new Error(error));
      };
      
      const handleSuccess = () => {
        cleanup();
        resolve();
      };
      
      audio.oncanplaythrough = () => {
        audio.play()
          .then(() => {
            // Audio started playing successfully
          })
          .catch((playError) => {
            handleError('Failed to start audio playback');
          });
      };
      
      audio.onerror = () => {
        handleError('Failed to load audio file');
      };
      
      audio.onended = () => {
        handleSuccess();
      };
      
      audio.load();
    });
  };

  // Handle audio playback
  const handlePlayAudio = async () => {
    if (!currentStoryPrompt) return;

    setIsLoadingAudio(true);
    
    try {
      const audioUrl = await fetchStorytellingAudio(currentStoryPrompt.id);
      await playAudio(audioUrl);
    } catch (error: any) {
      console.error('Audio playback failed:', error.message);
      // Silent fail for better user experience
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64Data = reader.result.split(',')[1];
          resolve(base64Data);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Start audio recording
  const startRecording = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1
        } 
      });
      
      audioChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.start();
      setRecordingStartTime(Date.now());
      
    } catch (error) {
      throw new Error('Failed to start recording. Please check microphone permissions.');
    }
  };

  // Stop recording and get audio blob
  const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject(new Error('No media recorder available'));
        return;
      }
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        
        resolve(audioBlob);
      };
      
      mediaRecorderRef.current.stop();
    });
  };

  // Evaluate recorded audio
  const evaluateAudio = async (audioBase64: string, timeSpentSeconds: number): Promise<EvaluationFeedback> => {
    try {
      const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.EVALUATE_STORYTELLING}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          audio_base64: audioBase64,
          prompt_id: parseInt(currentStoryPrompt.id),
          filename: `storytelling_${currentStoryPrompt.id}_${Date.now()}.webm`,
          user_id: user?.id || 'anonymous',
          time_spent_seconds: timeSpentSeconds,
          urdu_used: false
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response text');
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }

      const result = await response.json();
      
      // Handle successful evaluation responses
      const evaluation = result.evaluation || result;
      
      const feedback: EvaluationFeedback = {
        score: evaluation.score,
        feedback: evaluation.feedback,
        accuracy: evaluation.accuracy || evaluation.score,
        pronunciation: evaluation.pronunciation,
        suggestions: evaluation.suggestions,
        suggested_improvement: evaluation.suggested_improvement,
        message: evaluation.message || evaluation.feedback
      };
      
      return feedback;
    } catch (error) {
      console.error('Error evaluating audio:', error);
      throw error;
    }
  };

  // Process recorded audio for evaluation
  const processRecordedAudio = async () => {
    if (!recordingStartTime) return;
    
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    
    setIsRecording(false);
    setIsEvaluating(true);
    
    try {
      const audioBlob = await stopRecording();
      const audioBase64 = await blobToBase64(audioBlob);
      const timeSpentSeconds = Math.round((Date.now() - recordingStartTime) / 1000);
      
      const evaluationResult = await evaluateAudio(audioBase64, timeSpentSeconds);
      setFeedback(evaluationResult);
      
    } catch (error: any) {
      console.error('Processing error:', error);
      setError(error.message || 'Failed to process recording');
    } finally {
      setIsEvaluating(false);
      setRecordingStartTime(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const markExerciseCompleted = async () => {
    if (user?.id) {
      try {
        // Import the progress update function
        const { updateCurrentProgress } = await import('@/utils/progressTracker');
        
        // Update progress to mark as completed
        await updateCurrentProgress(
          user.id,
          3, // Stage 3
          1  // Exercise 1 (StorytellingPractice)
        );
        console.log('Exercise marked as completed: Stage 3, Exercise 1 (StorytellingPractice)');
      } catch (error) {
        console.warn('Failed to mark exercise as completed:', error);
      }
    }
  };

  const handleRedo = () => {
    setCurrentPrompt(0);
    setFeedback(null);
    setIsCompleted(false);
    setShowCompletionDialog(false);
    setShowExample(false);
    setRecordingTime(0);
    setIsRecording(false);
    setIsEvaluating(false);
    setRecordingStartTime(null);
    
    // Clear any active recording
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleStartRecording = async () => {
    if (!currentStoryPrompt) return;
    
    setFeedback(null); // Clear previous feedback
    setIsRecording(true);
    
    try {
      await startRecording();
      
      // Auto-stop recording after 30 seconds
      recordingTimeoutRef.current = setTimeout(() => {
        console.log('Auto-stop timeout triggered');
        if (mediaRecorderRef.current?.state === 'recording') {
          console.log('MediaRecorder is recording, processing...');
          processRecordedAudio().catch(error => {
            console.error('Auto-stop processing error:', error);
            setError('Failed to process recording');
            setIsRecording(false);
            setIsEvaluating(false);
          });
        } else {
          console.log('MediaRecorder state:', mediaRecorderRef.current?.state);
        }
      }, 30000);
      
    } catch (error: any) {
      setIsRecording(false);
      setError(error.message || 'Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;
    
    console.log('Manual stop recording triggered');
    await processRecordedAudio();
  };

  const handleNextPrompt = () => {
    if (currentPrompt === storyPrompts.length - 1) {
      // User is on the last prompt, mark as completed
      setIsCompleted(true);
      setShowCompletionDialog(true);
      markExerciseCompleted();
    } else {
      setCurrentPrompt(currentPrompt + 1);
      setFeedback(null);
      setRecordingTime(0);
      setIsRecording(false);
      setIsEvaluating(false);
      setRecordingStartTime(null);
      setShowExample(false);
      // Clear any active recording
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      }
    }
  };

  const handlePreviousPrompt = () => {
    if (currentPrompt > 0) {
      setCurrentPrompt(currentPrompt - 1);
      setFeedback(null);
      setRecordingTime(0);
      setIsRecording(false);
      setIsEvaluating(false);
      setRecordingStartTime(null);
      setShowExample(false);
      // Clear any active recording
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6">
            <PracticeBreadcrumb />
          </div>
          
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/dashboard/practice/stage-3')}
              className="shrink-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 hover:bg-primary/10 hover:border-primary/30 hover:text-primary bg-gradient-to-br from-card to-card/50 dark:bg-card backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 shadow-lg"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center flex-1">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 via-primary/30 to-primary/40 dark:from-primary/30 dark:via-primary/40 dark:to-primary/50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-primary/30 dark:border-primary/40">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent mb-2">Storytelling Practice</h1>
              <p className="text-lg text-muted-foreground">Master the Art of Narrative Expression</p>
            </div>
            
            <div className="w-10"></div>
          </div>

          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading storytelling prompts...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && storyPrompts.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6">
            <PracticeBreadcrumb />
          </div>
          
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/dashboard/practice/stage-3')}
              className="shrink-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 hover:bg-primary/10 hover:border-primary/30 hover:text-primary bg-gradient-to-br from-card to-card/50 dark:bg-card backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 shadow-lg"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center flex-1">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 via-primary/30 to-primary/40 dark:from-primary/30 dark:via-primary/40 dark:to-primary/50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-primary/30 dark:border-primary/40">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent mb-2">Storytelling Practice</h1>
              <p className="text-lg text-muted-foreground">Master the Art of Narrative Expression</p>
            </div>
            
            <div className="w-10"></div>
          </div>

          <Card className="bg-gradient-to-r from-red-50 via-red-100 to-red-50 dark:from-red-900/20 dark:via-red-800/20 dark:to-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl shadow-lg">
            <CardContent className="p-6 text-center">
              <p className="text-red-800 dark:text-red-200 mb-4">
                Unable to load storytelling prompts: {error}
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100 bg-gradient-to-br from-card to-card/50 dark:bg-card backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 rounded-2xl"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Ensure we have prompts before rendering
  if (!currentStoryPrompt) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6">
            <PracticeBreadcrumb />
          </div>
          
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/dashboard/practice/stage-3')}
              className="shrink-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 hover:bg-primary/10 hover:border-primary/30 hover:text-primary bg-gradient-to-br from-card to-card/50 dark:bg-card backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 shadow-lg"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center flex-1">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 via-primary/30 to-primary/40 dark:from-primary/30 dark:via-primary/40 dark:to-primary/50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-primary/30 dark:border-primary/40">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent mb-2">Storytelling Practice</h1>
              <p className="text-lg text-muted-foreground">Master the Art of Narrative Expression</p>
            </div>
            
            <div className="w-10"></div>
          </div>

          <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-lg">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No storytelling prompts available.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <PracticeBreadcrumb />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/dashboard/practice/stage-3')}
            className="shrink-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 hover:bg-primary/10 hover:border-primary/30 hover:text-primary bg-gradient-to-br from-card to-card/50 dark:bg-card backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 shadow-lg"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 via-primary/30 to-primary/40 dark:from-primary/30 dark:via-primary/40 dark:to-primary/50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-primary/30 dark:border-primary/40">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent mb-2">Storytelling Practice</h1>
            <p className="text-lg text-muted-foreground">Master the Art of Narrative Expression</p>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Error banner if API failed but fallbacks loaded */}
        {error && storyPrompts.length > 0 && (
          <Card className="mb-6 bg-gradient-to-r from-yellow-50 via-yellow-100 to-yellow-50 dark:from-yellow-900/20 dark:via-yellow-800/20 dark:to-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl shadow-lg">
            <CardContent className="p-4">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm font-medium">
                ⚠️ Using offline content. Some features may be limited.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Prompt {currentPrompt + 1} of {storyPrompts.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPrompt}
                disabled={currentPrompt === 0}
                className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary bg-gradient-to-br from-card to-card/50 dark:bg-card backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 shadow-lg hover:shadow-xl rounded-2xl"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPrompt}
                disabled={false}
                className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary bg-gradient-to-br from-card to-card/50 dark:bg-card backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 shadow-lg hover:shadow-xl rounded-2xl"
              >
                {currentPrompt === storyPrompts.length - 1 ? 'Complete' : 'Next'}
              </Button>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-primary to-primary/90 h-2 rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${((currentPrompt + 1) / storyPrompts.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Story Prompt */}
        <Card className="mb-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10 border border-primary/20 dark:border-primary/30 rounded-2xl shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-primary dark:text-primary/90">
                {currentStoryPrompt.title}
              </h2>
              <Button
                onClick={handlePlayAudio}
                disabled={isLoadingAudio}
                className={`w-12 h-12 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 ${
                  isLoadingAudio 
                    ? 'bg-primary/60 hover:bg-primary/60 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary'
                } text-white`}
                size="icon"
              >
                {isLoadingAudio ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </Button>
            </div>
            <p className="text-primary/80 dark:text-primary/70 mb-4">
              {currentStoryPrompt.prompt}
            </p>
            
            {/* Keywords */}
            <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10 border border-primary/20 dark:border-primary/30 rounded-2xl p-4 shadow-md">
              <div className="flex items-center space-x-2 mb-3">
                <Lightbulb className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary dark:text-primary/90">Keywords:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentStoryPrompt.example_keywords.map((keyword, index) => (
                  <span 
                    key={index} 
                    className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-gradient-to-r from-primary/20 to-primary/30 dark:from-primary/30 dark:to-primary/40 text-primary dark:text-primary/90 rounded-full border border-primary/30 dark:border-primary/40 shadow-sm"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Example Story */}
        {showExample && currentStoryPrompt?.model_answer && (
          <Card className="mb-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10 border border-primary/20 dark:border-primary/30 rounded-2xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-3">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-primary dark:text-primary/90">
                  Example Story
                </h3>
              </div>
              <div className="bg-gradient-to-br from-card to-card/50 dark:bg-card backdrop-blur-sm rounded-2xl p-4 border border-primary/20 dark:border-primary/30 shadow-md">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {currentStoryPrompt.model_answer}
                </p>
              </div>
              <p className="text-xs text-primary/70 dark:text-primary/60 mt-2">
                💡 Use this as inspiration for your own story. Try to include similar details and structure.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Compact Recording Status */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-muted-foreground">
              Speaking Time: <span className="font-mono text-primary">
                {formatTime(recordingTime)}/30s
              </span>
            </div>
            <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-primary to-primary/90 h-2 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${Math.min((recordingTime / 30) * 100, 100)}%` }}
              />
            </div>
          </div>
          
          {(isRecording || isEvaluating) && (
            <div className="flex items-center space-x-2 text-sm">
              {isRecording && (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-600 dark:text-red-400">Recording...</span>
                </>
              )}
              {isEvaluating && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-primary">Evaluating...</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Recording Controls */}
        <Card className="mb-6 bg-gradient-to-br from-card to-card/50 dark:bg-card backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-lg">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-6">
                Click the button below to start recording your story. You have up to 30 seconds to speak.
              </p>
              
              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowExample(!showExample)}
                  className="px-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary bg-gradient-to-br from-card to-card/50 dark:bg-card backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 shadow-lg hover:shadow-xl rounded-2xl"
                  disabled={isRecording || isEvaluating}
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  {showExample ? 'Hide Example' : 'Show Example'}
                </Button>
                
                {!isRecording ? (
                  <Button
                    onClick={handleStartRecording}
                    disabled={isEvaluating}
                    className="px-8 py-3 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 rounded-2xl"
                    size="lg"
                  >
                    <Mic className="h-5 w-5 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    onClick={handleStopRecording}
                    className="px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 rounded-2xl"
                    size="lg"
                  >
                    <Pause className="h-5 w-5 mr-2" />
                    Stop Recording
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback */}
        {feedback && (
          <Card className="mb-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10 border border-primary/20 dark:border-primary/30 rounded-2xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-primary/20 via-primary/30 to-primary/40 dark:from-primary/30 dark:via-primary/40 dark:to-primary/50 rounded-2xl flex items-center justify-center shadow-md border border-primary/30 dark:border-primary/40">
                  {feedback.score && feedback.score >= 70 ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-primary dark:text-primary/90">
                      Storytelling Evaluation
                    </h3>
                    {feedback.score && (
                      <span className="text-lg font-bold text-primary">
                        {feedback.score}%
                      </span>
                    )}
                  </div>
                  
                  {feedback.message && (
                    <p className="text-primary/80 dark:text-primary/70 mb-3">
                      {feedback.message}
                    </p>
                  )}
                  
                  {feedback.pronunciation && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-primary dark:text-primary/90">
                        Pronunciation: 
                      </span>
                      <span className="text-sm text-primary/80 dark:text-primary/70 ml-1">
                        {feedback.pronunciation}
                      </span>
                    </div>
                  )}
                  
                  {feedback.suggestions && feedback.suggestions.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-primary dark:text-primary/90 block mb-1">
                        Suggestions:
                      </span>
                      <ul className="list-disc list-inside space-y-1">
                        {feedback.suggestions.map((suggestion, index) => (
                          <li key={index} className="text-sm text-primary/80 dark:text-primary/70">
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Full width suggested improvement */}
              {feedback.suggested_improvement && (
                <div className="w-full p-4 bg-gradient-to-r from-yellow-50 via-yellow-100 to-yellow-50 dark:from-yellow-900/20 dark:via-yellow-800/20 dark:to-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl shadow-md">
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200 block mb-2">
                    💡 Suggested Improvement:
                  </span>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    {feedback.suggested_improvement}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Completion Dialog */}
        <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
          <DialogContent className="sm:max-w-lg p-0 bg-gradient-to-br from-white/98 via-white/95 to-[#8DC63F]/5 dark:from-gray-900/98 dark:via-gray-900/95 dark:to-[#8DC63F]/10 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl">
            <DialogHeader className="px-6 py-5 border-b border-gray-200/40 dark:border-gray-700/40 bg-gradient-to-r from-transparent via-[#8DC63F]/5 to-transparent dark:via-[#8DC63F]/10">
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#8DC63F]/20 to-[#8DC63F]/30 dark:from-[#8DC63F]/20 dark:to-[#8DC63F]/30 rounded-3xl flex items-center justify-center shadow-sm border border-[#8DC63F]/30 dark:border-[#8DC63F]/40 mb-4">
                  <Trophy className="h-8 w-8 text-[#8DC63F] dark:text-[#8DC63F]" />
                </div>
              </div>
              <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-gray-900 to-[#8DC63F] dark:from-gray-100 dark:to-[#8DC63F] bg-clip-text text-transparent">
                Congratulations!
              </DialogTitle>
            </DialogHeader>
            <div className="p-6">
              <div className="text-center space-y-4">
                <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
                  🎉 You've completed all {storyPrompts.length} storytelling prompts!
                </p>
                <p className="text-sm text-muted-foreground">
                  Excellent work on practicing your storytelling skills. You can redo the exercise to practice more or continue to other exercises.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <Button
                    onClick={handleRedo}
                    variant="outline"
                    className="flex-1 h-12 px-6 bg-[#8DC63F]/10 hover:bg-[#8DC63F]/20 dark:bg-[#8DC63F]/20 dark:hover:bg-[#8DC63F]/30 text-[#8DC63F] dark:text-[#8DC63F] border border-[#8DC63F]/30 dark:border-[#8DC63F]/40 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md font-medium"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Redo Exercise
                  </Button>
                  <Button
                    onClick={() => navigate('/dashboard/practice')}
                    className="flex-1 h-12 px-6 bg-gradient-to-r from-[#8DC63F] to-[#8DC63F]/90 hover:from-[#8DC63F]/90 hover:to-[#8DC63F] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 border-0 rounded-xl"
                  >
                    Continue Learning
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 