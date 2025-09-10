import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import ClassService, { ClassWithMembers, CreateClassData, UpdateClassData, ClassStats } from '@/services/classService';

export const useClasses = () => {
  const [classes, setClasses] = useState<ClassWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ClassStats>({
    totalClasses: 0,
    totalSchools: 0,
    totalBoards: 0,
    totalStudents: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch all classes
  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ClassService.getClasses();
      setClasses(data);
    } catch (error: any) {
      toast.error('Failed to load classes', { description: error.message });
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch class statistics
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await ClassService.getClassStats();
      setStats(data);
    } catch (error: any) {
      toast.error('Failed to load class statistics', { description: error.message });
      console.error('Error fetching class stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Create a new class
  const createClass = useCallback(async (classData: CreateClassData): Promise<ClassWithMembers | null> => {
    try {
      const newClass = await ClassService.createClass(classData);
      setClasses(prev => [newClass, ...prev]);
      await fetchStats(); // Refresh stats
      toast.success('Class created successfully');
      return newClass;
    } catch (error: any) {
      toast.error('Failed to create class', { description: error.message });
      console.error('Error creating class:', error);
      return null;
    }
  }, [fetchStats]);

  // Update an existing class
  const updateClass = useCallback(async (classData: UpdateClassData): Promise<ClassWithMembers | null> => {
    try {
      const updatedClass = await ClassService.updateClass(classData);
      setClasses(prev => prev.map(cls => cls.id === updatedClass.id ? updatedClass : cls));
      await fetchStats(); // Refresh stats
      toast.success('Class updated successfully');
      return updatedClass;
    } catch (error: any) {
      toast.error('Failed to update class', { description: error.message });
      console.error('Error updating class:', error);
      return null;
    }
  }, [fetchStats]);

  // Delete a class
  const deleteClass = useCallback(async (id: string): Promise<boolean> => {
    try {
      await ClassService.deleteClass(id);
      setClasses(prev => prev.filter(cls => cls.id !== id));
      await fetchStats(); // Refresh stats
      toast.success('Class deleted successfully');
      return true;
    } catch (error: any) {
      toast.error('Failed to delete class', { description: error.message });
      console.error('Error deleting class:', error);
      return false;
    }
  }, [fetchStats]);

  // Get a single class by ID
  const getClassById = useCallback(async (id: string): Promise<ClassWithMembers | null> => {
    try {
      return await ClassService.getClassById(id);
    } catch (error: any) {
      toast.error('Failed to load class details', { description: error.message });
      console.error('Error fetching class by ID:', error);
      return null;
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchClasses();
    fetchStats();
  }, [fetchClasses, fetchStats]);

  return {
    classes,
    loading,
    stats,
    statsLoading,
    createClass,
    updateClass,
    deleteClass,
    getClassById,
    refetch: fetchClasses,
    refetchStats: fetchStats
  };
};

export const useTeachers = () => {
  const [teachers, setTeachers] = useState<{ id: string; name: string; email: string; avatar_url?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ClassService.getAvailableTeachers();
      setTeachers(data);
    } catch (error: any) {
      toast.error('Failed to load teachers', { description: error.message });
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  return {
    teachers,
    loading,
    refetch: fetchTeachers
  };
};

export const useStudents = () => {
  const [students, setStudents] = useState<{ id: string; name: string; email: string; avatar_url?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ClassService.getAvailableStudents();
      setStudents(data);
    } catch (error: any) {
      toast.error('Failed to load students', { description: error.message });
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return {
    students,
    loading,
    refetch: fetchStudents
  };
};

export const useBoards = () => {
  const [boards, setBoards] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBoards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ClassService.getAvailableBoards();
      setBoards(data);
    } catch (error: any) {
      toast.error('Failed to load boards', { description: error.message });
      console.error('Error fetching boards:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  return {
    boards,
    loading,
    refetch: fetchBoards
  };
};

export const useSchools = (boardId?: string) => {
  const [schools, setSchools] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchools = useCallback(async (filterBoardId?: string) => {
    try {
      setLoading(true);
      const data = filterBoardId 
        ? await ClassService.getSchoolsByBoard(filterBoardId)
        : await ClassService.getAvailableSchools();
      setSchools(data);
    } catch (error: any) {
      toast.error('Failed to load schools', { description: error.message });
      console.error('Error fetching schools:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchools(boardId);
  }, [fetchSchools, boardId]);

  return {
    schools,
    loading,
    refetch: () => fetchSchools(boardId)
  };
};
