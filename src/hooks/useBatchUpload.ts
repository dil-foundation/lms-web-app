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

      const { data, error } = await supabase.functions.invoke('parse-bulk-upload', {
        body: formData,
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
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
        progress: 0
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
