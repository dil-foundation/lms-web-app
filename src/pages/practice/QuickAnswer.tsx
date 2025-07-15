import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Zap, Mic, CheckCircle, XCircle, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Question {
  question: string;
  expectedAnswer: string;
  hints: string[];
}

const whQuestions: Question[] = [
  {
    question: "Where do you live?",
    expectedAnswer: "I live in [city/place]",
    hints: ["Use 'I live in...'", "Mention your city or area"]
  },
  {
    question: "What time do you wake up?",
    expectedAnswer: "I wake up at [time]",
    hints: ["Use 'I wake up at...'", "Mention the time like '7 AM'"]
  },
  {
    question: "Who is your best friend?",
    expectedAnswer: "My best friend is [name]",
    hints: ["Use 'My best friend is...'", "You can say a name or describe them"]
  },
  {
    question: "When do you have lunch?",
    expectedAnswer: "I have lunch at [time]",
    hints: ["Use 'I have lunch at...'", "Mention the time like '12 PM'"]
  },
  {
    question: "How do you go to work?",
    expectedAnswer: "I go to work by [transport]",
    hints: ["Use 'I go by...' or 'I take...'", "Mention bus, car, walking, etc."]
  },
  {
    question: "Why do you study English?",
    expectedAnswer: "I study English because [reason]",
    hints: ["Use 'I study English because...'", "Give a reason like 'for work' or 'to travel'"]
  }
];

const mockUserResponses = [
  "I live in Lahore city with my family",
  "I wake up at 6:30 in the morning",
  "My best friend is Ahmed from school",
  "I have lunch at 1 PM usually",
  "I go to work by bus every day",
  "I study English because I want to get better job",
  "I live in Karachi near the beach",
  "I wake up early at 5 AM for prayers",
  "My best friend is my sister Fatima",
  "I have lunch at 12:30 with colleagues",
  "I go to work by motorcycle",
  "I study English because I like to travel"
];

export default function QuickAnswer() {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<{
    pronunciation: string;
    grammar: string;
    answerMatch: string;
    overall: 'good' | 'needs_improvement';
  } | null>(null);
  const [showHints, setShowHints] = useState(false);

  const currentQuestion = whQuestions[currentQuestionIndex];

  const generateFeedback = (answer: string) => {
    const feedbackOptions = {
      pronunciation: [
        "Great pronunciation! Very clear.",
        "Good pronunciation. Try to speak a bit slower.",
        "Nice effort! Work on the 'th' sound.",
        "Clear speaking. Good job!",
        "Excellent pronunciation!"
      ],
      grammar: [
        "Perfect grammar structure!",
        "Good sentence structure. Well done!",
        "Grammar is correct. Nice work!",
        "Try to use complete sentences.",
        "Good use of grammar rules!"
      ],
      answerMatch: [
        "Perfect answer! You understood the question well.",
        "Good answer! Very relevant to the question.",
        "Nice response! You answered correctly.",
        "Great! Your answer matches the question perfectly.",
        "Excellent! You gave a complete answer."
      ]
    };

    const randomPronunciation = feedbackOptions.pronunciation[Math.floor(Math.random() * feedbackOptions.pronunciation.length)];
    const randomGrammar = feedbackOptions.grammar[Math.floor(Math.random() * feedbackOptions.grammar.length)];
    const randomAnswerMatch = feedbackOptions.answerMatch[Math.floor(Math.random() * feedbackOptions.answerMatch.length)];

    return {
      pronunciation: randomPronunciation,
      grammar: randomGrammar,
      answerMatch: randomAnswerMatch,
      overall: 'good' as const
    };
  };

  const handleSubmit = () => {
    if (userAnswer.trim()) {
      const newFeedback = generateFeedback(userAnswer);
      setFeedback(newFeedback);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < whQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setUserAnswer('');
      setFeedback(null);
      setShowHints(false);
    } else {
      // Reset to first question
      setCurrentQuestionIndex(0);
      setUserAnswer('');
      setFeedback(null);
      setShowHints(false);
    }
  };

  const handleMockResponse = () => {
    const randomResponse = mockUserResponses[Math.floor(Math.random() * mockUserResponses.length)];
    setUserAnswer(randomResponse);
  };

  const handleTryAgain = () => {
    setUserAnswer('');
    setFeedback(null);
    setShowHints(false);
  };

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
              <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold">Quick Answer</h1>
            <p className="text-muted-foreground">Practice responding to WH-questions</p>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Question {currentQuestionIndex + 1} of {whQuestions.length}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHints(!showHints)}
            >
              {showHints ? 'Hide' : 'Show'} Hints
            </Button>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / whQuestions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <Card className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 font-bold">AI</span>
                </div>
                <p className="text-lg font-medium text-green-800 dark:text-green-200">
                  {currentQuestion.question}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="text-green-600 dark:text-green-400">
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Hints */}
        {showHints && (
          <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">💡 Hints:</h3>
              <ul className="space-y-1">
                {currentQuestion.hints.map((hint, index) => (
                  <li key={index} className="text-sm text-blue-700 dark:text-blue-300">
                    • {hint}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Answer Input */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="space-y-4">
              <textarea
                placeholder="Type your answer here..."
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="w-full min-h-20 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:border-gray-700"
              />
              
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={!userAnswer.trim()}
                >
                  Submit Answer
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

        {/* Feedback */}
        {feedback && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-medium">Feedback</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-sm">Pronunciation:</p>
                    <p className="text-sm text-muted-foreground">{feedback.pronunciation}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-sm">Grammar:</p>
                    <p className="text-sm text-muted-foreground">{feedback.grammar}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-sm">Answer Match:</p>
                    <p className="text-sm text-muted-foreground">{feedback.answerMatch}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleNextQuestion}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {currentQuestionIndex < whQuestions.length - 1 ? 'Next Question' : 'Start Over'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleTryAgain}
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 