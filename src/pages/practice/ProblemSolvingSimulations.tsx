import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Lightbulb, Mic, Users, Monitor, Loader2, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAuth } from '@/hooks/useAuth';
import { getAuthHeadersWithAccept, getAuthHeaders } from '@/utils/authUtils';

interface Message {
  type: 'ai' | 'user' | 'system';
  message: string;
  persona?: string;
  avatar?: string;
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  context?: string;
  participants: string[];
  created_at?: string;
  updated_at?: string;
}

interface ProblemSolvingScenarioResponse {
  scenarios: Scenario[];
  total: number;
}

interface EvaluationResponse {
  success: boolean;
  user_text?: string;
  expected_keywords?: string[];
  expected_keywords_urdu?: string[];
  evaluation?: {
    success: boolean;
    evaluation: {
      overall_score: number;
      clarity_score: number;
      politeness_score: number;
      request_structure_score: number;
      specificity_score: number;
      solution_orientation_score: number;
      keyword_matches: string[];
      total_keywords: number;
      matched_keywords_count: number;
      response_type_detected: string;
      detailed_feedback: {
        clarity_feedback: string;
        politeness_feedback: string;
        request_structure_feedback: string;
        specificity_feedback: string;
        solution_orientation_feedback: string;
      };
      suggested_improvements: string[];
      encouragement: string;
      next_steps: string;
    };
  };
  keyword_matches?: string[];
  total_keywords?: number;
  matched_keywords_count?: number;
  fluency_score?: number;
  grammar_score?: number;
  response_type?: string;
  score?: number;
  scenario_title?: string;
  scenario_context?: string;
  error?: string;
}

