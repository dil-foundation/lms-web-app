import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Link2, Eye, Copy, Trash2, Shield, RefreshCw, BarChart3, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ContentLoader } from '@/components/ContentLoader';
import { SecureLinksDatabaseSetupAlert } from './SecureLinksDatabaseSetupAlert';
import { useSecureLinks, SecureLink } from '@/contexts/SecureLinksContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SecureLinkManagementProps {
  onBack: () => void;
}

// Generate secure token
const generateSecureToken = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const GenerateLinkModal = ({ onGenerate, isGenerating }: { onGenerate: (link: SecureLink) => void; isGenerating: boolean }) => {
  const [role, setRole] = useState('');
  const [expiry, setExpiry] = useState('7');
  const [generatedLink, setGeneratedLink] = useState<SecureLink | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const handleGenerate = async () => {
    if (!role || !user?.id) {
      toast.error('Please select an observer role');
      return;
    }

    const fullToken = generateSecureToken();
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}/secure-form/${fullToken}`;
    
    const roleMapping: Record<string, { display: string; observerRole: string }> = {
      'principal': { display: 'Principal', observerRole: 'principal' },
      'ece': { display: 'ECE Observer', observerRole: 'ece' },
      'school-officer': { display: 'School Officer', observerRole: 'school-officer' },
      'project-manager': { display: 'Project Manager', observerRole: 'project-manager' }
    };

    const roleInfo = roleMapping[role];
    
    const newLink: SecureLink = {
      id: `link_${Date.now()}`, // Will be replaced by database
      role: roleInfo.display,
      observerRole: roleInfo.observerRole,
      token: fullToken,
      fullUrl,
      expiry: new Date(Date.now() + parseInt(expiry) * 24 * 60 * 60 * 1000),
      status: 'active',
      created: new Date(),
      createdBy: user.id,
      expiryDays: parseInt(expiry),
    };

    setGeneratedLink(newLink);
    onGenerate(newLink);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied to clipboard!');
  };

  const resetForm = () => {
    setRole('');
    setExpiry('7');
    setGeneratedLink(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Generate Secure Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Secure Observer Link</DialogTitle>
        </DialogHeader>
        
        {!generatedLink ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Observer Role</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select observer role" />
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
              <label className="text-sm font-medium">Expiry Duration</label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Day</SelectItem>
                  <SelectItem value="3">3 Days</SelectItem>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="14">14 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
              {isGenerating ? 'Generating...' : 'Generate Link'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Secure link generated successfully! Share this link with the {generatedLink.role.toLowerCase()}.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Generated Link</label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs break-all">
                  {generatedLink.fullUrl}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(generatedLink.fullUrl)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p><strong>Role:</strong> {generatedLink.role}</p>
              <p><strong>Expires:</strong> {generatedLink.expiry.toLocaleDateString()}</p>
            </div>
            
            <Button onClick={() => handleOpenChange(false)} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const LinkCard = ({ 
  link, 
  onDelete, 
  onDeactivate,
  isDeleting 
}: { 
  link: SecureLink; 
  onDelete: () => void;
  onDeactivate: () => void;
  isDeleting: boolean;
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied to clipboard!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'used': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'deactivated': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const isExpired = new Date() > link.expiry;
  const displayStatus = isExpired && link.status === 'active' ? 'expired' : link.status;

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-6">
          {/* Left section - Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {link.role}
                </h3>
              </div>
              <Badge className={`${getStatusColor(displayStatus)} font-medium px-3 py-1`}>
                {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
              </Badge>
            </div>
            
            {/* Token and URL info */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-gray-700 dark:text-gray-300">
                  {link.token.substring(0, 12)}...
                </code>
                {displayStatus === 'active' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(link.fullUrl)}
                    className="h-6 px-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy URL
                  </Button>
                )}
              </div>
            </div>

            {/* Date and usage info grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">Created</p>
                <p className="text-gray-900 dark:text-white">
                  {link.created.toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {link.created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              
              <div>
                <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">Expires</p>
                <p className={`${isExpired ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                  {link.expiry.toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {link.expiry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {link.usedBy && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">Used By</p>
                  <p className="text-gray-900 dark:text-white truncate" title={link.usedBy}>
                    {link.usedBy}
                  </p>
                </div>
              )}

              {link.usedAt && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">Used At</p>
                  <p className="text-gray-900 dark:text-white">
                    {link.usedAt.toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {link.usedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Right section - Actions */}
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(link.fullUrl, '_blank')}
              disabled={displayStatus !== 'active'}
              className="w-24"
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </Button>
            
            {link.status === 'active' && !isExpired && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDeactivate}
                className="w-24"
              >
                Deactivate
              </Button>
            )}
            
            <Button
              size="sm"
              variant="destructive"
              onClick={onDelete}
              disabled={isDeleting}
              className="w-24"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const StatisticsCards = ({ statistics }: { statistics: any }) => (
  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
    <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Links</CardTitle>
        <Link2 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{statistics.totalLinks}</div>
        <p className="text-xs text-muted-foreground">
          All secure observation links
        </p>
      </CardContent>
    </Card>
    
    <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Active</CardTitle>
        <Shield className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{statistics.activeLinks}</div>
        <p className="text-xs text-muted-foreground">
          Ready for observation
        </p>
      </CardContent>
    </Card>
    
    <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Used</CardTitle>
        <Eye className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{statistics.usedLinks}</div>
        <p className="text-xs text-muted-foreground">
          Successfully submitted
        </p>
      </CardContent>
    </Card>
    
    <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Expired</CardTitle>
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{statistics.expiredLinks}</div>
        <p className="text-xs text-muted-foreground">
          Past expiration date
        </p>
      </CardContent>
    </Card>
    
    <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Deactivated</CardTitle>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{statistics.deactivatedLinks}</div>
        <p className="text-xs text-muted-foreground">
          Manually disabled
        </p>
      </CardContent>
    </Card>
  </div>
);

export const SecureLinkManagement = ({ onBack }: SecureLinkManagementProps) => {
  const { 
    links, 
    addLink, 
    deleteLink, 
    updateLink, 
    isLoading, 
    error, 
    refreshLinks, 
    getStatistics,
    enablePolling,
    disablePolling
  } = useSecureLinks();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statistics, setStatistics] = useState({
    totalLinks: 0,
    activeLinks: 0,
    usedLinks: 0,
    deactivatedLinks: 0,
    expiredLinks: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Load statistics
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        setStatsLoading(true);
        const stats = await getStatistics();
        setStatistics(stats);
      } catch (err) {
        console.error('Error loading statistics:', err);
      } finally {
        setStatsLoading(false);
      }
    };

    if (!isLoading && !error) {
      loadStatistics();
    }
  }, [links, isLoading, error, getStatistics]);

  // Enable polling when component mounts, disable when unmounts
  useEffect(() => {
    enablePolling();
    return () => {
      disablePolling();
    };
  }, [enablePolling, disablePolling]);

  const handleGenerateLink = async (newLink: SecureLink) => {
    try {
      await addLink(newLink);
      toast.success('Secure link generated successfully!');
    } catch (err) {
      toast.error('Failed to generate secure link');
      console.error('Error generating link:', err);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    setDeletingId(linkId);
    try {
      await deleteLink(linkId);
      toast.success('Link deleted successfully');
    } catch (err) {
      toast.error('Failed to delete link');
      console.error('Error deleting link:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeactivateLink = async (linkId: string) => {
    try {
      await updateLink(linkId, { status: 'deactivated' });
      toast.success('Link deactivated successfully');
    } catch (err) {
      toast.error('Failed to deactivate link');
      console.error('Error deactivating link:', err);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshLinks();
      toast.success('Links refreshed successfully');
    } catch (err) {
      toast.error('Failed to refresh links');
      console.error('Error refreshing links:', err);
    }
  };

  if (isLoading) {
    return <ContentLoader />;
  }

  // Show database setup alert if there's a database-related error
  if (error && error.includes('Database table not set up yet')) {
    return (
      <div className="space-y-6 mx-auto p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Secure Link Management</h1>
            <p className="text-muted-foreground mt-1">
              Generate and manage secure observation form links
            </p>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <SecureLinksDatabaseSetupAlert error={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Secure Link Management</h1>
          <p className="text-muted-foreground mt-1">
            Generate and manage secure observation form links for external observers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <StatisticsCards statistics={statistics} />
      )}

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Active Links</h2>
        <GenerateLinkModal 
          onGenerate={handleGenerateLink} 
          isGenerating={false}
        />
      </div>

      {/* Error Alert */}
      {error && !error.includes('Database table not set up yet') && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Links List */}
      <div className="space-y-4">
        {links.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No secure links created yet</h3>
              <p className="text-muted-foreground mb-4">
                Generate your first secure link to allow external observers to submit reports.
              </p>
              <GenerateLinkModal 
                onGenerate={handleGenerateLink} 
                isGenerating={false}
              />
            </CardContent>
          </Card>
        ) : (
          links.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              onDelete={() => handleDeleteLink(link.id)}
              onDeactivate={() => handleDeactivateLink(link.id)}
              isDeleting={deletingId === link.id}
            />
          ))
        )}
      </div>
    </div>
  );
}; 