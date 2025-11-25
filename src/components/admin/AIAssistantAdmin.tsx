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
import { PaginationControls } from '@/components/ui/PaginationControls';
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

  // Pagination state for FAQs
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

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

  // Pagination logic for FAQs
  const totalPages = Math.ceil(filteredFAQs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFAQs = filteredFAQs.slice(startIndex, endIndex);

  // Reset to first page when search or filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-xl sm:rounded-2xl md:rounded-3xl"></div>
        <div className="relative p-3 sm:p-4 md:p-6 lg:p-8 rounded-xl sm:rounded-2xl md:rounded-3xl">
          {/* Desktop Layout: Side by side */}
          <div className="hidden lg:flex lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Bot className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight">
                  APEX (AI-Powered Educational eXperience)
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-2 leading-snug">
                  Configure and manage the intelligent AI assistant that helps visitors and users navigate the platform
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <Badge variant="secondary" className="px-2 md:px-3 py-1 bg-primary/10 text-primary border-primary/20 text-xs md:text-sm">
                <Sparkles className="h-3 w-3 mr-1 flex-shrink-0" />
                AI Powered
              </Badge>
              <Badge variant="outline" className="px-2 md:px-3 py-1 text-xs md:text-sm">
                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                Always Available
              </Badge>
            </div>
          </div>

          {/* Mobile & Tablet Layout: Stacked */}
          <div className="flex flex-col gap-4 lg:hidden">
            <div className="flex items-start gap-2 sm:gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg">
                <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight break-words">
                  APEX (AI-Powered Educational eXperience)
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 leading-snug">
                  Configure and manage the intelligent AI assistant that helps visitors and users navigate the platform
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full">
              <Badge variant="secondary" className="flex-1 justify-center px-2 py-1 bg-primary/10 text-primary border-primary/20 text-xs">
                <Sparkles className="h-3 w-3 mr-1 flex-shrink-0" />
                AI Powered
              </Badge>
              <Badge variant="outline" className="flex-1 justify-center px-2 py-1 text-xs">
                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                Always Available
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
      <Tabs defaultValue="faqs" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-10 gap-1 p-1">
          <TabsTrigger value="faqs" className="text-xs sm:text-sm py-2 sm:py-0">
            <span className="truncate">FAQs</span>
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="text-xs sm:text-sm py-2 sm:py-0">
            <span className="truncate">Knowledge Base</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs sm:text-sm py-2 sm:py-0">
            <span className="truncate">Contact Info</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs sm:text-sm py-2 sm:py-0">
            <span className="truncate">Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* FAQs Tab */}
        <TabsContent value="faqs" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search FAQs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base w-full"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48 h-9 sm:h-10 text-sm sm:text-base">
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

            <Button 
              onClick={() => {
                setDialogState({
                  isOpen: true,
                  type: 'faq',
                  mode: 'create'
                });
                resetFAQForm();
              }}
              className="w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base"
            >
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
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">FAQ Management</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              {paginatedFAQs.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">No FAQs found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedFAQs.map((faq) => (
                    <Card key={faq.id} className="border hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        {/* Mobile & Desktop Layout */}
                        <div className="flex flex-col gap-3">
                          {/* Question */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm sm:text-base break-words">
                              {faq.question}
                            </h3>
                          </div>
                          
                          {/* Badges: Category, Priority, and Tags */}
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {faq.category}
                            </Badge>
                            <Badge 
                              variant={faq.priority === 'high' ? 'destructive' : faq.priority === 'medium' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {faq.priority}
                            </Badge>
                            {faq.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {faq.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">+{faq.tags.length - 2}</Badge>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditFAQ(faq)}
                              className="flex-1 sm:flex-none h-8 sm:h-9 text-xs sm:text-sm"
                            >
                              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteFAQ(faq.id)}
                              className="flex-1 sm:flex-none h-8 sm:h-9 text-xs sm:text-sm"
                            >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination Controls */}
          {filteredFAQs.length > 0 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredFAQs.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              itemsPerPageOptions={[5, 8, 10, 20, 50]}
              showItemsPerPage={true}
              showPageInfo={true}
              className="mt-4"
            />
          )}
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledge" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <h2 className="text-base sm:text-lg font-semibold">Knowledge Base Management</h2>
            <Button 
              onClick={() => {
                setDialogState({
                  isOpen: true,
                  type: 'knowledge',
                  mode: 'create'
                });
                resetKnowledgeBaseForm();
              }}
              className="w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base"
            >
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
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Knowledge Base Articles</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {knowledgeBase.map((item) => (
                    <Card key={item.id} className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-sm sm:text-base break-words">{item.title}</h3>
                            {!item.is_active && (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{item.content}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs">{item.category}</Badge>
                            {item.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="default" className="text-xs text-white bg-primary hover:bg-primary/90">
                                {tag}
                              </Badge>
                            ))}
                            {item.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{item.tags.length - 3}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:ml-4 flex-shrink-0">
                          <Button variant="outline" size="sm" onClick={() => handleEditKnowledgeBase(item)} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                            <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline ml-2">Edit</span>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteKnowledgeBase(item.id)} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline ml-2">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {knowledgeBase.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No knowledge base articles found. Add your first article to get started.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Info Tab */}
        <TabsContent value="contacts" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <h2 className="text-base sm:text-lg font-semibold">Contact Information Management</h2>
            <Button 
              onClick={() => {
                setDialogState({
                  isOpen: true,
                  type: 'contact',
                  mode: 'create'
                });
                resetContactForm();
              }}
              className="w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base"
            >
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
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {contactInfo.map((contact) => (
                    <Card key={contact.id} className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-sm sm:text-base break-words">{contact.department}</h3>
                            <Badge 
                              variant={contact.priority === 'high' ? 'destructive' : contact.priority === 'medium' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {contact.priority}
                            </Badge>
                            {!contact.is_active && (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground">{contact.description}</p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                            <div className="flex items-center gap-1 break-all">
                              <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="truncate">{contact.email}</span>
                            </div>
                            {contact.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span>{contact.phone}</span>
                              </div>
                            )}
                            <Badge variant="outline" className="text-xs w-fit">{contact.availability}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:ml-4 flex-shrink-0">
                          <Button variant="outline" size="sm" onClick={() => handleEditContact(contact)} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                            <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline ml-2">Edit</span>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteContact(contact.id)} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline ml-2">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {contactInfo.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No contact information found. Add your first contact to get started.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
