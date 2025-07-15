import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Users, Mic, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Message {
  type: 'ai' | 'user';
  message: string;
  role?: string;
}

const mockUserResponses = [
  "I would like to order pizza please",
  "Can I have a burger with fries?",
  "I want chicken karahi and rice",
  "What do you recommend?",
  "I'll have the special of the day",
  "Can I see the menu first?",
  "I would like some tea with my meal",
  "Is the food spicy?",
  "How much does it cost?",
  "I'm ready to order now",
  "Can I have extra sauce?",
  "I want to try something new",
  "What's the most popular dish?",
  "I need something quick",
  "Can I get that to go?"
];

const restaurantFlow = [
  {
    ai: "Welcome to our restaurant! I'm your server. How can I help you today?",
    responses: [
      "I would like to see the menu please",
      "I want to order food",
      "What do you recommend?",
      "I'm ready to order"
    ]
  },
  {
    ai: "Great! Here's our menu. We have pizza, burgers, traditional Pakistani dishes, and beverages. What would you like to try?",
    responses: [
      "I'll have the chicken karahi",
      "Can I get a cheeseburger?",
      "I want to try the biryani",
      "What's your special today?"
    ]
  },
  {
    ai: "Excellent choice! Would you like anything to drink with that?",
    responses: [
      "I'll have a Coke please",
      "Can I get some tea?",
      "Just water is fine",
      "What drinks do you have?"
    ]
  },
  {
    ai: "Perfect! Is there anything else you'd like to add to your order?",
    responses: [
      "That's all, thank you",
      "Can I get some dessert?",
      "I'd like some extra sauce",
      "How long will it take?"
    ]
  },
  {
    ai: "Wonderful! Your order will be ready in about 15 minutes. Would you like to pay now or when the food arrives?",
    responses: [
      "I'll pay now",
      "I'll pay when the food comes",
      "Can I pay by card?",
      "How much is the total?"
    ]
  },
  {
    ai: "Thank you for your order! Please have a seat and we'll bring your food shortly. Enjoy your meal!",
    responses: [
      "Thank you very much",
      "I appreciate it",
      "Looking forward to it",
      "Thanks for the service"
    ]
  }
];

export default function RoleplaySimulation() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState<Message[]>([
    {
      type: 'ai',
      message: restaurantFlow[0].ai,
      role: 'Server'
    }
  ]);

  const handleSubmit = () => {
    if (userInput.trim()) {
      // Add user message
      const newConversation = [
        ...conversation,
        { type: 'user' as const, message: userInput }
      ];
      
      // Move to next step and add AI response
      const nextStep = Math.min(currentStep + 1, restaurantFlow.length - 1);
      if (nextStep < restaurantFlow.length) {
        newConversation.push({
          type: 'ai' as const,
          message: restaurantFlow[nextStep].ai,
          role: 'Server'
        });
      }
      
      setConversation(newConversation);
      setCurrentStep(nextStep);
      setUserInput('');
    }
  };

  const handleMockResponse = () => {
    const currentFlowStep = restaurantFlow[currentStep];
    if (currentFlowStep && currentFlowStep.responses) {
      const randomResponse = currentFlowStep.responses[Math.floor(Math.random() * currentFlowStep.responses.length)];
      setUserInput(randomResponse);
    } else {
      const randomResponse = mockUserResponses[Math.floor(Math.random() * mockUserResponses.length)];
      setUserInput(randomResponse);
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setUserInput('');
    setConversation([
      {
        type: 'ai',
        message: restaurantFlow[0].ai,
        role: 'Server'
      }
    ]);
  };

  const isCompleted = currentStep >= restaurantFlow.length - 1;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/dashboard/practice/stage-2')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold">Roleplay Simulation</h1>
            <p className="text-muted-foreground">Practice real-world conversations</p>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Scenario Info */}
        <Card className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-medium text-green-800 dark:text-green-200">Scenario: Order Food at a Restaurant</span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              You're at a restaurant and want to order food. Practice having a natural conversation with the server.
            </p>
          </CardContent>
        </Card>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {restaurantFlow.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestart}
              disabled={currentStep === 0}
            >
              Restart
            </Button>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / restaurantFlow.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Conversation Area */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {conversation.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-xs lg:max-w-md">
                    {msg.type === 'ai' && (
                      <div className="text-xs text-muted-foreground mb-1">
                        {msg.role || 'AI'}
                      </div>
                    )}
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        msg.type === 'user'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-foreground'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Suggested Responses */}
        {!isCompleted && restaurantFlow[currentStep]?.responses && (
          <Card className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">💡 Suggested responses:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {restaurantFlow[currentStep].responses.map((response, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setUserInput(response)}
                                         className="justify-start text-left h-auto py-2 px-3 text-blue-800 dark:text-blue-200 border-blue-400 dark:border-blue-600 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    {response}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Input Area */}
        {!isCompleted && (
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
                    onClick={handleSubmit}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={!userInput.trim()}
                  >
                    <Send className="h-4 w-4 mr-2" />
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
        )}

        {/* Completion Message */}
        {isCompleted && (
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                Great Job! 🎉
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                You've successfully completed the restaurant ordering roleplay. Your conversation skills are improving!
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={handleRestart}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
                >
                  Practice Again
                </Button>
                <Button
                  onClick={() => navigate('/dashboard/practice/stage-2')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Back to Stage 2
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 