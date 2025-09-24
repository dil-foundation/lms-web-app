import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { CompletionDialog } from '@/components/practice/CompletionDialog';
import { ArrowLeft, Mic, Users, User, Heart, Shield, AlertTriangle, Loader2, Zap, Play, Pause, Target, MessageSquare, CheckCircle, RotateCcw, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  sensitiveScenarioService, 
  SensitiveScenario,
  SensitiveScenarioEvaluation
} from '@/services/sensitiveScenarioService';
import { useAuth } from '@/contexts/AuthContext';

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

interface RoleplayMessage {
  id: string;
  sender: 'ai' | 'user';
  message: string;
  role: string;
  timestamp: Date;
  emotionalTone?: string;
}

export default function SensitiveScenarioRoleplay() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [scenarios, setScenarios] = useState<SensitiveScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<SensitiveScenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<SensitiveScenarioEvaluation | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  // Load scenarios on component mount
  useEffect(() => {
    const loadScenarios = async () => {
      try {
        setLoading(true);
        const fetchedScenarios = await sensitiveScenarioService.getAllScenarios();
        
        if (fetchedScenarios && Array.isArray(fetchedScenarios)) {
          setScenarios(fetchedScenarios);
          
          // Set first scenario as default if available
          if (fetchedScenarios.length > 0) {
            setSelectedScenario(fetchedScenarios[0]);
          }
        } else {
          console.error('Invalid scenarios response format:', fetchedScenarios);
          setScenarios([]);
        }
      } catch (error) {
        console.error('Error loading scenarios:', error);
        toast.error('Failed to load sensitive scenario scenarios');
        setScenarios([]);
      } finally {
        setLoading(false);
      }
    };

    loadScenarios();
  }, []);

  const [conversation, setConversation] = useState<RoleplayMessage[]>([]);

  const handleScenarioClick = (scenario: SensitiveScenario) => {
    setSelectedScenario(scenario);
    setHasStarted(true);
    setShowFeedback(true);
  };

  const handleStartRoleplay = () => {
    setHasStarted(true);
    setShowFeedback(true);
  };

  const handleStartRecording = async () => {
    try {
      console.log('Starting recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        console.log('Data available, size:', event.data.size);
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstart = () => {
        console.log('Recording started');
      };

      recorder.onstop = async () => {
        console.log('Recording stopped, chunks:', chunks.length);
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        console.log('Audio blob created, size:', audioBlob.size);
        
        if (audioBlob.size > 0) {
          await handleEvaluateRecording(audioBlob);
        } else {
          console.error('No audio data recorded');
          toast.error('No audio was recorded. Please try again.');
          setIsEvaluating(false);
        }
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast.error('Recording error occurred');
        setIsRecording(false);
      };

      setMediaRecorder(recorder);
      setRecordedChunks(chunks);
      setRecordingStartTime(Date.now());
      
      // Start recording with timeslice to ensure data is available
      recorder.start(1000); // Record in 1-second chunks
      setIsRecording(true);
      
      console.log('MediaRecorder started, state:', recorder.state);
      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  const handleStopRecording = () => {
    console.log('Stop recording called, mediaRecorder state:', mediaRecorder?.state);
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      console.log('Stopping media recorder...');
      mediaRecorder.stop();
      setIsRecording(false);
      toast.success('Recording stopped, evaluating...');
    } else {
      console.error('MediaRecorder is not available or already inactive');
      toast.error('Recording is not active');
      setIsRecording(false);
    }
  };

  const resetRoleplay = () => {
    setHasStarted(false);
    setIsRecording(false);
    setShowFeedback(false);
    setConversation([]);
    setEvaluationResult(null);
    setIsEvaluating(false);
    setIsCompleted(false);
    setShowCompletionDialog(false);
    cleanupCurrentAudio();
  };

  const handleRedo = () => {
    setShowCompletionDialog(false);
    setIsCompleted(false);
    setEvaluationResult(null);
    setConversation([]);
  };

  const handleContinue = () => {
    setShowCompletionDialog(false);
    resetRoleplay();
  };

  const cleanupCurrentAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      setCurrentAudio(null);
    }
    setIsPlayingAudio(false);
  };

  const handlePlayAudio = async () => {
    if (!selectedScenario) return;

    try {
      // If audio is already playing, pause it
      if (isPlayingAudio && currentAudio) {
        currentAudio.pause();
        return;
      }

      // If we have current audio but it's paused, resume it
      if (currentAudio && !isPlayingAudio) {
        currentAudio.play();
        return;
      }

      // Load new audio
      setIsLoadingAudio(true);
      const audioUrl = await sensitiveScenarioService.getScenarioAudio(selectedScenario.id);
      
      cleanupCurrentAudio();
      
      const audio = new Audio(audioUrl);
      
      audio.onplay = () => setIsPlayingAudio(true);
      audio.onpause = () => setIsPlayingAudio(false);
      audio.onended = () => {
        setIsPlayingAudio(false);
        setCurrentAudio(null);
      };
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        toast.error('Failed to play audio');
        setIsPlayingAudio(false);
        setCurrentAudio(null);
      };

      setCurrentAudio(audio);
      await audio.play();
      
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error('Failed to load audio');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleEvaluateRecording = async (audioBlob: Blob) => {
    console.log('Starting evaluation, blob size:', audioBlob.size);
    
    if (!selectedScenario || !user) {
      console.error('Missing scenario or user:', { selectedScenario: !!selectedScenario, user: !!user });
      toast.error('Missing scenario or user information');
      return;
    }

    try {
      setIsEvaluating(true);
      console.log('Evaluation state set to true');
      
      // Convert audio blob to base64 using FileReader for better compatibility
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix to get just the base64 string
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });
      
      console.log('Base64 conversion completed, length:', base64Audio.length);
      
      // Calculate time spent in seconds
      const timeSpentSeconds = Math.floor((Date.now() - recordingStartTime) / 1000);
      console.log('Time spent:', timeSpentSeconds, 'seconds');
      
      // Generate filename
      const filename = `sensitive_scenario_${selectedScenario.id}_${Date.now()}.wav`;
      console.log('Calling evaluation API with:', {
        scenarioId: selectedScenario.id,
        filename,
        userId: user.id,
        timeSpentSeconds,
        audioLength: base64Audio.length
      });
      
      const evaluation = await sensitiveScenarioService.evaluateSensitiveScenario(
        base64Audio,
        selectedScenario.id,
        filename,
        user.id,
        timeSpentSeconds,
        false // urdu_used - you can modify this based on your needs
      ) as any;
      
      console.log('Evaluation result:', evaluation);
      
      // Handle API error responses (like no_speech_detected)
      if (evaluation.success === false || evaluation.error) {
        const errorMessage = evaluation.message || evaluation.error || 'Speech evaluation failed';
        
        // Create modified feedback object for error cases
        const errorFeedback = {
          ...evaluation,
          overall_score: 0,
          fluency_score: 0,
          vocabulary_score: 0,
          content_relevance_score: 0,
          feedback: errorMessage,
          areas_for_improvement: ['Please speak more clearly and try again']
        };
        
        setEvaluationResult(errorFeedback);
        toast.error('Speech evaluation failed: ' + errorMessage);
        return;
      }
      
      setEvaluationResult(evaluation);
      toast.success('Evaluation completed!');
      
      // Check if the exercise is completed based on API response
      if (evaluation?.exercise_completion?.exercise_completed) {
        // Exercise is completed according to the API
        setIsCompleted(true);
        setShowCompletionDialog(true);
      }
      
    } catch (error) {
      console.error('Error evaluating recording:', error);
      toast.error(`Failed to evaluate recording: ${error.message}`);
    } finally {
      setIsEvaluating(false);
      console.log('Evaluation state set to false');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-primary font-medium">Loading sensitive scenario scenarios...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto">
          {/* Consistent Header Section */}
          <div className="px-4 sm:px-6 py-6 sm:py-8">
            {/* Breadcrumb Navigation */}
            <PracticeBreadcrumb className="mb-6" />
            
            {/* Header with Back Button and Title */}
            <div className="relative flex items-center justify-center mb-6 sm:mb-8 text-center">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate('/dashboard/practice/stage-6')}
                className="absolute left-0 group w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform duration-300" />
              </Button>
              
              <div className="space-y-2 sm:space-y-3 px-12 sm:px-0">
                <div className="inline-block p-3 sm:p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                  <Users className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Sensitive Scenario Roleplay
                </h1>
                <p className="text-muted-foreground text-base sm:text-lg">
                  Practice handling sensitive situations with empathy and communication skills
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="px-4 sm:px-6 pb-8 space-y-6">
            {/* Scenario Selection */}
            <div className="text-center">
              <p className="text-muted-foreground text-sm sm:text-lg">Click on a scenario to start the roleplay immediately</p>
            </div>

            {scenarios.length > 0 ? (
              <div className="space-y-4">
                {scenarios.map((scenario, index) => (
                    <Card 
                      key={scenario.id}
                      className="cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden"
                      onClick={() => handleScenarioClick(scenario)}
                    >
                      <CardContent className="p-5 sm:p-6">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center flex-shrink-0 border border-primary/30">
                            <Users className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <span className="font-semibold text-primary text-sm sm:text-base">Scenario:</span> {scenario.scenario || scenario.context || scenario.description || 'No content available'}
                              </div>
                              {(scenario.difficulty || scenario.difficulty_level) && (
                                <span className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium ml-3 sm:ml-4 flex-shrink-0 border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm ${
                                  (scenario.difficulty === 'Advanced' || scenario.difficulty_level === 'Advanced')
                                    ? 'text-red-600 dark:text-red-400' 
                                    : (scenario.difficulty === 'Intermediate' || scenario.difficulty_level === 'Intermediate')
                                    ? 'text-orange-600 dark:text-orange-400'
                                    : 'text-green-600 dark:text-green-400'
                                }`}>
                                  {scenario.difficulty || scenario.difficulty_level}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
                <CardContent className="p-8 text-center">
                  <Users className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h4 className="text-xl font-semibold text-primary mb-2">No Scenarios Available</h4>
                  <p className="text-muted-foreground text-base">
                    Please check back later or contact support if this issue persists.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Roleplay Guidelines */}
            <Card className="border-0 bg-gradient-to-br from-muted/30 to-muted/50 rounded-2xl shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4 text-primary">Roleplay Guidelines</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-base">
                      Focus on emotional intelligence and empathy in your responses
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-base">
                      Use diplomatic language and consider cultural sensitivities
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-base">
                      Practice active listening and validate others' perspectives
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-base">
                      Aim for win-win solutions and constructive outcomes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Warning Notice */}
            <Card className="border-0 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-2xl shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mt-1">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 text-lg">
                      Sensitive Content Notice
                    </h4>
                    <p className="text-yellow-700 dark:text-yellow-300 text-base">
                      These scenarios involve complex emotional and professional situations. Practice with respect and cultural awareness.
                    </p>
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
              onClick={resetRoleplay}
              className="absolute left-0 group w-12 h-12 rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-300" />
            </Button>
            
            <div className="space-y-3">
              <div className="inline-block p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Sensitive Scenario Roleplay
              </h1>
              <p className="text-muted-foreground text-lg">
                Practice handling sensitive situations with empathy and communication skills
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="px-6 pb-8 space-y-6">

                      {/* Current Scenario */}
            {selectedScenario && (
              <div className="mb-6 space-y-4">
                {/* Scenario Header */}
                <Card className="border-0 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-3xl shadow-xl overflow-hidden backdrop-blur-sm">
                  <CardContent className="p-0">
                    {/* Header Section */}
                    <div className="bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 p-6 border-b border-primary/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
                            <Users className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-primary">
                              Sensitive Scenario Practice
                            </h2>
                            <p className="text-primary/70 text-sm">
                              Handle this situation with empathy and professionalism
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {/* Audio Button */}
                          <Button
                            onClick={handlePlayAudio}
                            disabled={isLoadingAudio}
                            className={`w-12 h-12 rounded-full shadow-lg transition-all duration-300 ${
                              isLoadingAudio
                                ? 'bg-gray-500 cursor-not-allowed text-white'
                                : isPlayingAudio
                                ? 'bg-[#1582B4] hover:bg-[#1582B4]/90 text-white hover:scale-105'
                                : 'bg-[#1582B4] hover:bg-[#1582B4]/90 text-white hover:scale-105'
                            }`}
                            size="icon"
                          >
                            {isLoadingAudio ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : isPlayingAudio ? (
                              <Pause className="w-5 h-5" />
                            ) : (
                              <Play className="w-5 h-5" />
                            )}
                          </Button>
                          
                          {/* Difficulty Badge */}
                          {(selectedScenario.difficulty || selectedScenario.difficulty_level) && (
                            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                              (selectedScenario.difficulty === 'Advanced' || selectedScenario.difficulty_level === 'Advanced')
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                                : (selectedScenario.difficulty === 'Intermediate' || selectedScenario.difficulty_level === 'Intermediate')
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            }`}>
                              {selectedScenario.difficulty || selectedScenario.difficulty_level}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Scenario Content */}
                    <div className="p-6">
                      <div className="bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-800/60 backdrop-blur-sm p-6 rounded-2xl border border-primary/20 shadow-inner">
                        <div className="flex items-start space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/30 rounded-xl flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-primary mb-3 text-lg">
                              Scenario
                            </h3>
                            <p className="text-foreground leading-relaxed text-base">
                              {(selectedScenario as any).scenario || selectedScenario.context || 'No scenario description available'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              {/* Expected Keywords Section */}
              {selectedScenario.expected_keywords && selectedScenario.expected_keywords.length > 0 && (
                <Card className="border-0 bg-gradient-to-br from-[#1582B4]/5 via-[#1582B4]/10 to-[#1582B4]/5 rounded-3xl shadow-xl overflow-hidden backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#1582B4]/20 to-[#1582B4]/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Zap className="h-5 w-5 text-[#1582B4]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#1582B4] mb-3 text-lg">
                          Key Concepts to Include
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {selectedScenario.expected_keywords.map((keyword, index) => (
                            <span 
                              key={index}
                              className="px-3 py-2 bg-gradient-to-r from-[#1582B4]/10 to-[#1582B4]/20 text-[#1582B4] text-sm rounded-full border border-[#1582B4]/20 font-medium hover:bg-[#1582B4]/20 transition-colors duration-200"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          Incorporate these concepts naturally to demonstrate professional communication skills.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}





          {/* Evaluation Loading State */}
          {isEvaluating && (
            <Card className="mb-6 border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
              <CardContent className="p-6 text-center">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div>
                    <h4 className="font-medium text-primary text-lg">Evaluating Your Response</h4>
                    <p className="text-muted-foreground text-base">
                      Please wait while we analyze your communication skills...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evaluation Results */}
          {evaluationResult && !isEvaluating && (
            <Card className="mb-6 border-0 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-3xl shadow-xl overflow-hidden backdrop-blur-sm">
              <CardContent className="p-0">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 p-6 border-b border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="font-semibold text-primary text-lg">
                        Communication Evaluation
                      </h4>
                    </div>
                    <Button
                      onClick={() => setEvaluationResult(null)}
                      variant="outline"
                      size="sm"
                      className="border-primary/30 text-primary hover:bg-primary/10"
                    >
                      Close
                    </Button>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Scores Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-primary/20">
                      <div className={`text-2xl font-bold ${
                        (evaluationResult.overall_score || 0) === 0 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-primary'
                      }`}>
                        {evaluationResult.overall_score || 0}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">Overall</div>
                    </div>
                    <div className="text-center p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-primary/20">
                      <div className={`text-2xl font-bold ${
                        (evaluationResult.fluency_score || 0) === 0 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-primary'
                      }`}>
                        {evaluationResult.fluency_score || 0}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">Fluency</div>
                    </div>
                    <div className="text-center p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-primary/20">
                      <div className={`text-2xl font-bold ${
                        (evaluationResult.vocabulary_score || 0) === 0 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-primary'
                      }`}>
                        {evaluationResult.vocabulary_score || 0}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">Vocabulary</div>
                    </div>
                    <div className="text-center p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-primary/20">
                      <div className={`text-2xl font-bold ${
                        (evaluationResult.content_relevance_score || 0) === 0 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-primary'
                      }`}>
                        {evaluationResult.content_relevance_score || 0}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">Relevance</div>
                    </div>
                  </div>

                  {/* Feedback */}
                  {evaluationResult.feedback && (
                    <div className="bg-gradient-to-br from-primary/10 to-primary/20 p-4 rounded-xl border border-primary/20">
                      <p className="text-sm text-primary leading-relaxed">
                        {evaluationResult.feedback}
                      </p>
                    </div>
                  )}

                  {/* Strengths and Improvements */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {evaluationResult.strengths && evaluationResult.strengths.length > 0 && (
                      <div className="bg-white/60 dark:bg-gray-800/60 p-4 rounded-xl border border-primary/20">
                        <h5 className="font-semibold text-primary mb-3 text-sm flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Strengths
                        </h5>
                        <ul className="text-sm text-muted-foreground space-y-2">
                          {evaluationResult.strengths.slice(0, 3).map((strength: string, index: number) => (
                            <li key={index} className="flex items-start space-x-2">
                              <span className="text-primary mt-0.5 font-bold">•</span>
                              <span className="leading-relaxed">{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {evaluationResult.areas_for_improvement && evaluationResult.areas_for_improvement.length > 0 && (
                      <div className="bg-white/60 dark:bg-gray-800/60 p-4 rounded-xl border border-orange-200/50 dark:border-orange-700/50">
                        <h5 className="font-semibold text-orange-600 dark:text-orange-400 mb-3 text-sm flex items-center">
                          <Target className="h-4 w-4 mr-2" />
                          Areas for Improvement
                        </h5>
                        <ul className="text-sm text-muted-foreground space-y-2">
                          {evaluationResult.areas_for_improvement.slice(0, 3).map((area: string, index: number) => (
                            <li key={index} className="flex items-start space-x-2">
                              <span className="text-orange-500 mt-0.5 font-bold">•</span>
                              <span className="leading-relaxed">{area}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons Section */}
          <div className="space-y-8">
            {/* Primary Action Button */}
            <div className="flex justify-center">
              {!isRecording && !isEvaluating ? (
                <Button
                  onClick={handleStartRecording}
                  className="group bg-gradient-to-r from-primary via-primary/90 to-primary hover:from-primary/90 hover:via-primary hover:to-primary/90 text-white px-12 py-4 rounded-2xl text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
                  size="lg"
                  disabled={!selectedScenario}
                >
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mr-3 group-hover:bg-white/30 transition-all duration-300">
                    <Mic className="h-4 w-4 text-white" />
                  </div>
                  Start Recording Response
                </Button>
              ) : isRecording ? (
                <Button
                  onClick={handleStopRecording}
                  className="group bg-gradient-to-r from-red-500 via-red-600 to-red-500 hover:from-red-600 hover:via-red-700 hover:to-red-600 text-white px-12 py-4 rounded-2xl text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 animate-pulse"
                  size="lg"
                >
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mr-3 group-hover:bg-white/30 transition-all duration-300">
                    <Square className="h-4 w-4 text-white" />
                  </div>
                  Stop Recording
                </Button>
              ) : null}
            </div>

            {/* Secondary Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Button
                onClick={resetRoleplay}
                variant="outline"
                className="group px-6 py-3 rounded-xl border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/10 text-primary transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg font-medium"
              >
                <Users className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                Choose Different Scenario
              </Button>
              <Button
                onClick={() => navigate('/dashboard/practice/stage-6')}
                variant="outline"
                className="group px-6 py-3 rounded-xl border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
                Back to Stage 6
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Dialog */}
      <CompletionDialog
        isOpen={showCompletionDialog}
        onClose={() => setShowCompletionDialog(false)}
        exerciseName="Sensitive Scenario Roleplay"
        score={evaluationResult?.overall_score || 0}
        onRedo={handleRedo}
        onContinue={handleContinue}
      />
    </div>
  );
} 