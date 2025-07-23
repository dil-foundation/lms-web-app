import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, 
  PlayCircle, 
  Settings, 
  Eye, 
  BookOpen,
  Edit3,
  MoreVertical,
  Plus,
  Trash2,
  Copy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

// Mock data for stages
const mockStages = [
  {
    id: 0,
    title: 'Stage 0 – Beginner English for Urdu Speakers',
    description: 'Introduction to basic English concepts for Urdu speakers',
    imageUrl: '/placeholder.svg',
    isLocked: false,
    isAITutor: true,
    isActive: true,
    lessons: 5,
    difficulty: 'Beginner'
  },
  {
    id: 1,
    title: 'Stage 1 – Building Confidence',
    description: 'Build confidence through basic conversational skills',
    imageUrl: '/placeholder.svg',
    isLocked: false,
    isAITutor: true,
    isActive: true,
    lessons: 7,
    difficulty: 'Beginner'
  },
  {
    id: 2,
    title: 'Stage 2 – Elementary English',
    description: 'Elementary level grammar and vocabulary building',
    imageUrl: '/placeholder.svg',
    isLocked: false,
    isAITutor: true,
    isActive: true,
    lessons: 8,
    difficulty: 'Elementary'
  },
  {
    id: 3,
    title: 'Stage 3 – Intermediate English',
    description: 'Intermediate level communication and comprehension',
    imageUrl: '/placeholder.svg',
    isLocked: false,
    isAITutor: true,
    isActive: true,
    lessons: 6,
    difficulty: 'Intermediate'
  },
  {
    id: 4,
    title: 'Stage 4 – Upper Intermediate',
    description: 'Advanced grammar structures and complex conversations',
    imageUrl: '/placeholder.svg',
    isLocked: false,
    isAITutor: true,
    isActive: true,
    lessons: 9,
    difficulty: 'Upper Intermediate'
  },
  {
    id: 5,
    title: 'Stage 5 – C1 Advanced',
    description: 'C1 level fluency and advanced language skills',
    imageUrl: '/placeholder.svg',
    isLocked: false,
    isAITutor: true,
    isActive: true,
    lessons: 10,
    difficulty: 'Advanced'
  },
  {
    id: 6,
    title: 'Stage 6 – C2 Proficiency',
    description: 'C2 level mastery and near-native proficiency',
    imageUrl: '/placeholder.svg',
    isLocked: false,
    isAITutor: true,
    isActive: false,
    lessons: 12,
    difficulty: 'Proficiency'
  },
];

const TeacherStageCard = ({ stage }) => {
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: stage.title,
    description: stage.description,
    isActive: stage.isActive,
    difficulty: stage.difficulty
  });

  const handleViewStage = () => {
    if (stage.id === 0) {
      navigate('/dashboard/practice/stage-0');
    } else if (stage.id === 1) {
      navigate('/dashboard/practice/stage-1');
    } else if (stage.id === 2) {
      navigate('/dashboard/practice/stage-2');
    } else if (stage.id === 3) {
      navigate('/dashboard/practice/stage-3');
    } else if (stage.id === 4) {
      navigate('/dashboard/practice/stage-4');
    } else if (stage.id === 5) {
      navigate('/dashboard/practice/stage-5');
    } else if (stage.id === 6) {
      navigate('/dashboard/practice/stage-6');
    }
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      'Beginner': 'bg-green-100 text-green-700',
      'Elementary': 'bg-blue-100 text-blue-700',
      'Intermediate': 'bg-yellow-100 text-yellow-700',
      'Upper Intermediate': 'bg-orange-100 text-orange-700',
      'Advanced': 'bg-red-100 text-red-700',
      'Proficiency': 'bg-purple-100 text-purple-700'
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Card className="overflow-hidden transition-transform duration-300 hover:scale-105 hover:shadow-xl">
      <div className="relative">
        <img src={stage.imageUrl} alt={stage.title} className="w-full h-32 object-cover" />
        <div className="absolute top-2 left-2 flex gap-2">
          {stage.isAITutor && (
            <Badge className="bg-green-500 text-white">AI Tutor</Badge>
          )}
          <Badge className={getDifficultyColor(stage.difficulty)}>
            {stage.difficulty}
          </Badge>
        </div>
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-white/80">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Customize for Class
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="mr-2 h-4 w-4" />
                Create Assignment
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Teaching Resources
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="mb-2">
          <h3 className="text-lg font-semibold mb-1 leading-tight">{stage.title}</h3>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{stage.description}</p>
        </div>

        <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
          <span>{stage.lessons} lessons</span>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${stage.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span>{stage.isActive ? 'Available' : 'Coming Soon'}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Button 
            className="w-full bg-green-500 hover:bg-green-600" 
            onClick={handleViewStage}
            size="sm"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview Stage
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            size="sm"
            onClick={() => setIsEditOpen(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Customize
          </Button>
        </div>
      </CardContent>

      {/* Customization Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customize Stage for Your Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Stage Title</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm({...editForm, title: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Class Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                rows={3}
                placeholder="Customize this description for your students..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <select
                id="difficulty"
                className="w-full p-2 border border-input rounded-md"
                value={editForm.difficulty}
                onChange={(e) => setEditForm({...editForm, difficulty: e.target.value})}
              >
                <option value="Beginner">Beginner</option>
                <option value="Elementary">Elementary</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Upper Intermediate">Upper Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Proficiency">Proficiency</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Assign to Students</Label>
              <Switch
                id="active"
                checked={editForm.isActive}
                onCheckedChange={(checked) => setEditForm({...editForm, isActive: checked})}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={() => setIsEditOpen(false)}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export const AITeacherPractice: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Practice Activities</h1>
          <p className="text-muted-foreground">Preview and customize practice stages for your students</p>
        </div>
        <Button className="bg-green-500 hover:bg-green-600">
          <Plus className="mr-2 h-4 w-4" />
          Create Assignment
        </Button>
      </div>

      {/* Practice Stages Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mockStages.map((stage) => (
          <TeacherStageCard key={stage.id} stage={stage} />
        ))}
      </div>
    </div>
  );
}; 