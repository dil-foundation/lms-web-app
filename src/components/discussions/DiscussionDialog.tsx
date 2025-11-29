import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { MessageSquare, Users, GraduationCap, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const roles = [
  { value: 'student', label: 'Students', icon: GraduationCap, description: 'All students can participate' },
  { value: 'teacher', label: 'Teachers', icon: Users, description: 'All teachers can participate' },
  { value: 'admin', label: 'Admins', icon: UserCheck, description: 'All administrators can participate' },
];

// Fetch users by role
const fetchUsersByRole = async (role: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, avatar_url, role')
    .eq('role', role)
    .order('first_name');

  if (error) throw error;

  return data.map(user => ({
    id: user.id,
    name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown User',
    email: user.email || '',
    avatar_url: user.avatar_url || undefined,
    role: user.role
  }));
};

export const DiscussionDialog = ({ isOpen, onOpenChange, editingDiscussion, onSave, isSaving, courses, isLoadingCourses }: any) => {
  const [discussionData, setDiscussionData] = useState({
    type: 'regular',
    title: '',
    course: 'general',
    content: '',
    participants: ['admin'],
    specificParticipants: {
      student: [] as string[],
      teacher: [] as string[],
      admin: [] as string[]
    }
  });

  // Fetch users for each selected role
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['students-for-discussion'],
    queryFn: () => fetchUsersByRole('student'),
    enabled: discussionData.participants.includes('student')
  });

  const { data: teachers = [], isLoading: loadingTeachers } = useQuery({
    queryKey: ['teachers-for-discussion'],
    queryFn: () => fetchUsersByRole('teacher'),
    enabled: discussionData.participants.includes('teacher')
  });

  const { data: admins = [], isLoading: loadingAdmins } = useQuery({
    queryKey: ['admins-for-discussion'],
    queryFn: () => fetchUsersByRole('admin'),
    enabled: discussionData.participants.includes('admin')
  });

  useEffect(() => {
    console.log('[DEBUG] DiscussionDialog useEffect - Triggered');
    console.log('[DEBUG] DiscussionDialog useEffect - editingDiscussion:', editingDiscussion);
    console.log('[DEBUG] DiscussionDialog useEffect - isOpen:', isOpen);

    if (editingDiscussion) {
      console.log('[DEBUG] DiscussionDialog useEffect - Editing mode');
      console.log('[DEBUG] DiscussionDialog useEffect - editingDiscussion.participants:', editingDiscussion.participants);
      console.log('[DEBUG] DiscussionDialog useEffect - editingDiscussion.specificParticipants:', editingDiscussion.specificParticipants);

      const newData = {
        type: editingDiscussion.discussion_type || 'regular',
        title: editingDiscussion.title || '',
        course: editingDiscussion.course_id || 'general',
        content: editingDiscussion.content || '',
        participants: editingDiscussion.participants || ['admin'],
        specificParticipants: editingDiscussion.specificParticipants || {
          student: [],
          teacher: [],
          admin: []
        }
      };

      console.log('[DEBUG] DiscussionDialog useEffect - Setting discussionData to:', newData);
      setDiscussionData(newData);
    } else {
      console.log('[DEBUG] DiscussionDialog useEffect - New discussion mode (creating fresh state)');
      setDiscussionData({
        type: 'regular',
        title: '',
        course: 'general',
        content: '',
        participants: ['admin'],
        specificParticipants: {
          student: [],
          teacher: [],
          admin: []
        }
      });
    }
  }, [editingDiscussion, isOpen]);

  const handleSpecificParticipantsChange = (role: 'student' | 'teacher' | 'admin', selectedIds: string[]) => {
    setDiscussionData(prev => ({
      ...prev,
      specificParticipants: {
        ...prev.specificParticipants,
        [role]: selectedIds
      }
    }));
  };

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
                const isAdmin = role.value === 'admin';

                return (
                  <div key={role.value} className="flex items-center space-x-2.5">
                    <Checkbox
                      id={`participant-${role.value}`}
                      checked={isChecked}
                      disabled={isAdmin}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setDiscussionData(prev => ({
                            ...prev,
                            participants: [...prev.participants, role.value]
                          }));
                        } else {
                          setDiscussionData(prev => ({
                            ...prev,
                            participants: prev.participants.filter(p => p !== role.value),
                            specificParticipants: {
                              ...prev.specificParticipants,
                              [role.value]: [] // Clear specific selections when unchecking role
                            }
                          }));
                        }
                      }}
                      className="shrink-0"
                    />
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`participant-${role.value}`}
                        className={`text-sm font-medium leading-tight block ${isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
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

          {/* Specific Participants Selection */}
          {discussionData.participants.includes('student') && (
            <div className="space-y-2">
              <Label>Select Specific Students (Optional)</Label>
              <MultiSelect
                options={students.map(student => ({
                  value: student.id,
                  label: student.name,
                  subLabel: student.email,
                  imageUrl: student.avatar_url
                }))}
                onValueChange={(selectedIds) => handleSpecificParticipantsChange('student', selectedIds)}
                value={discussionData.specificParticipants.student}
                placeholder={loadingStudents ? "Loading students..." : "Search and select students..."}
                className="min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to include all students, or select specific students to participate
              </p>
            </div>
          )}

          {discussionData.participants.includes('teacher') && (
            <div className="space-y-2">
              <Label>Select Specific Teachers (Optional)</Label>
              <MultiSelect
                options={teachers.map(teacher => ({
                  value: teacher.id,
                  label: teacher.name,
                  subLabel: teacher.email,
                  imageUrl: teacher.avatar_url
                }))}
                onValueChange={(selectedIds) => handleSpecificParticipantsChange('teacher', selectedIds)}
                value={discussionData.specificParticipants.teacher}
                placeholder={loadingTeachers ? "Loading teachers..." : "Search and select teachers..."}
                className="min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to include all teachers, or select specific teachers to participate
              </p>
            </div>
          )}

          {discussionData.participants.includes('admin') && (
            <div className="space-y-2">
              <Label>Select Specific Admins (Optional)</Label>
              <MultiSelect
                options={admins.map(admin => ({
                  value: admin.id,
                  label: admin.name,
                  subLabel: admin.email,
                  imageUrl: admin.avatar_url
                }))}
                onValueChange={(selectedIds) => handleSpecificParticipantsChange('admin', selectedIds)}
                value={discussionData.specificParticipants.admin}
                placeholder={loadingAdmins ? "Loading admins..." : "Search and select admins..."}
                className="min-h-[44px] border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to include all admins, or select specific admins to participate
              </p>
            </div>
          )}
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