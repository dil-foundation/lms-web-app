import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { ArrowLeft, Users, Mic, Plus, GraduationCap, Heart, ShoppingCart } from 'lucide-react';
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
  icon: any;
  color: string;
  participants: string[];
}

export default function GroupDialogue() {
  const navigate = useNavigate();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');

  const scenarios: Scenario[] = [
    {
      id: 'school',
      title: 'Explain why you missed school',
      description: 'Practice explaining absences and making excuses in a school setting',
      icon: GraduationCap,
      color: 'bg-green-500',
      participants: ['Teacher', 'Classmate', 'You']
    },
    {
      id: 'doctor',
      title: 'Ask a doctor for help',
      description: 'Practice describing symptoms and asking for medical advice',
      icon: Plus,
      color: 'bg-gray-600',
      participants: ['Doctor', 'Nurse', 'You']
    },
    {
      id: 'pharmacy',
      title: 'Buy something at a pharmacy',
      description: 'Practice purchasing medication and asking about products',
      icon: Heart,
      color: 'bg-gray-600',
      participants: ['Pharmacist', 'Customer', 'You']
    }
  ];

  const initializeConversation = (scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    const initialMessages: Message[] = [
      {
        type: 'system',
        message: `Starting ${scenario.title} scenario`
      }
    ];

    // Add scenario-specific initial message
    switch (scenarioId) {
      case 'school':
        initialMessages.push({
          type: 'ai',
          message: 'Hello, what\'s the problem?',
          persona: 'Teacher',
          avatar: '👨‍🏫'
        });
        break;
      case 'doctor':
        initialMessages.push({
          type: 'ai',
          message: 'Good morning! How can I help you today?',
          persona: 'Doctor',
          avatar: '👨‍⚕️'
        });
        break;
      case 'pharmacy':
        initialMessages.push({
          type: 'ai',
          message: 'Welcome to the pharmacy. What can I get for you?',
          persona: 'Pharmacist',
          avatar: '👩‍⚕️'
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

    setConversation(newMessages);
    setUserInput('');
  };

  const generateAIResponse = (scenarioId: string, userMessage: string): Message => {
    const responses = {
      school: [
        { message: "I see. Do you have a note from your parents?", persona: "Teacher", avatar: "👨‍🏫" },
        { message: "That's understandable. Please make sure to catch up on the work.", persona: "Teacher", avatar: "👨‍🏫" },
        { message: "Well done! Try: 'Could you please fix it today?' to sound polite.", persona: "System", avatar: "ℹ️" }
      ],
      doctor: [
        { message: "I understand. How long have you been feeling this way?", persona: "Doctor", avatar: "👨‍⚕️" },
        { message: "Let me examine you. Please describe the pain.", persona: "Doctor", avatar: "👨‍⚕️" },
        { message: "I can prescribe something for that. Take this twice daily.", persona: "Doctor", avatar: "👨‍⚕️" }
      ],
      pharmacy: [
        { message: "Certainly! Do you have a prescription for that?", persona: "Pharmacist", avatar: "👩‍⚕️" },
        { message: "This medication should help. Take one tablet every 8 hours.", persona: "Pharmacist", avatar: "👩‍⚕️" },
        { message: "That will be $15. Would you like a receipt?", persona: "Pharmacist", avatar: "👩‍⚕️" }
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

  const handleBackToScenarios = () => {
    setSelectedScenario(null);
    setConversation([]);
    setUserInput('');
  };

  if (selectedScenario) {
    const scenario = scenarios.find(s => s.id === selectedScenario)!;
    
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
              onClick={handleBackToScenarios}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center flex-1">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold">Group Dialogue</h1>
              <p className="text-muted-foreground">Solve Real-Life Situations</p>
            </div>
            
            <div className="w-10"></div>
          </div>

          {/* Scenario Info */}
          <Card className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 ${scenario.color} rounded-lg flex items-center justify-center`}>
                    <scenario.icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-green-800 dark:text-green-200">{scenario.title}</h3>
                    <p className="text-sm text-green-700 dark:text-green-300">{scenario.description}</p>
                  </div>
                </div>
                
                {/* Participants */}
                <div className="flex items-center space-x-1">
                  {scenario.participants.map((participant, index) => (
                    <div key={index} className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <span className="text-xs text-green-600 dark:text-green-400">
                        {participant === 'You' ? 'Y' : participant[0]}
                      </span>
                    </div>
                  ))}
                </div>
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
        {/* Breadcrumb */}
        <div className="mb-6">
          <PracticeBreadcrumb />
        </div>
        
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
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold">Group Dialogue</h1>
            <p className="text-muted-foreground">Solve Real-Life Situations</p>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Instructions */}
        <Card className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <p className="text-center text-green-700 dark:text-green-300">
              Practice group conversations with AI personas in real-world scenarios
            </p>
          </CardContent>
        </Card>

        {/* Scenario Selection */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-4">Choose a Scenario</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {scenarios.map((scenario) => (
              <Card
                key={scenario.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleScenarioSelect(scenario.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 ${scenario.color} rounded-lg flex items-center justify-center`}>
                      <scenario.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex items-center space-x-1">
                      {scenario.participants.map((participant, index) => (
                        <div key={index} className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">
                            {participant === 'You' ? 'Y' : participant[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <h3 className="font-medium mb-2">{scenario.title}</h3>
                  <p className="text-sm text-muted-foreground">{scenario.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Speak Now Button */}
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
      </div>
    </div>
  );
} 