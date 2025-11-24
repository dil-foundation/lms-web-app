/**
 * Universal Export Service
 * 
 * A comprehensive, professional export service that supports multiple formats
 * and can handle various data structures (tables, charts, metrics, etc.)
 * 
 * @author Professional Development Team
 * @version 2.0.0
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Supported export formats
 */
export type ExportFormat = 'pdf' | 'xlsx' | 'csv';

/**
 * Export metadata for reports
 */
export interface ExportMetadata {
  title: string;
  description?: string;
  generatedBy?: string;
  generatedAt?: Date;
  filters?: Record<string, any>;
  timeRange?: string;
}

/**
 * Column definition for table exports
 */
export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  format?: (value: any, row?: any) => string;
}

/**
 * Chart data for PDF export
 */
export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: any[];
  config?: any;
}

/**
 * Report data structure
 */
export interface ReportData {
  tables?: Array<{
    title: string;
    columns: ExportColumn[];
    data: any[];
  }>;
  metrics?: Array<{
    label: string;
    value: string | number;
    description?: string;
  }>;
  charts?: ChartData[];
  summary?: string;
  metadata?: ExportMetadata;
}

/**
 * Universal Export Service Class
 * 
 * Provides professional export functionality for all report types
 */
export class UniversalExportService {
  /**
   * Format date for filename
   */
  private static formatDateForFilename(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  }

  /**
   * Sanitize filename
   */
  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Generate filename with timestamp
   */
  private static generateFilename(
    baseName: string,
    format: ExportFormat,
    metadata?: ExportMetadata
  ): string {
    const sanitized = this.sanitizeFilename(baseName);
    const timestamp = this.formatDateForFilename(metadata?.generatedAt);
    const extension = format === 'xlsx' ? 'xlsx' : format === 'csv' ? 'csv' : 'pdf';
    
    return `${sanitized}_${timestamp}.${extension}`;
  }

