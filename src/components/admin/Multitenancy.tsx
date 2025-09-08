import React, { useState, useEffect } from 'react';
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
import { Search, Plus, MapPin, Building2, GraduationCap, Edit, Trash2, Eye, RefreshCw, Calendar, FileText, MoreHorizontal, Phone, Mail, Globe, Users2, Building, FolderOpen, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { toast } from 'sonner';
import { useCountries, useRegions, useCities, useProjects, useBoards, useSchools } from '@/hooks/useMultitenancy';
import { Country as CountryType, CountryInsert, RegionInsert, CityInsert, ProjectInsert, BoardInsert, SchoolInsert, Region, City, Project, Board, School } from '@/services/multitenancyService';
import { ContentLoader } from '@/components/ContentLoader';

interface MultitenancyProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}


export const Multitenancy = ({ userProfile }: MultitenancyProps) => {
  // Countries Management - Using database integration
  const {
    countries, 
    loading: countriesLoading, 
    error: countriesError,
    pagination: countriesPagination,
    isSearchMode: countriesIsSearchMode,
    createCountry,
    updateCountry,
    deleteCountry,
    searchCountries,
    getCountriesWithStats,
    goToPage: countriesGoToPage,
    changePageSize: countriesChangePageSize,
    nextPage: countriesNextPage,
    prevPage: countriesPrevPage
  } = useCountries();

  // Regions Management
  const {
    regions,
    loading: regionsLoading,
    error: regionsError,
    pagination: regionsPagination,
    isSearchMode: regionsIsSearchMode,
    createRegion,
    updateRegion,
    deleteRegion,
    searchRegions,
    getRegionsByCountry,
    goToPage: regionsGoToPage,
    changePageSize: regionsChangePageSize,
    nextPage: regionsNextPage,
    prevPage: regionsPrevPage
  } = useRegions();

  // Cities Management
  const {
    cities,
    loading: citiesLoading,
    error: citiesError,
    pagination: citiesPagination,
    isSearchMode: citiesIsSearchMode,
    createCity,
    updateCity,
    deleteCity,
    searchCities,
    getCitiesByRegion,
    goToPage: citiesGoToPage,
    changePageSize: citiesChangePageSize,
    nextPage: citiesNextPage,
    prevPage: citiesPrevPage
  } = useCities();

  // Projects Management
  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    pagination: projectsPagination,
    isSearchMode: projectsIsSearchMode,
    createProject,
    updateProject,
    deleteProject,
    searchProjects,
    goToPage: projectsGoToPage,
    changePageSize: projectsChangePageSize,
    nextPage: projectsNextPage,
    prevPage: projectsPrevPage
  } = useProjects();

  // Boards Management
  const {
    boards,
    loading: boardsLoading,
    error: boardsError,
    pagination: boardsPagination,
    isSearchMode: boardsIsSearchMode,
    createBoard,
    updateBoard,
    deleteBoard,
    searchBoards,
    goToPage: boardsGoToPage,
    changePageSize: boardsChangePageSize,
    nextPage: boardsNextPage,
    prevPage: boardsPrevPage
  } = useBoards();

  // Schools Management
  const {
    schools,
    loading: schoolsLoading,
    error: schoolsError,
    pagination: schoolsPagination,
    isSearchMode: schoolsIsSearchMode,
    createSchool,
    updateSchool,
    deleteSchool,
    searchSchools,
    goToPage: schoolsGoToPage,
    changePageSize: schoolsChangePageSize,
    nextPage: schoolsNextPage,
    prevPage: schoolsPrevPage
  } = useSchools();

  // Common state for all tabs
  const [activeTab, setActiveTab] = useState('countries');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Countries specific state
  const [isCountryCreateDialogOpen, setIsCountryCreateDialogOpen] = useState(false);
  const [isCountryEditDialogOpen, setIsCountryEditDialogOpen] = useState(false);
  const [isCountryViewDialogOpen, setIsCountryViewDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<CountryType | null>(null);
  const [viewingCountry, setViewingCountry] = useState<CountryType | null>(null);
  const [countryFormData, setCountryFormData] = useState<CountryInsert>({
    name: '',
    code: '',
    description: ''
  });
  const [countriesStats, setCountriesStats] = useState({
    totalCountries: 0,
    countriesWithDescription: 0,
    recentUpdates: 0
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
                         (school.region?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || !typeFilter || school.school_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Countries handlers
  const handleCountryCreate = async () => {
    if (!countryFormData.name || !countryFormData.code) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createCountry({
      name: countryFormData.name,
      code: countryFormData.code.toUpperCase(),
        description: countryFormData.description
      });
    setIsCountryCreateDialogOpen(false);
    resetCountryForm();
      // Refresh statistics
      const stats = await getCountriesWithStats();
      setCountriesStats(stats);
    } catch (error: any) {
      console.error('Error creating country:', error);
      
      // Handle specific error types
      if (error?.code === '23505') {
        if (error?.message?.includes('countries_code_key')) {
          toast.error('A country with this code already exists. Please choose a different code.');
        } else if (error?.message?.includes('countries_name_key')) {
          toast.error('A country with this name already exists. Please choose a different name.');
        } else {
          toast.error('This country already exists. Please check the name and code.');
        }
      } else if (error?.message) {
        toast.error(`Failed to create country: ${error.message}`);
      } else {
        toast.error('Failed to create country. Please try again.');
      }
    }
  };

  const handleCountryEdit = async () => {
    if (!editingCountry || !countryFormData.name || !countryFormData.code) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if country code already exists (excluding current country)
    const existingCountry = countries.find(country => 
      country.code.toLowerCase() === countryFormData.code.toLowerCase() && 
      country.id !== editingCountry.id
    );
    if (existingCountry) {
      toast.error('A country with this code already exists. Please choose a different code.');
      return;
    }

    try {
      await updateCountry(editingCountry.id, {
            name: countryFormData.name,
            code: countryFormData.code.toUpperCase(),
        description: countryFormData.description
      });
    setIsCountryEditDialogOpen(false);
    setEditingCountry(null);
    resetCountryForm();
      // Refresh statistics
      const stats = await getCountriesWithStats();
      setCountriesStats(stats);
    } catch (error: any) {
      console.error('Error updating country:', error);
      
      // Handle specific error types
      if (error?.code === '23505') {
        if (error?.message?.includes('countries_code_key')) {
          toast.error('A country with this code already exists. Please choose a different code.');
        } else if (error?.message?.includes('countries_name_key')) {
          toast.error('A country with this name already exists. Please choose a different name.');
        } else {
          toast.error('This country already exists. Please check the name and code.');
        }
      } else if (error?.message) {
        toast.error(`Failed to update country: ${error.message}`);
      } else {
        toast.error('Failed to update country. Please try again.');
      }
    }
  };

  const handleCountryDelete = async (countryId: string) => {
    try {
      await deleteCountry(countryId);
      // Refresh statistics
      const stats = await getCountriesWithStats();
      setCountriesStats(stats);
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const openCountryEditDialog = (country: CountryType) => {
    setEditingCountry(country);
    setCountryFormData({
      name: country.name,
      code: country.code,
      description: country.description
    });
    setIsCountryEditDialogOpen(true);
  };

  const openCountryViewDialog = (country: CountryType) => {
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

  // Load countries statistics on component mount
  useEffect(() => {
    const loadCountriesStats = async () => {
      try {
        const stats = await getCountriesWithStats();
        setCountriesStats(stats);
      } catch (error) {
        console.error('Failed to load countries statistics:', error);
      }
    };

    loadCountriesStats();
  }, [getCountriesWithStats]);

  // Handle search functionality
  const handleSearch = async (searchTerm: string) => {
    if (searchTerm.trim() === '') {
      // If search is empty, reload all countries
      try {
        const stats = await getCountriesWithStats();
        setCountriesStats(stats);
      } catch (error) {
        console.error('Failed to reload countries:', error);
      }
    } else {
      // Perform search with pagination
      try {
        await searchCountries(searchTerm, { page: 1, limit: countriesPagination.limit });
      } catch (error) {
        console.error('Failed to search countries:', error);
      }
    }
  };

  // Handle search pagination
  const handleSearchPagination = async (page: number, limit?: number) => {
    if (searchTerm.trim() === '') {
      // If no search term, use regular pagination
      await countriesGoToPage(page);
    } else {
      // If in search mode, search with pagination
      try {
        await searchCountries(searchTerm, { page, limit: limit || countriesPagination.limit });
      } catch (error) {
        console.error('Failed to search countries with pagination:', error);
      }
    }
  };

  // Regions handlers
  const handleRegionCreate = async () => {
    if (!regionFormData.name || !regionFormData.code || !regionFormData.country) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if region code already exists
    const existingRegion = regions.find(region => region.code.toLowerCase() === regionFormData.code.toLowerCase());
    if (existingRegion) {
      toast.error('A region with this code already exists. Please choose a different code.');
      return;
    }

    try {
      await createRegion({
      name: regionFormData.name,
      code: regionFormData.code.toUpperCase(),
        country_id: regionFormData.country,
        description: regionFormData.description
      });
    setIsRegionCreateDialogOpen(false);
    resetRegionForm();
    } catch (error: any) {
      console.error('Error creating region:', error);
      
      // Handle specific error types
      if (error?.code === '23505') {
        if (error?.message?.includes('regions_code_key')) {
          toast.error('A region with this code already exists. Please choose a different code.');
        } else if (error?.message?.includes('regions_name_key')) {
          toast.error('A region with this name already exists. Please choose a different name.');
        } else {
          toast.error('This region already exists. Please check the name and code.');
        }
      } else if (error?.message) {
        toast.error(`Failed to create region: ${error.message}`);
      } else {
        toast.error('Failed to create region. Please try again.');
      }
    }
  };

  const handleRegionEdit = async () => {
    if (!editingRegion || !regionFormData.name || !regionFormData.code || !regionFormData.country) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if region code already exists (excluding current region)
    const existingRegion = regions.find(region => 
      region.code.toLowerCase() === regionFormData.code.toLowerCase() && 
      region.id !== editingRegion.id
    );
    if (existingRegion) {
      toast.error('A region with this code already exists. Please choose a different code.');
      return;
    }

    try {
      await updateRegion(editingRegion.id, {
        name: regionFormData.name,
        code: regionFormData.code.toUpperCase(),
        country_id: regionFormData.country,
        description: regionFormData.description
      });
    setIsRegionEditDialogOpen(false);
    setEditingRegion(null);
    resetRegionForm();
    } catch (error: any) {
      console.error('Error updating region:', error);
      
      // Handle specific error types
      if (error?.code === '23505') {
        if (error?.message?.includes('regions_code_key')) {
          toast.error('A region with this code already exists. Please choose a different code.');
        } else if (error?.message?.includes('regions_name_key')) {
          toast.error('A region with this name already exists. Please choose a different name.');
        } else {
          toast.error('This region already exists. Please check the name and code.');
        }
      } else if (error?.message) {
        toast.error(`Failed to update region: ${error.message}`);
      } else {
        toast.error('Failed to update region. Please try again.');
      }
    }
  };

  const handleRegionDelete = async (regionId: string) => {
    try {
      await deleteRegion(regionId);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const openRegionEditDialog = (region: Region) => {
    setEditingRegion(region);
    setRegionFormData({
      name: region.name,
      code: region.code,
      country: region.country_id,
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
  const handleCityCreate = async () => {
    if (!cityFormData.name || !cityFormData.code || !cityFormData.country || !cityFormData.region) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if city code already exists
    const existingCity = cities.find(city => city.code.toLowerCase() === cityFormData.code.toLowerCase());
    if (existingCity) {
      toast.error('A city with this code already exists. Please choose a different code.');
      return;
    }

    try {
      await createCity({
      name: cityFormData.name,
      code: cityFormData.code.toUpperCase(),
        country_id: cityFormData.country,
        region_id: cityFormData.region,
        description: cityFormData.description
      });
    setIsCityCreateDialogOpen(false);
    resetCityForm();
    } catch (error: any) {
      console.error('Error creating city:', error);
      
      // Handle specific error types
      if (error?.code === '23505') {
        if (error?.message?.includes('cities_code_key')) {
          toast.error('A city with this code already exists. Please choose a different code.');
        } else if (error?.message?.includes('cities_name_key')) {
          toast.error('A city with this name already exists. Please choose a different name.');
        } else {
          toast.error('This city already exists. Please check the name and code.');
        }
      } else if (error?.message) {
        toast.error(`Failed to create city: ${error.message}`);
      } else {
        toast.error('Failed to create city. Please try again.');
      }
    }
  };

  const handleCityEdit = async () => {
    if (!editingCity || !cityFormData.name || !cityFormData.code || !cityFormData.country || !cityFormData.region) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if city code already exists (excluding current city)
    const existingCity = cities.find(city => 
      city.code.toLowerCase() === cityFormData.code.toLowerCase() && 
      city.id !== editingCity.id
    );
    if (existingCity) {
      toast.error('A city with this code already exists. Please choose a different code.');
      return;
    }

    try {
      await updateCity(editingCity.id, {
        name: cityFormData.name,
        code: cityFormData.code.toUpperCase(),
        country_id: cityFormData.country,
        region_id: cityFormData.region,
        description: cityFormData.description
      });
    setIsCityEditDialogOpen(false);
    setEditingCity(null);
    resetCityForm();
    } catch (error: any) {
      console.error('Error updating city:', error);
      
      // Handle specific error types
      if (error?.code === '23505') {
        if (error?.message?.includes('cities_code_key')) {
          toast.error('A city with this code already exists. Please choose a different code.');
        } else if (error?.message?.includes('cities_name_key')) {
          toast.error('A city with this name already exists. Please choose a different name.');
        } else {
          toast.error('This city already exists. Please check the name and code.');
        }
      } else if (error?.message) {
        toast.error(`Failed to update city: ${error.message}`);
      } else {
        toast.error('Failed to update city. Please try again.');
      }
    }
  };

  const handleCityDelete = async (cityId: string) => {
    try {
      await deleteCity(cityId);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const openCityEditDialog = (city: City) => {
    setEditingCity(city);
    setCityFormData({
      name: city.name,
      code: city.code,
      country: city.country_id,
      region: city.region_id,
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
  const handleProjectCreate = async () => {
    if (!projectFormData.name || !projectFormData.code || !projectFormData.country || !projectFormData.region || !projectFormData.city) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if project code already exists
    const existingProject = projects.find(project => project.code.toLowerCase() === projectFormData.code.toLowerCase());
    if (existingProject) {
      toast.error('A project with this code already exists. Please choose a different code.');
      return;
    }

    try {
      await createProject({
      name: projectFormData.name,
      code: projectFormData.code.toUpperCase(),
        country_id: projectFormData.country,
        region_id: projectFormData.region,
        city_id: projectFormData.city,
      description: projectFormData.description,
        status: 'active'
      });
    setIsProjectCreateDialogOpen(false);
    resetProjectForm();
    } catch (error: any) {
      console.error('Error creating project:', error);
      
      // Handle specific error types
      if (error?.code === '23505') {
        if (error?.message?.includes('projects_code_key')) {
          toast.error('A project with this code already exists. Please choose a different code.');
        } else if (error?.message?.includes('projects_name_key')) {
          toast.error('A project with this name already exists. Please choose a different name.');
        } else {
          toast.error('This project already exists. Please check the name and code.');
        }
      } else if (error?.message) {
        toast.error(`Failed to create project: ${error.message}`);
      } else {
        toast.error('Failed to create project. Please try again.');
      }
    }
  };

  const handleProjectEdit = async () => {
    if (!editingProject || !projectFormData.name || !projectFormData.code || !projectFormData.country || !projectFormData.region || !projectFormData.city) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if project code already exists (excluding current project)
    const existingProject = projects.find(project => 
      project.code.toLowerCase() === projectFormData.code.toLowerCase() && 
      project.id !== editingProject.id
    );
    if (existingProject) {
      toast.error('A project with this code already exists. Please choose a different code.');
      return;
    }

    try {
      await updateProject(editingProject.id, {
        name: projectFormData.name,
        code: projectFormData.code.toUpperCase(),
        country_id: projectFormData.country,
        region_id: projectFormData.region,
        city_id: projectFormData.city,
        description: projectFormData.description
      });
    setIsProjectEditDialogOpen(false);
    setEditingProject(null);
    resetProjectForm();
    } catch (error: any) {
      console.error('Error updating project:', error);
      
      // Handle specific error types
      if (error?.code === '23505') {
        if (error?.message?.includes('projects_code_key')) {
          toast.error('A project with this code already exists. Please choose a different code.');
        } else if (error?.message?.includes('projects_name_key')) {
          toast.error('A project with this name already exists. Please choose a different name.');
        } else {
          toast.error('This project already exists. Please check the name and code.');
        }
      } else if (error?.message) {
        toast.error(`Failed to update project: ${error.message}`);
      } else {
        toast.error('Failed to update project. Please try again.');
      }
    }
  };

  const handleProjectDelete = async (projectId: string) => {
    try {
      await deleteProject(projectId);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const openProjectEditDialog = (project: Project) => {
    setEditingProject(project);
    setProjectFormData({
      name: project.name,
      code: project.code,
      country: project.country_id,
      region: project.region_id,
      city: project.city_id,
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
  const handleBoardCreate = async () => {
    if (!boardFormData.name || !boardFormData.code || !boardFormData.country || !boardFormData.region || !boardFormData.city || !boardFormData.project) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if board code already exists
    const existingBoard = boards.find(board => board.code.toLowerCase() === boardFormData.code.toLowerCase());
    if (existingBoard) {
      toast.error('A board with this code already exists. Please choose a different code.');
      return;
    }

    try {
      await createBoard({
      name: boardFormData.name,
      code: boardFormData.code.toUpperCase(),
        country_id: boardFormData.country,
        region_id: boardFormData.region,
        city_id: boardFormData.city,
        project_id: boardFormData.project,
      description: boardFormData.description,
        board_type: 'educational',
        status: 'active'
      });
    setIsBoardCreateDialogOpen(false);
    resetBoardForm();
    } catch (error: any) {
      console.error('Error creating board:', error);
      
      // Handle specific error types
      if (error?.code === '23505') {
        if (error?.message?.includes('boards_code_key')) {
          toast.error('A board with this code already exists. Please choose a different code.');
        } else if (error?.message?.includes('boards_name_key')) {
          toast.error('A board with this name already exists. Please choose a different name.');
        } else {
          toast.error('This board already exists. Please check the name and code.');
        }
      } else if (error?.message) {
        toast.error(`Failed to create board: ${error.message}`);
      } else {
        toast.error('Failed to create board. Please try again.');
      }
    }
  };

  const handleBoardEdit = async () => {
    if (!editingBoard || !boardFormData.name || !boardFormData.code || !boardFormData.country || !boardFormData.region || !boardFormData.city || !boardFormData.project) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if board code already exists (excluding current board)
    const existingBoard = boards.find(board => 
      board.code.toLowerCase() === boardFormData.code.toLowerCase() && 
      board.id !== editingBoard.id
    );
    if (existingBoard) {
      toast.error('A board with this code already exists. Please choose a different code.');
      return;
    }

    try {
      await updateBoard(editingBoard.id, {
        name: boardFormData.name,
        code: boardFormData.code.toUpperCase(),
        country_id: boardFormData.country,
        region_id: boardFormData.region,
        city_id: boardFormData.city,
        project_id: boardFormData.project,
        description: boardFormData.description
      });
    setIsBoardEditDialogOpen(false);
    setEditingBoard(null);
    resetBoardForm();
    } catch (error: any) {
      console.error('Error updating board:', error);
      
      // Handle specific error types
      if (error?.code === '23505') {
        if (error?.message?.includes('boards_code_key')) {
          toast.error('A board with this code already exists. Please choose a different code.');
        } else if (error?.message?.includes('boards_name_key')) {
          toast.error('A board with this name already exists. Please choose a different name.');
        } else {
          toast.error('This board already exists. Please check the name and code.');
        }
      } else if (error?.message) {
        toast.error(`Failed to update board: ${error.message}`);
      } else {
        toast.error('Failed to update board. Please try again.');
      }
    }
  };

  const handleBoardDelete = async (boardId: string) => {
    try {
      await deleteBoard(boardId);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const openBoardEditDialog = (board: Board) => {
    setEditingBoard(board);
    setBoardFormData({
      name: board.name,
      code: board.code,
      country: board.country_id,
      region: board.region_id,
      city: board.city_id,
      project: board.project_id,
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
  const handleSchoolCreate = async () => {
    if (!schoolFormData.name || !schoolFormData.code || !schoolFormData.type || !schoolFormData.country || !schoolFormData.region || !schoolFormData.city || !schoolFormData.project || !schoolFormData.board) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if school code already exists
    const existingSchool = schools.find(school => school.code.toLowerCase() === schoolFormData.code.toLowerCase());
    if (existingSchool) {
      toast.error('A school with this code already exists. Please choose a different code.');
      return;
    }

    try {
      await createSchool({
      name: schoolFormData.name,
      code: schoolFormData.code.toUpperCase(),
        school_type: schoolFormData.type as 'Private' | 'Public' | 'International' | 'Charter' | 'Religious',
        country_id: schoolFormData.country,
        region_id: schoolFormData.region,
        city_id: schoolFormData.city,
        project_id: schoolFormData.project,
        board_id: schoolFormData.board,
      address: schoolFormData.address,
      phone: schoolFormData.phone,
      email: schoolFormData.email,
      website: schoolFormData.website,
        total_students: 0,
        total_teachers: 0,
        total_classes: 0,
        status: 'active',
        accreditation_status: 'pending'
      });
    setIsSchoolCreateDialogOpen(false);
    resetSchoolForm();
    } catch (error: any) {
      console.error('Error creating school:', error);
      
      // Handle specific error types
      if (error?.code === '23505') {
        if (error?.message?.includes('schools_code_key')) {
          toast.error('A school with this code already exists. Please choose a different code.');
        } else if (error?.message?.includes('schools_name_key')) {
          toast.error('A school with this name already exists. Please choose a different name.');
        } else {
          toast.error('This school already exists. Please check the name and code.');
        }
      } else if (error?.message) {
        toast.error(`Failed to create school: ${error.message}`);
      } else {
        toast.error('Failed to create school. Please try again.');
      }
    }
  };

  const handleSchoolEdit = async () => {
    if (!editingSchool || !schoolFormData.name || !schoolFormData.code || !schoolFormData.type || !schoolFormData.country || !schoolFormData.region || !schoolFormData.city || !schoolFormData.project || !schoolFormData.board) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if school code already exists (excluding current school)
    const existingSchool = schools.find(school => 
      school.code.toLowerCase() === schoolFormData.code.toLowerCase() && 
      school.id !== editingSchool.id
    );
    if (existingSchool) {
      toast.error('A school with this code already exists. Please choose a different code.');
      return;
    }

    try {
      await updateSchool(editingSchool.id, {
            name: schoolFormData.name,
            code: schoolFormData.code.toUpperCase(),
        school_type: schoolFormData.type as 'Private' | 'Public' | 'International' | 'Charter' | 'Religious',
        country_id: schoolFormData.country,
        region_id: schoolFormData.region,
        city_id: schoolFormData.city,
        project_id: schoolFormData.project,
        board_id: schoolFormData.board,
            address: schoolFormData.address,
            phone: schoolFormData.phone,
            email: schoolFormData.email,
        website: schoolFormData.website
      });
    setIsSchoolEditDialogOpen(false);
    setEditingSchool(null);
    resetSchoolForm();
    } catch (error: any) {
      console.error('Error updating school:', error);
      
      // Handle specific error types
      if (error?.code === '23505') {
        if (error?.message?.includes('schools_code_key')) {
          toast.error('A school with this code already exists. Please choose a different code.');
        } else if (error?.message?.includes('schools_name_key')) {
          toast.error('A school with this name already exists. Please choose a different name.');
        } else {
          toast.error('This school already exists. Please check the name and code.');
        }
      } else if (error?.message) {
        toast.error(`Failed to update school: ${error.message}`);
      } else {
        toast.error('Failed to update school. Please try again.');
      }
    }
  };

  const handleSchoolDelete = async (schoolId: string) => {
    try {
      await deleteSchool(schoolId);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const openSchoolEditDialog = (school: School) => {
    setEditingSchool(school);
    setSchoolFormData({
      name: school.name,
      code: school.code,
      type: school.school_type,
      address: school.address || '',
      country: school.country_id,
      region: school.region_id,
      city: school.city_id,
      project: school.project_id,
      board: school.board_id,
      phone: school.phone || '',
      email: school.email || '',
      website: school.website || ''
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
              disabled={countriesLoading}
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
                <div className="text-2xl font-bold">
                  {countriesLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : countriesStats.totalCountries}
                </div>
                <p className="text-xs text-muted-foreground">All countries in the system</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Countries with Description</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {countriesLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : countriesStats.countriesWithDescription}
                </div>
                <p className="text-xs text-muted-foreground">Have descriptions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {countriesLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : countriesStats.recentUpdates}
                </div>
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
                    id="search-countries"
                    placeholder="Search countries by name or code..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      handleSearch(e.target.value);
                    }}
                    className="pl-10"
                    disabled={countriesLoading}
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    setSearchTerm('');
                    handleSearch('');
                  }}
                  disabled={countriesLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${countriesLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Countries Table */}
          <Card>
            <CardContent className="p-0">
              {countriesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <ContentLoader />
                </div>
              ) : countriesError ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <p className="text-red-500 mb-2">Error loading countries</p>
                    <p className="text-sm text-muted-foreground">{countriesError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : countries.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No countries found</p>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ? 'Try adjusting your search terms' : 'Create your first country to get started'}
                    </p>
                  </div>
                </div>
              ) : (
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
                    {countries.map((country) => (
                    <TableRow key={country.id}>
                      <TableCell className="font-medium">{country.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{country.code}</Badge>
                      </TableCell>
                        <TableCell className="max-w-xs truncate">{country.description || 'No description'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                            {new Date(country.updated_at).toLocaleDateString()}
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
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="group">
                                    <Trash2 className="mr-2 h-4 w-4 text-red-600 group-hover:text-white" />
                                    <span className="text-red-600 group-hover:text-white">Delete Country</span>
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-red-600">Delete Country</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      Are you sure you want to delete "{country.name}"? This action cannot be undone and will also delete all associated regions, cities, projects, boards, and schools.
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
              )}
            </CardContent>
          </Card>

          {/* Countries Pagination */}
          {!countriesLoading && !countriesError && countries.length > 0 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSearchPagination(countriesPagination.page - 1)}
                disabled={!countriesPagination.hasPrev}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(3, countriesPagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (countriesPagination.totalPages <= 3) {
                    pageNum = i + 1;
                  } else if (countriesPagination.page <= 2) {
                    pageNum = i + 1;
                  } else if (countriesPagination.page >= countriesPagination.totalPages - 1) {
                    pageNum = countriesPagination.totalPages - 2 + i;
                  } else {
                    pageNum = countriesPagination.page - 1 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === countriesPagination.page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSearchPagination(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSearchPagination(countriesPagination.page + 1)}
                disabled={!countriesPagination.hasNext}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
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
                    id="search-regions"
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
              {regionsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <ContentLoader />
                </div>
              ) : regionsError ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <p className="text-red-500 mb-2">Error loading regions</p>
                    <p className="text-sm text-muted-foreground">{regionsError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : filteredRegions.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No regions found</p>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ? 'Try adjusting your search terms' : 'Create your first region to get started'}
                    </p>
                  </div>
                </div>
              ) : (
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
                        <TableCell>{region.country?.name || 'N/A'}</TableCell>
                      <TableCell className="max-w-xs truncate">{region.description}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                            {new Date(region.updated_at).toLocaleDateString()}
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
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="group">
                                    <Trash2 className="mr-2 h-4 w-4 text-red-600 group-hover:text-white" />
                                    <span className="text-red-600 group-hover:text-white">Delete Region</span>
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-red-600">Delete Region</AlertDialogTitle>
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
              )}
            </CardContent>
          </Card>

          {/* Regions Pagination */}
          {!regionsLoading && !regionsError && filteredRegions.length > 0 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => regionsPrevPage()}
                disabled={!regionsPagination.hasPrev}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(3, regionsPagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (regionsPagination.totalPages <= 3) {
                    pageNum = i + 1;
                  } else if (regionsPagination.page <= 2) {
                    pageNum = i + 1;
                  } else if (regionsPagination.page >= regionsPagination.totalPages - 1) {
                    pageNum = regionsPagination.totalPages - 2 + i;
                  } else {
                    pageNum = regionsPagination.page - 1 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === regionsPagination.page ? "default" : "outline"}
                      size="sm"
                      onClick={() => regionsGoToPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => regionsNextPage()}
                disabled={!regionsPagination.hasNext}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
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
                    id="search-cities"
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
              {citiesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <ContentLoader />
                </div>
              ) : citiesError ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <p className="text-red-500 mb-2">Error loading cities</p>
                    <p className="text-sm text-muted-foreground">{citiesError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : filteredCities.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No cities found</p>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ? 'Try adjusting your search terms' : 'Create your first city to get started'}
                    </p>
                  </div>
                </div>
              ) : (
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
                        <TableCell>{city.country?.name || 'N/A'}</TableCell>
                        <TableCell>{city.region?.name || 'N/A'}</TableCell>
                      <TableCell className="max-w-xs truncate">{city.description}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                            {new Date(city.updated_at).toLocaleDateString()}
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
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="group">
                                    <Trash2 className="mr-2 h-4 w-4 text-red-600 group-hover:text-white" />
                                    <span className="text-red-600 group-hover:text-white">Delete City</span>
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-red-600">Delete City</AlertDialogTitle>
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
              )}
            </CardContent>
          </Card>

          {/* Cities Pagination */}
          {!citiesLoading && !citiesError && filteredCities.length > 0 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => citiesPrevPage()}
                disabled={!citiesPagination.hasPrev}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(3, citiesPagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (citiesPagination.totalPages <= 3) {
                    pageNum = i + 1;
                  } else if (citiesPagination.page <= 2) {
                    pageNum = i + 1;
                  } else if (citiesPagination.page >= citiesPagination.totalPages - 1) {
                    pageNum = citiesPagination.totalPages - 2 + i;
                  } else {
                    pageNum = citiesPagination.page - 1 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === citiesPagination.page ? "default" : "outline"}
                      size="sm"
                      onClick={() => citiesGoToPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => citiesNextPage()}
                disabled={!citiesPagination.hasNext}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
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
                    id="search-projects"
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
              {projectsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <ContentLoader />
                </div>
              ) : projectsError ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <p className="text-red-500 mb-2">Error loading projects</p>
                    <p className="text-sm text-muted-foreground">{projectsError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No projects found</p>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ? 'Try adjusting your search terms' : 'Create your first project to get started'}
                    </p>
                  </div>
                </div>
              ) : (
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
                        <TableCell>{project.country?.name || 'N/A'}</TableCell>
                        <TableCell>{project.region?.name || 'N/A'}</TableCell>
                        <TableCell>{project.city?.name || 'N/A'}</TableCell>
                      <TableCell className="max-w-xs truncate">{project.description}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                            {new Date(project.updated_at).toLocaleDateString()}
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
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="group">
                                    <Trash2 className="mr-2 h-4 w-4 text-red-600 group-hover:text-white" />
                                    <span className="text-red-600 group-hover:text-white">Delete Project</span>
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-red-600">Delete Project</AlertDialogTitle>
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
              )}
            </CardContent>
          </Card>

          {/* Projects Pagination */}
          {!projectsLoading && !projectsError && filteredProjects.length > 0 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => projectsPrevPage()}
                disabled={!projectsPagination.hasPrev}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(3, projectsPagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (projectsPagination.totalPages <= 3) {
                    pageNum = i + 1;
                  } else if (projectsPagination.page <= 2) {
                    pageNum = i + 1;
                  } else if (projectsPagination.page >= projectsPagination.totalPages - 1) {
                    pageNum = projectsPagination.totalPages - 2 + i;
                  } else {
                    pageNum = projectsPagination.page - 1 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === projectsPagination.page ? "default" : "outline"}
                      size="sm"
                      onClick={() => projectsGoToPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => projectsNextPage()}
                disabled={!projectsPagination.hasNext}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
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
                    id="search-boards"
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
              {boardsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <ContentLoader />
                </div>
              ) : boardsError ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <p className="text-red-500 mb-2">Error loading boards</p>
                    <p className="text-sm text-muted-foreground">{boardsError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : filteredBoards.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No boards found</p>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ? 'Try adjusting your search terms' : 'Create your first board to get started'}
                    </p>
                  </div>
                </div>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Project</TableHead>
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
                        <TableCell>{board.country?.name || 'N/A'}</TableCell>
                        <TableCell>{board.region?.name || 'N/A'}</TableCell>
                        <TableCell>{board.city?.name || 'N/A'}</TableCell>
                      <TableCell>
                          <Badge variant="outline">{board.project?.name || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                            {new Date(board.updated_at).toLocaleDateString()}
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
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="group">
                                    <Trash2 className="mr-2 h-4 w-4 text-red-600 group-hover:text-white" />
                                    <span className="text-red-600 group-hover:text-white">Delete Board</span>
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-red-600">Delete Board</AlertDialogTitle>
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
              )}
            </CardContent>
          </Card>

          {/* Boards Pagination */}
          {!boardsLoading && !boardsError && filteredBoards.length > 0 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => boardsPrevPage()}
                disabled={!boardsPagination.hasPrev}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(3, boardsPagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (boardsPagination.totalPages <= 3) {
                    pageNum = i + 1;
                  } else if (boardsPagination.page <= 2) {
                    pageNum = i + 1;
                  } else if (boardsPagination.page >= boardsPagination.totalPages - 1) {
                    pageNum = boardsPagination.totalPages - 2 + i;
                  } else {
                    pageNum = boardsPagination.page - 1 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === boardsPagination.page ? "default" : "outline"}
                      size="sm"
                      onClick={() => boardsGoToPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => boardsNextPage()}
                disabled={!boardsPagination.hasNext}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
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
                <div className="text-2xl font-bold">{schools.filter(s => s.school_type === 'Private').length}</div>
                <p className="text-xs text-muted-foreground">Private institutions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Public Schools</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{schools.filter(s => s.school_type === 'Public').length}</div>
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
                    id="search-schools"
                    placeholder="Search schools by name, code, or region..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40" id="school-type-filter">
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
              {schoolsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <ContentLoader />
                </div>
              ) : schoolsError ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <p className="text-red-500 mb-2">Error loading schools</p>
                    <p className="text-sm text-muted-foreground">{schoolsError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : filteredSchools.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No schools found</p>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ? 'Try adjusting your search terms' : 'Create your first school to get started'}
                    </p>
                  </div>
                </div>
              ) : (
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
                        <TableCell>{getTypeBadge(school.school_type)}</TableCell>
                        <TableCell>{school.country?.name || 'N/A'}</TableCell>
                        <TableCell>{school.region?.name || 'N/A'}</TableCell>
                        <TableCell>{school.city?.name || 'N/A'}</TableCell>
                      <TableCell>
                          <Badge variant="outline">{school.project?.name || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                          <Badge variant="outline">{school.board?.name || 'N/A'}</Badge>
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
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="group">
                                    <Trash2 className="mr-2 h-4 w-4 text-red-600 group-hover:text-white" />
                                    <span className="text-red-600 group-hover:text-white">Delete School</span>
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-red-600">Delete School</AlertDialogTitle>
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
              )}
            </CardContent>
          </Card>

          {/* Schools Pagination */}
          {!schoolsLoading && !schoolsError && filteredSchools.length > 0 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => schoolsPrevPage()}
                disabled={!schoolsPagination.hasPrev}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(3, schoolsPagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (schoolsPagination.totalPages <= 3) {
                    pageNum = i + 1;
                  } else if (schoolsPagination.page <= 2) {
                    pageNum = i + 1;
                  } else if (schoolsPagination.page >= schoolsPagination.totalPages - 1) {
                    pageNum = schoolsPagination.totalPages - 2 + i;
                  } else {
                    pageNum = schoolsPagination.page - 1 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === schoolsPagination.page ? "default" : "outline"}
                      size="sm"
                      onClick={() => schoolsGoToPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => schoolsNextPage()}
                disabled={!schoolsPagination.hasNext}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Country Dialogs */}
      {/* Create Country Dialog */}
      <Dialog open={isCountryCreateDialogOpen} onOpenChange={(open) => {
        setIsCountryCreateDialogOpen(open);
        if (!open) resetCountryForm();
      }}>
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
            <Button 
              onClick={handleCountryCreate} 
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90"
              disabled={countriesLoading}
            >
              {countriesLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Country'
              )}
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
            <Button 
              onClick={handleCountryEdit} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={countriesLoading}
            >
              {countriesLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Country'
              )}
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
                    <p className="text-lg">{new Date(viewingCountry.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-lg">{new Date(viewingCountry.updated_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
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
      <Dialog open={isRegionCreateDialogOpen} onOpenChange={(open) => {
        setIsRegionCreateDialogOpen(open);
        if (!open) resetRegionForm();
      }}>
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
                <SelectTrigger id="region-country">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
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
                <SelectTrigger id="edit-region-country">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
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
                    <p className="text-lg">{viewingRegion.country?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="text-lg">{new Date(viewingRegion.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-lg">{new Date(viewingRegion.updated_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
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
      <Dialog open={isCityCreateDialogOpen} onOpenChange={(open) => {
        setIsCityCreateDialogOpen(open);
        if (!open) resetCityForm();
      }}>
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
                onValueChange={(value) => setCityFormData({ ...cityFormData, country: value, region: '' })}
              >
                <SelectTrigger id="city-country">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
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
                disabled={!cityFormData.country}
              >
                <SelectTrigger id="city-region">
                  <SelectValue placeholder={cityFormData.country ? "Select a region" : "Select country first"} />
                </SelectTrigger>
                <SelectContent>
                  {regions
                    .filter(region => region.country_id === cityFormData.country)
                    .map((region) => (
                      <SelectItem key={region.id} value={region.id}>
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
                onValueChange={(value) => setCityFormData({ ...cityFormData, country: value, region: '' })}
              >
                <SelectTrigger id="edit-city-country">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
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
                disabled={!cityFormData.country}
              >
                <SelectTrigger id="edit-city-region">
                  <SelectValue placeholder={cityFormData.country ? "Select a region" : "Select country first"} />
                </SelectTrigger>
                <SelectContent>
                  {regions
                    .filter(region => region.country_id === cityFormData.country)
                    .map((region) => (
                      <SelectItem key={region.id} value={region.id}>
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
                    <p className="text-lg">{viewingCity.country?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Region</Label>
                    <p className="text-lg">{viewingCity.region?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="text-lg">{new Date(viewingCity.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-lg">{new Date(viewingCity.updated_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
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
      <Dialog open={isProjectCreateDialogOpen} onOpenChange={(open) => {
        setIsProjectCreateDialogOpen(open);
        if (!open) resetProjectForm();
      }}>
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
                onValueChange={(value) => setProjectFormData({ ...projectFormData, country: value, region: '', city: '' })}
              >
                <SelectTrigger id="project-country">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
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
                onValueChange={(value) => setProjectFormData({ ...projectFormData, region: value, city: '' })}
                disabled={!projectFormData.country}
              >
                <SelectTrigger id="project-region">
                  <SelectValue placeholder={projectFormData.country ? "Select a region" : "Select country first"} />
                </SelectTrigger>
                <SelectContent>
                  {regions
                    .filter(region => region.country_id === projectFormData.country)
                    .map((region) => (
                      <SelectItem key={region.id} value={region.id}>
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
                <SelectTrigger id="project-city">
                  <SelectValue placeholder={projectFormData.region ? "Select a city" : "Select region first"} />
                </SelectTrigger>
                <SelectContent>
                  {cities
                    .filter(city => city.region_id === projectFormData.region && city.country_id === projectFormData.country)
                    .map((city) => (
                      <SelectItem key={city.id} value={city.id}>
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
                onValueChange={(value) => setProjectFormData({ ...projectFormData, country: value, region: '', city: '' })}
              >
                <SelectTrigger id="edit-project-country">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
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
                onValueChange={(value) => setProjectFormData({ ...projectFormData, region: value, city: '' })}
                disabled={!projectFormData.country}
              >
                <SelectTrigger id="edit-project-region">
                  <SelectValue placeholder={projectFormData.country ? "Select a region" : "Select country first"} />
                </SelectTrigger>
                <SelectContent>
                  {regions
                    .filter(region => region.country_id === projectFormData.country)
                    .map((region) => (
                      <SelectItem key={region.id} value={region.id}>
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
                <SelectTrigger id="edit-project-city">
                  <SelectValue placeholder={projectFormData.region ? "Select a city" : "Select region first"} />
                </SelectTrigger>
                <SelectContent>
                  {cities
                    .filter(city => city.region_id === projectFormData.region && city.country_id === projectFormData.country)
                    .map((city) => (
                      <SelectItem key={city.id} value={city.id}>
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
                    <p className="text-lg">{viewingProject.country?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Region</Label>
                    <p className="text-lg">{viewingProject.region?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">City</Label>
                    <p className="text-lg">{viewingProject.city?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="text-lg">{new Date(viewingProject.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-lg">{new Date(viewingProject.updated_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
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
      <Dialog open={isBoardCreateDialogOpen} onOpenChange={(open) => {
        setIsBoardCreateDialogOpen(open);
        if (!open) resetBoardForm();
      }}>
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
                onValueChange={(value) => setBoardFormData({ ...boardFormData, country: value, region: '', city: '', project: '' })}
              >
                <SelectTrigger id="board-country">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
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
                onValueChange={(value) => setBoardFormData({ ...boardFormData, region: value, city: '', project: '' })}
                disabled={!boardFormData.country}
              >
                <SelectTrigger id="board-region">
                  <SelectValue placeholder={boardFormData.country ? "Select a region" : "Select country first"} />
                </SelectTrigger>
                <SelectContent>
                  {regions
                    .filter(region => region.country_id === boardFormData.country)
                    .map((region) => (
                      <SelectItem key={region.id} value={region.id}>
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
                onValueChange={(value) => setBoardFormData({ ...boardFormData, city: value, project: '' })}
                disabled={!boardFormData.region}
              >
                <SelectTrigger id="board-city">
                  <SelectValue placeholder={boardFormData.region ? "Select a city" : "Select region first"} />
                </SelectTrigger>
                <SelectContent>
                  {cities
                    .filter(city => city.region_id === boardFormData.region && city.country_id === boardFormData.country)
                    .map((city) => (
                      <SelectItem key={city.id} value={city.id}>
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
                disabled={!boardFormData.city}
              >
                <SelectTrigger id="board-project">
                  <SelectValue placeholder={boardFormData.city ? "Select a project" : "Select city first"} />
                </SelectTrigger>
                <SelectContent>
                  {projects
                    .filter(project => project.city_id === boardFormData.city && project.region_id === boardFormData.region && project.country_id === boardFormData.country)
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
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
                onValueChange={(value) => setBoardFormData({ ...boardFormData, country: value, region: '', city: '', project: '' })}
              >
                <SelectTrigger id="edit-board-country">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
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
                onValueChange={(value) => setBoardFormData({ ...boardFormData, region: value, city: '', project: '' })}
                disabled={!boardFormData.country}
              >
                <SelectTrigger id="edit-board-region">
                  <SelectValue placeholder={boardFormData.country ? "Select a region" : "Select country first"} />
                </SelectTrigger>
                <SelectContent>
                  {regions
                    .filter(region => region.country_id === boardFormData.country)
                    .map((region) => (
                      <SelectItem key={region.id} value={region.id}>
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
                onValueChange={(value) => setBoardFormData({ ...boardFormData, city: value, project: '' })}
                disabled={!boardFormData.region}
              >
                <SelectTrigger id="edit-board-city">
                  <SelectValue placeholder={boardFormData.region ? "Select a city" : "Select region first"} />
                </SelectTrigger>
                <SelectContent>
                  {cities
                    .filter(city => city.region_id === boardFormData.region && city.country_id === boardFormData.country)
                    .map((city) => (
                      <SelectItem key={city.id} value={city.id}>
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
                disabled={!boardFormData.city}
              >
                <SelectTrigger id="edit-board-project">
                  <SelectValue placeholder={boardFormData.city ? "Select a project" : "Select city first"} />
                </SelectTrigger>
                <SelectContent>
                  {projects
                    .filter(project => project.city_id === boardFormData.city && project.region_id === boardFormData.region && project.country_id === boardFormData.country)
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
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
                    <p className="text-lg">{viewingBoard.country?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Region</Label>
                    <p className="text-lg">{viewingBoard.region?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">City</Label>
                    <p className="text-lg">{viewingBoard.city?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Project</Label>
                    <p className="text-lg">{viewingBoard.project?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="text-lg">{new Date(viewingBoard.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-lg">{new Date(viewingBoard.updated_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
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
      <Dialog open={isSchoolCreateDialogOpen} onOpenChange={(open) => {
        setIsSchoolCreateDialogOpen(open);
        if (!open) resetSchoolForm();
      }}>
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
                <SelectTrigger id="school-type">
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
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, country: value, region: '', city: '', project: '', board: '' })}
              >
                <SelectTrigger id="school-country">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
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
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, region: value, city: '', project: '', board: '' })}
                disabled={!schoolFormData.country}
              >
                <SelectTrigger id="school-region">
                  <SelectValue placeholder={schoolFormData.country ? "Select a region" : "Select country first"} />
                </SelectTrigger>
                <SelectContent>
                  {regions
                    .filter(region => region.country_id === schoolFormData.country)
                    .map((region) => (
                      <SelectItem key={region.id} value={region.id}>
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
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, city: value, project: '', board: '' })}
                disabled={!schoolFormData.region}
              >
                <SelectTrigger id="school-city">
                  <SelectValue placeholder={schoolFormData.region ? "Select a city" : "Select region first"} />
                </SelectTrigger>
                <SelectContent>
                  {cities
                    .filter(city => city.region_id === schoolFormData.region && city.country_id === schoolFormData.country)
                    .map((city) => (
                      <SelectItem key={city.id} value={city.id}>
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
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, project: value, board: '' })}
                disabled={!schoolFormData.city}
              >
                <SelectTrigger id="school-project">
                  <SelectValue placeholder={schoolFormData.city ? "Select a project" : "Select city first"} />
                </SelectTrigger>
                <SelectContent>
                  {projects
                    .filter(project => project.city_id === schoolFormData.city && project.region_id === schoolFormData.region && project.country_id === schoolFormData.country)
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
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
                disabled={!schoolFormData.project}
              >
                <SelectTrigger id="school-board">
                  <SelectValue placeholder={schoolFormData.project ? "Select a board" : "Select project first"} />
                </SelectTrigger>
                <SelectContent>
                  {boards
                    .filter(board => board.project_id === schoolFormData.project)
                    .map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name}
                      </SelectItem>
                    ))}
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
                <SelectTrigger id="edit-school-type">
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
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, country: value, region: '', city: '', project: '', board: '' })}
              >
                <SelectTrigger id="edit-school-country">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
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
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, region: value, city: '', project: '', board: '' })}
                disabled={!schoolFormData.country}
              >
                <SelectTrigger id="edit-school-region">
                  <SelectValue placeholder={schoolFormData.country ? "Select a region" : "Select country first"} />
                </SelectTrigger>
                <SelectContent>
                  {regions
                    .filter(region => region.country_id === schoolFormData.country)
                    .map((region) => (
                      <SelectItem key={region.id} value={region.id}>
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
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, city: value, project: '', board: '' })}
                disabled={!schoolFormData.region}
              >
                <SelectTrigger id="edit-school-city">
                  <SelectValue placeholder={schoolFormData.region ? "Select a city" : "Select region first"} />
                </SelectTrigger>
                <SelectContent>
                  {cities
                    .filter(city => city.region_id === schoolFormData.region && city.country_id === schoolFormData.country)
                    .map((city) => (
                      <SelectItem key={city.id} value={city.id}>
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
                onValueChange={(value) => setSchoolFormData({ ...schoolFormData, project: value, board: '' })}
                disabled={!schoolFormData.city}
              >
                <SelectTrigger id="edit-school-project">
                  <SelectValue placeholder={schoolFormData.city ? "Select a project" : "Select city first"} />
                </SelectTrigger>
                <SelectContent>
                  {projects
                    .filter(project => project.city_id === schoolFormData.city && project.region_id === schoolFormData.region && project.country_id === schoolFormData.country)
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
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
                disabled={!schoolFormData.project}
              >
                <SelectTrigger id="edit-school-board">
                  <SelectValue placeholder={schoolFormData.project ? "Select a board" : "Select project first"} />
                </SelectTrigger>
                <SelectContent>
                  {boards
                    .filter(board => board.project_id === schoolFormData.project)
                    .map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name}
                      </SelectItem>
                    ))}
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
                    <div className="mt-1">{getTypeBadge(viewingSchool.school_type)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Country</Label>
                    <p className="text-lg">{viewingSchool.country?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Region</Label>
                    <p className="text-lg">{viewingSchool.region?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">City</Label>
                    <p className="text-lg">{viewingSchool.city?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Project</Label>
                    <p className="text-lg">{viewingSchool.project?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Board</Label>
                    <Badge variant="outline" className="text-lg">{viewingSchool.board?.name || 'N/A'}</Badge>
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
                    <p className="text-lg">{new Date(viewingSchool.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-lg">{new Date(viewingSchool.updated_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
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