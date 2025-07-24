import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { ArrowLeft, Mic, Lightbulb, FileText, Brain, CheckCircle, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OpinionTopic {
  id: string;
  title: string;
  description: string;
  category: string;
  complexity: 'Advanced' | 'Expert';
}

interface ArgumentStructure {
  id: string;
  title: string;
  completed: boolean;
  content?: string;
}

export default function CriticalOpinionBuilder() {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState<string>('ai-ethics');
  const [hasStarted, setHasStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const topics: OpinionTopic[] = [
    {
      id: 'ai-ethics',
      title: 'Artificial Intelligence and Ethical Boundaries',
      description: 'Should there be strict regulations on AI development and deployment?',
      category: 'Technology & Ethics',
      complexity: 'Expert'
    },
    {
      id: 'climate-policy',
      title: 'Climate Change and Economic Policy',
      description: 'Is economic growth compatible with environmental sustainability?',
      category: 'Environment & Economics',
      complexity: 'Expert'
    },
    {
      id: 'digital-privacy',
      title: 'Digital Privacy vs. Social Benefits',
      description: 'Should personal data be used for societal benefits even without explicit consent?',
      category: 'Privacy & Society',
      complexity: 'Advanced'
    },
    {
      id: 'education-future',
      title: 'The Future of Traditional Education',
      description: 'Are traditional educational institutions becoming obsolete in the digital age?',
      category: 'Education & Society',
      complexity: 'Advanced'
    }
  ];

  const currentTopic = topics.find(t => t.id === selectedTopic) || topics[0];

  const [argumentStructure, setArgumentStructure] = useState<ArgumentStructure[]>([
    { id: 'position', title: 'Clear Position Statement', completed: false },
    { id: 'evidence', title: 'Supporting Evidence & Examples', completed: false },
    { id: 'counterarguments', title: 'Address Counterarguments', completed: false },
    { id: 'conclusion', title: 'Logical Conclusion', completed: false }
  ]);

  const [opinionText, setOpinionText] = useState('');
  const [hasStartedWriting, setHasStartedWriting] = useState(false);

  const handleTopicChange = (topicId: string) => {
    setSelectedTopic(topicId);
    setHasStarted(false);
    setShowFeedback(false);
    setCurrentStep(0);
    setOpinionText('');
    setHasStartedWriting(false);
  };

  const handleStartBuilding = () => {
    setHasStarted(true);
  };

  const handleOpinionChange = (value: string) => {
    setOpinionText(value);
    if (!hasStartedWriting && value.length > 0) {
      setHasStartedWriting(true);
    }
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setShowFeedback(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const resetBuilder = () => {
    setHasStarted(false);
    setIsRecording(false);
    setShowFeedback(false);
    setCurrentStep(0);
    setOpinionText('');
    setHasStartedWriting(false);
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const wordCount = getWordCount(opinionText);
  const minWords = 200;

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
                Opinion Builder
              </h1>
            </div>
            
            <div className="w-10"></div>
          </div>

          {/* Topic Selection */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Choose Your Opinion Topic</h2>
              <p className="text-muted-foreground">Select a complex topic to develop a well-reasoned opinion</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topics.map((topic) => (
                <Card 
                  key={topic.id}
                  className={`cursor-pointer transition-all ${
                    selectedTopic === topic.id 
                      ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => handleTopicChange(topic.id)}
                >
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                          <Lightbulb className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          topic.complexity === 'Expert' 
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        }`}>
                          {topic.complexity}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{topic.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{topic.description}</p>
                        <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                          {topic.category}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button
                onClick={handleStartBuilding}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium"
                size="lg"
              >
                <Lightbulb className="h-5 w-5 mr-2" />
                Start Building Opinion
              </Button>
            </div>

            {/* Building Guidelines */}
            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Opinion Building Guidelines</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Develop a clear, well-reasoned position on the topic
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Support your arguments with evidence, examples, and logical reasoning
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Consider and address potential counterarguments
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Use sophisticated vocabulary and complex sentence structures
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
              Opinion Builder
            </h1>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Current Topic */}
        <Card className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">{currentTopic.title}</h3>
                <p className="text-sm text-green-700 dark:text-green-300 mb-2">{currentTopic.description}</p>
                <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                  {currentTopic.category}
                </span>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                currentTopic.complexity === 'Expert' 
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
              }`}>
                {currentTopic.complexity}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Argument Structure */}
        <Card className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4">
              Argument Structure
            </h3>
            <div className="space-y-3">
              {argumentStructure.map((item, index) => (
                <div key={item.id} className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    item.completed 
                      ? 'bg-green-500' 
                      : index === currentStep 
                      ? 'bg-green-200 dark:bg-green-800 border-2 border-green-500' 
                      : 'bg-muted border-2 border-muted-foreground/20'
                  }`}>
                    {item.completed && (
                      <CheckCircle className="h-4 w-4 text-white" />
                    )}
                    {!item.completed && index === currentStep && (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                  </div>
                  <span className={`text-sm ${
                    item.completed 
                      ? 'text-green-700 dark:text-green-300' 
                      : index === currentStep 
                      ? 'text-green-600 dark:text-green-400 font-medium' 
                      : 'text-muted-foreground'
                  }`}>
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Opinion Writing Area */}
        <Card className="mb-6 border-dashed border-2 border-muted-foreground/20">
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Develop Your Opinion</h3>
              <p className="text-sm text-muted-foreground">
                Write a comprehensive opinion piece addressing the topic. Include your position, supporting evidence, and logical reasoning.
              </p>
            </div>
            
            <Textarea
              placeholder="Start developing your opinion on this complex topic..."
              value={opinionText}
              onChange={(e) => handleOpinionChange(e.target.value)}
              className="min-h-[300px] bg-transparent border-none text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-0"
              style={{ fontSize: '16px' }}
            />
            
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-muted-foreground/20">
              <span className="text-sm text-muted-foreground">
                {wordCount}/{minWords} words minimum
              </span>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${wordCount >= minWords ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                <span className={`text-sm ${wordCount >= minWords ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {wordCount >= minWords ? 'Ready to present' : 'Keep writing'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Writing Tips */}
        {hasStartedWriting && (
          <Card className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4">Writing Tips</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <p className="text-green-700 dark:text-green-300 text-sm">
                    Use transition words to connect your ideas smoothly
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <p className="text-green-700 dark:text-green-300 text-sm">
                    Include specific examples to support your arguments
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <p className="text-green-700 dark:text-green-300 text-sm">
                    Acknowledge opposing viewpoints to strengthen your position
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feedback Section */}
        {showFeedback && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Opinion Analysis</h3>
            <div className="space-y-4">
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-1">
                      <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">Argument Clarity</h4>
                      <p className="text-green-700 dark:text-green-300 text-sm">
                        Your position is clearly stated and well-supported with logical reasoning.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-1">
                      <Brain className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">Critical Thinking</h4>
                      <p className="text-green-700 dark:text-green-300 text-sm">
                        Excellent analysis of multiple perspectives and consideration of counterarguments.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-1">
                      <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">Language Sophistication</h4>
                      <p className="text-green-700 dark:text-green-300 text-sm">
                        Advanced vocabulary and complex sentence structures demonstrate C2-level proficiency.
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
              disabled={wordCount < minWords}
            >
              <Mic className="h-5 w-5 mr-2" />
              Present Your Opinion
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
                onClick={resetBuilder}
                variant="outline"
                className="px-6 py-2"
              >
                New Topic
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