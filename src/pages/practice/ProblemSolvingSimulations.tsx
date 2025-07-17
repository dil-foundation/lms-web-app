import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Lightbulb, Mic, Users, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  context: string;
  participants: string[];
}

export default function ProblemSolvingSimulations() {
  const navigate = useNavigate();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');

  const scenarios: Scenario[] = [
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

  const initializeConversation = (scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    const initialMessages: Message[] = [
      {
        type: 'system',
        message: `Starting ${scenario.title} simulation`
      }
    ];

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
    }

    setConversation(initialMessages);
  };

  const handleScenarioSelect = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    initializeConversation(scenarioId);
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;

    const newMessages: Message[] = [
      ...conversation,
      {
        type: 'user',
        message: userInput
      }
    ];

    // Generate AI response based on scenario
    const aiResponse = generateAIResponse(selectedScenario!, userInput);
    newMessages.push(aiResponse);

    // Sometimes add feedback
    if (Math.random() < 0.3) {
      const feedback = generateFeedback(selectedScenario!, userInput);
      newMessages.push(feedback);
    }

    setConversation(newMessages);
    setUserInput('');
  };

  const generateAIResponse = (scenarioId: string, userMessage: string): Message => {
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
    const randomResponse = scenarioResponses[Math.floor(Math.random() * scenarioResponses.length)];

    return {
      type: 'ai',
      message: randomResponse.message,
      persona: randomResponse.persona,
      avatar: randomResponse.avatar
    };
  };

  const generateFeedback = (scenarioId: string, userMessage: string): Message => {
    const feedbackMessages = [
      "Good teamwork! You took initiative and used polite coordination.",
      "Excellent! You're contributing ideas and asking good questions.",
      "Well done! You're being collaborative and supportive.",
      "Great communication! You're helping the group stay focused.",
      "Perfect! You're showing leadership and problem-solving skills."
    ];

    const randomFeedback = feedbackMessages[Math.floor(Math.random() * feedbackMessages.length)];

    return {
      type: 'ai',
      message: randomFeedback,
      persona: 'System',
      avatar: '✓'
    };
  };

  const handleBackToScenarios = () => {
    setSelectedScenario(null);
    setConversation([]);
    setUserInput('');
  };

  const mockResponses = [
    "I can present the project.",
    "I can do the research part.",
    "When should we meet?",
    "That's a great idea!",
    "I agree with that plan."
  ];

  const handleMockResponse = () => {
    const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    setUserInput(randomResponse);
  };

  if (selectedScenario) {
    const scenario = scenarios.find(s => s.id === selectedScenario)!;
    
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
              <div className="text-center mb-4">
                <h2 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
                  {scenario.title}
                </h2>
                <p className="text-green-700 dark:text-green-300 mb-4">
                  {scenario.context}
                </p>
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
            </CardContent>
          </Card>

          {/* Conversation */}
          <Card className="mb-4">
            <CardContent className="p-4">
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
              </div>
            </CardContent>
          </Card>

          {/* Input */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <textarea
                  placeholder="Type your response here..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="w-full min-h-20 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:border-gray-700"
                />
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleSendMessage}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={!userInput.trim()}
                  >
                    Send Response
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleMockResponse}
                    className="px-4"
                  >
                    Try Example
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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

        {/* Scenario Selection */}
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

        {/* Speak Now Button */}
        <Card>
          <CardContent className="p-4">
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white py-6"
              disabled
            >
              <Mic className="h-5 w-5 mr-2" />
              Speak Now
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 