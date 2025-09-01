import { format } from 'date-fns';

export interface ExportData {
  title: string;
  timestamp: string;
  query: string;
  data: any;
  summary: string;
}

export type ExportFormat = 'csv' | 'json' | 'pdf' | 'xlsx';

export class ReportExportService {
  /**
   * Export report data in the specified format
   */
  static async exportReport(
    exportData: ExportData,
    format: ExportFormat,
    filename?: string
  ): Promise<void> {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const defaultFilename = `${exportData.title.replace(/\s+/g, '_')}_${timestamp}`;
    const finalFilename = filename || defaultFilename;

    switch (format) {
      case 'csv':
        await this.exportAsCSV(exportData, finalFilename);
        break;
      case 'json':
        await this.exportAsJSON(exportData, finalFilename);
        break;
      case 'pdf':
        await this.exportAsPDF(exportData, finalFilename);
        break;
      case 'xlsx':
        await this.exportAsExcel(exportData, finalFilename);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export data as CSV format
   */
  private static async exportAsCSV(exportData: ExportData, filename: string): Promise<void> {
    let csvContent = `Report: ${exportData.title}\n`;
    csvContent += `Generated: ${exportData.timestamp}\n`;
    csvContent += `Query: "${exportData.query}"\n\n`;

    // Add summary
    csvContent += `Summary:\n"${exportData.summary.replace(/"/g, '""')}"\n\n`;

    // Convert data object to CSV rows
    if (exportData.data && typeof exportData.data === 'object') {
      csvContent += 'Metric,Value\n';
      
      const flattenedData = this.flattenObject(exportData.data);
      Object.entries(flattenedData).forEach(([key, value]) => {
        const cleanKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const cleanValue = typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        csvContent += `"${cleanKey}",${cleanValue}\n`;
      });
    }

    this.downloadFile(csvContent, `${filename}.csv`, 'text/csv');
  }

  /**
   * Export data as JSON format
   */
  private static async exportAsJSON(exportData: ExportData, filename: string): Promise<void> {
    const jsonData = {
      report: {
        title: exportData.title,
        timestamp: exportData.timestamp,
        query: exportData.query,
        summary: exportData.summary,
        data: exportData.data,
        metadata: {
          exportedAt: new Date().toISOString(),
          format: 'JSON',
          version: '1.0'
        }
      }
    };

    const jsonContent = JSON.stringify(jsonData, null, 2);
    this.downloadFile(jsonContent, `${filename}.json`, 'application/json');
  }

  /**
   * Export data as PDF format (using HTML to PDF conversion)
   */
  private static async exportAsPDF(exportData: ExportData, filename: string): Promise<void> {
    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${exportData.title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            .header { border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
            .title { color: #007bff; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .meta { color: #666; font-size: 14px; margin-bottom: 5px; }
            .summary { background: #f8f9fa; padding: 20px; border-left: 4px solid #007bff; margin: 20px 0; }
            .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .data-table th, .data-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .data-table th { background-color: #f8f9fa; font-weight: bold; }
            .data-table tr:nth-child(even) { background-color: #f9f9f9; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${exportData.title}</div>
            <div class="meta">Generated: ${exportData.timestamp}</div>
            <div class="meta">Query: ${exportData.query}</div>
          </div>
          
          <div class="summary">
            <h3>Executive Summary</h3>
            <p>${exportData.summary.replace(/\n/g, '<br>')}</p>
          </div>
          
          ${this.generateDataTable(exportData.data)}
          
          <div class="footer">
            <p>Report exported from AI Reports Assistant | ${new Date().toISOString()}</p>
          </div>
        </body>
      </html>
    `;

    // Convert HTML to PDF (using browser's print functionality)
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
      setTimeout(() => printWindow.close(), 1000);
    }
  }

  /**
   * Export data as Excel format (XLSX)
   */
  private static async exportAsExcel(exportData: ExportData, filename: string): Promise<void> {
    // For now, export as CSV with .xlsx extension
    // In a production app, you'd use a library like SheetJS
    let content = `Report: ${exportData.title}\t\t\t\n`;
    content += `Generated: ${exportData.timestamp}\t\t\t\n`;
    content += `Query: ${exportData.query}\t\t\t\n`;
    content += '\t\t\t\n';
    content += `Summary:\t\t\t\n`;
    content += `${exportData.summary}\t\t\t\n`;
    content += '\t\t\t\n';
    content += 'Metric\tValue\tCategory\n';

    if (exportData.data && typeof exportData.data === 'object') {
      const flattenedData = this.flattenObject(exportData.data);
      Object.entries(flattenedData).forEach(([key, value]) => {
        const cleanKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        content += `${cleanKey}\t${value}\tData\n`;
      });
    }

    this.downloadFile(content, `${filename}.xls`, 'application/vnd.ms-excel');
  }

  /**
   * Generate HTML table from data object
   */
  private static generateDataTable(data: any): string {
    if (!data || typeof data !== 'object') {
      return '<p>No structured data available for export.</p>';
    }

    const flattenedData = this.flattenObject(data);
    
    if (Object.keys(flattenedData).length === 0) {
      return '<p>No data to display.</p>';
    }

    let tableHTML = '<table class="data-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
    
    Object.entries(flattenedData).forEach(([key, value]) => {
      const cleanKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      tableHTML += `<tr><td>${cleanKey}</td><td>${value}</td></tr>`;
    });
    
    tableHTML += '</tbody></table>';
    return tableHTML;
  }

  /**
   * Flatten nested objects for easier export
   */
  private static flattenObject(obj: any, prefix: string = ''): Record<string, any> {
    const flattened: Record<string, any> = {};

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'string') {
          flattened[newKey] = value.join(', ');
        } else {
          flattened[newKey] = `Array (${value.length} items)`;
        }
      } else {
        flattened[newKey] = value;
      }
    });

    return flattened;
  }

  /**
   * Create and download file
   */
  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
  }

  /**
   * Extract exportable data from AI message content
   */
  static extractExportData(message: { content: string; timestamp?: string; data?: any }, query: string): ExportData | null {
    if (!message.content || message.content.length < 10) {
      return null;
    }

    // Extract title from content (first line or heading)
    const titleMatch = message.content.match(/^\*?\*?([^*\n]+)/);
    const title = titleMatch?.[1]?.trim() || 'AI Report';
    
    // Clean title
    const cleanTitle = title.replace(/[📊📈📚🤖💡🎯]/g, '').trim();
    
    // Extract summary (everything after the metrics)
    let summary = message.content;
    const recommendationsIndex = summary.indexOf('**Recommendations:**');
    const insightsIndex = summary.indexOf('**Insights:**');
    const keyInsightsIndex = summary.indexOf('**Key Insights:**');
    
    if (recommendationsIndex !== -1) {
      summary = summary.substring(0, recommendationsIndex).trim();
    } else if (insightsIndex !== -1) {
      summary = summary.substring(0, insightsIndex).trim();
    } else if (keyInsightsIndex !== -1) {
      summary = summary.substring(0, keyInsightsIndex).trim();
    }

    return {
      title: cleanTitle,
      timestamp: message.timestamp || new Date().toLocaleString(),
      query: query,
      data: message.data || {},
      summary: summary.replace(/\*\*/g, '').replace(/^\s*[-•]\s*/gm, '').trim()
    };
  }

  /**
   * Check if message contains exportable data
   */
  static hasExportableData(message: { content?: string; data?: any }): boolean {
    if (!message) return false;
    
    // Check if message has structured data
    if (message.data && typeof message.data === 'object' && Object.keys(message.data).length > 0) {
      return true;
    }
    
    // Check if content contains metrics/analytics
    const content = message.content || '';
    const hasMetrics = /\d+[%]?.*(?:users?|courses?|sessions?|rate|duration|percentage)/i.test(content);
    const hasAnalytics = /(?:analytics|metrics|performance|insights|data)/i.test(content);
    
    return hasMetrics && hasAnalytics && content.length > 100;
  }
}
