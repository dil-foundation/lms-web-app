import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  MultitenancyService, 
  Country, 
  Region, 
  City, 
  Project, 
  Board, 
  School,
  CountryInsert,
  RegionInsert,
  CityInsert,
  ProjectInsert,
  BoardInsert,
  SchoolInsert,
  PaginationParams,
  PaginatedResponse
} from '@/services/multitenancyService';

// =====================================================
// COUNTRIES HOOK
// =====================================================

export const useCountries = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [isSearchMode, setIsSearchMode] = useState(false);

  const fetchCountries = useCallback(async (params?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);
      setIsSearchMode(false);
      
      const paginationParams = params || { page: 1, limit: 5 };
      const response = await MultitenancyService.getCountriesPaginated(paginationParams);
      
      setCountries(response.data);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch countries';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCountry = useCallback(async (countryData: CountryInsert) => {
    try {
      setError(null);
      const newCountry = await MultitenancyService.createCountry(countryData);
      
      // Refresh the current page to show the new country
      await fetchCountries({ page: pagination.page, limit: pagination.limit });
      
      toast.success('Country created successfully');
      return newCountry;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create country';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, fetchCountries]);

  const updateCountry = useCallback(async (id: string, updates: Partial<CountryInsert>) => {
    try {
      setError(null);
      const updatedCountry = await MultitenancyService.updateCountry(id, updates);
      
      // Refresh the current page to show the updated country
      await fetchCountries({ page: pagination.page, limit: pagination.limit });
      
      toast.success('Country updated successfully');
      return updatedCountry;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update country';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, fetchCountries]);

  const deleteCountry = useCallback(async (id: string) => {
    try {
      setError(null);
      await MultitenancyService.deleteCountry(id);
      
      // Refresh the current page to show updated data
      await fetchCountries({ page: pagination.page, limit: pagination.limit });
      
      toast.success('Country deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete country';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, fetchCountries]);

  const searchCountries = useCallback(async (searchTerm: string, params?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);
      setIsSearchMode(true);
      
      const paginationParams = params || { page: 1, limit: 5 };
      const response = await MultitenancyService.searchCountriesPaginated(searchTerm, paginationParams);
      
      setCountries(response.data);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search countries';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getCountriesWithStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await MultitenancyService.getCountriesWithStats();
      setCountries(data.countries);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch countries statistics';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Pagination control functions
  const goToPage = useCallback(async (page: number) => {
    if (isSearchMode) {
      // If in search mode, we need the search term - this should be handled by the component
      return;
    }
    await fetchCountries({ page, limit: pagination.limit });
  }, [isSearchMode, pagination.limit, fetchCountries]);

  const changePageSize = useCallback(async (limit: number) => {
    if (isSearchMode) {
      // If in search mode, we need the search term - this should be handled by the component
      return;
    }
    await fetchCountries({ page: 1, limit });
  }, [isSearchMode, fetchCountries]);

  const nextPage = useCallback(async () => {
    if (pagination.hasNext) {
      await goToPage(pagination.page + 1);
    }
  }, [pagination.hasNext, pagination.page, goToPage]);

  const prevPage = useCallback(async () => {
    if (pagination.hasPrev) {
      await goToPage(pagination.page - 1);
    }
  }, [pagination.hasPrev, pagination.page, goToPage]);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  return {
    countries,
    loading,
    error,
    pagination,
    isSearchMode,
    fetchCountries,
    createCountry,
    updateCountry,
    deleteCountry,
    searchCountries,
    getCountriesWithStats,
    goToPage,
    changePageSize,
    nextPage,
    prevPage
  };
};

// =====================================================
// REGIONS HOOK
// =====================================================

export const useRegions = () => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [isSearchMode, setIsSearchMode] = useState(false);

  const fetchRegions = useCallback(async (params?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);
      setIsSearchMode(false);
      
      const paginationParams = params || { page: 1, limit: 5 };
      const response = await MultitenancyService.getRegionsPaginated(paginationParams);
      
      setRegions(response.data);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch regions';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRegion = useCallback(async (regionData: RegionInsert) => {
    try {
      setError(null);
      const newRegion = await MultitenancyService.createRegion(regionData);
      
      // Refresh the current page to show the new region
      await fetchRegions({ page: pagination.page, limit: pagination.limit });
      
      toast.success('Region created successfully');
      return newRegion;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create region';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, fetchRegions]);

  const updateRegion = useCallback(async (id: string, updates: Partial<RegionInsert>) => {
    try {
      setError(null);
      const updatedRegion = await MultitenancyService.updateRegion(id, updates);
      
      // Refresh the current page to show the updated region
      await fetchRegions({ page: pagination.page, limit: pagination.limit });
      
      toast.success('Region updated successfully');
      return updatedRegion;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update region';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, fetchRegions]);

  const deleteRegion = useCallback(async (id: string) => {
    try {
      setError(null);
      await MultitenancyService.deleteRegion(id);
      
      // Refresh the current page to show updated data
      await fetchRegions({ page: pagination.page, limit: pagination.limit });
      
      toast.success('Region deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete region';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, fetchRegions]);

  const searchRegions = useCallback(async (searchTerm: string, params?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);
      setIsSearchMode(true);
      
      const paginationParams = params || { page: 1, limit: 5 };
      const response = await MultitenancyService.searchRegionsPaginated(searchTerm, paginationParams);
      
      setRegions(response.data);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search regions';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getRegionsByCountry = useCallback(async (countryId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await MultitenancyService.getRegionsByCountry(countryId);
      setRegions(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch regions';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Pagination control functions
  const goToPage = useCallback(async (page: number) => {
    if (isSearchMode) {
      // If in search mode, we need the search term - this should be handled by the component
      return;
    }
    await fetchRegions({ page, limit: pagination.limit });
  }, [isSearchMode, pagination.limit, fetchRegions]);

  const changePageSize = useCallback(async (limit: number) => {
    if (isSearchMode) {
      // If in search mode, we need the search term - this should be handled by the component
      return;
    }
    await fetchRegions({ page: 1, limit });
  }, [isSearchMode, fetchRegions]);

  const nextPage = useCallback(async () => {
    if (pagination.hasNext) {
      await goToPage(pagination.page + 1);
    }
  }, [pagination.hasNext, pagination.page, goToPage]);

  const prevPage = useCallback(async () => {
    if (pagination.hasPrev) {
      await goToPage(pagination.page - 1);
    }
  }, [pagination.hasPrev, pagination.page, goToPage]);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  return {
    regions,
    loading,
    error,
    pagination,
    isSearchMode,
    fetchRegions,
    createRegion,
    updateRegion,
    deleteRegion,
    searchRegions,
    getRegionsByCountry,
    goToPage,
    changePageSize,
    nextPage,
    prevPage
  };
};

// =====================================================
// CITIES HOOK
// =====================================================

export const useCities = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [isSearchMode, setIsSearchMode] = useState(false);

  const fetchCities = useCallback(async (params?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);
      setIsSearchMode(false);
      
      const paginationParams = params || { page: 1, limit: 5 };
      const response = await MultitenancyService.getCitiesPaginated(paginationParams);
      
      setCities(response.data);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch cities';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCity = useCallback(async (cityData: CityInsert) => {
    try {
      setError(null);
      const newCity = await MultitenancyService.createCity(cityData);
      
      // Refresh the current page to show the new city
      await fetchCities({ page: pagination.page, limit: pagination.limit });
      
      toast.success('City created successfully');
      return newCity;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create city';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, fetchCities]);

  const updateCity = useCallback(async (id: string, updates: Partial<CityInsert>) => {
    try {
      setError(null);
      const updatedCity = await MultitenancyService.updateCity(id, updates);
      
      // Refresh the current page to show the updated city
      await fetchCities({ page: pagination.page, limit: pagination.limit });
      
      toast.success('City updated successfully');
      return updatedCity;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update city';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, fetchCities]);

  const deleteCity = useCallback(async (id: string) => {
    try {
      setError(null);
      await MultitenancyService.deleteCity(id);
      
      // Refresh the current page to show updated data
      await fetchCities({ page: pagination.page, limit: pagination.limit });
      
      toast.success('City deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete city';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, fetchCities]);

  const searchCities = useCallback(async (searchTerm: string, params?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);
      setIsSearchMode(true);
      
      const paginationParams = params || { page: 1, limit: 5 };
      const response = await MultitenancyService.searchCitiesPaginated(searchTerm, paginationParams);
      
      setCities(response.data);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search cities';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getCitiesByRegion = useCallback(async (regionId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await MultitenancyService.getCitiesByRegion(regionId);
      setCities(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch cities';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Pagination control functions
  const goToPage = useCallback(async (page: number) => {
    if (isSearchMode) {
      // If in search mode, we need the search term - this should be handled by the component
      return;
    }
    await fetchCities({ page, limit: pagination.limit });
  }, [isSearchMode, pagination.limit, fetchCities]);

  const changePageSize = useCallback(async (limit: number) => {
    if (isSearchMode) {
      // If in search mode, we need the search term - this should be handled by the component
      return;
    }
    await fetchCities({ page: 1, limit });
  }, [isSearchMode, fetchCities]);

  const nextPage = useCallback(async () => {
    if (pagination.hasNext) {
      await goToPage(pagination.page + 1);
    }
  }, [pagination.hasNext, pagination.page, goToPage]);

  const prevPage = useCallback(async () => {
    if (pagination.hasPrev) {
      await goToPage(pagination.page - 1);
    }
  }, [pagination.hasPrev, pagination.page, goToPage]);

  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  return {
    cities,
    loading,
    error,
    pagination,
    isSearchMode,
    fetchCities,
    createCity,
    updateCity,
    deleteCity,
    searchCities,
    getCitiesByRegion,
    goToPage,
    changePageSize,
    nextPage,
    prevPage
  };
};

// =====================================================
// PROJECTS HOOK
// =====================================================

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [isSearchMode, setIsSearchMode] = useState(false);

  const fetchProjects = useCallback(async (params?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);
      setIsSearchMode(false);
      
      const paginationParams = params || { page: 1, limit: 5 };
      const response = await MultitenancyService.getProjectsPaginated(paginationParams);
      
      setProjects(response.data);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (projectData: ProjectInsert) => {
    try {
      setError(null);
      const newProject = await MultitenancyService.createProject(projectData);
      
      // Refresh the current page to show the new project
      await fetchProjects({ page: pagination.page, limit: pagination.limit });
      
      toast.success('Project created successfully');
      return newProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, fetchProjects]);

  const updateProject = useCallback(async (id: string, updates: Partial<ProjectInsert>) => {
    try {
      setError(null);
      const updatedProject = await MultitenancyService.updateProject(id, updates);
      
      // Refresh the current page to show the updated project
      await fetchProjects({ page: pagination.page, limit: pagination.limit });
      
      toast.success('Project updated successfully');
      return updatedProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, fetchProjects]);

  const deleteProject = useCallback(async (id: string) => {
    try {
      setError(null);
      await MultitenancyService.deleteProject(id);
      
      // Refresh the current page to show updated data
      await fetchProjects({ page: pagination.page, limit: pagination.limit });
      
      toast.success('Project deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, fetchProjects]);

  const searchProjects = useCallback(async (searchTerm: string, params?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);
      setIsSearchMode(true);
      
      const paginationParams = params || { page: 1, limit: 5 };
      const response = await MultitenancyService.searchProjectsPaginated(searchTerm, paginationParams);
      
      setProjects(response.data);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search projects';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Pagination control functions
  const goToPage = useCallback(async (page: number) => {
    if (isSearchMode) {
      // If in search mode, we need the search term - this should be handled by the component
      return;
    }
    await fetchProjects({ page, limit: pagination.limit });
  }, [isSearchMode, pagination.limit, fetchProjects]);

  const changePageSize = useCallback(async (limit: number) => {
    if (isSearchMode) {
      // If in search mode, we need the search term - this should be handled by the component
      return;
    }
    await fetchProjects({ page: 1, limit });
  }, [isSearchMode, fetchProjects]);

  const nextPage = useCallback(async () => {
    if (pagination.hasNext) {
      await goToPage(pagination.page + 1);
    }
  }, [pagination.hasNext, pagination.page, goToPage]);

  const prevPage = useCallback(async () => {
    if (pagination.hasPrev) {
      await goToPage(pagination.page - 1);
    }
  }, [pagination.hasPrev, pagination.page, goToPage]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    pagination,
    isSearchMode,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    searchProjects,
    goToPage,
    changePageSize,
    nextPage,
    prevPage
  };
};

// =====================================================
// BOARDS HOOK
// =====================================================

export const useBoards = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [isSearchMode, setIsSearchMode] = useState(false);

  const fetchBoards = useCallback(async (params?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);
      setIsSearchMode(false);
      
      const paginationParams = params || { page: 1, limit: 5 };
      const response = await MultitenancyService.getBoardsPaginated(paginationParams);
      
      setBoards(response.data);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch boards';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const createBoard = useCallback(async (boardData: BoardInsert) => {
    try {
      setError(null);
      const newBoard = await MultitenancyService.createBoard(boardData);
      
      // Refresh the current page to show the new board
      await fetchBoards({ page: pagination.page, limit: pagination.limit });
      
      toast.success('Board created successfully');
      return newBoard;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create board';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, fetchBoards]);

  const updateBoard = useCallback(async (id: string, updates: Partial<BoardInsert>) => {
    try {
      setError(null);
      const updatedBoard = await MultitenancyService.updateBoard(id, updates);
      
      // Refresh the current page to show the updated board
      await fetchBoards({ page: pagination.page, limit: pagination.limit });
      
      toast.success('Board updated successfully');
      return updatedBoard;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update board';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, fetchBoards]);

  const deleteBoard = useCallback(async (id: string) => {
    try {
      setError(null);
      await MultitenancyService.deleteBoard(id);
      
      // Refresh the current page to show updated data
      await fetchBoards({ page: pagination.page, limit: pagination.limit });
      
      toast.success('Board deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete board';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, fetchBoards]);

  const searchBoards = useCallback(async (searchTerm: string, params?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);
      setIsSearchMode(true);
      
      const paginationParams = params || { page: 1, limit: 5 };
      const response = await MultitenancyService.searchBoardsPaginated(searchTerm, paginationParams);
      
      setBoards(response.data);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search boards';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Pagination control functions
  const goToPage = useCallback(async (page: number) => {
    if (isSearchMode) {
      // If in search mode, we need the search term - this should be handled by the component
      return;
    }
    await fetchBoards({ page, limit: pagination.limit });
  }, [isSearchMode, pagination.limit, fetchBoards]);

  const changePageSize = useCallback(async (limit: number) => {
    if (isSearchMode) {
      // If in search mode, we need the search term - this should be handled by the component
      return;
    }
    await fetchBoards({ page: 1, limit });
  }, [isSearchMode, fetchBoards]);

  const nextPage = useCallback(async () => {
    if (pagination.hasNext) {
      await goToPage(pagination.page + 1);
    }
  }, [pagination.hasNext, pagination.page, goToPage]);

  const prevPage = useCallback(async () => {
    if (pagination.hasPrev) {
      await goToPage(pagination.page - 1);
    }
  }, [pagination.hasPrev, pagination.page, goToPage]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  return {
    boards,
    loading,
    error,
    pagination,
    isSearchMode,
    fetchBoards,
    createBoard,
    updateBoard,
    deleteBoard,
    searchBoards,
    goToPage,
    changePageSize,
    nextPage,
    prevPage
  };
};

// =====================================================
// SCHOOLS HOOK
// =====================================================

export const useSchools = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [isSearchMode, setIsSearchMode] = useState(false);

  const fetchSchools = useCallback(async (params?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);
      setIsSearchMode(false);
      
      const paginationParams = params || { page: 1, limit: 5 };
      const response = await MultitenancyService.getSchoolsPaginated(paginationParams);
      
      setSchools(response.data);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch schools';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSchool = useCallback(async (schoolData: SchoolInsert) => {
    try {
      setError(null);
      const newSchool = await MultitenancyService.createSchool(schoolData);
      
      // Refresh the current page to show the new school
      await fetchSchools({ page: pagination.page, limit: pagination.limit });
      
      toast.success('School created successfully');
      return newSchool;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create school';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, fetchSchools]);

  const updateSchool = useCallback(async (id: string, updates: Partial<SchoolInsert>) => {
    try {
      setError(null);
      const updatedSchool = await MultitenancyService.updateSchool(id, updates);
      
      // Refresh the current page to show the updated school
      await fetchSchools({ page: pagination.page, limit: pagination.limit });
      
      toast.success('School updated successfully');
      return updatedSchool;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update school';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, fetchSchools]);

  const deleteSchool = useCallback(async (id: string) => {
    try {
      setError(null);
      await MultitenancyService.deleteSchool(id);
      
      // Refresh the current page to show updated data
      await fetchSchools({ page: pagination.page, limit: pagination.limit });
      
      toast.success('School deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete school';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, fetchSchools]);

  const searchSchools = useCallback(async (searchTerm: string, params?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);
      setIsSearchMode(true);
      
      const paginationParams = params || { page: 1, limit: 5 };
      const response = await MultitenancyService.searchSchoolsPaginated(searchTerm, paginationParams);
      
      setSchools(response.data);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search schools';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Pagination control functions
  const goToPage = useCallback(async (page: number) => {
    if (isSearchMode) {
      // If in search mode, we need the search term - this should be handled by the component
      return;
    }
    await fetchSchools({ page, limit: pagination.limit });
  }, [isSearchMode, pagination.limit, fetchSchools]);

  const changePageSize = useCallback(async (limit: number) => {
    if (isSearchMode) {
      // If in search mode, we need the search term - this should be handled by the component
      return;
    }
    await fetchSchools({ page: 1, limit });
  }, [isSearchMode, fetchSchools]);

  const nextPage = useCallback(async () => {
    if (pagination.hasNext) {
      await goToPage(pagination.page + 1);
    }
  }, [pagination.hasNext, pagination.page, goToPage]);

  const prevPage = useCallback(async () => {
    if (pagination.hasPrev) {
      await goToPage(pagination.page - 1);
    }
  }, [pagination.hasPrev, pagination.page, goToPage]);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  return {
    schools,
    loading,
    error,
    pagination,
    isSearchMode,
    fetchSchools,
    createSchool,
    updateSchool,
    deleteSchool,
    searchSchools,
    goToPage,
    changePageSize,
    nextPage,
    prevPage
  };
};

// =====================================================
// HIERARCHY STATISTICS HOOK
// =====================================================

export const useHierarchyStatistics = () => {
  const [statistics, setStatistics] = useState<{
    totalCountries: number;
    totalRegions: number;
    totalCities: number;
    totalProjects: number;
    totalBoards: number;
    totalSchools: number;
    totalStudents: number;
    totalTeachers: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await MultitenancyService.getHierarchyStatistics();
      setStatistics(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch statistics';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return {
    statistics,
    loading,
    error,
    fetchStatistics
  };
};
