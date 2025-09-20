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
  Copy,
  Shield,
  Sparkles
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';

// Mock data for stages
const mockStages = [
  {
    id: 0,
    title: 'Stage 0 – Beginner English for Urdu Speakers',
    description: 'Introduction to basic English concepts for Urdu speakers',
    imageUrl: '/stage0.png',
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
    imageUrl: '/stage1.png',
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
    imageUrl: '/stage2.png',
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
    imageUrl: '/stage3.png',
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
    imageUrl: '/stage4.png',
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
    imageUrl: '/stage5.png',
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
    imageUrl: '/stage6.png',
    isLocked: false,
    isAITutor: true,
    isActive: false,
    lessons: 12,
    difficulty: 'Proficiency'
  },
];

const StageConfigurationCard = ({ stage }) => {
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
      'Elementary': 'bg-[#1582B4]/20 text-[#1582B4]',
      'Intermediate': 'bg-yellow-100 text-yellow-700',
      'Upper Intermediate': 'bg-orange-100 text-orange-700',
      'Advanced': 'bg-red-100 text-red-700',
      'Proficiency': 'bg-purple-100 text-purple-700'
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Card className="overflow-hidden transition-transform duration-300 hover:scale-105 hover:shadow-xl flex flex-col h-full">
      <div className="relative">
        <img src={stage.imageUrl} alt={stage.title} className="w-full h-32 object-cover" />
        <div className="absolute top-2 left-2 flex gap-2">
          {stage.isAITutor && (
            <Badge className="bg-gradient-to-r from-primary to-primary/90 text-white border-0 shadow-lg">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Tutor
            </Badge>
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
                Configure Stage
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate Stage
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Stage
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex-1">
          <div className="mb-2">
            <h3 className="text-lg font-semibold mb-1 leading-tight line-clamp-2">{stage.title}</h3>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{stage.description}</p>
          </div>

          <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
            <span>{stage.lessons} lessons</span>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${stage.isActive ? 'bg-primary' : 'bg-gray-400'}`}></div>
              <span>{stage.isActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-auto">
          <Button 
            className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold shadow-sm hover:shadow-md transition-all duration-300" 
            onClick={handleViewStage}
            size="sm"
          >
            <Eye className="mr-2 h-4 w-4" />
            View Stage
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800" 
            size="sm"
            onClick={() => setIsEditOpen(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
        </div>
      </CardContent>

      {/* Configuration Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Stage</DialogTitle>
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select
                value={editForm.difficulty}
                onValueChange={(value) => setEditForm({...editForm, difficulty: value})}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select difficulty level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Elementary">Elementary</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Upper Intermediate">Upper Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                  <SelectItem value="Proficiency">Proficiency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Stage Active</Label>
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

export const AIAdminPractice = () => {
  const { profile } = useAuth();
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <PlayCircle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ lineHeight: '3rem' }}>
                  Practice Management
                </h1>
                <p className="text-lg text-muted-foreground font-light">
                  Configure and manage learning stages
                </p>
              </div>
            </div>
            
            {/* Action Controls */}
            <div className="flex items-center gap-3">
              <Button className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
                <Plus className="mr-2 h-4 w-4" />
                Add New Stage
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Practice Stages Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mockStages.map((stage) => (
          <StageConfigurationCard key={stage.id} stage={stage} />
        ))}
      </div>
    </div>
  );
}; 