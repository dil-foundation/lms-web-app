import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BatchUploadState {
  isUploading: boolean;
  isParsing: boolean;
  isProcessing: boolean;
  currentBatch: number;
  totalBatches: number;
  parsedCourses: any[];
  processedCourses: number;
  totalCourses: number;
  errors: any[];
  progress: number;
}

interface BatchUploadResult {
  success: boolean;
  createdCourses: number;
  errors: any[];
  message: string;
  batchIndex: number;
}

export const useBatchUpload = () => {
  const [state, setState] = useState<BatchUploadState>({
    isUploading: false,
    isParsing: false,
    isProcessing: false,
    currentBatch: 0,
    totalBatches: 0,
    parsedCourses: [],
    processedCourses: 0,
    totalCourses: 0,
    errors: [],
    progress: 0
  });

  const resetState = useCallback(() => {
    setState({
      isUploading: false,
      isParsing: false,
      isProcessing: false,
      currentBatch: 0,
      totalBatches: 0,
      parsedCourses: [],
      processedCourses: 0,
      totalCourses: 0,
      errors: [],
      progress: 0
    });
  }, []);

  const parseFile = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, isParsing: true, isUploading: true }));
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('🚀 Starting parse-bulk-upload request...');
      
      // Use direct fetch to handle 400 status codes properly
      console.log('🔍 Using direct fetch to handle validation errors...');
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/parse-bulk-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      console.log('🔍 Direct fetch response status:', response.status);
      console.log('🔍 Direct fetch response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('🔍 Direct fetch response body:', responseText);
      
      let data, error;
      
      if (response.status === 200) {
        // Success case
        try {
          data = JSON.parse(responseText);
          error = null;
        } catch (parseError) {
          throw new Error('Failed to parse successful response');
        }
      } else if (response.status === 400) {
        // Validation error case
        try {
          const errorData = JSON.parse(responseText);
          console.log('📋 Parsed validation error data:', errorData);
          
          if (errorData.errors && errorData.errors.length > 0) {
            console.log('🔍 Validation errors found:', errorData.errors);
            setState(prev => ({
              ...prev,
              isParsing: false,
              isUploading: false,
              errors: errorData.errors
            }));
            
            toast.error("Validation failed", {
              description: `Found ${errorData.errors.length} validation errors. Please fix them and try again.`
            });
            
            return { success: false, errors: errorData.errors };
          } else {
            throw new Error(errorData.message || 'Validation failed');
          }
        } catch (parseError) {
          console.error('❌ Failed to parse validation error response:', parseError);
          throw new Error('Failed to parse validation error response');
        }
      } else {
        // Other error cases
        throw new Error(`Request failed with status ${response.status}`);
      }

      console.log('📡 Parse response received:', { data, error });

      if (error) {
        console.error('❌ Parse error:', error);
        throw error;
      }

      if (!data.success) {
        console.log('⚠️ Parse failed, checking for validation errors...');
        console.log('📋 Data received:', data);
        
        // Handle validation errors
        if (data.errors && data.errors.length > 0) {
          console.log('🔍 Validation errors found:', data.errors);
          setState(prev => ({
            ...prev,
            isParsing: false,
            isUploading: false,
            errors: data.errors
          }));
          
          toast.error("Validation failed", {
            description: `Found ${data.errors.length} validation errors. Please fix them and try again.`
          });
          
          // Don't throw error for validation failures - let the UI handle it
          return { success: false, errors: data.errors };
        }
        
        console.log('❌ Parse failed without validation errors:', data.error);
        throw new Error(data.error || 'Failed to parse file');
      }

      const courses = data.courses || [];
      const totalBatches = Math.ceil(courses.length / 2);

      setState(prev => ({
        ...prev,
        isParsing: false,
        parsedCourses: courses,
        totalCourses: courses.length,
        totalBatches,
        progress: 0,
        errors: [] // Clear any previous errors
      }));

      toast.success(`Successfully parsed ${courses.length} courses`, {
        description: `Ready to process ${totalBatches} batches of 2 courses each`
      });

      return { success: true, courses, totalBatches };
    } catch (error: any) {
      setState(prev => ({ ...prev, isParsing: false, isUploading: false }));
      toast.error("Failed to parse file", { description: error.message });
      throw error;
    }
  }, []);

  const processBatch = useCallback(async (courses: any[], batchIndex: number, totalCourses: number): Promise<BatchUploadResult> => {
    setState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      currentBatch: batchIndex 
    }));

    try {
      const { data, error } = await supabase.functions.invoke('batch-create-courses', {
        body: {
          courses,
          batchIndex
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to process batch');
      }

      setState(prev => {
        const newProcessedCourses = prev.processedCourses + data.createdCourses;
        const progress = totalCourses > 0 ? Math.min(100, Math.round((newProcessedCourses / totalCourses) * 100)) : 0;
        
        console.log('Progress calculation:', {
          prevProcessed: prev.processedCourses,
          createdCourses: data.createdCourses,
          newProcessedCourses,
          totalCourses,
          progress
        });
        
        return {
          ...prev,
          processedCourses: newProcessedCourses,
          progress,
          errors: [...prev.errors, ...(data.errors || [])]
        };
      });

      return data;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        errors: [...prev.errors, { 
          batch: batchIndex, 
          error: error.message 
        }]
      }));
      throw error;
    }
  }, [state.processedCourses]);

  const processAllBatches = useCallback(async (courses?: any[]) => {
    const coursesToProcess = courses || state.parsedCourses;
    
    if (coursesToProcess.length === 0) {
      toast.error("No courses to process");
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      const batches = [];
      for (let i = 0; i < coursesToProcess.length; i += 2) {
        batches.push(coursesToProcess.slice(i, i + 2));
      }

      let totalCreated = 0;
      let totalErrors = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchIndex = i + 1;

        try {
          const result = await processBatch(batch, batchIndex, coursesToProcess.length);
          totalCreated += result.createdCourses;
          totalErrors += result.errors?.length || 0;

          toast.success(`Batch ${batchIndex} completed`, {
            description: `Created ${result.createdCourses} courses`
          });

          // Small delay between batches to prevent overwhelming the system
          if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error: any) {
          console.error(`Batch ${batchIndex} failed:`, error);
          totalErrors++;
          
          toast.error(`Batch ${batchIndex} failed`, {
            description: error.message
          });
        }
      }

      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        isUploading: false 
      }));

      if (totalCreated > 0) {
        toast.success("Batch upload completed!", {
          description: `Created ${totalCreated} courses${totalErrors > 0 ? ` with ${totalErrors} errors` : ''}`
        });
      } else {
        toast.error("Batch upload failed", {
          description: "No courses were created"
        });
      }

      return {
        success: totalCreated > 0,
        createdCourses: totalCreated,
        errors: state.errors,
        totalBatches: batches.length
      };
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        isUploading: false 
      }));
      toast.error("Batch processing failed", { description: error.message });
      throw error;
    }
  }, [state.parsedCourses, processBatch, state.errors, state.totalCourses]);

  const startBatchUpload = useCallback(async (file: File) => {
    try {
      // First parse the file
      const parseResult = await parseFile(file);
      
      // If parsing failed with validation errors, don't proceed
      if (!parseResult.success) {
        return parseResult;
      }
      
      // Then start processing all batches with the parsed courses
      return await processAllBatches(parseResult.courses);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isUploading: false,
        isParsing: false,
        isProcessing: false 
      }));
      throw error;
    }
  }, [parseFile, processAllBatches]);

  return {
    state,
    resetState,
    parseFile,
    processBatch,
    processAllBatches,
    startBatchUpload
  };
};
