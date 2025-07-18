import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Mic, Building2, User, Star, TrendingUp, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InterviewScenario {
  id: string;
  title: string;
  description: string;
  questions: string[];
}

interface ConversationMessage {
  id: string;
  sender: 'ai' | 'user';
  message: string;
  timestamp: Date;
}

interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function InDepthInterviewSimulation() {
  const navigate = useNavigate();
  const [selectedScenario, setSelectedScenario] = useState<string>('graduate-school');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const scenarios: InterviewScenario[] = [
    {
      id: 'graduate-school',
      title: 'Graduate School',
      description: 'Advanced graduate school admission interview',
      questions: [
        'Tell me about a time you had to lead a team through a challenging project. What was your role, and how did you ensure the project\'s success?',
        'That\'s a great example. Now, can you elaborate on the specific challenges you encountered and how you overcame them?'
      ]
    },
    {
      id: 'job-interview',
      title: 'Job Interview',
      description: 'Senior-level professional job interview',
      questions: [
        'Describe your leadership philosophy and how you motivate teams.',
        'How do you handle conflict resolution in a professional setting?'
      ]
    },
    {
      id: 'cultural-exchange',
      title: 'Cultural Exchange',
      description: 'International cultural exchange program interview',
      questions: [
        'How would you contribute to cross-cultural understanding in our program?',
        'Describe a time when you had to adapt to a different cultural environment.'
      ]
    }
  ];

  const currentScenario = scenarios.find(s => s.id === selectedScenario) || scenarios[0];

  const [conversation] = useState<ConversationMessage[]>([
    {
      id: '1',
      sender: 'ai',
      message: 'Tell me about a time you had to lead a team through a challenging project. What was your role, and how did you ensure the project\'s success?',
      timestamp: new Date()
    },
    {
      id: '2',
      sender: 'user',
      message: 'In my previous role, we faced a tight deadline for a product launch. I coordinated the team, delegated tasks based on strengths, and maintained open communication. We successfully launched on time.',
      timestamp: new Date()
    },
    {
      id: '3',
      sender: 'ai',
      message: 'That\'s a great example. Now, can you elaborate on the specific challenges you encountered and how you overcame them?',
      timestamp: new Date()
    },
    {
      id: '4',
      sender: 'user',
      message: 'One major challenge was aligning objectives, and I fostered a collaborative environment. This helped us stay focused and achieve our goals.',
      timestamp: new Date()
    }
  ]);

  const feedbackItems: FeedbackItem[] = [
    {
      id: 'star-model',
      title: 'STAR Model Use',
      description: 'Your response effectively used the STAR method, providing a clear Situation, Task, Action, and Result. This structure enhances clarity and impact.',
      icon: Star
    },
    {
      id: 'vocabulary',
      title: 'Vocabulary Upgrade Suggestions',
      description: 'Consider using phrases like \'spearheaded the initiative\' instead of \'coordinated the team\' to add more impact to your leadership role.',
      icon: TrendingUp
    },
    {
      id: 'fluency',
      title: 'Fluency & Precision',
      description: 'Your communication was fluent and precise. Focus on varying sentence structures to maintain listener engagement.',
      icon: CheckCircle
    }
  ];

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    setCurrentQuestionIndex(0);
    setHasStarted(false);
    setShowFeedback(false);
  };

  const handleStartInterview = () => {
    setHasStarted(true);
    setShowFeedback(true);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const resetInterview = () => {
    setHasStarted(false);
    setCurrentQuestionIndex(0);
    setIsRecording(false);
    setShowFeedback(false);
  };

  if (!hasStarted) {
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
                In-Depth Interview
              </h1>
            </div>
            
            <div className="w-10"></div>
          </div>

          {/* Scenario Selection */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center mb-6">Choose Your Interview Scenario</h2>
            
            {scenarios.map((scenario) => (
              <Card 
                key={scenario.id}
                className={`cursor-pointer transition-all ${
                  selectedScenario === scenario.id 
                    ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => handleScenarioChange(scenario.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{scenario.title}</h3>
                      <p className="text-muted-foreground text-sm">{scenario.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="text-center pt-6">
              <Button
                onClick={handleStartInterview}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium"
                size="lg"
              >
                Start Interview
              </Button>
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
            onClick={() => navigate('/dashboard/practice/stage-5')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1">
            <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">
              In-Depth Interview
            </h1>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Scenario Tabs */}
        <div className="flex space-x-2 mb-6">
          {scenarios.map((scenario) => (
            <Button
              key={scenario.id}
              onClick={() => handleScenarioChange(scenario.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedScenario === scenario.id
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {scenario.title}
            </Button>
          ))}
        </div>

        {/* Interview Content */}
        <div className="space-y-4 mb-6">
          {conversation.map((message) => (
            <Card 
              key={message.id} 
              className={message.sender === 'user' ? 'bg-green-600 dark:bg-green-700' : 'border-dashed border-2 border-muted-foreground/20'}
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    message.sender === 'user' 
                      ? 'bg-white/20' 
                      : 'bg-green-100 dark:bg-green-900/30'
                  }`}>
                    {message.sender === 'user' ? (
                      <User className="h-5 w-5 text-white" />
                    ) : (
                      <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-sm font-medium ${
                        message.sender === 'user' 
                          ? 'text-white' 
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {message.sender === 'user' ? 'You' : 'AI Interviewer'}
                      </span>
                    </div>
                    <p className={message.sender === 'user' ? 'text-white' : 'text-foreground'}>
                      {message.message}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feedback Section */}
        {showFeedback && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Feedback</h3>
            <div className="space-y-4">
              {feedbackItems.map((item) => (
                <Card key={item.id} className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-1">
                        <item.icon className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">{item.title}</h4>
                        <p className="text-green-700 dark:text-green-300 text-sm">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="text-center">
          {!isRecording ? (
            <Button
              onClick={handleStartRecording}
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium"
              size="lg"
            >
              <Mic className="h-5 w-5 mr-2" />
              Speak Now
            </Button>
          ) : (
            <Button
              onClick={handleStopRecording}
              className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full text-lg font-medium"
              size="lg"
            >
              <Mic className="h-5 w-5 mr-2" />
              Stop Recording
            </Button>
          )}

          <div className="mt-4 space-y-3">
            <div className="flex justify-center space-x-4">
              <Button
                onClick={resetInterview}
                variant="outline"
                className="px-6 py-2"
              >
                Reset Interview
              </Button>
              <Button
                onClick={() => navigate('/dashboard/practice/stage-5')}
                variant="outline"
                className="px-6 py-2"
              >
                Back to Stage 5
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 