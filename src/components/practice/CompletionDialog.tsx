import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, RotateCcw, ArrowRight, Trophy, Star } from 'lucide-react';

interface CompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  score: number;
  onRedo: () => void;
  onContinue: () => void;
}

export function CompletionDialog({
  isOpen,
  onClose,
  exerciseName,
  score,
  onRedo,
  onContinue,
}: CompletionDialogProps) {
  const [isRedoing, setIsRedoing] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);

  const handleRedo = async () => {
    setIsRedoing(true);
    try {
      onRedo();
      onClose();
    } finally {
      setIsRedoing(false);
    }
  };

  const handleContinue = async () => {
    setIsContinuing(true);
    try {
      onContinue();
      onClose();
    } finally {
      setIsContinuing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) return 'Outstanding performance! 🌟';
    if (score >= 80) return 'Excellent work! 👏';
    if (score >= 70) return 'Great job! 👍';
    if (score >= 60) return 'Good effort! Keep practicing 💪';
    return 'Keep practicing - you\'ll improve! 🔄';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <Trophy className="h-8 w-8 text-yellow-500" />;
    if (score >= 60) return <Star className="h-8 w-8 text-blue-500" />;
    return <CheckCircle className="h-8 w-8 text-primary" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Exercise Complete!
          </DialogTitle>
          <DialogDescription className="text-center text-base text-muted-foreground">
            {exerciseName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Score Display */}
          <Card className="border-0 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl shadow-lg">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  {getScoreIcon(score)}
                </div>
                
                <div>
                  <div className={`text-4xl font-bold ${getScoreColor(score)} mb-2`}>
                    {score}%
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {getScoreMessage(score)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleRedo}
              disabled={isRedoing || isContinuing}
              variant="outline"
              className="w-full py-3 text-base font-medium hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all duration-300"
            >
              {isRedoing ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                  Starting...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Practice Again
                </>
              )}
            </Button>

            <Button
              onClick={handleContinue}
              disabled={isRedoing || isContinuing}
              className="w-full py-3 text-base font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {isContinuing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Continuing...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Continue
                </>
              )}
            </Button>
          </div>

          {/* Encouragement Message */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {score >= 80 
                ? "Amazing progress! Keep up the excellent work!" 
                : score >= 60
                ? "You're doing great! Every practice session helps you improve."
                : "Remember, consistent practice leads to fluency. Keep going!"
              }
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
