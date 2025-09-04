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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, MapPin, Building2, GraduationCap, Edit, Trash2, Eye, RefreshCw, Calendar, FileText, MoreHorizontal, Phone, Mail, Globe, Users2 } from 'lucide-react';
import { toast } from 'sonner';

interface MultitenancyProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

// State interface and data
interface State {
  id: string;
  name: string;
  code: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// Board interface and data
interface Board {
  id: string;
  name: string;
  code: string;
  state: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// School interface and data
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

export const Multitenancy = ({ userProfile }: MultitenancyProps) => {
  // States Management
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

  // Boards Management
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

  // Schools Management
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

  // Common state for all tabs
  const [activeTab, setActiveTab] = useState('states');
  const [searchTerm, setSearchTerm] = useState('');
  
  // States specific state
  const [isStateCreateDialogOpen, setIsStateCreateDialogOpen] = useState(false);
  const [isStateEditDialogOpen, setIsStateEditDialogOpen] = useState(false);
  const [isStateViewDialogOpen, setIsStateViewDialogOpen] = useState(false);
  const [editingState, setEditingState] = useState<State | null>(null);
  const [viewingState, setViewingState] = useState<State | null>(null);
  const [stateFormData, setStateFormData] = useState({
    name: '',
    code: '',
    description: ''
  });

  // Boards specific state
  const [isBoardCreateDialogOpen, setIsBoardCreateDialogOpen] = useState(false);
  const [isBoardEditDialogOpen, setIsBoardEditDialogOpen] = useState(false);
  const [isBoardViewDialogOpen, setIsBoardViewDialogOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [viewingBoard, setViewingBoard] = useState<Board | null>(null);
  const [boardFormData, setBoardFormData] = useState({
    name: '',
    code: '',
    state: '',
    description: ''
  });

  // Schools specific state
  const [typeFilter, setTypeFilter] = useState('all');
  const [isSchoolCreateDialogOpen, setIsSchoolCreateDialogOpen] = useState(false);
  const [isSchoolEditDialogOpen, setIsSchoolEditDialogOpen] = useState(false);
  const [isSchoolViewDialogOpen, setIsSchoolViewDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [viewingSchool, setViewingSchool] = useState<School | null>(null);
  const [schoolFormData, setSchoolFormData] = useState({
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

  // Filter functions
  const filteredStates = states.filter(state => {
    const matchesSearch = state.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         state.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredBoards = boards.filter(board => {
    const matchesSearch = board.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         board.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredSchools = schools.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         school.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         school.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || !typeFilter || school.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // States handlers
  const handleStateCreate = () => {
    if (!stateFormData.name || !stateFormData.code) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newState: State = {
      id: Date.now().toString(),
      name: stateFormData.name,
      code: stateFormData.code.toUpperCase(),
      description: stateFormData.description,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0]
    };

    setStates([...states, newState]);
    setIsStateCreateDialogOpen(false);
    resetStateForm();
    toast.success('State created successfully');
  };

  const handleStateEdit = () => {
    if (!editingState || !stateFormData.name || !stateFormData.code) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedStates = states.map(state =>
      state.id === editingState.id
        ? {
            ...state,
            name: stateFormData.name,
            code: stateFormData.code.toUpperCase(),
            description: stateFormData.description,
            updated_at: new Date().toISOString().split('T')[0]
          }
        : state
    );

    setStates(updatedStates);
    setIsStateEditDialogOpen(false);
    setEditingState(null);
    resetStateForm();
    toast.success('State updated successfully');
  };

  const handleStateDelete = (stateId: string) => {
    setStates(states.filter(state => state.id !== stateId));
    toast.success('State deleted successfully');
  };

  const openStateEditDialog = (state: State) => {
    setEditingState(state);
    setStateFormData({
      name: state.name,
      code: state.code,
      description: state.description
    });
    setIsStateEditDialogOpen(true);
  };

  const openStateViewDialog = (state: State) => {
    setViewingState(state);
    setIsStateViewDialogOpen(true);
  };

  const resetStateForm = () => {
    setStateFormData({
      name: '',
      code: '',
      description: ''
    });
  };

  // Boards handlers
  const handleBoardCreate = () => {
    if (!boardFormData.name || !boardFormData.code || !boardFormData.state) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newBoard: Board = {
      id: Date.now().toString(),
      name: boardFormData.name,
      code: boardFormData.code.toUpperCase(),
      state: boardFormData.state,
      description: boardFormData.description,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0]
    };

    setBoards([...boards, newBoard]);
    setIsBoardCreateDialogOpen(false);
    resetBoardForm();
    toast.success('Board created successfully');
  };

  const handleBoardEdit = () => {
    if (!editingBoard || !boardFormData.name || !boardFormData.code || !boardFormData.state) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedBoards = boards.map(board =>
      board.id === editingBoard.id
        ? {
            ...board,
            name: boardFormData.name,
            code: boardFormData.code.toUpperCase(),
            state: boardFormData.state,
            description: boardFormData.description,
            updated_at: new Date().toISOString().split('T')[0]
          }
        : board
    );

    setBoards(updatedBoards);
    setIsBoardEditDialogOpen(false);
    setEditingBoard(null);
    resetBoardForm();
    toast.success('Board updated successfully');
  };

  const handleBoardDelete = (boardId: string) => {
    setBoards(boards.filter(board => board.id !== boardId));
    toast.success('Board deleted successfully');
  };

  const openBoardEditDialog = (board: Board) => {
    setEditingBoard(board);
    setBoardFormData({
      name: board.name,
      code: board.code,
      state: board.state,
      description: board.description
    });
    setIsBoardEditDialogOpen(true);
  };

  const openBoardViewDialog = (board: Board) => {
    setViewingBoard(board);
    setIsBoardViewDialogOpen(true);
  };

  const resetBoardForm = () => {
    setBoardFormData({
      name: '',
      code: '',
      state: '',
      description: ''
    });
  };

  // Schools handlers
  const handleSchoolCreate = () => {
    if (!schoolFormData.name || !schoolFormData.code || !schoolFormData.type || !schoolFormData.city || !schoolFormData.state || !schoolFormData.board) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newSchool: School = {
      id: Date.now().toString(),
      name: schoolFormData.name,
      code: schoolFormData.code.toUpperCase(),
      type: schoolFormData.type,
      address: schoolFormData.address,
      city: schoolFormData.city,
      state: schoolFormData.state,
      board: schoolFormData.board,
      phone: schoolFormData.phone,
      email: schoolFormData.email,
      website: schoolFormData.website,
      principal: schoolFormData.principal,
      established_year: parseInt(schoolFormData.established_year) || 0,
      total_students: parseInt(schoolFormData.total_students) || 0,
      total_teachers: parseInt(schoolFormData.total_teachers) || 0,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0]
    };

    setSchools([...schools, newSchool]);
    setIsSchoolCreateDialogOpen(false);
    resetSchoolForm();
    toast.success('School created successfully');
  };

  const handleSchoolEdit = () => {
    if (!editingSchool || !schoolFormData.name || !schoolFormData.code || !schoolFormData.type || !schoolFormData.city || !schoolFormData.state || !schoolFormData.board) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedSchools = schools.map(school =>
      school.id === editingSchool.id
        ? {
            ...school,
            name: schoolFormData.name,
            code: schoolFormData.code.toUpperCase(),
            type: schoolFormData.type,
            address: schoolFormData.address,
            city: schoolFormData.city,
            state: schoolFormData.state,
            board: schoolFormData.board,
            phone: schoolFormData.phone,
            email: schoolFormData.email,
            website: schoolFormData.website,
            principal: schoolFormData.principal,
            established_year: parseInt(schoolFormData.established_year) || 0,
            total_students: parseInt(schoolFormData.total_students) || 0,
            total_teachers: parseInt(schoolFormData.total_teachers) || 0,
            updated_at: new Date().toISOString().split('T')[0]
          }
        : school
    );

    setSchools(updatedSchools);
    setIsSchoolEditDialogOpen(false);
    setEditingSchool(null);
    resetSchoolForm();
    toast.success('School updated successfully');
  };

  const handleSchoolDelete = (schoolId: string) => {
    setSchools(schools.filter(school => school.id !== schoolId));
    toast.success('School deleted successfully');
  };

  const openSchoolEditDialog = (school: School) => {
    setEditingSchool(school);
    setSchoolFormData({
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
    setIsSchoolEditDialogOpen(true);
  };

  const openSchoolViewDialog = (school: School) => {
    setViewingSchool(school);
    setIsSchoolViewDialogOpen(true);
  };

  const resetSchoolForm = () => {
    setSchoolFormData({
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
        return <Badge variant="default" className="bg-[#8DC63F]">Public</Badge>;
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
          <h1 className="text-3xl font-bold text-[#8DC63F]">Multitenancy Management</h1>
          <p className="text-muted-foreground">Manage organizational hierarchy: states, boards, and schools</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-3 min-w-fit">
            <TabsTrigger value="states" className="text-xs sm:text-sm">
              <MapPin className="w-4 h-4 mr-2" />
              States
            </TabsTrigger>
            <TabsTrigger value="boards" className="text-xs sm:text-sm">
              <Building2 className="w-4 h-4 mr-2" />
              Boards
            </TabsTrigger>
            <TabsTrigger value="schools" className="text-xs sm:text-sm">
              <GraduationCap className="w-4 h-4 mr-2" />
              Schools
            </TabsTrigger>
          </TabsList>
        </div>

        {/* States Tab */}
        <TabsContent value="states" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#8DC63F]">States Management</h2>
              <p className="text-muted-foreground">Manage all states and territories in the system</p>
            </div>
            <Button
              onClick={() => setIsStateCreateDialogOpen(true)}
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create State
            </Button>
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
                    placeholder="Search states by name or code..."
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
                            <DropdownMenuItem onClick={() => openStateViewDialog(state)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openStateEditDialog(state)}>
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
                                    onClick={() => handleStateDelete(state.id)}
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
        </TabsContent>

        {/* Boards Tab */}
        <TabsContent value="boards" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#8DC63F]">Board Management</h2>
              <p className="text-muted-foreground">Manage all educational boards and examination bodies in the system</p>
            </div>
            <Button
              onClick={() => setIsBoardCreateDialogOpen(true)}
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Board
            </Button>
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
                            <DropdownMenuItem onClick={() => openBoardViewDialog(board)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openBoardEditDialog(board)}>
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
                                    onClick={() => handleBoardDelete(board.id)}
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
        </TabsContent>

        {/* Schools Tab */}
        <TabsContent value="schools" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#8DC63F]">School Management</h2>
              <p className="text-muted-foreground">Manage all schools and educational institutions in the system</p>
            </div>
            <Button
              onClick={() => setIsSchoolCreateDialogOpen(true)}
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create School
            </Button>
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
                <Users2 className="h-4 w-4 text-muted-foreground" />
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
                            <DropdownMenuItem onClick={() => openSchoolViewDialog(school)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openSchoolEditDialog(school)}>
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
                                    onClick={() => handleSchoolDelete(school.id)}
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
        </TabsContent>
      </Tabs>

      {/* State Dialogs */}
      {/* Create State Dialog */}
      <Dialog open={isStateCreateDialogOpen} onOpenChange={setIsStateCreateDialogOpen}>
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
                value={stateFormData.name}
                onChange={(e) => setStateFormData({ ...stateFormData, name: e.target.value })}
                placeholder="e.g., California"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">State Code *</Label>
              <Input
                id="code"
                value={stateFormData.code}
                onChange={(e) => setStateFormData({ ...stateFormData, code: e.target.value })}
                placeholder="e.g., CA"
                maxLength={3}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={stateFormData.description}
                onChange={(e) => setStateFormData({ ...stateFormData, description: e.target.value })}
                placeholder="Brief description of the state..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStateCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStateCreate} className="bg-[#8DC63F] hover:bg-[#8DC63F]/90">
              Create State
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit State Dialog */}
      <Dialog open={isStateEditDialogOpen} onOpenChange={setIsStateEditDialogOpen}>
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
                value={stateFormData.name}
                onChange={(e) => setStateFormData({ ...stateFormData, name: e.target.value })}
                placeholder="e.g., California"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">State Code *</Label>
              <Input
                id="edit-code"
                value={stateFormData.code}
                onChange={(e) => setStateFormData({ ...stateFormData, code: e.target.value })}
                placeholder="e.g., CA"
                maxLength={3}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={stateFormData.description}
                onChange={(e) => setStateFormData({ ...stateFormData, description: e.target.value })}
                placeholder="Brief description of the state..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStateEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStateEdit} className="bg-blue-600 hover:bg-blue-700">
              Update State
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View State Dialog */}
      <Dialog open={isStateViewDialogOpen} onOpenChange={setIsStateViewDialogOpen}>
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
            <Button variant="outline" onClick={() => setIsStateViewDialogOpen(false)}>
              Close
            </Button>
            {viewingState && (
              <Button onClick={() => {
                setIsStateViewDialogOpen(false);
                openStateEditDialog(viewingState);
              }} className="bg-blue-600 hover:bg-blue-700">
                Edit State
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Board Dialogs */}
      {/* Create Board Dialog */}
      <Dialog open={isBoardCreateDialogOpen} onOpenChange={setIsBoardCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
            <DialogDescription>
              Add a new educational board or examination body to the system. Fill in the required information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="board-name">Board Name *</Label>
              <Input
                id="board-name"
                value={boardFormData.name}
                onChange={(e) => setBoardFormData({ ...boardFormData, name: e.target.value })}
                placeholder="e.g., Central Board of Secondary Education"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-code">Board Code *</Label>
              <Input
                id="board-code"
                value={boardFormData.code}
                onChange={(e) => setBoardFormData({ ...boardFormData, code: e.target.value })}
                placeholder="e.g., CBSE"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-state">State *</Label>
              <Select
                value={boardFormData.state}
                onValueChange={(value) => setBoardFormData({ ...boardFormData, state: value })}
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
              <Label htmlFor="board-description">Description</Label>
              <Textarea
                id="board-description"
                value={boardFormData.description}
                onChange={(e) => setBoardFormData({ ...boardFormData, description: e.target.value })}
                placeholder="Brief description of the board..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBoardCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBoardCreate} className="bg-[#8DC63F] hover:bg-[#8DC63F]/90">
              Create Board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Board Dialog */}
      <Dialog open={isBoardEditDialogOpen} onOpenChange={setIsBoardEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Board</DialogTitle>
            <DialogDescription>
              Update the information for {editingBoard?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-board-name">Board Name *</Label>
              <Input
                id="edit-board-name"
                value={boardFormData.name}
                onChange={(e) => setBoardFormData({ ...boardFormData, name: e.target.value })}
                placeholder="e.g., Central Board of Secondary Education"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-board-code">Board Code *</Label>
              <Input
                id="edit-board-code"
                value={boardFormData.code}
                onChange={(e) => setBoardFormData({ ...boardFormData, code: e.target.value })}
                placeholder="e.g., CBSE"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-board-state">State *</Label>
              <Select
                value={boardFormData.state}
                onValueChange={(value) => setBoardFormData({ ...boardFormData, state: value })}
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
              <Label htmlFor="edit-board-description">Description</Label>
              <Textarea
                id="edit-board-description"
                value={boardFormData.description}
                onChange={(e) => setBoardFormData({ ...boardFormData, description: e.target.value })}
                placeholder="Brief description of the board..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBoardEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBoardEdit} className="bg-blue-600 hover:bg-blue-700">
              Update Board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Board Dialog */}
      <Dialog open={isBoardViewDialogOpen} onOpenChange={setIsBoardViewDialogOpen}>
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
            <Button variant="outline" onClick={() => setIsBoardViewDialogOpen(false)}>
              Close
            </Button>
            {viewingBoard && (
              <Button onClick={() => {
                setIsBoardViewDialogOpen(false);
                openBoardEditDialog(viewingBoard);
              }} className="bg-blue-600 hover:bg-blue-700">
                Edit Board
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* School Dialogs */}
      {/* Create School Dialog */}
      <Dialog open={isSchoolCreateDialogOpen} onOpenChange={setIsSchoolCreateDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create New School</DialogTitle>
            <DialogDescription>
              Add a new school or educational institution to the system. Fill in the required information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="school-name">School Name *</Label>
              <Input
                id="school-name"
                value={schoolFormData.name}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, name: e.target.value })}
                placeholder="e.g., Beaconhouse School System"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-code">School Code *</Label>
              <Input
                id="school-code"
                value={schoolFormData.code}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, code: e.target.value })}
                placeholder="e.g., BSS-001"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-type">School Type *</Label>
              <Select
                value={schoolFormData.type}
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, type: value })}
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
              <Label htmlFor="school-city">City *</Label>
              <Input
                id="school-city"
                value={schoolFormData.city}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, city: e.target.value })}
                placeholder="e.g., Lahore"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-state">State *</Label>
              <Select
                value={schoolFormData.state}
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, state: value })}
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
              <Label htmlFor="school-board">Board *</Label>
              <Select
                value={schoolFormData.board}
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, board: value })}
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
              <Label htmlFor="school-phone">Phone</Label>
              <Input
                id="school-phone"
                value={schoolFormData.phone}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, phone: e.target.value })}
                placeholder="e.g., +92-42-1234567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-email">Email</Label>
              <Input
                id="school-email"
                type="email"
                value={schoolFormData.email}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, email: e.target.value })}
                placeholder="e.g., info@school.edu.pk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-website">Website</Label>
              <Input
                id="school-website"
                value={schoolFormData.website}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, website: e.target.value })}
                placeholder="e.g., www.school.edu.pk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-principal">Principal</Label>
              <Input
                id="school-principal"
                value={schoolFormData.principal}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, principal: e.target.value })}
                placeholder="e.g., Dr. Sarah Ahmed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-established_year">Established Year</Label>
              <Input
                id="school-established_year"
                type="number"
                value={schoolFormData.established_year}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, established_year: e.target.value })}
                placeholder="e.g., 1975"
                min="1800"
                max={new Date().getFullYear()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-total_students">Total Students</Label>
              <Input
                id="school-total_students"
                type="number"
                value={schoolFormData.total_students}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, total_students: e.target.value })}
                placeholder="e.g., 2500"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-total_teachers">Total Teachers</Label>
              <Input
                id="school-total_teachers"
                type="number"
                value={schoolFormData.total_teachers}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, total_teachers: e.target.value })}
                placeholder="e.g., 180"
                min="0"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="school-address">Address</Label>
              <Textarea
                id="school-address"
                value={schoolFormData.address}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, address: e.target.value })}
                placeholder="Full address of the school..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSchoolCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSchoolCreate} className="bg-[#8DC63F] hover:bg-[#8DC63F]/90">
              Create School
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit School Dialog */}
      <Dialog open={isSchoolEditDialogOpen} onOpenChange={setIsSchoolEditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit School</DialogTitle>
            <DialogDescription>
              Update the information for {editingSchool?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="edit-school-name">School Name *</Label>
              <Input
                id="edit-school-name"
                value={schoolFormData.name}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, name: e.target.value })}
                placeholder="e.g., Beaconhouse School System"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-code">School Code *</Label>
              <Input
                id="edit-school-code"
                value={schoolFormData.code}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, code: e.target.value })}
                placeholder="e.g., BSS-001"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-type">School Type *</Label>
              <Select
                value={schoolFormData.type}
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, type: value })}
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
              <Label htmlFor="edit-school-city">City *</Label>
              <Input
                id="edit-school-city"
                value={schoolFormData.city}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, city: e.target.value })}
                placeholder="e.g., Lahore"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-state">State *</Label>
              <Select
                value={schoolFormData.state}
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, state: value })}
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
              <Label htmlFor="edit-school-board">Board *</Label>
              <Select
                value={schoolFormData.board}
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, board: value })}
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
              <Label htmlFor="edit-school-phone">Phone</Label>
              <Input
                id="edit-school-phone"
                value={schoolFormData.phone}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, phone: e.target.value })}
                placeholder="e.g., +92-42-1234567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-email">Email</Label>
              <Input
                id="edit-school-email"
                type="email"
                value={schoolFormData.email}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, email: e.target.value })}
                placeholder="e.g., info@school.edu.pk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-website">Website</Label>
              <Input
                id="edit-school-website"
                value={schoolFormData.website}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, website: e.target.value })}
                placeholder="e.g., www.school.edu.pk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-principal">Principal</Label>
              <Input
                id="edit-school-principal"
                value={schoolFormData.principal}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, principal: e.target.value })}
                placeholder="e.g., Dr. Sarah Ahmed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-established_year">Established Year</Label>
              <Input
                id="edit-school-established_year"
                type="number"
                value={schoolFormData.established_year}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, established_year: e.target.value })}
                placeholder="e.g., 1975"
                min="1800"
                max={new Date().getFullYear()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-total_students">Total Students</Label>
              <Input
                id="edit-school-total_students"
                type="number"
                value={schoolFormData.total_students}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, total_students: e.target.value })}
                placeholder="e.g., 2500"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-total_teachers">Total Teachers</Label>
              <Input
                id="edit-school-total_teachers"
                type="number"
                value={schoolFormData.total_teachers}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, total_teachers: e.target.value })}
                placeholder="e.g., 180"
                min="0"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-school-address">Address</Label>
              <Textarea
                id="edit-school-address"
                value={schoolFormData.address}
                onChange={(e) => setSchoolFormData({ ...schoolFormData, address: e.target.value })}
                placeholder="Full address of the school..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSchoolEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSchoolEdit} className="bg-blue-600 hover:bg-blue-700">
              Update School
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View School Dialog */}
      <Dialog open={isSchoolViewDialogOpen} onOpenChange={setIsSchoolViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>School Details</DialogTitle>
            <DialogDescription>
              View detailed information about {viewingSchool?.name}.
            </DialogDescription>
          </DialogHeader>
          {viewingSchool && (
            <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
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
            <Button variant="outline" onClick={() => setIsSchoolViewDialogOpen(false)}>
              Close
            </Button>
            {viewingSchool && (
              <Button onClick={() => {
                setIsSchoolViewDialogOpen(false);
                openSchoolEditDialog(viewingSchool);
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