import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Mic, GraduationCap, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PresentationTopic {
  id: string;
  title: string;
  description: string;
}

interface SpeechStructureItem {
  id: string;
  title: string;
  completed: boolean;
}

export default function AcademicPresentations() {
  const navigate = useNavigate();
  const [selectedTopic] = useState<PresentationTopic>({
    id: 'climate-economics',
    title: 'Explain the role of climate change in global economics.',
    description: 'Present a comprehensive analysis of how climate change affects global economic systems'
  });
  
  const [speechStructure] = useState<SpeechStructureItem[]>([
    { id: 'introduction', title: 'Introduction', completed: true },
    { id: 'key-points', title: 'Key Points & Evidence', completed: true },
    { id: 'conclusion', title: 'Conclusion & Q&A', completed: true }
  ]);

  const [isPresenting, setIsPresenting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const handleStartPresenting = () => {
    setIsPresenting(true);
    setHasStarted(true);
  };

  const handleStopPresenting = () => {
    setIsPresenting(false);
  };

  const resetPresentation = () => {
    setIsPresenting(false);
    setHasStarted(false);
  };

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

          {/* Presentation Topic */}
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
                  {selectedTopic.title}
                </h3>
              </div>
            </CardContent>
          </Card>

          {/* Speech Structure */}
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

          {/* Presentation Guidelines */}
          {!hasStarted && (
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

          {/* Feedback Section */}
          {hasStarted && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Presentation Feedback</h3>
              <div className="space-y-4">
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-1">
                        <GraduationCap className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">Content Organization</h4>
                        <p className="text-green-700 dark:text-green-300 text-sm">
                          Your presentation follows a logical structure with clear transitions between points.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-1">
                        <GraduationCap className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">Academic Language</h4>
                        <p className="text-green-700 dark:text-green-300 text-sm">
                          Excellent use of academic vocabulary and formal presentation style.
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
            {!hasStarted ? (
              <Button
                onClick={handleStartPresenting}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium"
                size="lg"
              >
                <Mic className="h-5 w-5 mr-2" />
                Start Presenting
              </Button>
            ) : !isPresenting ? (
              <div className="space-y-3">
                <Button
                  onClick={handleStartPresenting}
                  className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium"
                  size="lg"
                >
                  <Mic className="h-5 w-5 mr-2" />
                  Continue Presenting
                </Button>
                <div className="flex justify-center space-x-4">
                  <Button
                    onClick={resetPresentation}
                    variant="outline"
                    className="px-6 py-2"
                  >
                    Reset
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
            ) : (
              <Button
                onClick={handleStopPresenting}
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full text-lg font-medium"
                size="lg"
              >
                <Mic className="h-5 w-5 mr-2" />
                Stop Presenting
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 