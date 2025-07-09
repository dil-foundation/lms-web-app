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
} from 'lucide-react';
import { useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface SecureLinkManagementProps {
  onBack: () => void;
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

const mockLinks = [
    {
        role: 'Principal',
        token: '1c87fa...',
        expiry: 'Jul 21, 2025,\n12:26 PM',
        status: 'Active',
        usedBy: '—',
        created: 'Jul 7, 2025,\n12:26 PM',
    },
    {
        role: 'ECE Observer',
        token: '1621b0...',
        expiry: 'Jul 12, 2025,\n03:33 PM',
        status: 'Active',
        usedBy: '—',
        created: 'Jul 5, 2025,\n03:33 PM',
    },
];

const getRoleBadgeClass = (role: string) => {
    switch (role) {
        case 'Principal':
            return 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300';
        case 'ECE Observer':
            return 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

const GenerateLinkModalContent = () => {
  const [role, setRole] = useState('');
  const [expiry, setExpiry] = useState('7');

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
        <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
          <LinkIcon className="w-4 h-4 mr-2" />
          Generate Link
        </Button>
      </DialogFooter>
    </>
  );
};

export const SecureLinkManagement = ({ onBack }: SecureLinkManagementProps) => {
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
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Generate Link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <GenerateLinkModalContent />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Total Links" value="2" icon={LinkIcon} iconColor="text-green-600" bgColor="bg-green-100" />
        <StatCard title="Active" value="2" icon={CheckCircle} iconColor="text-green-600" bgColor="bg-green-100" />
        <StatCard title="Used" value="0" icon={Shield} iconColor="text-blue-600" bgColor="bg-blue-100" />
        <StatCard title="Deactivated" value="0" icon={XCircle} iconColor="text-red-600" bgColor="bg-red-100" />
        <StatCard title="Expired" value="0" icon={Clock} iconColor="text-orange-600" bgColor="bg-orange-100" />
      </div>

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
                    <TableHead>Token</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Used By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                    {mockLinks.map((link, index) => (
                        <TableRow key={index}>
                            <TableCell>
                                <Badge className={cn("font-medium", getRoleBadgeClass(link.role))}>{link.role}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-muted-foreground">{link.token}</TableCell>
                            <TableCell className="text-muted-foreground whitespace-pre-wrap">{link.expiry}</TableCell>
                            <TableCell>
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300">Active</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{link.usedBy}</TableCell>
                            <TableCell className="text-muted-foreground whitespace-pre-wrap">{link.created}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <Button variant="outline" size="sm"><Copy className="w-3 h-3 mr-2"/>Copy Link</Button>
                                    <Button variant="outline" size="sm"><XCircle className="w-3 h-3 mr-2"/>Deactivate</Button>
                                    <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"><Trash2 className="w-3 h-3 mr-2"/>Delete</Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 