  /**
   * Main export function - routes to appropriate format handler
   */
  static async exportReport(
    reportData: ReportData,
    format: ExportFormat,
    filename?: string
  ): Promise<void> {
    try {
      const finalFilename = filename || 
        this.generateFilename(
          reportData.metadata?.title || 'Report',
          format,
          reportData.metadata
        );

      switch (format) {
        case 'pdf':
          await this.exportAsPDF(reportData, finalFilename);
          break;
        case 'xlsx':
          await this.exportAsExcel(reportData, finalFilename);
          break;
        case 'csv':
          await this.exportAsCSV(reportData, finalFilename);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      throw new Error(`Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export as PDF using jsPDF and html2canvas
   */
  private static async exportAsPDF(
    reportData: ReportData,
    filename: string
  ): Promise<void> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;
    const lineHeight = 7;
    const sectionSpacing = 10;

    // Helper to add new page if needed
    const checkPageBreak = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
    };

    // Add header
    checkPageBreak(20);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(reportData.metadata?.title || 'Report', margin, yPosition);
    yPosition += lineHeight + 2;

    // Add metadata
    if (reportData.metadata) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      
      if (reportData.metadata.description) {
        pdf.text(reportData.metadata.description, margin, yPosition);
        yPosition += lineHeight;
      }
      
      const generatedAt = reportData.metadata.generatedAt || new Date();
      pdf.text(`Generated: ${generatedAt.toLocaleString()}`, margin, yPosition);
      yPosition += lineHeight;
      
      if (reportData.metadata.generatedBy) {
        pdf.text(`Generated by: ${reportData.metadata.generatedBy}`, margin, yPosition);
        yPosition += lineHeight;
      }
      
      if (reportData.metadata.timeRange) {
        pdf.text(`Time Range: ${reportData.metadata.timeRange}`, margin, yPosition);
        yPosition += lineHeight;
      }
      
      pdf.setTextColor(0, 0, 0);
      yPosition += sectionSpacing;
    }

    // Add summary if available
    if (reportData.summary) {
      checkPageBreak(15);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Summary', margin, yPosition);
      yPosition += lineHeight;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const summaryLines = pdf.splitTextToSize(reportData.summary, pageWidth - 2 * margin);
      summaryLines.forEach((line: string) => {
        checkPageBreak(lineHeight);
        pdf.text(line, margin, yPosition);
        yPosition += lineHeight;
      });
      yPosition += sectionSpacing;
    }

    // Add metrics
    if (reportData.metrics && reportData.metrics.length > 0) {
      checkPageBreak(20);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Key Metrics', margin, yPosition);
      yPosition += lineHeight + 2;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const metricsPerRow = 2;
      const metricWidth = (pageWidth - 2 * margin - (metricsPerRow - 1) * 5) / metricsPerRow;
      let currentRow = 0;
      
      reportData.metrics.forEach((metric, index) => {
        if (index > 0 && index % metricsPerRow === 0) {
          currentRow++;
          yPosition = margin + 30 + (currentRow * 20);
          checkPageBreak(20);
        }
        
        const xPos = margin + (index % metricsPerRow) * (metricWidth + 5);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(metric.label, xPos, yPosition);
        yPosition += lineHeight;
        
        pdf.setFont('helvetica', 'normal');
        pdf.text(String(metric.value), xPos, yPosition);
        yPosition += lineHeight;
        
        if (metric.description) {
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text(metric.description, xPos, yPosition);
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(10);
          yPosition += lineHeight;
        }
        
        yPosition -= lineHeight * (metric.description ? 3 : 2);
      });
      
      yPosition = margin + 30 + ((Math.ceil(reportData.metrics.length / metricsPerRow)) * 20);
      yPosition += sectionSpacing;
    }

    // Add tables
    if (reportData.tables && reportData.tables.length > 0) {
      reportData.tables.forEach((table, tableIndex) => {
        checkPageBreak(30);
        
        // Table title
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(table.title, margin, yPosition);
        yPosition += lineHeight + 2;

        if (table.data.length === 0) {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text('No data available', margin, yPosition);
          yPosition += lineHeight + sectionSpacing;
          return;
        }

        // Calculate column widths
        const availableWidth = pageWidth - 2 * margin;
        const columnCount = table.columns.length;
        const columnWidth = availableWidth / columnCount;
        const cellHeight = 8;

        // Table header
        checkPageBreak(cellHeight + 5);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setFillColor(240, 240, 240);
        table.columns.forEach((col, colIndex) => {
          const xPos = margin + colIndex * columnWidth;
          pdf.rect(xPos, yPosition - 5, columnWidth, cellHeight, 'F');
          pdf.text(col.header, xPos + 2, yPosition);
        });
        yPosition += cellHeight;

        // Table rows
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        
        table.data.forEach((row, rowIndex) => {
          checkPageBreak(cellHeight + 2);
          
          table.columns.forEach((col, colIndex) => {
            const xPos = margin + colIndex * columnWidth;
            const value = col.format 
              ? col.format(row[col.key], row)
              : String(row[col.key] ?? '');
            
            // Truncate long values
            const maxWidth = columnWidth - 4;
            const truncatedValue = pdf.splitTextToSize(value, maxWidth);
            
            pdf.text(truncatedValue[0] || '', xPos + 2, yPosition);
          });
          
          yPosition += cellHeight;
          
          // Add border between rows
          if (rowIndex < table.data.length - 1) {
            pdf.setDrawColor(200, 200, 200);
            pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          }
        });
        
        yPosition += sectionSpacing;
      });
    }

    // Add footer to each page
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `Page ${i} of ${totalPages} | Generated by DIL-AI LMS`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Save PDF
    pdf.save(filename);
  }

  /**
   * Export as Excel (XLSX) using xlsx library
   */
  private static async exportAsExcel(
    reportData: ReportData,
    filename: string
  ): Promise<void> {
    const workbook = XLSX.utils.book_new();

    // Add metadata sheet
    if (reportData.metadata) {
      const metadataSheet = XLSX.utils.aoa_to_sheet([
        ['Report Information'],
        ['Title', reportData.metadata.title],
        ['Description', reportData.metadata.description || ''],
        ['Generated At', (reportData.metadata.generatedAt || new Date()).toLocaleString()],
        ['Generated By', reportData.metadata.generatedBy || ''],
        ['Time Range', reportData.metadata.timeRange || ''],
        ...(reportData.metadata.filters 
          ? Object.entries(reportData.metadata.filters).map(([key, value]) => [key, String(value)])
          : []
        )
      ]);
      
      // Set column widths
      metadataSheet['!cols'] = [{ wch: 20 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Report Info');
    }

    // Add summary sheet if available
    if (reportData.summary) {
      const summarySheet = XLSX.utils.aoa_to_sheet([
        ['Executive Summary'],
        [reportData.summary]
      ]);
      summarySheet['!cols'] = [{ wch: 100 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }

    // Add metrics sheet
    if (reportData.metrics && reportData.metrics.length > 0) {
      const metricsData = [
        ['Metric', 'Value', 'Description'],
        ...reportData.metrics.map(m => [
          m.label,
          m.value,
          m.description || ''
        ])
      ];
      const metricsSheet = XLSX.utils.aoa_to_sheet(metricsData);
      metricsSheet['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(workbook, metricsSheet, 'Key Metrics');
    }

    // Add table sheets
    if (reportData.tables && reportData.tables.length > 0) {
      reportData.tables.forEach((table, index) => {
        // Transform data according to column definitions
        const transformedData = table.data.map(row => {
          const transformedRow: any = {};
          table.columns.forEach(col => {
            const value = row[col.key];
            transformedRow[col.header] = col.format 
              ? col.format(value, row)
              : (value !== undefined && value !== null ? String(value) : '');
          });
          return transformedRow;
        });

        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(transformedData);

        // Set column widths
        worksheet['!cols'] = table.columns.map(col => ({
          wch: col.width || 15
        }));

        // Generate sheet name (max 31 characters for Excel)
        const sheetName = table.title
          .replace(/[^\w\s]/g, '')
          .substring(0, 31) || `Table ${index + 1}`;

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });
    }

    // Save Excel file
    XLSX.writeFile(workbook, filename);
  }

  /**
   * Export as CSV
   */
  private static async exportAsCSV(
    reportData: ReportData,
    filename: string
  ): Promise<void> {
    // CSV export focuses on table data
    if (!reportData.tables || reportData.tables.length === 0) {
      throw new Error('No table data available for CSV export');
    }

    // Export first table (or combine all tables)
    const primaryTable = reportData.tables[0];
    
    // Create CSV header
    const headers = primaryTable.columns.map(col => col.header);
    const csvRows = [headers.join(',')];

    // Add data rows
    primaryTable.data.forEach(row => {
      const values = primaryTable.columns.map(col => {
        const value = col.format 
          ? col.format(row[col.key], row)
          : String(row[col.key] ?? '');
        
        // Escape CSV values (handle commas, quotes, newlines)
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });

    // Create and download CSV
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Helper: Convert chart data to table format for export
   */
  static chartToTable(chartData: ChartData): { columns: ExportColumn[]; data: any[] } {
    if (!chartData.data || chartData.data.length === 0) {
      return { columns: [], data: [] };
    }

    // Extract keys from first data point
    const firstRow = chartData.data[0];
    const columns: ExportColumn[] = Object.keys(firstRow).map(key => ({
      header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      key: key,
      width: 20
    }));

    return { columns, data: chartData.data };
  }

  /**
   * Helper: Prepare report data from common report structures
   */
  static prepareReportData(
    data: any,
    metadata: ExportMetadata,
    options?: {
      includeCharts?: boolean;
      customSummary?: string;
    }
  ): ReportData {
    const reportData: ReportData = {
      metadata: {
        ...metadata,
        generatedAt: metadata.generatedAt || new Date()
      },
      summary: options?.customSummary,
      tables: [],
      metrics: []
    };

    // Extract tables if data has table-like structure
    if (Array.isArray(data)) {
      // If data is an array, try to infer columns
      if (data.length > 0) {
        const firstItem = data[0];
        const columns: ExportColumn[] = Object.keys(firstItem).map(key => ({
          header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          key: key,
          width: 20
        }));

        reportData.tables = [{
          title: metadata.title || 'Data',
          columns,
          data
        }];
      }
    } else if (typeof data === 'object') {
      // Extract metrics from object
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'number' || typeof value === 'string') {
          reportData.metrics = reportData.metrics || [];
          reportData.metrics.push({
            label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
            value: String(value)
          });
        }
      });
    }

    return reportData;
  }
}

