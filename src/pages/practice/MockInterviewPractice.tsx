import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Mic, Building2, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InterviewScenario {
  id: string;
  title: string;
  description: string;
  questions: string[];
}

export default function MockInterviewPractice() {
  const navigate = useNavigate();
  const [selectedScenario, setSelectedScenario] = useState<string>('university');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userResponses, setUserResponses] = useState<string[]>([]);

  const scenarios: InterviewScenario[] = [
    {
      id: 'university',
      title: 'University Admissions Interview',
      description: 'You are in an interview with a university admissions officer. Answer their questions confidently.',
      questions: [
        'Why should we admit you?',
        'Tell me about your leadership experience and how it has prepared you for university-level challenges.',
        'Can you provide a specific example of a time you demonstrated innovation or problem-solving skills?',
        'How do you handle stress and pressure in academic situations?',
        'What are your long-term career goals and how does our university fit into them?'
      ]
    },
    {
      id: 'job',
      title: 'Job Interview',
      description: 'You are interviewing for your dream job. Show your qualifications and enthusiasm.',
      questions: [
        'Tell me about yourself and why you\'re interested in this position.',
        'What are your greatest strengths and how do they relate to this role?',
        'Describe a challenging situation you faced at work and how you handled it.',
        'Where do you see yourself in five years?',
        'Do you have any questions for us?'
      ]
    },
    {
      id: 'scholarship',
      title: 'Scholarship Interview',
      description: 'You are applying for a prestigious scholarship. Demonstrate your worthiness.',
      questions: [
        'Why do you deserve this scholarship?',
        'How will this scholarship help you achieve your academic goals?',
        'Tell me about a time when you overcame a significant obstacle.',
        'What impact do you hope to make in your field of study?',
        'How do you plan to give back to the community?'
      ]
    }
  ];

  const currentScenario = scenarios.find(s => s.id === selectedScenario) || scenarios[0];
  const currentQuestion = currentScenario.questions[currentQuestionIndex];

  const mockUserResponse = "I believe my unique blend of academic excellence, leadership experience, and passion for innovation aligns perfectly with your university's values. I'm confident I can make a significant contribution to your community.";

  const followUpQuestions = [
    "That's a strong start. Can you elaborate on your leadership experience and how it has prepared you for university-level challenges?",
    "Also, could you provide a specific example of a time you demonstrated innovation or problem-solving skills?"
  ];

  const handleStartInterview = () => {
    setHasStarted(true);
    setCurrentQuestionIndex(0);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < currentScenario.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const resetInterview = () => {
    setHasStarted(false);
    setCurrentQuestionIndex(0);
    setUserResponses([]);
    setIsRecording(false);
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
              onClick={() => navigate('/dashboard/practice/stage-4')}
              className="shrink-0"
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
            
            {scenarios.map((scenario) => (
              <Card 
                key={scenario.id}
                className={`cursor-pointer transition-all ${
                  selectedScenario === scenario.id 
                    ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedScenario(scenario.id)}
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
            onClick={() => navigate('/dashboard/practice/stage-4')}
            className="shrink-0"
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
        <div className="space-y-6">
          {/* Scenario Title */}
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
                  {currentScenario.title}
                </h2>
                <p className="text-green-700 dark:text-green-300 text-sm">
                  {currentScenario.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Current Question */}
          <Card className="border-dashed border-2 border-muted-foreground/20">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-foreground">{currentQuestion}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Response (Mock) */}
          <Card className="bg-green-600 dark:bg-green-700">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white">{mockUserResponse}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Follow-up Questions */}
          {followUpQuestions.map((question, index) => (
            <Card key={index} className="border-dashed border-2 border-muted-foreground/20">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground">{question}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Action Buttons */}
          <div className="flex flex-col items-center space-y-4">
            <Button
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium"
              size="lg"
            >
              <Mic className="h-5 w-5 mr-2" />
              Speak Now
            </Button>

            <div className="flex space-x-4">
              <Button
                onClick={handlePrevQuestion}
                variant="outline"
                disabled={currentQuestionIndex === 0}
                className="px-6 py-2"
              >
                Previous
              </Button>
              <Button
                onClick={handleNextQuestion}
                variant="outline"
                disabled={currentQuestionIndex === currentScenario.questions.length - 1}
                className="px-6 py-2"
              >
                Next Question
              </Button>
            </div>

            <Button
              onClick={resetInterview}
              variant="outline"
              className="px-6 py-2"
            >
              Reset Interview
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {currentScenario.questions.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 