// API Functions
const fetchProblemSolvingScenarios = async (): Promise<Scenario[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.PROBLEM_SOLVING_SCENARIOS}`, {
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
    let scenarios: any[] = [];

    if (Array.isArray(result)) {
      scenarios = result;
    } else if (result && typeof result === 'object' && result.data && Array.isArray(result.data)) {
      scenarios = result.data;
    } else if (result && typeof result === 'object' && result.scenarios && Array.isArray(result.scenarios)) {
      scenarios = result.scenarios;
    } else if (result && typeof result === 'object') {
      const arrayProperties = Object.keys(result).filter(key => Array.isArray(result[key]));
      if (arrayProperties.length > 0) {
        scenarios = result[arrayProperties[0]];
      } else {
        throw new Error('No array of scenarios found in response');
      }
    } else {
      throw new Error('Invalid response format: expected array or object with scenarios');
    }

    // Validate and transform scenarios data
    const validScenarios: Scenario[] = scenarios.map((scenario: any, index: number) => {
      if (!scenario || typeof scenario !== 'object') {
        throw new Error(`Invalid scenario data at index ${index}`);
      }

      return {
        id: scenario.id || `scenario-${index}`,
        title: scenario.title || `Scenario ${index + 1}`,
        description: scenario.description || '',
        context: scenario.context || '',
        participants: Array.isArray(scenario.participants) ? scenario.participants : [],
        created_at: scenario.created_at || new Date().toISOString(),
        updated_at: scenario.updated_at
      };
    });

    return validScenarios;

  } catch (error: any) {
    console.error('Error fetching problem solving scenarios:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    
    if (error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    throw error;
  }
};

const fetchProblemSolvingScenarioById = async (scenarioId: string): Promise<Scenario> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.PROBLEM_SOLVING_SCENARIO_DETAIL(scenarioId)}`, {
      method: 'GET',
      headers: getAuthHeadersWithAccept(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Problem solving scenario not found');
      }
      const errorText = await response.text().catch(() => 'No response text');
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const result = await response.json();
    
    return {
      id: result.id,
      title: result.title,
      description: result.description,
      context: result.context || '',
      participants: Array.isArray(result.participants) ? result.participants : [],
      created_at: result.created_at || new Date().toISOString(),
      updated_at: result.updated_at
    };

  } catch (error: any) {
    console.error('Error fetching problem solving scenario by ID:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    
    if (error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    throw error;
  }
};

export default function ProblemSolvingSimulations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isRecording, audioBlob, error: recordingError, startRecording, stopRecording, resetRecording } = useAudioRecorder();
  
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingScenario, setIsLoadingScenario] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentScenarioData, setCurrentScenarioData] = useState<Scenario | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  
  const hasFetchedData = useRef(false);

  const fallbackScenarios: Scenario[] = [
    {
      id: 'school-project',
      title: 'School Project',
      description: 'You are working on a group project. Discuss roles with your team.',
      context: 'Your teacher assigned a group project about environmental protection. You need to divide the work and plan your presentation.',
      participants: ['Team Member 1', 'Team Member 2', 'You']
    },
    {
      id: 'work-meeting',
      title: 'Work Meeting',
      description: 'Participate in a team meeting to solve a workplace problem.',
      context: 'Your team needs to decide how to handle a difficult client situation. Everyone should contribute ideas.',
      participants: ['Manager', 'Colleague', 'You']
    },
    {
      id: 'family-planning',
      title: 'Family Planning',
      description: 'Help your family plan a vacation or special event.',
      context: 'Your family wants to plan a weekend trip. Discuss destinations, budget, and activities.',
      participants: ['Parent', 'Sibling', 'You']
    }
  ];

  // Fetch scenarios on component mount
  useEffect(() => {
    const fetchScenarios = async () => {
      if (hasFetchedData.current) return; // Prevent multiple calls
      hasFetchedData.current = true;
      
      try {
        setIsLoading(true);
        setError(null);
        // Fetch scenarios from API
        const fetchedScenarios = await fetchProblemSolvingScenarios();
        if (fetchedScenarios && fetchedScenarios.length > 0) {
          setScenarios(fetchedScenarios);
        } else {
          // Fallback to hardcoded scenarios if API returns empty
          setScenarios(fallbackScenarios);
        }
      } catch (err: any) {
        console.error('Error fetching problem solving scenarios:', err);
        setError(err.message);
        // Use fallback scenarios on error
        setScenarios(fallbackScenarios);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScenarios();
  }, []);

  const initializeConversation = async (scenarioId: string) => {
    try {
      setIsLoadingScenario(true);
      
      // Fetch detailed scenario data from API
      let scenarioData: Scenario;
      try {
        scenarioData = await fetchProblemSolvingScenarioById(scenarioId);
        setCurrentScenarioData(scenarioData);
      } catch (apiError) {
        console.error('Failed to fetch scenario details, using fallback:', apiError);
        // Use fallback scenario data if API fails
        const fallbackScenario = scenarios.find(s => s.id === scenarioId);
        if (!fallbackScenario) return;
        scenarioData = fallbackScenario;
        setCurrentScenarioData(fallbackScenario);
      }

      const initialMessages: Message[] = [
        {
          type: 'system',
          message: `Starting ${scenarioData.title} simulation`
        }
      ];

      // Context is already displayed in the scenario info card above
      // Skip adding it again to avoid duplication

      // Add scenario-specific initial message
      switch (scenarioId) {
        case 'school-project':
          initialMessages.push({
            type: 'ai',
            message: 'Hi, I can do the writing. What about you?',
            persona: 'Team Member 1',
            avatar: '👨‍💻'
          });
          break;
        case 'work-meeting':
          initialMessages.push({
            type: 'ai',
            message: 'Good morning everyone. Let\'s discuss the client issue.',
            persona: 'Manager',
            avatar: '👩‍💼'
          });
          break;
        case 'family-planning':
          initialMessages.push({
            type: 'ai',
            message: 'Where should we go for our weekend trip?',
            persona: 'Parent',
            avatar: '👨‍👩‍👧'
          });
          break;
        default:
          // For API scenarios, use first participant as initial speaker
          if (scenarioData.participants.length > 0) {
            const firstParticipant = scenarioData.participants[0];
            if (firstParticipant !== 'You') {
              let avatar = '👤';
              if (firstParticipant.toLowerCase().includes('manager')) avatar = '👩‍💼';
              else if (firstParticipant.toLowerCase().includes('colleague')) avatar = '👨‍💼';
              else if (firstParticipant.toLowerCase().includes('team')) avatar = '👨‍💻';
              else if (firstParticipant.toLowerCase().includes('parent')) avatar = '👨‍👩‍👧';
              else if (firstParticipant.toLowerCase().includes('member')) avatar = '👨‍💻';
              
              initialMessages.push({
                type: 'ai',
                message: 'Hello everyone! Let\'s start our discussion.',
                persona: firstParticipant,
                avatar: avatar
              });
            }
          }
          break;
      }

      setConversation(initialMessages);
    } catch (error) {
      console.error('Error initializing conversation:', error);
    } finally {
      setIsLoadingScenario(false);
    }
  };

  const handleScenarioSelect = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    initializeConversation(scenarioId);
  };



  const generateAIResponse = (scenarioId: string, userMessage: string): Message => {
    // Use current scenario data if available for more contextual responses
    if (currentScenarioData && currentScenarioData.participants.length > 0) {
      const participants = currentScenarioData.participants.filter(p => p.toLowerCase() !== 'you');
      const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
      
      // Generate contextual response based on participant type
      let avatar = '👤';
      let responses = ["I understand.", "Could you tell me more?", "That makes sense."];
      
      const participantLower = randomParticipant.toLowerCase();
      if (participantLower.includes('manager')) {
        avatar = '👩‍💼';
        responses = [
          "Good point. Let's implement that solution.",
          "I agree. We should focus on that approach.",
          "That's a solid strategy. Let's move forward."
        ];
      } else if (participantLower.includes('colleague') || participantLower.includes('team')) {
        avatar = '👨‍💼';
        responses = [
          "I agree. We should focus on that first.",
          "That's a great idea! I can help with that.",
          "Perfect! When should we start working on this?"
        ];
      } else if (participantLower.includes('member')) {
        avatar = '👨‍💻';
        responses = [
          "That's a great idea! I can help with the research part.",
          "Perfect! When should we meet to work on this together?",
          "I think we should divide it into parts. What do you think?"
        ];
      } else if (participantLower.includes('parent')) {
        avatar = '👨‍👩‍👧';
        responses = [
          "Great suggestion! We should check that too.",
          "That sounds like a good plan. Let's do it.",
          "I think that would work well for everyone."
        ];
      } else if (participantLower.includes('sibling')) {
        avatar = '👧';
        responses = [
          "That sounds fun! How much would it cost?",
          "I'm excited! When should we start?",
          "That's a great idea! I can't wait!"
        ];
      }
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      return {
        type: 'ai',
        message: randomResponse,
        persona: randomParticipant,
        avatar: avatar
      };
    }

    // Fallback to original hardcoded responses
    const responses = {
      'school-project': [
        { message: "That's a great idea! I can help with the research part.", persona: "Team Member 2", avatar: "👩‍🎓" },
        { message: "Perfect! When should we meet to work on this together?", persona: "Team Member 1", avatar: "👨‍💻" },
        { message: "I think we should divide it into three parts. What do you think?", persona: "Team Member 2", avatar: "👩‍🎓" }
      ],
      'work-meeting': [
        { message: "I agree. We should focus on customer satisfaction first.", persona: "Colleague", avatar: "👨‍💼" },
        { message: "Good point. Let's implement that solution.", persona: "Manager", avatar: "👩‍💼" },
        { message: "We could also offer them a discount for the inconvenience.", persona: "Colleague", avatar: "👨‍💼" }
      ],
      'family-planning': [
        { message: "That sounds fun! How much would it cost?", persona: "Sibling", avatar: "👧" },
        { message: "Great suggestion! We should check the weather too.", persona: "Parent", avatar: "👨‍👩‍👧" },
        { message: "I'm excited! When should we leave?", persona: "Sibling", avatar: "👧" }
      ]
    };

    const scenarioResponses = responses[scenarioId as keyof typeof responses];
    if (scenarioResponses) {
      const randomResponse = scenarioResponses[Math.floor(Math.random() * scenarioResponses.length)];
      return {
        type: 'ai',
        message: randomResponse.message,
        persona: randomResponse.persona,
        avatar: randomResponse.avatar
      };
    }

    // Final fallback
    return {
      type: 'ai',
      message: "That's interesting. Please continue.",
      persona: "Assistant",
      avatar: "🤖"
    };
  };



  const evaluateAudio = async (audioBlob: Blob, scenarioId: string) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      setIsEvaluating(true);
      setError(null);

      // Convert audio blob to base64
      const reader = new FileReader();
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix to get just the base64 string
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(audioBlob);
      });

      // Calculate recording duration
      const recordingDuration = recordingStartTime 
        ? Math.floor((Date.now() - recordingStartTime) / 1000) 
        : 0;

      // Create request payload
      const requestData = {
        audio_base64: audioBase64,
        scenario_id: parseInt(scenarioId, 10),
        filename: `problem_solving_${scenarioId}_${Date.now()}.webm`,
        user_id: user.id,
        time_spent_seconds: recordingDuration,
        urdu_used: false // You can add logic to detect this if needed
      };

      const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.EVALUATE_PROBLEM_SOLVING}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result: EvaluationResponse = await response.json();
      console.log('Evaluation result:', result);
      setEvaluation(result);

      // Add transcription and feedback to conversation
      if (result.user_text) {
        const newMessages: Message[] = [
          ...conversation,
          {
            type: 'user',
            message: result.user_text
          }
        ];

        // Add AI feedback if available
        if (result.evaluation?.evaluation) {
          newMessages.push({
            type: 'ai',
            message: result.evaluation.evaluation.encouragement || 'Thank you for your response.',
            persona: 'System Evaluator',
            avatar: '🤖'
          });
        }

        setConversation(newMessages);
      }

    } catch (error: any) {
      console.error('Error evaluating audio:', error);
      setError(error.message || 'Failed to evaluate audio');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleBackToScenarios = () => {
    setSelectedScenario(null);
    setCurrentScenarioData(null);
    setConversation([]);
    setIsLoadingScenario(false);
    setEvaluation(null);
    resetRecording();
  };

  const handleStartRecording = async () => {
    try {
      setRecordingStartTime(Date.now());
      setError(null);
      resetRecording();
      await startRecording();
    } catch (error: any) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording');
    }
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  // Handle when audio blob is available
  useEffect(() => {
    if (audioBlob && selectedScenario) {
      evaluateAudio(audioBlob, selectedScenario);
    }
  }, [audioBlob, selectedScenario]);

  if (selectedScenario) {
    const scenario = currentScenarioData || scenarios.find(s => s.id === selectedScenario)!;
    
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={handleBackToScenarios}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center flex-1">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                <Lightbulb className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold">Problem Solving</h1>
              <p className="text-muted-foreground">Virtual Group Talk</p>
            </div>
            
            <div className="w-10"></div>
          </div>

          {/* Scenario Info */}
          <Card className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              {isLoadingScenario ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-green-600 mr-2" />
                  <span className="text-green-700 dark:text-green-300">Loading scenario details...</span>
                </div>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
                      {scenario.title}
                    </h2>
                    {scenario.context && (
                      <p className="text-green-700 dark:text-green-300 mb-4">
                        {scenario.context}
                      </p>
                    )}
                  </div>
                  
                  {/* Participants */}
                  <div className="flex justify-center items-center space-x-2">
                    {scenario.participants.map((participant, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-1">
                          <span className="text-sm text-green-600 dark:text-green-400">
                            {participant === 'You' ? '👤' : index === 0 ? '👨‍💻' : '👩‍🎓'}
                          </span>
                        </div>
                        <span className="text-xs text-green-700 dark:text-green-300">
                          {participant}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Conversation */}
          <Card className="mb-4">
            <CardContent className="p-4">
              {isLoadingScenario ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-green-600 mr-2" />
                  <span className="text-muted-foreground">Loading conversation...</span>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {conversation.map((msg, index) => (
                  <div key={index}>
                    {msg.type === 'system' ? (
                      <div className="text-center">
                        <div className="inline-block bg-muted px-3 py-1 rounded-full text-sm text-muted-foreground">
                          {msg.message}
                        </div>
                      </div>
                    ) : (
                      <div className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-xs lg:max-w-md">
                          {msg.type === 'ai' && (
                            <div className="flex items-center space-x-2 mb-1">
                              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <span className="text-xs">{msg.avatar}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{msg.persona}</span>
                            </div>
                          )}
                          <div
                            className={`px-4 py-2 rounded-lg ${
                              msg.type === 'user'
                                ? 'bg-green-600 text-white'
                                : msg.persona === 'System'
                                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                                : 'bg-gray-100 dark:bg-gray-800 text-foreground'
                            }`}
                          >
                            <p className="text-sm">{msg.message}</p>
                          </div>
                          {msg.type === 'user' && (
                            <div className="flex justify-end mt-1">
                              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <span className="text-xs">👤</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  ))}
                  
                  {conversation.length === 0 && !isLoadingScenario && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Start the conversation by typing a message below</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audio Input */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Recording Button */}
                <div className="flex justify-center">
                  {!isRecording ? (
                    <Button
                      onClick={handleStartRecording}
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-4"
                      disabled={isLoadingScenario || isEvaluating}
                    >
                      <Mic className="h-6 w-6 mr-2" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStopRecording}
                      size="lg"
                      className="bg-red-600 hover:bg-red-700 text-white px-8 py-4"
                    >
                      <Square className="h-6 w-6 mr-2" />
                      Stop Recording
                    </Button>
                  )}
                </div>

                {/* Recording Status */}
                {isRecording && (
                  <div className="text-center">
                    <div className="inline-flex items-center text-red-600">
                      <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse mr-2"></div>
                      Recording in progress...
                    </div>
                  </div>
                )}

                {/* Evaluation Status */}
                {isEvaluating && (
                  <div className="text-center">
                    <div className="inline-flex items-center text-blue-600">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Evaluating your response...
                    </div>
                  </div>
                )}

                {/* Recording/Evaluation Error */}
                {(recordingError || error) && (
                  <div className="text-center text-red-600 text-sm">
                    {recordingError || error}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Evaluation Results */}
          {evaluation && evaluation.evaluation?.evaluation && (
            <Card className="mt-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">
                  Performance Evaluation
                </h3>
                
                <div className="space-y-4">
                  {/* Overall Score */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Overall Score:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {evaluation.evaluation.evaluation.overall_score}%
                    </span>
                  </div>

                  {/* Key Scores */}
                  <div className="grid grid-cols-3 gap-4 text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-center">
                      <div className="font-medium text-blue-600">{evaluation.evaluation.evaluation.clarity_score}/10</div>
                      <div className="text-xs text-gray-600">Clarity</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-green-600">{evaluation.evaluation.evaluation.politeness_score}/10</div>
                      <div className="text-xs text-gray-600">Politeness</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-purple-600">
                        {evaluation.evaluation.evaluation.matched_keywords_count}/{evaluation.evaluation.evaluation.total_keywords}
                      </div>
                      <div className="text-xs text-gray-600">Keywords</div>
                    </div>
                  </div>

                  {/* Encouragement */}
                  {evaluation.evaluation.evaluation.encouragement && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">✓ Good Work:</h4>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {evaluation.evaluation.evaluation.encouragement}
                      </p>
                    </div>
                  )}

                  {/* Key Feedback Points */}
                  <div>
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">Key Feedback:</h4>
                    <div className="space-y-2">
                      {evaluation.evaluation.evaluation.detailed_feedback.clarity_feedback && (
                        <div className="text-sm">
                          <span className="font-medium text-blue-600">Clarity:</span> {evaluation.evaluation.evaluation.detailed_feedback.clarity_feedback}
                        </div>
                      )}
                      {evaluation.evaluation.evaluation.detailed_feedback.politeness_feedback && (
                        <div className="text-sm">
                          <span className="font-medium text-green-600">Politeness:</span> {evaluation.evaluation.evaluation.detailed_feedback.politeness_feedback}
                        </div>
                      )}
                      {evaluation.evaluation.evaluation.detailed_feedback.solution_orientation_feedback && (
                        <div className="text-sm">
                          <span className="font-medium text-orange-600">Solution:</span> {evaluation.evaluation.evaluation.detailed_feedback.solution_orientation_feedback}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Keywords */}
                  {evaluation.expected_keywords && evaluation.expected_keywords.length > 0 && (
                    <div>
                      <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">Expected Keywords:</h4>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {evaluation.expected_keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className={`inline-block text-xs px-2 py-1 rounded-full ${
                              evaluation.evaluation?.evaluation.keyword_matches?.includes(keyword)
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500">
                        ✓ Green = Used  • Gray = Not used
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {evaluation.evaluation.evaluation.suggested_improvements && evaluation.evaluation.evaluation.suggested_improvements.length > 0 && (
                    <div>
                      <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">How to Improve:</h4>
                      <div className="text-sm text-orange-700 dark:text-orange-300">
                        {evaluation.evaluation.evaluation.suggested_improvements[0]}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
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
            onClick={() => navigate('/dashboard/practice/stage-3')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <Lightbulb className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold">Problem Solving</h1>
            <p className="text-muted-foreground">Virtual Group Talk</p>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Instructions */}
        <Card className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <p className="text-center text-green-700 dark:text-green-300">
              Practice problem-solving and decision-making in group scenarios
            </p>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
              <p className="text-muted-foreground">Loading scenarios...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && scenarios.length === 0 && !isLoading && (
          <Card className="mb-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <CardContent className="p-6 text-center">
              <p className="text-red-800 dark:text-red-200 mb-4">
                Unable to load scenarios: {error}
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Error banner if API failed but fallbacks loaded */}
        {error && scenarios.length > 0 && (
          <Card className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-4">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                ⚠️ Using offline content. Some features may be limited.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Scenario Selection */}
        {!isLoading && scenarios.length > 0 && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-4">Choose a Scenario</h2>
            <div className="space-y-4">
              {scenarios.map((scenario) => (
                <Card
                  key={scenario.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleScenarioSelect(scenario.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                          <Monitor className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">{scenario.title}</h3>
                          <p className="text-sm text-muted-foreground">{scenario.description}</p>
                        </div>
                      </div>
                      
                      {/* Participants */}
                      <div className="flex items-center space-x-1">
                        {scenario.participants.map((participant, index) => (
                          <div key={index} className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <span className="text-xs text-green-600 dark:text-green-400">
                              {participant === 'You' ? 'Y' : participant.split(' ')[0][0]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Speak Now Button - Only show when scenarios are loaded */}
        {!isLoading && scenarios.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <Button
                className="w-full bg-green-500 hover:bg-green-600 text-white py-6"
                disabled
              >
                <Mic className="h-5 w-5 mr-2" />
                Speak Now
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 