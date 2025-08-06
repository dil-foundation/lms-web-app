import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Mic, GraduationCap, CheckCircle, Loader2, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { toast } from 'sonner';
import { 
  academicPresentationService, 
  AcademicPresentationTopic,
  EvaluationResponse 
} from '@/services/academicPresentationService';

interface SpeechStructureItem {
  id: string;
  title: string;
  completed: boolean;
}

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
  
  const [speechStructure] = useState<SpeechStructureItem[]>([
    { id: 'introduction', title: 'Introduction', completed: false },
    { id: 'key-points', title: 'Key Points & Evidence', completed: false },
    { id: 'conclusion', title: 'Conclusion & Q&A', completed: false }
  ]);

  // Audio recording hook
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

  const resetPresentation = () => {
    setHasStarted(false);
    setEvaluation(null);
    setStartTime(null);
    setSelectedTopic(null); // Allow user to choose a different topic
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading presentation topics...</p>
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
            onClick={() => navigate('/dashboard/practice/stage-5')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1">
            <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">
              Academic Presentation
            </h1>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Presentation Challenge</h2>
          </div>

          {/* Topic Selection */}
          {!selectedTopic && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Choose Your Presentation Topic</h3>

              {topics.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {topics.map((topic) => (
                    <Card 
                      key={topic.id} 
                      className="cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20 border-green-200 dark:border-green-800 transition-colors"
                      onClick={() => setSelectedTopic(topic)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center shrink-0">
                            <GraduationCap className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                              {topic.topic}
                            </h4>
                            {topic.topic_urdu && (
                              <p className="text-green-700 dark:text-green-300 text-sm">
                                {topic.topic_urdu}
                              </p>
                            )}
                            {topic.difficulty_level && (
                              <div className="mt-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
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
                <Card className="bg-muted/50">
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
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <GraduationCap className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
                    {selectedTopic.topic}
                  </h3>
                  {selectedTopic.topic_urdu && (
                    <p className="text-green-700 dark:text-green-300 text-sm mt-2">
                      {selectedTopic.topic_urdu}
                    </p>
                  )}
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTopic(null)}
                      className="text-green-600 border-green-300 hover:bg-green-100"
                    >
                      Change Topic
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Speech Structure - Only show when topic is selected */}
          {selectedTopic && (
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4">
                  Speech Structure
                </h3>
                <div className="space-y-3">
                  {speechStructure.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        item.completed 
                          ? 'bg-green-500' 
                          : 'bg-muted border-2 border-muted-foreground/20'
                      }`}>
                        {item.completed && (
                          <CheckCircle className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <span className={`text-sm ${
                        item.completed 
                          ? 'text-green-700 dark:text-green-300' 
                          : 'text-muted-foreground'
                      }`}>
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Presentation Guidelines - Only show when topic is selected and not started */}
          {selectedTopic && !hasStarted && (
            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Presentation Guidelines</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Structure your presentation with clear introduction, main points, and conclusion
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Support your arguments with relevant evidence and examples
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Maintain academic tone and use sophisticated vocabulary
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
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
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    Evaluating Your Presentation
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Please wait while we analyze your presentation...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evaluation Results */}
          {evaluation && evaluation.evaluation && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Presentation Evaluation</h3>
              
              {/* Overall Score */}
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 mb-4">
                <CardContent className="p-6">
                  <div className="text-center">
                    <h4 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                      Overall Score: {evaluation.evaluation.evaluation.overall_score}/100
                    </h4>
                    <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-3 mb-4">
                      <div 
                        className="bg-green-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${evaluation.evaluation.evaluation.overall_score}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Minimal Score Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                <Card className="bg-muted/50">
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold">{evaluation.evaluation.evaluation.argument_structure_score}</div>
                    <div className="text-xs text-muted-foreground">Structure</div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold">{evaluation.evaluation.evaluation.evidence_usage_score}</div>
                    <div className="text-xs text-muted-foreground">Evidence</div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold">{evaluation.evaluation.evaluation.academic_tone_score}</div>
                    <div className="text-xs text-muted-foreground">Tone</div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold">{evaluation.evaluation.evaluation.fluency_pacing_score}</div>
                    <div className="text-xs text-muted-foreground">Fluency</div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold">{evaluation.evaluation.evaluation.vocabulary_range_score}</div>
                    <div className="text-xs text-muted-foreground">Vocabulary</div>
                  </CardContent>
                </Card>
              </div>

              {/* Next Steps */}
              {evaluation.evaluation.evaluation.next_steps && (
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 mb-4">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">Next Steps</h4>
                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                      {evaluation.evaluation.evaluation.next_steps}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Encouragement */}
              {evaluation.evaluation.evaluation.encouragement && (
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">Encouragement</h4>
                    <p className="text-green-700 dark:text-green-300 text-sm">
                      {evaluation.evaluation.evaluation.encouragement}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Action Button */}
          <div className="text-center">
            {!hasStarted && !evaluation ? (
              <Button
                onClick={handleStartPresenting}
                disabled={!selectedTopic || loading}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                size="lg"
              >
                <Mic className="h-5 w-5 mr-2" />
                Start Presenting
              </Button>
            ) : isRecording ? (
              <Button
                onClick={handleStopPresenting}
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full text-lg font-medium"
                size="lg"
              >
                <Mic className="h-5 w-5 mr-2" />
                Stop Presenting
              </Button>
            ) : evaluation ? (
              <div className="space-y-3">
                <div className="flex justify-center space-x-4">
                  <Button
                    onClick={resetPresentation}
                    variant="outline"
                    className="px-6 py-2"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={() => navigate('/dashboard/practice/stage-5')}
                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-2"
                  >
                    Back to Stage 5
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
} 