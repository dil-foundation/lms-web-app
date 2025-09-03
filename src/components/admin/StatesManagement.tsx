import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Plus, MapPin, Edit, Trash2, Eye, RefreshCw, Calendar, FileText, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

interface State {
  id: string;
  name: string;
  code: string;
  description: string;
  created_at: string;
  updated_at: string;
}

const StatesManagement: React.FC = () => {
  const [states, setStates] = useState<State[]>([
    {
      id: '1',
      name: 'California',
      code: 'CA',
      description: 'The Golden State, known for its diverse geography and economy.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '2',
      name: 'Texas',
      code: 'TX',
      description: 'The Lone Star State, second largest state by population.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '3',
      name: 'New York',
      code: 'NY',
      description: 'The Empire State, home to New York City.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingState, setEditingState] = useState<State | null>(null);
  const [viewingState, setViewingState] = useState<State | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  });

  const filteredStates = states.filter(state => {
    const matchesSearch = state.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         state.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleCreate = () => {
    if (!formData.name || !formData.code) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newState: State = {
      id: Date.now().toString(),
      name: formData.name,
      code: formData.code.toUpperCase(),
      description: formData.description,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0]
    };

    setStates([...states, newState]);
    setIsCreateDialogOpen(false);
    resetForm();
    toast.success('State created successfully');
  };

  const handleEdit = () => {
    if (!editingState || !formData.name || !formData.code) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedStates = states.map(state =>
      state.id === editingState.id
        ? {
            ...state,
            name: formData.name,
            code: formData.code.toUpperCase(),
            description: formData.description,
            updated_at: new Date().toISOString().split('T')[0]
          }
        : state
    );

    setStates(updatedStates);
    setIsEditDialogOpen(false);
    setEditingState(null);
    resetForm();
    toast.success('State updated successfully');
  };

  const handleDelete = (stateId: string) => {
    setStates(states.filter(state => state.id !== stateId));
    toast.success('State deleted successfully');
  };

  const openEditDialog = (state: State) => {
    setEditingState(state);
    setFormData({
      name: state.name,
      code: state.code,
      description: state.description
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (state: State) => {
    setViewingState(state);
    setIsViewDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: ''
    });
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-green-600">States Management</h1>
          <p className="text-muted-foreground">Manage all states and territories in the system</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create State
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total States</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{states.length}</div>
            <p className="text-xs text-muted-foreground">All states in the system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">States with Description</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{states.filter(s => s.description && s.description.trim() !== '').length}</div>
            <p className="text-xs text-muted-foreground">Have descriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{states.filter(s => {
              const today = new Date();
              const updateDate = new Date(s.updated_at);
              const diffTime = Math.abs(today.getTime() - updateDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays <= 7;
            }).length}</div>
            <p className="text-xs text-muted-foreground">Updated this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>State Directory</CardTitle>
          <CardDescription>Search and filter states by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search states by name, code, or country..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* States Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStates.map((state) => (
                <TableRow key={state.id}>
                  <TableCell className="font-medium">{state.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{state.code}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{state.description}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {state.updated_at}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openViewDialog(state)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(state)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit State
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete State
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete State</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{state.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(state.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create State Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New State</DialogTitle>
            <DialogDescription>
              Add a new state or territory to the system. Fill in the required information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">State Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., California"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">State Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., CA"
                maxLength={3}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the state..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700">
              Create State
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit State Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit State</DialogTitle>
            <DialogDescription>
              Update the information for {editingState?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">State Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., California"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">State Code *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., CA"
                maxLength={3}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the state..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">
              Update State
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View State Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>State Details</DialogTitle>
            <DialogDescription>
              View detailed information about {viewingState?.name}.
            </DialogDescription>
          </DialogHeader>
          {viewingState && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">State Name</Label>
                    <p className="text-lg font-semibold">{viewingState.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">State Code</Label>
                    <Badge variant="outline" className="text-lg">{viewingState.code}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="text-lg">{viewingState.created_at}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-lg">{viewingState.updated_at}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                    <p className="text-lg">{viewingState.description}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {viewingState && (
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                openEditDialog(viewingState);
              }} className="bg-blue-600 hover:bg-blue-700">
                Edit State
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StatesManagement;
