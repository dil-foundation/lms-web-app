import { supabase } from '@/integrations/supabase/client';

export interface CourseCategory {
  id: number;
  name: string;
  created_at: string;
}

export interface CreateCourseCategoryData {
  name: string;
}

export interface UpdateCourseCategoryData {
  name: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SearchParams {
  searchTerm?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class CourseCategoriesService {
  /**
   * Get all course categories (deprecated - use getCategoriesPaginated)
   */
  static async getCategories(): Promise<CourseCategory[]> {
    try {
      const { data, error } = await supabase
        .from('course_categories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching course categories:', error);
        throw new Error(`Failed to fetch course categories: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCategories:', error);
      throw error;
    }
  }

  /**
   * Get course categories with pagination and search
   */
  static async getCategoriesPaginated(
    pagination: PaginationParams,
    search?: SearchParams
  ): Promise<PaginatedResponse<CourseCategory>> {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('course_categories')
        .select('*', { count: 'exact' });

      // Apply search filter if provided
      if (search?.searchTerm && search.searchTerm.trim()) {
        query = query.ilike('name', `%${search.searchTerm.trim()}%`);
      }

      // Apply pagination and ordering
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching paginated course categories:', error);
        throw new Error(`Failed to fetch course categories: ${error.message}`);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      console.error('Error in getCategoriesPaginated:', error);
      throw error;
    }
  }

  /**
   * Get a single course category by ID
   */
  static async getCategoryById(id: number): Promise<CourseCategory | null> {
    try {
      const { data, error } = await supabase
        .from('course_categories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        console.error('Error fetching course category:', error);
        throw new Error(`Failed to fetch course category: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in getCategoryById:', error);
      throw error;
    }
  }

  /**
   * Create a new course category
   */
  static async createCategory(categoryData: CreateCourseCategoryData): Promise<CourseCategory> {
    try {
      const { data, error } = await supabase
        .from('course_categories')
        .insert([categoryData])
        .select()
        .single();

      if (error) {
        console.error('Error creating course category:', error);
        
        // Handle unique constraint violation
        if (error.code === '23505') {
          throw new Error('A category with this name already exists');
        }
        
        throw new Error(`Failed to create course category: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createCategory:', error);
      throw error;
    }
  }

  /**
   * Update an existing course category
   */
  static async updateCategory(id: number, categoryData: UpdateCourseCategoryData): Promise<CourseCategory> {
    try {
      const { data, error } = await supabase
        .from('course_categories')
        .update(categoryData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating course category:', error);
        
        // Handle unique constraint violation
        if (error.code === '23505') {
          throw new Error('A category with this name already exists');
        }
        
        throw new Error(`Failed to update course category: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateCategory:', error);
      throw error;
    }
  }

  /**
   * Delete a course category
   */
  static async deleteCategory(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('course_categories')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting course category:', error);
        throw new Error(`Failed to delete course category: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteCategory:', error);
      throw error;
    }
  }


  /**
   * Get course count for a category (if courses table exists)
   */
  static async getCourseCountForCategory(categoryId: number): Promise<number> {
    try {
      // This assumes there's a courses table with category_id foreign key
      // Adjust the table name and column names based on your actual schema
      const { count, error } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId);

      if (error) {
        console.error('Error getting course count:', error);
        return 0; // Return 0 if there's an error or table doesn't exist
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getCourseCountForCategory:', error);
      return 0;
    }
  }
}
