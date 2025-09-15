import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Bot,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  MessageSquare,
  HelpCircle,
  Phone,
  Mail,
  Eye,
  Save,
  X,
  Sparkles,
  Clock,
  Loader2
} from 'lucide-react';
import { 
  APEXAdminService, 
  ValidationError,
  type FAQItem, 
  type KnowledgeBaseItem, 
  type ContactInfo,
  type CreateFAQRequest,
  type CreateKnowledgeBaseRequest,
  type CreateContactInfoRequest
} from '@/services/apexAdminService';
import { toast } from 'sonner';

export const APEXAdmin = () => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: 'faq' | 'knowledge' | 'contact' | null;
    mode: 'create' | 'edit';
  }>({
    isOpen: false,
    type: null,
    mode: 'create'
  });
  const [editingItem, setEditingItem] = useState<FAQItem | KnowledgeBaseItem | ContactInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('faqs');

  // Data state
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseItem[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState({
    totalFAQs: 0,
    totalKnowledgeBase: 0,
    totalContacts: 0,
    faqCategories: 0
  });

  // Form states
  const [newFAQ, setNewFAQ] = useState<CreateFAQRequest>({
    question: '',
    answer: '',
    category: 'Getting Started',
    tags: [],
    priority: 'medium'
  });

  const [newKnowledgeBase, setNewKnowledgeBase] = useState<CreateKnowledgeBaseRequest>({
    title: '',
    content: '',
    category: 'Getting Started',
    tags: [],
    related_faq_ids: []
  });

  const [newContact, setNewContact] = useState<CreateContactInfoRequest>({
    department: '',
    email: '',
    phone: '',
    availability: '',
    description: '',
    priority: 'medium'
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [faqsData, kbData, contactsData, categoriesData, analyticsData] = await Promise.all([
        APEXAdminService.getFAQs(true), // Include inactive for admin view
        APEXAdminService.getKnowledgeBase(true),
        APEXAdminService.getContactInfo(true),
        APEXAdminService.getFAQCategories(),
        APEXAdminService.getAnalytics()
      ]);

      setFaqs(faqsData);
      setKnowledgeBase(kbData);
      setContactInfo(contactsData);
      setCategories(categoriesData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // FAQ Operations
  const handleAddFAQ = async () => {
    if (!newFAQ.question || !newFAQ.answer) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      if (dialogState.mode === 'edit' && editingItem) {
        await APEXAdminService.updateFAQ(editingItem.id, newFAQ);
        toast.success('FAQ updated successfully!');
      } else {
        await APEXAdminService.createFAQ(newFAQ);
        toast.success('FAQ added successfully!');
      }
      
      await loadData(); // Refresh data
      resetFAQForm();
      setDialogState({
        isOpen: false,
        type: null,
        mode: 'create'
      });
    } catch (error) {
      console.error('Error saving FAQ:', error);
      if (error instanceof ValidationError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to save FAQ. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditFAQ = (item: FAQItem) => {
    setEditingItem(item);
    setNewFAQ({
      question: item.question,
      answer: item.answer,
      category: item.category,
      tags: item.tags,
      priority: item.priority
    });
    setDialogState({
      isOpen: true,
      type: 'faq',
      mode: 'edit'
    });
  };

  const handleDeleteFAQ = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await APEXAdminService.deleteFAQ(id);
      toast.success('FAQ deleted successfully!');
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      toast.error('Failed to delete FAQ. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetFAQForm = () => {
    setNewFAQ({
      question: '',
      answer: '',
      category: 'Getting Started',
      tags: [],
      priority: 'medium'
    });
    setEditingItem(null);
  };

  // Knowledge Base Operations
  const handleAddKnowledgeBase = async () => {
    if (!newKnowledgeBase.title || !newKnowledgeBase.content) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      if (dialogState.mode === 'edit' && editingItem) {
        await APEXAdminService.updateKnowledgeBase(editingItem.id, newKnowledgeBase);
        toast.success('Knowledge base article updated successfully!');
      } else {
        await APEXAdminService.createKnowledgeBase(newKnowledgeBase);
        toast.success('Knowledge base article added successfully!');
      }
      
      await loadData(); // Refresh data
      resetKnowledgeBaseForm();
      setDialogState({
        isOpen: false,
        type: null,
        mode: 'create'
      });
    } catch (error) {
      console.error('Error saving knowledge base article:', error);
      if (error instanceof ValidationError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to save knowledge base article. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditKnowledgeBase = (item: KnowledgeBaseItem) => {
    setEditingItem(item);
    setNewKnowledgeBase({
      title: item.title,
      content: item.content,
      category: item.category,
      tags: item.tags,
      related_faq_ids: item.related_faq_ids
    });
    setDialogState({
      isOpen: true,
      type: 'knowledge',
      mode: 'edit'
    });
  };

  const handleDeleteKnowledgeBase = async (id: string) => {
    if (!confirm('Are you sure you want to delete this knowledge base article? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await APEXAdminService.deleteKnowledgeBase(id);
      toast.success('Knowledge base article deleted successfully!');
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error deleting knowledge base article:', error);
      toast.error('Failed to delete knowledge base article. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetKnowledgeBaseForm = () => {
    setNewKnowledgeBase({
      title: '',
      content: '',
      category: 'Getting Started',
      tags: [],
      related_faq_ids: []
    });
    setEditingItem(null);
  };

  // Contact Info Operations
  const handleAddContact = async () => {
    if (!newContact.department || !newContact.email || !newContact.availability || !newContact.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      if (dialogState.mode === 'edit' && editingItem) {
        await APEXAdminService.updateContactInfo(editingItem.id, newContact);
        toast.success('Contact information updated successfully!');
      } else {
        await APEXAdminService.createContactInfo(newContact);
        toast.success('Contact information added successfully!');
      }
      
      await loadData(); // Refresh data
      resetContactForm();
      setDialogState({
        isOpen: false,
        type: null,
        mode: 'create'
      });
    } catch (error) {
      console.error('Error saving contact information:', error);
      if (error instanceof ValidationError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to save contact information. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditContact = (item: ContactInfo) => {
    setEditingItem(item);
    setNewContact({
      department: item.department,
      email: item.email,
      phone: item.phone || '',
      availability: item.availability,
      description: item.description,
      priority: item.priority
    });
    setDialogState({
      isOpen: true,
      type: 'contact',
      mode: 'edit'
    });
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact information? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await APEXAdminService.deleteContactInfo(id);
      toast.success('Contact information deleted successfully!');
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error deleting contact information:', error);
      toast.error('Failed to delete contact information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetContactForm = () => {
    setNewContact({
      department: '',
      email: '',
      phone: '',
      availability: '',
      description: '',
      priority: 'medium'
    });
    setEditingItem(null);
  };

  // Utility functions
  const filteredFAQs = faqs.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  APEX (AI-Powered Educational eXperience)
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Configure and manage the intelligent AI assistant that helps visitors and users navigate the platform
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1 bg-primary/10 text-primary border-primary/20">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Powered
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                <Clock className="h-3 w-3 mr-1" />
                Always Available
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total FAQs</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : analytics.totalFAQs}
            </div>
            <p className="text-xs text-muted-foreground">Knowledge base items</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : analytics.faqCategories}
            </div>
            <p className="text-xs text-muted-foreground">FAQ categories</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contact Points</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : analytics.totalContacts}
            </div>
            <p className="text-xs text-muted-foreground">Support departments</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Knowledge Items</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : analytics.totalKnowledgeBase}
            </div>
            <p className="text-xs text-muted-foreground">Knowledge base articles</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="faqs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          <TabsTrigger value="contacts">Contact Info</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* FAQs Tab */}
        <TabsContent value="faqs" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search FAQs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => {
              setDialogState({
                isOpen: true,
                type: 'faq',
                mode: 'create'
              });
              resetFAQForm();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add FAQ
            </Button>

            <Dialog open={dialogState.isOpen && dialogState.type === 'faq'} onOpenChange={(open) => {
              setDialogState(prev => ({
                ...prev,
                isOpen: open
              }));
              if (!open) {
                resetFAQForm();
                setEditingItem(null);
                setDialogState({
                  isOpen: false,
                  type: null,
                  mode: 'create'
                });
              }
            }}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {dialogState.mode === 'edit' ? 'Edit FAQ' : 'Add New FAQ'}
                  </DialogTitle>
                  <DialogDescription>
                    {dialogState.mode === 'edit' ? 'Update the FAQ information below.' : 'Create a new FAQ item for the AI Assistant.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Question</label>
                    <Input
                      value={newFAQ.question}
                      onChange={(e) => setNewFAQ({ ...newFAQ, question: e.target.value })}
                      placeholder="Enter the question..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Answer</label>
                    <Textarea
                      value={newFAQ.answer}
                      onChange={(e) => setNewFAQ({ ...newFAQ, answer: e.target.value })}
                      placeholder="Enter the answer..."
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <Select value={newFAQ.category} onValueChange={(value) => setNewFAQ({ ...newFAQ, category: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Priority</label>
                      <Select value={newFAQ.priority} onValueChange={(value) => setNewFAQ({ ...newFAQ, priority: value as 'high' | 'medium' | 'low' })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tags (comma-separated)</label>
                    <Input
                      value={newFAQ.tags.join(', ')}
                      onChange={(e) => setNewFAQ({ ...newFAQ, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) })}
                      placeholder="e.g., login, password, account"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setDialogState({
                      isOpen: false,
                      type: null,
                      mode: 'create'
                    });
                    resetFAQForm();
                  }} disabled={loading}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddFAQ} disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {dialogState.mode === 'edit' ? 'Update FAQ' : 'Add FAQ'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>FAQ Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFAQs.map((faq) => (
                    <TableRow key={faq.id}>
                      <TableCell className="font-medium">{faq.question}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{faq.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={faq.priority === 'high' ? 'destructive' : faq.priority === 'medium' ? 'default' : 'secondary'}
                        >
                          {faq.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {faq.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditFAQ(faq)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteFAQ(faq.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledge" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Knowledge Base Management</h2>
            <Button onClick={() => {
              setDialogState({
                isOpen: true,
                type: 'knowledge',
                mode: 'create'
              });
              resetKnowledgeBaseForm();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Article
            </Button>

            <Dialog open={dialogState.isOpen && dialogState.type === 'knowledge'} onOpenChange={(open) => {
              setDialogState(prev => ({
                ...prev,
                isOpen: open
              }));
              if (!open) {
                resetKnowledgeBaseForm();
                setEditingItem(null);
                setDialogState({
                  isOpen: false,
                  type: null,
                  mode: 'create'
                });
              }
            }}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>
                    {dialogState.mode === 'edit' ? 'Edit Knowledge Base Article' : 'Add New Knowledge Base Article'}
                  </DialogTitle>
                  <DialogDescription>
                    {dialogState.mode === 'edit' ? 'Update the article information below.' : 'Create a new knowledge base article for the AI Assistant.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={newKnowledgeBase.title}
                      onChange={(e) => setNewKnowledgeBase({ ...newKnowledgeBase, title: e.target.value })}
                      placeholder="Enter the article title..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Content</label>
                    <Textarea
                      value={newKnowledgeBase.content}
                      onChange={(e) => setNewKnowledgeBase({ ...newKnowledgeBase, content: e.target.value })}
                      placeholder="Enter the article content..."
                      rows={6}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <Select value={newKnowledgeBase.category} onValueChange={(value) => setNewKnowledgeBase({ ...newKnowledgeBase, category: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Tags (comma-separated)</label>
                      <Input
                        value={newKnowledgeBase.tags.join(', ')}
                        onChange={(e) => setNewKnowledgeBase({ ...newKnowledgeBase, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) })}
                        placeholder="e.g., guide, tutorial, help"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setDialogState({
                      isOpen: false,
                      type: null,
                      mode: 'create'
                    });
                    resetKnowledgeBaseForm();
                  }} disabled={loading}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddKnowledgeBase} disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {dialogState.mode === 'edit' ? 'Update Article' : 'Add Article'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base Articles</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {knowledgeBase.map((item) => (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{item.title}</h3>
                            {!item.is_active && (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{item.category}</Badge>
                            {item.tags.map((tag, index) => (
                              <Badge key={index} variant="default" className="text-xs text-white bg-primary hover:bg-primary/90">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button variant="outline" size="sm" onClick={() => handleEditKnowledgeBase(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteKnowledgeBase(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {knowledgeBase.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No knowledge base articles found. Add your first article to get started.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Info Tab */}
        <TabsContent value="contacts" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Contact Information Management</h2>
            <Button onClick={() => {
              setDialogState({
                isOpen: true,
                type: 'contact',
                mode: 'create'
              });
              resetContactForm();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>

            <Dialog open={dialogState.isOpen && dialogState.type === 'contact'} onOpenChange={(open) => {
              setDialogState(prev => ({
                ...prev,
                isOpen: open
              }));
              if (!open) {
                resetContactForm();
                setEditingItem(null);
                setDialogState({
                  isOpen: false,
                  type: null,
                  mode: 'create'
                });
              }
            }}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {dialogState.mode === 'edit' ? 'Edit Contact Information' : 'Add New Contact Information'}
                  </DialogTitle>
                  <DialogDescription>
                    {dialogState.mode === 'edit' ? 'Update the contact information below.' : 'Create a new contact information entry for the AI Assistant.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Department</label>
                    <Input
                      value={newContact.department}
                      onChange={(e) => setNewContact({ ...newContact, department: e.target.value })}
                      placeholder="Enter the department name..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        value={newContact.email}
                        onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                        placeholder="Enter the email address..."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone (optional)</label>
                      <Input
                        value={newContact.phone}
                        onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                        placeholder="Enter the phone number..."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Availability</label>
                      <Input
                        value={newContact.availability}
                        onChange={(e) => setNewContact({ ...newContact, availability: e.target.value })}
                        placeholder="e.g., Monday-Friday, 9 AM - 5 PM"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Priority</label>
                      <Select value={newContact.priority} onValueChange={(value) => setNewContact({ ...newContact, priority: value as 'high' | 'medium' | 'low' })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={newContact.description}
                      onChange={(e) => setNewContact({ ...newContact, description: e.target.value })}
                      placeholder="Enter a description of what this department handles..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setDialogState({
                      isOpen: false,
                      type: null,
                      mode: 'create'
                    });
                    resetContactForm();
                  }} disabled={loading}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddContact} disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {dialogState.mode === 'edit' ? 'Update Contact' : 'Add Contact'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {contactInfo.map((contact) => (
                    <Card key={contact.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{contact.department}</h3>
                            <Badge 
                              variant={contact.priority === 'high' ? 'destructive' : contact.priority === 'medium' ? 'default' : 'secondary'}
                            >
                              {contact.priority}
                            </Badge>
                            {!contact.is_active && (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{contact.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {contact.email}
                            </div>
                            {contact.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                {contact.phone}
                              </div>
                            )}
                            <Badge variant="outline">{contact.availability}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button variant="outline" size="sm" onClick={() => handleEditContact(contact)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteContact(contact.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {contactInfo.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No contact information found. Add your first contact to get started.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>APEX Content Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total FAQs</span>
                      <span className="font-semibold">{analytics.totalFAQs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Knowledge Base Articles</span>
                      <span className="font-semibold">{analytics.totalKnowledgeBase}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contact Points</span>
                      <span className="font-semibold">{analytics.totalContacts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>FAQ Categories</span>
                      <span className="font-semibold">{analytics.faqCategories}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>High Priority FAQs</span>
                      <span className="font-semibold">{analytics.highPriorityFAQs || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>High Priority Contacts</span>
                      <span className="font-semibold">{analytics.highPriorityContacts || 0}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categories.map((category, index) => {
                      const categoryFAQs = faqs.filter(faq => faq.category === category);
                      return (
                        <div key={category} className="flex justify-between">
                          <span className="text-sm">{category}</span>
                          <Badge variant="outline">{categoryFAQs.length} FAQs</Badge>
                        </div>
                      );
                    })}
                    {categories.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        No categories found
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Last data refresh: {new Date().toLocaleString()}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active FAQs</span>
                    <Badge variant="outline">{faqs.filter(faq => faq.is_active).length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active Knowledge Base</span>
                    <Badge variant="outline">{knowledgeBase.filter(kb => kb.is_active).length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active Contacts</span>
                    <Badge variant="outline">{contactInfo.filter(contact => contact.is_active).length}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
