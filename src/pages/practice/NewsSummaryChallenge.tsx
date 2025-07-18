import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Play, Pause, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NewsArticle {
  id: string;
  title: string;
  level: string;
  duration: string;
  content: string;
}

export default function NewsSummaryChallenge() {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(60); // 1 minute audio
  const [summary, setSummary] = useState('');
  const [hasStartedWriting, setHasStartedWriting] = useState(false);

  const newsArticles: NewsArticle[] = [
    {
      id: 'school-closures',
      title: 'School closures due to weather',
      level: 'B2 Level',
      duration: '1:00',
      content: 'Several schools across the region have announced closures today due to severe weather conditions. The decision was made early this morning after meteorologists predicted heavy snowfall and dangerous driving conditions. Parents are advised to keep their children at home and monitor local news for updates on when schools will reopen.'
    },
    {
      id: 'tech-innovation',
      title: 'New technology breakthrough',
      level: 'B2 Level',
      duration: '1:15',
      content: 'Scientists at a leading university have developed a revolutionary new battery technology that could extend electric vehicle range by up to 50%. The breakthrough involves a new type of lithium-ion battery that uses silicon nanowires to store more energy in the same space.'
    },
    {
      id: 'environmental-news',
      title: 'Environmental conservation efforts',
      level: 'B2 Level',
      duration: '1:30',
      content: 'Local environmental groups have launched a new initiative to protect endangered species in the region. The program involves creating wildlife corridors and establishing protected areas where animals can safely migrate and reproduce.'
    }
  ];

  const [currentArticle] = useState(newsArticles[0]);
  const maxWords = 100;

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    // In a real implementation, this would control actual audio playback
  };

  const handleSummaryChange = (value: string) => {
    setSummary(value);
    if (!hasStartedWriting && value.length > 0) {
      setHasStartedWriting(true);
    }
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const wordCount = getWordCount(summary);
  const progressPercentage = Math.min((currentTime / duration) * 100, 100);

  const resetChallenge = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setSummary('');
    setHasStartedWriting(false);
  };

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
              News Summary
            </h1>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Listen, Summarize & Speak</h2>
          </div>

          {/* Audio Player */}
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                      {currentArticle.level}
                    </span>
                    <span className="text-foreground font-medium">{currentArticle.title}</span>
                  </div>
                </div>
                <Button
                  onClick={handlePlayPause}
                  className="bg-green-500 hover:bg-green-600 text-white rounded-full w-12 h-12"
                  size="icon"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6" />
                  )}
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-muted/30 rounded-full h-2 mb-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                {currentArticle.duration}
              </div>
            </CardContent>
          </Card>

          {/* Summary Input */}
          <Card className="border-dashed border-2 border-muted-foreground/20">
            <CardContent className="p-6">
              <Textarea
                placeholder="Start writing your summary..."
                value={summary}
                onChange={(e) => handleSummaryChange(e.target.value)}
                className="min-h-[200px] bg-transparent border-none text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-0"
                style={{ fontSize: '16px' }}
              />
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-muted-foreground/20">
                <span className="text-sm text-muted-foreground">
                  {wordCount}/{maxWords} words
                </span>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${wordCount <= maxWords ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`text-sm ${wordCount <= maxWords ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {wordCount <= maxWords ? 'Within limit' : 'Over limit'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feedback Section */}
          {hasStartedWriting && (
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4">Writing Tips</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-green-700 dark:text-green-300 text-sm">
                      Focus on the main points and key details from the audio
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-green-700 dark:text-green-300 text-sm">
                      Use your own words rather than copying phrases directly
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-green-700 dark:text-green-300 text-sm">
                      Keep it concise and within the word limit
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col items-center space-y-4">
            <Button
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium"
              size="lg"
              disabled={!summary.trim() || wordCount > maxWords}
            >
              <Mic className="h-5 w-5 mr-2" />
              Speak Now
            </Button>

            <div className="flex space-x-4">
              <Button
                onClick={resetChallenge}
                variant="outline"
                className="px-6 py-2"
              >
                Reset
              </Button>
              <Button
                onClick={() => navigate('/dashboard/practice/stage-4')}
                variant="outline"
                className="px-6 py-2"
              >
                Back to Stage 4
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Listen to the news article, write a summary, then speak about it
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 