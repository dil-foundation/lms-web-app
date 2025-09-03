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
import { Search, Plus, Building2, Edit, Trash2, Eye, RefreshCw, Calendar, FileText, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

interface Board {
  id: string;
  name: string;
  code: string;
  state: string;
  description: string;
  created_at: string;
  updated_at: string;
}

const BoardManagement: React.FC = () => {
  const [boards, setBoards] = useState<Board[]>([
    {
      id: '1',
      name: 'Federal Board of Intermediate and Secondary Education',
      code: 'FBISE',
      state: 'Islamabad Capital Territory',
      description: 'The Federal Board of Intermediate and Secondary Education is a federal level board of education in Pakistan for public and private schools.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '2',
      name: 'Punjab Board of Intermediate and Secondary Education',
      code: 'PBISE',
      state: 'Punjab',
      description: 'Punjab Board of Intermediate and Secondary Education is the provincial education board of Punjab, Pakistan.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '3',
      name: 'International Baccalaureate',
      code: 'IB',
      state: 'Geneva',
      description: 'The International Baccalaureate is an international educational foundation headquartered in Geneva, Switzerland.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [viewingBoard, setViewingBoard] = useState<Board | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    state: '',
    description: ''
  });

  const filteredBoards = boards.filter(board => {
    const matchesSearch = board.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         board.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleCreate = () => {
    if (!formData.name || !formData.code || !formData.state) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newBoard: Board = {
      id: Date.now().toString(),
      name: formData.name,
      code: formData.code.toUpperCase(),
      state: formData.state,
      description: formData.description,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0]
    };

    setBoards([...boards, newBoard]);
    setIsCreateDialogOpen(false);
    resetForm();
    toast.success('Board created successfully');
  };

  const handleEdit = () => {
    if (!editingBoard || !formData.name || !formData.code || !formData.state) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedBoards = boards.map(board =>
      board.id === editingBoard.id
        ? {
            ...board,
            name: formData.name,
            code: formData.code.toUpperCase(),
            state: formData.state,
            description: formData.description,
            updated_at: new Date().toISOString().split('T')[0]
          }
        : board
    );

    setBoards(updatedBoards);
    setIsEditDialogOpen(false);
    setEditingBoard(null);
    resetForm();
    toast.success('Board updated successfully');
  };

  const handleDelete = (boardId: string) => {
    setBoards(boards.filter(board => board.id !== boardId));
    toast.success('Board deleted successfully');
  };

  const openEditDialog = (board: Board) => {
    setEditingBoard(board);
    setFormData({
      name: board.name,
      code: board.code,
      state: board.state,
      description: board.description
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (board: Board) => {
    setViewingBoard(board);
    setIsViewDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      state: '',
      description: ''
    });
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-green-600">Board Management</h1>
          <p className="text-muted-foreground">Manage all educational boards and examination bodies in the system</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Board
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Boards</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{boards.length}</div>
            <p className="text-xs text-muted-foreground">All boards in the system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Boards with Description</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{boards.filter(b => b.description && b.description.trim() !== '').length}</div>
            <p className="text-xs text-muted-foreground">Have descriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{boards.filter(b => {
              const today = new Date();
              const updateDate = new Date(b.updated_at);
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
          <CardTitle>Board Directory</CardTitle>
          <CardDescription>Search and filter boards by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search boards by name or code..."
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

      {/* Boards Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                             {filteredBoards.map((board) => (
                 <TableRow key={board.id}>
                   <TableCell className="font-medium">{board.name}</TableCell>
                   <TableCell>
                     <Badge variant="outline">{board.code}</Badge>
                   </TableCell>
                   <TableCell>{board.state}</TableCell>
                   <TableCell className="max-w-xs truncate">{board.description}</TableCell>
                   <TableCell className="text-muted-foreground">
                     <div className="flex items-center gap-1">
                       <Calendar className="h-3 w-3" />
                       {board.updated_at}
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
                         <DropdownMenuItem onClick={() => openViewDialog(board)}>
                           <Eye className="mr-2 h-4 w-4" />
                           View Details
                         </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => openEditDialog(board)}>
                           <Edit className="mr-2 h-4 w-4" />
                           Edit Board
                         </DropdownMenuItem>
                         <DropdownMenuSeparator />
                         <AlertDialog>
                           <AlertDialogTrigger asChild>
                             <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                               <Trash2 className="mr-2 h-4 w-4" />
                               Delete Board
                             </DropdownMenuItem>
                           </AlertDialogTrigger>
                           <AlertDialogContent>
                             <AlertDialogHeader>
                               <AlertDialogTitle>Delete Board</AlertDialogTitle>
                               <AlertDialogDescription>
                                 Are you sure you want to delete "{board.name}"? This action cannot be undone.
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel>Cancel</AlertDialogCancel>
                               <AlertDialogAction
                                 onClick={() => handleDelete(board.id)}
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

      {/* Create Board Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
            <DialogDescription>
              Add a new educational board or examination body to the system. Fill in the required information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Board Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Central Board of Secondary Education"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Board Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., CBSE"
                maxLength={10}
              />
            </div>
                         <div className="space-y-2">
               <Label htmlFor="state">State *</Label>
               <Select
                 value={formData.state}
                 onValueChange={(value) => setFormData({ ...formData, state: value })}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Select a state" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="Azad Jammu and Kashmir">Azad Jammu and Kashmir</SelectItem>
                   <SelectItem value="Balochistan">Balochistan</SelectItem>
                   <SelectItem value="Gilgit-Baltistan">Gilgit-Baltistan</SelectItem>
                   <SelectItem value="Islamabad Capital Territory">Islamabad Capital Territory</SelectItem>
                   <SelectItem value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</SelectItem>
                   <SelectItem value="Punjab">Punjab</SelectItem>
                   <SelectItem value="Sindh">Sindh</SelectItem>
                   <SelectItem value="Federally Administered Tribal Areas">Federally Administered Tribal Areas</SelectItem>
                   <SelectItem value="Geneva">Geneva</SelectItem>
                 </SelectContent>
               </Select>
             </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the board..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700">
              Create Board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Board Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Board</DialogTitle>
            <DialogDescription>
              Update the information for {editingBoard?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Board Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Central Board of Secondary Education"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Board Code *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., CBSE"
                maxLength={10}
              />
            </div>
                         <div className="space-y-2">
               <Label htmlFor="edit-state">State *</Label>
               <Select
                 value={formData.state}
                 onValueChange={(value) => setFormData({ ...formData, state: value })}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Select a state" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="Azad Jammu and Kashmir">Azad Jammu and Kashmir</SelectItem>
                   <SelectItem value="Balochistan">Balochistan</SelectItem>
                   <SelectItem value="Gilgit-Baltistan">Gilgit-Baltistan</SelectItem>
                   <SelectItem value="Islamabad Capital Territory">Islamabad Capital Territory</SelectItem>
                   <SelectItem value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</SelectItem>
                   <SelectItem value="Punjab">Punjab</SelectItem>
                   <SelectItem value="Sindh">Sindh</SelectItem>
                   <SelectItem value="Federally Administered Tribal Areas">Federally Administered Tribal Areas</SelectItem>
                   <SelectItem value="Geneva">Geneva</SelectItem>
                 </SelectContent>
               </Select>
             </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the board..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">
              Update Board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Board Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Board Details</DialogTitle>
            <DialogDescription>
              View detailed information about {viewingBoard?.name}.
            </DialogDescription>
          </DialogHeader>
          {viewingBoard && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Board Name</Label>
                    <p className="text-lg font-semibold">{viewingBoard.name}</p>
                  </div>
                                     <div>
                     <Label className="text-sm font-medium text-muted-foreground">Board Code</Label>
                     <Badge variant="outline" className="text-lg">{viewingBoard.code}</Badge>
                   </div>
                   <div>
                     <Label className="text-sm font-medium text-muted-foreground">State</Label>
                     <p className="text-lg">{viewingBoard.state}</p>
                   </div>
                   <div>
                     <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                     <p className="text-lg">{viewingBoard.created_at}</p>
                   </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-lg">{viewingBoard.updated_at}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                    <p className="text-lg">{viewingBoard.description}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {viewingBoard && (
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                openEditDialog(viewingBoard);
              }} className="bg-blue-600 hover:bg-blue-700">
                Edit Board
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BoardManagement;
