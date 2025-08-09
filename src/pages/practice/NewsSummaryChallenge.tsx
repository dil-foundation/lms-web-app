import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { ArrowLeft, Play, Pause, Mic, RefreshCw, AlertCircle, Loader2, Square, CheckCircle, X, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NewsSummaryService, { NewsSummaryItem, NewsSummaryEvaluationResponse } from '@/services/newsSummaryService';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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

      const result = await NewsSummaryService.evaluate(evaluationRequest);
      setEvaluationResult(result);
      toast.success('Evaluation completed!');
      
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
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">Loading News Articles</h3>
            <p className="text-muted-foreground">Please wait while we fetch the latest news items...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error || newsItems.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Unable to Load News Articles</h3>
            <p className="text-muted-foreground mb-4">
              {error || 'No news articles are available at the moment.'}
            </p>
            <div className="space-y-2">
              <Button onClick={handleRetry} className="w-full">
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/dashboard/practice/stage-4')}
            className="shrink-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1">
            <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">
              News Summary ({currentItemIndex + 1}/{newsItems.length})
            </h1>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Listen & Speak Your Summary</h2>
          </div>

          {/* News Article Content */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-foreground font-medium">{currentArticle?.title}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={handlePreviousArticle}
                      disabled={currentItemIndex === 0}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={handleNextArticle}
                      disabled={currentItemIndex === newsItems.length - 1}
                      variant="outline"
                      size="sm"
                      className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Article Text */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                <h3 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200">
                  Read the Article
                </h3>
                <p className="text-foreground leading-relaxed text-sm md:text-base">
                  {currentArticle?.content}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Audio Player */}
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 text-green-800 dark:text-green-200">
                    Listen to Audio Version
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Play the audio and listen carefully to understand the content
                  </p>
                  {audioState.error && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
                      {audioState.error}
                    </div>
                  )}
                </div>
                <Button
                  onClick={handlePlayPause}
                  disabled={isLoadingAudio}
                  className="bg-green-500 hover:bg-green-600 text-white rounded-full w-12 h-12 disabled:opacity-50"
                  size="icon"
                >
                  {isLoadingAudio ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : audioState.isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6" />
                  )}
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-muted/30 rounded-full h-2 mb-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
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
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-green-800 dark:text-green-200">Record Your Summary</h3>
              <p className="text-sm text-muted-foreground mb-4">
                After reading the article and listening to the audio, record yourself summarizing the key points in your own words.
              </p>
              
              {recordingError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
                  {recordingError}
                </div>
              )}
              
              <div className="flex flex-col items-center space-y-4">
                <Button
                  onClick={handleRecordToggle}
                  className={`px-8 py-3 rounded-full text-lg font-medium transition-all ${
                    isRecording 
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
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
                    <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span>Recording completed!</span>
                    </div>
                    <Button
                      onClick={handleEvaluateRecording}
                      disabled={isEvaluating}
                      className="bg-green-500 hover:bg-green-600 text-white px-6 py-2"
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
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">Your Evaluation Results</h3>
                  <Button
                    onClick={() => setEvaluationResult(null)}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {evaluationResult.score && (
                  <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                        {evaluationResult.score}/100
                      </div>
                      <div className="text-sm text-muted-foreground">Overall Score</div>
                    </div>
                  </div>
                )}
                
                {evaluationResult.feedback && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Feedback</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded border">
                      {evaluationResult.feedback}
                    </p>
                  </div>
                )}
                
                {evaluationResult.transcription && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">What You Said</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded border italic">
                      "{evaluationResult.transcription}"
                    </p>
                  </div>
                )}
                
                <div className="grid md:grid-cols-2 gap-4">
                  {evaluationResult.strengths && evaluationResult.strengths.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-green-700 dark:text-green-300">Strengths</h4>
                      <ul className="text-sm space-y-1">
                        {evaluationResult.strengths.map((strength, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {evaluationResult.areas_for_improvement && evaluationResult.areas_for_improvement.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-orange-700 dark:text-orange-300">Areas for Improvement</h4>
                      <ul className="text-sm space-y-1">
                        {evaluationResult.areas_for_improvement.map((area, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <TrendingUp className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300">{area}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                {evaluationResult.suggestions && evaluationResult.suggestions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2 text-blue-700 dark:text-blue-300">Suggestions</h4>
                    <ul className="text-sm space-y-2">
                      {evaluationResult.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
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
                className="px-6 py-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary"
              >
                Reset
              </Button>

            </div>
          </div>

          {/* Instructions */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Listen to the news article, then record your spoken summary
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 