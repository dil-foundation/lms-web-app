import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { MessageSquare } from 'lucide-react';

const roles = [
  { value: 'student', label: 'Students' },
  { value: 'teacher', label: 'Teachers' },
  { value: 'admin', label: 'Admins', disabled: true },
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
  }, [editingDiscussion]);

  const handleSave = () => {
    onSave(discussionData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            {editingDiscussion ? 'Edit Discussion' : 'Start a New Discussion'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
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
            <Textarea id="content" value={discussionData.content} onChange={(e) => setDiscussionData(prev => ({...prev, content: e.target.value}))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="participants">Participants</Label>
            <MultiSelect
              options={roles}
              value={discussionData.participants}
              onValueChange={(selected) => setDiscussionData(prev => ({...prev, participants: selected}))}
              className="w-full"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : (editingDiscussion ? 'Save Changes' : 'Create Discussion')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 