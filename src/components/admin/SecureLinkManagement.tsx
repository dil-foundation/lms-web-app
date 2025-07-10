import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Link as LinkIcon,
  CheckCircle,
  Shield,
  XCircle,
  Clock,
  Copy,
  Trash2,
  AlertCircle,
  Eye,
  Download,
  ExternalLink,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';

interface SecureLinkManagementProps {
  onBack: () => void;
}

interface SecureLink {
  id: string;
  role: string;
  token: string;
  fullUrl: string;
  expiry: Date;
  status: 'active' | 'expired' | 'used' | 'deactivated';
  usedBy?: string;
  usedAt?: Date;
  created: Date;
  createdBy: string;
  expiryDays: number;
}

const StatCard = ({ title, value, icon: Icon, iconColor, bgColor }) => (
  <Card className="shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-card">
    <CardContent className="p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <div className={cn("p-3 rounded-lg", bgColor)}>
        <Icon className={cn("h-6 w-6", iconColor)} />
      </div>
    </CardContent>
  </Card>
);

const getRoleBadgeClass = (role: string) => {
  switch (role) {
    case 'Principal':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300';
    case 'ECE Observer':
      return 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300';
    case 'School Officer':
      return 'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300';
    case 'Project Manager':
      return 'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/50 dark:text-orange-300';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900/50 dark:text-gray-300';
  }
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300';
    case 'expired':
      return 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300';
    case 'used':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300';
    case 'deactivated':
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900/50 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900/50 dark:text-gray-300';
  }
};

const generateSecureToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const GenerateLinkModalContent = ({ onGenerate, isGenerating }) => {
  const [role, setRole] = useState('');
  const [expiry, setExpiry] = useState('7');
  const [generatedLink, setGeneratedLink] = useState<SecureLink | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!role) {
      toast({
        title: "Validation Error",
        description: "Please select an observer role.",
        variant: "destructive",
      });
      return;
    }

    const fullToken = generateSecureToken();
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}/secure-form/${fullToken}`;
    
    const newLink: SecureLink = {
      id: `link_${Date.now()}`,
      role: role === 'principal' ? 'Principal' : 
            role === 'ece' ? 'ECE Observer' : 
            role === 'school-officer' ? 'School Officer' : 'Project Manager',
      token: fullToken.substring(0, 8) + '...',
      fullUrl,
      expiry: new Date(Date.now() + parseInt(expiry) * 24 * 60 * 60 * 1000),
      status: 'active',
      created: new Date(),
      createdBy: 'Admin User',
      expiryDays: parseInt(expiry)
    };

    // Simulate API call
    setTimeout(() => {
      setGeneratedLink(newLink);
      onGenerate(newLink);
      toast({
        title: "Secure Link Generated",
        description: "The secure link has been created successfully.",
      });
    }, 1000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard.",
    });
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-full">
            <LinkIcon className="w-5 h-5 text-green-600" />
          </div>
          <DialogTitle className="text-xl font-bold">Generate Secure Link</DialogTitle>
        </div>
        <DialogDescription>
          Create a secure link for observation reporting. The link will be
          valid for the specified number of days.
        </DialogDescription>
      </DialogHeader>
      
      {!generatedLink ? (
        <>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="observer-role">Observer Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="observer-role" className="h-11">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="principal">Principal</SelectItem>
                  <SelectItem value="ece">ECE Observer</SelectItem>
                  <SelectItem value="school-officer">School Officer</SelectItem>
                  <SelectItem value="project-manager">Project Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry-days">Expiry (Days)</Label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger id="expiry-days" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Generate Link
                </>
              )}
            </Button>
          </DialogFooter>
        </>
      ) : (
        <div className="py-4 space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <h4 className="font-medium text-green-800 dark:text-green-200">
                  Secure Link Generated Successfully!
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Share this link with the {generatedLink.role} observer.
                </p>
                <div className="bg-white dark:bg-green-950 p-3 rounded border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-green-700 dark:text-green-300 flex-1 break-all">
                      {generatedLink.fullUrl}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generatedLink.fullUrl)}
                      className="flex-shrink-0"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-green-700 dark:text-green-300">
                  <span>Role: {generatedLink.role}</span>
                  <span>Expires: {generatedLink.expiry.toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Check className="w-4 h-4 mr-2" />
                Done
              </Button>
            </DialogClose>
          </DialogFooter>
        </div>
      )}
    </>
  );
};

export const SecureLinkManagement = ({ onBack }: SecureLinkManagementProps) => {
  const [links, setLinks] = useState<SecureLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();

  // Check for expired links
  const checkExpiredLinks = () => {
    const now = new Date();
    const updatedLinks = links.map(link => ({
      ...link,
      status: link.expiry < now && link.status === 'active' ? 'expired' as const : link.status
    }));
    
    // Only update if there are changes
    const hasChanges = updatedLinks.some((link, index) => link.status !== links[index]?.status);
    if (hasChanges) {
      setLinks(updatedLinks);
      saveLinksToStorage(updatedLinks);
    }
  };

  // Auto-refresh every 30 seconds to check for expired links
  useEffect(() => {
    const interval = setInterval(checkExpiredLinks, 30000);
    return () => clearInterval(interval);
  }, []);

  // Persistent storage key
  const STORAGE_KEY = 'secure-links-data';

  // Load links from localStorage or use initial mock data
  const loadLinks = () => {
    setLoading(true);
    // Simulate loading from database
    setTimeout(() => {
      try {
        const storedLinks = localStorage.getItem(STORAGE_KEY);
        let linksToLoad: SecureLink[] = [];

        if (storedLinks) {
          // Parse stored links and convert date strings back to Date objects
          const parsedLinks = JSON.parse(storedLinks);
          linksToLoad = parsedLinks.map((link: any) => ({
            ...link,
            expiry: new Date(link.expiry),
            created: new Date(link.created),
            usedAt: link.usedAt ? new Date(link.usedAt) : undefined
          }));
        } else {
          // First time loading - use initial mock data
          linksToLoad = [
            {
              id: 'link_1',
              role: 'Principal',
              token: '1c87fa...',
              fullUrl: `${window.location.origin}/secure-form/1c87fa9b2d3e4f5g6h7i8j9k`,
              expiry: new Date('2025-07-21T12:26:00'),
              status: 'active',
              created: new Date('2025-07-07T12:26:00'),
              createdBy: 'Admin User',
              expiryDays: 14
            },
            {
              id: 'link_2',
              role: 'ECE Observer',
              token: '1621b0...',
              fullUrl: `${window.location.origin}/secure-form/1621b0c3d4e5f6g7h8i9j0k1`,
              expiry: new Date('2025-07-12T15:33:00'),
              status: 'active',
              created: new Date('2025-07-05T15:33:00'),
              createdBy: 'Admin User',
              expiryDays: 7
            },
          ];
          // Save initial data to localStorage
          saveLinksToStorage(linksToLoad);
        }

        setLinks(linksToLoad);
        setLoading(false);
        checkExpiredLinks();
      } catch (error) {
        console.error('Error loading links:', error);
        setLinks([]);
        setLoading(false);
      }
    }, 1000);
  };

  // Save links to localStorage
  const saveLinksToStorage = (linksToSave: SecureLink[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(linksToSave));
    } catch (error) {
      console.error('Error saving links:', error);
    }
  };

  // Mock database operations
  useEffect(() => {
    loadLinks();
  }, []);

  const handleGenerate = (newLink: SecureLink) => {
    const updatedLinks = [...links, newLink];
    setLinks(updatedLinks);
    saveLinksToStorage(updatedLinks);
  };

  const handleRefresh = () => {
    loadLinks();
    toast({
      title: "Refreshed",
      description: "Secure links data has been refreshed from storage.",
    });
  };

  // Development helper - clear all stored data (you can remove this in production)
  const handleClearStorage = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLinks([]);
    toast({
      title: "Storage Cleared",
      description: "All secure links have been cleared from storage.",
      variant: "destructive",
    });
  };

  const handleCopyLink = async (link: SecureLink) => {
    setActionLoading(prev => ({ ...prev, [`copy-${link.id}`]: true }));
    
    try {
      await navigator.clipboard.writeText(link.fullUrl);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setActionLoading(prev => ({ ...prev, [`copy-${link.id}`]: false }));
      }, 500);
    }
  };

  const handleDeactivate = (linkId: string) => {
    setActionLoading(prev => ({ ...prev, [`deactivate-${linkId}`]: true }));
    
    // Simulate API call
    setTimeout(() => {
      const updatedLinks = links.map(link => 
        link.id === linkId ? { ...link, status: 'deactivated' as const } : link
      );
      setLinks(updatedLinks);
      saveLinksToStorage(updatedLinks);
      toast({
        title: "Link Deactivated",
        description: "The secure link has been deactivated and can no longer be used.",
      });
      setActionLoading(prev => ({ ...prev, [`deactivate-${linkId}`]: false }));
    }, 1000);
  };

  const handleDelete = (linkId: string) => {
    setActionLoading(prev => ({ ...prev, [`delete-${linkId}`]: true }));
    
    // Simulate API call
    setTimeout(() => {
      const updatedLinks = links.filter(link => link.id !== linkId);
      setLinks(updatedLinks);
      saveLinksToStorage(updatedLinks);
      toast({
        title: "Link Deleted",
        description: "The secure link has been permanently deleted.",
        variant: "destructive",
      });
      setActionLoading(prev => ({ ...prev, [`delete-${linkId}`]: false }));
    }, 1000);
  };

  const handleOpenLink = (link: SecureLink) => {
    if (link.status === 'active') {
      window.open(link.fullUrl, '_blank', 'noopener,noreferrer');
      toast({
        title: "Link Opened",
        description: "Secure form opened in new tab.",
      });
    } else {
      toast({
        title: "Cannot Open Link",
        description: `This link is ${link.status} and cannot be opened.`,
        variant: "destructive",
      });
    }
  };

  const handleReactivate = (linkId: string) => {
    setActionLoading(prev => ({ ...prev, [`reactivate-${linkId}`]: true }));
    
    // Simulate API call
    setTimeout(() => {
      const updatedLinks = links.map(link => 
        link.id === linkId ? { ...link, status: 'active' as const } : link
      );
      setLinks(updatedLinks);
      saveLinksToStorage(updatedLinks);
      toast({
        title: "Link Reactivated",
        description: "The secure link has been reactivated.",
      });
      setActionLoading(prev => ({ ...prev, [`reactivate-${linkId}`]: false }));
    }, 1000);
  };

  const getStats = () => {
    const total = links.length;
    const active = links.filter(l => l.status === 'active').length;
    const used = links.filter(l => l.status === 'used').length;
    const deactivated = links.filter(l => l.status === 'deactivated').length;
    const expired = links.filter(l => l.status === 'expired').length;
    
    return { total, active, used, deactivated, expired };
  };

  const stats = getStats();

  const isExpiringSoon = (expiry: Date) => {
    const now = new Date();
    const timeDiff = expiry.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);
    return hoursDiff > 0 && hoursDiff < 24; // Expires within 24 hours
  };

  return (
    <div className="space-y-6 mx-auto p-4 sm:p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Observation Reporting
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Secure Link Management</h1>
          <p className="text-muted-foreground mt-1">
            Generate and manage secure links for observation reporting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          {/* Development helper - remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <Button 
              variant="outline" 
              onClick={handleClearStorage}
              className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Generate Link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <GenerateLinkModalContent onGenerate={handleGenerate} isGenerating={isGenerating} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Total Links" value={stats.total} icon={LinkIcon} iconColor="text-green-600" bgColor="bg-green-100 dark:bg-green-900/20" />
        <StatCard title="Active" value={stats.active} icon={CheckCircle} iconColor="text-green-600" bgColor="bg-green-100 dark:bg-green-900/20" />
        <StatCard title="Used" value={stats.used} icon={Shield} iconColor="text-blue-600" bgColor="bg-blue-100 dark:bg-blue-900/20" />
        <StatCard title="Deactivated" value={stats.deactivated} icon={XCircle} iconColor="text-gray-600" bgColor="bg-gray-100 dark:bg-gray-900/20" />
        <StatCard title="Expired" value={stats.expired} icon={Clock} iconColor="text-red-600" bgColor="bg-red-100 dark:bg-red-900/20" />
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading secure links...</span>
            </div>
          </CardContent>
        </Card>
      ) : links.length === 0 ? (
        <EmptyState
          icon={<LinkIcon className="w-8 h-8 text-muted-foreground" />}
          title="No Secure Links Yet"
          description="Create your first secure link to allow observers to submit reports without logging in."
          action={
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Generate First Link
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <GenerateLinkModalContent onGenerate={handleGenerate} isGenerating={isGenerating} />
              </DialogContent>
            </Dialog>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-muted-foreground" />
              <CardTitle>Secure Links</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Used By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell>
                        <Badge className={cn("font-medium", getRoleBadgeClass(link.role))}>
                          {link.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div>
                            {link.expiry.toLocaleDateString()}
                            <br />
                            <span className="text-xs">{link.expiry.toLocaleTimeString()}</span>
                          </div>
                          {isExpiringSoon(link.expiry) && link.status === 'active' && (
                            <span title="Expires within 24 hours">
                              <AlertTriangle className="w-4 h-4 text-orange-500" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("font-medium", getStatusBadgeClass(link.status))}>
                          {link.status.charAt(0).toUpperCase() + link.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {link.usedBy || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {link.created.toLocaleDateString()}
                        <br />
                        <span className="text-xs">{link.created.toLocaleTimeString()}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleOpenLink(link)}
                            disabled={link.status !== 'active'}
                          >
                            <ExternalLink className="w-3 h-3 mr-2" />
                            Open
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleCopyLink(link)}
                            disabled={actionLoading[`copy-${link.id}`]}
                          >
                            {actionLoading[`copy-${link.id}`] ? (
                              <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                            ) : (
                              <Copy className="w-3 h-3 mr-2" />
                            )}
                            Copy
                          </Button>
                          
                          {link.status === 'active' ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeactivate(link.id)}
                              disabled={actionLoading[`deactivate-${link.id}`]}
                            >
                              {actionLoading[`deactivate-${link.id}`] ? (
                                <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                              ) : (
                                <XCircle className="w-3 h-3 mr-2" />
                              )}
                              Deactivate
                            </Button>
                          ) : link.status === 'deactivated' ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleReactivate(link.id)}
                              disabled={actionLoading[`reactivate-${link.id}`]}
                            >
                              {actionLoading[`reactivate-${link.id}`] ? (
                                <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3 h-3 mr-2" />
                              )}
                              Reactivate
                            </Button>
                          ) : null}
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                                disabled={actionLoading[`delete-${link.id}`]}
                              >
                                {actionLoading[`delete-${link.id}`] ? (
                                  <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3 mr-2" />
                                )}
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the secure link
                                  and remove it from our servers. The link will no longer be accessible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(link.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 