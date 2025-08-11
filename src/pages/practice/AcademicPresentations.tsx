import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Mic, GraduationCap, Loader2, Play, Pause, Target, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { toast } from 'sonner';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { 
  academicPresentationService, 
  AcademicPresentationTopic,
  AcademicPresentationAudioResponse,
  EvaluationResponse 
} from '@/services/academicPresentationService';



export default function AcademicPresentations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [topics, setTopics] = useState<AcademicPresentationTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<AcademicPresentationTopic | null>(null);
  const [loading, setLoading] = useState(true);
  

  const [hasStarted, setHasStarted] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  


  // Audio hooks
  const { 
    state: audioState, 
    playAudio, 
    pauseAudio, 
    stopAudio 
  } = useAudioPlayer();
  
  const {
    isRecording,
    startRecording,
    stopRecording,
    audioBlob,
    error: recordingError
  } = useAudioRecorder();

  // Load topics on component mount
  useEffect(() => {
    const loadTopics = async () => {
      try {
        setLoading(true);
        const fetchedTopics = await academicPresentationService.getAllTopics();
        setTopics(fetchedTopics);
        
        // Don't auto-select a topic, let user choose from the list
      } catch (error) {
        console.error('Error loading topics:', error);
        toast.error('Failed to load presentation topics');
      } finally {
        setLoading(false);
      }
    };

    loadTopics();
  }, []);

  // Handle audio recording error
  useEffect(() => {
    if (recordingError) {
      toast.error('Recording error: ' + recordingError);
    }
  }, [recordingError]);

  // Handle audio blob when recording stops
  useEffect(() => {
    if (audioBlob && startTime && selectedTopic && user) {
      handleEvaluatePresentation();
    }
  }, [audioBlob]);

  const handleStartPresenting = async () => {
    if (!selectedTopic) {
      toast.error('Please select a topic first');
      return;
    }

    try {
      setStartTime(new Date());
      setHasStarted(true);
      await startRecording();
      toast.success('Recording started! Begin your presentation.');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const handleStopPresenting = async () => {
    try {
      await stopRecording();
      toast.info('Recording stopped. Processing your presentation...');
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast.error('Failed to stop recording');
    }
  };

  const handleEvaluatePresentation = async () => {
    if (!audioBlob || !selectedTopic || !user || !startTime) {
      return;
    }

    try {
      setIsEvaluating(true);
      
      const timeSpentSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
      const audioBase64 = await academicPresentationService.audioToBase64(audioBlob);
      const filename = academicPresentationService.generateFilename(selectedTopic.id, user.id);

      const evaluationData = {
        audio_base64: audioBase64,
        topic_id: selectedTopic.id,
        filename: filename,
        user_id: user.id,
        time_spent_seconds: timeSpentSeconds,
        urdu_used: false // This would be determined by the API
      };

      const result = await academicPresentationService.evaluatePresentation(evaluationData);
      setEvaluation(result);
      toast.success('Presentation evaluated successfully!');
    } catch (error) {
      console.error('Error evaluating presentation:', error);
      toast.error('Failed to evaluate presentation');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handlePlayAudio = async () => {
    if (!selectedTopic) return;

    // If audio is currently playing, pause it
    if (audioState.isPlaying) {
      pauseAudio();
      return;
    }

    // If we already have audio URL, play it
    if (audioUrl) {
      await playAudio(audioUrl);
      return;
    }

    // Otherwise, fetch and play audio
    setIsLoadingAudio(true);
    try {
      const audioResponse = await academicPresentationService.getTopicAudio(selectedTopic.id);
      if (audioResponse.audio_url) {
        setAudioUrl(audioResponse.audio_url);
        await playAudio(audioResponse.audio_url);
        console.log('✅ Audio fetched and playing:', audioResponse.audio_url);
      }
    } catch (error) {
      console.error('Error loading and playing audio:', error);
      toast.error('Failed to load and play audio. Please try again.');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const resetPresentation = () => {
    setHasStarted(false);
    setEvaluation(null);
    setStartTime(null);
    setSelectedTopic(null); // Allow user to choose a different topic
    setAudioUrl(null);
    stopAudio();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-primary font-medium">Loading presentation topics...</p>
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
              onClick={() => {
                if (selectedTopic) {
                  // If viewing a topic, go back to topic selection
                  setSelectedTopic(null);
                  setHasStarted(false);
                  setEvaluation(null);
                  setStartTime(null);
                  setAudioUrl(null);
                  stopAudio();
                } else {
                  // If on topic selection, go back to Stage 5
                  navigate('/dashboard/practice/stage-5');
                }
              }}
              className="absolute left-0 group w-12 h-12 rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-300" />
            </Button>
            
            <div className="space-y-3">
              <div className="inline-block p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                <GraduationCap className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Academic Presentation
              </h1>
              <p className="text-muted-foreground text-lg">
                Develop your presentation skills with academic topics
              </p>
            </div>
          </div>

          {/* Activity Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-lg">
              <CardContent className="p-4 text-center">
                <Target className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Presentation Skills</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-lg">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 text-[#1582B4] mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Academic Growth</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 pb-8 space-y-6">
          {/* Title */}
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-[#1582B4] bg-clip-text text-transparent">
              Presentation Challenge
            </h2>
          </div>

          {/* Topic Selection */}
          {!selectedTopic && (
            <div>
              <h3 className="text-xl font-semibold mb-6 bg-gradient-to-r from-primary to-[#1582B4] bg-clip-text text-transparent">
                Choose Your Presentation Topic
              </h3>

              {topics.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {topics.map((topic) => (
                    <Card 
                      key={topic.id} 
                      className="cursor-pointer border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                      onClick={() => setSelectedTopic(topic)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center shrink-0 border border-primary/30">
                            <GraduationCap className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-primary mb-2">
                              {topic.topic}
                            </h4>
                            {topic.difficulty_level && (
                              <div className="mt-2">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-primary/20 text-primary">
                                  {topic.difficulty_level}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-0 bg-gradient-to-br from-muted/30 to-muted/50 rounded-2xl shadow-lg">
                  <CardContent className="p-8 text-center">
                    <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-muted-foreground mb-2">No Topics Available</h4>
                    <p className="text-muted-foreground text-sm">
                      Please check back later or contact support if this issue persists.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Selected Presentation Topic */}
          {selectedTopic && (
            <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/30">
                    <GraduationCap className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-primary mb-2">
                    {selectedTopic.topic}
                  </h3>
                  
                  {/* Expected Keywords */}
                  {selectedTopic.expected_keywords && selectedTopic.expected_keywords.length > 0 && (
                    <div className="mt-4 mb-4">
                      <h4 className="text-sm font-medium text-primary mb-2">Expected Keywords:</h4>
                      <div className="flex flex-wrap justify-center gap-2">
                        {selectedTopic.expected_keywords.map((keyword, index) => (
                          <span 
                            key={index}
                            className="px-3 py-1 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-primary/20 text-primary text-xs rounded-full"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Audio Play Button */}
                  <div className="mt-4 mb-4 flex justify-center">
                    <button
                      onClick={handlePlayAudio}
                      disabled={isLoadingAudio}
                      className="w-16 h-16 bg-gradient-to-r from-[#1582B4] to-[#1582B4]/90 hover:from-[#1582B4]/90 hover:to-[#1582B4] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#1582B4]/40 focus:ring-offset-2"
                      title={isLoadingAudio ? "Loading audio..." : audioState.isPlaying ? "Pause audio" : "Play audio"}
                    >
                      {isLoadingAudio ? (
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      ) : audioState.isPlaying ? (
                        <Pause className="h-6 w-6 text-white ml-0" />
                      ) : (
                        <Play className="h-6 w-6 text-white ml-0.5" />
                      )}
                    </button>
                  </div>
                  
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTopic(null)}
                      className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 text-primary hover:bg-white/80 dark:hover:bg-gray-800/80 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      Change Topic
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Presentation Guidelines - Only show when topic is selected and not started */}
          {selectedTopic && !hasStarted && (
            <Card className="border-0 bg-gradient-to-br from-muted/30 to-muted/50 rounded-2xl shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-primary">Presentation Guidelines</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Structure your presentation with clear introduction, main points, and conclusion
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Support your arguments with relevant evidence and examples
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Maintain academic tone and use sophisticated vocabulary
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Aim for 5-7 minutes of presentation time
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evaluation Loading */}
          {isEvaluating && (
            <Card className="border-0 bg-gradient-to-br from-[#1582B4]/10 to-[#1582B4]/20 rounded-3xl shadow-lg overflow-hidden">
              <CardContent className="p-6">
                <div className="text-center">
                  <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-[#1582B4]" />
                  <h3 className="text-lg font-semibold text-[#1582B4] mb-2">
                    Evaluating Your Presentation
                  </h3>
                  <p className="text-[#1582B4]/80 text-sm">
                    Please wait while we analyze your presentation...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evaluation Results */}
          {evaluation && evaluation.evaluation && (
            <div>
              <h3 className="text-xl font-semibold mb-6 bg-gradient-to-r from-primary to-[#1582B4] bg-clip-text text-transparent">
                Presentation Evaluation
              </h3>
              
              {/* Overall Score */}
              <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden mb-4">
                <CardContent className="p-6">
                  <div className="text-center">
                    <h4 className="text-2xl font-bold bg-gradient-to-r from-primary to-[#1582B4] bg-clip-text text-transparent mb-2">
                      Overall Score: {evaluation.evaluation.evaluation.overall_score}/100
                    </h4>
                    <div className="w-full bg-white/60 dark:bg-gray-800/60 rounded-full h-3 mb-4">
                      <div 
                        className="bg-gradient-to-r from-primary to-[#1582B4] h-3 rounded-full transition-all duration-500"
                        style={{ width: `${evaluation.evaluation.evaluation.overall_score}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Next Steps */}
              {evaluation.evaluation.evaluation.next_steps && (
                <Card className="border-0 bg-gradient-to-br from-[#1582B4]/10 to-[#1582B4]/20 rounded-2xl shadow-lg mb-4">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-[#1582B4] mb-2">Next Steps</h4>
                    <p className="text-[#1582B4]/80 text-sm">
                      {evaluation.evaluation.evaluation.next_steps}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Encouragement */}
              {evaluation.evaluation.evaluation.encouragement && (
                <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-primary mb-2">Encouragement</h4>
                    <p className="text-primary/80 text-sm">
                      {evaluation.evaluation.evaluation.encouragement}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Action Button - Only show when topic is selected */}
          {selectedTopic && (
            <div className="text-center">
              {!hasStarted && !evaluation ? (
                <Button
                  onClick={handleStartPresenting}
                  disabled={loading}
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white px-8 py-3 rounded-full text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                  size="lg"
                >
                  <Mic className="h-5 w-5 mr-2" />
                  Start Presenting
                </Button>
              ) : isRecording ? (
                <Button
                  onClick={handleStopPresenting}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-3 rounded-full text-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                  size="lg"
                >
                  <Mic className="h-5 w-5 mr-2" />
                  Stop Presenting
                </Button>
              ) : evaluation ? (
                <div className="text-center">
                  <Button
                    onClick={resetPresentation}
                    variant="outline"
                    className="px-6 py-2 border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 text-primary hover:bg-white/80 dark:hover:bg-gray-800/80 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Try Again
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 