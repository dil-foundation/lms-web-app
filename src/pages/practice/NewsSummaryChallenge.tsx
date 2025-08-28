import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { ArrowLeft, Play, Pause, Mic, RefreshCw, AlertCircle, Loader2, Square, CheckCircle, X, TrendingUp, Target, MessageSquare, Trophy, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NewsSummaryService, { NewsSummaryItem, NewsSummaryEvaluationResponse } from '@/services/newsSummaryService';

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
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Using NewsSummaryItem interface from service instead

export default function NewsSummaryChallenge() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state: audioState, playAudio, pauseAudio, resumeAudio, stopAudio } = useAudioPlayer();
  const { isRecording, audioBlob, error: recordingError, startRecording, stopRecording, resetRecording } = useAudioRecorder();

  const [newsItems, setNewsItems] = useState<NewsSummaryItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<NewsSummaryEvaluationResponse | null>(null);
  const [startTime] = useState<Date>(new Date());
  const timeSpentRef = useRef<number>(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  // Load news items from API
  useEffect(() => {
    const loadNewsItems = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const items = await NewsSummaryService.getAll();
        if (items.length === 0) {
          throw new Error('No news items available');
        }
        setNewsItems(items);
      } catch (error) {
        console.error('Failed to load news items:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load news items';
        setError(errorMessage);
        toast.error('Failed to load news items. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadNewsItems();
  }, []);

  // Track time spent
  useEffect(() => {
    const interval = setInterval(() => {
      timeSpentRef.current = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const currentArticle = newsItems[currentItemIndex];

  const handlePlayPause = async () => {
    if (!currentArticle) return;

    if (audioState.isPlaying) {
      pauseAudio();
    } else if (audioState.isLoaded) {
      // Resume existing audio
      await resumeAudio();
    } else {
      // Fetch and play new audio
      try {
        setIsLoadingAudio(true);
        console.log('🎵 Fetching audio for news ID:', currentArticle.id);
        const audioUrl = await NewsSummaryService.getAudio(currentArticle.id);
        await playAudio(audioUrl);
      } catch (error) {
        console.error('Failed to load audio:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load audio';
        toast.error(`Audio Error: ${errorMessage}`);
      } finally {
        setIsLoadingAudio(false);
      }
    }
  };



  const handleRecordToggle = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      resetRecording();
      setEvaluationResult(null);
      await startRecording();
    }
  };

  const handleEvaluateRecording = async () => {
    if (!audioBlob || !currentArticle || !user) {
      toast.error('Recording, article, or user information missing');
      return;
    }

    try {
      setIsEvaluating(true);
      
      // Convert audio blob to base64
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix (data:audio/...;base64,)
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const evaluationRequest = {
        audio_base64: base64Audio,
        news_id: parseInt(currentArticle.id),
        filename: `news_summary_${currentArticle.id}_${Date.now()}.webm`,
        user_id: user.id,
        time_spent_seconds: timeSpentRef.current,
        urdu_used: false, // You can add UI to let user specify this
      };

      const result = await NewsSummaryService.evaluate(evaluationRequest) as any;
      
      // Handle API error responses (like no_speech_detected)
      if (result.success === false || result.error) {
        const errorMessage = result.message || result.error || 'Speech evaluation failed';
        
        // Create modified feedback object for error cases
        const errorFeedback = {
          ...result,
          score: 0,
          feedback: errorMessage,
          suggestions: ['Please speak more clearly and try again'],
          success: false
        };
        
        setEvaluationResult(errorFeedback);
        toast.error('Speech not detected. Please try again.');
        return;
      }
      
      setEvaluationResult(result);
      toast.success('Evaluation completed!');
      
      // Check if the exercise is completed based on API response
      if (result.exercise_completion?.exercise_completed) {
        // Exercise is completed according to the API
        setIsCompleted(true);
        setShowCompletionDialog(true);
        markExerciseCompleted();
        console.log('✅ Exercise completed according to API response');
      } else if (!isCompleted) {
        // Fallback: mark as completed after receiving evaluation (existing behavior)
        setIsCompleted(true);
        setShowCompletionDialog(true);
        markExerciseCompleted();
        console.log('✅ Exercise marked as completed (fallback logic)');
      }
      
    } catch (error) {
      console.error('Evaluation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Evaluation failed';
      toast.error(errorMessage);
    } finally {
      setIsEvaluating(false);
    }
  };

  const progressPercentage = audioState.duration > 0 ? (audioState.position / audioState.duration) * 100 : 0;

  const resetChallenge = () => {
    stopAudio();
    resetRecording();
    setEvaluationResult(null);
  };

  const markExerciseCompleted = async () => {
    if (user?.id) {
      try {
        // Import the progress update function
        const { updateCurrentProgress } = await import('@/utils/progressTracker');
        
        // Update progress to mark as completed
        await updateCurrentProgress(
          user.id,
          4, // Stage 4
          3  // Exercise 3 (NewsSummaryChallenge)
        );
        console.log('Exercise marked as completed: Stage 4, Exercise 3 (NewsSummaryChallenge)');
      } catch (error) {
        console.warn('Failed to mark exercise as completed:', error);
      }
    }
  };

  const handleRedo = () => {
    setCurrentItemIndex(0);
    setEvaluationResult(null);
    setIsCompleted(false);
    setShowCompletionDialog(false);
    stopAudio();
    resetRecording();
    console.log('✅ News summary challenge reset complete');
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    // Trigger re-fetch
    window.location.reload();
  };

  const handleNextArticle = () => {
    if (currentItemIndex < newsItems.length - 1) {
      stopAudio(); // Stop current audio
      resetRecording();
      setCurrentItemIndex(currentItemIndex + 1);
      setEvaluationResult(null);
    }
  };

  const handlePreviousArticle = () => {
    if (currentItemIndex > 0) {
      stopAudio(); // Stop current audio
      resetRecording();
      setCurrentItemIndex(currentItemIndex - 1);
      setEvaluationResult(null);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
          <CardContent className="p-6 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2 text-primary">Loading News Articles</h3>
            <p className="text-muted-foreground">Please wait while we fetch the latest news items...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error || newsItems.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md border-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-3xl shadow-lg overflow-hidden">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2 text-red-700 dark:text-red-300">Unable to Load News Articles</h3>
            <p className="text-muted-foreground mb-4">
              {error || 'No news articles are available at the moment.'}
            </p>
            <div className="space-y-2">
              <Button onClick={handleRetry} className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>

            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Consistent Header Section */}
        <div className="px-6 py-8">
          {/* Breadcrumb Navigation */}
          <PracticeBreadcrumb className="mb-6" />
          
          {/* Header with Back Button and Title */}
          <div className="relative flex items-center justify-center mb-8 text-center">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/dashboard/practice/stage-4')}
              className="absolute left-0 group w-12 h-12 rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-300" />
            </Button>
            
            <div className="space-y-3">
              <div className="inline-block p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                <MessageSquare className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                News Summary Challenge
              </h1>
              <p className="text-muted-foreground text-lg">
                Listen to news articles and practice summarizing them in English
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 pb-8 space-y-6">
          {/* Title */}
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent">Listen & Speak Your Summary</h2>
            <p className="text-muted-foreground text-lg mb-4">
              {currentItemIndex + 1} of {newsItems.length} articles
            </p>
          </div>

          {/* News Article Content */}
          <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-foreground font-medium text-lg">{currentArticle?.title}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={handlePreviousArticle}
                      disabled={currentItemIndex === 0}
                      variant="outline"
                      size="sm"
                      className="px-6 py-2 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 shadow-lg hover:shadow-xl hover:-translate-y-0.5 rounded-2xl"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={handleNextArticle}
                      disabled={currentItemIndex === newsItems.length - 1}
                      variant="outline"
                      size="sm"
                      className="px-6 py-2 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 shadow-lg hover:shadow-xl hover:-translate-y-0.5 rounded-2xl"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Article Text */}
              <div className="bg-white/60 dark:bg-primary/30 p-4 rounded-2xl border border-primary/20">
                <h3 className="text-lg font-semibold mb-3 text-primary">
                  Read the Article
                </h3>
                <p className="text-foreground leading-relaxed text-sm md:text-base">
                  {currentArticle?.content}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Audio Player */}
          <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 text-[#1582B4]">
                    Listen to Audio Version
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Play the audio and listen carefully to understand the content
                  </p>
                  {audioState.error && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300 text-sm">
                      {audioState.error}
                    </div>
                  )}
                </div>
                <Button
                  onClick={handlePlayPause}
                  disabled={isLoadingAudio}
                  className="bg-[#1582B4] hover:bg-[#1582B4]/90 text-white rounded-full w-16 h-16 disabled:opacity-50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                  size="icon"
                >
                  {isLoadingAudio ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : audioState.isPlaying ? (
                    <Pause className="h-8 w-8" />
                  ) : (
                    <Play className="h-8 w-8" />
                  )}
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-muted/30 rounded-full h-2 mb-2">
                <div 
                  className="bg-[#1582B4] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                {audioState.duration > 0 ? (
                  `${Math.floor(audioState.position)}s / ${Math.floor(audioState.duration)}s`
                ) : (
                  currentArticle?.duration || 'Loading...'
                )}
              </div>
            </CardContent>
          </Card>



          {/* Recording Section */}
          <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-primary">Record Your Summary</h3>
              <p className="text-sm text-muted-foreground mb-4">
                After reading the article and listening to the audio, record yourself summarizing the key points in your own words.
              </p>
              
              {recordingError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300 text-sm">
                  {recordingError}
                </div>
              )}
              
              <div className="flex flex-col items-center space-y-4">
                <Button
                  onClick={handleRecordToggle}
                  className={`px-8 py-3 rounded-full text-lg font-medium transition-all ${
                    isRecording 
                      ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl hover:scale-105' 
                      : 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl hover:scale-105'
                  }`}
                  size="lg"
                >
                  {isRecording ? (
                    <>
                      <Square className="h-5 w-5 mr-2" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="h-5 w-5 mr-2" />
                      {audioBlob ? 'Record Again' : 'Start Recording'}
                    </>
                  )}
                </Button>
                
                {audioBlob && !isRecording && (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="flex items-center space-x-2 text-primary">
                      <CheckCircle className="h-5 w-5" />
                      <span>Recording completed!</span>
                    </div>
                    <Button
                      onClick={handleEvaluateRecording}
                      disabled={isEvaluating}
                      className="bg-gradient-to-r from-[#1582B4] to-[#1582B4]/90 hover:from-[#1582B4]/90 hover:to-[#1582B4] text-white px-6 py-2 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                    >
                      {isEvaluating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Evaluating...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Get Feedback
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Evaluation Results */}
          {evaluationResult && (
            <Card className="border-0 bg-gradient-to-br from-[#1582B4]/10 to-indigo-50 dark:from-[#1582B4]/20 dark:to-indigo-900/20 rounded-3xl shadow-lg overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-center text-2xl font-bold bg-gradient-to-r from-[#1582B4] via-[#1582B4]/90 to-[#1582B4] bg-clip-text text-transparent">Your Evaluation Results</h3>
                  <Button
                    onClick={() => setEvaluationResult(null)}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {evaluationResult.score !== undefined && (
                  <div className="mb-4 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg">
                    <div className="text-center">
                      <div className={`text-4xl font-bold mb-2 ${
                        evaluationResult.score === 0 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent'
                      }`}>
                        {evaluationResult.score}/100
                      </div>
                      <div className="text-sm text-muted-foreground">Overall Score</div>
                    </div>
                  </div>
                )}
                
                {evaluationResult.feedback && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Feedback</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg">
                      {evaluationResult.feedback}
                    </p>
                  </div>
                )}
                
                {evaluationResult.transcription && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">What You Said</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg italic">
                      "{evaluationResult.transcription}"
                    </p>
                  </div>
                )}
                
                <div className="grid md:grid-cols-2 gap-4">
                  {evaluationResult.strengths && evaluationResult.strengths.length > 0 && (
                    <div className="bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl p-4 border border-primary/20">
                      <h4 className="font-semibold mb-2 text-primary">Strengths</h4>
                      <ul className="text-sm space-y-1">
                        {evaluationResult.strengths.map((strength, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {evaluationResult.areas_for_improvement && evaluationResult.areas_for_improvement.length > 0 && (
                    <div className="bg-gradient-to-br from-[#1582B4]/10 to-[#1582B4]/20 rounded-2xl p-4 border border-primary/20">
                      <h4 className="font-semibold mb-2 text-[#1582B4]">Areas for Improvement</h4>
                      <ul className="text-sm space-y-1">
                        {evaluationResult.areas_for_improvement.map((area, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <TrendingUp className="h-4 w-4 text-[#1582B4] mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300">{area}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                {evaluationResult.suggestions && evaluationResult.suggestions.length > 0 && (
                  <div className="mt-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl p-4 border border-primary/20">
                    <h4 className="font-semibold mb-2 text-primary">Suggestions</h4>
                    <ul className="text-sm space-y-2">
                      {evaluationResult.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-gray-700 dark:text-gray-300">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col items-center space-y-4">
            <div className="flex space-x-4">
              <Button
                onClick={resetChallenge}
                variant="outline"
                className="px-8 py-3 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 shadow-lg hover:shadow-xl hover:-translate-y-0.5 rounded-2xl"
              >
                Reset
              </Button>

            </div>
          </div>

          {/* Instructions */}
          <Card className="border-0 bg-gradient-to-br from-muted/30 to-muted/50 rounded-2xl shadow-lg">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Listen to the news article, then record your spoken summary
                </p>
              </div>
            </CardContent>
          </Card>

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
                    🎉 You've completed the News Summary Challenge!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Great job on practicing your summarizing skills with news articles. You can redo the exercise to practice more or continue to other exercises.
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
    </div>
  );
} 