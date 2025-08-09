import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mic, Building2, User, Loader2, Play, Pause, VolumeX, Square, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MockInterviewService, { MockInterviewScenario, MockInterviewQuestion, MockInterviewEvaluationResponse } from '@/services/mockInterviewService';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAuth } from '@/hooks/useAuth';

export default function MockInterviewPractice() {
  const navigate = useNavigate();
  const [selectedScenario, setSelectedScenario] = useState<string>('university');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [userResponses, setUserResponses] = useState<string[]>([]);

  // API state
  const [scenarios, setScenarios] = useState<MockInterviewScenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Current question details from API
  const [currentQuestionDetail, setCurrentQuestionDetail] = useState<MockInterviewQuestion | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  // Audio playback state
  const { state: audioState, playAudio, pauseAudio, resumeAudio, stopAudio } = useAudioPlayer();
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Audio recording state
  const { audioBlob, isRecording, startRecording, stopRecording, resetRecording } = useAudioRecorder();
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);
  
  // Evaluation state
  const [feedback, setFeedback] = useState<MockInterviewEvaluationResponse | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  
  // Auth
  const { user } = useAuth();
  
  // Cleanup timeout ref (still needed for cleanup)
  const evaluationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentScenario = scenarios.find(s => s.id === selectedScenario) || scenarios[0];
  const currentQuestion = currentScenario?.questions?.[currentQuestionIndex];

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fetch mock interview questions on component mount
  useEffect(() => {
    const fetchMockInterviewData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('🔍 Fetching mock interview questions...');
        const questions = await MockInterviewService.getAll();
        const groupedScenarios = MockInterviewService.groupByScenario(questions);
        
        console.log('📊 Grouped scenarios:', groupedScenarios);
        setScenarios(groupedScenarios);
        
        // If no scenarios from API, use fallback scenarios
        if (groupedScenarios.length === 0) {
          const fallbackScenarios: MockInterviewScenario[] = [
            {
              id: 'university',
              title: 'University Admissions Interview',
              description: 'You are in an interview with a university admissions officer. Answer their questions confidently.',
              questions: [
                {
                  id: '1',
                  scenario_type: 'university',
                  question: 'Why should we admit you?',
                  question_order: 1
                },
                {
                  id: '2',
                  scenario_type: 'university',
                  question: 'Tell me about your leadership experience and how it has prepared you for university-level challenges.',
                  question_order: 2
                },
                {
                  id: '3',
                  scenario_type: 'university',
                  question: 'Can you provide a specific example of a time you demonstrated innovation or problem-solving skills?',
                  question_order: 3
                },
                {
                  id: '4',
                  scenario_type: 'university',
                  question: 'How do you handle stress and pressure in academic situations?',
                  question_order: 4
                },
                {
                  id: '5',
                  scenario_type: 'university',
                  question: 'What are your long-term career goals and how does our university fit into them?',
                  question_order: 5
                }
              ]
            },
            {
              id: 'job',
              title: 'Job Interview',
              description: 'You are interviewing for your dream job. Show your qualifications and enthusiasm.',
              questions: [
                {
                  id: '6',
                  scenario_type: 'job',
                  question: 'Tell me about yourself and why you\'re interested in this position.',
                  question_order: 1
                },
                {
                  id: '7',
                  scenario_type: 'job',
                  question: 'What are your greatest strengths and how do they relate to this role?',
                  question_order: 2
                },
                {
                  id: '8',
                  scenario_type: 'job',
                  question: 'Describe a challenging situation you faced at work and how you handled it.',
                  question_order: 3
                },
                {
                  id: '9',
                  scenario_type: 'job',
                  question: 'Where do you see yourself in five years?',
                  question_order: 4
                },
                {
                  id: '10',
                  scenario_type: 'job',
                  question: 'Do you have any questions for us?',
                  question_order: 5
                }
              ]
            },
            {
              id: 'scholarship',
              title: 'Scholarship Interview',
              description: 'You are applying for a prestigious scholarship. Demonstrate your worthiness.',
              questions: [
                {
                  id: '11',
                  scenario_type: 'scholarship',
                  question: 'Why do you deserve this scholarship?',
                  question_order: 1
                },
                {
                  id: '12',
                  scenario_type: 'scholarship',
                  question: 'How will this scholarship help you achieve your academic goals?',
                  question_order: 2
                },
                {
                  id: '13',
                  scenario_type: 'scholarship',
                  question: 'Tell me about a time when you overcame a significant obstacle.',
                  question_order: 3
                },
                {
                  id: '14',
                  scenario_type: 'scholarship',
                  question: 'What impact do you hope to make in your field of study?',
                  question_order: 4
                },
                {
                  id: '15',
                  scenario_type: 'scholarship',
                  question: 'How do you plan to give back to the community?',
                  question_order: 5
                }
              ]
            }
          ];
          setScenarios(fallbackScenarios);
          console.log('📋 Using fallback scenarios');
        }
        
      } catch (err) {
        console.error('Failed to fetch mock interview questions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load mock interview questions');
        
        // Use fallback scenarios on error
        const fallbackScenarios: MockInterviewScenario[] = [
    {
      id: 'university',
      title: 'University Admissions Interview',
      description: 'You are in an interview with a university admissions officer. Answer their questions confidently.',
      questions: [
              {
                id: '1',
                scenario_type: 'university',
                question: 'Why should we admit you?',
                question_order: 1
              },
              {
                id: '2',
                scenario_type: 'university',
                question: 'Tell me about your leadership experience and how it has prepared you for university-level challenges.',
                question_order: 2
              },
              {
                id: '3',
                scenario_type: 'university',
                question: 'Can you provide a specific example of a time you demonstrated innovation or problem-solving skills?',
                question_order: 3
              },
              {
                id: '4',
                scenario_type: 'university',
                question: 'How do you handle stress and pressure in academic situations?',
                question_order: 4
              },
              {
                id: '5',
                scenario_type: 'university',
                question: 'What are your long-term career goals and how does our university fit into them?',
                question_order: 5
              }
      ]
    },
    {
      id: 'job',
      title: 'Job Interview',
      description: 'You are interviewing for your dream job. Show your qualifications and enthusiasm.',
      questions: [
              {
                id: '6',
                scenario_type: 'job',
                question: 'Tell me about yourself and why you\'re interested in this position.',
                question_order: 1
              },
              {
                id: '7',
                scenario_type: 'job',
                question: 'What are your greatest strengths and how do they relate to this role?',
                question_order: 2
              },
              {
                id: '8',
                scenario_type: 'job',
                question: 'Describe a challenging situation you faced at work and how you handled it.',
                question_order: 3
              },
              {
                id: '9',
                scenario_type: 'job',
                question: 'Where do you see yourself in five years?',
                question_order: 4
              },
              {
                id: '10',
                scenario_type: 'job',
                question: 'Do you have any questions for us?',
                question_order: 5
              }
      ]
    },
    {
      id: 'scholarship',
      title: 'Scholarship Interview',
      description: 'You are applying for a prestigious scholarship. Demonstrate your worthiness.',
      questions: [
              {
                id: '11',
                scenario_type: 'scholarship',
                question: 'Why do you deserve this scholarship?',
                question_order: 1
              },
              {
                id: '12',
                scenario_type: 'scholarship',
                question: 'How will this scholarship help you achieve your academic goals?',
                question_order: 2
              },
              {
                id: '13',
                scenario_type: 'scholarship',
                question: 'Tell me about a time when you overcame a significant obstacle.',
                question_order: 3
              },
              {
                id: '14',
                scenario_type: 'scholarship',
                question: 'What impact do you hope to make in your field of study?',
                question_order: 4
              },
              {
                id: '15',
                scenario_type: 'scholarship',
                question: 'How do you plan to give back to the community?',
                question_order: 5
              }
            ]
          }
        ];
        setScenarios(fallbackScenarios);
        console.log('📋 Using fallback scenarios due to error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMockInterviewData();
  }, []);

  // Stop audio when question changes
  useEffect(() => {
    stopAudio();
  }, [currentQuestionIndex, stopAudio]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  // Fetch individual question details
  const fetchQuestionDetail = useCallback(async (questionId: string) => {
    try {
      setIsLoadingQuestion(true);
      setQuestionError(null);
      
      console.log('🔍 Fetching question detail for ID:', questionId);
      const questionDetail = await MockInterviewService.getById(questionId);
      
      console.log('📥 Question detail received:', questionDetail);
      setCurrentQuestionDetail(questionDetail);
      
    } catch (err) {
      console.error('Failed to fetch question detail:', err);
      setQuestionError(err instanceof Error ? err.message : 'Failed to load question details');
      setCurrentQuestionDetail(null);
    } finally {
      setIsLoadingQuestion(false);
    }
  }, []);

  const handleStartInterview = useCallback(async (scenarioId?: string) => {
    // If a specific scenario is provided, set it first
    if (scenarioId) {
      setSelectedScenario(scenarioId);
    }
    
    setHasStarted(true);
    setCurrentQuestionIndex(0);
    
    // Get the scenario to use (either the provided one or current one)
    const scenarioToUse = scenarioId 
      ? scenarios.find(s => s.id === scenarioId) 
      : currentScenario;
    
    // Fetch details for the first question
    if (scenarioToUse?.questions?.[0]?.id) {
      await fetchQuestionDetail(scenarioToUse.questions[0].id);
    }
  }, [scenarios, currentScenario, fetchQuestionDetail]);

  const handleNextQuestion = useCallback(async () => {
    if (currentScenario && currentQuestionIndex < currentScenario.questions.length - 1) {
      // Stop any ongoing processes
      stopAudio();
      
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      scrollToTop();
      
      // Fetch details for the next question
      const nextQuestion = currentScenario.questions[nextIndex];
      if (nextQuestion?.id) {
        await fetchQuestionDetail(nextQuestion.id);
      }
    }
  }, [currentScenario, currentQuestionIndex, stopAudio, fetchQuestionDetail]);

  const handlePrevQuestion = useCallback(async () => {
    if (currentQuestionIndex > 0) {
      // Stop any ongoing processes
      stopAudio();
      
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      scrollToTop();
      
      // Fetch details for the previous question
      if (currentScenario?.questions?.[prevIndex]?.id) {
        await fetchQuestionDetail(currentScenario.questions[prevIndex].id);
      }
    }
  }, [currentQuestionIndex, currentScenario, stopAudio, fetchQuestionDetail]);

  const resetSession = useCallback(() => {
    // Clear any pending evaluation timeouts
    if (evaluationTimeoutRef.current) {
      clearTimeout(evaluationTimeoutRef.current);
      evaluationTimeoutRef.current = null;
    }
    
    // Reset states
    resetRecording();
    setFeedback(null);
    setEvaluationError(null);
    setRecordingStartTime(null);
    setIsEvaluating(false);
    console.log('🔄 Mock interview session reset');
  }, [resetRecording]);

  const forceReset = useCallback(() => {
    console.log('🚨 Force resetting evaluation state...');
    setIsEvaluating(false);
    setEvaluationError('Evaluation was reset by user');
    resetSession();
  }, [resetSession]);

  const resetInterview = useCallback(() => {
    setHasStarted(false);
    setCurrentQuestionIndex(0);
    setUserResponses([]);
    setCurrentQuestionDetail(null);
    setQuestionError(null);
    stopAudio(); // Stop any playing audio when resetting
    resetSession(); // Reset recording and feedback
  }, [stopAudio, resetSession]);

  const handlePlayQuestionAudio = async () => {
    if (!currentQuestionDetail?.id) {
      console.error('❌ No current question detail or ID available');
      return;
    }
    
    console.log('🔊 Starting audio playback for question:', currentQuestionDetail.id);
    
    try {
      setIsLoadingAudio(true);
      console.log('⏳ Loading audio...');
      
      const audioUrl = await MockInterviewService.getAudio(currentQuestionDetail.id);
      console.log('✅ Audio URL received:', audioUrl);
      
      await playAudio(audioUrl);
      console.log('🎵 Audio playback started');
    } catch (error) {
      console.error('❌ Failed to play question audio:', error);
      // You can add a toast notification here if needed
    } finally {
      setIsLoadingAudio(false);
      console.log('✅ Audio loading finished');
    }
  };

  const handleToggleAudio = () => {
    console.log('🎵 Audio button clicked');
    console.log('Current audio state:', {
      isPlaying: audioState.isPlaying,
      isLoaded: audioState.isLoaded,
      error: audioState.error
    });
    console.log('Current question detail:', currentQuestionDetail?.id);
    
    if (audioState.isPlaying) {
      console.log('⏸️ Pausing audio');
      pauseAudio();
    } else if (audioState.isLoaded) {
      console.log('▶️ Resuming audio');
      resumeAudio();
    } else {
      console.log('🆕 Starting new audio playback');
      handlePlayQuestionAudio();
    }
  };

  // Recording functions
  const handleStartRecording = useCallback(async () => {
    try {
      console.log('🎤 Starting mock interview recording...');
      setRecordingStartTime(new Date());
      setFeedback(null);
      setEvaluationError(null);
      await startRecording();
      console.log('✅ Mock interview recording started');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
    }
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    try {
      console.log('🛑 Stopping mock interview recording...');
      await stopRecording();
      console.log('✅ Mock interview recording stopped');
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
    }
  }, [stopRecording]);

  const handleEvaluateRecording = useCallback(async () => {
    // Prevent duplicate evaluations
    if (isEvaluating) {
      console.log('⚠️ Evaluation already in progress, skipping duplicate call');
      return;
    }

    if (!audioBlob || !currentQuestionDetail?.id || !user?.id || !recordingStartTime) {
      console.error('❌ Missing required data for evaluation:', {
        hasAudioBlob: !!audioBlob,
        hasQuestionId: !!currentQuestionDetail?.id,
        hasUserId: !!user?.id,
        hasStartTime: !!recordingStartTime
      });
      return;
    }

    try {
      setIsEvaluating(true);
      setEvaluationError(null);

      console.log('🎯 Converting audio blob to base64...');
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const timeSpentSeconds = Math.floor((Date.now() - recordingStartTime.getTime()) / 1000);
      const filename = `mock_interview_${currentQuestionDetail.id}_${Date.now()}.wav`;

      const evaluationRequest = {
        audio_base64: base64Audio,
        question_id: parseInt(currentQuestionDetail.id),
        filename: filename,
        user_id: user.id,
        time_spent_seconds: timeSpentSeconds,
        urdu_used: false
      };

      console.log('🚀 Sending mock interview evaluation request...');
      
      const evaluationResult = await MockInterviewService.evaluate(evaluationRequest);
      
      console.log('✅ Mock interview evaluation completed:', evaluationResult);
      setFeedback(evaluationResult as any);

    } catch (error) {
      console.error('❌ Failed to evaluate mock interview:', error);
      setEvaluationError(error instanceof Error ? error.message : 'Failed to evaluate response');
    } finally {
      setIsEvaluating(false);
      console.log('🔄 Evaluation state reset - isEvaluating set to false');
    }
  }, [audioBlob, currentQuestionDetail?.id, user?.id, recordingStartTime]);

  // Manual evaluation trigger - removed auto-evaluation to prevent infinite loops

  // Reset session when question changes to prevent cross-contamination
  useEffect(() => {
    if (currentQuestionDetail?.id) {
      console.log('🔄 Question changed, resetting session');
      resetSession();
    }
  }, [currentQuestionDetail?.id, resetSession]);

  // Cleanup evaluation state on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, cleaning up evaluation state');
      
      // Clear any pending timeouts
      if (evaluationTimeoutRef.current) {
        clearTimeout(evaluationTimeoutRef.current);
        evaluationTimeoutRef.current = null;
      }
    };
  }, []);

  if (!hasStarted) {
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
                Mock Interview
              </h1>
            </div>
            
            <div className="w-10"></div>
          </div>

          {/* Scenario Selection */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center mb-6">Choose Your Interview Scenario</h2>
            
            {isLoading ? (
              <Card className="bg-muted/50">
                <CardContent className="p-6">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-green-600" />
                    <p className="text-green-600 dark:text-green-400">Loading interview scenarios...</p>
                  </div>
                </CardContent>
              </Card>
            ) : error ? (
              <Card className="border-red-200 dark:border-red-800">
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-red-600 dark:text-red-400 mb-2">Failed to load scenarios</p>
                    <p className="text-sm text-muted-foreground">Using fallback scenarios</p>
                  </div>
                </CardContent>
              </Card>
            ) : null}
            
            {scenarios.map((scenario) => (
              <Card 
                key={scenario.id}
                className="cursor-pointer transition-all hover:shadow-lg hover:ring-2 hover:ring-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                onClick={() => handleStartInterview(scenario.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{scenario.title}</h3>
                      <p className="text-muted-foreground text-sm">{scenario.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-muted-foreground">
                          {scenario.questions.length} questions
                        </p>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                          Click to Start
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="text-center pt-4">
              <p className="text-muted-foreground text-sm">
                Select a scenario to begin your mock interview session
              </p>
            </div>
          </div>
        </div>
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
            onClick={resetInterview}
            className="shrink-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1">
            <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">
              Mock Interview
            </h1>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Interview Content */}
        <div className="space-y-8">
          {/* Scenario Title */}
          <Card className="border-0 bg-gradient-to-r from-green-500/10 to-green-600/10 dark:from-green-400/10 dark:to-green-500/10">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shrink-0">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-green-600 dark:text-green-400 mb-1">
                  {currentScenario.title}
                </h2>
                  <p className="text-green-700 dark:text-green-300 text-sm leading-relaxed">
                  {currentScenario.description}
                </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Question */}
          <Card className="bg-muted/30 border-0">
            <CardContent className="p-8">
              {isLoadingQuestion ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-green-600" />
                  <p className="text-green-600 dark:text-green-400 font-medium">Loading question details...</p>
                </div>
              ) : questionError ? (
                <div className="text-center py-4">
                  <p className="text-red-600 dark:text-red-400 mb-2 font-medium">Failed to load question details</p>
                  <p className="text-sm text-muted-foreground">Using fallback question</p>
                </div>
              ) : null}
              
              <div className="text-center space-y-6">
                {/* Question Text */}
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-6">
                    {currentQuestionDetail?.question || currentQuestion?.question || 'Loading question...'}
                  </h3>
                  
                  {/* Audio Play Button */}
                  {currentQuestionDetail && (
                    <div className="flex flex-col items-center space-y-3">
                      <Button
                        onClick={handleToggleAudio}
                        disabled={isLoadingAudio}
                        className={`w-20 h-20 rounded-full shadow-xl transition-all duration-200 ${
                          isLoadingAudio
                            ? 'bg-green-400 hover:bg-green-400 cursor-not-allowed scale-95'
                            : audioState.isPlaying
                            ? 'bg-blue-500 hover:bg-blue-600 scale-105'
                            : audioState.error
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-green-500 hover:bg-green-600 hover:scale-105'
                        }`}
                        size="icon"
                      >
                        {isLoadingAudio ? (
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        ) : audioState.isPlaying ? (
                          <Pause className="w-9 h-9 text-white" />
                        ) : audioState.error ? (
                          <VolumeX className="w-9 h-9 text-white" />
                        ) : (
                          <Play className="w-9 h-9 text-white ml-1" />
                        )}
                      </Button>
                      
                      <p className="text-sm text-muted-foreground font-medium">
                        {isLoadingAudio 
                          ? 'Generating audio...' 
                          : audioState.isPlaying 
                          ? 'Playing question audio' 
                          : audioState.error 
                          ? 'Audio unavailable' 
                          : 'Listen to the question'
                        }
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Tips Section - Inline */}
                {currentQuestionDetail?.tips && currentQuestionDetail.tips.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-blue-600 dark:text-blue-400 text-sm">💡</span>
                </div>
                <div className="flex-1">
                        <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                          Interview Tips
                        </h4>
                        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                          {currentQuestionDetail.tips.map((tip, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-blue-500 mr-2 mt-1.5 text-xs">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Expected Keywords */}
          {currentQuestionDetail?.expected_keywords && currentQuestionDetail.expected_keywords.length > 0 && (
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-white text-lg">🎯</span>
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-3">
                      Expected Keywords to Include
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {currentQuestionDetail.expected_keywords.map((keyword, index) => (
                        <span 
                          key={index}
                          className="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-blue-600 transition-colors"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-3 font-medium">
                      Try to incorporate these keywords naturally in your response
                    </p>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Expected Structure */}
          {currentQuestionDetail?.expected_structure && (
            <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-white text-lg">🏗️</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-3">
                      Suggested Structure
                    </h3>
                    <div className="bg-white/60 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-700">
                      <p className="text-green-700 dark:text-green-300 font-semibold text-center">
                        {currentQuestionDetail.expected_structure}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recording Section */}
          <div className="flex flex-col items-center space-y-6">
            {/* Recording Button */}
            <div className="flex flex-col items-center space-y-3">
              {!isRecording ? (
                <Button
                  onClick={handleStartRecording}
                  disabled={isEvaluating}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-10 py-4 rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
                  size="lg"
                >
                  <Mic className="h-6 w-6 mr-3" />
                  {isEvaluating ? 'Evaluating...' : 'Start Recording'}
                </Button>
              ) : (
            <Button
                  onClick={handleStopRecording}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-10 py-4 rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              size="lg"
            >
                  <Square className="h-6 w-6 mr-3" />
                  Stop Recording
                </Button>
              )}
              
              {/* Recording Status */}
              {isRecording && (
                <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Recording in progress...</span>
                </div>
              )}
              
              {/* Evaluation Status */}
              {isEvaluating && (
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Evaluating your response...</span>
                  </div>
                  <Button
                    onClick={forceReset}
                    variant="outline"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground border-dashed"
                  >
                    Cancel Evaluation
                  </Button>
                </div>
              )}
              
                            {/* Evaluate Button - Manual trigger */}
              {audioBlob && !isRecording && !isEvaluating && !feedback && (
                <div className="flex flex-col items-center space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">
                    Great! Your response has been recorded.
                  </p>
                  <Button
                    onClick={handleEvaluateRecording}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-3 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    size="lg"
                  >
                    <Mic className="h-5 w-5 mr-2" />
                    Evaluate Response
                  </Button>
                </div>
              )}

              {/* Reset Button */}
              {(audioBlob || feedback) && !isRecording && !isEvaluating && (
                <Button
                  onClick={resetSession}
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
            </div>

            {/* Navigation Buttons - Only show if there are multiple questions */}
            {currentScenario && currentScenario.questions.length > 1 && (
              <div className="flex space-x-3">
                <Button
                  onClick={handlePrevQuestion}
                  variant="outline"
                  disabled={currentQuestionIndex === 0}
                  className="px-6 py-2.5 rounded-xl border-2 font-medium transition-all duration-200 hover:shadow-md disabled:opacity-50 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800 dark:hover:text-gray-100"
                >
                  Previous
                </Button>
                <Button
                  onClick={handleNextQuestion}
                  variant="outline"
                  disabled={currentQuestionIndex === currentScenario.questions.length - 1}
                  className="px-6 py-2.5 rounded-xl border-2 font-medium transition-all duration-200 hover:shadow-md disabled:opacity-50 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800 dark:hover:text-gray-100"
                >
                  Next Question
                </Button>
              </div>
            )}
          </div>

          {/* Feedback Section */}
          {feedback && (
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <CardHeader>
                <CardTitle className="text-center text-blue-600 dark:text-blue-400">
                  Interview Evaluation Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Overall Score */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Overall</h3>
                  <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-4">
                    {feedback.score}/100
                  </div>
                </div>

                {/* Detailed Scores */}
                {(feedback.fluency_score || feedback.pronunciation_score || feedback.content_relevance_score || feedback.grammar_score) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {feedback.fluency_score && (
                      <div className="text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {feedback.fluency_score}
                        </div>
                        <div className="text-xs text-muted-foreground">Fluency</div>
                      </div>
                    )}
                    {feedback.pronunciation_score && (
                      <div className="text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {feedback.pronunciation_score}
                        </div>
                        <div className="text-xs text-muted-foreground">Pronunciation</div>
                      </div>
                    )}
                    {feedback.content_relevance_score && (
                      <div className="text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {feedback.content_relevance_score}
                        </div>
                        <div className="text-xs text-muted-foreground">Content</div>
                      </div>
                    )}
                    {feedback.grammar_score && (
                      <div className="text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {feedback.grammar_score}
                        </div>
                        <div className="text-xs text-muted-foreground">Grammar</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Feedback Text */}
                {feedback.feedback && (
                  <div className="bg-white/60 dark:bg-gray-800/60 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Feedback</h4>
                    <p className="text-sm text-muted-foreground">{feedback.feedback}</p>
                  </div>
                )}

                {/* Keywords Used */}
                {feedback.keywords_used && feedback.keywords_used.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
                      Keywords Used ✅
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {feedback.keywords_used.map((keyword, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-green-500 text-white text-xs rounded font-medium"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vocabulary Used */}
                {feedback.vocabulary_used && feedback.vocabulary_used.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                      Vocabulary Used
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {feedback.vocabulary_used.map((word, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-blue-500 text-white text-xs rounded font-medium"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths */}
                {feedback.strengths && feedback.strengths.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
                      Strengths 💪
                    </h4>
                    <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                      {feedback.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-500 mr-2 mt-1 text-xs">•</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Areas for Improvement */}
                {feedback.areas_for_improvement && feedback.areas_for_improvement.length > 0 && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-2">
                      Areas for Improvement 📈
                    </h4>
                    <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                      {feedback.areas_for_improvement.map((area, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-orange-500 mr-2 mt-1 text-xs">•</span>
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestions */}
                {feedback.suggestions && feedback.suggestions.length > 0 && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2">
                      Suggestions 💡
                    </h4>
                    <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                      {feedback.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-purple-500 mr-2 mt-1 text-xs">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Next Steps */}
                {feedback.next_steps && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
                      Next Steps 🎯
                    </h4>
                    <p className="text-sm text-indigo-700 dark:text-indigo-300">{feedback.next_steps}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Evaluation Error */}
          {evaluationError && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-red-600 dark:text-red-400 font-medium mb-2">
                    Evaluation Failed
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {evaluationError}
                  </p>
            <Button
                    onClick={resetSession}
              variant="outline"
                    size="sm"
                    className="mt-3 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
            >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Try Again
            </Button>
          </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 