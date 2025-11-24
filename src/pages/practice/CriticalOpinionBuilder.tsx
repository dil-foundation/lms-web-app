import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { CompletionDialog } from '@/components/practice/CompletionDialog';
import { ArrowLeft, Mic, Lightbulb, FileText, Brain, Target, Loader2, Play, Pause, CheckCircle, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { 
  criticalOpinionService, 
  CriticalOpinionTopic,
  CriticalOpinionEvaluation
} from '@/services/criticalOpinionService';
import { getCurrentTopicProgress, updateCurrentTopic } from '@/utils/progressTracker';

interface ExerciseCompletion {
  exercise_completed: boolean;
  progress_percentage: number;
  completed_topics: number;
  total_topics: number;
  current_topic_id: number;
  stage_id: number;
  exercise_id: number;
  exercise_name: string;
  stage_name: string;
  completion_date?: string | null;
}

export default function CriticalOpinionBuilder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [topics, setTopics] = useState<CriticalOpinionTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<CriticalOpinionTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Audio playback states
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Recording and evaluation states
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<CriticalOpinionEvaluation | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [lastCompletedTopicId, setLastCompletedTopicId] = useState<number | null>(null);


  // Load topics on component mount
  useEffect(() => {
    const loadTopics = async () => {
      try {
        setLoading(true);
        const fetchedTopics = await criticalOpinionService.getAllTopics();
        setTopics(fetchedTopics);
        
        // Set first topic as default if available
        if (fetchedTopics.length > 0) {
          setSelectedTopic(fetchedTopics[0]);
        }
      } catch (error) {
        console.error('Error loading topics:', error);
        toast.error('Failed to load critical opinion topics');
      } finally {
        setLoading(false);
      }
    };

    loadTopics();
  }, []);

  // Fetch current progress on mount
  useEffect(() => {
    const fetchProgress = async () => {
      if (!user?.id) return;

      try {
        const progressData = await getCurrentTopicProgress(user.id, 6, 3); // Stage 6, Exercise 3
        
        if (progressData.success && progressData.current_topic_id) {
          setLastCompletedTopicId(progressData.current_topic_id);
        }
      } catch (error) {
        console.error('Error fetching progress:', error);
      }
    };

    fetchProgress();
  }, [user]);



  const handleTopicClick = async (topic: CriticalOpinionTopic) => {
    setSelectedTopic(topic);
    setHasStarted(true);
    setShowFeedback(false);

    // Update progress when topic is selected
    if (user?.id && topic.id) {
      try {
        await updateCurrentTopic(user.id, 6, 3, topic.id); // Stage 6, Exercise 3
      } catch (error) {
        console.error('Error updating progress:', error);
      }
    }
  };

  // Audio playback functions
  const cleanupCurrentAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.removeEventListener('play', () => setIsPlayingAudio(true));
      currentAudio.removeEventListener('pause', () => setIsPlayingAudio(false));
      currentAudio.removeEventListener('ended', () => setIsPlayingAudio(false));
      setCurrentAudio(null);
    }
  };

  const handlePlayAudio = async () => {
    if (!selectedTopic) return;

    try {
      setIsLoadingAudio(true);
      cleanupCurrentAudio();

      const audioUrl = await criticalOpinionService.getTopicAudio(selectedTopic.id);
      const audio = new Audio(audioUrl);
      
      audio.addEventListener('play', () => setIsPlayingAudio(true));
      audio.addEventListener('pause', () => setIsPlayingAudio(false));
      audio.addEventListener('ended', () => setIsPlayingAudio(false));
      
      setCurrentAudio(audio);
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error('Failed to play audio');
    } finally {
      setIsLoadingAudio(false);
    }
  };



  const handleStartRecording = async () => {
    try {
      console.log('🎙️ Starting recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        console.log('📊 Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstart = () => {
        console.log('🎙️ Recording started');
        setRecordingStartTime(Date.now());
      };
      
      recorder.onerror = (event) => {
        console.error('❌ Recording error:', event);
        toast.error('Recording failed');
      };
      
      recorder.onstop = () => {
        console.log('⏹️ Recording stopped');
        setRecordedChunks(chunks);
        handleEvaluateRecording(chunks);
      };
      
      setMediaRecorder(recorder);
      recorder.start(1000); // Collect data every second
      setIsRecording(true);
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const handleStopRecording = () => {
    console.log('🛑 Stop recording requested');
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  };

  const handleEvaluateRecording = async (chunks: Blob[]) => {
    if (!selectedTopic || !user?.id || chunks.length === 0) {
      console.error('❌ Missing data for evaluation:', { selectedTopic, userId: user?.id, chunks: chunks.length });
      return;
    }

    try {
      console.log('🔄 Starting evaluation...');
      setIsEvaluating(true);
      
      // Create audio blob
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      console.log('📊 Audio blob size:', audioBlob.size, 'bytes');
      
      if (audioBlob.size === 0) {
        console.error('❌ Empty audio blob');
        toast.error('No audio recorded');
        return;
      }
      
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      
      reader.readAsDataURL(audioBlob);
      const audioBase64 = await base64Promise;
      
      // Calculate time spent
      const timeSpent = recordingStartTime ? Math.floor((Date.now() - recordingStartTime) / 1000) : 30;
      
      console.log('📤 Sending evaluation request...', {
        topicId: selectedTopic.id,
        userId: user.id,
        timeSpent,
        audioSize: audioBase64.length
      });
      
      // Call evaluation API
      const result = await criticalOpinionService.evaluateCriticalOpinion(
        audioBase64,
        selectedTopic.id,
        `critical_opinion_${selectedTopic.id}_${Date.now()}.webm`,
        user.id,
        timeSpent,
        false
      ) as any;
      
      console.log('✅ Evaluation result:', result);
      
      // Handle API error responses (like no_speech_detected)
      if (result.success === false || result.error) {
        const errorMessage = result.message || result.error || 'Speech evaluation failed';
        
        // Create modified feedback object for error cases
        const errorFeedback = {
          ...result,
          evaluation: {
            ...result.evaluation,
            score: 0,
            feedback: errorMessage,
            areas_for_improvement: ['Please speak more clearly and try again']
          }
        };
        
        setEvaluationResult(errorFeedback);
        setShowFeedback(true);
        toast.error('Speech evaluation failed: ' + errorMessage);
        return;
      }
      
      setEvaluationResult(result);
      setShowFeedback(true);
      
      // Check if the exercise is completed based on API response
      if (result?.exercise_completion?.exercise_completed) {
        // Exercise is completed according to the API
        setIsCompleted(true);
        setShowCompletionDialog(true);
      }
      
    } catch (error) {
      console.error('❌ Error evaluating recording:', error);
      toast.error('Failed to evaluate recording');
    } finally {
      setIsEvaluating(false);
    }
  };

  const resetBuilder = () => {
    setHasStarted(false);
    setIsRecording(false);
    setShowFeedback(false);
    setEvaluationResult(null);
    setIsEvaluating(false);
    setRecordedChunks([]);
    setRecordingStartTime(null);
    setIsCompleted(false);
    setShowCompletionDialog(false);
    cleanupCurrentAudio();
    
    // Stop any ongoing recording
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    setMediaRecorder(null);
  };

  const handleRedo = () => {
    setShowCompletionDialog(false);
    setIsCompleted(false);
    setEvaluationResult(null);
    setShowFeedback(false);
  };

  const handleContinue = () => {
    setShowCompletionDialog(false);
    resetBuilder();
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center w-full max-w-md">
          <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-primary to-primary/80 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-xl">
            <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 animate-spin text-white" />
          </div>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg font-medium">Loading critical opinion topics...</p>
        </div>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-8">
            <PracticeBreadcrumb />
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/dashboard/practice/stage-6')}
              className="shrink-0 group w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 group-hover:-translate-x-1 transition-transform duration-300" />
            </Button>
            
            <div className="text-center flex-1 px-8 sm:px-10 md:px-0 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1 sm:mb-1.5 md:mb-2">
                Critical Opinion Builder
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm md:text-lg px-2">Develop sophisticated viewpoints with AI guidance</p>
            </div>
            
            <div className="w-9 sm:w-10 md:w-12"></div>
          </div>

          {/* Topic Selection */}
          <div className="space-y-4 sm:space-y-6 md:space-y-8">
            <div className="text-center">
              <p className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-2xl mx-auto px-2">
                Click on a topic to start building your opinion immediately with our AI-powered guidance system
              </p>
            </div>

            {topics.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {topics.map((topic) => {
                  const isCompleted = lastCompletedTopicId !== null && topic.id < lastCompletedTopicId;
                  return (
                    <Card 
                      key={topic.id}
                      className={`group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 sm:hover:-translate-y-2 hover:scale-[1.02] sm:hover:scale-105 border-2 ${
                        isCompleted ? 'border-primary/50' : 'border-transparent hover:border-primary/20'
                      } bg-gradient-to-br from-card to-card/50 dark:bg-card rounded-xl sm:rounded-2xl overflow-hidden`}
                      onClick={() => handleTopicClick(topic)}
                    >
                      <CardContent className="p-4 sm:p-5 md:p-6">
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-primary to-primary/80 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 flex-shrink-0">
                              <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-white" />
                            </div>
                            <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap justify-end">
                              {isCompleted && (
                                <div className="flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-primary text-white text-[10px] sm:text-xs">
                                  <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                  <span>Completed</span>
                                </div>
                              )}
                              {(topic.complexity || topic.difficulty_level) && (
                                <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] md:text-xs font-semibold shadow-md ${
                                  (topic.complexity === 'Advanced' || topic.difficulty_level === 'Advanced')
                                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' 
                                    : (topic.complexity === 'Intermediate' || topic.difficulty_level === 'Intermediate')
                                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                                    : 'bg-gradient-to-r from-primary to-primary/80 text-white'
                                }`}>
                                  {topic.complexity || topic.difficulty_level}
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <h3 className="font-bold text-sm sm:text-base md:text-lg mb-1.5 sm:mb-2 text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors duration-300 line-clamp-2">
                              {topic.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 leading-relaxed line-clamp-3">
                              {topic.description || 'No description available'}
                            </p>
                            <span className="inline-block px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] md:text-xs font-semibold bg-gradient-to-r from-primary/10 to-primary/20 text-primary border border-primary/20">
                              {topic.category}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-gradient-to-br from-muted/30 to-muted/50 border-2 border-dashed border-muted-foreground/20 rounded-xl sm:rounded-2xl">
                <CardContent className="p-6 sm:p-8 md:p-12 text-center">
                  <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/30 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <Lightbulb className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 text-muted-foreground" />
                  </div>
                  <h4 className="text-lg sm:text-xl font-semibold text-muted-foreground mb-2 sm:mb-3">No Topics Available</h4>
                  <p className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-md mx-auto px-2">
                    Please check back later or contact support if this issue persists.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Building Guidelines */}
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/20 rounded-xl sm:rounded-2xl shadow-xl">
              <CardContent className="p-4 sm:p-5 md:p-6 lg:p-8">
                <div className="flex items-center mb-3 sm:mb-4 md:mb-6">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl sm:rounded-2xl flex items-center justify-center mr-2.5 sm:mr-3 md:mr-4 shadow-lg flex-shrink-0">
                    <Brain className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100">Opinion Building Guidelines</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6">
                  <div className="space-y-2.5 sm:space-y-3 md:space-y-4">
                    <div className="flex items-start space-x-2 sm:space-x-3 md:space-x-4">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-3 md:h-3 bg-gradient-to-r from-primary to-primary/80 rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground text-xs sm:text-sm md:text-base leading-relaxed">
                      Develop a clear, well-reasoned position on the topic
                    </p>
                  </div>
                    <div className="flex items-start space-x-2 sm:space-x-3 md:space-x-4">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-3 md:h-3 bg-gradient-to-r from-primary to-primary/80 rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground text-xs sm:text-sm md:text-base leading-relaxed">
                      Support your arguments with evidence, examples, and logical reasoning
                    </p>
                  </div>
                    <div className="flex items-start space-x-2 sm:space-x-3 md:space-x-4">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-3 md:h-3 bg-gradient-to-r from-primary to-primary/80 rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground text-xs sm:text-sm md:text-base leading-relaxed">
                      Consider and address potential counterarguments
                    </p>
                  </div>
                    <div className="flex items-start space-x-2 sm:space-x-3 md:space-x-4">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-3 md:h-3 bg-gradient-to-r from-primary to-primary/80 rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground text-xs sm:text-sm md:text-base leading-relaxed">
                      Use sophisticated vocabulary and complex sentence structures
                    </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-8">
          <PracticeBreadcrumb />
        </div>
        
        {/* Integrated Navigation Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={resetBuilder}
            className="shrink-0 group w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 group-hover:-translate-x-1 transition-transform duration-300" />
          </Button>
          
          <div className="text-center flex-1 min-w-0 px-2">
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-0.5 sm:mb-1">
              Current Session
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Recording and evaluation mode</p>
          </div>
          
          <div className="w-9 sm:w-10 md:w-12"></div>
        </div>

        {/* Current Topic */}
        {selectedTopic && (
          <Card className="mb-4 sm:mb-6 md:mb-8 bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/20 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base sm:text-lg md:text-xl text-gray-900 dark:text-gray-100 mb-1.5 sm:mb-2 break-words">
                    {selectedTopic.title}
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-2 sm:mb-3 leading-relaxed break-words">
                    {selectedTopic.description || 'No description available'}
                  </p>
                  <span className="inline-block px-2 sm:px-2.5 py-0.5 sm:py-1 md:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] md:text-xs font-semibold bg-gradient-to-r from-primary/10 to-primary/20 text-primary border border-primary/20">
                    {selectedTopic.category}
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0 flex-wrap w-full sm:w-auto justify-end sm:justify-start">
                  {/* Audio Play Button */}
                  <Button
                    onClick={handlePlayAudio}
                    disabled={isLoadingAudio}
                    className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl shadow-xl transition-all duration-300 ${
                      isLoadingAudio
                        ? 'bg-gradient-to-r from-slate-400 to-slate-500 cursor-not-allowed text-white border-2 border-slate-500'
                        : isPlayingAudio
                        ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-white hover:shadow-2xl'
                        : 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-white hover:shadow-2xl hover:scale-105'
                    }`}
                    size="icon"
                  >
                    {isLoadingAudio ? (
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    ) : isPlayingAudio ? (
                      <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                    ) : (
                      <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                    )}
                  </Button>
                  
                  {/* Difficulty Badge */}
                  {(selectedTopic.complexity || selectedTopic.difficulty_level) && (
                    <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 md:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] md:text-xs font-semibold shadow-md ${
                      (selectedTopic.complexity === 'Advanced' || selectedTopic.difficulty_level === 'Advanced')
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' 
                        : (selectedTopic.complexity === 'Intermediate' || selectedTopic.difficulty_level === 'Intermediate')
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                        : 'bg-gradient-to-r from-primary to-primary/80 text-white'
                    }`}>
                      {selectedTopic.complexity || selectedTopic.difficulty_level}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evaluation Loading State */}
        {isEvaluating && (
          <Card className="mb-4 sm:mb-6 md:mb-8 bg-gradient-to-br from-secondary/5 to-secondary/10 border-2 border-secondary/20 rounded-xl sm:rounded-2xl shadow-xl">
            <CardContent className="p-4 sm:p-5 md:p-6 lg:p-8">
              <div className="flex items-center justify-center gap-2.5 sm:gap-3 md:gap-4">
                <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-gradient-to-br from-secondary to-secondary/80 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 animate-spin text-white" />
                </div>
                <span className="text-secondary-700 dark:text-secondary-300 font-semibold text-sm sm:text-base md:text-lg">
                  Evaluating your critical opinion...
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evaluation Results */}
        {evaluationResult && (
          <div className="mb-4 sm:mb-6 md:mb-8">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 md:mb-6 text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Opinion Analysis Results
            </h3>
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              {/* Overall Score */}
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
                <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <h4 className="font-semibold text-sm sm:text-base md:text-lg text-primary flex items-center">
                      <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1.5 sm:mr-2 flex-shrink-0" />
                      Overall Score
                    </h4>
                    <span className={`text-xl sm:text-2xl md:text-3xl font-bold ${
                      (evaluationResult.evaluation.score || 0) === 0 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-primary'
                    }`}>
                      {evaluationResult.evaluation.score}/100
                    </span>
                  </div>
                  {evaluationResult.evaluation.suggested_improvement && (
                    <p className="text-primary-700 dark:text-primary-300 text-xs sm:text-sm md:text-base leading-relaxed break-words">
                      {evaluationResult.evaluation.suggested_improvement}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Strengths */}
              {evaluationResult.evaluation.strengths && evaluationResult.evaluation.strengths.length > 0 && (
                <Card className="bg-gradient-to-br from-green/5 to-green/10 border-2 border-green/20 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
                  <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
                    <div className="flex items-start space-x-2.5 sm:space-x-3 md:space-x-4">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl sm:rounded-2xl flex items-center justify-center mt-0.5 sm:mt-1 shadow-lg flex-shrink-0">
                        <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base md:text-lg text-green-700 dark:text-green-300 mb-1.5 sm:mb-2 md:mb-3">Key Strengths</h4>
                        <div className="space-y-1.5 sm:space-y-2">
                          {evaluationResult.evaluation.strengths.map((strength, index) => (
                            <p key={index} className="text-green-700 dark:text-green-300 text-xs sm:text-sm md:text-base leading-relaxed flex items-start">
                              <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full mt-1.5 sm:mt-2 mr-1.5 sm:mr-2 md:mr-3 flex-shrink-0"></span>
                              <span className="break-words">{strength}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Areas for Improvement */}
              {evaluationResult.evaluation.areas_for_improvement && evaluationResult.evaluation.areas_for_improvement.length > 0 && (
                <Card className="bg-gradient-to-br from-orange/5 to-orange/10 border-2 border-orange/20 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
                  <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
                    <div className="flex items-start space-x-2.5 sm:space-x-3 md:space-x-4">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl sm:rounded-2xl flex items-center justify-center mt-0.5 sm:mt-1 shadow-lg flex-shrink-0">
                        <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base md:text-lg text-orange-600 mb-1.5 sm:mb-2 md:mb-3">Areas for Improvement</h4>
                        <div className="space-y-1.5 sm:space-y-2">
                          {evaluationResult.evaluation.areas_for_improvement.map((area, index) => (
                            <p key={index} className="text-orange-700 dark:text-orange-300 text-xs sm:text-sm md:text-base leading-relaxed flex items-start">
                              <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 bg-orange-500 rounded-full mt-1.5 sm:mt-2 mr-1.5 sm:mr-2 md:mr-3 flex-shrink-0"></span>
                              <span className="break-words">{area}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons Section */}
        <div className="text-center space-y-6 sm:space-y-8">
          {/* Primary Action Button */}
          <div className="flex justify-center px-4">
          {!isRecording && !isEvaluating ? (
            <Button
              onClick={handleStartRecording}
              className="group bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white w-full sm:w-auto px-6 sm:px-10 md:px-16 py-3 sm:py-4 md:py-5 rounded-xl sm:rounded-2xl text-sm sm:text-base md:text-lg lg:text-xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-105"
              size="lg"
            >
                <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 bg-white/20 rounded-full flex items-center justify-center mr-2 sm:mr-3 md:mr-4 group-hover:bg-white/30 transition-all duration-300">
                  <Mic className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-white" />
                </div>
              <span className="hidden sm:inline">Start Recording Your Opinion</span>
              <span className="sm:hidden">Start Recording</span>
            </Button>
          ) : isRecording ? (
            <Button
              onClick={handleStopRecording}
              className="group bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white w-full sm:w-auto px-6 sm:px-10 md:px-16 py-3 sm:py-4 md:py-5 rounded-xl sm:rounded-2xl text-sm sm:text-base md:text-lg lg:text-xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-105"
              size="lg"
            >
                <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 bg-white/20 rounded-full flex items-center justify-center mr-2 sm:mr-3 md:mr-4 group-hover:bg-white/30 transition-all duration-300">
                  <Mic className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-white" />
                </div>
              Stop Recording
            </Button>
          ) : null}
          </div>

          {/* Secondary Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3 sm:gap-4 md:gap-6 px-4">
              <Button
                onClick={resetBuilder}
                variant="outline"
                className="group w-full sm:w-auto px-4 sm:px-6 md:px-8 lg:px-10 py-2.5 sm:py-3 md:py-4 rounded-xl sm:rounded-2xl border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all duration-300 hover:-translate-y-1 hover:shadow-xl font-semibold text-primary hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10 text-xs sm:text-sm md:text-base lg:text-lg"
              >
              <Lightbulb className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-2 sm:mr-3 group-hover:scale-110 transition-transform duration-300" />
                <span className="hidden sm:inline">Choose Different Topic</span>
                <span className="sm:hidden">New Topic</span>
              </Button>
              <Button
                onClick={() => navigate('/dashboard/practice/stage-6')}
                variant="outline"
                className="group w-full sm:w-auto px-4 sm:px-6 md:px-8 lg:px-10 py-2.5 sm:py-3 md:py-4 rounded-xl sm:rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-xl font-semibold text-secondary hover:bg-gradient-to-r hover:from-secondary/5 hover:to-secondary/10 text-xs sm:text-sm md:text-base lg:text-lg"
              >
              <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-2 sm:mr-3 group-hover:-translate-x-1 transition-transform duration-300" />
                <span className="hidden sm:inline">Back to Stage 6</span>
                <span className="sm:hidden">Back</span>
              </Button>
          </div>
        </div>
      </div>

      {/* Completion Dialog */}
      <CompletionDialog
        isOpen={showCompletionDialog}
        onClose={() => setShowCompletionDialog(false)}
        exerciseName="Critical Opinion Builder"
        score={evaluationResult?.evaluation?.score || 0}
        onRedo={handleRedo}
        onContinue={handleContinue}
      />
    </div>
  );
} 