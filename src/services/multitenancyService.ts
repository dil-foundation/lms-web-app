import { supabase } from '@/integrations/supabase/client';

// =====================================================
// INTERFACES
// =====================================================

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface Country {
  id: string;
  name: string;
  code: string;
  description: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface Region {
  id: string;
  name: string;
  code: string;
  country_id: string;
  country?: Country;
  description: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface City {
  id: string;
  name: string;
  code: string;
  country_id: string;
  region_id: string;
  country?: Country;
  region?: Region;
  description: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  country_id: string;
  region_id: string;
  city_id: string;
  country?: Country;
  region?: Region;
  city?: City;
  description: string;
  status: 'active' | 'inactive' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  budget?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface Board {
  id: string;
  name: string;
  code: string;
  country_id: string;
  region_id: string;
  city_id: string;
  project_id: string;
  country?: Country;
  region?: Region;
  city?: City;
  project?: Project;
  description: string;
  board_type: 'educational' | 'examination' | 'certification' | 'accreditation';
  website?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface School {
  id: string;
  name: string;
  code: string;
  school_type: 'Private' | 'Public' | 'International' | 'Charter' | 'Religious';
  country_id: string;
  region_id: string;
  city_id: string;
  project_id: string;
  board_id: string;
  country?: Country;
  region?: Region;
  city?: City;
  project?: Project;
  board?: Board;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  principal_name?: string;
  principal_email?: string;
  principal_phone?: string;
  established_year?: number;
  total_students: number;
  total_teachers: number;
  total_classes: number;
  facilities?: string[];
  curriculum?: string[];
  languages_offered?: string[];
  status: 'active' | 'inactive' | 'suspended' | 'closed';
  accreditation_status: 'pending' | 'accredited' | 'expired' | 'suspended';
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// =====================================================
// INSERT INTERFACES
// =====================================================

export interface CountryInsert {
  name: string;
  code: string;
  description?: string;
}

export interface RegionInsert {
  name: string;
  code: string;
  country_id: string;
  description?: string;
}

export interface CityInsert {
  name: string;
  code: string;
  country_id: string;
  region_id: string;
  description?: string;
}

export interface ProjectInsert {
  name: string;
  code: string;
  country_id: string;
  region_id: string;
  city_id: string;
  description?: string;
  status?: 'active' | 'inactive' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  budget?: number;
}

export interface BoardInsert {
  name: string;
  code: string;
  country_id: string;
  region_id: string;
  city_id: string;
  project_id: string;
  description?: string;
  board_type?: 'educational' | 'examination' | 'certification' | 'accreditation';
  website?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface SchoolInsert {
  name: string;
  code: string;
  school_type: 'Private' | 'Public' | 'International' | 'Charter' | 'Religious';
  country_id: string;
  region_id: string;
  city_id: string;
  project_id: string;
  board_id: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  principal_name?: string;
  principal_email?: string;
  principal_phone?: string;
  established_year?: number;
  total_students?: number;
  total_teachers?: number;
  total_classes?: number;
  facilities?: string[];
  curriculum?: string[];
  languages_offered?: string[];
  status?: 'active' | 'inactive' | 'suspended' | 'closed';
  accreditation_status?: 'pending' | 'accredited' | 'expired' | 'suspended';
}

// =====================================================
// COUNTRIES SERVICE
// =====================================================

export class MultitenancyService {
  // Get all countries
  static async getCountries(): Promise<Country[]> {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching countries:', error);
        throw new Error(`Failed to fetch countries: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCountries:', error);
      throw error;
    }
  }

  // Get countries with pagination
  static async getCountriesPaginated(params: PaginationParams): Promise<PaginatedResponse<Country>> {
    try {
      const { page, limit, sortBy = 'name', sortOrder = 'asc' } = params;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Get total count
      const { count, error: countError } = await supabase
        .from('countries')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error fetching countries count:', countError);
        throw new Error(`Failed to fetch countries count: ${countError.message}`);
      }

      // Get paginated data
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) {
        console.error('Error fetching countries:', error);
        throw new Error(`Failed to fetch countries: ${error.message}`);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getCountriesPaginated:', error);
      throw error;
    }
  }

  // Get country by ID
  static async getCountryById(id: string): Promise<Country | null> {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching country:', error);
        throw new Error(`Failed to fetch country: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in getCountryById:', error);
      throw error;
    }
  }

  // Create new country
  static async createCountry(countryData: CountryInsert): Promise<Country> {
    try {
      const { data, error } = await supabase
        .from('countries')
        .insert([countryData])
        .select()
        .single();

      if (error) {
        console.error('Error creating country:', error);
        throw new Error(`Failed to create country: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createCountry:', error);
      throw error;
    }
  }

  // Update country
  static async updateCountry(id: string, updates: Partial<CountryInsert>): Promise<Country> {
    try {
      const { data, error } = await supabase
        .from('countries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating country:', error);
        throw new Error(`Failed to update country: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateCountry:', error);
      throw error;
    }
  }

  // Delete country
  static async deleteCountry(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('countries')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting country:', error);
        throw new Error(`Failed to delete country: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteCountry:', error);
      throw error;
    }
  }

  // Search countries
  static async searchCountries(searchTerm: string): Promise<Country[]> {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error searching countries:', error);
        throw new Error(`Failed to search countries: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchCountries:', error);
      throw error;
    }
  }

  // Search countries with pagination
  static async searchCountriesPaginated(searchTerm: string, params: PaginationParams): Promise<PaginatedResponse<Country>> {
    try {
      const { page, limit, sortBy = 'name', sortOrder = 'asc' } = params;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Get total count for search
      const { count, error: countError } = await supabase
        .from('countries')
        .select('*', { count: 'exact', head: true })
        .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);

      if (countError) {
        console.error('Error fetching search count:', countError);
        throw new Error(`Failed to fetch search count: ${countError.message}`);
      }

      // Get paginated search results
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) {
        console.error('Error searching countries:', error);
        throw new Error(`Failed to search countries: ${error.message}`);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in searchCountriesPaginated:', error);
      throw error;
    }
  }

  // Get countries with statistics
  static async getCountriesWithStats(): Promise<{
    countries: Country[];
    totalCountries: number;
    countriesWithDescription: number;
    recentUpdates: number;
  }> {
    try {
      const countries = await this.getCountries();
      
      const totalCountries = countries.length;
      const countriesWithDescription = countries.filter(c => c.description && c.description.trim() !== '').length;
      
      // Count countries updated in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentUpdates = countries.filter(c => {
        const updateDate = new Date(c.updated_at);
        return updateDate >= sevenDaysAgo;
      }).length;

      return {
        countries,
        totalCountries,
        countriesWithDescription,
        recentUpdates
      };
    } catch (error) {
      console.error('Error in getCountriesWithStats:', error);
      throw error;
    }
  }

  // =====================================================
  // REGIONS SERVICE
  // =====================================================

  // Get all regions
  static async getRegions(): Promise<Region[]> {
    try {
      const { data, error } = await supabase
        .from('regions')
        .select(`
          *,
          country:countries(*)
        `)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching regions:', error);
        throw new Error(`Failed to fetch regions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRegions:', error);
      throw error;
    }
  }

  // Get regions by country
  static async getRegionsByCountry(countryId: string): Promise<Region[]> {
    try {
      const { data, error } = await supabase
        .from('regions')
        .select(`
          *,
          country:countries(*)
        `)
        .eq('country_id', countryId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching regions by country:', error);
        throw new Error(`Failed to fetch regions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRegionsByCountry:', error);
      throw error;
    }
  }

  // Create new region
  static async createRegion(regionData: RegionInsert): Promise<Region> {
    try {
      const { data, error } = await supabase
        .from('regions')
        .insert([regionData])
        .select(`
          *,
          country:countries(*)
        `)
        .single();

      if (error) {
        console.error('Error creating region:', error);
        throw new Error(`Failed to create region: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createRegion:', error);
      throw error;
    }
  }

  // Update region
  static async updateRegion(id: string, updates: Partial<RegionInsert>): Promise<Region> {
    try {
      const { data, error } = await supabase
        .from('regions')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          country:countries(*)
        `)
        .single();

      if (error) {
        console.error('Error updating region:', error);
        throw new Error(`Failed to update region: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateRegion:', error);
      throw error;
    }
  }

  // Delete region
  static async deleteRegion(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('regions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting region:', error);
        throw new Error(`Failed to delete region: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteRegion:', error);
      throw error;
    }
  }

  // Get regions with pagination
  static async getRegionsPaginated(params: PaginationParams): Promise<PaginatedResponse<Region>> {
    try {
      const { page, limit, sortBy = 'name', sortOrder = 'asc' } = params;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Get total count
      const { count, error: countError } = await supabase
        .from('regions')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error fetching regions count:', countError);
        throw new Error(`Failed to fetch regions count: ${countError.message}`);
      }

      // Get paginated data
      const { data, error } = await supabase
        .from('regions')
        .select(`
          *,
          country:countries(*)
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) {
        console.error('Error fetching regions:', error);
        throw new Error(`Failed to fetch regions: ${error.message}`);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getRegionsPaginated:', error);
      throw error;
    }
  }

  // Search regions with pagination
  static async searchRegionsPaginated(searchTerm: string, params: PaginationParams): Promise<PaginatedResponse<Region>> {
    try {
      const { page, limit, sortBy = 'name', sortOrder = 'asc' } = params;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Get total count for search
      const { count, error: countError } = await supabase
        .from('regions')
        .select('*', { count: 'exact', head: true })
        .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);

      if (countError) {
        console.error('Error fetching search count:', countError);
        throw new Error(`Failed to fetch search count: ${countError.message}`);
      }

      // Get paginated search results
      const { data, error } = await supabase
        .from('regions')
        .select(`
          *,
          country:countries(*)
        `)
        .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) {
        console.error('Error searching regions:', error);
        throw new Error(`Failed to search regions: ${error.message}`);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in searchRegionsPaginated:', error);
      throw error;
    }
  }

  // =====================================================
  // CITIES SERVICE
  // =====================================================

  // Get all cities
  static async getCities(): Promise<City[]> {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select(`
          *,
          country:countries(*),
          region:regions(*)
        `)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching cities:', error);
        throw new Error(`Failed to fetch cities: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCities:', error);
      throw error;
    }
  }

  // Get cities by region
  static async getCitiesByRegion(regionId: string): Promise<City[]> {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select(`
          *,
          country:countries(*),
          region:regions(*)
        `)
        .eq('region_id', regionId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching cities by region:', error);
        throw new Error(`Failed to fetch cities: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCitiesByRegion:', error);
      throw error;
    }
  }

  // Create new city
  static async createCity(cityData: CityInsert): Promise<City> {
    try {
      const { data, error } = await supabase
        .from('cities')
        .insert([cityData])
        .select(`
          *,
          country:countries(*),
          region:regions(*)
        `)
        .single();

      if (error) {
        console.error('Error creating city:', error);
        throw new Error(`Failed to create city: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createCity:', error);
      throw error;
    }
  }

  // Update city
  static async updateCity(id: string, updates: Partial<CityInsert>): Promise<City> {
    try {
      const { data, error } = await supabase
        .from('cities')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          country:countries(*),
          region:regions(*)
        `)
        .single();

      if (error) {
        console.error('Error updating city:', error);
        throw new Error(`Failed to update city: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateCity:', error);
      throw error;
    }
  }

  // Delete city
  static async deleteCity(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('cities')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting city:', error);
        throw new Error(`Failed to delete city: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteCity:', error);
      throw error;
    }
  }

  // Get cities with pagination
  static async getCitiesPaginated(params: PaginationParams): Promise<PaginatedResponse<City>> {
    try {
      const { page, limit, sortBy = 'name', sortOrder = 'asc' } = params;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Get total count
      const { count, error: countError } = await supabase
        .from('cities')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error fetching cities count:', countError);
        throw new Error(`Failed to fetch cities count: ${countError.message}`);
      }

      // Get paginated data
      const { data, error } = await supabase
        .from('cities')
        .select(`
          *,
          country:countries(*),
          region:regions(*)
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) {
        console.error('Error fetching cities:', error);
        throw new Error(`Failed to fetch cities: ${error.message}`);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getCitiesPaginated:', error);
      throw error;
    }
  }

  // Search cities with pagination
  static async searchCitiesPaginated(searchTerm: string, params: PaginationParams): Promise<PaginatedResponse<City>> {
    try {
      const { page, limit, sortBy = 'name', sortOrder = 'asc' } = params;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Get total count for search
      const { count, error: countError } = await supabase
        .from('cities')
        .select('*', { count: 'exact', head: true })
        .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);

      if (countError) {
        console.error('Error fetching search count:', countError);
        throw new Error(`Failed to fetch search count: ${countError.message}`);
      }

      // Get paginated search results
      const { data, error } = await supabase
        .from('cities')
        .select(`
          *,
          country:countries(*),
          region:regions(*)
        `)
        .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) {
        console.error('Error searching cities:', error);
        throw new Error(`Failed to search cities: ${error.message}`);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in searchCitiesPaginated:', error);
      throw error;
    }
  }

  // =====================================================
  // PROJECTS SERVICE
  // =====================================================

  // Get all projects
  static async getProjects(): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          country:countries(*),
          region:regions(*),
          city:cities(*)
        `)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching projects:', error);
        throw new Error(`Failed to fetch projects: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProjects:', error);
      throw error;
    }
  }

  // Create new project
  static async createProject(projectData: ProjectInsert): Promise<Project> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select(`
          *,
          country:countries(*),
          region:regions(*),
          city:cities(*)
        `)
        .single();

      if (error) {
        console.error('Error creating project:', error);
        throw new Error(`Failed to create project: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createProject:', error);
      throw error;
    }
  }

  // Update project
  static async updateProject(id: string, updates: Partial<ProjectInsert>): Promise<Project> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          country:countries(*),
          region:regions(*),
          city:cities(*)
        `)
        .single();

      if (error) {
        console.error('Error updating project:', error);
        throw new Error(`Failed to update project: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateProject:', error);
      throw error;
    }
  }

  // Delete project
  static async deleteProject(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting project:', error);
        throw new Error(`Failed to delete project: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteProject:', error);
      throw error;
    }
  }

  // Get projects with pagination
  static async getProjectsPaginated(params: PaginationParams): Promise<PaginatedResponse<Project>> {
    try {
      const { page, limit, sortBy = 'name', sortOrder = 'asc' } = params;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Get total count
      const { count, error: countError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error fetching projects count:', countError);
        throw new Error(`Failed to fetch projects count: ${countError.message}`);
      }

      // Get paginated data
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          country:countries(*),
          region:regions(*),
          city:cities(*)
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) {
        console.error('Error fetching projects:', error);
        throw new Error(`Failed to fetch projects: ${error.message}`);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getProjectsPaginated:', error);
      throw error;
    }
  }

  // Search projects with pagination
  static async searchProjectsPaginated(searchTerm: string, params: PaginationParams): Promise<PaginatedResponse<Project>> {
    try {
      const { page, limit, sortBy = 'name', sortOrder = 'asc' } = params;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Get total count for search
      const { count, error: countError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);

      if (countError) {
        console.error('Error fetching search count:', countError);
        throw new Error(`Failed to fetch search count: ${countError.message}`);
      }

      // Get paginated search results
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          country:countries(*),
          region:regions(*),
          city:cities(*)
        `)
        .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) {
        console.error('Error searching projects:', error);
        throw new Error(`Failed to search projects: ${error.message}`);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in searchProjectsPaginated:', error);
      throw error;
    }
  }

  // =====================================================
  // BOARDS SERVICE
  // =====================================================

  // Get all boards
  static async getBoards(): Promise<Board[]> {
    try {
      const { data, error } = await supabase
        .from('boards')
        .select(`
          *,
          country:countries(*),
          region:regions(*),
          city:cities(*),
          project:projects(*)
        `)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching boards:', error);
        throw new Error(`Failed to fetch boards: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getBoards:', error);
      throw error;
    }
  }

  // Create new board
  static async createBoard(boardData: BoardInsert): Promise<Board> {
    try {
      const { data, error } = await supabase
        .from('boards')
        .insert([boardData])
        .select(`
          *,
          country:countries(*),
          region:regions(*),
          city:cities(*),
          project:projects(*)
        `)
        .single();

      if (error) {
        console.error('Error creating board:', error);
        throw new Error(`Failed to create board: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createBoard:', error);
      throw error;
    }
  }

  // Update board
  static async updateBoard(id: string, updates: Partial<BoardInsert>): Promise<Board> {
    try {
      const { data, error } = await supabase
        .from('boards')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          country:countries(*),
          region:regions(*),
          city:cities(*),
          project:projects(*)
        `)
        .single();

      if (error) {
        console.error('Error updating board:', error);
        throw new Error(`Failed to update board: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateBoard:', error);
      throw error;
    }
  }

  // Delete board
  static async deleteBoard(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting board:', error);
        throw new Error(`Failed to delete board: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteBoard:', error);
      throw error;
    }
  }

  // Get boards with pagination
  static async getBoardsPaginated(params: PaginationParams): Promise<PaginatedResponse<Board>> {
    try {
      const { page, limit, sortBy = 'name', sortOrder = 'asc' } = params;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Get total count
      const { count, error: countError } = await supabase
        .from('boards')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error fetching boards count:', countError);
        throw new Error(`Failed to fetch boards count: ${countError.message}`);
      }

      // Get paginated data
      const { data, error } = await supabase
        .from('boards')
        .select(`
          *,
          country:countries(*),
          region:regions(*),
          city:cities(*),
          project:projects(*)
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) {
        console.error('Error fetching boards:', error);
        throw new Error(`Failed to fetch boards: ${error.message}`);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getBoardsPaginated:', error);
      throw error;
    }
  }

  // Search boards with pagination
  static async searchBoardsPaginated(searchTerm: string, params: PaginationParams): Promise<PaginatedResponse<Board>> {
    try {
      const { page, limit, sortBy = 'name', sortOrder = 'asc' } = params;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Get total count for search
      const { count, error: countError } = await supabase
        .from('boards')
        .select('*', { count: 'exact', head: true })
        .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);

      if (countError) {
        console.error('Error fetching search count:', countError);
        throw new Error(`Failed to fetch search count: ${countError.message}`);
      }

      // Get paginated search results
      const { data, error } = await supabase
        .from('boards')
        .select(`
          *,
          country:countries(*),
          region:regions(*),
          city:cities(*),
          project:projects(*)
        `)
        .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) {
        console.error('Error searching boards:', error);
        throw new Error(`Failed to search boards: ${error.message}`);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in searchBoardsPaginated:', error);
      throw error;
    }
  }

  // =====================================================
  // SCHOOLS SERVICE
  // =====================================================

  // Get all schools
  static async getSchools(): Promise<School[]> {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select(`
          *,
          country:countries(*),
          region:regions(*),
          city:cities(*),
          project:projects(*),
          board:boards(*)
        `)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching schools:', error);
        throw new Error(`Failed to fetch schools: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSchools:', error);
      throw error;
    }
  }

  // Create new school
  static async createSchool(schoolData: SchoolInsert): Promise<School> {
    try {
      const { data, error } = await supabase
        .from('schools')
        .insert([schoolData])
        .select(`
          *,
          country:countries(*),
          region:regions(*),
          city:cities(*),
          project:projects(*),
          board:boards(*)
        `)
        .single();

      if (error) {
        console.error('Error creating school:', error);
        throw new Error(`Failed to create school: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createSchool:', error);
      throw error;
    }
  }

  // Update school
  static async updateSchool(id: string, updates: Partial<SchoolInsert>): Promise<School> {
    try {
      const { data, error } = await supabase
        .from('schools')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          country:countries(*),
          region:regions(*),
          city:cities(*),
          project:projects(*),
          board:boards(*)
        `)
        .single();

      if (error) {
        console.error('Error updating school:', error);
        throw new Error(`Failed to update school: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateSchool:', error);
      throw error;
    }
  }

  // Delete school
  static async deleteSchool(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting school:', error);
        throw new Error(`Failed to delete school: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteSchool:', error);
      throw error;
    }
  }

  // Get schools with pagination
  static async getSchoolsPaginated(params: PaginationParams): Promise<PaginatedResponse<School>> {
    try {
      const { page, limit, sortBy = 'name', sortOrder = 'asc' } = params;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Get total count
      const { count, error: countError } = await supabase
        .from('schools')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error fetching schools count:', countError);
        throw new Error(`Failed to fetch schools count: ${countError.message}`);
      }

      // Get paginated data
      const { data, error } = await supabase
        .from('schools')
        .select(`
          *,
          country:countries(*),
          region:regions(*),
          city:cities(*),
          project:projects(*),
          board:boards(*)
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) {
        console.error('Error fetching schools:', error);
        throw new Error(`Failed to fetch schools: ${error.message}`);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getSchoolsPaginated:', error);
      throw error;
    }
  }

  // Search schools with pagination
  static async searchSchoolsPaginated(searchTerm: string, params: PaginationParams): Promise<PaginatedResponse<School>> {
    try {
      const { page, limit, sortBy = 'name', sortOrder = 'asc' } = params;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Get total count for search
      const { count, error: countError } = await supabase
        .from('schools')
        .select('*', { count: 'exact', head: true })
        .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);

      if (countError) {
        console.error('Error fetching search count:', countError);
        throw new Error(`Failed to fetch search count: ${countError.message}`);
      }

      // Get paginated search results
      const { data, error } = await supabase
        .from('schools')
        .select(`
          *,
          country:countries(*),
          region:regions(*),
          city:cities(*),
          project:projects(*),
          board:boards(*)
        `)
        .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) {
        console.error('Error searching schools:', error);
        throw new Error(`Failed to search schools: ${error.message}`);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in searchSchoolsPaginated:', error);
      throw error;
    }
  }

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  // Get hierarchy statistics
  static async getHierarchyStatistics(): Promise<{
    totalCountries: number;
    totalRegions: number;
    totalCities: number;
    totalProjects: number;
    totalBoards: number;
    totalSchools: number;
    totalStudents: number;
    totalTeachers: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_hierarchy_statistics');

      if (error) {
        console.error('Error fetching hierarchy statistics:', error);
        throw new Error(`Failed to fetch statistics: ${error.message}`);
      }

      return data || {
        totalCountries: 0,
        totalRegions: 0,
        totalCities: 0,
        totalProjects: 0,
        totalBoards: 0,
        totalSchools: 0,
        totalStudents: 0,
        totalTeachers: 0
      };
    } catch (error) {
      console.error('Error in getHierarchyStatistics:', error);
      throw error;
    }
  }

  // Get schools by location
  static async getSchoolsByLocation(
    countryCode?: string,
    regionCode?: string,
    cityCode?: string
  ): Promise<School[]> {
    try {
      const { data, error } = await supabase.rpc('get_schools_by_location', {
        p_country_code: countryCode,
        p_region_code: regionCode,
        p_city_code: cityCode
      });

      if (error) {
        console.error('Error fetching schools by location:', error);
        throw new Error(`Failed to fetch schools: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSchoolsByLocation:', error);
      throw error;
    }
  }
}
