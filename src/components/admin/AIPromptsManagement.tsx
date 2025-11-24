import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Bot, Edit, Eye, Plus, Save, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/supabase';

interface AIPrompt {
  id: string;
  name: string;
  role: 'system' | 'user' | 'assistant' | 'query_analysis';
  content: string;
  description?: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  usage_count: number;
  last_used_at?: string;
  tags: string[];
}

const AIPromptsManagement: React.FC = () => {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPrompt, setEditingPrompt] = useState<AIPrompt | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state for creating/editing prompts
  const [formData, setFormData] = useState({
    name: '',
    role: 'system' as const,
    content: '',
    description: '',
    is_active: true,
    tags: ''
  });

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_all_ai_prompts');
      
      if (error) {
        throw error;
      }
      
      setPrompts(data || []);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch AI prompts. Please check your permissions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrompt = async () => {
    try {
      if (!formData.name.trim() || !formData.content.trim()) {
        toast({
          title: "Validation Error",
          description: "Name and content are required fields.",
          variant: "destructive",
        });
        return;
      }

      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const { data, error } = await supabase.rpc('upsert_ai_prompt', {
        p_name: formData.name.trim(),
        p_role: formData.role,
        p_content: formData.content.trim(),
        p_description: formData.description.trim() || null,
        p_tags: tagsArray,
        p_is_active: formData.is_active
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `Prompt "${formData.name}" ${editingPrompt ? 'updated' : 'created'} successfully!`,
      });

      // Reset form and close dialog
      setFormData({
        name: '',
        role: 'system',
        content: '',
        description: '',
        is_active: true,
        tags: ''
      });
      setEditingPrompt(null);
      setIsDialogOpen(false);
      
      // Refresh prompts list
      fetchPrompts();
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({
        title: "Error",
        description: "Failed to save prompt. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditPrompt = (prompt: AIPrompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      role: prompt.role,
      content: prompt.content,
      description: prompt.description || '',
      is_active: prompt.is_active,
      tags: prompt.tags.join(', ')
    });
    setIsDialogOpen(true);
  };

  const handleNewPrompt = () => {
    setEditingPrompt(null);
    setFormData({
      name: '',
      role: 'system',
      content: '',
      description: '',
      is_active: true,
      tags: ''
    });
    setIsDialogOpen(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'system': return 'bg-blue-100 text-blue-800';
      case 'query_analysis': return 'bg-green-100 text-green-800';
      case 'user': return 'bg-yellow-100 text-yellow-800';
      case 'assistant': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Bot className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p>Loading AI prompts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">AI Prompts Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground break-words">
            Manage dynamic AI prompts for the AI Assistant - No more hardcoded patterns!
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewPrompt} className="w-full sm:w-auto flex-shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">New Prompt</span>
              <span className="sm:hidden">New</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPrompt ? 'Edit AI Prompt' : 'Create New AI Prompt'}
              </DialogTitle>
              <DialogDescription>
                {editingPrompt 
                  ? 'Update the AI prompt configuration. Changes will be versioned.'
                  : 'Create a new AI prompt for dynamic system behavior.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Prompt Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., iris_system_prompt"
                    disabled={!!editingPrompt} // Don't allow name changes for existing prompts
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role *</Label>
                  <Select value={formData.role} onValueChange={(value: any) => setFormData({...formData, role: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="query_analysis">Query Analysis</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="assistant">Assistant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of this prompt's purpose"
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  placeholder="e.g., system, main, iris, analytics"
                />
              </div>

              <div>
                <Label htmlFor="content">Prompt Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="Enter the full prompt content here..."
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <Label htmlFor="is_active">Active (will be used by the system)</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSavePrompt}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingPrompt ? 'Update Prompt' : 'Create Prompt'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Bot className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">ChatGPT's Approach Implementation</h3>
              <p className="text-blue-700 text-sm">
                This system implements ChatGPT's suggestion for dynamic AI prompt management. 
                Prompts are stored in the database and can be updated without code deployment. 
                The AI Assistant now uses true AI intelligence instead of hardcoded pattern matching.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prompts List */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Prompts ({prompts.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({prompts.filter(p => p.is_active).length})</TabsTrigger>
          <TabsTrigger value="system">System ({prompts.filter(p => p.role === 'system').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {prompts.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No AI Prompts Found</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first AI prompt to enable dynamic system behavior.
                </p>
                <Button onClick={handleNewPrompt}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Prompt
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {prompts.map((prompt) => (
                <Card key={prompt.id} className={!prompt.is_active ? 'opacity-60' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <span>{prompt.name}</span>
                          <Badge className={getRoleColor(prompt.role)}>
                            {prompt.role}
                          </Badge>
                          {prompt.is_active && (
                            <Badge variant="secondary">Active v{prompt.version}</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{prompt.description}</CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditPrompt(prompt)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm font-mono text-gray-700 line-clamp-3">
                          {prompt.content}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex space-x-4">
                          <span>Used {prompt.usage_count} times</span>
                          {prompt.last_used_at && (
                            <span>Last used: {new Date(prompt.last_used_at).toLocaleDateString()}</span>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {prompt.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-4">
            {prompts.filter(p => p.is_active).map((prompt) => (
              <Card key={prompt.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{prompt.name}</span>
                        <Badge className={getRoleColor(prompt.role)}>
                          {prompt.role}
                        </Badge>
                        <Badge variant="secondary">v{prompt.version}</Badge>
                      </CardTitle>
                      <CardDescription>{prompt.description}</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleEditPrompt(prompt)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm font-mono text-gray-700 line-clamp-2">
                      {prompt.content}
                    </p>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Used {prompt.usage_count} times
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4">
            {prompts.filter(p => p.role === 'system').map((prompt) => (
              <Card key={prompt.id} className={!prompt.is_active ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{prompt.name}</span>
                        {prompt.is_active && (
                          <Badge variant="secondary">Active v{prompt.version}</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{prompt.description}</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleEditPrompt(prompt)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-3 rounded-md max-h-32 overflow-y-auto">
                    <p className="text-sm font-mono text-gray-700 whitespace-pre-wrap">
                      {prompt.content}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIPromptsManagement;
