import { useState, useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import { Button } from './button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface FileUploadProps {
  onUpload: (file: File) => void;
  acceptedFileTypes?: string[];
  label?: string;
  disabled?: boolean;
  maxSize?: number; // in bytes
}

export const FileUpload = ({
  onUpload,
  acceptedFileTypes = [],
  label = 'Drag & drop a file here, or click to select a file',
  disabled = false,
  maxSize = 5 * 1024 * 1024, // 5MB default
}: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      
      // Simulate upload progress
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            onUpload(selectedFile);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
    }
  }, [onUpload]);

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    const rejection = fileRejections[0];
    if (rejection.errors.find(e => e.code === 'file-too-large')) {
      toast.error(`Error: File is larger than ${formatBytes(maxSize)}.`);
    } else {
      toast.error(`Error: ${rejection.errors[0].message}`);
    }
  }, [maxSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: acceptedFileTypes.length > 0 ? acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}) : undefined,
    multiple: false,
    disabled,
    maxSize,
  });

  const removeFile = () => {
    setFile(null);
    setUploadProgress(0);
  };
  
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  }

  return (
    <div className="w-full">
      {file ? (
        <div className="w-full text-center p-6 border-2 border-dashed rounded-lg border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileIcon className="h-8 w-8 text-muted-foreground" />
              <span className="font-medium">{file.name}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={removeFile}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <Progress value={uploadProgress} className="w-full mt-4" />
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`w-full text-center p-10 border-2 border-dashed rounded-lg transition-colors
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-border'}
            ${disabled ? 'cursor-not-allowed bg-muted/50' : 'cursor-pointer hover:border-primary/50'}`}
        >
          <input {...getInputProps()} disabled={disabled} />
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <UploadCloud className="h-10 w-10" />
            <p>{label}</p>
            <p className="text-xs text-muted-foreground">Max file size: {formatBytes(maxSize)}</p>
          </div>
        </div>
      )}
    </div>
  );
}; 