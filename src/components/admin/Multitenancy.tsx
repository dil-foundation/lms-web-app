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
import { Search, Plus, MapPin, Building2, GraduationCap, Edit, Trash2, Eye, RefreshCw, Calendar, FileText, MoreHorizontal, Phone, Mail, Globe, Users2, Building, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

interface MultitenancyProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

// Country interface and data
interface Country {
  id: string;
  name: string;
  code: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// Region interface and data
interface Region {
  id: string;
  name: string;
  code: string;
  country: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// City interface and data
interface City {
  id: string;
  name: string;
  code: string;
  country: string;
  region: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// Project interface and data
interface Project {
  id: string;
  name: string;
  code: string;
  country: string;
  region: string;
  city: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// Board interface and data
interface Board {
  id: string;
  name: string;
  code: string;
  country: string;
  region: string;
  city: string;
  project: string;
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
  country: string;
  region: string;
  city: string;
  project: string;
  board: string;
  phone: string;
  email: string;
  website: string;
  created_at: string;
  updated_at: string;
}

export const Multitenancy = ({ userProfile }: MultitenancyProps) => {
  // Countries Management
  const [countries, setCountries] = useState<Country[]>([
    {
      id: '1',
      name: 'Pakistan',
      code: 'PK',
      description: 'Islamic Republic of Pakistan, a country in South Asia.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '2',
      name: 'United States',
      code: 'US',
      description: 'United States of America, a federal republic in North America.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '3',
      name: 'United Kingdom',
      code: 'UK',
      description: 'United Kingdom of Great Britain and Northern Ireland.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    }
  ]);

  // Regions Management
  const [regions, setRegions] = useState<Region[]>([
    {
      id: '1',
      name: 'Lahore',
      code: 'LHR',
      country: 'Pakistan',
      description: 'The cultural capital of Pakistan, known for its rich history and vibrant culture.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '2',
      name: 'Karachi',
      code: 'KHI',
      country: 'Pakistan',
      description: 'The economic hub of Pakistan, largest region by population.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '3',
      name: 'New York',
      code: 'NYC',
      country: 'United States',
      description: 'The Big Apple, financial capital of the world.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    }
  ]);

  // Cities Management
  const [cities, setCities] = useState<City[]>([
    {
      id: '1',
      name: 'Lahore',
      code: 'LHE',
      country: 'Pakistan',
      region: 'Lahore',
      description: 'The cultural capital of Pakistan, known for its rich history and vibrant culture.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '2',
      name: 'Karachi',
      code: 'KHI',
      country: 'Pakistan',
      region: 'Karachi',
      description: 'The economic hub of Pakistan, largest city by population.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '3',
      name: 'New York City',
      code: 'NYC',
      country: 'United States',
      region: 'New York',
      description: 'The Big Apple, financial capital of the world.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '4',
      name: 'London',
      code: 'LON',
      country: 'United Kingdom',
      region: 'England',
      description: 'The capital and largest city of England and the United Kingdom.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    }
  ]);

  // Projects Management
  const [projects, setProjects] = useState<Project[]>([
    {
      id: '1',
      name: 'Digital Learning Initiative',
      code: 'DLI-001',
      country: 'Pakistan',
      region: 'Lahore',
      city: 'Lahore',
      description: 'A comprehensive digital learning platform for schools in Lahore.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '2',
      name: 'Smart Education Hub',
      code: 'SEH-001',
      country: 'Pakistan',
      region: 'Karachi',
      city: 'Karachi',
      description: 'Modern educational technology integration project for Karachi schools.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '3',
      name: 'Global Learning Network',
      code: 'GLN-001',
      country: 'United States',
      region: 'New York',
      city: 'New York City',
      description: 'International collaboration project for educational excellence.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '4',
      name: 'Future Schools Program',
      code: 'FSP-001',
      country: 'United Kingdom',
      region: 'England',
      city: 'London',
      description: 'Innovative teaching methods and technology adoption program.',
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
      country: 'Pakistan',
      region: 'Islamabad Capital Territory',
      city: 'Islamabad',
      project: 'Digital Learning Initiative',
      description: 'The Federal Board of Intermediate and Secondary Education is a federal level board of education in Pakistan for public and private schools.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '2',
      name: 'Punjab Board of Intermediate and Secondary Education',
      code: 'PBISE',
      country: 'Pakistan',
      region: 'Lahore',
      city: 'Lahore',
      project: 'Digital Learning Initiative',
      description: 'Punjab Board of Intermediate and Secondary Education is the provincial education board of Punjab, Pakistan.',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '3',
      name: 'International Baccalaureate',
      code: 'IB',
      country: 'United Kingdom',
      region: 'England',
      city: 'London',
      project: 'Future Schools Program',
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
      country: 'Pakistan',
      region: 'Lahore',
      city: 'Lahore',
      project: 'Digital Learning Initiative',
      board: 'CBSE',
      phone: '+92-42-1234567',
      email: 'info@beaconhouse.edu.pk',
      website: 'www.beaconhouse.edu.pk',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '2',
      name: 'Lahore Grammar School',
      code: 'LGS-001',
      type: 'Private',
      address: '456 Mall Road, Gulberg V',
      country: 'Pakistan',
      region: 'Lahore',
      city: 'Lahore',
      project: 'Digital Learning Initiative',
      board: 'MSBSHSE',
      phone: '+92-42-2345678',
      email: 'info@lgs.edu.pk',
      website: 'www.lgs.edu.pk',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '3',
      name: 'Karachi Public School',
      code: 'KPS-001',
      type: 'Public',
      address: '789 University Road, Gulshan-e-Iqbal',
      country: 'Pakistan',
      region: 'Karachi',
      city: 'Karachi',
      project: 'Smart Education Hub',
      board: 'IB',
      phone: '+92-21-3456789',
      email: 'info@kps.edu.pk',
      website: 'www.kps.edu.pk',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    }
  ]);

  // Common state for all tabs
  const [activeTab, setActiveTab] = useState('countries');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Countries specific state
  const [isCountryCreateDialogOpen, setIsCountryCreateDialogOpen] = useState(false);
  const [isCountryEditDialogOpen, setIsCountryEditDialogOpen] = useState(false);
  const [isCountryViewDialogOpen, setIsCountryViewDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [viewingCountry, setViewingCountry] = useState<Country | null>(null);
  const [countryFormData, setCountryFormData] = useState({
    name: '',
    code: '',
    description: ''
  });

  // Regions specific state
  const [isRegionCreateDialogOpen, setIsRegionCreateDialogOpen] = useState(false);
  const [isRegionEditDialogOpen, setIsRegionEditDialogOpen] = useState(false);
  const [isRegionViewDialogOpen, setIsRegionViewDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [viewingRegion, setViewingRegion] = useState<Region | null>(null);
  const [regionFormData, setRegionFormData] = useState({
    name: '',
    code: '',
    country: '',
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
    country: '',
    region: '',
    city: '',
    project: '',
    description: ''
  });

  // Cities specific state
  const [isCityCreateDialogOpen, setIsCityCreateDialogOpen] = useState(false);
  const [isCityEditDialogOpen, setIsCityEditDialogOpen] = useState(false);
  const [isCityViewDialogOpen, setIsCityViewDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [viewingCity, setViewingCity] = useState<City | null>(null);
  const [cityFormData, setCityFormData] = useState({
    name: '',
    code: '',
    country: '',
    region: '',
    description: ''
  });

  // Projects specific state
  const [isProjectCreateDialogOpen, setIsProjectCreateDialogOpen] = useState(false);
  const [isProjectEditDialogOpen, setIsProjectEditDialogOpen] = useState(false);
  const [isProjectViewDialogOpen, setIsProjectViewDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [projectFormData, setProjectFormData] = useState({
    name: '',
    code: '',
    country: '',
    region: '',
    city: '',
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
    country: '',
    region: '',
    city: '',
    project: '',
    board: '',
    phone: '',
    email: '',
    website: ''
  });

  // Filter functions
  const filteredCountries = countries.filter(country => {
    const matchesSearch = country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         country.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredRegions = regions.filter(region => {
    const matchesSearch = region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         region.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredCities = cities.filter(city => {
    const matchesSearch = city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         city.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.code.toLowerCase().includes(searchTerm.toLowerCase());
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
                         school.region.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || !typeFilter || school.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Countries handlers
  const handleCountryCreate = () => {
    if (!countryFormData.name || !countryFormData.code) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newCountry: Country = {
      id: Date.now().toString(),
      name: countryFormData.name,
      code: countryFormData.code.toUpperCase(),
      description: countryFormData.description,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0]
    };

    setCountries([...countries, newCountry]);
    setIsCountryCreateDialogOpen(false);
    resetCountryForm();
    toast.success('Country created successfully');
  };

  const handleCountryEdit = () => {
    if (!editingCountry || !countryFormData.name || !countryFormData.code) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedCountries = countries.map(country =>
      country.id === editingCountry.id
        ? {
            ...country,
            name: countryFormData.name,
            code: countryFormData.code.toUpperCase(),
            description: countryFormData.description,
            updated_at: new Date().toISOString().split('T')[0]
          }
        : country
    );

    setCountries(updatedCountries);
    setIsCountryEditDialogOpen(false);
    setEditingCountry(null);
    resetCountryForm();
    toast.success('Country updated successfully');
  };

  const handleCountryDelete = (countryId: string) => {
    setCountries(countries.filter(country => country.id !== countryId));
    toast.success('Country deleted successfully');
  };

  const openCountryEditDialog = (country: Country) => {
    setEditingCountry(country);
    setCountryFormData({
      name: country.name,
      code: country.code,
      description: country.description
    });
    setIsCountryEditDialogOpen(true);
  };

  const openCountryViewDialog = (country: Country) => {
    setViewingCountry(country);
    setIsCountryViewDialogOpen(true);
  };

  const resetCountryForm = () => {
    setCountryFormData({
      name: '',
      code: '',
      description: ''
    });
  };

  // Regions handlers
  const handleRegionCreate = () => {
    if (!regionFormData.name || !regionFormData.code || !regionFormData.country) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newRegion: Region = {
      id: Date.now().toString(),
      name: regionFormData.name,
      code: regionFormData.code.toUpperCase(),
      country: regionFormData.country,
      description: regionFormData.description,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0]
    };

    setRegions([...regions, newRegion]);
    setIsRegionCreateDialogOpen(false);
    resetRegionForm();
    toast.success('Region created successfully');
  };

  const handleRegionEdit = () => {
    if (!editingRegion || !regionFormData.name || !regionFormData.code || !regionFormData.country) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedRegions = regions.map(region =>
      region.id === editingRegion.id
        ? {
            ...region,
            name: regionFormData.name,
            code: regionFormData.code.toUpperCase(),
            country: regionFormData.country,
            description: regionFormData.description,
            updated_at: new Date().toISOString().split('T')[0]
          }
        : region
    );

    setRegions(updatedRegions);
    setIsRegionEditDialogOpen(false);
    setEditingRegion(null);
    resetRegionForm();
    toast.success('Region updated successfully');
  };

  const handleRegionDelete = (regionId: string) => {
    setRegions(regions.filter(region => region.id !== regionId));
    toast.success('Region deleted successfully');
  };

  const openRegionEditDialog = (region: Region) => {
    setEditingRegion(region);
    setRegionFormData({
      name: region.name,
      code: region.code,
      country: region.country,
      description: region.description
    });
    setIsRegionEditDialogOpen(true);
  };

  const openRegionViewDialog = (region: Region) => {
    setViewingRegion(region);
    setIsRegionViewDialogOpen(true);
  };

  const resetRegionForm = () => {
    setRegionFormData({
      name: '',
      code: '',
      country: '',
      description: ''
    });
  };

  // Cities handlers
  const handleCityCreate = () => {
    if (!cityFormData.name || !cityFormData.code || !cityFormData.country || !cityFormData.region) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newCity: City = {
      id: Date.now().toString(),
      name: cityFormData.name,
      code: cityFormData.code.toUpperCase(),
      country: cityFormData.country,
      region: cityFormData.region,
      description: cityFormData.description,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0]
    };

    setCities([...cities, newCity]);
    setIsCityCreateDialogOpen(false);
    resetCityForm();
    toast.success('City created successfully');
  };

  const handleCityEdit = () => {
    if (!editingCity || !cityFormData.name || !cityFormData.code || !cityFormData.country || !cityFormData.region) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedCities = cities.map(city =>
      city.id === editingCity.id
        ? {
            ...city,
            name: cityFormData.name,
            code: cityFormData.code.toUpperCase(),
            country: cityFormData.country,
            region: cityFormData.region,
            description: cityFormData.description,
            updated_at: new Date().toISOString().split('T')[0]
          }
        : city
    );

    setCities(updatedCities);
    setIsCityEditDialogOpen(false);
    setEditingCity(null);
    resetCityForm();
    toast.success('City updated successfully');
  };

  const handleCityDelete = (cityId: string) => {
    setCities(cities.filter(city => city.id !== cityId));
    toast.success('City deleted successfully');
  };

  const openCityEditDialog = (city: City) => {
    setEditingCity(city);
    setCityFormData({
      name: city.name,
      code: city.code,
      country: city.country,
      region: city.region,
      description: city.description
    });
    setIsCityEditDialogOpen(true);
  };

  const openCityViewDialog = (city: City) => {
    setViewingCity(city);
    setIsCityViewDialogOpen(true);
  };

  const resetCityForm = () => {
    setCityFormData({
      name: '',
      code: '',
      country: '',
      region: '',
      description: ''
    });
  };

  // Projects handlers
  const handleProjectCreate = () => {
    if (!projectFormData.name || !projectFormData.code || !projectFormData.country || !projectFormData.region || !projectFormData.city) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newProject: Project = {
      id: Date.now().toString(),
      name: projectFormData.name,
      code: projectFormData.code.toUpperCase(),
      country: projectFormData.country,
      region: projectFormData.region,
      city: projectFormData.city,
      description: projectFormData.description,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0]
    };

    setProjects([...projects, newProject]);
    setIsProjectCreateDialogOpen(false);
    resetProjectForm();
    toast.success('Project created successfully');
  };

  const handleProjectEdit = () => {
    if (!editingProject || !projectFormData.name || !projectFormData.code || !projectFormData.country || !projectFormData.region || !projectFormData.city) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedProjects = projects.map(project =>
      project.id === editingProject.id
        ? {
            ...project,
            name: projectFormData.name,
            code: projectFormData.code.toUpperCase(),
            country: projectFormData.country,
            region: projectFormData.region,
            city: projectFormData.city,
            description: projectFormData.description,
            updated_at: new Date().toISOString().split('T')[0]
          }
        : project
    );

    setProjects(updatedProjects);
    setIsProjectEditDialogOpen(false);
    setEditingProject(null);
    resetProjectForm();
    toast.success('Project updated successfully');
  };

  const handleProjectDelete = (projectId: string) => {
    setProjects(projects.filter(project => project.id !== projectId));
    toast.success('Project deleted successfully');
  };

  const openProjectEditDialog = (project: Project) => {
    setEditingProject(project);
    setProjectFormData({
      name: project.name,
      code: project.code,
      country: project.country,
      region: project.region,
      city: project.city,
      description: project.description
    });
    setIsProjectEditDialogOpen(true);
  };

  const openProjectViewDialog = (project: Project) => {
    setViewingProject(project);
    setIsProjectViewDialogOpen(true);
  };

  const resetProjectForm = () => {
    setProjectFormData({
      name: '',
      code: '',
      country: '',
      region: '',
      city: '',
      description: ''
    });
  };

  // Boards handlers
  const handleBoardCreate = () => {
    if (!boardFormData.name || !boardFormData.code || !boardFormData.country || !boardFormData.region || !boardFormData.city || !boardFormData.project) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newBoard: Board = {
      id: Date.now().toString(),
      name: boardFormData.name,
      code: boardFormData.code.toUpperCase(),
      country: boardFormData.country,
      region: boardFormData.region,
      city: boardFormData.city,
      project: boardFormData.project,
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
    if (!editingBoard || !boardFormData.name || !boardFormData.code || !boardFormData.country || !boardFormData.region || !boardFormData.city || !boardFormData.project) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedBoards = boards.map(board =>
      board.id === editingBoard.id
        ? {
            ...board,
            name: boardFormData.name,
            code: boardFormData.code.toUpperCase(),
            country: boardFormData.country,
            region: boardFormData.region,
            city: boardFormData.city,
            project: boardFormData.project,
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
      country: board.country,
      region: board.region,
      city: board.city,
      project: board.project,
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
      country: '',
      region: '',
      city: '',
      project: '',
      description: ''
    });
  };

  // Schools handlers
  const handleSchoolCreate = () => {
    if (!schoolFormData.name || !schoolFormData.code || !schoolFormData.type || !schoolFormData.country || !schoolFormData.region || !schoolFormData.city || !schoolFormData.project || !schoolFormData.board) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newSchool: School = {
      id: Date.now().toString(),
      name: schoolFormData.name,
      code: schoolFormData.code.toUpperCase(),
      type: schoolFormData.type,
      address: schoolFormData.address,
      country: schoolFormData.country,
      region: schoolFormData.region,
      city: schoolFormData.city,
      project: schoolFormData.project,
      board: schoolFormData.board,
      phone: schoolFormData.phone,
      email: schoolFormData.email,
      website: schoolFormData.website,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0]
    };

    setSchools([...schools, newSchool]);
    setIsSchoolCreateDialogOpen(false);
    resetSchoolForm();
    toast.success('School created successfully');
  };

  const handleSchoolEdit = () => {
    if (!editingSchool || !schoolFormData.name || !schoolFormData.code || !schoolFormData.type || !schoolFormData.country || !schoolFormData.region || !schoolFormData.city || !schoolFormData.project || !schoolFormData.board) {
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
            country: schoolFormData.country,
            region: schoolFormData.region,
            city: schoolFormData.city,
            project: schoolFormData.project,
            board: schoolFormData.board,
            phone: schoolFormData.phone,
            email: schoolFormData.email,
            website: schoolFormData.website,
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
      country: school.country,
      region: school.region,
      city: school.city,
      project: school.project,
      board: school.board,
      phone: school.phone,
      email: school.email,
      website: school.website
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
      country: '',
      region: '',
      city: '',
      project: '',
      board: '',
      phone: '',
      email: '',
      website: ''
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
          <p className="text-muted-foreground">Manage organizational hierarchy: countries, regions, boards, and schools</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-6 min-w-fit">
            <TabsTrigger value="countries" className="text-xs sm:text-sm">
              <Globe className="w-4 h-4 mr-2" />
              Countries
            </TabsTrigger>
            <TabsTrigger value="regions" className="text-xs sm:text-sm">
              <MapPin className="w-4 h-4 mr-2" />
              Regions
            </TabsTrigger>
            <TabsTrigger value="cities" className="text-xs sm:text-sm">
              <Building className="w-4 h-4 mr-2" />
              Cities
            </TabsTrigger>
            <TabsTrigger value="projects" className="text-xs sm:text-sm">
              <FolderOpen className="w-4 h-4 mr-2" />
              Projects
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

        {/* Countries Tab */}
        <TabsContent value="countries" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#8DC63F]">Countries Management</h2>
              <p className="text-muted-foreground">Manage all countries in the system</p>
            </div>
            <Button
              onClick={() => setIsCountryCreateDialogOpen(true)}
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Country
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Countries</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{countries.length}</div>
                <p className="text-xs text-muted-foreground">All countries in the system</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Countries with Description</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{countries.filter(c => c.description && c.description.trim() !== '').length}</div>
                <p className="text-xs text-muted-foreground">Have descriptions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{countries.filter(c => {
                  const today = new Date();
                  const updateDate = new Date(c.updated_at);
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
              <CardTitle>Country Directory</CardTitle>
              <CardDescription>Search and filter countries by various criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search countries by name or code..."
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

          {/* Countries Table */}
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
                  {filteredCountries.map((country) => (
                    <TableRow key={country.id}>
                      <TableCell className="font-medium">{country.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{country.code}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{country.description}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {country.updated_at}
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
                            <DropdownMenuItem onClick={() => openCountryViewDialog(country)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openCountryEditDialog(country)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Country
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Country
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Country</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{country.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleCountryDelete(country.id)}
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

        {/* Regions Tab */}
        <TabsContent value="regions" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#8DC63F]">Regions Management</h2>
              <p className="text-muted-foreground">Manage all regions and territories in the system</p>
            </div>
            <Button
              onClick={() => setIsRegionCreateDialogOpen(true)}
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Region
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Regions</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{regions.length}</div>
                <p className="text-xs text-muted-foreground">All regions in the system</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Regions with Description</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{regions.filter(r => r.description && r.description.trim() !== '').length}</div>
                <p className="text-xs text-muted-foreground">Have descriptions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{regions.filter(r => {
                  const today = new Date();
                  const updateDate = new Date(r.updated_at);
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
              <CardTitle>Region Directory</CardTitle>
              <CardDescription>Search and filter regions by various criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search regions by name or code..."
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

          {/* Regions Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegions.map((region) => (
                    <TableRow key={region.id}>
                      <TableCell className="font-medium">{region.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{region.code}</Badge>
                      </TableCell>
                      <TableCell>{region.country}</TableCell>
                      <TableCell className="max-w-xs truncate">{region.description}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {region.updated_at}
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
                            <DropdownMenuItem onClick={() => openRegionViewDialog(region)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRegionEditDialog(region)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Region
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Region
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Region</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{region.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRegionDelete(region.id)}
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

        {/* Cities Tab */}
        <TabsContent value="cities" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#8DC63F]">Cities Management</h2>
              <p className="text-muted-foreground">Manage all cities and urban areas in the system</p>
            </div>
            <Button
              onClick={() => setIsCityCreateDialogOpen(true)}
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create City
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cities</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cities.length}</div>
                <p className="text-xs text-muted-foreground">All cities in the system</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cities with Description</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cities.filter(c => c.description && c.description.trim() !== '').length}</div>
                <p className="text-xs text-muted-foreground">Have descriptions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cities.filter(c => {
                  const today = new Date();
                  const updateDate = new Date(c.updated_at);
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
              <CardTitle>City Directory</CardTitle>
              <CardDescription>Search and filter cities by various criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search cities by name or code..."
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

          {/* Cities Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCities.map((city) => (
                    <TableRow key={city.id}>
                      <TableCell className="font-medium">{city.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{city.code}</Badge>
                      </TableCell>
                      <TableCell>{city.country}</TableCell>
                      <TableCell>{city.region}</TableCell>
                      <TableCell className="max-w-xs truncate">{city.description}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {city.updated_at}
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
                            <DropdownMenuItem onClick={() => openCityViewDialog(city)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openCityEditDialog(city)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit City
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete City
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete City</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{city.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleCityDelete(city.id)}
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

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#8DC63F]">Projects Management</h2>
              <p className="text-muted-foreground">Manage all educational projects and initiatives in the system</p>
            </div>
            <Button
              onClick={() => setIsProjectCreateDialogOpen(true)}
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projects.length}</div>
                <p className="text-xs text-muted-foreground">All projects in the system</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projects with Description</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projects.filter(p => p.description && p.description.trim() !== '').length}</div>
                <p className="text-xs text-muted-foreground">Have descriptions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projects.filter(p => {
                  const today = new Date();
                  const updateDate = new Date(p.updated_at);
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
              <CardTitle>Project Directory</CardTitle>
              <CardDescription>Search and filter projects by various criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search projects by name or code..."
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

          {/* Projects Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{project.code}</Badge>
                      </TableCell>
                      <TableCell>{project.country}</TableCell>
                      <TableCell>{project.region}</TableCell>
                      <TableCell>{project.city}</TableCell>
                      <TableCell className="max-w-xs truncate">{project.description}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {project.updated_at}
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
                            <DropdownMenuItem onClick={() => openProjectViewDialog(project)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openProjectEditDialog(project)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Project
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Project
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Project</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{project.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleProjectDelete(project.id)}
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
                    <TableHead>Country</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Project</TableHead>
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
                      <TableCell>{board.country}</TableCell>
                      <TableCell>{board.region}</TableCell>
                      <TableCell>{board.city}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{board.project}</Badge>
                      </TableCell>
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
                <CardTitle className="text-sm font-medium">Private Schools</CardTitle>
                <Users2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{schools.filter(s => s.type === 'Private').length}</div>
                <p className="text-xs text-muted-foreground">Private institutions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Public Schools</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{schools.filter(s => s.type === 'Public').length}</div>
                <p className="text-xs text-muted-foreground">Public institutions</p>
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
                    placeholder="Search schools by name, code, or region..."
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
                    <TableHead>Country</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Board</TableHead>
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
                      <TableCell>{school.country}</TableCell>
                      <TableCell>{school.region}</TableCell>
                      <TableCell>{school.city}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{school.project}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{school.board}</Badge>
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

      {/* Country Dialogs */}
      {/* Create Country Dialog */}
      <Dialog open={isCountryCreateDialogOpen} onOpenChange={setIsCountryCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Country</DialogTitle>
            <DialogDescription>
              Add a new country to the system. Fill in the required information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="country-name">Country Name *</Label>
              <Input
                id="country-name"
                value={countryFormData.name}
                onChange={(e) => setCountryFormData({ ...countryFormData, name: e.target.value })}
                placeholder="e.g., Pakistan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country-code">Country Code *</Label>
              <Input
                id="country-code"
                value={countryFormData.code}
                onChange={(e) => setCountryFormData({ ...countryFormData, code: e.target.value })}
                placeholder="e.g., PK"
                maxLength={3}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="country-description">Description</Label>
              <Textarea
                id="country-description"
                value={countryFormData.description}
                onChange={(e) => setCountryFormData({ ...countryFormData, description: e.target.value })}
                placeholder="Brief description of the country..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCountryCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCountryCreate} className="bg-[#8DC63F] hover:bg-[#8DC63F]/90">
              Create Country
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Country Dialog */}
      <Dialog open={isCountryEditDialogOpen} onOpenChange={setIsCountryEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Country</DialogTitle>
            <DialogDescription>
              Update the information for {editingCountry?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-country-name">Country Name *</Label>
              <Input
                id="edit-country-name"
                value={countryFormData.name}
                onChange={(e) => setCountryFormData({ ...countryFormData, name: e.target.value })}
                placeholder="e.g., Pakistan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-country-code">Country Code *</Label>
              <Input
                id="edit-country-code"
                value={countryFormData.code}
                onChange={(e) => setCountryFormData({ ...countryFormData, code: e.target.value })}
                placeholder="e.g., PK"
                maxLength={3}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-country-description">Description</Label>
              <Textarea
                id="edit-country-description"
                value={countryFormData.description}
                onChange={(e) => setCountryFormData({ ...countryFormData, description: e.target.value })}
                placeholder="Brief description of the country..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCountryEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCountryEdit} className="bg-blue-600 hover:bg-blue-700">
              Update Country
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Country Dialog */}
      <Dialog open={isCountryViewDialogOpen} onOpenChange={setIsCountryViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Country Details</DialogTitle>
            <DialogDescription>
              View detailed information about {viewingCountry?.name}.
            </DialogDescription>
          </DialogHeader>
          {viewingCountry && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Country Name</Label>
                    <p className="text-lg font-semibold">{viewingCountry.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Country Code</Label>
                    <Badge variant="outline" className="text-lg">{viewingCountry.code}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="text-lg">{viewingCountry.created_at}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-lg">{viewingCountry.updated_at}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                    <p className="text-lg">{viewingCountry.description}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCountryViewDialogOpen(false)}>
              Close
            </Button>
            {viewingCountry && (
              <Button onClick={() => {
                setIsCountryViewDialogOpen(false);
                openCountryEditDialog(viewingCountry);
              }} className="bg-blue-600 hover:bg-blue-700">
                Edit Country
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Region Dialogs */}
      {/* Create Region Dialog */}
      <Dialog open={isRegionCreateDialogOpen} onOpenChange={setIsRegionCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Region</DialogTitle>
            <DialogDescription>
              Add a new region or territory to the system. Fill in the required information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Region Name *</Label>
              <Input
                id="name"
                value={regionFormData.name}
                onChange={(e) => setRegionFormData({ ...regionFormData, name: e.target.value })}
                placeholder="e.g., California"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Region Code *</Label>
              <Input
                id="code"
                value={regionFormData.code}
                onChange={(e) => setRegionFormData({ ...regionFormData, code: e.target.value })}
                placeholder="e.g., LHR"
                maxLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region-country">Country *</Label>
              <Select
                value={regionFormData.country}
                onValueChange={(value) => setRegionFormData({ ...regionFormData, country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={regionFormData.description}
                onChange={(e) => setRegionFormData({ ...regionFormData, description: e.target.value })}
                placeholder="Brief description of the region..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegionCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRegionCreate} className="bg-[#8DC63F] hover:bg-[#8DC63F]/90">
              Create Region
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Region Dialog */}
      <Dialog open={isRegionEditDialogOpen} onOpenChange={setIsRegionEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Region</DialogTitle>
            <DialogDescription>
              Update the information for {editingRegion?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Region Name *</Label>
              <Input
                id="edit-name"
                value={regionFormData.name}
                onChange={(e) => setRegionFormData({ ...regionFormData, name: e.target.value })}
                placeholder="e.g., California"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Region Code *</Label>
              <Input
                id="edit-code"
                value={regionFormData.code}
                onChange={(e) => setRegionFormData({ ...regionFormData, code: e.target.value })}
                placeholder="e.g., LHR"
                maxLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-region-country">Country *</Label>
              <Select
                value={regionFormData.country}
                onValueChange={(value) => setRegionFormData({ ...regionFormData, country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={regionFormData.description}
                onChange={(e) => setRegionFormData({ ...regionFormData, description: e.target.value })}
                placeholder="Brief description of the region..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegionEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRegionEdit} className="bg-blue-600 hover:bg-blue-700">
              Update Region
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Region Dialog */}
      <Dialog open={isRegionViewDialogOpen} onOpenChange={setIsRegionViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Region Details</DialogTitle>
            <DialogDescription>
              View detailed information about {viewingRegion?.name}.
            </DialogDescription>
          </DialogHeader>
          {viewingRegion && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Region Name</Label>
                    <p className="text-lg font-semibold">{viewingRegion.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Region Code</Label>
                    <Badge variant="outline" className="text-lg">{viewingRegion.code}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Country</Label>
                    <p className="text-lg">{viewingRegion.country}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="text-lg">{viewingRegion.created_at}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-lg">{viewingRegion.updated_at}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                    <p className="text-lg">{viewingRegion.description}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegionViewDialogOpen(false)}>
              Close
            </Button>
            {viewingRegion && (
              <Button onClick={() => {
                setIsRegionViewDialogOpen(false);
                openRegionEditDialog(viewingRegion);
              }} className="bg-blue-600 hover:bg-blue-700">
                Edit Region
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* City Dialogs */}
      {/* Create City Dialog */}
      <Dialog open={isCityCreateDialogOpen} onOpenChange={setIsCityCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New City</DialogTitle>
            <DialogDescription>
              Add a new city or urban area to the system. Fill in the required information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="city-name">City Name *</Label>
              <Input
                id="city-name"
                value={cityFormData.name}
                onChange={(e) => setCityFormData({ ...cityFormData, name: e.target.value })}
                placeholder="e.g., Lahore"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city-code">City Code *</Label>
              <Input
                id="city-code"
                value={cityFormData.code}
                onChange={(e) => setCityFormData({ ...cityFormData, code: e.target.value })}
                placeholder="e.g., LHE"
                maxLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city-country">Country *</Label>
              <Select
                value={cityFormData.country}
                onValueChange={(value) => setCityFormData({ ...cityFormData, country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city-region">Region *</Label>
              <Select
                value={cityFormData.region}
                onValueChange={(value) => setCityFormData({ ...cityFormData, region: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.name}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="city-description">Description</Label>
              <Textarea
                id="city-description"
                value={cityFormData.description}
                onChange={(e) => setCityFormData({ ...cityFormData, description: e.target.value })}
                placeholder="Brief description of the city..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCityCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCityCreate} className="bg-[#8DC63F] hover:bg-[#8DC63F]/90">
              Create City
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit City Dialog */}
      <Dialog open={isCityEditDialogOpen} onOpenChange={setIsCityEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit City</DialogTitle>
            <DialogDescription>
              Update the information for {editingCity?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-city-name">City Name *</Label>
              <Input
                id="edit-city-name"
                value={cityFormData.name}
                onChange={(e) => setCityFormData({ ...cityFormData, name: e.target.value })}
                placeholder="e.g., Lahore"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city-code">City Code *</Label>
              <Input
                id="edit-city-code"
                value={cityFormData.code}
                onChange={(e) => setCityFormData({ ...cityFormData, code: e.target.value })}
                placeholder="e.g., LHE"
                maxLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city-country">Country *</Label>
              <Select
                value={cityFormData.country}
                onValueChange={(value) => setCityFormData({ ...cityFormData, country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city-region">Region *</Label>
              <Select
                value={cityFormData.region}
                onValueChange={(value) => setCityFormData({ ...cityFormData, region: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.name}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-city-description">Description</Label>
              <Textarea
                id="edit-city-description"
                value={cityFormData.description}
                onChange={(e) => setCityFormData({ ...cityFormData, description: e.target.value })}
                placeholder="Brief description of the city..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCityEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCityEdit} className="bg-blue-600 hover:bg-blue-700">
              Update City
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View City Dialog */}
      <Dialog open={isCityViewDialogOpen} onOpenChange={setIsCityViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>City Details</DialogTitle>
            <DialogDescription>
              View detailed information about {viewingCity?.name}.
            </DialogDescription>
          </DialogHeader>
          {viewingCity && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">City Name</Label>
                    <p className="text-lg font-semibold">{viewingCity.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">City Code</Label>
                    <Badge variant="outline" className="text-lg">{viewingCity.code}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Country</Label>
                    <p className="text-lg">{viewingCity.country}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Region</Label>
                    <p className="text-lg">{viewingCity.region}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="text-lg">{viewingCity.created_at}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-lg">{viewingCity.updated_at}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                    <p className="text-lg">{viewingCity.description}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCityViewDialogOpen(false)}>
              Close
            </Button>
            {viewingCity && (
              <Button onClick={() => {
                setIsCityViewDialogOpen(false);
                openCityEditDialog(viewingCity);
              }} className="bg-blue-600 hover:bg-blue-700">
                Edit City
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Dialogs */}
      {/* Create Project Dialog */}
      <Dialog open={isProjectCreateDialogOpen} onOpenChange={setIsProjectCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new educational project or initiative to the system. Fill in the required information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name *</Label>
              <Input
                id="project-name"
                value={projectFormData.name}
                onChange={(e) => setProjectFormData({ ...projectFormData, name: e.target.value })}
                placeholder="e.g., Digital Learning Initiative"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-code">Project Code *</Label>
              <Input
                id="project-code"
                value={projectFormData.code}
                onChange={(e) => setProjectFormData({ ...projectFormData, code: e.target.value })}
                placeholder="e.g., DLI-001"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-country">Country *</Label>
              <Select
                value={projectFormData.country}
                onValueChange={(value) => setProjectFormData({ ...projectFormData, country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-region">Region *</Label>
              <Select
                value={projectFormData.region}
                onValueChange={(value) => setProjectFormData({ ...projectFormData, region: value })}
                disabled={!projectFormData.country}
              >
                <SelectTrigger>
                  <SelectValue placeholder={projectFormData.country ? "Select a region" : "Select country first"} />
                </SelectTrigger>
                <SelectContent>
                  {regions
                    .filter(region => region.country === projectFormData.country)
                    .map((region) => (
                      <SelectItem key={region.id} value={region.name}>
                        {region.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-city">City *</Label>
              <Select
                value={projectFormData.city}
                onValueChange={(value) => setProjectFormData({ ...projectFormData, city: value })}
                disabled={!projectFormData.region}
              >
                <SelectTrigger>
                  <SelectValue placeholder={projectFormData.region ? "Select a city" : "Select region first"} />
                </SelectTrigger>
                <SelectContent>
                  {cities
                    .filter(city => city.region === projectFormData.region && city.country === projectFormData.country)
                    .map((city) => (
                      <SelectItem key={city.id} value={city.name}>
                        {city.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={projectFormData.description}
                onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                placeholder="Brief description of the project..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProjectCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProjectCreate} className="bg-[#8DC63F] hover:bg-[#8DC63F]/90">
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={isProjectEditDialogOpen} onOpenChange={setIsProjectEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the information for {editingProject?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project-name">Project Name *</Label>
              <Input
                id="edit-project-name"
                value={projectFormData.name}
                onChange={(e) => setProjectFormData({ ...projectFormData, name: e.target.value })}
                placeholder="e.g., Digital Learning Initiative"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-code">Project Code *</Label>
              <Input
                id="edit-project-code"
                value={projectFormData.code}
                onChange={(e) => setProjectFormData({ ...projectFormData, code: e.target.value })}
                placeholder="e.g., DLI-001"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-country">Country *</Label>
              <Select
                value={projectFormData.country}
                onValueChange={(value) => setProjectFormData({ ...projectFormData, country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-region">Region *</Label>
              <Select
                value={projectFormData.region}
                onValueChange={(value) => setProjectFormData({ ...projectFormData, region: value })}
                disabled={!projectFormData.country}
              >
                <SelectTrigger>
                  <SelectValue placeholder={projectFormData.country ? "Select a region" : "Select country first"} />
                </SelectTrigger>
                <SelectContent>
                  {regions
                    .filter(region => region.country === projectFormData.country)
                    .map((region) => (
                      <SelectItem key={region.id} value={region.name}>
                        {region.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-city">City *</Label>
              <Select
                value={projectFormData.city}
                onValueChange={(value) => setProjectFormData({ ...projectFormData, city: value })}
                disabled={!projectFormData.region}
              >
                <SelectTrigger>
                  <SelectValue placeholder={projectFormData.region ? "Select a city" : "Select region first"} />
                </SelectTrigger>
                <SelectContent>
                  {cities
                    .filter(city => city.region === projectFormData.region && city.country === projectFormData.country)
                    .map((city) => (
                      <SelectItem key={city.id} value={city.name}>
                        {city.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-project-description">Description</Label>
              <Textarea
                id="edit-project-description"
                value={projectFormData.description}
                onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                placeholder="Brief description of the project..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProjectEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProjectEdit} className="bg-blue-600 hover:bg-blue-700">
              Update Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Project Dialog */}
      <Dialog open={isProjectViewDialogOpen} onOpenChange={setIsProjectViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Project Details</DialogTitle>
            <DialogDescription>
              View detailed information about {viewingProject?.name}.
            </DialogDescription>
          </DialogHeader>
          {viewingProject && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Project Name</Label>
                    <p className="text-lg font-semibold">{viewingProject.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Project Code</Label>
                    <Badge variant="outline" className="text-lg">{viewingProject.code}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Country</Label>
                    <p className="text-lg">{viewingProject.country}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Region</Label>
                    <p className="text-lg">{viewingProject.region}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">City</Label>
                    <p className="text-lg">{viewingProject.city}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="text-lg">{viewingProject.created_at}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-lg">{viewingProject.updated_at}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                    <p className="text-lg">{viewingProject.description}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProjectViewDialogOpen(false)}>
              Close
            </Button>
            {viewingProject && (
              <Button onClick={() => {
                setIsProjectViewDialogOpen(false);
                openProjectEditDialog(viewingProject);
              }} className="bg-blue-600 hover:bg-blue-700">
                Edit Project
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
              <Label htmlFor="board-country">Country *</Label>
              <Select
                value={boardFormData.country}
                onValueChange={(value) => setBoardFormData({ ...boardFormData, country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-region">Region *</Label>
              <Select
                value={boardFormData.region}
                onValueChange={(value) => setBoardFormData({ ...boardFormData, region: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.name}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-city">City *</Label>
              <Select
                value={boardFormData.city}
                onValueChange={(value) => setBoardFormData({ ...boardFormData, city: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.name}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-project">Project *</Label>
              <Select
                value={boardFormData.project}
                onValueChange={(value) => setBoardFormData({ ...boardFormData, project: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.name}>
                      {project.name}
                    </SelectItem>
                  ))}
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
              <Label htmlFor="edit-board-country">Country *</Label>
              <Select
                value={boardFormData.country}
                onValueChange={(value) => setBoardFormData({ ...boardFormData, country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-board-region">Region *</Label>
              <Select
                value={boardFormData.region}
                onValueChange={(value) => setBoardFormData({ ...boardFormData, region: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.name}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-board-city">City *</Label>
              <Select
                value={boardFormData.city}
                onValueChange={(value) => setBoardFormData({ ...boardFormData, city: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.name}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-board-project">Project *</Label>
              <Select
                value={boardFormData.project}
                onValueChange={(value) => setBoardFormData({ ...boardFormData, project: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.name}>
                      {project.name}
                    </SelectItem>
                  ))}
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
                    <Label className="text-sm font-medium text-muted-foreground">Country</Label>
                    <p className="text-lg">{viewingBoard.country}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Region</Label>
                    <p className="text-lg">{viewingBoard.region}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">City</Label>
                    <p className="text-lg">{viewingBoard.city}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Project</Label>
                    <p className="text-lg">{viewingBoard.project}</p>
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
              <Label htmlFor="school-country">Country *</Label>
              <Select
                value={schoolFormData.country}
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-region">Region *</Label>
              <Select
                value={schoolFormData.region}
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, region: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.name}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-city">City *</Label>
              <Select
                value={schoolFormData.city}
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, city: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.name}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-project">Project *</Label>
              <Select
                value={schoolFormData.project}
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, project: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.name}>
                      {project.name}
                    </SelectItem>
                  ))}
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
              <Label htmlFor="edit-school-country">Country *</Label>
              <Select
                value={schoolFormData.country}
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-region">Region *</Label>
              <Select
                value={schoolFormData.region}
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, region: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.name}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-city">City *</Label>
              <Select
                value={schoolFormData.city}
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, city: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.name}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-project">Project *</Label>
              <Select
                value={schoolFormData.project}
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, project: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.name}>
                      {project.name}
                    </SelectItem>
                  ))}
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
                    <Label className="text-sm font-medium text-muted-foreground">Country</Label>
                    <p className="text-lg">{viewingSchool.country}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Region</Label>
                    <p className="text-lg">{viewingSchool.region}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">City</Label>
                    <p className="text-lg">{viewingSchool.city}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Project</Label>
                    <p className="text-lg">{viewingSchool.project}</p>
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