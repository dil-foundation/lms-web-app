import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, Users, GraduationCap, UserCheck } from 'lucide-react';

const roles = [
  { value: 'student', label: 'Students', icon: GraduationCap, description: 'All students can participate' },
  { value: 'teacher', label: 'Teachers', icon: Users, description: 'All teachers can participate' },
  { value: 'admin', label: 'Admins', icon: UserCheck, description: 'All administrators can participate' },
];

export const DiscussionDialog = ({ isOpen, onOpenChange, editingDiscussion, onSave, isSaving, courses, isLoadingCourses }: any) => {
  const [discussionData, setDiscussionData] = useState({
    type: 'regular',
    title: '',
    course: 'general',
    content: '',
    participants: ['admin'],
  });

  useEffect(() => {
    if (editingDiscussion) {
      setDiscussionData({
        type: editingDiscussion.discussion_type || 'regular',
        title: editingDiscussion.title || '',
        course: editingDiscussion.course_id || 'general',
        content: editingDiscussion.content || '',
        participants: editingDiscussion.participants || ['admin'],
      });
    } else {
      setDiscussionData({
        type: 'regular',
        title: '',
        course: 'general',
        content: '',
        participants: ['admin'],
      });
    }
  }, [editingDiscussion, isOpen]); // Add isOpen dependency to reset when dialog opens

  const handleSave = () => {
    onSave(discussionData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[95vw] sm:max-w-[425px] max-h-[85vh] flex flex-col p-0 border-0 shadow-2xl rounded-xl overflow-hidden"
      >
        <DialogHeader className="flex-shrink-0 p-4 pb-3 border-b border-border/20 bg-background rounded-t-xl">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            {editingDiscussion ? 'Edit Discussion' : 'Start a New Discussion'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 px-4 py-3 min-h-0 bg-background">
          {/* Form fields */}
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select 
              value={discussionData.type} 
              onValueChange={(value) => setDiscussionData(prev => ({...prev, type: value}))}
            >
              <SelectTrigger id="type"><SelectValue placeholder="Select a type" /></SelectTrigger>
              <SelectContent>
                <SelectItem key="regular" value="regular">Regular Post</SelectItem>
                <SelectItem key="announcement" value="announcement">Announcement</SelectItem>
                <SelectItem key="question" value="question">Question</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={discussionData.title} onChange={(e) => setDiscussionData(prev => ({...prev, title: e.target.value}))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="course">Course</Label>
            <Select 
              value={discussionData.course} 
              onValueChange={(value) => setDiscussionData(prev => ({...prev, course: value}))}
            >
              <SelectTrigger id="course"><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>
                <SelectItem key="general" value="general">General Discussion</SelectItem>
                {isLoadingCourses ? <SelectItem key="loading" value="loading" disabled>Loading...</SelectItem> : courses.filter(c => c && c.id).map((course: any) => (
                  <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea 
              id="content" 
              value={discussionData.content} 
              onChange={(e) => setDiscussionData(prev => ({...prev, content: e.target.value}))}
              className="min-h-[60px] max-h-[100px] resize-none"
              placeholder="Enter your discussion content..."
            />
          </div>
          <div className="space-y-2">
            <Label>Participants</Label>
            <div className="space-y-1.5 border border-border/30 rounded-lg p-2.5 bg-muted/30">
              {roles.map((role) => {
                const Icon = role.icon;
                const isChecked = discussionData.participants.includes(role.value);
                
                return (
                  <div key={role.value} className="flex items-center space-x-2.5">
                    <Checkbox
                      id={`participant-${role.value}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setDiscussionData(prev => ({
                            ...prev,
                            participants: [...prev.participants, role.value]
                          }));
                        } else {
                          setDiscussionData(prev => ({
                            ...prev,
                            participants: prev.participants.filter(p => p !== role.value)
                          }));
                        }
                      }}
                      className="shrink-0"
                    />
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`participant-${role.value}`}
                        className="text-sm font-medium leading-tight cursor-pointer block"
                      >
                        {role.label}
                      </label>
                      <p className="text-xs text-muted-foreground leading-tight">
                        {role.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 flex justify-end space-x-2 p-4 border-t border-border/20 bg-background rounded-b-xl">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100 transition-colors"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : (editingDiscussion ? 'Save Changes' : 'Create Discussion')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 