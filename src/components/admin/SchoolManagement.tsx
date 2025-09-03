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
import { Search, Plus, GraduationCap, Edit, Trash2, Eye, RefreshCw, Calendar, MoreHorizontal, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface School {
  id: string;
  name: string;
  code: string;
  type: string;
  address: string;
  city: string;
  state: string;
  board: string;
  phone: string;
  email: string;
  website: string;
  principal: string;
  established_year: number;
  total_students: number;
  total_teachers: number;
  created_at: string;
  updated_at: string;
}

const SchoolManagement: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([
    {
      id: '1',
      name: 'Beaconhouse School System',
      code: 'BSS-001',
      type: 'Private',
      address: '123 Main Street, Gulberg III',
      city: 'Lahore',
      state: 'Punjab',
      board: 'CBSE',
      phone: '+92-42-1234567',
      email: 'info@beaconhouse.edu.pk',
      website: 'www.beaconhouse.edu.pk',
      principal: 'Dr. Sarah Ahmed',
      established_year: 1975,
      total_students: 2500,
      total_teachers: 180,
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '2',
      name: 'Lahore Grammar School',
      code: 'LGS-001',
      type: 'Private',
      address: '456 Mall Road, Gulberg V',
      city: 'Lahore',
      state: 'Punjab',
      board: 'MSBSHSE',
      phone: '+92-42-2345678',
      email: 'info@lgs.edu.pk',
      website: 'www.lgs.edu.pk',
      principal: 'Mr. Ali Hassan',
      established_year: 1979,
      total_students: 3000,
      total_teachers: 220,
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '3',
      name: 'Karachi Public School',
      code: 'KPS-001',
      type: 'Public',
      address: '789 University Road, Gulshan-e-Iqbal',
      city: 'Karachi',
      state: 'Sindh',
      board: 'IB',
      phone: '+92-21-3456789',
      email: 'info@kps.edu.pk',
      website: 'www.kps.edu.pk',
      principal: 'Ms. Fatima Khan',
      established_year: 1985,
      total_students: 1800,
      total_teachers: 120,
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [viewingSchool, setViewingSchool] = useState<School | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: '',
    address: '',
    city: '',
    state: '',
    board: '',
    phone: '',
    email: '',
    website: '',
    principal: '',
    established_year: '',
    total_students: '',
    total_teachers: ''
  });

  const filteredSchools = schools.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         school.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         school.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || !typeFilter || school.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleCreate = () => {
    if (!formData.name || !formData.code || !formData.type || !formData.city || !formData.state || !formData.board) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newSchool: School = {
      id: Date.now().toString(),
      name: formData.name,
      code: formData.code.toUpperCase(),
      type: formData.type,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      board: formData.board,
      phone: formData.phone,
      email: formData.email,
      website: formData.website,
      principal: formData.principal,
      established_year: parseInt(formData.established_year) || 0,
      total_students: parseInt(formData.total_students) || 0,
      total_teachers: parseInt(formData.total_teachers) || 0,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0]
    };

    setSchools([...schools, newSchool]);
    setIsCreateDialogOpen(false);
    resetForm();
    toast.success('School created successfully');
  };

  const handleEdit = () => {
    if (!editingSchool || !formData.name || !formData.code || !formData.type || !formData.city || !formData.state || !formData.board) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedSchools = schools.map(school =>
      school.id === editingSchool.id
        ? {
            ...school,
            name: formData.name,
            code: formData.code.toUpperCase(),
            type: formData.type,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            board: formData.board,
            phone: formData.phone,
            email: formData.email,
            website: formData.website,
            principal: formData.principal,
            established_year: parseInt(formData.established_year) || 0,
            total_students: parseInt(formData.total_students) || 0,
            total_teachers: parseInt(formData.total_teachers) || 0,
            updated_at: new Date().toISOString().split('T')[0]
          }
        : school
    );

    setSchools(updatedSchools);
    setIsEditDialogOpen(false);
    setEditingSchool(null);
    resetForm();
    toast.success('School updated successfully');
  };

  const handleDelete = (schoolId: string) => {
    setSchools(schools.filter(school => school.id !== schoolId));
    toast.success('School deleted successfully');
  };

  const openEditDialog = (school: School) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      code: school.code,
      type: school.type,
      address: school.address,
      city: school.city,
      state: school.state,
      board: school.board,
      phone: school.phone,
      email: school.email,
      website: school.website,
      principal: school.principal,
      established_year: school.established_year.toString(),
      total_students: school.total_students.toString(),
      total_teachers: school.total_teachers.toString()
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (school: School) => {
    setViewingSchool(school);
    setIsViewDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      type: '',
      address: '',
      city: '',
      state: '',
      board: '',
      phone: '',
      email: '',
      website: '',
      principal: '',
      established_year: '',
      total_students: '',
      total_teachers: ''
    });
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'Private':
        return <Badge variant="default" className="bg-blue-600">Private</Badge>;
      case 'Public':
        return <Badge variant="default" className="bg-green-600">Public</Badge>;
      case 'International':
        return <Badge variant="default" className="bg-purple-600">International</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-green-600">School Management</h1>
          <p className="text-muted-foreground">Manage all schools and educational institutions in the system</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create School
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schools.length}</div>
            <p className="text-xs text-muted-foreground">All schools in the system</p>
          </CardContent>
        </Card>

        

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schools.reduce((sum, s) => sum + s.total_students, 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all schools</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schools.reduce((sum, s) => sum + s.total_teachers, 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all schools</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>School Directory</CardTitle>
          <CardDescription>Search and filter schools by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search schools by name, code, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

                         <Select value={typeFilter} onValueChange={setTypeFilter}>
               <SelectTrigger className="w-40">
                 <SelectValue placeholder="All Types" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Types</SelectItem>
                 <SelectItem value="Private">Private</SelectItem>
                 <SelectItem value="Public">Public</SelectItem>
                 <SelectItem value="International">International</SelectItem>
               </SelectContent>
             </Select>

            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schools Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
                             <TableRow>
                 <TableHead>Name</TableHead>
                 <TableHead>Code</TableHead>
                 <TableHead>Type</TableHead>
                 <TableHead>City</TableHead>
                 <TableHead>State</TableHead>
                 <TableHead>Board</TableHead>
                 <TableHead>Students</TableHead>
                 <TableHead>Teachers</TableHead>
                 <TableHead className="text-right">Actions</TableHead>
               </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSchools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">{school.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{school.code}</Badge>
                  </TableCell>
                  <TableCell>{getTypeBadge(school.type)}</TableCell>
                                     <TableCell>{school.city}</TableCell>
                   <TableCell>{school.state}</TableCell>
                   <TableCell>
                     <Badge variant="outline">{school.board}</Badge>
                   </TableCell>
                   <TableCell>{school.total_students.toLocaleString()}</TableCell>
                   <TableCell>{school.total_teachers.toLocaleString()}</TableCell>
                   <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openViewDialog(school)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(school)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit School
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete School
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete School</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{school.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(school.id)}
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

      {/* Create School Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create New School</DialogTitle>
            <DialogDescription>
              Add a new school or educational institution to the system. Fill in the required information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">School Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Beaconhouse School System"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">School Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., BSS-001"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">School Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select school type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Private">Private</SelectItem>
                  <SelectItem value="Public">Public</SelectItem>
                  <SelectItem value="International">International</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g., Lahore"
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
                           <div className="space-y-2">
                <Label htmlFor="board">Board *</Label>
                <Select
                  value={formData.board}
                  onValueChange={(value) => setFormData({ ...formData, board: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a board" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CBSE">CBSE</SelectItem>
                    <SelectItem value="MSBSHSE">MSBSHSE</SelectItem>
                    <SelectItem value="IB">IB</SelectItem>
                    <SelectItem value="Cambridge">Cambridge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., +92-42-1234567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., info@school.edu.pk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="e.g., www.school.edu.pk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="principal">Principal</Label>
              <Input
                id="principal"
                value={formData.principal}
                onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                placeholder="e.g., Dr. Sarah Ahmed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="established_year">Established Year</Label>
              <Input
                id="established_year"
                type="number"
                value={formData.established_year}
                onChange={(e) => setFormData({ ...formData, established_year: e.target.value })}
                placeholder="e.g., 1975"
                min="1800"
                max={new Date().getFullYear()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_students">Total Students</Label>
              <Input
                id="total_students"
                type="number"
                value={formData.total_students}
                onChange={(e) => setFormData({ ...formData, total_students: e.target.value })}
                placeholder="e.g., 2500"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_teachers">Total Teachers</Label>
              <Input
                id="total_teachers"
                type="number"
                value={formData.total_teachers}
                onChange={(e) => setFormData({ ...formData, total_teachers: e.target.value })}
                placeholder="e.g., 180"
                min="0"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address of the school..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700">
              Create School
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit School Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit School</DialogTitle>
            <DialogDescription>
              Update the information for {editingSchool?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">School Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Beaconhouse School System"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">School Code *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., BSS-001"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">School Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select school type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Private">Private</SelectItem>
                  <SelectItem value="Public">Public</SelectItem>
                  <SelectItem value="International">International</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city">City *</Label>
              <Input
                id="edit-city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g., Lahore"
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
                           <div className="space-y-2">
                <Label htmlFor="edit-board">Board *</Label>
                <Select
                  value={formData.board}
                  onValueChange={(value) => setFormData({ ...formData, board: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a board" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CBSE">CBSE</SelectItem>
                    <SelectItem value="MSBSHSE">MSBSHSE</SelectItem>
                    <SelectItem value="IB">IB</SelectItem>
                    <SelectItem value="Cambridge">Cambridge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., +92-42-1234567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., info@school.edu.pk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-website">Website</Label>
              <Input
                id="edit-website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="e.g., www.school.edu.pk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-principal">Principal</Label>
              <Input
                id="edit-principal"
                value={formData.principal}
                onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                placeholder="e.g., Dr. Sarah Ahmed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-established_year">Established Year</Label>
              <Input
                id="edit-established_year"
                type="number"
                value={formData.established_year}
                onChange={(e) => setFormData({ ...formData, established_year: e.target.value })}
                placeholder="e.g., 1975"
                min="1800"
                max={new Date().getFullYear()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-total_students">Total Students</Label>
              <Input
                id="edit-total_students"
                type="number"
                value={formData.total_students}
                onChange={(e) => setFormData({ ...formData, total_students: e.target.value })}
                placeholder="e.g., 2500"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-total_teachers">Total Teachers</Label>
              <Input
                id="edit-total_teachers"
                type="number"
                value={formData.total_teachers}
                onChange={(e) => setFormData({ ...formData, total_teachers: e.target.value })}
                placeholder="e.g., 180"
                min="0"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address of the school..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">
              Update School
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View School Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>School Details</DialogTitle>
            <DialogDescription>
              View detailed information about {viewingSchool?.name}.
            </DialogDescription>
          </DialogHeader>
          {viewingSchool && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">School Name</Label>
                    <p className="text-lg font-semibold">{viewingSchool.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">School Code</Label>
                    <Badge variant="outline" className="text-lg">{viewingSchool.code}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                    <div className="mt-1">{getTypeBadge(viewingSchool.type)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">City</Label>
                    <p className="text-lg">{viewingSchool.city}</p>
                  </div>
                                     <div>
                     <Label className="text-sm font-medium text-muted-foreground">State</Label>
                     <p className="text-lg">{viewingSchool.state}</p>
                   </div>
                   <div>
                     <Label className="text-sm font-medium text-muted-foreground">Board</Label>
                     <Badge variant="outline" className="text-lg">{viewingSchool.board}</Badge>
                   </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                    <p className="text-lg flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {viewingSchool.phone}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p className="text-lg flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {viewingSchool.email}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Website</Label>
                    <p className="text-lg flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {viewingSchool.website}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Principal</Label>
                    <p className="text-lg">{viewingSchool.principal}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Established Year</Label>
                    <p className="text-lg">{viewingSchool.established_year}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Total Students</Label>
                    <p className="text-lg">{viewingSchool.total_students.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Total Teachers</Label>
                    <p className="text-lg">{viewingSchool.total_teachers.toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="text-lg">{viewingSchool.created_at}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-lg">{viewingSchool.updated_at}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                    <p className="text-lg flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                      {viewingSchool.address}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {viewingSchool && (
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                openEditDialog(viewingSchool);
              }} className="bg-blue-600 hover:bg-blue-700">
                Edit School
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchoolManagement;
