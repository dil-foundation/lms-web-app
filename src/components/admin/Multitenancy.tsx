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
import { Search, Plus, MapPin, Building2, GraduationCap, Edit, Trash2, Eye, RefreshCw, Calendar, FileText, MoreHorizontal, Phone, Mail, Globe, Users2, Building, FolderOpen, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Sparkles, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useCountries, useRegions, useCities, useProjects, useBoards, useSchools } from '@/hooks/useMultitenancy';
import { Country as CountryType, CountryInsert, RegionInsert, CityInsert, ProjectInsert, BoardInsert, SchoolInsert, Region, City, Project, Board, School, MultitenancyService } from '@/services/multitenancyService';
import { ContentLoader } from '@/components/ContentLoader';
import { supabase } from '@/integrations/supabase/client';
import MultitenancyNotificationService from '@/services/multitenancyNotificationService';

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
  
  // Load ALL entities for dropdowns (not paginated)
  const [allCountries, setAllCountries] = useState<CountryType[]>([]);
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [allCities, setAllCities] = useState<City[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allBoards, setAllBoards] = useState<Board[]>([]);
  
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
  const [countryValidationErrors, setCountryValidationErrors] = useState({
    name: '',
    code: '',
    description: ''
  });
  const [countriesStats, setCountriesStats] = useState({
    totalCountries: 0,
    countriesWithDescription: 0,
    recentUpdates: 0
  });
  const [countryDependencies, setCountryDependencies] = useState<{
    regions: any[];
    cities: any[];
    projects: any[];
    boards: any[];
    schools: any[];
    classes: any[];
    courses: any[];
  } | null>(null);
  const [isCheckingDependencies, setIsCheckingDependencies] = useState(false);
  const [countryToDelete, setCountryToDelete] = useState<CountryType | null>(null);
  const [regionDependencies, setRegionDependencies] = useState<{
    cities: any[];
    projects: any[];
    boards: any[];
    schools: any[];
    classes: any[];
    courses: any[];
  } | null>(null);
  const [isCheckingRegionDependencies, setIsCheckingRegionDependencies] = useState(false);
  const [regionToDelete, setRegionToDelete] = useState<Region | null>(null);
  const [cityDependencies, setCityDependencies] = useState<{
    projects: any[];
    boards: any[];
    schools: any[];
    classes: any[];
    courses: any[];
  } | null>(null);
  const [isCheckingCityDependencies, setIsCheckingCityDependencies] = useState(false);
  const [cityToDelete, setCityToDelete] = useState<City | null>(null);
  const [projectDependencies, setProjectDependencies] = useState<{
    boards: any[];
    schools: any[];
    classes: any[];
    courses: any[];
  } | null>(null);
  const [isCheckingProjectDependencies, setIsCheckingProjectDependencies] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [boardDependencies, setBoardDependencies] = useState<{
    schools: any[];
    classes: any[];
    courses: any[];
  } | null>(null);
  const [isCheckingBoardDependencies, setIsCheckingBoardDependencies] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);
  const [schoolDependencies, setSchoolDependencies] = useState<{
    classes: any[];
  } | null>(null);
  const [isCheckingSchoolDependencies, setIsCheckingSchoolDependencies] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);

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
  const [regionValidationErrors, setRegionValidationErrors] = useState({
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
  const [boardValidationErrors, setBoardValidationErrors] = useState({
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
  const [cityValidationErrors, setCityValidationErrors] = useState({
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
  const [projectValidationErrors, setProjectValidationErrors] = useState({
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
  const [schoolValidationErrors, setSchoolValidationErrors] = useState({
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

  // Helper function to get current user info for notifications
  const getCurrentUserInfo = () => {
    return {
      id: userProfile.id,
      name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Admin'
    };
  };

  // Country validation functions
  const validateCountryName = (name: string): string => {
    if (!name.trim()) {
      return 'Country name is required';
    }
    if (name.trim().length < 2) {
      return 'Country name must be at least 2 characters';
    }
    if (name.trim().length > 100) {
      return 'Country name must be less than 100 characters';
    }
    if (!/^[a-zA-Z\s\-'\.]+$/.test(name.trim())) {
      return 'Country name can only contain letters, spaces, hyphens, apostrophes, and periods';
    }
    return '';
  };

  const validateCountryCode = (code: string): string => {
    if (!code.trim()) {
      return 'Country code is required';
    }
    if (code.trim().length < 2) {
      return 'Country code must be at least 2 characters';
    }
    if (code.trim().length > 3) {
      return 'Country code must be 3 characters or less';
    }
    if (!/^[A-Za-z]+$/.test(code.trim())) {
      return 'Country code can only contain letters';
    }
    // Check for duplicates (excluding current country if editing)
    const existingCountry = countries.find(country => 
      country.code.toLowerCase() === code.trim().toLowerCase() && 
      country.id !== editingCountry?.id
    );
    if (existingCountry) {
      return 'A country with this code already exists';
    }
    return '';
  };

  const validateCountryDescription = (description: string): string => {
    if (description.length > 500) {
      return 'Description must be less than 500 characters';
    }
    return '';
  };

  const validateCountryForm = (): boolean => {
    const nameError = validateCountryName(countryFormData.name);
    const codeError = validateCountryCode(countryFormData.code);
    const descriptionError = validateCountryDescription(countryFormData.description);

    setCountryValidationErrors({
      name: nameError,
      code: codeError,
      description: descriptionError
    });

    return !nameError && !codeError && !descriptionError;
  };

  // Region validation functions
  const validateRegionName = (name: string): string => {
    if (!name.trim()) {
      return 'Region name is required';
    }
    if (name.trim().length < 2) {
      return 'Region name must be at least 2 characters';
    }
    if (name.trim().length > 100) {
      return 'Region name must be less than 100 characters';
    }
    if (!/^[a-zA-Z\s\-'\.]+$/.test(name.trim())) {
      return 'Region name can only contain letters, spaces, hyphens, apostrophes, and periods';
    }
    return '';
  };

  const validateRegionCode = (code: string): string => {
    if (!code.trim()) {
      return 'Region code is required';
    }
    if (code.trim().length < 2) {
      return 'Region code must be at least 2 characters';
    }
    if (code.trim().length > 10) {
      return 'Region code must be 10 characters or less';
    }
    if (!/^[A-Za-z0-9]+$/.test(code.trim())) {
      return 'Region code can only contain letters and numbers';
    }
    // Check for duplicates (excluding current region if editing)
    const existingRegion = regions.find(region => 
      region.code.toLowerCase() === code.trim().toLowerCase() && 
      region.id !== editingRegion?.id
    );
    if (existingRegion) {
      return 'A region with this code already exists';
    }
    return '';
  };

  const validateRegionCountry = (countryId: string): string => {
    if (!countryId) {
      return 'Country is required';
    }
    return '';
  };

  const validateRegionDescription = (description: string): string => {
    if (description.length > 500) {
      return 'Description must be less than 500 characters';
    }
    return '';
  };

  const validateRegionForm = (): boolean => {
    const nameError = validateRegionName(regionFormData.name);
    const codeError = validateRegionCode(regionFormData.code);
    const countryError = validateRegionCountry(regionFormData.country);
    const descriptionError = validateRegionDescription(regionFormData.description);

    setRegionValidationErrors({
      name: nameError,
      code: codeError,
      country: countryError,
      description: descriptionError
    });

    return !nameError && !codeError && !countryError && !descriptionError;
  };

  // City validation functions
  const validateCityName = (name: string): string => {
    if (!name.trim()) {
      return 'City name is required';
    }
    if (name.trim().length < 2) {
      return 'City name must be at least 2 characters';
    }
    if (name.trim().length > 100) {
      return 'City name must be less than 100 characters';
    }
    if (!/^[a-zA-Z\s\-'\.]+$/.test(name.trim())) {
      return 'City name can only contain letters, spaces, hyphens, apostrophes, and periods';
    }
    return '';
  };

  const validateCityCode = (code: string): string => {
    if (!code.trim()) {
      return 'City code is required';
    }
    if (code.trim().length < 2) {
      return 'City code must be at least 2 characters';
    }
    if (code.trim().length > 10) {
      return 'City code must be 10 characters or less';
    }
    if (!/^[A-Za-z0-9]+$/.test(code.trim())) {
      return 'City code can only contain letters and numbers';
    }
    // Check for duplicates (excluding current city if editing)
    const existingCity = cities.find(city => 
      city.code.toLowerCase() === code.trim().toLowerCase() && 
      city.id !== editingCity?.id
    );
    if (existingCity) {
      return 'A city with this code already exists';
    }
    return '';
  };

  const validateCityCountry = (countryId: string): string => {
    if (!countryId) {
      return 'Country is required';
    }
    return '';
  };

  const validateCityRegion = (regionId: string): string => {
    if (!regionId) {
      return 'Region is required';
    }
    return '';
  };

  const validateCityDescription = (description: string): string => {
    if (description.length > 500) {
      return 'Description must be less than 500 characters';
    }
    return '';
  };

  const validateCityForm = (): boolean => {
    const nameError = validateCityName(cityFormData.name);
    const codeError = validateCityCode(cityFormData.code);
    const countryError = validateCityCountry(cityFormData.country);
    const regionError = validateCityRegion(cityFormData.region);
    const descriptionError = validateCityDescription(cityFormData.description);

    setCityValidationErrors({
      name: nameError,
      code: codeError,
      country: countryError,
      region: regionError,
      description: descriptionError
    });

    return !nameError && !codeError && !countryError && !regionError && !descriptionError;
  };

  // Project validation functions
  const validateProjectName = (name: string): string => {
    if (!name.trim()) {
      return 'Project name is required';
    }
    if (name.trim().length < 2) {
      return 'Project name must be at least 2 characters';
    }
    if (name.trim().length > 100) {
      return 'Project name must be less than 100 characters';
    }
    if (!/^[a-zA-Z0-9\s\-'\.]+$/.test(name.trim())) {
      return 'Project name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods';
    }
    return '';
  };

  const validateProjectCode = (code: string): string => {
    if (!code.trim()) {
      return 'Project code is required';
    }
    if (code.trim().length < 2) {
      return 'Project code must be at least 2 characters';
    }
    if (code.trim().length > 10) {
      return 'Project code must be 10 characters or less';
    }
    if (!/^[A-Za-z0-9\-]+$/.test(code.trim())) {
      return 'Project code can only contain letters, numbers, and hyphens';
    }
    // Check for duplicates (excluding current project if editing)
    const existingProject = projects.find(project => 
      project.code.toLowerCase() === code.trim().toLowerCase() && 
      project.id !== editingProject?.id
    );
    if (existingProject) {
      return 'A project with this code already exists';
    }
    return '';
  };

  const validateProjectCountry = (countryId: string): string => {
    if (!countryId) {
      return 'Country is required';
    }
    return '';
  };

  const validateProjectRegion = (regionId: string): string => {
    if (!regionId) {
      return 'Region is required';
    }
    return '';
  };

  const validateProjectCity = (cityId: string): string => {
    if (!cityId) {
      return 'City is required';
    }
    return '';
  };

  const validateProjectDescription = (description: string): string => {
    if (description.length > 500) {
      return 'Description must be less than 500 characters';
    }
    return '';
  };

  const validateProjectForm = (): boolean => {
    const nameError = validateProjectName(projectFormData.name);
    const codeError = validateProjectCode(projectFormData.code);
    const countryError = validateProjectCountry(projectFormData.country);
    const regionError = validateProjectRegion(projectFormData.region);
    const cityError = validateProjectCity(projectFormData.city);
    const descriptionError = validateProjectDescription(projectFormData.description);

    setProjectValidationErrors({
      name: nameError,
      code: codeError,
      country: countryError,
      region: regionError,
      city: cityError,
      description: descriptionError
    });

    return !nameError && !codeError && !countryError && !regionError && !cityError && !descriptionError;
  };

  // Board validation functions
  const validateBoardName = (name: string): string => {
    if (!name.trim()) {
      return 'Board name is required';
    }
    if (name.trim().length < 2) {
      return 'Board name must be at least 2 characters';
    }
    if (name.trim().length > 100) {
      return 'Board name must be less than 100 characters';
    }
    if (!/^[a-zA-Z0-9\s\-'\.]+$/.test(name.trim())) {
      return 'Board name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods';
    }
    return '';
  };

  const validateBoardCode = (code: string): string => {
    if (!code.trim()) {
      return 'Board code is required';
    }
    if (code.trim().length < 2) {
      return 'Board code must be at least 2 characters';
    }
    if (code.trim().length > 10) {
      return 'Board code must be 10 characters or less';
    }
    if (!/^[A-Za-z0-9]+$/.test(code.trim())) {
      return 'Board code can only contain letters and numbers';
    }
    // Check for duplicates (excluding current board if editing)
    const existingBoard = boards.find(board => 
      board.code.toLowerCase() === code.trim().toLowerCase() && 
      board.id !== editingBoard?.id
    );
    if (existingBoard) {
      return 'A board with this code already exists';
    }
    return '';
  };

  const validateBoardCountry = (countryId: string): string => {
    if (!countryId) {
      return 'Country is required';
    }
    return '';
  };

  const validateBoardRegion = (regionId: string): string => {
    if (!regionId) {
      return 'Region is required';
    }
    return '';
  };

  const validateBoardCity = (cityId: string): string => {
    if (!cityId) {
      return 'City is required';
    }
    return '';
  };

  const validateBoardProject = (projectId: string): string => {
    if (!projectId) {
      return 'Project is required';
    }
    return '';
  };

  const validateBoardDescription = (description: string): string => {
    if (description.length > 500) {
      return 'Description must be less than 500 characters';
    }
    return '';
  };

  const validateBoardForm = (): boolean => {
    const nameError = validateBoardName(boardFormData.name);
    const codeError = validateBoardCode(boardFormData.code);
    const countryError = validateBoardCountry(boardFormData.country);
    const regionError = validateBoardRegion(boardFormData.region);
    const cityError = validateBoardCity(boardFormData.city);
    const projectError = validateBoardProject(boardFormData.project);
    const descriptionError = validateBoardDescription(boardFormData.description);

    setBoardValidationErrors({
      name: nameError,
      code: codeError,
      country: countryError,
      region: regionError,
      city: cityError,
      project: projectError,
      description: descriptionError
    });

    return !nameError && !codeError && !countryError && !regionError && !cityError && !projectError && !descriptionError;
  };

  // School validation functions
  const validateSchoolName = (name: string): string => {
    if (!name.trim()) {
      return 'School name is required';
    }
    if (name.trim().length < 2) {
      return 'School name must be at least 2 characters';
    }
    if (name.trim().length > 100) {
      return 'School name must be less than 100 characters';
    }
    if (!/^[a-zA-Z0-9\s\-'\.]+$/.test(name.trim())) {
      return 'School name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods';
    }
    return '';
  };

  const validateSchoolCode = (code: string): string => {
    if (!code.trim()) {
      return 'School code is required';
    }
    if (code.trim().length < 2) {
      return 'School code must be at least 2 characters';
    }
    if (code.trim().length > 10) {
      return 'School code must be 10 characters or less';
    }
    if (!/^[A-Za-z0-9\-]+$/.test(code.trim())) {
      return 'School code can only contain letters, numbers, and hyphens';
    }
    // Check for duplicates (excluding current school if editing)
    const existingSchool = schools.find(school => 
      school.code.toLowerCase() === code.trim().toLowerCase() && 
      school.id !== editingSchool?.id
    );
    if (existingSchool) {
      return 'A school with this code already exists';
    }
    return '';
  };

  const validateSchoolType = (type: string): string => {
    if (!type) {
      return 'School type is required';
    }
    return '';
  };

  const validateSchoolAddress = (address: string): string => {
    if (!address.trim()) {
      return 'Address is required';
    }
    if (address.trim().length < 5) {
      return 'Address must be at least 5 characters';
    }
    if (address.trim().length > 200) {
      return 'Address must be less than 200 characters';
    }
    return '';
  };

  const validateSchoolCountry = (countryId: string): string => {
    if (!countryId) {
      return 'Country is required';
    }
    return '';
  };

  const validateSchoolRegion = (regionId: string): string => {
    if (!regionId) {
      return 'Region is required';
    }
    return '';
  };

  const validateSchoolCity = (cityId: string): string => {
    if (!cityId) {
      return 'City is required';
    }
    return '';
  };

  const validateSchoolProject = (projectId: string): string => {
    if (!projectId) {
      return 'Project is required';
    }
    return '';
  };

  const validateSchoolBoard = (boardId: string): string => {
    if (!boardId) {
      return 'Board is required';
    }
    return '';
  };

  const validateSchoolPhone = (phone: string): string => {
    if (phone.trim() && !/^[\+]?[0-9\s\-\(\)]{10,15}$/.test(phone.trim())) {
      return 'Please enter a valid phone number';
    }
    return '';
  };

  const validateSchoolEmail = (email: string): string => {
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validateSchoolWebsite = (website: string): string => {
    if (website.trim() && !/^https?:\/\/.+\..+/.test(website.trim())) {
      return 'Please enter a valid website URL (starting with http:// or https://)';
    }
    return '';
  };

  const validateSchoolForm = (): boolean => {
    const nameError = validateSchoolName(schoolFormData.name);
    const codeError = validateSchoolCode(schoolFormData.code);
    const typeError = validateSchoolType(schoolFormData.type);
    const addressError = validateSchoolAddress(schoolFormData.address);
    const countryError = validateSchoolCountry(schoolFormData.country);
    const regionError = validateSchoolRegion(schoolFormData.region);
    const cityError = validateSchoolCity(schoolFormData.city);
    const projectError = validateSchoolProject(schoolFormData.project);
    const boardError = validateSchoolBoard(schoolFormData.board);
    const phoneError = validateSchoolPhone(schoolFormData.phone);
    const emailError = validateSchoolEmail(schoolFormData.email);
    const websiteError = validateSchoolWebsite(schoolFormData.website);

    setSchoolValidationErrors({
      name: nameError,
      code: codeError,
      type: typeError,
      address: addressError,
      country: countryError,
      region: regionError,
      city: cityError,
      project: projectError,
      board: boardError,
      phone: phoneError,
      email: emailError,
      website: websiteError
    });

    return !nameError && !codeError && !typeError && !addressError && !countryError && !regionError && !cityError && !projectError && !boardError && !phoneError && !emailError && !websiteError;
  };

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
    // Validate form before submission
    if (!validateCountryForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    try {
      const newCountry = await createCountry({
      name: countryFormData.name.trim(),
      code: countryFormData.code.trim().toUpperCase(),
        description: countryFormData.description.trim()
      });
    setIsCountryCreateDialogOpen(false);
    resetCountryForm();
      // Refresh statistics
      const stats = await getCountriesWithStats();
      setCountriesStats(stats);
      
      // Send notification to all admins
      try {
        await MultitenancyNotificationService.notifyCountryChange(
          'created',
          {
            id: newCountry.id,
            name: newCountry.name,
            code: newCountry.code
          },
          getCurrentUserInfo()
        );
      } catch (notificationError) {
        console.error('Error sending country creation notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
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
    if (!editingCountry) {
      toast.error('No country selected for editing');
      return;
    }

    // Validate form before submission
    if (!validateCountryForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    try {
      await updateCountry(editingCountry.id, {
            name: countryFormData.name.trim(),
            code: countryFormData.code.trim().toUpperCase(),
        description: countryFormData.description.trim()
      });
    setIsCountryEditDialogOpen(false);
    setEditingCountry(null);
    resetCountryForm();
      // Refresh statistics
      const stats = await getCountriesWithStats();
      setCountriesStats(stats);
      
      // Send notification to all admins
      try {
        await MultitenancyNotificationService.notifyCountryChange(
          'updated',
          {
            id: editingCountry.id,
            name: countryFormData.name.trim(),
            code: countryFormData.code.trim().toUpperCase()
          },
          getCurrentUserInfo()
        );
      } catch (notificationError) {
        console.error('Error sending country update notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
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

  // Country dependency checking functions
  const checkCountryDependencies = async (countryId: string) => {
    const dependencies = {
      regions: [] as any[],
      cities: [] as any[],
      projects: [] as any[],
      boards: [] as any[],
      schools: [] as any[],
      classes: [] as any[],
      courses: [] as any[]
    };

    try {
      // Check regions directly
      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('id, name, code')
        .eq('country_id', countryId);
      
      if (!regionsError && regionsData) {
        dependencies.regions = regionsData;
      }

      // Check cities (through regions)
      for (const region of dependencies.regions) {
        const { data: citiesData, error: citiesError } = await supabase
          .from('cities')
          .select('id, name, code, region_id')
          .eq('region_id', region.id);
        
        if (!citiesError && citiesData) {
          dependencies.cities.push(...citiesData);
        }
      }

      // Check projects (through cities)
      for (const city of dependencies.cities) {
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, name, code, city_id')
          .eq('city_id', city.id);
        
        if (!projectsError && projectsData) {
          dependencies.projects.push(...projectsData);
        }
      }

      // Check boards (through projects)
      for (const project of dependencies.projects) {
        const { data: boardsData, error: boardsError } = await supabase
          .from('boards')
          .select('id, name, code, project_id')
          .eq('project_id', project.id);
        
        if (!boardsError && boardsData) {
          dependencies.boards.push(...boardsData);
        }
      }

      // Check schools (through boards)
      for (const board of dependencies.boards) {
        const { data: schoolsData, error: schoolsError } = await supabase
          .from('schools')
          .select('id, name, code, board_id')
          .eq('board_id', board.id);
        
        if (!schoolsError && schoolsData) {
          dependencies.schools.push(...schoolsData);
        }
      }

      // Check classes (through schools)
      for (const school of dependencies.schools) {
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('id, name, code, grade, school_id')
          .eq('school_id', school.id);
        
        if (!classesError && classesData) {
          dependencies.classes.push(...classesData);
        }
      }

      // Check courses (directly linked via country_ids array)
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, status')
        .contains('country_ids', [countryId]);
      
      if (!coursesError && coursesData) {
        dependencies.courses = coursesData;
      }

      return dependencies;
    } catch (error) {
      console.error('Error checking country dependencies:', error);
      return dependencies;
    }
  };


  const handleCountryDeleteCheck = async (country: CountryType) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(async () => {
      setCountryToDelete(country);
      setIsCheckingDependencies(true);
      setCountryDependencies(null);

      try {
        // Check dependencies
        const dependencies = await checkCountryDependencies(country.id);
        setCountryDependencies(dependencies);
      } catch (error) {
        console.error('Error checking country dependencies:', error);
        toast.error('Failed to check dependencies. Please try again.');
      } finally {
        setIsCheckingDependencies(false);
      }
    }, 100);
  };

  const handleCountryDeleteConfirm = async () => {
    if (!countryToDelete) return;

    // Capture entity info before deletion
    const countryInfo = {
      id: countryToDelete.id,
      name: countryToDelete.name,
      code: countryToDelete.code
    };

    // Add delay to prevent aria-hidden conflicts
    setTimeout(async () => {
      try {
        
        await deleteCountry(countryInfo.id);
        // Refresh statistics
        const stats = await getCountriesWithStats();
        setCountriesStats(stats);
        toast.success('Country deleted successfully');
        
        // Send notification to all admins
        try {
          await MultitenancyNotificationService.notifyCountryChange(
            'deleted',
            countryInfo,
            getCurrentUserInfo()
          );
        } catch (notificationError) {
          console.error('Error sending country deletion notification:', notificationError);
          // Don't fail the main operation if notification fails
        }
        
        // Reset state
        setCountryToDelete(null);
        setCountryDependencies(null);
      } catch (error) {
        console.error('Error deleting country:', error);
        toast.error('Failed to delete country. Please try again.');
      }
    }, 100);
  };

  const handleCountryDeleteCancel = () => {
    setCountryToDelete(null);
    setCountryDependencies(null);
    setIsCheckingDependencies(false);
  };

  // Region dependency checking functions
  const checkRegionDependencies = async (regionId: string) => {
    const dependencies = {
      cities: [] as any[],
      projects: [] as any[],
      boards: [] as any[],
      schools: [] as any[],
      classes: [] as any[],
      courses: [] as any[]
    };

    try {
      // Check cities directly
      const { data: citiesData, error: citiesError } = await supabase
        .from('cities')
        .select('id, name, code, region_id')
        .eq('region_id', regionId);
      
      if (!citiesError && citiesData) {
        dependencies.cities = citiesData;
      }

      // Check projects (through cities)
      for (const city of dependencies.cities) {
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, name, code, city_id')
          .eq('city_id', city.id);
        
        if (!projectsError && projectsData) {
          dependencies.projects.push(...projectsData);
        }
      }

      // Check boards (through projects)
      for (const project of dependencies.projects) {
        const { data: boardsData, error: boardsError } = await supabase
          .from('boards')
          .select('id, name, code, project_id')
          .eq('project_id', project.id);
        
        if (!boardsError && boardsData) {
          dependencies.boards.push(...boardsData);
        }
      }

      // Check schools (through boards)
      for (const board of dependencies.boards) {
        const { data: schoolsData, error: schoolsError } = await supabase
          .from('schools')
          .select('id, name, code, board_id')
          .eq('board_id', board.id);
        
        if (!schoolsError && schoolsData) {
          dependencies.schools.push(...schoolsData);
        }
      }

      // Check classes (through schools)
      for (const school of dependencies.schools) {
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('id, name, code, grade, school_id')
          .eq('school_id', school.id);
        
        if (!classesError && classesData) {
          dependencies.classes.push(...classesData);
        }
      }

      // Check courses (directly linked via region_ids array)
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, status')
        .contains('region_ids', [regionId]);
      
      if (!coursesError && coursesData) {
        dependencies.courses = coursesData;
      }

      return dependencies;
    } catch (error) {
      console.error('Error checking region dependencies:', error);
      return dependencies;
    }
  };

  const handleRegionDeleteCheck = async (region: Region) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(async () => {
      setRegionToDelete(region);
      setIsCheckingRegionDependencies(true);
      setRegionDependencies(null);

      try {
        // Check dependencies
        const dependencies = await checkRegionDependencies(region.id);
        setRegionDependencies(dependencies);
      } catch (error) {
        console.error('Error checking region dependencies:', error);
        toast.error('Failed to check dependencies. Please try again.');
      } finally {
        setIsCheckingRegionDependencies(false);
      }
    }, 100);
  };

  const handleRegionDeleteConfirm = async () => {
    if (!regionToDelete) return;

    // Capture entity info before deletion
    const regionInfo = {
      id: regionToDelete.id,
      name: regionToDelete.name,
      code: regionToDelete.code
    };
    
    // Get country name for notification before deletion
    const country = countries.find(c => c.id === regionToDelete.country_id);

    // Add delay to prevent aria-hidden conflicts
    setTimeout(async () => {
      try {
        await deleteRegion(regionInfo.id);
        toast.success('Region deleted successfully');
        
        // Refresh dropdown data
        await refreshAllEntitiesForDropdowns();
        
        // Send notification to all admins
        if (country) {
          try {
            await MultitenancyNotificationService.notifyRegionChange(
              'deleted',
              regionInfo,
              { name: country.name },
              getCurrentUserInfo()
            );
          } catch (notificationError) {
            console.error('Error sending region deletion notification:', notificationError);
            // Don't fail the main operation if notification fails
          }
        }
        
        // Reset state
        setRegionToDelete(null);
        setRegionDependencies(null);
      } catch (error) {
        console.error('Error deleting region:', error);
        toast.error('Failed to delete region. Please try again.');
      }
    }, 100);
  };

  const handleRegionDeleteCancel = () => {
    setRegionToDelete(null);
    setRegionDependencies(null);
    setIsCheckingRegionDependencies(false);
  };

  // City dependency checking functions
  const checkCityDependencies = async (cityId: string) => {
    const dependencies = {
      projects: [] as any[],
      boards: [] as any[],
      schools: [] as any[],
      classes: [] as any[],
      courses: [] as any[]
    };

    try {
      // Check projects directly
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, code, city_id')
        .eq('city_id', cityId);
      
      if (!projectsError && projectsData) {
        dependencies.projects = projectsData;
      }

      // Check boards (through projects)
      for (const project of dependencies.projects) {
        const { data: boardsData, error: boardsError } = await supabase
          .from('boards')
          .select('id, name, code, project_id')
          .eq('project_id', project.id);
        
        if (!boardsError && boardsData) {
          dependencies.boards.push(...boardsData);
        }
      }

      // Check schools (through boards)
      for (const board of dependencies.boards) {
        const { data: schoolsData, error: schoolsError } = await supabase
          .from('schools')
          .select('id, name, code, board_id')
          .eq('board_id', board.id);
        
        if (!schoolsError && schoolsData) {
          dependencies.schools.push(...schoolsData);
        }
      }

      // Check classes (through schools)
      for (const school of dependencies.schools) {
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('id, name, code, grade, school_id')
          .eq('school_id', school.id);
        
        if (!classesError && classesData) {
          dependencies.classes.push(...classesData);
        }
      }

      // Check courses (directly linked via city_ids array)
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, status')
        .contains('city_ids', [cityId]);
      
      if (!coursesError && coursesData) {
        dependencies.courses = coursesData;
      }

      return dependencies;
    } catch (error) {
      console.error('Error checking city dependencies:', error);
      return dependencies;
    }
  };

  const handleCityDeleteCheck = async (city: City) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(async () => {
      setCityToDelete(city);
      setIsCheckingCityDependencies(true);
      setCityDependencies(null);

      try {
        // Check dependencies
        const dependencies = await checkCityDependencies(city.id);
        setCityDependencies(dependencies);
      } catch (error) {
        console.error('Error checking city dependencies:', error);
        toast.error('Failed to check dependencies. Please try again.');
      } finally {
        setIsCheckingCityDependencies(false);
      }
    }, 100);
  };

  const handleCityDeleteConfirm = async () => {
    if (!cityToDelete) return;

    // Capture entity info before deletion
    const cityInfo = {
      id: cityToDelete.id,
      name: cityToDelete.name,
      code: cityToDelete.code
    };
    
    // Get region and country names for notification before deletion
    const region = regions.find(r => r.id === cityToDelete.region_id);
    const country = countries.find(c => c.id === cityToDelete.country_id);

    // Add delay to prevent aria-hidden conflicts
    setTimeout(async () => {
      try {
        await deleteCity(cityInfo.id);
        toast.success('City deleted successfully');
        
        // Refresh dropdown data
        await refreshAllEntitiesForDropdowns();
        
        // Send notification to all admins
        if (region && country) {
          try {
            await MultitenancyNotificationService.notifyCityChange(
              'deleted',
              cityInfo,
              { name: region.name },
              { name: country.name },
              getCurrentUserInfo()
            );
          } catch (notificationError) {
            console.error('Error sending city deletion notification:', notificationError);
            // Don't fail the main operation if notification fails
          }
        }
        
        // Reset state
        setCityToDelete(null);
        setCityDependencies(null);
      } catch (error) {
        console.error('Error deleting city:', error);
        toast.error('Failed to delete city. Please try again.');
      }
    }, 100);
  };

  const handleCityDeleteCancel = () => {
    setCityToDelete(null);
    setCityDependencies(null);
    setIsCheckingCityDependencies(false);
  };

  // Project dependency checking functions
  const checkProjectDependencies = async (projectId: string) => {
    const dependencies = {
      boards: [] as any[],
      schools: [] as any[],
      classes: [] as any[],
      courses: [] as any[]
    };

    try {
      // Check boards directly
      const { data: boardsData, error: boardsError } = await supabase
        .from('boards')
        .select('id, name, code, project_id')
        .eq('project_id', projectId);
      
      if (!boardsError && boardsData) {
        dependencies.boards = boardsData;
      }

      // Check schools (through boards)
      for (const board of dependencies.boards) {
        const { data: schoolsData, error: schoolsError } = await supabase
          .from('schools')
          .select('id, name, code, board_id')
          .eq('board_id', board.id);
        
        if (!schoolsError && schoolsData) {
          dependencies.schools.push(...schoolsData);
        }
      }

      // Check classes (through schools)
      for (const school of dependencies.schools) {
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('id, name, code, grade, school_id')
          .eq('school_id', school.id);
        
        if (!classesError && classesData) {
          dependencies.classes.push(...classesData);
        }
      }

      // Check courses (directly linked via project_ids array)
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, status')
        .contains('project_ids', [projectId]);
      
      if (!coursesError && coursesData) {
        dependencies.courses = coursesData;
      }

      return dependencies;
    } catch (error) {
      console.error('Error checking project dependencies:', error);
      return dependencies;
    }
  };

  const handleProjectDeleteCheck = async (project: Project) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(async () => {
      setProjectToDelete(project);
      setIsCheckingProjectDependencies(true);
      setProjectDependencies(null);

      try {
        // Check dependencies
        const dependencies = await checkProjectDependencies(project.id);
        setProjectDependencies(dependencies);
      } catch (error) {
        console.error('Error checking project dependencies:', error);
        toast.error('Failed to check dependencies. Please try again.');
      } finally {
        setIsCheckingProjectDependencies(false);
      }
    }, 100);
  };

  const handleProjectDeleteConfirm = async () => {
    if (!projectToDelete) return;

    // Capture entity info before deletion
    const projectInfo = {
      id: projectToDelete.id,
      name: projectToDelete.name,
      code: projectToDelete.code
    };
    
    // Get city name for notification before deletion
    const city = cities.find(c => c.id === projectToDelete.city_id);

    // Add delay to prevent aria-hidden conflicts
    setTimeout(async () => {
      try {
        await deleteProject(projectInfo.id);
        toast.success('Project deleted successfully');
        
        // Refresh dropdown data
        await refreshAllEntitiesForDropdowns();
        
        // Send notification to all admins
        if (city) {
          try {
            await MultitenancyNotificationService.notifyProjectChange(
              'deleted',
              projectInfo,
              { name: city.name },
              getCurrentUserInfo()
            );
          } catch (notificationError) {
            console.error('Error sending project deletion notification:', notificationError);
            // Don't fail the main operation if notification fails
          }
        }
        
        // Reset state
        setProjectToDelete(null);
        setProjectDependencies(null);
      } catch (error) {
        console.error('Error deleting project:', error);
        toast.error('Failed to delete project. Please try again.');
      }
    }, 100);
  };

  const handleProjectDeleteCancel = () => {
    setProjectToDelete(null);
    setProjectDependencies(null);
    setIsCheckingProjectDependencies(false);
  };

  // Board dependency checking functions
  const checkBoardDependencies = async (boardId: string) => {
    const dependencies = {
      schools: [] as any[],
      classes: [] as any[],
      courses: [] as any[]
    };

    try {
      // Check schools directly
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('id, name, code, board_id')
        .eq('board_id', boardId);
      
      if (!schoolsError && schoolsData) {
        dependencies.schools = schoolsData;
      }

      // Check classes (through schools)
      for (const school of dependencies.schools) {
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('id, name, code, grade, school_id')
          .eq('school_id', school.id);
        
        if (!classesError && classesData) {
          dependencies.classes.push(...classesData);
        }
      }

      // Check courses (directly linked via board_ids array)
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, status')
        .contains('board_ids', [boardId]);
      
      if (!coursesError && coursesData) {
        dependencies.courses = coursesData;
      }

      return dependencies;
    } catch (error) {
      console.error('Error checking board dependencies:', error);
      return dependencies;
    }
  };

  const handleBoardDeleteCheck = async (board: Board) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(async () => {
      setBoardToDelete(board);
      setIsCheckingBoardDependencies(true);
      setBoardDependencies(null);

      try {
        // Check dependencies
        const dependencies = await checkBoardDependencies(board.id);
        setBoardDependencies(dependencies);
      } catch (error) {
        console.error('Error checking board dependencies:', error);
        toast.error('Failed to check dependencies. Please try again.');
      } finally {
        setIsCheckingBoardDependencies(false);
      }
    }, 100);
  };

  const handleBoardDeleteConfirm = async () => {
    if (!boardToDelete) return;

    // Capture entity info before deletion
    const boardInfo = {
      id: boardToDelete.id,
      name: boardToDelete.name,
      code: boardToDelete.code
    };
    
    // Get project name for notification before deletion
    const project = projects.find(p => p.id === boardToDelete.project_id);

    // Add delay to prevent aria-hidden conflicts
    setTimeout(async () => {
      try {
        await deleteBoard(boardInfo.id);
        toast.success('Board deleted successfully');
        
        // Refresh dropdown data
        await refreshAllEntitiesForDropdowns();
        
        // Send notification to all admins
        if (project) {
          try {
            await MultitenancyNotificationService.notifyBoardChange(
              'deleted',
              boardInfo,
              { name: project.name },
              getCurrentUserInfo()
            );
          } catch (notificationError) {
            console.error('Error sending board deletion notification:', notificationError);
            // Don't fail the main operation if notification fails
          }
        }
        
        // Reset state
        setBoardToDelete(null);
        setBoardDependencies(null);
      } catch (error) {
        console.error('Error deleting board:', error);
        toast.error('Failed to delete board. Please try again.');
      }
    }, 100);
  };

  const handleBoardDeleteCancel = () => {
    setBoardToDelete(null);
    setBoardDependencies(null);
    setIsCheckingBoardDependencies(false);
  };

  // School dependency checking functions
  const checkSchoolDependencies = async (schoolId: string) => {
    const dependencies = {
      classes: [] as any[]
    };

    try {
      // Check classes directly
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name, code, grade, school_id')
        .eq('school_id', schoolId);
      
      if (!classesError && classesData) {
        dependencies.classes = classesData;
      }

      return dependencies;
    } catch (error) {
      console.error('Error checking school dependencies:', error);
      return dependencies;
    }
  };

  const handleSchoolDeleteCheck = async (school: School) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(async () => {
      setSchoolToDelete(school);
      setIsCheckingSchoolDependencies(true);
      setSchoolDependencies(null);

      try {
        // Check dependencies
        const dependencies = await checkSchoolDependencies(school.id);
        setSchoolDependencies(dependencies);
      } catch (error) {
        console.error('Error checking school dependencies:', error);
        toast.error('Failed to check dependencies. Please try again.');
      } finally {
        setIsCheckingSchoolDependencies(false);
      }
    }, 100);
  };

  const handleSchoolDeleteConfirm = async () => {
    if (!schoolToDelete) return;

    // Capture entity info before deletion
    const schoolInfo = {
      id: schoolToDelete.id,
      name: schoolToDelete.name,
      code: schoolToDelete.code
    };
    
    // Get board name for notification before deletion
    const board = boards.find(b => b.id === schoolToDelete.board_id);

    // Add delay to prevent aria-hidden conflicts
    setTimeout(async () => {
      try {
        await deleteSchool(schoolInfo.id);
        toast.success('School deleted successfully');
        
        // Send notification to all admins
        if (board) {
          try {
            await MultitenancyNotificationService.notifySchoolChange(
              'deleted',
              schoolInfo,
              { name: board.name },
              getCurrentUserInfo()
            );
          } catch (notificationError) {
            console.error('Error sending school deletion notification:', notificationError);
            // Don't fail the main operation if notification fails
          }
        }
        
        // Reset state
        setSchoolToDelete(null);
        setSchoolDependencies(null);
      } catch (error) {
        console.error('Error deleting school:', error);
        toast.error('Failed to delete school. Please try again.');
      }
    }, 100);
  };

  const handleSchoolDeleteCancel = () => {
    setSchoolToDelete(null);
    setSchoolDependencies(null);
    setIsCheckingSchoolDependencies(false);
  };

  const openCountryEditDialog = (country: CountryType) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => {
    setEditingCountry(country);
    setCountryFormData({
      name: country.name,
      code: country.code,
      description: country.description
    });
    // Clear validation errors when opening edit dialog
    setCountryValidationErrors({
      name: '',
      code: '',
      description: ''
    });
    setIsCountryEditDialogOpen(true);
    }, 100);
  };

  const openCountryViewDialog = (country: CountryType) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => {
    setViewingCountry(country);
    setIsCountryViewDialogOpen(true);
    }, 100);
  };

  const resetCountryForm = () => {
    setCountryFormData({
      name: '',
      code: '',
      description: ''
    });
    setCountryValidationErrors({
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

  // Function to refresh all entity lists for dropdowns
  const refreshAllEntitiesForDropdowns = async () => {
    try {
      // Load all countries
      const countriesData = await MultitenancyService.getCountries();
      setAllCountries(countriesData);

      // Load all regions
      const regionsData = await MultitenancyService.getRegions();
      setAllRegions(regionsData);

      // Load all cities
      const citiesData = await MultitenancyService.getCities();
      setAllCities(citiesData);

      // Load all projects
      const projectsData = await MultitenancyService.getProjects();
      setAllProjects(projectsData);

      // Load all boards
      const boardsData = await MultitenancyService.getBoards();
      setAllBoards(boardsData);
    } catch (error) {
      console.error('Failed to refresh entities for dropdowns:', error);
      // Don't show error toast here as it might be annoying during normal operations
    }
  };

  // Load ALL entities for dropdowns (bypassing pagination)
  useEffect(() => {
    refreshAllEntitiesForDropdowns();
  }, []); // Run once on component mount

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
    // Validate form before submission
    if (!validateRegionForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    try {
      const newRegion = await createRegion({
      name: regionFormData.name.trim(),
      code: regionFormData.code.trim().toUpperCase(),
        country_id: regionFormData.country,
        description: regionFormData.description.trim()
      });
    setIsRegionCreateDialogOpen(false);
    resetRegionForm();
    
    // Refresh dropdown data
    await refreshAllEntitiesForDropdowns();
    
    // Get country name for notification
    const selectedCountry = countries.find(c => c.id === regionFormData.country);
    if (selectedCountry) {
      // Send notification to all admins
      try {
        await MultitenancyNotificationService.notifyRegionChange(
          'created',
          {
            id: newRegion.id,
            name: newRegion.name,
            code: newRegion.code
          },
          { name: selectedCountry.name },
          getCurrentUserInfo()
        );
      } catch (notificationError) {
        console.error('Error sending region creation notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }
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
    if (!editingRegion) {
      toast.error('No region selected for editing');
      return;
    }

    // Validate form before submission
    if (!validateRegionForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    try {
      await updateRegion(editingRegion.id, {
        name: regionFormData.name.trim(),
        code: regionFormData.code.trim().toUpperCase(),
        country_id: regionFormData.country,
        description: regionFormData.description.trim()
      });
    setIsRegionEditDialogOpen(false);
    setEditingRegion(null);
    
    // Refresh dropdown data
    await refreshAllEntitiesForDropdowns();
    resetRegionForm();
    
    // Get country name for notification
    const selectedCountry = countries.find(c => c.id === regionFormData.country);
    if (selectedCountry) {
      // Send notification to all admins
      try {
        await MultitenancyNotificationService.notifyRegionChange(
          'updated',
          {
            id: editingRegion.id,
            name: regionFormData.name.trim(),
            code: regionFormData.code.trim().toUpperCase()
          },
          { name: selectedCountry.name },
          getCurrentUserInfo()
        );
      } catch (notificationError) {
        console.error('Error sending region update notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }
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
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => {
    setEditingRegion(region);
    setRegionFormData({
      name: region.name,
      code: region.code,
      country: region.country_id,
      description: region.description
    });
    // Clear validation errors when opening edit dialog
    setRegionValidationErrors({
      name: '',
      code: '',
      country: '',
      description: ''
    });
    setIsRegionEditDialogOpen(true);
    }, 100);
  };

  const openRegionViewDialog = (region: Region) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => {
    setViewingRegion(region);
    setIsRegionViewDialogOpen(true);
    }, 100);
  };

  const resetRegionForm = () => {
    setRegionFormData({
      name: '',
      code: '',
      country: '',
      description: ''
    });
    setRegionValidationErrors({
      name: '',
      code: '',
      country: '',
      description: ''
    });
  };

  // Cities handlers
  const handleCityCreate = async () => {
    // Validate form before submission
    if (!validateCityForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    try {
      const newCity = await createCity({
      name: cityFormData.name.trim(),
      code: cityFormData.code.trim().toUpperCase(),
        country_id: cityFormData.country,
        region_id: cityFormData.region,
        description: cityFormData.description.trim()
      });
    setIsCityCreateDialogOpen(false);
    resetCityForm();
    
    // Refresh dropdown data
    await refreshAllEntitiesForDropdowns();
    
    // Get region and country names for notification
    const selectedRegion = regions.find(r => r.id === cityFormData.region);
    const selectedCountry = countries.find(c => c.id === cityFormData.country);
    if (selectedRegion && selectedCountry) {
      // Send notification to all admins
      try {
        await MultitenancyNotificationService.notifyCityChange(
          'created',
          {
            id: newCity.id,
            name: newCity.name,
            code: newCity.code
          },
          { name: selectedRegion.name },
          { name: selectedCountry.name },
          getCurrentUserInfo()
        );
      } catch (notificationError) {
        console.error('Error sending city creation notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }
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
    if (!editingCity) {
      toast.error('No city selected for editing');
      return;
    }

    // Validate form before submission
    if (!validateCityForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    try {
      await updateCity(editingCity.id, {
        name: cityFormData.name.trim(),
        code: cityFormData.code.trim().toUpperCase(),
        country_id: cityFormData.country,
        region_id: cityFormData.region,
        description: cityFormData.description.trim()
      });
    setIsCityEditDialogOpen(false);
    
    // Refresh dropdown data
    await refreshAllEntitiesForDropdowns();
    setEditingCity(null);
    resetCityForm();
    
    // Get region and country names for notification
    const selectedRegion = regions.find(r => r.id === cityFormData.region);
    const selectedCountry = countries.find(c => c.id === cityFormData.country);
    if (selectedRegion && selectedCountry) {
      // Send notification to all admins
      try {
        await MultitenancyNotificationService.notifyCityChange(
          'updated',
          {
            id: editingCity.id,
            name: cityFormData.name.trim(),
            code: cityFormData.code.trim().toUpperCase()
          },
          { name: selectedRegion.name },
          { name: selectedCountry.name },
          getCurrentUserInfo()
        );
      } catch (notificationError) {
        console.error('Error sending city update notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }
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
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => {
    setEditingCity(city);
    setCityFormData({
      name: city.name,
      code: city.code,
      country: city.country_id,
      region: city.region_id,
      description: city.description
    });
    // Clear validation errors when opening edit dialog
    setCityValidationErrors({
      name: '',
      code: '',
      country: '',
      region: '',
      description: ''
    });
    setIsCityEditDialogOpen(true);
    }, 100);
  };

  const openCityViewDialog = (city: City) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => {
    setViewingCity(city);
    setIsCityViewDialogOpen(true);
    }, 100);
  };

  const resetCityForm = () => {
    setCityFormData({
      name: '',
      code: '',
      country: '',
      region: '',
      description: ''
    });
    setCityValidationErrors({
      name: '',
      code: '',
      country: '',
      region: '',
      description: ''
    });
  };

  // Projects handlers
  const handleProjectCreate = async () => {
    // Validate form before submission
    if (!validateProjectForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    try {
      const newProject = await createProject({
      name: projectFormData.name.trim(),
      code: projectFormData.code.trim().toUpperCase(),
        country_id: projectFormData.country,
        region_id: projectFormData.region,
        city_id: projectFormData.city,
      description: projectFormData.description.trim(),
        status: 'active'
      });
    setIsProjectCreateDialogOpen(false);
    resetProjectForm();
    
    // Refresh dropdown data
    await refreshAllEntitiesForDropdowns();
    
    // Get city name for notification
    const selectedCity = cities.find(c => c.id === projectFormData.city);
    if (selectedCity) {
      // Send notification to all admins
      try {
        await MultitenancyNotificationService.notifyProjectChange(
          'created',
          {
            id: newProject.id,
            name: newProject.name,
            code: newProject.code
          },
          { name: selectedCity.name },
          getCurrentUserInfo()
        );
      } catch (notificationError) {
        console.error('Error sending project creation notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }
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
    if (!editingProject) {
      toast.error('No project selected for editing');
      return;
    }

    // Validate form before submission
    if (!validateProjectForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    try {
      await updateProject(editingProject.id, {
        name: projectFormData.name.trim(),
        code: projectFormData.code.trim().toUpperCase(),
        country_id: projectFormData.country,
        region_id: projectFormData.region,
        city_id: projectFormData.city,
        description: projectFormData.description.trim()
      });
    setIsProjectEditDialogOpen(false);
    setEditingProject(null);
    
    // Refresh dropdown data
    await refreshAllEntitiesForDropdowns();
    resetProjectForm();
    
    // Get city name for notification
    const selectedCity = cities.find(c => c.id === projectFormData.city);
    if (selectedCity) {
      // Send notification to all admins
      try {
        await MultitenancyNotificationService.notifyProjectChange(
          'updated',
          {
            id: editingProject.id,
            name: projectFormData.name.trim(),
            code: projectFormData.code.trim().toUpperCase()
          },
          { name: selectedCity.name },
          getCurrentUserInfo()
        );
      } catch (notificationError) {
        console.error('Error sending project update notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }
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
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => {
    setEditingProject(project);
    setProjectFormData({
      name: project.name,
      code: project.code,
      country: project.country_id,
      region: project.region_id,
      city: project.city_id,
      description: project.description
    });
    // Clear validation errors when opening edit dialog
    setProjectValidationErrors({
      name: '',
      code: '',
      country: '',
      region: '',
      city: '',
      description: ''
    });
    setIsProjectEditDialogOpen(true);
    }, 100);
  };

  const openProjectViewDialog = (project: Project) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => {
    setViewingProject(project);
    setIsProjectViewDialogOpen(true);
    }, 100);
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
    setProjectValidationErrors({
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
    // Validate form before submission
    if (!validateBoardForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    try {
      const newBoard = await createBoard({
      name: boardFormData.name.trim(),
      code: boardFormData.code.trim().toUpperCase(),
        country_id: boardFormData.country,
        region_id: boardFormData.region,
        city_id: boardFormData.city,
        project_id: boardFormData.project,
      description: boardFormData.description.trim(),
        board_type: 'educational',
        status: 'active'
      });
    setIsBoardCreateDialogOpen(false);
    resetBoardForm();
    
    // Refresh dropdown data
    await refreshAllEntitiesForDropdowns();
    
    // Get project name for notification
    const selectedProject = projects.find(p => p.id === boardFormData.project);
    if (selectedProject) {
      // Send notification to all admins
      try {
        await MultitenancyNotificationService.notifyBoardChange(
          'created',
          {
            id: newBoard.id,
            name: newBoard.name,
            code: newBoard.code
          },
          { name: selectedProject.name },
          getCurrentUserInfo()
        );
      } catch (notificationError) {
        console.error('Error sending board creation notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }
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
    if (!editingBoard) {
      toast.error('No board selected for editing');
      return;
    }

    // Validate form before submission
    if (!validateBoardForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    try {
      await updateBoard(editingBoard.id, {
        name: boardFormData.name.trim(),
        code: boardFormData.code.trim().toUpperCase(),
        country_id: boardFormData.country,
        region_id: boardFormData.region,
        city_id: boardFormData.city,
        project_id: boardFormData.project,
        description: boardFormData.description.trim()
      });
      
    setIsBoardEditDialogOpen(false);
    setEditingBoard(null);
    
    // Refresh dropdown data
    await refreshAllEntitiesForDropdowns();
    resetBoardForm();
    
    // Get project name for notification
    const selectedProject = projects.find(p => p.id === boardFormData.project);
    if (selectedProject) {
      // Send notification to all admins
      try {
        await MultitenancyNotificationService.notifyBoardChange(
          'updated',
          {
            id: editingBoard.id,
            name: boardFormData.name.trim(),
            code: boardFormData.code.trim().toUpperCase()
          },
          { name: selectedProject.name },
          getCurrentUserInfo()
        );
      } catch (notificationError) {
        console.error('Error sending board update notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }
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
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => {
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
    // Clear validation errors when opening edit dialog
    setBoardValidationErrors({
      name: '',
      code: '',
      country: '',
      region: '',
      city: '',
      project: '',
      description: ''
    });
    setIsBoardEditDialogOpen(true);
    }, 100);
  };

  const openBoardViewDialog = (board: Board) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => {
    setViewingBoard(board);
    setIsBoardViewDialogOpen(true);
    }, 100);
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
    setBoardValidationErrors({
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
    // Validate form before submission
    if (!validateSchoolForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    try {
      const newSchool = await createSchool({
      name: schoolFormData.name.trim(),
      code: schoolFormData.code.trim().toUpperCase(),
        school_type: schoolFormData.type as 'Private' | 'Public' | 'International' | 'Charter' | 'Religious',
        country_id: schoolFormData.country,
        region_id: schoolFormData.region,
        city_id: schoolFormData.city,
        project_id: schoolFormData.project,
        board_id: schoolFormData.board,
      address: schoolFormData.address.trim(),
      phone: schoolFormData.phone.trim(),
      email: schoolFormData.email.trim(),
      website: schoolFormData.website.trim(),
        total_students: 0,
        total_teachers: 0,
        total_classes: 0,
        status: 'active',
        accreditation_status: 'pending'
      });
    setIsSchoolCreateDialogOpen(false);
    resetSchoolForm();
    
    // Get board name for notification
    const selectedBoard = boards.find(b => b.id === schoolFormData.board);
    if (selectedBoard) {
      // Send notification to all admins
      try {
        await MultitenancyNotificationService.notifySchoolChange(
          'created',
          {
            id: newSchool.id,
            name: newSchool.name,
            code: newSchool.code
          },
          { name: selectedBoard.name },
          getCurrentUserInfo()
        );
      } catch (notificationError) {
        console.error('Error sending school creation notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }
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
    if (!editingSchool) {
      toast.error('No school selected for editing');
      return;
    }

    // Validate form before submission
    if (!validateSchoolForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    try {
      await updateSchool(editingSchool.id, {
            name: schoolFormData.name.trim(),
            code: schoolFormData.code.trim().toUpperCase(),
        school_type: schoolFormData.type as 'Private' | 'Public' | 'International' | 'Charter' | 'Religious',
        country_id: schoolFormData.country,
        region_id: schoolFormData.region,
        city_id: schoolFormData.city,
        project_id: schoolFormData.project,
        board_id: schoolFormData.board,
            address: schoolFormData.address.trim(),
            phone: schoolFormData.phone.trim(),
            email: schoolFormData.email.trim(),
        website: schoolFormData.website.trim()
      });
    setIsSchoolEditDialogOpen(false);
    setEditingSchool(null);
    resetSchoolForm();
    
    // Get board name for notification
    const selectedBoard = boards.find(b => b.id === schoolFormData.board);
    if (selectedBoard) {
      // Send notification to all admins
      try {
        await MultitenancyNotificationService.notifySchoolChange(
          'updated',
          {
            id: editingSchool.id,
            name: schoolFormData.name.trim(),
            code: schoolFormData.code.trim().toUpperCase()
          },
          { name: selectedBoard.name },
          getCurrentUserInfo()
        );
      } catch (notificationError) {
        console.error('Error sending school update notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }
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
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => {
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
    // Clear validation errors when opening edit dialog
    setSchoolValidationErrors({
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
    setIsSchoolEditDialogOpen(true);
    }, 100);
  };

  const openSchoolViewDialog = (school: School) => {
    // Small delay to ensure dropdown is fully closed
    setTimeout(() => {
    setViewingSchool(school);
    setIsSchoolViewDialogOpen(true);
    }, 100);
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
    setSchoolValidationErrors({
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
        return <Badge variant="default" className="bg-blue-600 text-white">Private</Badge>;
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
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-xl sm:rounded-2xl md:rounded-3xl"></div>
        <div className="relative p-3 sm:p-4 md:p-6 lg:p-8 rounded-xl sm:rounded-2xl md:rounded-3xl">
          {/* Desktop Layout: Side by side */}
          <div className="hidden lg:flex lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Globe className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight">
                  Multitenancy Management
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-2 leading-snug">
                  Manage organizational hierarchy: countries, regions, boards, and schools
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <Badge variant="secondary" className="px-2 md:px-3 py-1 bg-primary/10 text-primary border-primary/20 text-xs md:text-sm">
                <Sparkles className="h-3 w-3 mr-1 flex-shrink-0" />
                Global Management
              </Badge>
              <Badge variant="outline" className="px-2 md:px-3 py-1 text-xs md:text-sm">
                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                Live Data
              </Badge>
            </div>
          </div>

          {/* Mobile & Tablet Layout: Stacked */}
          <div className="flex flex-col gap-4 lg:hidden">
            <div className="flex items-start gap-2 sm:gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg">
                <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight break-words">
                  Multitenancy Management
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 leading-snug">
                  Manage organizational hierarchy: countries, regions, boards, and schools
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full">
              <Badge variant="secondary" className="flex-1 justify-center px-2 py-1 bg-primary/10 text-primary border-primary/20 text-xs">
                <Sparkles className="h-3 w-3 mr-1 flex-shrink-0" />
                Global Management
              </Badge>
              <Badge variant="outline" className="flex-1 justify-center px-2 py-1 text-xs">
                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                Live Data
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 min-w-fit h-auto sm:h-10 gap-1 p-1">
            <TabsTrigger value="countries" className="text-xs sm:text-sm py-2 sm:py-0">
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Countries</span>
            </TabsTrigger>
            <TabsTrigger value="regions" className="text-xs sm:text-sm py-2 sm:py-0">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Regions</span>
            </TabsTrigger>
            <TabsTrigger value="cities" className="text-xs sm:text-sm py-2 sm:py-0">
              <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Cities</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="text-xs sm:text-sm py-2 sm:py-0">
              <FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Projects</span>
            </TabsTrigger>
            <TabsTrigger value="boards" className="text-xs sm:text-sm py-2 sm:py-0">
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Boards</span>
            </TabsTrigger>
            <TabsTrigger value="schools" className="text-xs sm:text-sm py-2 sm:py-0">
              <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Schools</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Countries Tab */}
        <TabsContent value="countries" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#8DC63F] leading-tight">Countries Management</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 leading-snug">Manage all countries in the system</p>
            </div>
            <Button
              onClick={() => setIsCountryCreateDialogOpen(true)}
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90 w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base"
              disabled={countriesLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Country
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Country Directory</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Search and filter countries by various criteria</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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
                    className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base"
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
                  className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px] sm:min-w-0">Name</TableHead>
                      <TableHead className="min-w-[80px] sm:min-w-0">Code</TableHead>
                      <TableHead className="min-w-[200px] sm:min-w-0 hidden md:table-cell">Description</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden sm:table-cell">Last Updated</TableHead>
                      <TableHead className="text-right min-w-[80px] sm:min-w-0">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {countries.map((country) => (
                      <TableRow key={country.id}>
                        <TableCell className="font-medium text-sm sm:text-base">
                          <div className="truncate max-w-[150px] sm:max-w-none" title={country.name}>{country.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{country.code}</Badge>
                        </TableCell>
                          <TableCell className="max-w-xs truncate hidden md:table-cell text-sm">{country.description || 'No description'}</TableCell>
                        <TableCell className="text-muted-foreground hidden sm:table-cell text-xs sm:text-sm">
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
                                    <DropdownMenuItem 
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        handleCountryDeleteCheck(country);
                                      }} 
                                      className="group focus:bg-red-600 focus:text-white hover:bg-red-600 hover:text-white"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4 text-red-600 group-hover:text-white group-focus:text-white" />
                                      <span className="text-red-600 group-hover:text-white group-focus:text-white">Delete Country</span>
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-2xl max-h-[80vh] flex flex-col border-red-200 dark:border-red-800">
                                <AlertDialogHeader className="flex-shrink-0">
                                    <AlertDialogTitle className="text-red-600 dark:text-red-400">Delete Country</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      Are you sure you want to delete "{country.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                
                                {/* Scrollable Content Area */}
                                <div className="flex-1 overflow-y-auto min-h-0">
                                  {/* Dependency Information */}
                                  {isCheckingDependencies && (
                                    <div className="flex items-center justify-center py-8">
                                      <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                                        <p className="text-muted-foreground">Checking dependencies...</p>
                                      </div>
                                    </div>
                                  )}

                                  {countryDependencies && !isCheckingDependencies && (
                                    <div className="py-4">
                                    {(() => {
                                      const totalDependencies = 
                                        countryDependencies.regions.length + 
                                        countryDependencies.cities.length + 
                                        countryDependencies.projects.length + 
                                        countryDependencies.boards.length + 
                                        countryDependencies.schools.length + 
                                        countryDependencies.classes.length +
                                        countryDependencies.courses.length;

                                      if (totalDependencies > 0) {
                                        return (
                                          <div className="space-y-4">
                                            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg">
                                              <div className="flex items-center mb-2">
                                                <div className="w-6 h-6 bg-red-600 dark:bg-red-500 rounded-full flex items-center justify-center mr-3">
                                                  <span className="text-white text-sm font-bold">!</span>
                                                </div>
                                                <h4 className="font-semibold text-red-800 dark:text-red-300">Cannot Delete Country</h4>
                                              </div>
                                              <p className="text-red-700 dark:text-red-400 dark:text-red-400 mb-3">
                                                This country is linked to the following entities:
                                              </p>
                                              
                                              <div className="grid grid-cols-2 gap-2 mb-4">
                                                {countryDependencies.regions.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Regions</Badge>
                                                    <span className="font-medium">{countryDependencies.regions.length}</span>
                                                  </div>
                                                )}
                                                {countryDependencies.cities.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Cities</Badge>
                                                    <span className="font-medium">{countryDependencies.cities.length}</span>
                                                  </div>
                                                )}
                                                {countryDependencies.projects.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Projects</Badge>
                                                    <span className="font-medium">{countryDependencies.projects.length}</span>
                                                  </div>
                                                )}
                                                {countryDependencies.boards.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Boards</Badge>
                                                    <span className="font-medium">{countryDependencies.boards.length}</span>
                                                  </div>
                                                )}
                                                {countryDependencies.schools.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Schools</Badge>
                                                    <span className="font-medium">{countryDependencies.schools.length}</span>
                                                  </div>
                                                )}
                                                {countryDependencies.classes.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Classes</Badge>
                                                    <span className="font-medium">{countryDependencies.classes.length}</span>
                                                  </div>
                                                )}
                                                {countryDependencies.courses.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Courses</Badge>
                                                    <span className="font-medium">{countryDependencies.courses.length}</span>
                                                  </div>
                                                )}
                                              </div>

                                              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                                                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Remove from courses first:</h5>
                                                <div className="space-y-3">
                                                  {countryDependencies.courses.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">1. Remove this country from {countryDependencies.courses.length} Course(s):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {countryDependencies.courses.map((course, index) => (
                                                          <li key={course.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{course.title}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{course.status}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded text-sm text-blue-700 dark:text-blue-400">
                                                        <strong>How to remove:</strong> Go to each course's "Course Details" tab and remove this country from the Countries field.
                                                      </div>
                                                    </div>
                                                  )}
                                                  
                                                  {countryDependencies.classes.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">2. Delete {countryDependencies.classes.length} Class(es):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {countryDependencies.classes.map((cls, index) => (
                                                          <li key={cls.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{cls.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/50 dark:hover:text-blue-300">Grade {cls.grade}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  {countryDependencies.schools.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">3. Delete {countryDependencies.schools.length} School(s):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {countryDependencies.schools.map((school, index) => (
                                                          <li key={school.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{school.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{school.code}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  {countryDependencies.boards.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">4. Delete {countryDependencies.boards.length} Board(s):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {countryDependencies.boards.map((board, index) => (
                                                          <li key={board.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{board.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{board.code}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  {countryDependencies.projects.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">5. Delete {countryDependencies.projects.length} Project(s):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {countryDependencies.projects.map((project, index) => (
                                                          <li key={project.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{project.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{project.code}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  {countryDependencies.cities.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">6. Delete {countryDependencies.cities.length} City(ies):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {countryDependencies.cities.map((city, index) => (
                                                          <li key={city.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{city.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{city.code}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  {countryDependencies.regions.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">7. Delete {countryDependencies.regions.length} Region(s):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {countryDependencies.regions.map((region, index) => (
                                                          <li key={region.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{region.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{region.code}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  <div className="pt-2 border-t border-gray-200">
                                                    <h6 className="font-medium text-gray-800">8. Then delete the country</h6>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      } else {
                                        return (
                                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                            <div className="flex items-center">
                                              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center mr-3">
                                                <span className="text-white text-sm font-bold">✓</span>
                                              </div>
                                              <h4 className="font-semibold text-green-800">Safe to Delete</h4>
                                            </div>
                                            <p className="text-green-700 mt-2">
                                              This country has no linked entities and can be safely deleted.
                                            </p>
                                          </div>
                                        );
                                      }
                                    })()}
                                    </div>
                                  )}
                                </div>

                                <AlertDialogFooter className="flex-shrink-0 border-t pt-4">
                                  <AlertDialogCancel onClick={handleCountryDeleteCancel}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleCountryDeleteConfirm}
                                    className="bg-red-600 hover:bg-red-700"
                                    disabled={isCheckingDependencies || (countryDependencies && (
                                      countryDependencies.regions.length + 
                                      countryDependencies.cities.length + 
                                      countryDependencies.projects.length + 
                                      countryDependencies.boards.length + 
                                      countryDependencies.schools.length + 
                                      countryDependencies.classes.length +
                                      countryDependencies.courses.length
                                    ) > 0)}
                                  >
                                    {isCheckingDependencies ? 'Checking...' : 'Delete'}
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
              </div>
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
        <TabsContent value="regions" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#8DC63F] leading-tight">Regions Management</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 leading-snug">Manage all regions and territories in the system</p>
            </div>
            <Button
              onClick={() => setIsRegionCreateDialogOpen(true)}
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90 w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Region
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Region Directory</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Search and filter regions by various criteria</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="search-regions"
                    placeholder="Search regions by name or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base"
                  />
                </div>
                <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px] sm:min-w-0">Name</TableHead>
                      <TableHead className="min-w-[80px] sm:min-w-0">Code</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden md:table-cell">Country</TableHead>
                      <TableHead className="min-w-[200px] sm:min-w-0 hidden lg:table-cell">Description</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden sm:table-cell">Last Updated</TableHead>
                      <TableHead className="text-right min-w-[80px] sm:min-w-0">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegions.map((region) => (
                      <TableRow key={region.id}>
                        <TableCell className="font-medium text-sm sm:text-base">
                          <div className="truncate max-w-[150px] sm:max-w-none" title={region.name}>{region.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{region.code}</Badge>
                        </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{region.country?.name || 'N/A'}</TableCell>
                        <TableCell className="max-w-xs truncate hidden lg:table-cell text-sm">{region.description}</TableCell>
                        <TableCell className="text-muted-foreground hidden sm:table-cell text-xs sm:text-sm">
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
                                  <DropdownMenuItem 
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      handleRegionDeleteCheck(region);
                                    }} 
                                    className="group focus:bg-red-600 focus:text-white hover:bg-red-600 hover:text-white"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4 text-red-600 group-hover:text-white group-focus:text-white" />
                                    <span className="text-red-600 group-hover:text-white group-focus:text-white">Delete Region</span>
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-2xl max-h-[80vh] flex flex-col border-red-200 dark:border-red-800">
                                <AlertDialogHeader className="flex-shrink-0">
                                    <AlertDialogTitle className="text-red-600 dark:text-red-400">Delete Region</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{region.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                
                                {/* Scrollable Content Area */}
                                <div className="flex-1 overflow-y-auto min-h-0">
                                  {/* Dependency Information */}
                                  {isCheckingRegionDependencies && (
                                    <div className="flex items-center justify-center py-8">
                                      <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                                        <p className="text-muted-foreground">Checking dependencies...</p>
                                      </div>
                                    </div>
                                  )}

                                  {regionDependencies && !isCheckingRegionDependencies && (
                                    <div className="py-4">
                                      {(() => {
                                        const totalDependencies = 
                                          regionDependencies.cities.length + 
                                          regionDependencies.projects.length + 
                                          regionDependencies.boards.length + 
                                          regionDependencies.schools.length + 
                                          regionDependencies.classes.length +
                                          regionDependencies.courses.length;

                                        if (totalDependencies > 0) {
                                          return (
                                            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg">
                                              <div className="flex items-center mb-2">
                                                <div className="w-6 h-6 bg-red-600 dark:bg-red-500 rounded-full flex items-center justify-center mr-3">
                                                  <span className="text-white text-sm font-bold">!</span>
                                                </div>
                                                <h4 className="font-semibold text-red-800 dark:text-red-300">Cannot Delete Region</h4>
                                              </div>
                                              <p className="text-red-700 dark:text-red-400 dark:text-red-400 mb-3">
                                                This region is linked to the following entities:
                                              </p>
                                              
                                              <div className="grid grid-cols-2 gap-2 mb-4">
                                                {regionDependencies.cities.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Cities</Badge>
                                                    <span className="font-medium">{regionDependencies.cities.length}</span>
                                                  </div>
                                                )}
                                                {regionDependencies.projects.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Projects</Badge>
                                                    <span className="font-medium">{regionDependencies.projects.length}</span>
                                                  </div>
                                                )}
                                                {regionDependencies.boards.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Boards</Badge>
                                                    <span className="font-medium">{regionDependencies.boards.length}</span>
                                                  </div>
                                                )}
                                                {regionDependencies.schools.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Schools</Badge>
                                                    <span className="font-medium">{regionDependencies.schools.length}</span>
                                                  </div>
                                                )}
                                                {regionDependencies.classes.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Classes</Badge>
                                                    <span className="font-medium">{regionDependencies.classes.length}</span>
                                                  </div>
                                                )}
                                                {regionDependencies.courses.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Courses</Badge>
                                                    <span className="font-medium">{regionDependencies.courses.length}</span>
                                                  </div>
                                                )}
                                              </div>

                                              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                                                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Remove from courses first:</h5>
                                                <div className="space-y-3">
                                                  {regionDependencies.courses.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">1. Remove this region from {regionDependencies.courses.length} Course(s):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {regionDependencies.courses.map((course) => (
                                                          <li key={course.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{course.title}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{course.status}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded text-sm text-blue-700 dark:text-blue-400">
                                                        <strong>How to remove:</strong> Go to each course's "Course Details" tab and remove this region from the Regions field.
                                                      </div>
                                                    </div>
                                                  )}
                                                  
                                                  {regionDependencies.classes.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">2. Delete {regionDependencies.classes.length} Class(es):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {regionDependencies.classes.map((cls) => (
                                                          <li key={cls.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{cls.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/50 dark:hover:text-blue-300">Grade {cls.grade}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  {regionDependencies.schools.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">3. Delete {regionDependencies.schools.length} School(s):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {regionDependencies.schools.map((school) => (
                                                          <li key={school.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{school.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{school.code}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  {regionDependencies.boards.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">4. Delete {regionDependencies.boards.length} Board(s):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {regionDependencies.boards.map((board) => (
                                                          <li key={board.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{board.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{board.code}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  {regionDependencies.projects.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">5. Delete {regionDependencies.projects.length} Project(s):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {regionDependencies.projects.map((project) => (
                                                          <li key={project.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{project.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{project.code}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  {regionDependencies.cities.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">6. Delete {regionDependencies.cities.length} City(ies):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {regionDependencies.cities.map((city) => (
                                                          <li key={city.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{city.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{city.code}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  <div className="pt-2 border-t border-gray-200">
                                                    <h6 className="font-medium text-gray-800">7. Then delete the region</h6>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        } else {
                                          return (
                                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                              <div className="flex items-center">
                                                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center mr-3">
                                                  <span className="text-white text-sm font-bold">✓</span>
                                                </div>
                                                <h4 className="font-semibold text-green-800">Safe to Delete</h4>
                                              </div>
                                              <p className="text-green-700 mt-2">
                                                This region has no linked entities and can be safely deleted.
                                              </p>
                                            </div>
                                          );
                                        }
                                      })()}
                                    </div>
                                  )}
                                </div>

                                <AlertDialogFooter className="flex-shrink-0 border-t pt-4">
                                  <AlertDialogCancel onClick={handleRegionDeleteCancel}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleRegionDeleteConfirm}
                                    className="bg-red-600 hover:bg-red-700"
                                    disabled={isCheckingRegionDependencies || (regionDependencies && (
                                      regionDependencies.cities.length + 
                                      regionDependencies.projects.length + 
                                      regionDependencies.boards.length + 
                                      regionDependencies.schools.length + 
                                      regionDependencies.classes.length +
                                      regionDependencies.courses.length
                                    ) > 0)}
                                  >
                                    {isCheckingRegionDependencies ? 'Checking...' : 'Delete'}
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
              </div>
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
        <TabsContent value="cities" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#8DC63F] leading-tight">Cities Management</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 leading-snug">Manage all cities and urban areas in the system</p>
            </div>
            <Button
              onClick={() => setIsCityCreateDialogOpen(true)}
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90 w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create City
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">City Directory</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Search and filter cities by various criteria</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="search-cities"
                    placeholder="Search cities by name or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base"
                  />
                </div>
                <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px] sm:min-w-0">Name</TableHead>
                      <TableHead className="min-w-[80px] sm:min-w-0">Code</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden md:table-cell">Country</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden lg:table-cell">Region</TableHead>
                      <TableHead className="min-w-[200px] sm:min-w-0 hidden xl:table-cell">Description</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden sm:table-cell">Last Updated</TableHead>
                      <TableHead className="text-right min-w-[80px] sm:min-w-0">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCities.map((city) => (
                      <TableRow key={city.id}>
                        <TableCell className="font-medium text-sm sm:text-base">
                          <div className="truncate max-w-[150px] sm:max-w-none" title={city.name}>{city.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{city.code}</Badge>
                        </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{city.country?.name || 'N/A'}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{city.region?.name || 'N/A'}</TableCell>
                        <TableCell className="max-w-xs truncate hidden xl:table-cell text-sm">{city.description}</TableCell>
                        <TableCell className="text-muted-foreground hidden sm:table-cell text-xs sm:text-sm">
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
                                  <DropdownMenuItem 
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      handleCityDeleteCheck(city);
                                    }} 
                                    className="group focus:bg-red-600 focus:text-white hover:bg-red-600 hover:text-white"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4 text-red-600 group-hover:text-white group-focus:text-white" />
                                    <span className="text-red-600 group-hover:text-white group-focus:text-white">Delete City</span>
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-2xl max-h-[80vh] flex flex-col border-red-200 dark:border-red-800">
                                <AlertDialogHeader className="flex-shrink-0">
                                    <AlertDialogTitle className="text-red-600 dark:text-red-400">Delete City</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{city.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                
                                {/* Scrollable Content Area */}
                                <div className="flex-1 overflow-y-auto min-h-0">
                                  {/* Dependency Information */}
                                  {isCheckingCityDependencies && (
                                    <div className="flex items-center justify-center py-8">
                                      <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                                        <p className="text-muted-foreground">Checking dependencies...</p>
                                      </div>
                                    </div>
                                  )}

                                  {cityDependencies && !isCheckingCityDependencies && (
                                    <div className="py-4">
                                      {(() => {
                                        const totalDependencies = 
                                          cityDependencies.projects.length + 
                                          cityDependencies.boards.length + 
                                          cityDependencies.schools.length + 
                                          cityDependencies.classes.length +
                                          cityDependencies.courses.length;

                                        if (totalDependencies > 0) {
                                          return (
                                            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg">
                                              <div className="flex items-center mb-2">
                                                <div className="w-6 h-6 bg-red-600 dark:bg-red-500 rounded-full flex items-center justify-center mr-3">
                                                  <span className="text-white text-sm font-bold">!</span>
                                                </div>
                                                <h4 className="font-semibold text-red-800 dark:text-red-300">Cannot Delete City</h4>
                                              </div>
                                              <p className="text-red-700 dark:text-red-400 dark:text-red-400 mb-3">
                                                This city is linked to the following entities:
                                              </p>
                                              
                                              <div className="grid grid-cols-2 gap-2 mb-4">
                                                {cityDependencies.projects.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Projects</Badge>
                                                    <span className="font-medium">{cityDependencies.projects.length}</span>
                                                  </div>
                                                )}
                                                {cityDependencies.boards.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Boards</Badge>
                                                    <span className="font-medium">{cityDependencies.boards.length}</span>
                                                  </div>
                                                )}
                                                {cityDependencies.schools.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Schools</Badge>
                                                    <span className="font-medium">{cityDependencies.schools.length}</span>
                                                  </div>
                                                )}
                                                {cityDependencies.classes.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Classes</Badge>
                                                    <span className="font-medium">{cityDependencies.classes.length}</span>
                                                  </div>
                                                )}
                                                {cityDependencies.courses.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Courses</Badge>
                                                    <span className="font-medium">{cityDependencies.courses.length}</span>
                                                  </div>
                                                )}
                                              </div>

                                              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                                                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Remove from courses first:</h5>
                                                <div className="space-y-3">
                                                  {cityDependencies.courses.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">1. Remove this city from {cityDependencies.courses.length} Course(s):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {cityDependencies.courses.map((course) => (
                                                          <li key={course.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{course.title}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{course.status}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded text-sm text-blue-700 dark:text-blue-400">
                                                        <strong>How to remove:</strong> Go to each course's "Course Details" tab and remove this city from the Cities field.
                                                      </div>
                                                    </div>
                                                  )}
                                                  
                                                  {cityDependencies.classes.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">2. Delete {cityDependencies.classes.length} Class(es):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {cityDependencies.classes.map((cls) => (
                                                          <li key={cls.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{cls.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/50 dark:hover:text-blue-300">Grade {cls.grade}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  {cityDependencies.schools.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">3. Delete {cityDependencies.schools.length} School(s):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {cityDependencies.schools.map((school) => (
                                                          <li key={school.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{school.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{school.code}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  {cityDependencies.boards.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">4. Delete {cityDependencies.boards.length} Board(s):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {cityDependencies.boards.map((board) => (
                                                          <li key={board.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{board.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{board.code}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  {cityDependencies.projects.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">5. Delete {cityDependencies.projects.length} Project(s):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {cityDependencies.projects.map((project) => (
                                                          <li key={project.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{project.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{project.code}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  <div className="pt-2 border-t border-gray-200">
                                                    <h6 className="font-medium text-gray-800">6. Then delete the city</h6>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        } else {
                                          return (
                                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                              <div className="flex items-center">
                                                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center mr-3">
                                                  <span className="text-white text-sm font-bold">✓</span>
                                                </div>
                                                <h4 className="font-semibold text-green-800">Safe to Delete</h4>
                                              </div>
                                              <p className="text-green-700 mt-2">
                                                This city has no linked entities and can be safely deleted.
                                              </p>
                                            </div>
                                          );
                                        }
                                      })()}
                                    </div>
                                  )}
                                </div>

                                <AlertDialogFooter className="flex-shrink-0 border-t pt-4">
                                  <AlertDialogCancel onClick={handleCityDeleteCancel}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleCityDeleteConfirm}
                                    className="bg-red-600 hover:bg-red-700"
                                    disabled={isCheckingCityDependencies || (cityDependencies && (
                                      cityDependencies.projects.length + 
                                      cityDependencies.boards.length + 
                                      cityDependencies.schools.length + 
                                      cityDependencies.classes.length +
                                      cityDependencies.courses.length
                                    ) > 0)}
                                  >
                                    {isCheckingCityDependencies ? 'Checking...' : 'Delete'}
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
              </div>
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
        <TabsContent value="projects" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#8DC63F] leading-tight">Projects Management</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 leading-snug">Manage all educational projects and initiatives in the system</p>
            </div>
            <Button
              onClick={() => setIsProjectCreateDialogOpen(true)}
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90 w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Project Directory</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Search and filter projects by various criteria</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="search-projects"
                    placeholder="Search projects by name or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base"
                  />
                </div>
                <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px] sm:min-w-0">Name</TableHead>
                      <TableHead className="min-w-[80px] sm:min-w-0">Code</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden md:table-cell">Country</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden lg:table-cell">Region</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden xl:table-cell">City</TableHead>
                      <TableHead className="min-w-[200px] sm:min-w-0 hidden xl:table-cell">Description</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden sm:table-cell">Last Updated</TableHead>
                      <TableHead className="text-right min-w-[80px] sm:min-w-0">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium text-sm sm:text-base">
                          <div className="truncate max-w-[150px] sm:max-w-none" title={project.name}>{project.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{project.code}</Badge>
                        </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{project.country?.name || 'N/A'}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{project.region?.name || 'N/A'}</TableCell>
                          <TableCell className="hidden xl:table-cell text-sm">{project.city?.name || 'N/A'}</TableCell>
                        <TableCell className="max-w-xs truncate hidden xl:table-cell text-sm">{project.description}</TableCell>
                        <TableCell className="text-muted-foreground hidden sm:table-cell text-xs sm:text-sm">
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
                                  <DropdownMenuItem 
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      handleProjectDeleteCheck(project);
                                    }} 
                                    className="group focus:bg-red-600 focus:text-white hover:bg-red-600 hover:text-white"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4 text-red-600 group-hover:text-white group-focus:text-white" />
                                    <span className="text-red-600 group-hover:text-white group-focus:text-white">Delete Project</span>
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-2xl max-h-[80vh] flex flex-col border-red-200 dark:border-red-800">
                                <AlertDialogHeader className="flex-shrink-0">
                                    <AlertDialogTitle className="text-red-600 dark:text-red-400">Delete Project</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{project.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                
                                {/* Scrollable Content Area */}
                                <div className="flex-1 overflow-y-auto min-h-0">
                                  {/* Dependency Information */}
                                  {isCheckingProjectDependencies && (
                                    <div className="flex items-center justify-center py-8">
                                      <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                                        <p className="text-muted-foreground">Checking dependencies...</p>
                                      </div>
                                    </div>
                                  )}

                                  {projectDependencies && !isCheckingProjectDependencies && (
                                    <div className="py-4">
                                      {(() => {
                                        const totalDependencies = 
                                          projectDependencies.boards.length + 
                                          projectDependencies.schools.length + 
                                          projectDependencies.classes.length +
                                          projectDependencies.courses.length;

                                        if (totalDependencies > 0) {
                                          return (
                                            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg">
                                              <div className="flex items-center mb-2">
                                                <div className="w-6 h-6 bg-red-600 dark:bg-red-500 rounded-full flex items-center justify-center mr-3">
                                                  <span className="text-white text-sm font-bold">!</span>
                                                </div>
                                                <h4 className="font-semibold text-red-800 dark:text-red-300">Cannot Delete Project</h4>
                                              </div>
                                              <p className="text-red-700 dark:text-red-400 dark:text-red-400 mb-3">
                                                This project is linked to the following entities:
                                              </p>
                                              
                                              <div className="grid grid-cols-2 gap-2 mb-4">
                                                {projectDependencies.boards.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Boards</Badge>
                                                    <span className="font-medium">{projectDependencies.boards.length}</span>
                                                  </div>
                                                )}
                                                {projectDependencies.schools.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Schools</Badge>
                                                    <span className="font-medium">{projectDependencies.schools.length}</span>
                                                  </div>
                                                )}
                                                {projectDependencies.classes.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Classes</Badge>
                                                    <span className="font-medium">{projectDependencies.classes.length}</span>
                                                  </div>
                                                )}
                                                {projectDependencies.courses.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Courses</Badge>
                                                    <span className="font-medium">{projectDependencies.courses.length}</span>
                                                  </div>
                                                )}
                                              </div>

                                              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                                                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Remove from courses first:</h5>
                                                <div className="space-y-3">
                                                  {projectDependencies.courses.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">1. Remove this project from {projectDependencies.courses.length} Course(s):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {projectDependencies.courses.map((course) => (
                                                          <li key={course.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{course.title}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{course.status}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded text-sm text-blue-700 dark:text-blue-400">
                                                        <strong>How to remove:</strong> Go to each course's "Course Details" tab and remove this project from the Projects field.
                                                      </div>
                                                    </div>
                                                  )}
                                                  
                                                  {projectDependencies.classes.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">2. Delete {projectDependencies.classes.length} Class(es):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {projectDependencies.classes.map((cls) => (
                                                          <li key={cls.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{cls.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/50 dark:hover:text-blue-300">Grade {cls.grade}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  {projectDependencies.schools.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">3. Delete {projectDependencies.schools.length} School(s):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {projectDependencies.schools.map((school) => (
                                                          <li key={school.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{school.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{school.code}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  {projectDependencies.boards.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">4. Delete {projectDependencies.boards.length} Board(s):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {projectDependencies.boards.map((board) => (
                                                          <li key={board.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{board.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{board.code}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  <div className="pt-2 border-t border-gray-200">
                                                    <h6 className="font-medium text-gray-800">5. Then delete the project</h6>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        } else {
                                          return (
                                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                              <div className="flex items-center">
                                                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center mr-3">
                                                  <span className="text-white text-sm font-bold">✓</span>
                                                </div>
                                                <h4 className="font-semibold text-green-800">Safe to Delete</h4>
                                              </div>
                                              <p className="text-green-700 mt-2">
                                                This project has no linked entities and can be safely deleted.
                                              </p>
                                            </div>
                                          );
                                        }
                                      })()}
                                    </div>
                                  )}
                                </div>

                                <AlertDialogFooter className="flex-shrink-0 border-t pt-4">
                                  <AlertDialogCancel onClick={handleProjectDeleteCancel}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleProjectDeleteConfirm}
                                    className="bg-red-600 hover:bg-red-700"
                                    disabled={isCheckingProjectDependencies || (projectDependencies && (
                                      projectDependencies.boards.length + 
                                      projectDependencies.schools.length + 
                                      projectDependencies.classes.length +
                                      projectDependencies.courses.length
                                    ) > 0)}
                                  >
                                    {isCheckingProjectDependencies ? 'Checking...' : 'Delete'}
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
              </div>
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
        <TabsContent value="boards" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#8DC63F] leading-tight">Board Management</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 leading-snug">Manage all educational boards and examination bodies in the system</p>
            </div>
            <Button
              onClick={() => setIsBoardCreateDialogOpen(true)}
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90 w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Board
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Board Directory</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Search and filter boards by various criteria</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="search-boards"
                    placeholder="Search boards by name or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base"
                  />
                </div>
                <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px] sm:min-w-0">Name</TableHead>
                      <TableHead className="min-w-[80px] sm:min-w-0">Code</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden md:table-cell">Country</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden lg:table-cell">Region</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden xl:table-cell">City</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden xl:table-cell">Project</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden sm:table-cell">Last Updated</TableHead>
                      <TableHead className="text-right min-w-[80px] sm:min-w-0">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBoards.map((board) => (
                      <TableRow key={board.id}>
                        <TableCell className="font-medium text-sm sm:text-base">
                          <div className="truncate max-w-[150px] sm:max-w-none" title={board.name}>{board.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{board.code}</Badge>
                        </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{board.country?.name || 'N/A'}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{board.region?.name || 'N/A'}</TableCell>
                          <TableCell className="hidden xl:table-cell text-sm">{board.city?.name || 'N/A'}</TableCell>
                        <TableCell className="hidden xl:table-cell">
                            <Badge variant="outline" className="text-xs">{board.project?.name || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden sm:table-cell text-xs sm:text-sm">
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
                                  <DropdownMenuItem 
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      handleBoardDeleteCheck(board);
                                    }} 
                                    className="group focus:bg-red-600 focus:text-white hover:bg-red-600 hover:text-white"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4 text-red-600 group-hover:text-white group-focus:text-white" />
                                    <span className="text-red-600 group-hover:text-white group-focus:text-white">Delete Board</span>
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-2xl max-h-[80vh] flex flex-col border-red-200 dark:border-red-800">
                                <AlertDialogHeader className="flex-shrink-0">
                                    <AlertDialogTitle className="text-red-600 dark:text-red-400">Delete Board</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{board.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                
                                {/* Scrollable Content Area */}
                                <div className="flex-1 overflow-y-auto min-h-0">
                                  {/* Dependency Information */}
                                  {isCheckingBoardDependencies && (
                                    <div className="flex items-center justify-center py-8">
                                      <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                                        <p className="text-muted-foreground">Checking dependencies...</p>
                                      </div>
                                    </div>
                                  )}

                                  {boardDependencies && !isCheckingBoardDependencies && (
                                    <div className="py-4">
                                      {(() => {
                                        const totalDependencies = 
                                          boardDependencies.schools.length + 
                                          boardDependencies.classes.length +
                                          boardDependencies.courses.length;

                                        if (totalDependencies > 0) {
                                          return (
                                            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg">
                                              <div className="flex items-center mb-2">
                                                <div className="w-6 h-6 bg-red-600 dark:bg-red-500 rounded-full flex items-center justify-center mr-3">
                                                  <span className="text-white text-sm font-bold">!</span>
                                                </div>
                                                <h4 className="font-semibold text-red-800 dark:text-red-300">Cannot Delete Board</h4>
                                              </div>
                                              <p className="text-red-700 dark:text-red-400 dark:text-red-400 mb-3">
                                                This board is linked to the following entities:
                                              </p>
                                              
                                              <div className="grid grid-cols-2 gap-2 mb-4">
                                                {boardDependencies.schools.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Schools</Badge>
                                                    <span className="font-medium">{boardDependencies.schools.length}</span>
                                                  </div>
                                                )}
                                                {boardDependencies.classes.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Classes</Badge>
                                                    <span className="font-medium">{boardDependencies.classes.length}</span>
                                                  </div>
                                                )}
                                                {boardDependencies.courses.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Courses</Badge>
                                                    <span className="font-medium">{boardDependencies.courses.length}</span>
                                                  </div>
                                                )}
                                              </div>

                                              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                                                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Remove from courses first:</h5>
                                                <div className="space-y-3">
                                                  {boardDependencies.courses.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">1. Remove this board from {boardDependencies.courses.length} Course(s):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {boardDependencies.courses.map((course) => (
                                                          <li key={course.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{course.title}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{course.status}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded text-sm text-blue-700 dark:text-blue-400">
                                                        <strong>How to remove:</strong> Go to each course's "Course Details" tab and remove this board from the Boards field.
                                                      </div>
                                                    </div>
                                                  )}
                                                  
                                                  {boardDependencies.classes.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">2. Delete {boardDependencies.classes.length} Class(es):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {boardDependencies.classes.map((cls) => (
                                                          <li key={cls.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{cls.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/50 dark:hover:text-blue-300">Grade {cls.grade}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  {boardDependencies.schools.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">3. Delete {boardDependencies.schools.length} School(s):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {boardDependencies.schools.map((school) => (
                                                          <li key={school.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{school.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs">{school.code}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  <div className="pt-2 border-t border-gray-200">
                                                    <h6 className="font-medium text-gray-800">4. Then delete the board</h6>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        } else {
                                          return (
                                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                              <div className="flex items-center">
                                                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center mr-3">
                                                  <span className="text-white text-sm font-bold">✓</span>
                                                </div>
                                                <h4 className="font-semibold text-green-800">Safe to Delete</h4>
                                              </div>
                                              <p className="text-green-700 mt-2">
                                                This board has no linked entities and can be safely deleted.
                                              </p>
                                            </div>
                                          );
                                        }
                                      })()}
                                    </div>
                                  )}
                                </div>

                                <AlertDialogFooter className="flex-shrink-0 border-t pt-4">
                                  <AlertDialogCancel onClick={handleBoardDeleteCancel}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleBoardDeleteConfirm}
                                    className="bg-red-600 hover:bg-red-700"
                                    disabled={isCheckingBoardDependencies || (boardDependencies && (
                                      boardDependencies.schools.length + 
                                      boardDependencies.classes.length +
                                      boardDependencies.courses.length
                                    ) > 0)}
                                  >
                                    {isCheckingBoardDependencies ? 'Checking...' : 'Delete'}
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
              </div>
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
        <TabsContent value="schools" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#8DC63F] leading-tight">School Management</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 leading-snug">Manage all schools and educational institutions in the system</p>
            </div>
            <Button
              onClick={() => setIsSchoolCreateDialogOpen(true)}
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90 w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create School
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">School Directory</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Search and filter schools by various criteria</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="search-schools"
                    placeholder="Search schools by name, code, or region..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm sm:text-base"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-40 h-9 sm:h-10 text-sm" id="school-type-filter">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Private">Private</SelectItem>
                    <SelectItem value="Public">Public</SelectItem>
                    <SelectItem value="International">International</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
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
                      {searchTerm || typeFilter !== 'all' ? 'Try adjusting your search terms and filters' : 'Create your first school to get started'}
                    </p>
                  </div>
                </div>
              ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px] sm:min-w-0">Name</TableHead>
                      <TableHead className="min-w-[80px] sm:min-w-0">Code</TableHead>
                      <TableHead className="min-w-[100px] sm:min-w-0">Type</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden md:table-cell">Country</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden lg:table-cell">Region</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden xl:table-cell">City</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden xl:table-cell">Project</TableHead>
                      <TableHead className="min-w-[120px] sm:min-w-0 hidden xl:table-cell">Board</TableHead>
                      <TableHead className="text-right min-w-[80px] sm:min-w-0">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchools.map((school) => (
                      <TableRow key={school.id}>
                        <TableCell className="font-medium text-sm sm:text-base">
                          <div className="truncate max-w-[150px] sm:max-w-none" title={school.name}>{school.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{school.code}</Badge>
                        </TableCell>
                          <TableCell className="text-xs sm:text-sm">{getTypeBadge(school.school_type)}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{school.country?.name || 'N/A'}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{school.region?.name || 'N/A'}</TableCell>
                          <TableCell className="hidden xl:table-cell text-sm">{school.city?.name || 'N/A'}</TableCell>
                        <TableCell className="hidden xl:table-cell">
                            <Badge variant="outline" className="text-xs">{school.project?.name || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                            <Badge variant="outline" className="text-xs">{school.board?.name || 'N/A'}</Badge>
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
                                  <DropdownMenuItem 
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      handleSchoolDeleteCheck(school);
                                    }} 
                                    className="group focus:bg-red-600 focus:text-white hover:bg-red-600 hover:text-white"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4 text-red-600 group-hover:text-white group-focus:text-white" />
                                    <span className="text-red-600 group-hover:text-white group-focus:text-white">Delete School</span>
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-2xl max-h-[80vh] flex flex-col border-red-200 dark:border-red-800">
                                <AlertDialogHeader className="flex-shrink-0">
                                    <AlertDialogTitle className="text-red-600 dark:text-red-400">Delete School</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{school.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                
                                {/* Scrollable Content Area */}
                                <div className="flex-1 overflow-y-auto min-h-0">
                                  {/* Dependency Information */}
                                  {isCheckingSchoolDependencies && (
                                    <div className="flex items-center justify-center py-8">
                                      <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                                        <p className="text-muted-foreground">Checking dependencies...</p>
                                      </div>
                                    </div>
                                  )}

                                  {schoolDependencies && !isCheckingSchoolDependencies && (
                                    <div className="py-4">
                                      {(() => {
                                        const totalDependencies = schoolDependencies.classes.length;

                                        if (totalDependencies > 0) {
                                          return (
                                            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg">
                                              <div className="flex items-center mb-2">
                                                <div className="w-6 h-6 bg-red-600 dark:bg-red-500 rounded-full flex items-center justify-center mr-3">
                                                  <span className="text-white text-sm font-bold">!</span>
                                                </div>
                                                <h4 className="font-semibold text-red-800 dark:text-red-300">Cannot Delete School</h4>
                                              </div>
                                              <p className="text-red-700 dark:text-red-400 dark:text-red-400 mb-3">
                                                This school is linked to the following entities:
                                              </p>
                                              
                                              <div className="grid grid-cols-2 gap-2 mb-4">
                                                {schoolDependencies.classes.length > 0 && (
                                                  <div className="flex items-center text-sm">
                                                    <Badge variant="outline" className="mr-2">Classes</Badge>
                                                    <span className="font-medium">{schoolDependencies.classes.length}</span>
                                                  </div>
                                                )}
                                              </div>

                                              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                                                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Delete in this order:</h5>
                                                <div className="space-y-3">
                                                  {schoolDependencies.classes.length > 0 && (
                                                    <div>
                                                      <h6 className="font-medium text-red-700 dark:text-red-400 mb-1">1. Delete {schoolDependencies.classes.length} Class(es):</h6>
                                                      <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4 space-y-1">
                                                        {schoolDependencies.classes.map((cls) => (
                                                          <li key={cls.id} className="flex items-center">
                                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                                            <span className="font-medium">{cls.name}</span>
                                                            <Badge variant="outline" className="ml-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/50 dark:hover:text-blue-300">Grade {cls.grade}</Badge>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                  
                                                  <div className="pt-2 border-t border-gray-200">
                                                    <h6 className="font-medium text-gray-800">2. Then delete the school</h6>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        } else {
                                          return (
                                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                              <div className="flex items-center">
                                                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center mr-3">
                                                  <span className="text-white text-sm font-bold">✓</span>
                                                </div>
                                                <h4 className="font-semibold text-green-800">Safe to Delete</h4>
                                              </div>
                                              <p className="text-green-700 mt-2">
                                                This school has no linked entities and can be safely deleted.
                                              </p>
                                            </div>
                                          );
                                        }
                                      })()}
                                    </div>
                                  )}
                                </div>

                                <AlertDialogFooter className="flex-shrink-0 border-t pt-4">
                                  <AlertDialogCancel onClick={handleSchoolDeleteCancel}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleSchoolDeleteConfirm}
                                    className="bg-red-600 hover:bg-red-700"
                                    disabled={isCheckingSchoolDependencies || (schoolDependencies && (
                                      schoolDependencies.classes.length
                                    ) > 0)}
                                  >
                                    {isCheckingSchoolDependencies ? 'Checking...' : 'Delete'}
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
              </div>
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
              <Label htmlFor="country-name" className={countryValidationErrors.name ? 'text-red-500' : ''}>Country Name *</Label>
              <Input
                id="country-name"
                value={countryFormData.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setCountryFormData({ ...countryFormData, name: value });
                  // Real-time validation
                  const error = validateCountryName(value);
                  setCountryValidationErrors(prev => ({ ...prev, name: error }));
                }}
                placeholder="e.g., Pakistan"
                className={countryValidationErrors.name ? 'border-red-500 focus:border-red-500' : ''}
              />
              {countryValidationErrors.name && (
                <p className="text-sm text-red-500">{countryValidationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="country-code" className={countryValidationErrors.code ? 'text-red-500' : ''}>Country Code *</Label>
              <Input
                id="country-code"
                value={countryFormData.code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setCountryFormData({ ...countryFormData, code: value });
                  // Real-time validation
                  const error = validateCountryCode(value);
                  setCountryValidationErrors(prev => ({ ...prev, code: error }));
                }}
                placeholder="e.g., PK"
                maxLength={3}
                className={countryValidationErrors.code ? 'border-red-500 focus:border-red-500' : ''}
              />
              {countryValidationErrors.code && (
                <p className="text-sm text-red-500">{countryValidationErrors.code}</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="country-description" className={countryValidationErrors.description ? 'text-red-500' : ''}>Description</Label>
              <Textarea
                id="country-description"
                value={countryFormData.description}
                onChange={(e) => {
                  const value = e.target.value;
                  setCountryFormData({ ...countryFormData, description: value });
                  // Real-time validation
                  const error = validateCountryDescription(value);
                  setCountryValidationErrors(prev => ({ ...prev, description: error }));
                }}
                placeholder="Brief description of the country..."
                rows={3}
                className={countryValidationErrors.description ? 'border-red-500 focus:border-red-500' : ''}
              />
              {countryValidationErrors.description && (
                <p className="text-sm text-red-500">{countryValidationErrors.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {countryFormData.description.length}/500 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCountryCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCountryCreate} 
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90"
              disabled={countriesLoading || !!countryValidationErrors.name || !!countryValidationErrors.code || !!countryValidationErrors.description}
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
              <Label htmlFor="edit-country-name" className={countryValidationErrors.name ? 'text-red-500' : ''}>Country Name *</Label>
              <Input
                id="edit-country-name"
                value={countryFormData.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setCountryFormData({ ...countryFormData, name: value });
                  // Real-time validation
                  const error = validateCountryName(value);
                  setCountryValidationErrors(prev => ({ ...prev, name: error }));
                }}
                placeholder="e.g., Pakistan"
                className={countryValidationErrors.name ? 'border-red-500 focus:border-red-500' : ''}
              />
              {countryValidationErrors.name && (
                <p className="text-sm text-red-500">{countryValidationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-country-code" className={countryValidationErrors.code ? 'text-red-500' : ''}>Country Code *</Label>
              <Input
                id="edit-country-code"
                value={countryFormData.code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setCountryFormData({ ...countryFormData, code: value });
                  // Real-time validation
                  const error = validateCountryCode(value);
                  setCountryValidationErrors(prev => ({ ...prev, code: error }));
                }}
                placeholder="e.g., PK"
                maxLength={3}
                className={countryValidationErrors.code ? 'border-red-500 focus:border-red-500' : ''}
              />
              {countryValidationErrors.code && (
                <p className="text-sm text-red-500">{countryValidationErrors.code}</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-country-description" className={countryValidationErrors.description ? 'text-red-500' : ''}>Description</Label>
              <Textarea
                id="edit-country-description"
                value={countryFormData.description}
                onChange={(e) => {
                  const value = e.target.value;
                  setCountryFormData({ ...countryFormData, description: value });
                  // Real-time validation
                  const error = validateCountryDescription(value);
                  setCountryValidationErrors(prev => ({ ...prev, description: error }));
                }}
                placeholder="Brief description of the country..."
                rows={3}
                className={countryValidationErrors.description ? 'border-red-500 focus:border-red-500' : ''}
              />
              {countryValidationErrors.description && (
                <p className="text-sm text-red-500">{countryValidationErrors.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {countryFormData.description.length}/500 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCountryEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCountryEdit} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={countriesLoading || !!countryValidationErrors.name || !!countryValidationErrors.code || !!countryValidationErrors.description}
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
              <Label htmlFor="name" className={regionValidationErrors.name ? 'text-red-500' : ''}>Region Name *</Label>
              <Input
                id="name"
                value={regionFormData.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setRegionFormData({ ...regionFormData, name: value });
                  // Real-time validation
                  const error = validateRegionName(value);
                  setRegionValidationErrors(prev => ({ ...prev, name: error }));
                }}
                placeholder="e.g., California"
                className={regionValidationErrors.name ? 'border-red-500 focus:border-red-500' : ''}
              />
              {regionValidationErrors.name && (
                <p className="text-sm text-red-500">{regionValidationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="code" className={regionValidationErrors.code ? 'text-red-500' : ''}>Region Code *</Label>
              <Input
                id="code"
                value={regionFormData.code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setRegionFormData({ ...regionFormData, code: value });
                  // Real-time validation
                  const error = validateRegionCode(value);
                  setRegionValidationErrors(prev => ({ ...prev, code: error }));
                }}
                placeholder="e.g., LHR"
                maxLength={10}
                className={regionValidationErrors.code ? 'border-red-500 focus:border-red-500' : ''}
              />
              {regionValidationErrors.code && (
                <p className="text-sm text-red-500">{regionValidationErrors.code}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="region-country" className={regionValidationErrors.country ? 'text-red-500' : ''}>Country *</Label>
              <Select
                value={regionFormData.country}
                onValueChange={(value) => {
                  setRegionFormData({ ...regionFormData, country: value });
                  // Real-time validation
                  const error = validateRegionCountry(value);
                  setRegionValidationErrors(prev => ({ ...prev, country: error }));
                }}
              >
                <SelectTrigger id="region-country" className={regionValidationErrors.country ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {allCountries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {regionValidationErrors.country && (
                <p className="text-sm text-red-500">{regionValidationErrors.country}</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description" className={regionValidationErrors.description ? 'text-red-500' : ''}>Description</Label>
              <Textarea
                id="description"
                value={regionFormData.description}
                onChange={(e) => {
                  const value = e.target.value;
                  setRegionFormData({ ...regionFormData, description: value });
                  // Real-time validation
                  const error = validateRegionDescription(value);
                  setRegionValidationErrors(prev => ({ ...prev, description: error }));
                }}
                placeholder="Brief description of the region..."
                rows={3}
                className={regionValidationErrors.description ? 'border-red-500 focus:border-red-500' : ''}
              />
              {regionValidationErrors.description && (
                <p className="text-sm text-red-500">{regionValidationErrors.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {regionFormData.description.length}/500 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegionCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRegionCreate} 
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90"
              disabled={regionsLoading || !!regionValidationErrors.name || !!regionValidationErrors.code || !!regionValidationErrors.country || !!regionValidationErrors.description}
            >
              {regionsLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Region'
              )}
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
              <Label htmlFor="edit-name" className={regionValidationErrors.name ? 'text-red-500' : ''}>Region Name *</Label>
              <Input
                id="edit-name"
                value={regionFormData.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setRegionFormData({ ...regionFormData, name: value });
                  // Real-time validation
                  const error = validateRegionName(value);
                  setRegionValidationErrors(prev => ({ ...prev, name: error }));
                }}
                placeholder="e.g., California"
                className={regionValidationErrors.name ? 'border-red-500 focus:border-red-500' : ''}
              />
              {regionValidationErrors.name && (
                <p className="text-sm text-red-500">{regionValidationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code" className={regionValidationErrors.code ? 'text-red-500' : ''}>Region Code *</Label>
              <Input
                id="edit-code"
                value={regionFormData.code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setRegionFormData({ ...regionFormData, code: value });
                  // Real-time validation
                  const error = validateRegionCode(value);
                  setRegionValidationErrors(prev => ({ ...prev, code: error }));
                }}
                placeholder="e.g., LHR"
                maxLength={10}
                className={regionValidationErrors.code ? 'border-red-500 focus:border-red-500' : ''}
              />
              {regionValidationErrors.code && (
                <p className="text-sm text-red-500">{regionValidationErrors.code}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-region-country" className={regionValidationErrors.country ? 'text-red-500' : ''}>Country *</Label>
              <Select
                value={regionFormData.country}
                onValueChange={(value) => {
                  setRegionFormData({ ...regionFormData, country: value });
                  // Real-time validation
                  const error = validateRegionCountry(value);
                  setRegionValidationErrors(prev => ({ ...prev, country: error }));
                }}
              >
                <SelectTrigger id="edit-region-country" className={regionValidationErrors.country ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {allCountries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {regionValidationErrors.country && (
                <p className="text-sm text-red-500">{regionValidationErrors.country}</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-description" className={regionValidationErrors.description ? 'text-red-500' : ''}>Description</Label>
              <Textarea
                id="edit-description"
                value={regionFormData.description}
                onChange={(e) => {
                  const value = e.target.value;
                  setRegionFormData({ ...regionFormData, description: value });
                  // Real-time validation
                  const error = validateRegionDescription(value);
                  setRegionValidationErrors(prev => ({ ...prev, description: error }));
                }}
                placeholder="Brief description of the region..."
                rows={3}
                className={regionValidationErrors.description ? 'border-red-500 focus:border-red-500' : ''}
              />
              {regionValidationErrors.description && (
                <p className="text-sm text-red-500">{regionValidationErrors.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {regionFormData.description.length}/500 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegionEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRegionEdit} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={regionsLoading || !!regionValidationErrors.name || !!regionValidationErrors.code || !!regionValidationErrors.country || !!regionValidationErrors.description}
            >
              {regionsLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Region'
              )}
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
              <Label htmlFor="city-name" className={cityValidationErrors.name ? 'text-red-500' : ''}>City Name *</Label>
              <Input
                id="city-name"
                value={cityFormData.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setCityFormData({ ...cityFormData, name: value });
                  // Real-time validation
                  const error = validateCityName(value);
                  setCityValidationErrors(prev => ({ ...prev, name: error }));
                }}
                placeholder="e.g., Lahore"
                className={cityValidationErrors.name ? 'border-red-500 focus:border-red-500' : ''}
              />
              {cityValidationErrors.name && (
                <p className="text-sm text-red-500">{cityValidationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city-code" className={cityValidationErrors.code ? 'text-red-500' : ''}>City Code *</Label>
              <Input
                id="city-code"
                value={cityFormData.code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setCityFormData({ ...cityFormData, code: value });
                  // Real-time validation
                  const error = validateCityCode(value);
                  setCityValidationErrors(prev => ({ ...prev, code: error }));
                }}
                placeholder="e.g., LHE"
                maxLength={10}
                className={cityValidationErrors.code ? 'border-red-500 focus:border-red-500' : ''}
              />
              {cityValidationErrors.code && (
                <p className="text-sm text-red-500">{cityValidationErrors.code}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city-country" className={cityValidationErrors.country ? 'text-red-500' : ''}>Country *</Label>
              <Select
                value={cityFormData.country}
                onValueChange={(value) => {
                  setCityFormData({ ...cityFormData, country: value, region: '' });
                  // Real-time validation
                  const error = validateCityCountry(value);
                  setCityValidationErrors(prev => ({ ...prev, country: error }));
                }}
              >
                <SelectTrigger id="city-country" className={cityValidationErrors.country ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {allCountries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cityValidationErrors.country && (
                <p className="text-sm text-red-500">{cityValidationErrors.country}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city-region" className={cityValidationErrors.region ? 'text-red-500' : ''}>Region *</Label>
              <Select
                value={cityFormData.region}
                onValueChange={(value) => {
                  setCityFormData({ ...cityFormData, region: value });
                  // Real-time validation
                  const error = validateCityRegion(value);
                  setCityValidationErrors(prev => ({ ...prev, region: error }));
                }}
                disabled={!cityFormData.country}
              >
                <SelectTrigger id="city-region" className={cityValidationErrors.region ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={cityFormData.country ? "Select a region" : "Select country first"} />
                </SelectTrigger>
                <SelectContent>
                  {allRegions
                    .filter(region => region.country_id === cityFormData.country)
                    .map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cityValidationErrors.region && (
                <p className="text-sm text-red-500">{cityValidationErrors.region}</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="city-description" className={cityValidationErrors.description ? 'text-red-500' : ''}>Description</Label>
              <Textarea
                id="city-description"
                value={cityFormData.description}
                onChange={(e) => {
                  const value = e.target.value;
                  setCityFormData({ ...cityFormData, description: value });
                  // Real-time validation
                  const error = validateCityDescription(value);
                  setCityValidationErrors(prev => ({ ...prev, description: error }));
                }}
                placeholder="Brief description of the city..."
                rows={3}
                className={cityValidationErrors.description ? 'border-red-500 focus:border-red-500' : ''}
              />
              {cityValidationErrors.description && (
                <p className="text-sm text-red-500">{cityValidationErrors.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {cityFormData.description.length}/500 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCityCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCityCreate} 
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90"
              disabled={citiesLoading || !!cityValidationErrors.name || !!cityValidationErrors.code || !!cityValidationErrors.country || !!cityValidationErrors.region || !!cityValidationErrors.description}
            >
              {citiesLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create City'
              )}
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
              <Label htmlFor="edit-city-name" className={cityValidationErrors.name ? 'text-red-500' : ''}>City Name *</Label>
              <Input
                id="edit-city-name"
                value={cityFormData.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setCityFormData({ ...cityFormData, name: value });
                  // Real-time validation
                  const error = validateCityName(value);
                  setCityValidationErrors(prev => ({ ...prev, name: error }));
                }}
                placeholder="e.g., Lahore"
                className={cityValidationErrors.name ? 'border-red-500 focus:border-red-500' : ''}
              />
              {cityValidationErrors.name && (
                <p className="text-sm text-red-500">{cityValidationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city-code" className={cityValidationErrors.code ? 'text-red-500' : ''}>City Code *</Label>
              <Input
                id="edit-city-code"
                value={cityFormData.code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setCityFormData({ ...cityFormData, code: value });
                  // Real-time validation
                  const error = validateCityCode(value);
                  setCityValidationErrors(prev => ({ ...prev, code: error }));
                }}
                placeholder="e.g., LHE"
                maxLength={10}
                className={cityValidationErrors.code ? 'border-red-500 focus:border-red-500' : ''}
              />
              {cityValidationErrors.code && (
                <p className="text-sm text-red-500">{cityValidationErrors.code}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city-country" className={cityValidationErrors.country ? 'text-red-500' : ''}>Country *</Label>
              <Select
                value={cityFormData.country}
                onValueChange={(value) => {
                  setCityFormData({ ...cityFormData, country: value, region: '' });
                  // Real-time validation
                  const error = validateCityCountry(value);
                  setCityValidationErrors(prev => ({ ...prev, country: error }));
                }}
              >
                <SelectTrigger id="edit-city-country" className={cityValidationErrors.country ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {allCountries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cityValidationErrors.country && (
                <p className="text-sm text-red-500">{cityValidationErrors.country}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city-region" className={cityValidationErrors.region ? 'text-red-500' : ''}>Region *</Label>
              <Select
                value={cityFormData.region}
                onValueChange={(value) => {
                  setCityFormData({ ...cityFormData, region: value });
                  // Real-time validation
                  const error = validateCityRegion(value);
                  setCityValidationErrors(prev => ({ ...prev, region: error }));
                }}
                disabled={!cityFormData.country}
              >
                <SelectTrigger id="edit-city-region" className={cityValidationErrors.region ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={cityFormData.country ? "Select a region" : "Select country first"} />
                </SelectTrigger>
                <SelectContent>
                  {allRegions
                    .filter(region => region.country_id === cityFormData.country)
                    .map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cityValidationErrors.region && (
                <p className="text-sm text-red-500">{cityValidationErrors.region}</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-city-description" className={cityValidationErrors.description ? 'text-red-500' : ''}>Description</Label>
              <Textarea
                id="edit-city-description"
                value={cityFormData.description}
                onChange={(e) => {
                  const value = e.target.value;
                  setCityFormData({ ...cityFormData, description: value });
                  // Real-time validation
                  const error = validateCityDescription(value);
                  setCityValidationErrors(prev => ({ ...prev, description: error }));
                }}
                placeholder="Brief description of the city..."
                rows={3}
                className={cityValidationErrors.description ? 'border-red-500 focus:border-red-500' : ''}
              />
              {cityValidationErrors.description && (
                <p className="text-sm text-red-500">{cityValidationErrors.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {cityFormData.description.length}/500 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCityEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCityEdit} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={citiesLoading || !!cityValidationErrors.name || !!cityValidationErrors.code || !!cityValidationErrors.country || !!cityValidationErrors.region || !!cityValidationErrors.description}
            >
              {citiesLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update City'
              )}
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
              <Label htmlFor="project-name" className={projectValidationErrors.name ? 'text-red-500' : ''}>Project Name *</Label>
              <Input
                id="project-name"
                value={projectFormData.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setProjectFormData({ ...projectFormData, name: value });
                  // Real-time validation
                  const error = validateProjectName(value);
                  setProjectValidationErrors(prev => ({ ...prev, name: error }));
                }}
                placeholder="e.g., Digital Learning Initiative"
                className={projectValidationErrors.name ? 'border-red-500 focus:border-red-500' : ''}
              />
              {projectValidationErrors.name && (
                <p className="text-sm text-red-500">{projectValidationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-code" className={projectValidationErrors.code ? 'text-red-500' : ''}>Project Code *</Label>
              <Input
                id="project-code"
                value={projectFormData.code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setProjectFormData({ ...projectFormData, code: value });
                  // Real-time validation
                  const error = validateProjectCode(value);
                  setProjectValidationErrors(prev => ({ ...prev, code: error }));
                }}
                placeholder="e.g., DLI-001"
                maxLength={10}
                className={projectValidationErrors.code ? 'border-red-500 focus:border-red-500' : ''}
              />
              {projectValidationErrors.code && (
                <p className="text-sm text-red-500">{projectValidationErrors.code}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-country" className={projectValidationErrors.country ? 'text-red-500' : ''}>Country *</Label>
              <Select
                value={projectFormData.country}
                onValueChange={(value) => {
                  setProjectFormData({ ...projectFormData, country: value, region: '', city: '' });
                  // Real-time validation
                  const error = validateProjectCountry(value);
                  setProjectValidationErrors(prev => ({ ...prev, country: error }));
                }}
              >
                <SelectTrigger id="project-country" className={projectValidationErrors.country ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {allCountries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {projectValidationErrors.country && (
                <p className="text-sm text-red-500">{projectValidationErrors.country}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-region" className={projectValidationErrors.region ? 'text-red-500' : ''}>Region *</Label>
              <Select
                value={projectFormData.region}
                onValueChange={(value) => {
                  setProjectFormData({ ...projectFormData, region: value, city: '' });
                  // Real-time validation
                  const error = validateProjectRegion(value);
                  setProjectValidationErrors(prev => ({ ...prev, region: error }));
                }}
                disabled={!projectFormData.country}
              >
                <SelectTrigger id="project-region" className={projectValidationErrors.region ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={projectFormData.country ? "Select a region" : "Select country first"} />
                </SelectTrigger>
                <SelectContent>
                  {allRegions
                    .filter(region => region.country_id === projectFormData.country)
                    .map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {projectValidationErrors.region && (
                <p className="text-sm text-red-500">{projectValidationErrors.region}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-city" className={projectValidationErrors.city ? 'text-red-500' : ''}>City *</Label>
              <Select
                value={projectFormData.city}
                onValueChange={(value) => {
                  setProjectFormData({ ...projectFormData, city: value });
                  // Real-time validation
                  const error = validateProjectCity(value);
                  setProjectValidationErrors(prev => ({ ...prev, city: error }));
                }}
                disabled={!projectFormData.region}
              >
                <SelectTrigger id="project-city" className={projectValidationErrors.city ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={projectFormData.region ? "Select a city" : "Select region first"} />
                </SelectTrigger>
                <SelectContent>
                  {allCities
                    .filter(city => city.region_id === projectFormData.region && city.country_id === projectFormData.country)
                    .map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {projectValidationErrors.city && (
                <p className="text-sm text-red-500">{projectValidationErrors.city}</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="project-description" className={projectValidationErrors.description ? 'text-red-500' : ''}>Description</Label>
              <Textarea
                id="project-description"
                value={projectFormData.description}
                onChange={(e) => {
                  const value = e.target.value;
                  setProjectFormData({ ...projectFormData, description: value });
                  // Real-time validation
                  const error = validateProjectDescription(value);
                  setProjectValidationErrors(prev => ({ ...prev, description: error }));
                }}
                placeholder="Brief description of the project..."
                rows={3}
                className={projectValidationErrors.description ? 'border-red-500 focus:border-red-500' : ''}
              />
              {projectValidationErrors.description && (
                <p className="text-sm text-red-500">{projectValidationErrors.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {projectFormData.description.length}/500 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProjectCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleProjectCreate} 
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90"
              disabled={projectsLoading || !!projectValidationErrors.name || !!projectValidationErrors.code || !!projectValidationErrors.country || !!projectValidationErrors.region || !!projectValidationErrors.city || !!projectValidationErrors.description}
            >
              {projectsLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
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
              <Label htmlFor="edit-project-name" className={projectValidationErrors.name ? 'text-red-500' : ''}>Project Name *</Label>
              <Input
                id="edit-project-name"
                value={projectFormData.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setProjectFormData({ ...projectFormData, name: value });
                  // Real-time validation
                  const error = validateProjectName(value);
                  setProjectValidationErrors(prev => ({ ...prev, name: error }));
                }}
                placeholder="e.g., Digital Learning Initiative"
                className={projectValidationErrors.name ? 'border-red-500 focus:border-red-500' : ''}
              />
              {projectValidationErrors.name && (
                <p className="text-sm text-red-500">{projectValidationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-code" className={projectValidationErrors.code ? 'text-red-500' : ''}>Project Code *</Label>
              <Input
                id="edit-project-code"
                value={projectFormData.code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setProjectFormData({ ...projectFormData, code: value });
                  // Real-time validation
                  const error = validateProjectCode(value);
                  setProjectValidationErrors(prev => ({ ...prev, code: error }));
                }}
                placeholder="e.g., DLI-001"
                maxLength={10}
                className={projectValidationErrors.code ? 'border-red-500 focus:border-red-500' : ''}
              />
              {projectValidationErrors.code && (
                <p className="text-sm text-red-500">{projectValidationErrors.code}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-country" className={projectValidationErrors.country ? 'text-red-500' : ''}>Country *</Label>
              <Select
                value={projectFormData.country}
                onValueChange={(value) => {
                  setProjectFormData({ ...projectFormData, country: value, region: '', city: '' });
                  // Real-time validation
                  const error = validateProjectCountry(value);
                  setProjectValidationErrors(prev => ({ ...prev, country: error }));
                }}
              >
                <SelectTrigger id="edit-project-country" className={projectValidationErrors.country ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {allCountries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {projectValidationErrors.country && (
                <p className="text-sm text-red-500">{projectValidationErrors.country}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-region" className={projectValidationErrors.region ? 'text-red-500' : ''}>Region *</Label>
              <Select
                value={projectFormData.region}
                onValueChange={(value) => {
                  setProjectFormData({ ...projectFormData, region: value, city: '' });
                  // Real-time validation
                  const error = validateProjectRegion(value);
                  setProjectValidationErrors(prev => ({ ...prev, region: error }));
                }}
                disabled={!projectFormData.country}
              >
                <SelectTrigger id="edit-project-region" className={projectValidationErrors.region ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={projectFormData.country ? "Select a region" : "Select region first"} />
                </SelectTrigger>
                <SelectContent>
                  {allRegions
                    .filter(region => region.country_id === projectFormData.country)
                    .map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {projectValidationErrors.region && (
                <p className="text-sm text-red-500">{projectValidationErrors.region}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-city" className={projectValidationErrors.city ? 'text-red-500' : ''}>City *</Label>
              <Select
                value={projectFormData.city}
                onValueChange={(value) => {
                  setProjectFormData({ ...projectFormData, city: value });
                  // Real-time validation
                  const error = validateProjectCity(value);
                  setProjectValidationErrors(prev => ({ ...prev, city: error }));
                }}
                disabled={!projectFormData.region}
              >
                <SelectTrigger id="edit-project-city" className={projectValidationErrors.city ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={projectFormData.region ? "Select a city" : "Select region first"} />
                </SelectTrigger>
                <SelectContent>
                  {allCities
                    .filter(city => city.region_id === projectFormData.region && city.country_id === projectFormData.country)
                    .map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {projectValidationErrors.city && (
                <p className="text-sm text-red-500">{projectValidationErrors.city}</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-project-description" className={projectValidationErrors.description ? 'text-red-500' : ''}>Description</Label>
              <Textarea
                id="edit-project-description"
                value={projectFormData.description}
                onChange={(e) => {
                  const value = e.target.value;
                  setProjectFormData({ ...projectFormData, description: value });
                  // Real-time validation
                  const error = validateProjectDescription(value);
                  setProjectValidationErrors(prev => ({ ...prev, description: error }));
                }}
                placeholder="Brief description of the project..."
                rows={3}
                className={projectValidationErrors.description ? 'border-red-500 focus:border-red-500' : ''}
              />
              {projectValidationErrors.description && (
                <p className="text-sm text-red-500">{projectValidationErrors.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {projectFormData.description.length}/500 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProjectEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleProjectEdit} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={projectsLoading || !!projectValidationErrors.name || !!projectValidationErrors.code || !!projectValidationErrors.country || !!projectValidationErrors.region || !!projectValidationErrors.city || !!projectValidationErrors.description}
            >
              {projectsLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Project'
              )}
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
              <Label htmlFor="board-name" className={boardValidationErrors.name ? 'text-red-500' : ''}>Board Name *</Label>
              <Input
                id="board-name"
                value={boardFormData.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setBoardFormData({ ...boardFormData, name: value });
                  // Real-time validation
                  const error = validateBoardName(value);
                  setBoardValidationErrors(prev => ({ ...prev, name: error }));
                }}
                placeholder="e.g., Central Board of Secondary Education"
                className={boardValidationErrors.name ? 'border-red-500 focus:border-red-500' : ''}
              />
              {boardValidationErrors.name && (
                <p className="text-sm text-red-500">{boardValidationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-code" className={boardValidationErrors.code ? 'text-red-500' : ''}>Board Code *</Label>
              <Input
                id="board-code"
                value={boardFormData.code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setBoardFormData({ ...boardFormData, code: value });
                  // Real-time validation
                  const error = validateBoardCode(value);
                  setBoardValidationErrors(prev => ({ ...prev, code: error }));
                }}
                placeholder="e.g., CBSE"
                maxLength={10}
                className={boardValidationErrors.code ? 'border-red-500 focus:border-red-500' : ''}
              />
              {boardValidationErrors.code && (
                <p className="text-sm text-red-500">{boardValidationErrors.code}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-country" className={boardValidationErrors.country ? 'text-red-500' : ''}>Country *</Label>
              <Select
                value={boardFormData.country}
                onValueChange={(value) => {
                  setBoardFormData({ ...boardFormData, country: value, region: '', city: '', project: '' });
                  // Real-time validation
                  const error = validateBoardCountry(value);
                  setBoardValidationErrors(prev => ({ ...prev, country: error }));
                }}
              >
                <SelectTrigger id="board-country" className={boardValidationErrors.country ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {allCountries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {boardValidationErrors.country && (
                <p className="text-sm text-red-500">{boardValidationErrors.country}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-region" className={boardValidationErrors.region ? 'text-red-500' : ''}>Region *</Label>
              <Select
                value={boardFormData.region}
                onValueChange={(value) => {
                  setBoardFormData({ ...boardFormData, region: value, city: '', project: '' });
                  // Real-time validation
                  const error = validateBoardRegion(value);
                  setBoardValidationErrors(prev => ({ ...prev, region: error }));
                }}
                disabled={!boardFormData.country}
              >
                <SelectTrigger id="board-region" className={boardValidationErrors.region ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={boardFormData.country ? "Select a region" : "Select country first"} />
                </SelectTrigger>
                <SelectContent>
                  {allRegions
                    .filter(region => region.country_id === boardFormData.country)
                    .map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {boardValidationErrors.region && (
                <p className="text-sm text-red-500">{boardValidationErrors.region}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-city" className={boardValidationErrors.city ? 'text-red-500' : ''}>City *</Label>
              <Select
                value={boardFormData.city}
                onValueChange={(value) => {
                  setBoardFormData({ ...boardFormData, city: value, project: '' });
                  // Real-time validation
                  const error = validateBoardCity(value);
                  setBoardValidationErrors(prev => ({ ...prev, city: error }));
                }}
                disabled={!boardFormData.region}
              >
                <SelectTrigger id="board-city" className={boardValidationErrors.city ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={boardFormData.region ? "Select a city" : "Select region first"} />
                </SelectTrigger>
                <SelectContent>
                  {allCities
                    .filter(city => city.region_id === boardFormData.region && city.country_id === boardFormData.country)
                    .map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {boardValidationErrors.city && (
                <p className="text-sm text-red-500">{boardValidationErrors.city}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-project" className={boardValidationErrors.project ? 'text-red-500' : ''}>Project *</Label>
              <Select
                value={boardFormData.project}
                onValueChange={(value) => {
                  setBoardFormData({ ...boardFormData, project: value });
                  // Real-time validation
                  const error = validateBoardProject(value);
                  setBoardValidationErrors(prev => ({ ...prev, project: error }));
                }}
                disabled={!boardFormData.city}
              >
                <SelectTrigger id="board-project" className={boardValidationErrors.project ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={boardFormData.city ? "Select a project" : "Select city first"} />
                </SelectTrigger>
                <SelectContent>
                  {allProjects
                    .filter(project => project.city_id === boardFormData.city && project.region_id === boardFormData.region && project.country_id === boardFormData.country)
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {boardValidationErrors.project && (
                <p className="text-sm text-red-500">{boardValidationErrors.project}</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="board-description" className={boardValidationErrors.description ? 'text-red-500' : ''}>Description</Label>
              <Textarea
                id="board-description"
                value={boardFormData.description}
                onChange={(e) => {
                  const value = e.target.value;
                  setBoardFormData({ ...boardFormData, description: value });
                  // Real-time validation
                  const error = validateBoardDescription(value);
                  setBoardValidationErrors(prev => ({ ...prev, description: error }));
                }}
                placeholder="Brief description of the board..."
                rows={3}
                className={boardValidationErrors.description ? 'border-red-500 focus:border-red-500' : ''}
              />
              {boardValidationErrors.description && (
                <p className="text-sm text-red-500">{boardValidationErrors.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {boardFormData.description.length}/500 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBoardCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBoardCreate} 
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90"
              disabled={boardsLoading || !!boardValidationErrors.name || !!boardValidationErrors.code || !!boardValidationErrors.country || !!boardValidationErrors.region || !!boardValidationErrors.city || !!boardValidationErrors.project || !!boardValidationErrors.description}
            >
              {boardsLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Board'
              )}
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
              <Label htmlFor="edit-board-name" className={boardValidationErrors.name ? 'text-red-500' : ''}>Board Name *</Label>
              <Input
                id="edit-board-name"
                value={boardFormData.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setBoardFormData({ ...boardFormData, name: value });
                  // Real-time validation
                  const error = validateBoardName(value);
                  setBoardValidationErrors(prev => ({ ...prev, name: error }));
                }}
                placeholder="e.g., Central Board of Secondary Education"
                className={boardValidationErrors.name ? 'border-red-500 focus:border-red-500' : ''}
              />
              {boardValidationErrors.name && (
                <p className="text-sm text-red-500">{boardValidationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-board-code" className={boardValidationErrors.code ? 'text-red-500' : ''}>Board Code *</Label>
              <Input
                id="edit-board-code"
                value={boardFormData.code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setBoardFormData({ ...boardFormData, code: value });
                  // Real-time validation
                  const error = validateBoardCode(value);
                  setBoardValidationErrors(prev => ({ ...prev, code: error }));
                }}
                placeholder="e.g., CBSE"
                maxLength={10}
                className={boardValidationErrors.code ? 'border-red-500 focus:border-red-500' : ''}
              />
              {boardValidationErrors.code && (
                <p className="text-sm text-red-500">{boardValidationErrors.code}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-board-country" className={boardValidationErrors.country ? 'text-red-500' : ''}>Country *</Label>
              <Select
                value={boardFormData.country}
                onValueChange={(value) => {
                  setBoardFormData({ ...boardFormData, country: value, region: '', city: '', project: '' });
                  // Real-time validation
                  const error = validateBoardCountry(value);
                  setBoardValidationErrors(prev => ({ ...prev, country: error }));
                }}
              >
                <SelectTrigger id="edit-board-country" className={boardValidationErrors.country ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {allCountries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {boardValidationErrors.country && (
                <p className="text-sm text-red-500">{boardValidationErrors.country}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-board-region" className={boardValidationErrors.region ? 'text-red-500' : ''}>Region *</Label>
              <Select
                value={boardFormData.region}
                onValueChange={(value) => {
                  setBoardFormData({ ...boardFormData, region: value, city: '', project: '' });
                  // Real-time validation
                  const error = validateBoardRegion(value);
                  setBoardValidationErrors(prev => ({ ...prev, region: error }));
                }}
                disabled={!boardFormData.country}
              >
                <SelectTrigger id="edit-board-region" className={boardValidationErrors.region ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={boardFormData.country ? "Select a region" : "Select country first"} />
                </SelectTrigger>
                <SelectContent>
                  {allRegions
                    .filter(region => region.country_id === boardFormData.country)
                    .map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {boardValidationErrors.region && (
                <p className="text-sm text-red-500">{boardValidationErrors.region}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-board-city" className={boardValidationErrors.city ? 'text-red-500' : ''}>City *</Label>
              <Select
                value={boardFormData.city}
                onValueChange={(value) => {
                  setBoardFormData({ ...boardFormData, city: value, project: '' });
                  // Real-time validation
                  const error = validateBoardCity(value);
                  setBoardValidationErrors(prev => ({ ...prev, city: error }));
                }}
                disabled={!boardFormData.region}
              >
                <SelectTrigger id="edit-board-city" className={boardValidationErrors.city ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={boardFormData.region ? "Select a city" : "Select region first"} />
                </SelectTrigger>
                <SelectContent>
                  {allCities
                    .filter(city => city.region_id === boardFormData.region && city.country_id === boardFormData.country)
                    .map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {boardValidationErrors.city && (
                <p className="text-sm text-red-500">{boardValidationErrors.city}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-board-project" className={boardValidationErrors.project ? 'text-red-500' : ''}>Project *</Label>
              <Select
                value={boardFormData.project}
                onValueChange={(value) => {
                  setBoardFormData({ ...boardFormData, project: value });
                  // Real-time validation
                  const error = validateBoardProject(value);
                  setBoardValidationErrors(prev => ({ ...prev, project: error }));
                }}
                disabled={!boardFormData.city}
              >
                <SelectTrigger id="edit-board-project" className={boardValidationErrors.project ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={boardFormData.city ? "Select a project" : "Select city first"} />
                </SelectTrigger>
                <SelectContent>
                  {allProjects
                    .filter(project => project.city_id === boardFormData.city && project.region_id === boardFormData.region && project.country_id === boardFormData.country)
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {boardValidationErrors.project && (
                <p className="text-sm text-red-500">{boardValidationErrors.project}</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-board-description" className={boardValidationErrors.description ? 'text-red-500' : ''}>Description</Label>
              <Textarea
                id="edit-board-description"
                value={boardFormData.description}
                onChange={(e) => {
                  const value = e.target.value;
                  setBoardFormData({ ...boardFormData, description: value });
                  // Real-time validation
                  const error = validateBoardDescription(value);
                  setBoardValidationErrors(prev => ({ ...prev, description: error }));
                }}
                placeholder="Brief description of the board..."
                rows={3}
                className={boardValidationErrors.description ? 'border-red-500 focus:border-red-500' : ''}
              />
              {boardValidationErrors.description && (
                <p className="text-sm text-red-500">{boardValidationErrors.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {boardFormData.description.length}/500 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBoardEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBoardEdit} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={boardsLoading || !!boardValidationErrors.name || !!boardValidationErrors.code || !!boardValidationErrors.country || !!boardValidationErrors.region || !!boardValidationErrors.city || !!boardValidationErrors.project || !!boardValidationErrors.description}
            >
              {boardsLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Board'
              )}
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
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Create New School</DialogTitle>
            <DialogDescription>
              Add a new school or educational institution to the system. Fill in the required information below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 px-2">
            <div className="space-y-2">
              <Label htmlFor="school-name" className={schoolValidationErrors.name ? 'text-red-500' : ''}>School Name *</Label>
              <Input
                id="school-name"
                value={schoolFormData.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setSchoolFormData({ ...schoolFormData, name: value });
                  // Real-time validation
                  const error = validateSchoolName(value);
                  setSchoolValidationErrors(prev => ({ ...prev, name: error }));
                }}
                placeholder="e.g., Beaconhouse School System"
                className={schoolValidationErrors.name ? 'border-red-500 focus:border-red-500' : ''}
              />
              {schoolValidationErrors.name && (
                <p className="text-sm text-red-500">{schoolValidationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-code" className={schoolValidationErrors.code ? 'text-red-500' : ''}>School Code *</Label>
              <Input
                id="school-code"
                value={schoolFormData.code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setSchoolFormData({ ...schoolFormData, code: value });
                  // Real-time validation
                  const error = validateSchoolCode(value);
                  setSchoolValidationErrors(prev => ({ ...prev, code: error }));
                }}
                placeholder="e.g., BSS-001"
                maxLength={10}
                className={schoolValidationErrors.code ? 'border-red-500 focus:border-red-500' : ''}
              />
              {schoolValidationErrors.code && (
                <p className="text-sm text-red-500">{schoolValidationErrors.code}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-type" className={schoolValidationErrors.type ? 'text-red-500' : ''}>School Type *</Label>
              <Select
                value={schoolFormData.type}
                onValueChange={(value) => {
                  setSchoolFormData({ ...schoolFormData, type: value });
                  // Real-time validation
                  const error = validateSchoolType(value);
                  setSchoolValidationErrors(prev => ({ ...prev, type: error }));
                }}
              >
                <SelectTrigger id="school-type" className={schoolValidationErrors.type ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder="Select school type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Private">Private</SelectItem>
                  <SelectItem value="Public">Public</SelectItem>
                  <SelectItem value="International">International</SelectItem>
                </SelectContent>
              </Select>
              {schoolValidationErrors.type && (
                <p className="text-sm text-red-500">{schoolValidationErrors.type}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-country" className={schoolValidationErrors.country ? 'text-red-500' : ''}>Country *</Label>
              <Select
                value={schoolFormData.country}
                onValueChange={(value) => {
                  setSchoolFormData({ ...schoolFormData, country: value, region: '', city: '', project: '', board: '' });
                  // Real-time validation
                  const error = validateSchoolCountry(value);
                  setSchoolValidationErrors(prev => ({ ...prev, country: error }));
                }}
              >
                <SelectTrigger id="school-country" className={schoolValidationErrors.country ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {allCountries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {schoolValidationErrors.country && (
                <p className="text-sm text-red-500">{schoolValidationErrors.country}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-region" className={schoolValidationErrors.region ? 'text-red-500' : ''}>Region *</Label>
              <Select
                value={schoolFormData.region}
                onValueChange={(value) => {
                  setSchoolFormData({ ...schoolFormData, region: value, city: '', project: '', board: '' });
                  // Real-time validation
                  const error = validateSchoolRegion(value);
                  setSchoolValidationErrors(prev => ({ ...prev, region: error }));
                }}
                disabled={!schoolFormData.country}
              >
                <SelectTrigger id="school-region" className={schoolValidationErrors.region ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={schoolFormData.country ? "Select a region" : "Select country first"} />
                </SelectTrigger>
                <SelectContent>
                  {allRegions
                    .filter(region => region.country_id === schoolFormData.country)
                    .map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {schoolValidationErrors.region && (
                <p className="text-sm text-red-500">{schoolValidationErrors.region}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-city" className={schoolValidationErrors.city ? 'text-red-500' : ''}>City *</Label>
              <Select
                value={schoolFormData.city}
                onValueChange={(value) => {
                  setSchoolFormData({ ...schoolFormData, city: value, project: '', board: '' });
                  // Real-time validation
                  const error = validateSchoolCity(value);
                  setSchoolValidationErrors(prev => ({ ...prev, city: error }));
                }}
                disabled={!schoolFormData.region}
              >
                <SelectTrigger id="school-city" className={schoolValidationErrors.city ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={schoolFormData.region ? "Select a city" : "Select region first"} />
                </SelectTrigger>
                <SelectContent>
                  {allCities
                    .filter(city => city.region_id === schoolFormData.region && city.country_id === schoolFormData.country)
                    .map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {schoolValidationErrors.city && (
                <p className="text-sm text-red-500">{schoolValidationErrors.city}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-project" className={schoolValidationErrors.project ? 'text-red-500' : ''}>Project *</Label>
              <Select
                value={schoolFormData.project}
                onValueChange={(value) => {
                  setSchoolFormData({ ...schoolFormData, project: value, board: '' });
                  // Real-time validation
                  const error = validateSchoolProject(value);
                  setSchoolValidationErrors(prev => ({ ...prev, project: error }));
                }}
                disabled={!schoolFormData.city}
              >
                <SelectTrigger id="school-project" className={schoolValidationErrors.project ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={schoolFormData.city ? "Select a project" : "Select city first"} />
                </SelectTrigger>
                <SelectContent>
                  {allProjects
                    .filter(project => project.city_id === schoolFormData.city && project.region_id === schoolFormData.region && project.country_id === schoolFormData.country)
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {schoolValidationErrors.project && (
                <p className="text-sm text-red-500">{schoolValidationErrors.project}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-board" className={schoolValidationErrors.board ? 'text-red-500' : ''}>Board *</Label>
              <Select
                value={schoolFormData.board}
                onValueChange={(value) => {
                  setSchoolFormData({ ...schoolFormData, board: value });
                  // Real-time validation
                  const error = validateSchoolBoard(value);
                  setSchoolValidationErrors(prev => ({ ...prev, board: error }));
                }}
                disabled={!schoolFormData.project}
              >
                <SelectTrigger id="school-board" className={schoolValidationErrors.board ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={schoolFormData.project ? "Select a board" : "Select project first"} />
                </SelectTrigger>
                <SelectContent>
                  {allBoards
                    .filter(board => board.project_id === schoolFormData.project)
                    .map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {schoolValidationErrors.board && (
                <p className="text-sm text-red-500">{schoolValidationErrors.board}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-phone" className={schoolValidationErrors.phone ? 'text-red-500' : ''}>Phone</Label>
              <Input
                id="school-phone"
                value={schoolFormData.phone}
                onChange={(e) => {
                  const value = e.target.value;
                  setSchoolFormData({ ...schoolFormData, phone: value });
                  // Real-time validation
                  const error = validateSchoolPhone(value);
                  setSchoolValidationErrors(prev => ({ ...prev, phone: error }));
                }}
                placeholder="e.g., +92-42-1234567"
                className={schoolValidationErrors.phone ? 'border-red-500 focus:border-red-500' : ''}
              />
              {schoolValidationErrors.phone && (
                <p className="text-sm text-red-500">{schoolValidationErrors.phone}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-email" className={schoolValidationErrors.email ? 'text-red-500' : ''}>Email</Label>
              <Input
                id="school-email"
                type="email"
                value={schoolFormData.email}
                onChange={(e) => {
                  const value = e.target.value;
                  setSchoolFormData({ ...schoolFormData, email: value });
                  // Real-time validation
                  const error = validateSchoolEmail(value);
                  setSchoolValidationErrors(prev => ({ ...prev, email: error }));
                }}
                placeholder="e.g., info@school.edu.pk"
                className={schoolValidationErrors.email ? 'border-red-500 focus:border-red-500' : ''}
              />
              {schoolValidationErrors.email && (
                <p className="text-sm text-red-500">{schoolValidationErrors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-website" className={schoolValidationErrors.website ? 'text-red-500' : ''}>Website</Label>
              <Input
                id="school-website"
                value={schoolFormData.website}
                onChange={(e) => {
                  const value = e.target.value;
                  setSchoolFormData({ ...schoolFormData, website: value });
                  // Real-time validation
                  const error = validateSchoolWebsite(value);
                  setSchoolValidationErrors(prev => ({ ...prev, website: error }));
                }}
                placeholder="e.g., https://www.school.edu.pk"
                className={schoolValidationErrors.website ? 'border-red-500 focus:border-red-500' : ''}
              />
              {schoolValidationErrors.website && (
                <p className="text-sm text-red-500">{schoolValidationErrors.website}</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="school-address" className={schoolValidationErrors.address ? 'text-red-500' : ''}>Address *</Label>
              <Textarea
                id="school-address"
                value={schoolFormData.address}
                onChange={(e) => {
                  const value = e.target.value;
                  setSchoolFormData({ ...schoolFormData, address: value });
                  // Real-time validation
                  const error = validateSchoolAddress(value);
                  setSchoolValidationErrors(prev => ({ ...prev, address: error }));
                }}
                placeholder="Full address of the school..."
                rows={3}
                className={schoolValidationErrors.address ? 'border-red-500 focus:border-red-500' : ''}
              />
              {schoolValidationErrors.address && (
                <p className="text-sm text-red-500">{schoolValidationErrors.address}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {schoolFormData.address.length}/200 characters
              </p>
            </div>
          </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setIsSchoolCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSchoolCreate} 
              className="bg-[#8DC63F] hover:bg-[#8DC63F]/90"
              disabled={schoolsLoading || !!schoolValidationErrors.name || !!schoolValidationErrors.code || !!schoolValidationErrors.type || !!schoolValidationErrors.address || !!schoolValidationErrors.country || !!schoolValidationErrors.region || !!schoolValidationErrors.city || !!schoolValidationErrors.project || !!schoolValidationErrors.board || !!schoolValidationErrors.phone || !!schoolValidationErrors.email || !!schoolValidationErrors.website}
            >
              {schoolsLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create School'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit School Dialog */}
      <Dialog open={isSchoolEditDialogOpen} onOpenChange={setIsSchoolEditDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit School</DialogTitle>
            <DialogDescription>
              Update the information for {editingSchool?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 px-2">
            <div className="space-y-2">
              <Label htmlFor="edit-school-name" className={schoolValidationErrors.name ? 'text-red-500' : ''}>School Name *</Label>
              <Input
                id="edit-school-name"
                value={schoolFormData.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setSchoolFormData({ ...schoolFormData, name: value });
                  // Real-time validation
                  const error = validateSchoolName(value);
                  setSchoolValidationErrors(prev => ({ ...prev, name: error }));
                }}
                placeholder="e.g., Beaconhouse School System"
                className={schoolValidationErrors.name ? 'border-red-500 focus:border-red-500' : ''}
              />
              {schoolValidationErrors.name && (
                <p className="text-sm text-red-500">{schoolValidationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-code" className={schoolValidationErrors.code ? 'text-red-500' : ''}>School Code *</Label>
              <Input
                id="edit-school-code"
                value={schoolFormData.code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setSchoolFormData({ ...schoolFormData, code: value });
                  // Real-time validation
                  const error = validateSchoolCode(value);
                  setSchoolValidationErrors(prev => ({ ...prev, code: error }));
                }}
                placeholder="e.g., BSS-001"
                maxLength={10}
                className={schoolValidationErrors.code ? 'border-red-500 focus:border-red-500' : ''}
              />
              {schoolValidationErrors.code && (
                <p className="text-sm text-red-500">{schoolValidationErrors.code}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-type" className={schoolValidationErrors.type ? 'text-red-500' : ''}>School Type *</Label>
              <Select
                value={schoolFormData.type}
                onValueChange={(value) => {
                  setSchoolFormData({ ...schoolFormData, type: value });
                  // Real-time validation
                  const error = validateSchoolType(value);
                  setSchoolValidationErrors(prev => ({ ...prev, type: error }));
                }}
              >
                <SelectTrigger id="edit-school-type" className={schoolValidationErrors.type ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder="Select school type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Private">Private</SelectItem>
                  <SelectItem value="Public">Public</SelectItem>
                  <SelectItem value="International">International</SelectItem>
                </SelectContent>
              </Select>
              {schoolValidationErrors.type && (
                <p className="text-sm text-red-500">{schoolValidationErrors.type}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-country" className={schoolValidationErrors.country ? 'text-red-500' : ''}>Country *</Label>
              <Select
                value={schoolFormData.country}
                onValueChange={(value) => {
                  setSchoolFormData({ ...schoolFormData, country: value, region: '', city: '', project: '', board: '' });
                  // Real-time validation
                  const error = validateSchoolCountry(value);
                  setSchoolValidationErrors(prev => ({ ...prev, country: error }));
                }}
              >
                <SelectTrigger id="edit-school-country" className={schoolValidationErrors.country ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {allCountries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {schoolValidationErrors.country && (
                <p className="text-sm text-red-500">{schoolValidationErrors.country}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-region" className={schoolValidationErrors.region ? 'text-red-500' : ''}>Region *</Label>
              <Select
                value={schoolFormData.region}
                onValueChange={(value) => {
                  setSchoolFormData({ ...schoolFormData, region: value, city: '', project: '', board: '' });
                  // Real-time validation
                  const error = validateSchoolRegion(value);
                  setSchoolValidationErrors(prev => ({ ...prev, region: error }));
                }}
                disabled={!schoolFormData.country}
              >
                <SelectTrigger id="edit-school-region" className={schoolValidationErrors.region ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={schoolFormData.country ? "Select a region" : "Select country first"} />
                </SelectTrigger>
                <SelectContent>
                  {allRegions
                    .filter(region => region.country_id === schoolFormData.country)
                    .map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {schoolValidationErrors.region && (
                <p className="text-sm text-red-500">{schoolValidationErrors.region}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-city" className={schoolValidationErrors.city ? 'text-red-500' : ''}>City *</Label>
              <Select
                value={schoolFormData.city}
                onValueChange={(value) => {
                  setSchoolFormData({ ...schoolFormData, city: value, project: '', board: '' });
                  // Real-time validation
                  const error = validateSchoolCity(value);
                  setSchoolValidationErrors(prev => ({ ...prev, city: error }));
                }}
                disabled={!schoolFormData.region}
              >
                <SelectTrigger id="edit-school-city" className={schoolValidationErrors.city ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={schoolFormData.region ? "Select a city" : "Select region first"} />
                </SelectTrigger>
                <SelectContent>
                  {allCities
                    .filter(city => city.region_id === schoolFormData.region && city.country_id === schoolFormData.country)
                    .map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {schoolValidationErrors.city && (
                <p className="text-sm text-red-500">{schoolValidationErrors.city}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-project" className={schoolValidationErrors.project ? 'text-red-500' : ''}>Project *</Label>
              <Select
                value={schoolFormData.project}
                onValueChange={(value) => {
                  setSchoolFormData({ ...schoolFormData, project: value, board: '' });
                  // Real-time validation
                  const error = validateSchoolProject(value);
                  setSchoolValidationErrors(prev => ({ ...prev, project: error }));
                }}
                disabled={!schoolFormData.city}
              >
                <SelectTrigger id="edit-school-project" className={schoolValidationErrors.project ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={schoolFormData.city ? "Select a project" : "Select city first"} />
                </SelectTrigger>
                <SelectContent>
                  {allProjects
                    .filter(project => project.city_id === schoolFormData.city && project.region_id === schoolFormData.region && project.country_id === schoolFormData.country)
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {schoolValidationErrors.project && (
                <p className="text-sm text-red-500">{schoolValidationErrors.project}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-board" className={schoolValidationErrors.board ? 'text-red-500' : ''}>Board *</Label>
              <Select
                value={schoolFormData.board}
                onValueChange={(value) => {
                  setSchoolFormData({ ...schoolFormData, board: value });
                  // Real-time validation
                  const error = validateSchoolBoard(value);
                  setSchoolValidationErrors(prev => ({ ...prev, board: error }));
                }}
                disabled={!schoolFormData.project}
              >
                <SelectTrigger id="edit-school-board" className={schoolValidationErrors.board ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={schoolFormData.project ? "Select a board" : "Select project first"} />
                </SelectTrigger>
                <SelectContent>
                  {allBoards
                    .filter(board => board.project_id === schoolFormData.project)
                    .map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {schoolValidationErrors.board && (
                <p className="text-sm text-red-500">{schoolValidationErrors.board}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-phone" className={schoolValidationErrors.phone ? 'text-red-500' : ''}>Phone</Label>
              <Input
                id="edit-school-phone"
                value={schoolFormData.phone}
                onChange={(e) => {
                  const value = e.target.value;
                  setSchoolFormData({ ...schoolFormData, phone: value });
                  // Real-time validation
                  const error = validateSchoolPhone(value);
                  setSchoolValidationErrors(prev => ({ ...prev, phone: error }));
                }}
                placeholder="e.g., +92-42-1234567"
                className={schoolValidationErrors.phone ? 'border-red-500 focus:border-red-500' : ''}
              />
              {schoolValidationErrors.phone && (
                <p className="text-sm text-red-500">{schoolValidationErrors.phone}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-email" className={schoolValidationErrors.email ? 'text-red-500' : ''}>Email</Label>
              <Input
                id="edit-school-email"
                type="email"
                value={schoolFormData.email}
                onChange={(e) => {
                  const value = e.target.value;
                  setSchoolFormData({ ...schoolFormData, email: value });
                  // Real-time validation
                  const error = validateSchoolEmail(value);
                  setSchoolValidationErrors(prev => ({ ...prev, email: error }));
                }}
                placeholder="e.g., info@school.edu.pk"
                className={schoolValidationErrors.email ? 'border-red-500 focus:border-red-500' : ''}
              />
              {schoolValidationErrors.email && (
                <p className="text-sm text-red-500">{schoolValidationErrors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school-website" className={schoolValidationErrors.website ? 'text-red-500' : ''}>Website</Label>
              <Input
                id="edit-school-website"
                value={schoolFormData.website}
                onChange={(e) => {
                  const value = e.target.value;
                  setSchoolFormData({ ...schoolFormData, website: value });
                  // Real-time validation
                  const error = validateSchoolWebsite(value);
                  setSchoolValidationErrors(prev => ({ ...prev, website: error }));
                }}
                placeholder="e.g., https://www.school.edu.pk"
                className={schoolValidationErrors.website ? 'border-red-500 focus:border-red-500' : ''}
              />
              {schoolValidationErrors.website && (
                <p className="text-sm text-red-500">{schoolValidationErrors.website}</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-school-address" className={schoolValidationErrors.address ? 'text-red-500' : ''}>Address *</Label>
              <Textarea
                id="edit-school-address"
                value={schoolFormData.address}
                onChange={(e) => {
                  const value = e.target.value;
                  setSchoolFormData({ ...schoolFormData, address: value });
                  // Real-time validation
                  const error = validateSchoolAddress(value);
                  setSchoolValidationErrors(prev => ({ ...prev, address: error }));
                }}
                placeholder="Full address of the school..."
                rows={3}
                className={schoolValidationErrors.address ? 'border-red-500 focus:border-red-500' : ''}
              />
              {schoolValidationErrors.address && (
                <p className="text-sm text-red-500">{schoolValidationErrors.address}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {schoolFormData.address.length}/200 characters
              </p>
            </div>
          </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setIsSchoolEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSchoolEdit} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={schoolsLoading || !!schoolValidationErrors.name || !!schoolValidationErrors.code || !!schoolValidationErrors.type || !!schoolValidationErrors.address || !!schoolValidationErrors.country || !!schoolValidationErrors.region || !!schoolValidationErrors.city || !!schoolValidationErrors.project || !!schoolValidationErrors.board || !!schoolValidationErrors.phone || !!schoolValidationErrors.email || !!schoolValidationErrors.website}
            >
              {schoolsLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update School'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View School Dialog */}
      <Dialog open={isSchoolViewDialogOpen} onOpenChange={setIsSchoolViewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>School Details</DialogTitle>
            <DialogDescription>
              View detailed information about {viewingSchool?.name}.
            </DialogDescription>
          </DialogHeader>
          {viewingSchool && (
            <div className="flex-1 overflow-y-auto pr-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
              <div className="space-y-6 py-4 px-2">
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
            </div>
          )}
          <DialogFooter className="flex-shrink-0">
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