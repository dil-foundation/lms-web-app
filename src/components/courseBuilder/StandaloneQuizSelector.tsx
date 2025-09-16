import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Plus, 
  Link, 
  Unlink, 
  Clock, 
  Target, 
  Users, 
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { StandaloneQuizService } from '@/services/standaloneQuizService';
import { 
  AvailableQuizForCourse, 
  CourseLinkedQuiz, 
  BulkLinkResult 
} from '@/types/standaloneQuiz';
import { toast } from 'sonner';

interface StandaloneQuizSelectorProps {
  courseId: string;
  onQuizzesLinked?: (results: BulkLinkResult[]) => void;
  onQuizzesUnlinked?: (quizIds: string[]) => void;
}

export const StandaloneQuizSelector: React.FC<StandaloneQuizSelectorProps> = ({
  courseId,
  onQuizzesLinked,
  onQuizzesUnlinked
}) => {
  const [activeTab, setActiveTab] = useState<'available' | 'linked'>('available');
  const [availableQuizzes, setAvailableQuizzes] = useState<AvailableQuizForCourse[]>([]);
  const [linkedQuizzes, setLinkedQuizzes] = useState<CourseLinkedQuiz[]>([]);
  const [selectedQuizzes, setSelectedQuizzes] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    loadData();
  }, [courseId]);

  const loadData = async () => {
    await Promise.all([
      loadAvailableQuizzes(),
      loadLinkedQuizzes()
    ]);
  };

  const loadAvailableQuizzes = async () => {
    try {
      setLoading(true);
      const quizzes = await StandaloneQuizService.getAvailableQuizzesForCourse(courseId, {
        searchTerm: searchTerm || undefined,
        difficultyFilter: difficultyFilter !== 'all' ? difficultyFilter : undefined,
        limit: 50
      });
      setAvailableQuizzes(quizzes);
    } catch (error) {
      console.error('Error loading available quizzes:', error);
      toast.error('Failed to load available quizzes');
    } finally {
      setLoading(false);
    }
  };

  const loadLinkedQuizzes = async () => {
    try {
      const quizzes = await StandaloneQuizService.getCourseLinkedQuizzes(courseId);
      setLinkedQuizzes(quizzes);
    } catch (error) {
      console.error('Error loading linked quizzes:', error);
      toast.error('Failed to load linked quizzes');
    }
  };

  const handleSearch = () => {
    loadAvailableQuizzes();
  };

  const handleQuizSelect = (quizId: string, selected: boolean) => {
    if (selected) {
      setSelectedQuizzes(prev => [...prev, quizId]);
    } else {
      setSelectedQuizzes(prev => prev.filter(id => id !== quizId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allQuizIds = availableQuizzes
        .filter(quiz => !quiz.is_already_linked)
        .map(quiz => quiz.quiz_id);
      setSelectedQuizzes(allQuizIds);
    } else {
      setSelectedQuizzes([]);
    }
  };

  const handleLinkQuizzes = async () => {
    if (selectedQuizzes.length === 0) {
      toast.warning('Please select at least one quiz to link');
      return;
    }

    try {
      setLinking(true);
      const results = await StandaloneQuizService.bulkLinkQuizzesToCourse(
        courseId, 
        selectedQuizzes,
        {
          linkType: 'standalone',
          isRequired: true
        }
      );

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        toast.success(`Successfully linked ${successCount} quiz${successCount > 1 ? 'es' : ''}`);
        onQuizzesLinked?.(results);
        setSelectedQuizzes([]);
        loadData();
      }

      if (failureCount > 0) {
        toast.error(`Failed to link ${failureCount} quiz${failureCount > 1 ? 'es' : ''}`);
      }
    } catch (error) {
      console.error('Error linking quizzes:', error);
      toast.error('Failed to link quizzes');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to unlink this quiz from the course?')) {
      return;
    }

    try {
      const success = await StandaloneQuizService.unlinkQuizFromCourse(quizId, courseId);
      if (success) {
        toast.success('Quiz unlinked successfully');
        onQuizzesUnlinked?.([quizId]);
        loadData();
      }
    } catch (error) {
      console.error('Error unlinking quiz:', error);
      toast.error('Failed to unlink quiz');
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return <Badge variant="outline" className="text-green-600">Easy</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-yellow-600">Medium</Badge>;
      case 'hard':
        return <Badge variant="outline" className="text-red-600">Hard</Badge>;
      default:
        return <Badge variant="outline">{difficulty}</Badge>;
    }
  };

  const filteredAvailableQuizzes = availableQuizzes.filter(quiz => {
    const matchesSearch = quiz.quiz_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.quiz_description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'all' || quiz.difficulty_level === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Standalone Quizzes</h3>
          <p className="text-sm text-muted-foreground">
            Link existing standalone quizzes to this course
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'available' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('available')}
          >
            Available Quizzes
          </Button>
          <Button
            variant={activeTab === 'linked' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('linked')}
          >
            Linked Quizzes ({linkedQuizzes.length})
          </Button>
        </div>
      </div>

      {activeTab === 'available' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search quizzes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulty</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch} variant="outline">
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Selection Controls */}
          {filteredAvailableQuizzes.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedQuizzes.length === filteredAvailableQuizzes.filter(q => !q.is_already_linked).length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm">
                  Select All ({filteredAvailableQuizzes.filter(q => !q.is_already_linked).length} available)
                </span>
              </div>
              {selectedQuizzes.length > 0 && (
                <Button 
                  onClick={handleLinkQuizzes}
                  disabled={linking}
                  className="flex items-center gap-2"
                >
                  {linking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link className="h-4 w-4" />
                  )}
                  Link Selected ({selectedQuizzes.length})
                </Button>
              )}
            </div>
          )}

          {/* Available Quizzes List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredAvailableQuizzes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="font-medium mb-2">No quizzes found</h4>
                <p className="text-muted-foreground">
                  {searchTerm || difficultyFilter !== 'all' 
                    ? 'No quizzes match your search criteria.'
                    : 'No standalone quizzes are available to link.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAvailableQuizzes.map((quiz) => (
                <QuizCard
                  key={quiz.quiz_id}
                  quiz={quiz}
                  isSelected={selectedQuizzes.includes(quiz.quiz_id)}
                  onSelect={(selected) => handleQuizSelect(quiz.quiz_id, selected)}
                  isAlreadyLinked={quiz.is_already_linked}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'linked' && (
        <div className="space-y-4">
          {linkedQuizzes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Link className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="font-medium mb-2">No linked quizzes</h4>
                <p className="text-muted-foreground">
                  No standalone quizzes are currently linked to this course.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {linkedQuizzes.map((quiz) => (
                <LinkedQuizCard
                  key={quiz.quiz_id}
                  quiz={quiz}
                  onUnlink={() => handleUnlinkQuiz(quiz.quiz_id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Quiz Card Component for Available Quizzes
interface QuizCardProps {
  quiz: AvailableQuizForCourse;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  isAlreadyLinked: boolean;
}

const QuizCard: React.FC<QuizCardProps> = ({
  quiz,
  isSelected,
  onSelect,
  isAlreadyLinked
}) => {
  return (
    <Card className={`${isAlreadyLinked ? 'opacity-50' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {!isAlreadyLinked && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              className="mt-1"
            />
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium">{quiz.quiz_title}</h4>
                {quiz.quiz_description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {quiz.quiz_description}
                  </p>
                )}
              </div>
              {isAlreadyLinked && (
                <Badge variant="secondary">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Linked
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3 mt-3">
              {getDifficultyBadge(quiz.difficulty_level)}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-3 w-3" />
                {quiz.total_questions} questions
              </div>
              {quiz.estimated_duration_minutes && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {quiz.estimated_duration_minutes} min
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                by {quiz.author_name}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Linked Quiz Card Component
interface LinkedQuizCardProps {
  quiz: CourseLinkedQuiz;
  onUnlink: () => void;
}

const LinkedQuizCard: React.FC<LinkedQuizCardProps> = ({ quiz, onUnlink }) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium">{quiz.quiz_title}</h4>
              <Badge variant="outline">
                {quiz.link_type}
              </Badge>
              {quiz.is_required && (
                <Badge variant="secondary">
                  Required
                </Badge>
              )}
            </div>
            
            {quiz.quiz_description && (
              <p className="text-sm text-muted-foreground mb-3">
                {quiz.quiz_description}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {quiz.total_questions} questions
              </div>
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {quiz.quiz_status}
              </div>
              <div>by {quiz.author_name}</div>
              {quiz.due_date && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Due: {new Date(quiz.due_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onUnlink}
            className="flex items-center gap-2"
          >
            <Unlink className="h-4 w-4" />
            Unlink
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
