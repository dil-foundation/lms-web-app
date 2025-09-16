export interface ExportData {
  title: string;
  timestamp: string;
  query: string;
  data: any;
  summary: string;
}

export type ExportFormat = 'pdf' | 'xlsx';

export class ReportExportService {
  /**
   * Format date to string in yyyy-MM-dd_HH-mm-ss format
   */
  private static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  }

  /**
   * Export report data in the specified format
   */
  static async exportReport(
    exportData: ExportData,
    format: ExportFormat,
    filename?: string
  ): Promise<void> {
    const timestamp = this.formatDate(new Date());
    const defaultFilename = `${exportData.title.replace(/\s+/g, '_')}_${timestamp}`;
    const finalFilename = filename || defaultFilename;

    switch (format) {
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
    const htmlContent = this.generateExcelHTML(exportData);
    this.downloadFile(htmlContent, `${filename}.xls`, 'application/vnd.ms-excel');
  }

  /**
   * Generate professional Excel HTML format
   */
  private static generateExcelHTML(exportData: ExportData): string {
    const flattenedData = this.flattenObject(exportData.data || {});
    const sections = this.categorizeData(flattenedData);
    
    return `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
          <meta name="ProgId" content="Excel.Sheet">
          <meta name="Generator" content="Microsoft Excel 15">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Report</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            .header { background-color: #8DC63F; color: white; font-weight: bold; font-size: 14pt; padding: 8px; text-align: center; }
            .subheader { background-color: #0061AF; color: white; font-weight: bold; font-size: 12pt; padding: 6px; }
            .section-header { background-color: #f1f5f9; font-weight: bold; font-size: 11pt; padding: 6px; border: 1px solid #e5e7eb; }
            .data-cell { padding: 4px 8px; border: 1px solid #e5e7eb; font-size: 10pt; }
            .metric-cell { background-color: #f8fafc; font-weight: bold; padding: 4px 8px; border: 1px solid #e5e7eb; }
            .value-cell { text-align: right; padding: 4px 8px; border: 1px solid #e5e7eb; }
            .summary-cell { background-color: #f0fdf4; padding: 8px; border: 1px solid #8DC63F; font-style: italic; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            .meta-info { font-size: 9pt; color: #64748b; }
          </style>
        </head>
        <body>
          <!-- Report Header -->
          <table>
            <tr><td class="header" colspan="3">${exportData.title}</td></tr>
            <tr><td class="meta-info">Generated:</td><td class="meta-info" colspan="2">${exportData.timestamp}</td></tr>
            <tr><td class="meta-info">Query:</td><td class="meta-info" colspan="2">${exportData.query}</td></tr>
            <tr><td colspan="3">&nbsp;</td></tr>
          </table>

          <!-- Executive Summary -->
          <table>
            <tr><td class="subheader" colspan="3">📋 Executive Summary</td></tr>
            <tr><td class="summary-cell" colspan="3">${exportData.summary.replace(/\n/g, '<br>')}</td></tr>
            <tr><td colspan="3">&nbsp;</td></tr>
          </table>

          <!-- Key Metrics Overview -->
          ${this.generateMetricsSection(sections.metrics)}

          <!-- User Analytics -->
          ${this.generateUserAnalyticsSection(sections.users)}

          <!-- Course Performance -->
          ${this.generateCourseSection(sections.courses)}

          <!-- Platform Statistics -->
          ${this.generatePlatformSection(sections.platform)}

          <!-- Additional Data -->
          ${Object.keys(sections.other).length > 0 ? this.generateOtherDataSection(sections.other) : ''}

          <!-- Report Footer -->
          <table>
            <tr><td colspan="3">&nbsp;</td></tr>
            <tr><td class="meta-info" colspan="3">Report generated by AI Reports Assistant | ${new Date().toISOString()}</td></tr>
          </table>
        </body>
      </html>
    `;
  }

  /**
   * Categorize data into logical sections
   */
  private static categorizeData(flattenedData: Record<string, any>) {
    const sections = {
      metrics: {} as Record<string, any>,
      users: {} as Record<string, any>,
      courses: {} as Record<string, any>,
      platform: {} as Record<string, any>,
      other: {} as Record<string, any>
    };

    Object.entries(flattenedData).forEach(([key, value]) => {
      const keyLower = key.toLowerCase();
      
      if (keyLower.includes('user') || keyLower.includes('student') || keyLower.includes('teacher')) {
        sections.users[key] = value;
      } else if (keyLower.includes('course') || keyLower.includes('lesson') || keyLower.includes('completion')) {
        sections.courses[key] = value;
      } else if (keyLower.includes('rate') || keyLower.includes('percentage') || keyLower.includes('engagement') || keyLower.includes('retention')) {
        sections.metrics[key] = value;
      } else if (keyLower.includes('platform') || keyLower.includes('system') || keyLower.includes('active') || keyLower.includes('total')) {
        sections.platform[key] = value;
      } else {
        sections.other[key] = value;
      }
    });

    return sections;
  }

  /**
   * Generate metrics section
   */
  private static generateMetricsSection(metrics: Record<string, any>): string {
    if (Object.keys(metrics).length === 0) return '';
    
    let html = '<table><tr><td class="subheader" colspan="2">📊 Key Performance Metrics</td></tr>';
    
    Object.entries(metrics).forEach(([key, value]) => {
      const cleanKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
      html += `<tr><td class="metric-cell">${cleanKey}</td><td class="value-cell">${formattedValue}</td></tr>`;
    });
    
    html += '<tr><td colspan="2">&nbsp;</td></tr></table>';
    return html;
  }

  /**
   * Generate user analytics section
   */
  private static generateUserAnalyticsSection(users: Record<string, any>): string {
    if (Object.keys(users).length === 0) return '';
    
    let html = '<table><tr><td class="subheader" colspan="2">👥 User Analytics</td></tr>';
    
    Object.entries(users).forEach(([key, value]) => {
      const cleanKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
      html += `<tr><td class="metric-cell">${cleanKey}</td><td class="value-cell">${formattedValue}</td></tr>`;
    });
    
    html += '<tr><td colspan="2">&nbsp;</td></tr></table>';
    return html;
  }

  /**
   * Generate course section
   */
  private static generateCourseSection(courses: Record<string, any>): string {
    if (Object.keys(courses).length === 0) return '';
    
    let html = '<table><tr><td class="subheader" colspan="2">📚 Course Performance</td></tr>';
    
    Object.entries(courses).forEach(([key, value]) => {
      const cleanKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
      html += `<tr><td class="metric-cell">${cleanKey}</td><td class="value-cell">${formattedValue}</td></tr>`;
    });
    
    html += '<tr><td colspan="2">&nbsp;</td></tr></table>';
    return html;
  }

  /**
   * Generate platform section
   */
  private static generatePlatformSection(platform: Record<string, any>): string {
    if (Object.keys(platform).length === 0) return '';
    
    let html = '<table><tr><td class="subheader" colspan="2">🚀 Platform Statistics</td></tr>';
    
    Object.entries(platform).forEach(([key, value]) => {
      const cleanKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
      html += `<tr><td class="metric-cell">${cleanKey}</td><td class="value-cell">${formattedValue}</td></tr>`;
    });
    
    html += '<tr><td colspan="2">&nbsp;</td></tr></table>';
    return html;
  }

  /**
   * Generate other data section
   */
  private static generateOtherDataSection(other: Record<string, any>): string {
    let html = '<table><tr><td class="subheader" colspan="2">📈 Additional Insights</td></tr>';
    
    Object.entries(other).forEach(([key, value]) => {
      const cleanKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
      html += `<tr><td class="metric-cell">${cleanKey}</td><td class="value-cell">${formattedValue}</td></tr>`;
    });
    
    html += '<tr><td colspan="2">&nbsp;</td></tr></table>';
    return html;
  }

  /**
   * Generate HTML table from data object or markdown content
   */
  private static generateDataTable(data: any): string {
    // First, try to extract markdown tables from the data content if available
    if (data && data.markdownContent) {
      const htmlTables = this.convertMarkdownTablesToHTML(data.markdownContent);
      if (htmlTables) {
        return htmlTables;
      }
    }

    // Fallback to original key-value table generation
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
   * Convert markdown tables to HTML tables (ONLY tables, no other content)
   */
  private static convertMarkdownTablesToHTML(markdownContent: string): string {
    if (!markdownContent || typeof markdownContent !== 'string') {
      return '';
    }

    let htmlContent = '';
    const lines = markdownContent.split('\n');
    let inTable = false;
    let tableLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line looks like a table row
      const isTableRow = line.includes('|') && line.startsWith('|') && line.endsWith('|');
      const isTableSeparator = line.includes('|') && line.includes('-');
      
      if (isTableRow || isTableSeparator) {
        if (!inTable) {
          inTable = true;
          tableLines = [];
        }
        tableLines.push(line);
      } else {
        // End of table, process it
        if (inTable) {
          const htmlTable = this.processMarkdownTable(tableLines);
          if (htmlTable) {
            htmlContent += htmlTable + '<br><br>'; // Add spacing between tables
          }
          inTable = false;
          tableLines = [];
        }
        
        // SKIP non-table content - we only want clean tables in PDF
        // No more raw markdown text in the PDF!
      }
    }

    // Handle table at end of content
    if (inTable && tableLines.length > 0) {
      const htmlTable = this.processMarkdownTable(tableLines);
      if (htmlTable) {
        htmlContent += htmlTable;
      }
    }

    return htmlContent;
  }

  /**
   * Process a single markdown table and convert to HTML
   */
  private static processMarkdownTable(tableLines: string[]): string {
    if (tableLines.length < 2) return '';
    
    // First line is headers, second line is separator (ignored), rest are data
    const headerLine = tableLines[0];
    const dataLines = tableLines.slice(2);
    
    const headers = headerLine.split('|').map(h => h.trim()).filter(h => h);
    
    if (headers.length === 0) return '';
    
    let htmlTable = '<table class="data-table"><thead><tr>';
    
    // Add headers
    headers.forEach(header => {
      htmlTable += `<th>${header}</th>`;
    });
    
    htmlTable += '</tr></thead><tbody>';
    
    // Add data rows
    dataLines.forEach(line => {
      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length > 0) {
        htmlTable += '<tr>';
        cells.forEach(cell => {
          htmlTable += `<td>${cell}</td>`;
        });
        htmlTable += '</tr>';
      }
    });
    
    htmlTable += '</tbody></table>';
    return htmlTable;
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
    
    // Extract clean summary (remove markdown tables and syntax)
    let summary = message.content;
    
    // Remove everything after recommendations/insights
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
    
    // Remove markdown tables from summary (they'll be shown separately as formatted tables)
    summary = this.removeMarkdownTables(summary);
    
    // Clean up markdown syntax
    summary = this.cleanMarkdownSyntax(summary);

    return {
      title: cleanTitle,
      timestamp: message.timestamp || new Date().toLocaleString(),
      query: query,
      data: {
        ...message.data || {},
        markdownContent: message.content // Include the full markdown content for table extraction
      },
      summary: summary
    };
  }

  /**
   * Remove markdown tables from text
   */
  private static removeMarkdownTables(text: string): string {
    if (!text) return text;
    
    const lines = text.split('\n');
    const cleanLines: string[] = [];
    let inTable = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      const isTableRow = trimmedLine.includes('|') && trimmedLine.startsWith('|') && trimmedLine.endsWith('|');
      const isTableSeparator = trimmedLine.includes('|') && trimmedLine.includes('-');
      
      if (isTableRow || isTableSeparator) {
        inTable = true;
        // Skip table lines
      } else {
        if (inTable) {
          inTable = false;
          // Add a line break after table
          cleanLines.push('');
        }
        cleanLines.push(line);
      }
    }
    
    return cleanLines.join('\n');
  }

  /**
   * Clean markdown syntax from text
   */
  private static cleanMarkdownSyntax(text: string): string {
    if (!text) return text;
    
    return text
      // Remove markdown headers (##, ###, etc.)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic syntax
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Remove list markers
      .replace(/^\s*[-•]\s+/gm, '• ')
      // Remove extra line breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Remove emojis
      .replace(/[📊📈📚🤖💡🎯👥👨‍🏫👑]/g, '')
      .trim();
  }

  /**
   * Check if message contains exportable data
   */
  static hasExportableData(message: { content?: string; data?: any }): boolean {
    if (!message) return false;
    
    // Always allow export if message has structured data
    if (message.data && typeof message.data === 'object' && Object.keys(message.data).length > 0) {
      return true;
    }
    
    const content = message.content || '';
    
    // Very short messages are not exportable (less than 10 characters)
    if (content.length < 10) {
      return false;
    }
    
    // ONLY exclude very specific welcome message patterns
    const isWelcomeMessage = content.includes("Hello! I'm IRIS") || 
                            content.includes("Role: Admin") ||
                            (content.includes("I'm your AI assistant") && content.includes("platform analytics"));
    
    if (isWelcomeMessage) {
      return false;
    }
    
    // EXPORT ABSOLUTELY EVERYTHING ELSE
    // Any message with 10+ characters that's not the welcome message is exportable
    return true;
  }
}
