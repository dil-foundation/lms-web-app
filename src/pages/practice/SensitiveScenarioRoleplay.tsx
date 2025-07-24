import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { ArrowLeft, Mic, Users, User, Heart, Shield, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SensitiveScenario {
  id: string;
  title: string;
  description: string;
  context: string;
  difficulty: 'Advanced' | 'Expert';
  emotionalComplexity: 'High' | 'Very High';
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
  const [selectedScenario, setSelectedScenario] = useState<string>('workplace-conflict');
  const [hasStarted, setHasStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const scenarios: SensitiveScenario[] = [
    {
      id: 'workplace-conflict',
      title: 'Workplace Conflict Resolution',
      description: 'Navigate a delicate situation between team members with different perspectives',
      context: 'You are a team leader mediating a conflict between two colleagues who have different approaches to a project. Both are skilled professionals but their communication styles clash.',
      difficulty: 'Expert',
      emotionalComplexity: 'Very High'
    },
    {
      id: 'cultural-misunderstanding',
      title: 'Cultural Misunderstanding',
      description: 'Address a cultural misunderstanding in an international business setting',
      context: 'During an international meeting, a cultural misunderstanding has created tension. You need to address the situation diplomatically while maintaining professional relationships.',
      difficulty: 'Advanced',
      emotionalComplexity: 'High'
    },
    {
      id: 'performance-feedback',
      title: 'Difficult Performance Feedback',
      description: 'Deliver constructive feedback to an underperforming team member',
      context: 'You need to have a performance review with a team member whose work has been declining. They are going through personal challenges, and you must balance empathy with professional requirements.',
      difficulty: 'Expert',
      emotionalComplexity: 'Very High'
    }
  ];

  const currentScenario = scenarios.find(s => s.id === selectedScenario) || scenarios[0];

  const [conversation] = useState<RoleplayMessage[]>([
    {
      id: '1',
      sender: 'ai',
      message: 'I understand there\'s been some tension between you and Sarah regarding the project approach. I\'d like to hear your perspective on what happened.',
      role: 'Team Member (Alex)',
      timestamp: new Date(),
      emotionalTone: 'Defensive'
    },
    {
      id: '2',
      sender: 'user',
      message: 'I appreciate you bringing this up, Alex. I want to understand your concerns better. Can you help me see the situation from your point of view? I\'m here to listen and find a solution that works for everyone.',
      role: 'Team Leader (You)',
      timestamp: new Date(),
      emotionalTone: 'Empathetic'
    },
    {
      id: '3',
      sender: 'ai',
      message: 'Well, Sarah keeps dismissing my ideas without really considering them. She just says they won\'t work without explaining why. It\'s frustrating because I feel like my expertise isn\'t being valued.',
      role: 'Team Member (Alex)',
      timestamp: new Date(),
      emotionalTone: 'Frustrated'
    }
  ]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    setHasStarted(false);
    setShowFeedback(false);
  };

  const handleStartRoleplay = () => {
    setHasStarted(true);
    setShowFeedback(true);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const resetRoleplay = () => {
    setHasStarted(false);
    setIsRecording(false);
    setShowFeedback(false);
  };

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6">
            <PracticeBreadcrumb />
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/dashboard/practice/stage-6')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center flex-1">
              <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">
                Sensitive Scenario
              </h1>
            </div>
            
            <div className="w-10"></div>
          </div>

          {/* Scenario Selection */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Choose Your Roleplay Scenario</h2>
              <p className="text-muted-foreground">Select a challenging scenario to practice advanced communication skills</p>
            </div>

            <div className="space-y-4">
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
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                          <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">{scenario.title}</h3>
                          <p className="text-muted-foreground text-sm mb-3">{scenario.description}</p>
                          <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg">
                            <strong>Context:</strong> {scenario.context}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          scenario.difficulty === 'Expert' 
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        }`}>
                          {scenario.difficulty}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          scenario.emotionalComplexity === 'Very High' 
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {scenario.emotionalComplexity} EQ
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button
                onClick={handleStartRoleplay}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium"
                size="lg"
              >
                <Users className="h-5 w-5 mr-2" />
                Start Roleplay
              </Button>
            </div>

            {/* Roleplay Guidelines */}
            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Roleplay Guidelines</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Focus on emotional intelligence and empathy in your responses
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Use diplomatic language and consider cultural sensitivities
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Practice active listening and validate others' perspectives
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Aim for win-win solutions and constructive outcomes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Warning Notice */}
            <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      Sensitive Content Notice
                    </h4>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm">
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <PracticeBreadcrumb />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/dashboard/practice/stage-6')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1">
            <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">
              Sensitive Scenario
            </h1>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Current Scenario */}
        <Card className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">{currentScenario.title}</h3>
                <p className="text-sm text-green-700 dark:text-green-300 mb-2">{currentScenario.description}</p>
                <p className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 p-2 rounded">
                  <strong>Your Role:</strong> {currentScenario.context}
                </p>
              </div>
              <div className="flex flex-col items-end space-y-1 ml-4">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  currentScenario.difficulty === 'Expert' 
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                }`}>
                  {currentScenario.difficulty}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  currentScenario.emotionalComplexity === 'Very High' 
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {currentScenario.emotionalComplexity} EQ
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roleplay Conversation */}
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
                      <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-sm font-medium ${
                        message.sender === 'user' 
                          ? 'text-white' 
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {message.role}
                      </span>
                      {message.emotionalTone && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          message.sender === 'user' 
                            ? 'bg-white/20 text-white/80' 
                            : 'bg-muted/50 text-muted-foreground'
                        }`}>
                          {message.emotionalTone}
                        </span>
                      )}
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
            <h3 className="text-lg font-semibold mb-4">Communication Feedback</h3>
            <div className="space-y-4">
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-1">
                      <Heart className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">Emotional Intelligence</h4>
                      <p className="text-green-700 dark:text-green-300 text-sm">
                        Excellent empathetic response! You acknowledged Alex's feelings and created a safe space for dialogue.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-1">
                      <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">Diplomatic Language</h4>
                      <p className="text-green-700 dark:text-green-300 text-sm">
                        Your language was respectful and non-confrontational while still addressing the issue directly.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-1">
                      <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">Conflict Resolution</h4>
                      <p className="text-green-700 dark:text-green-300 text-sm">
                        You're demonstrating strong mediation skills by focusing on understanding rather than judgment.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
              Respond
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
                onClick={resetRoleplay}
                variant="outline"
                className="px-6 py-2"
              >
                New Scenario
              </Button>
              <Button
                onClick={() => navigate('/dashboard/practice/stage-6')}
                variant="outline"
                className="px-6 py-2"
              >
                Back to Stage 6
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 