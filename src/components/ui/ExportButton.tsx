/**
 * Export Button Component
 * 
 * A professional, reusable export button with format selection dropdown
 * Supports PDF, Excel (XLSX), and CSV formats
 * 
 * @author Professional Development Team
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Download,
  FileText,
  FileSpreadsheet,
  File,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { UniversalExportService, ExportFormat, ReportData } from '@/services/universalExportService';
import { cn } from '@/lib/utils';

interface ExportButtonProps {
  /**
   * Report data to export
   */
  reportData: ReportData;
  
  /**
   * Custom filename (without extension)
   */
  filename?: string;
  
  /**
   * Button variant
   */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  
  /**
   * Button size
   */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  
  /**
   * Show icon only
   */
  iconOnly?: boolean;
  
  /**
   * Custom className
   */
  className?: string;
  
  /**
   * Disabled state
   */
  disabled?: boolean;
  
  /**
   * Available export formats (default: all)
   */
  formats?: ExportFormat[];
  
  /**
   * Callback when export starts
   */
  onExportStart?: (format: ExportFormat) => void;
  
  /**
   * Callback when export completes
   */
  onExportComplete?: (format: ExportFormat, filename: string) => void;
  
  /**
   * Callback when export fails
   */
  onExportError?: (format: ExportFormat, error: Error) => void;
}

const formatIcons = {
  pdf: FileText,
  xlsx: FileSpreadsheet,
  csv: File,
};

const formatLabels = {
  pdf: 'PDF Document',
  xlsx: 'Excel Workbook',
  csv: 'CSV File',
};

const formatDescriptions = {
  pdf: 'Best for printing and sharing',
  xlsx: 'Best for data analysis',
  csv: 'Best for simple data import',
};

export const ExportButton: React.FC<ExportButtonProps> = ({
  reportData,
  filename,
  variant = 'outline',
  size = 'default',
  iconOnly = false,
  className,
  disabled = false,
  formats = ['pdf', 'xlsx', 'csv'],
  onExportStart,
  onExportComplete,
  onExportError,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [lastExported, setLastExported] = useState<{ format: ExportFormat; timestamp: Date } | null>(null);

  const handleExport = async (format: ExportFormat) => {
    if (isExporting || disabled) return;

    try {
      setIsExporting(true);
      setExportingFormat(format);
      
      // Callback
      onExportStart?.(format);

      // Show loading toast
      const loadingToast = toast.loading(`Exporting as ${formatLabels[format]}...`, {
        description: 'Please wait while we prepare your report',
      });

      // Perform export
      await UniversalExportService.exportReport(reportData, format, filename);

      // Success
      const finalFilename = filename || 
        `${reportData.metadata?.title || 'Report'}_${new Date().toISOString().split('T')[0]}.${format === 'xlsx' ? 'xlsx' : format === 'csv' ? 'csv' : 'pdf'}`;
      
      setLastExported({ format, timestamp: new Date() });
      
      toast.success('Export completed successfully!', {
        id: loadingToast,
        description: `Your ${formatLabels[format]} has been downloaded`,
      });

      onExportComplete?.(format, finalFilename);
    } catch (error) {
      console.error('Export error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to export report';
      
      toast.error('Export failed', {
        description: errorMessage,
      });

      onExportError?.(format, error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            'gap-2',
            iconOnly && 'px-2',
            className
          )}
          disabled={disabled || isExporting}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {!iconOnly && 'Exporting...'}
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              {!iconOnly && 'Export'}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {formats.includes('pdf') && (
          <DropdownMenuItem
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-3 w-full">
              <FileText className="h-4 w-4 text-red-500" />
              <div className="flex-1">
                <div className="font-medium">{formatLabels.pdf}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDescriptions.pdf}
                </div>
              </div>
              {exportingFormat === 'pdf' && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {lastExported?.format === 'pdf' && exportingFormat !== 'pdf' && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </div>
          </DropdownMenuItem>
        )}
        
        {formats.includes('xlsx') && (
          <DropdownMenuItem
            onClick={() => handleExport('xlsx')}
            disabled={isExporting}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-3 w-full">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              <div className="flex-1">
                <div className="font-medium">{formatLabels.xlsx}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDescriptions.xlsx}
                </div>
              </div>
              {exportingFormat === 'xlsx' && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {lastExported?.format === 'xlsx' && exportingFormat !== 'xlsx' && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </div>
          </DropdownMenuItem>
        )}
        
        {formats.includes('csv') && (
          <DropdownMenuItem
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-3 w-full">
              <File className="h-4 w-4 text-blue-500" />
              <div className="flex-1">
                <div className="font-medium">{formatLabels.csv}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDescriptions.csv}
                </div>
              </div>
              {exportingFormat === 'csv' && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {lastExported?.format === 'csv' && exportingFormat !== 'csv' && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </div>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

