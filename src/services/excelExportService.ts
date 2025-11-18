import * as XLSX from 'xlsx';

/**
 * Excel Export Service
 * Provides utilities for exporting data to Excel (XLSX) format
 */

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

/**
 * Export data to Excel file
 * @param data - Array of objects to export
 * @param columns - Column definitions
 * @param filename - Output filename (without extension)
 */
export const exportToExcel = (
  data: any[],
  columns: ExportColumn[],
  filename: string
): void => {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Transform data to match column keys
    const transformedData = data.map(row => {
      const transformedRow: any = {};
      columns.forEach(col => {
        transformedRow[col.header] = row[col.key] !== undefined ? row[col.key] : '';
      });
      return transformedRow;
    });

    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(transformedData);

    // Set column widths if specified
    const columnWidths = columns.map(col => ({
      wch: col.width || 15 // Default width of 15 characters
    }));
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export data to Excel');
  }
};

/**
 * Export MFA users to Excel
 * @param users - Array of user objects with MFA status
 * @param filename - Output filename (default: 'mfa-users-export')
 */
export const exportMFAUsers = (users: any[], filename: string = 'mfa-users-export'): void => {
  const columns: ExportColumn[] = [
    { header: 'ID', key: 'id', width: 35 },
    { header: 'First Name', key: 'first_name', width: 20 },
    { header: 'Last Name', key: 'last_name', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Role', key: 'role', width: 15 },
    { header: 'MFA Enabled', key: 'mfa_enabled', width: 15 },
    { header: 'MFA Setup Date', key: 'mfa_setup_date', width: 25 },
    { header: 'Created At', key: 'created_at', width: 25 },
  ];

  exportToExcel(users, columns, filename);
};

/**
 * Export blocked users to Excel
 * @param users - Array of blocked user objects
 * @param filename - Output filename (default: 'blocked-users-export')
 */
export const exportBlockedUsers = (users: any[], filename: string = 'blocked-users-export'): void => {
  const columns: ExportColumn[] = [
    { header: 'ID', key: 'id', width: 35 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'IP Address', key: 'ip_address', width: 20 },
    { header: 'Block Reason', key: 'block_reason', width: 30 },
    { header: 'Blocked At', key: 'blocked_at', width: 25 },
    { header: 'Blocked Until', key: 'blocked_until', width: 25 },
    { header: 'Attempts Count', key: 'attempts_count', width: 15 },
    { header: 'Metadata', key: 'metadata', width: 30 },
  ];

  exportToExcel(users, columns, filename);
};

/**
 * Export login attempts to Excel
 * @param attempts - Array of login attempt objects
 * @param filename - Output filename (default: 'login-attempts-export')
 */
export const exportLoginAttempts = (attempts: any[], filename: string = 'login-attempts-export'): void => {
  const columns: ExportColumn[] = [
    { header: 'ID', key: 'id', width: 35 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'IP Address', key: 'ip_address', width: 20 },
    { header: 'User Agent', key: 'user_agent', width: 40 },
    { header: 'Attempt Time', key: 'attempt_time', width: 25 },
    { header: 'Status', key: 'success', width: 15 },
    { header: 'Failure Reason', key: 'failure_reason', width: 30 },
    { header: 'Metadata', key: 'metadata', width: 30 },
  ];

  exportToExcel(attempts, columns, filename);
};

/**
 * Export access logs to Excel
 * @param logs - Array of access log objects
 * @param filename - Output filename (default: 'access-logs-export')
 */
export const exportAccessLogs = (logs: any[], filename: string = 'access-logs-export'): void => {
  const columns: ExportColumn[] = [
    { header: 'ID', key: 'id', width: 35 },
    { header: 'User ID', key: 'user_id', width: 35 },
    { header: 'User Email', key: 'user_email', width: 30 },
    { header: 'Action', key: 'action', width: 30 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Metadata', key: 'metadata', width: 40 },
    { header: 'Created At', key: 'created_at', width: 25 },
  ];

  exportToExcel(logs, columns, filename);
};
