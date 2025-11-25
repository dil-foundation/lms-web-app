import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Link2, Eye, Copy, Trash2, Shield, RefreshCw, BarChart3, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
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
        <Button className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 text-sm sm:text-base">
          <Plus className="w-4 h-4 mr-2" />
          Generate Secure Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-background to-background/95 backdrop-blur-sm border border-border/50 shadow-2xl">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#8DC63F]/10 to-[#8DC63F]/20 rounded-xl flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#8DC63F]" />
            </div>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-[#8DC63F] to-[#7AB62F] bg-clip-text text-transparent">
              Generate Secure Link
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Create a secure, time-limited link for external observers
          </p>
        </DialogHeader>
        
        {!generatedLink ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Observer Role</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-10 rounded-lg border-2 border-input bg-background hover:bg-accent/50 focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all duration-300">
                  <SelectValue placeholder="Select observer role" />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-sm border border-border/50">
                  <SelectItem value="principal" className="hover:bg-accent/50">Principal</SelectItem>
                  <SelectItem value="ece" className="hover:bg-accent/50">ECE Observer</SelectItem>
                  <SelectItem value="school-officer" className="hover:bg-accent/50">School Officer</SelectItem>
                  <SelectItem value="project-manager" className="hover:bg-accent/50">Project Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Expiry Duration</label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger className="h-10 rounded-lg border-2 border-input bg-background hover:bg-accent/50 focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all duration-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-sm border border-border/50">
                  <SelectItem value="1" className="hover:bg-accent/50">1 Day</SelectItem>
                  <SelectItem value="3" className="hover:bg-accent/50">3 Days</SelectItem>
                  <SelectItem value="7" className="hover:bg-accent/50">7 Days</SelectItem>
                  <SelectItem value="14" className="hover:bg-accent/50">14 Days</SelectItem>
                  <SelectItem value="30" className="hover:bg-accent/50">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating} 
              className="w-full h-10 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Link'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800/50 rounded-lg">
              <Shield className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200 font-medium">
                Secure link generated successfully! Share this link with the {generatedLink.role.toLowerCase()}.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Generated Link</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg text-sm break-all border border-gray-200 dark:border-gray-700 font-mono">
                  {generatedLink.fullUrl}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(generatedLink.fullUrl)}
                  className="h-8 px-3 rounded-lg border-2 hover:border-accent/40 hover:bg-accent/5 transition-all duration-300"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Role</p>
                <p className="text-sm font-semibold text-foreground">{generatedLink.role}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Expires</p>
                <p className="text-sm font-semibold text-foreground">{generatedLink.expiry.toLocaleDateString()}</p>
              </div>
            </div>
            
            <Button 
              onClick={() => handleOpenChange(false)} 
              className="w-full h-10 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
            >
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
      case 'active': return 'bg-green-500 text-white dark:bg-green-600 dark:text-white border border-green-600 dark:border-green-500 shadow-sm';
      case 'expired': return 'bg-red-500 text-white dark:bg-red-600 dark:text-white border border-red-600 dark:border-red-500 shadow-sm';
      case 'used': return 'bg-blue-500 text-white dark:bg-blue-600 dark:text-white border border-blue-600 dark:border-blue-500 shadow-sm';
      case 'deactivated': return 'bg-gray-500 text-white dark:bg-gray-600 dark:text-white border border-gray-600 dark:border-gray-500 shadow-sm';
      default: return 'bg-gray-500 text-white dark:bg-gray-600 dark:text-white border border-gray-600 dark:border-gray-500 shadow-sm';
    }
  };

  const isExpired = new Date() > link.expiry;
  const displayStatus = isExpired && link.status === 'active' ? 'expired' : link.status;

  return (
    <Card className="bg-gradient-to-br from-card to-primary/5 dark:bg-card hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 border border-border/50">
      <CardContent className="p-3 sm:p-4 md:p-6">
        {/* Mobile Layout (< 768px) */}
        <div className="md:hidden space-y-3">
          {/* Header with role and status */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-3.5 h-3.5 text-primary" />
              </div>
              <h3 className="text-sm font-bold text-foreground truncate">
                {link.role}
              </h3>
            </div>
            <Badge className={`${getStatusColor(displayStatus)} font-semibold px-2 py-0.5 rounded-full text-[10px] flex-shrink-0`}>
              {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
            </Badge>
          </div>
          
          {/* Token with copy button */}
          <div className="flex items-center gap-2">
            <code className="flex-1 px-2 py-1.5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 truncate">
              {link.token.substring(0, 10)}...
            </code>
            {displayStatus === 'active' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(link.fullUrl)}
                className="h-7 px-2 rounded-lg border-2 hover:border-accent/40 hover:bg-accent/5 transition-all duration-300 flex-shrink-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Date info - stacked */}
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium">{link.created.toLocaleDateString()}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Expires:</span>
              <span className={`font-medium ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                {link.expiry.toLocaleDateString()}
              </span>
            </div>

            {link.usedBy && (
              <div className="flex items-center justify-between gap-1">
                <span className="text-muted-foreground">Used by:</span>
                <span className="font-medium text-right break-words">
                  {link.usedBy}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons - full width */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(link.fullUrl, '_blank')}
              disabled={displayStatus !== 'active'}
              className="flex-1 h-8 px-2 rounded-lg border-2 hover:border-accent/40 hover:bg-accent/5 transition-all duration-300 text-xs"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </Button>
            
            {link.status === 'active' && !isExpired ? (
              <Button
                size="sm"
                variant="outline"
                onClick={onDeactivate}
                className="flex-1 h-8 px-2 rounded-lg border-2 hover:border-orange-500/40 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-300 text-xs"
              >
                Deactivate
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={onDelete}
                disabled={isDeleting}
                className="flex-1 h-8 px-2 rounded-lg border-2 border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 hover:text-red-700 transition-all duration-300 dark:border-red-800 dark:hover:border-red-700 dark:hover:bg-red-900/20 dark:text-red-400 text-xs"
              >
                {isDeleting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Desktop Layout (>= 768px) */}
        <div className="hidden md:flex items-center justify-between gap-4">
          {/* Left section - Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                {link.role}
              </h3>
              <Badge className={`${getStatusColor(displayStatus)} font-semibold px-3 py-1 rounded-full text-xs`}>
                {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
              </Badge>
            </div>
            
            {/* Token and URL info */}
            <div className="flex items-center gap-3 mb-3">
              <code className="px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg text-sm font-mono text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                {link.token.substring(0, 12)}...
              </code>
              {displayStatus === 'active' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(link.fullUrl)}
                  className="h-8 px-3 rounded-lg border-2 hover:border-accent/40 hover:bg-accent/5 transition-all duration-300"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              )}
            </div>

            {/* Date and usage info - compact */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">{link.created.toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Expires:</span>
                <span className={`font-medium ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                  {link.expiry.toLocaleDateString()}
                </span>
              </div>

              {link.usedBy && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Used by:</span>
                  <span className="font-medium">
                    {link.usedBy}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Right section - Actions */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(link.fullUrl, '_blank')}
              disabled={displayStatus !== 'active'}
              className="h-8 px-3 rounded-lg border-2 hover:border-accent/40 hover:bg-accent/5 transition-all duration-300 flex items-center gap-1"
            >
              <Eye className="w-3 h-3" />
              <span className="text-xs">View</span>
            </Button>
            
            {link.status === 'active' && !isExpired && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDeactivate}
                className="h-8 px-3 rounded-lg border-2 hover:border-orange-500/40 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-300"
              >
                Deactivate
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              disabled={isDeleting}
              className="h-8 px-3 rounded-lg border-2 border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 hover:text-red-700 transition-all duration-300 dark:border-red-800 dark:hover:border-red-700 dark:hover:bg-red-900/20 dark:text-red-400 flex items-center gap-1"
            >
              {isDeleting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-3 h-3" />
                  <span className="text-xs">Delete</span>
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
  <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5 mb-6">
    <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
        <CardTitle className="text-xs sm:text-sm font-medium">Total Links</CardTitle>
        <Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
        <div className="text-xl sm:text-2xl font-bold">{statistics.totalLinks}</div>
        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
          All secure observation links
        </p>
      </CardContent>
    </Card>
    
    <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
        <CardTitle className="text-xs sm:text-sm font-medium">Active</CardTitle>
        <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
        <div className="text-xl sm:text-2xl font-bold">{statistics.activeLinks}</div>
        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
          Ready for observation
        </p>
      </CardContent>
    </Card>
    
    <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
        <CardTitle className="text-xs sm:text-sm font-medium">Used</CardTitle>
        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
        <div className="text-xl sm:text-2xl font-bold">{statistics.usedLinks}</div>
        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
          Successfully submitted
        </p>
      </CardContent>
    </Card>
    
    <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
        <CardTitle className="text-xs sm:text-sm font-medium">Expired</CardTitle>
        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
        <div className="text-xl sm:text-2xl font-bold">{statistics.expiredLinks}</div>
        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
          Past expiration date
        </p>
      </CardContent>
    </Card>
    
    <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card col-span-2 lg:col-span-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
        <CardTitle className="text-xs sm:text-sm font-medium">Deactivated</CardTitle>
        <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
        <div className="text-xl sm:text-2xl font-bold">{statistics.deactivatedLinks}</div>
        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [linksPerPage] = useState(10);
  
  // Calculate pagination
  const totalPages = Math.ceil(links.length / linksPerPage);
  const startIndex = (currentPage - 1) * linksPerPage;
  const endIndex = startIndex + linksPerPage;
  const currentLinks = links.slice(startIndex, endIndex);

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

  // Reset to first page when links change
  useEffect(() => {
    setCurrentPage(1);
  }, [links.length]);

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
      <div className="space-y-6 mx-auto">
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
    <div className="space-y-8 mx-auto">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-4 sm:p-6 md:p-8 rounded-3xl">
          <div className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight break-words" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                  Secure Link Management
                </h1>
                <p className="text-xs sm:text-sm md:text-lg text-muted-foreground font-light mt-1 break-words">
                  Generate and manage secure observation form links for external observers with enterprise-grade security
          </p>
        </div>
            </div>
            <div className="flex items-center gap-2 w-full flex-shrink-0">
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                className="h-9 sm:h-10 px-3 sm:px-4 md:px-6 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800 text-xs sm:text-sm flex-1 sm:flex-none"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                <span>Refresh</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={onBack}
                className="h-9 sm:h-10 px-3 sm:px-4 md:px-6 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800 text-xs sm:text-sm flex-1 sm:flex-none"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span>Back</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards Section */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className={`bg-gradient-to-br from-card to-primary/5 dark:bg-card ${i === 4 ? 'col-span-2 lg:col-span-1' : ''}`}>
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="h-16 sm:h-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <StatisticsCards statistics={statistics} />
      )}

      {/* Actions Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
            <Link2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">Active Links</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Manage your secure observation links</p>
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <GenerateLinkModal 
            onGenerate={handleGenerateLink} 
            isGenerating={false}
          />
        </div>
      </div>

      {/* Error Alert */}
      {error && !error.includes('Database table not set up yet') && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Links List */}
      <div className="space-y-4 sm:space-y-6">
        {links.length === 0 ? (
          <Card className="bg-gradient-to-br from-card to-primary/5 dark:bg-card border-2 border-dashed border-primary/20">
            <CardContent className="p-6 sm:p-8 md:p-12 text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">No secure links created yet</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto px-4">
                Generate your first secure link to allow external observers to submit reports with enterprise-grade security.
              </p>
              <GenerateLinkModal 
                onGenerate={handleGenerateLink} 
                isGenerating={false}
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {currentLinks.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              onDelete={() => handleDeleteLink(link.id)}
              onDeactivate={() => handleDeactivateLink(link.id)}
              isDeleting={deletingId === link.id}
            />
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 pt-4">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, links.length)} of {links.length} links
                </div>
                
                <div className="flex items-center gap-1 sm:gap-2">
                  {/* First page button - hidden on mobile */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="hidden sm:flex h-7 sm:h-8 px-2 sm:px-3 rounded-lg"
                  >
                    <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  
                  {/* Previous button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-7 sm:h-8 px-2 sm:px-3 rounded-lg"
                  >
                    <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  
                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage <= 2) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 1) {
                        pageNum = totalPages - 2 + i;
                      } else {
                        pageNum = currentPage - 1 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg text-xs sm:text-sm p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  {/* Next button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-7 sm:h-8 px-2 sm:px-3 rounded-lg"
                  >
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  
                  {/* Last page button - hidden on mobile */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="hidden sm:flex h-7 sm:h-8 px-2 sm:px-3 rounded-lg"
                  >
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}; 