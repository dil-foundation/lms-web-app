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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
      'Elementary': 'bg-[#1582B4]/20 text-[#1582B4]',
      'Intermediate': 'bg-yellow-100 text-yellow-700',
      'Upper Intermediate': 'bg-orange-100 text-orange-700',
      'Advanced': 'bg-red-100 text-red-700',
      'Proficiency': 'bg-purple-100 text-purple-700'
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Card className="group overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl border-0 bg-gradient-to-br from-card to-card/50 dark:bg-card rounded-2xl h-full flex flex-col">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <img src={stage.imageUrl} alt={stage.title} className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute top-3 left-3 flex gap-2">
          {stage.isAITutor && (
            <Badge className="bg-gradient-to-r from-primary to-primary/90 text-white border-0 shadow-lg">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Tutor
            </Badge>
          )}
          <Badge className={`${getDifficultyColor(stage.difficulty)} border-0 shadow-sm`}>
            {stage.difficulty}
          </Badge>
        </div>
        <div className="absolute top-3 right-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm border border-white/20">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-0 shadow-xl">
              <DropdownMenuItem onClick={() => setIsEditOpen(true)} className="rounded-lg">
                <Edit3 className="mr-2 h-4 w-4" />
                Customize for Class
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg">
                <Copy className="mr-2 h-4 w-4" />
                Create Assignment
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-lg">
                <Settings className="mr-2 h-4 w-4" />
                Teaching Resources
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="absolute bottom-3 right-3">
          <div className="flex items-center gap-1 text-white/90 text-xs font-medium">
            <BookOpen className="w-3 h-3" />
            {stage.lessons} lessons
          </div>
        </div>
      </div>
      
      <CardContent className="p-6 flex-1 flex flex-col">
        <div className="space-y-4 flex-1 flex flex-col">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 leading-tight">
              {stage.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {stage.description}
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Status</span>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${stage.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="font-medium">{stage.isActive ? 'Available' : 'Coming Soon'}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-auto pt-2 space-y-3">
            <Button 
              className="w-full h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 border-0" 
              onClick={handleViewStage}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview Stage
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-11 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 hover:bg-primary/5 hover:border-primary/50 hover:text-primary border-2 rounded-xl" 
              onClick={() => setIsEditOpen(true)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Customize
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Customization Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md rounded-2xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Customize Stage for Your Class</DialogTitle>
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
              <Label htmlFor="active">Assign to Students</Label>
              <Switch
                id="active"
                checked={editForm.isActive}
                onCheckedChange={(checked) => setEditForm({...editForm, isActive: checked})}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                className="flex-1 h-11 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 hover:bg-primary/5 hover:border-primary/30 hover:text-primary border-2 rounded-xl" 
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button className="flex-1 h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 border-0 rounded-xl" onClick={() => setIsEditOpen(false)}>
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
    <div className="space-y-8">
              {/* Premium Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/3 to-[#1582B4]/5 rounded-3xl"></div>
          <div className="relative p-8 md:p-10 rounded-3xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
                  <PlayCircle className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary leading-[1.2]">
                    Practice Activities
                  </h1>
                  <p className="text-lg text-muted-foreground font-light mt-4 leading-relaxed">
                    Preview and customize practice stages for your students
                  </p>
                </div>
              </div>
              
              {/* Action Controls */}
              <div className="flex items-center gap-3">
                <Button className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 border-0">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Assignment
                </Button>
              </div>
            </div>
          </div>
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