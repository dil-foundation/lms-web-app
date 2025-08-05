import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Mic, BookOpen, GitBranch, Loader2, Play, Pause, Volume2, VolumeX, MicOff, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AbstractTopicsService, { AbstractTopic, AbstractTopicEvaluationResponse, CurrentTopicResponse } from '@/services/abstractTopicsService';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAuth } from '@/hooks/useAuth';

export default function AbstractTopicMonologue() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds
  const [hasStarted, setHasStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // API state
  const [topics, setTopics] = useState<AbstractTopic[]>([]);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Audio recording state
  const { isRecording, audioBlob, error: recordingError, startRecording, stopRecording, resetRecording } = useAudioRecorder();
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  
  // Audio playback state
  const { state: audioState, playAudio, pauseAudio, resumeAudio, stopAudio } = useAudioPlayer();
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Evaluation state
  const [feedback, setFeedback] = useState<AbstractTopicEvaluationResponse | null>(null);

  const currentTopic = topics[currentTopicIndex];

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Stop audio when topic changes
  useEffect(() => {
    stopAudio();
  }, [currentTopicIndex, stopAudio]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 string
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleEvaluateRecording = useCallback(async () => {
    console.log('🔍 Starting evaluation check...', {
      audioBlob: !!audioBlob,
      currentTopic: !!currentTopic,
      user: !!user,
      recordingStartTime: !!recordingStartTime
    });
    
    if (!audioBlob || !currentTopic || !user || !recordingStartTime) {
      console.warn('⚠️ Missing required data for evaluation:', {
        audioBlob: !!audioBlob,
        currentTopic: !!currentTopic,
        user: !!user,
        recordingStartTime: !!recordingStartTime
      });
      return;
    }
    
    setIsEvaluating(true);
    console.log('⚙️ Starting evaluation process...');
    
    try {
      const timeSpentSeconds = Math.floor((Date.now() - recordingStartTime) / 1000);
      console.log('🕐 Time spent recording:', timeSpentSeconds, 'seconds');
      
      console.log('🔄 Converting audio blob to base64...', audioBlob.size, 'bytes');
      const audioBase64 = await blobToBase64(audioBlob);
      console.log('✅ Audio converted to base64, length:', audioBase64.length);
      
      const evaluationData = {
        audio_base64: audioBase64,
        topic_id: parseInt(currentTopic.id, 10) || 0, // Convert to number
        filename: `abstract_topic_${currentTopic.id}_${Date.now()}.webm`,
        user_id: user.id,
        time_spent_seconds: timeSpentSeconds,
        urdu_used: false, // Default to false as per API spec
      };

      console.log('📤 Sending evaluation request...', {
        topic_id: evaluationData.topic_id,
        user_id: evaluationData.user_id,
        filename: evaluationData.filename,
        time_spent_seconds: evaluationData.time_spent_seconds,
        urdu_used: evaluationData.urdu_used,
        audio_size: audioBase64.length
      });

      const evaluationResult = await AbstractTopicsService.evaluate(evaluationData);
      console.log('📥 Received evaluation result:', evaluationResult);
      
      setFeedback(evaluationResult);
      setIsCompleted(true);
      console.log('✅ Evaluation completed successfully');
      
    } catch (error: any) {
      console.error('❌ Failed to evaluate recording:', error);
      setError(error.message || 'Failed to evaluate recording');
    } finally {
      setIsEvaluating(false);
    }
  }, [audioBlob, currentTopic, user, recordingStartTime]);

  const handleStopRecording = useCallback(async () => {
    if (!isRecording || !currentTopic) return;
    
    try {
      console.log('🎤 Stopping recording...');
      stopRecording();
    } catch (error: any) {
      console.error('Failed to stop recording:', error);
      setError(error.message || 'Failed to stop recording');
    }
  }, [isRecording, currentTopic, stopRecording]);

  // Debug: Log recording state changes
  useEffect(() => {
    console.log('📊 Recording state changed:', {
      isRecording,
      hasStarted,
      isEvaluating,
      hasAudioBlob: !!audioBlob,
      hasFeedback: !!feedback,
      recordingError
    });
  }, [isRecording, hasStarted, isEvaluating, audioBlob, feedback, recordingError]);

  // Watch for audioBlob changes and trigger evaluation when recording stops
  useEffect(() => {
    if (audioBlob && !isRecording && hasStarted && !isEvaluating && !feedback) {
      console.log('🎵 Audio blob detected, starting evaluation...', audioBlob);
      handleEvaluateRecording();
    }
  }, [audioBlob, isRecording, hasStarted, isEvaluating, feedback, handleEvaluateRecording]);

  // Fetch topics and user's current topic on component mount
  useEffect(() => {
    const fetchTopicsAndCurrentPosition = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch topics and current topic position simultaneously
        const [fetchedTopics, currentTopicResponse] = await Promise.all([
          AbstractTopicsService.getAll(),
          user ? AbstractTopicsService.getCurrentTopic(user.id) : Promise.resolve({ success: false } as CurrentTopicResponse)
        ]);
        
        setTopics(fetchedTopics);
        
        // If no topics are returned, use fallback topics
        if (fetchedTopics.length === 0) {
          const fallbackTopics: AbstractTopic[] = [
            { 
              id: '1', 
              title: "The importance of education",
              key_connectors: ["however", "furthermore", "in addition", "on the other hand", "therefore"],
              vocabulary_focus: ["academic", "learning", "knowledge", "development", "opportunity"]
            },
            { 
              id: '2', 
              title: "The impact of technology on society",
              key_connectors: ["although", "nevertheless", "meanwhile", "consequently", "in contrast"],
              vocabulary_focus: ["digital", "innovation", "connectivity", "automation", "progress"]
            },
            { 
              id: '3', 
              title: "Environmental conservation and sustainability",
              key_connectors: ["while", "moreover", "despite", "as a result", "alternatively"],
              vocabulary_focus: ["ecosystem", "renewable", "conservation", "climate", "biodiversity"]
            },
            { 
              id: '4', 
              title: "The role of art in human culture",
              key_connectors: ["similarly", "in particular", "for instance", "by comparison", "ultimately"],
              vocabulary_focus: ["creativity", "expression", "cultural", "aesthetic", "heritage"]
            },
            { 
              id: '5', 
              title: "The future of work and automation",
              key_connectors: ["nonetheless", "additionally", "in fact", "on the contrary", "subsequently"],
              vocabulary_focus: ["employment", "artificial intelligence", "productivity", "adaptation", "skills"]
            },
            { 
              id: '6', 
              title: "Social media and its effects on relationships",
              key_connectors: ["however", "on the other hand", "furthermore", "in contrast", "additionally"],
              vocabulary_focus: ["connection", "communication", "virtual", "interaction", "community"]
            }
          ];
          setTopics(fallbackTopics);
        }

        // Set current topic index based on user's progress
        const topicsToUse = fetchedTopics.length > 0 ? fetchedTopics : [
          { 
            id: '1', 
            title: "The importance of education",
            key_connectors: ["however", "furthermore", "in addition", "on the other hand", "therefore"],
            vocabulary_focus: ["academic", "learning", "knowledge", "development", "opportunity"]
          },
          { 
            id: '2', 
            title: "The impact of technology on society",
            key_connectors: ["although", "nevertheless", "meanwhile", "consequently", "in contrast"],
            vocabulary_focus: ["digital", "innovation", "connectivity", "automation", "progress"]
          },
          { 
            id: '3', 
            title: "Environmental conservation and sustainability",
            key_connectors: ["while", "moreover", "despite", "as a result", "alternatively"],
            vocabulary_focus: ["ecosystem", "renewable", "conservation", "climate", "biodiversity"]
          },
          { 
            id: '4', 
            title: "The role of art in human culture",
            key_connectors: ["similarly", "in particular", "for instance", "by comparison", "ultimately"],
            vocabulary_focus: ["creativity", "expression", "cultural", "aesthetic", "heritage"]
          },
          { 
            id: '5', 
            title: "The future of work and automation",
            key_connectors: ["nonetheless", "additionally", "in fact", "on the contrary", "subsequently"],
            vocabulary_focus: ["employment", "artificial intelligence", "productivity", "adaptation", "skills"]
          },
          { 
            id: '6', 
            title: "Social media and its effects on relationships",
            key_connectors: ["however", "on the other hand", "furthermore", "in contrast", "additionally"],
            vocabulary_focus: ["connection", "communication", "virtual", "interaction", "community"]
          }
        ];
        
        if (currentTopicResponse.success && currentTopicResponse.current_topic) {
          console.log('🎯 Setting current topic from user progress:', currentTopicResponse.current_topic);
          
          // Try to find the topic by ID first
          const topicIndex = topicsToUse.findIndex(topic => 
            topic.id === currentTopicResponse.current_topic!.topic_id
          );
          
          if (topicIndex !== -1) {
            console.log('✅ Found topic by ID, setting index to:', topicIndex);
            setCurrentTopicIndex(topicIndex);
            
            // Show a brief message about resuming
            if (topicIndex > 0) {
              console.log(`🔄 Resuming from topic ${topicIndex + 1}: ${topicsToUse[topicIndex].title}`);
            }
          } else if (currentTopicResponse.current_topic.topic_index !== undefined) {
            // Fallback to topic_index if provided and valid
            const index = Math.max(0, Math.min(currentTopicResponse.current_topic.topic_index, topicsToUse.length - 1));
            console.log('📍 Using topic_index from response:', index);
            setCurrentTopicIndex(index);
            
            if (index > 0) {
              console.log(`🔄 Resuming from topic ${index + 1}: ${topicsToUse[index].title}`);
            }
          } else {
            console.log('🔄 No valid topic found in progress, staying at index 0');
          }
        } else {
          console.log('🆕 No current topic found, starting from beginning');
        }
        
      } catch (err) {
        console.error('Failed to fetch topics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load topics');
        
        // Use fallback topics on error
        const fallbackTopics: AbstractTopic[] = [
          { 
            id: '1', 
            title: "The importance of education",
            key_connectors: ["however", "furthermore", "in addition", "on the other hand", "therefore"],
            vocabulary_focus: ["academic", "learning", "knowledge", "development", "opportunity"]
          },
          { 
            id: '2', 
            title: "The impact of technology on society",
            key_connectors: ["although", "nevertheless", "meanwhile", "consequently", "in contrast"],
            vocabulary_focus: ["digital", "innovation", "connectivity", "automation", "progress"]
          },
          { 
            id: '3', 
            title: "Environmental conservation and sustainability",
            key_connectors: ["while", "moreover", "despite", "as a result", "alternatively"],
            vocabulary_focus: ["ecosystem", "renewable", "conservation", "climate", "biodiversity"]
          },
          { 
            id: '4', 
            title: "The role of art in human culture",
            key_connectors: ["similarly", "in particular", "for instance", "by comparison", "ultimately"],
            vocabulary_focus: ["creativity", "expression", "cultural", "aesthetic", "heritage"]
          },
          { 
            id: '5', 
            title: "The future of work and automation",
            key_connectors: ["nonetheless", "additionally", "in fact", "on the contrary", "subsequently"],
            vocabulary_focus: ["employment", "artificial intelligence", "productivity", "adaptation", "skills"]
          },
          { 
            id: '6', 
            title: "Social media and its effects on relationships",
            key_connectors: ["however", "on the other hand", "furthermore", "in contrast", "additionally"],
            vocabulary_focus: ["connection", "communication", "virtual", "interaction", "community"]
          }
        ];
        setTopics(fallbackTopics);
        
        // Also check for current topic position in error case
        if (user) {
          try {
            const currentTopicResponse = await AbstractTopicsService.getCurrentTopic(user.id);
            if (currentTopicResponse.success && currentTopicResponse.current_topic) {
              const topicIndex = fallbackTopics.findIndex(topic => 
                topic.id === currentTopicResponse.current_topic!.topic_id
              );
              if (topicIndex !== -1) {
                setCurrentTopicIndex(topicIndex);
              }
            }
          } catch (currentTopicError) {
            console.warn('Could not fetch current topic in error fallback:', currentTopicError);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopicsAndCurrentPosition();
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleStopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, timeLeft, handleStopRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

    const handleStartRecording = async () => {
    if (!currentTopic) return;
    
    try {
      console.log('🎤 Starting recording for topic:', currentTopic.title);
      setFeedback(null);
    setHasStarted(true);
      setRecordingStartTime(Date.now());
      stopAudio(); // Stop any playing audio when starting recording
      await startRecording();
      console.log('✅ Recording started successfully');
    } catch (error: any) {
      console.error('❌ Failed to start recording:', error);
      setError(error.message || 'Failed to start recording');
    }
  };

  const resetSession = () => {
    console.log('🔄 Resetting session...');
    setTimeLeft(120);
    setHasStarted(false);
    setIsCompleted(false);
    setFeedback(null);
    setRecordingStartTime(null);
    setError(null);
    resetRecording();
    stopAudio(); // Stop any playing audio when resetting
    console.log('✅ Session reset complete');
  };

  const handlePlayTopicAudio = async () => {
    if (!currentTopic) return;
    
    try {
      setIsLoadingAudio(true);
      const audioUrl = await AbstractTopicsService.getAudio(currentTopic.id);
      await playAudio(audioUrl);
    } catch (error) {
      console.error('Failed to play topic audio:', error);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleToggleAudio = () => {
    if (audioState.isPlaying) {
      pauseAudio();
    } else if (audioState.isLoaded) {
      resumeAudio();
    } else {
      handlePlayTopicAudio();
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/dashboard/practice/stage-4')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1">
            <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">
              Abstract Topic
            </h1>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Speak Your Mind</h2>
            {!isLoading && topics.length > 0 && (
              <p className="text-muted-foreground">
                Topic: {currentTopicIndex + 1} of {topics.length}
              </p>
            )}
          </div>

          {/* Topic Card */}
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              {isLoading ? (
                <div className="text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-green-600" />
                  <p className="text-green-600 dark:text-green-400">Loading topics...</p>
                </div>
              ) : error ? (
                <div className="text-center">
                  <p className="text-red-600 dark:text-red-400 mb-2">Failed to load topics</p>
                  <p className="text-sm text-muted-foreground">Using fallback topics</p>
                </div>
              ) : currentTopic ? (
              <div className="text-center">
                  <div className="mb-4">
                <span className="text-green-600 dark:text-green-400 font-medium">Topic: </span>
                    <span className="text-foreground">{currentTopic.title}</span>
                  </div>
                  {currentTopic.description && (
                    <div className="mt-2 text-sm text-muted-foreground mb-4">
                      {currentTopic.description}
                    </div>
                  )}
                  
                  {/* Audio Play Button */}
                  <Button
                    onClick={handleToggleAudio}
                    disabled={isLoadingAudio || audioState.error !== null}
                    className={`w-20 h-20 rounded-full text-white shadow-lg mb-4 ${
                      isLoadingAudio || audioState.error
                        ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed'
                        : audioState.isPlaying
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                    size="icon"
                  >
                    {isLoadingAudio ? (
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : audioState.isPlaying ? (
                      <Pause className="w-10 h-10" />
                    ) : audioState.error ? (
                      <VolumeX className="w-10 h-10" />
                    ) : (
                      <Play className="w-10 h-10" />
                    )}
                  </Button>
                  
                  <p className="text-muted-foreground text-sm mb-4">
                    {audioState.isPlaying ? 'Playing topic audio...' : 'Listen to the topic before speaking'}
                  </p>
                  
                  {audioState.error && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      Failed to load audio
                    </div>
                  )}
                  {currentTopic.key_connectors && currentTopic.key_connectors.length > 0 && (
                    <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                        💡 Key Connectors
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {currentTopic.key_connectors.map((connector, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded-full"
                          >
                            {connector}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {currentTopic.vocabulary_focus && currentTopic.vocabulary_focus.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                        📚 Vocabulary Focus
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {currentTopic.vocabulary_focus.map((word, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-muted-foreground">No topics available</p>
              </div>
              )}
            </CardContent>
          </Card>

          {/* Timer */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400">
                  {formatTime(timeLeft).split(':')[0]}
                </div>
                <div className="text-sm text-gray-400">Minutes</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400">
                  {formatTime(timeLeft).split(':')[1]}
                </div>
                <div className="text-sm text-gray-400">Seconds</div>
              </div>
            </div>
          </div>

          {/* Feedback Section */}
          {feedback && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Evaluation Results</h3>
              
              {/* Overall Score */}
              {feedback.score !== undefined && (
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <div className="text-center mb-4">
                      <h4 className="text-lg font-semibold mb-3">Overall</h4>
                      <div className="flex items-center justify-center mb-4">
                        {feedback.score >= 80 ? (
                          <CheckCircle className="w-8 h-8 text-green-500 mr-2" />
                        ) : feedback.score >= 60 ? (
                          <AlertCircle className="w-8 h-8 text-yellow-500 mr-2" />
                        ) : (
                          <XCircle className="w-8 h-8 text-red-500 mr-2" />
                        )}
                        <span className="text-3xl font-bold">
                          {Math.round(feedback.score)}%
                        </span>
                      </div>
                    </div>
                    {feedback.feedback && (
                      <p className="text-center text-muted-foreground">
                        {feedback.feedback}
                      </p>
                    )}
            </CardContent>
          </Card>
              )}

              {/* Detailed Scores */}
              <div className="space-y-4">
                {feedback.suggestions && feedback.suggestions.length > 0 && (
                  <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-2">
                        💡 Suggested Improvements
                      </h4>
                      <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                        {feedback.suggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {feedback.next_steps && (
                  <Card className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-indigo-600 dark:text-indigo-400 mb-2">
                        🎯 Next Steps
                      </h4>
                      <p className="text-sm text-indigo-700 dark:text-indigo-300">
                        {feedback.next_steps}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {feedback.content_relevance_score !== undefined && (
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-1">
                        <BookOpen className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                          <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">
                            Content Relevance: {Math.round(feedback.content_relevance_score)}%
                          </h4>
                        <p className="text-green-700 dark:text-green-300 text-sm">
                            How well you addressed the topic
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )}

                {feedback.vocabulary_used && feedback.vocabulary_used.length > 0 && (
                  <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="p-4">
                      <h4 className="font-medium text-purple-600 dark:text-purple-400 mb-2">
                        📚 Vocabulary Used
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {feedback.vocabulary_used.map((word, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs rounded-full"
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {feedback.key_connectors_used && feedback.key_connectors_used.length > 0 && (
                  <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-orange-600 dark:text-orange-400 mb-2">
                        🔗 Connectors Used
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {feedback.key_connectors_used.map((connector, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 text-xs rounded-full"
                          >
                            {connector}
                          </span>
                        ))}
                    </div>
                  </CardContent>
                </Card>
                )}
              </div>
            </div>
          )}

          {/* Topic Navigation */}
          {!isLoading && topics.length > 1 && !isRecording && (
            <div className="flex justify-between">
              <Button
                onClick={() => {
                  stopAudio();
                  setCurrentTopicIndex(Math.max(0, currentTopicIndex - 1));
                  scrollToTop();
                }}
                disabled={currentTopicIndex === 0}
                variant="outline"
                className="px-6 py-2 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              >
                Previous
              </Button>
              <Button
                onClick={() => {
                  stopAudio();
                  setCurrentTopicIndex(Math.min(topics.length - 1, currentTopicIndex + 1));
                  scrollToTop();
                }}
                disabled={currentTopicIndex === topics.length - 1}
                variant="outline"
                className="px-6 py-2 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              >
                Next
              </Button>
            </div>
          )}

          {/* Action Button */}
          <div className="text-center">
            {!hasStarted ? (
              <Button
                onClick={handleStartRecording}
                disabled={isLoading || !currentTopic || isEvaluating}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-8 py-3 rounded-full text-lg font-medium"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                <Mic className="h-5 w-5 mr-2" />
                Speak Now
                  </>
                )}
              </Button>
            ) : isRecording ? (
              <Button
                onClick={handleStopRecording}
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full text-lg font-medium animate-pulse"
                size="lg"
              >
                <MicOff className="h-5 w-5 mr-2" />
                Stop Recording
              </Button>
            ) : isEvaluating ? (
              <Button
                disabled
                className="bg-blue-500 text-white px-8 py-3 rounded-full text-lg font-medium cursor-not-allowed"
                size="lg"
              >
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Evaluating...
              </Button>
            ) : (
                <Button
                  onClick={resetSession}
                disabled={isLoading || !currentTopic}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-full text-lg font-medium"
                  size="lg"
                >
                  <Mic className="h-5 w-5 mr-2" />
                  Try Again
                </Button>
            )}
            
            {/* Error Display */}
            {(error || recordingError) && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  {error || recordingError}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 