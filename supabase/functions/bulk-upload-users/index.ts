import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  grade?: string;
  teacherId?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface UploadResult {
  success: boolean;
  totalRows: number;
  createdUsers: number;
  skippedUsers: number;
  errors: ValidationError[];
  message: string;
  processingTime?: number;
  batchesProcessed?: number;
}

// Parse XLSX content using proper XLSX library
function parseXLSX(xlsxContent: ArrayBuffer): UserData[] {
  try {
    // Read the workbook from the ArrayBuffer
    const workbook = XLSX.read(xlsxContent, { type: 'array' });
    
    // Get the first worksheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('No worksheets found in XLSX file');
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert worksheet to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      throw new Error('Invalid XLSX file: insufficient data');
    }
    
    // Get headers from first row
    const headers = jsonData[0] as string[];
    
    // Validate required headers
    const requiredHeaders = ['First Name', 'Last Name', 'Email', 'Role'];
    for (const header of requiredHeaders) {
      if (!headers.includes(header)) {
        throw new Error(`Missing required header: ${header}`);
      }
    }
    
    const users: UserData[] = [];
    
    // Process data rows (skip header row)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (!row || row.length === 0) continue;
      
      // Create user object from row data
      const user: any = {};
      headers.forEach((header, index) => {
        user[header] = row[index] || '';
      });
      
              // Only add if we have the minimum required data
        if (user['First Name'] && user['Last Name'] && user['Email'] && user['Role']) {
          // Clean email address - remove any extra whitespace and convert to lowercase
          const cleanEmail = user['Email'].toString().trim().toLowerCase();
          
          users.push({
            firstName: user['First Name'].toString().trim(),
            lastName: user['Last Name'].toString().trim(),
            email: cleanEmail,
            role: user['Role'].toString().trim().toLowerCase(),
            grade: user['Grade'] ? user['Grade'].toString().trim() : undefined,
            teacherId: user['Teacher ID'] ? user['Teacher ID'].toString().trim() : undefined,
          });
        }
    }
    
    return users;
  } catch (error) {
    throw new Error(`Failed to parse XLSX file: ${error.message}`);
  }
}

// Validate user data
function validateUserData(user: UserData, row: number): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Validate first name
  if (!user.firstName || user.firstName.trim().length < 2 || user.firstName.trim().length > 30) {
    errors.push({
      row,
      field: 'First Name',
      message: 'First name must be 2-30 characters'
    });
  }
  
  // Validate last name
  if (!user.lastName || user.lastName.trim().length < 2 || user.lastName.trim().length > 30) {
    errors.push({
      row,
      field: 'Last Name',
      message: 'Last name must be 2-30 characters'
    });
  }
  
  // Validate email
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!user.email || !emailRegex.test(user.email)) {
    errors.push({
      row,
      field: 'Email',
      message: 'Please enter a valid email address'
    });
  }
  
  // Validate role
  if (!['student', 'teacher', 'admin'].includes(user.role)) {
    errors.push({
      row,
      field: 'Role',
      message: 'Role must be student, teacher, or admin'
    });
  }
  
  // Role-specific validation
  if (user.role === 'student') {
    if (!user.grade || user.grade.trim() === '') {
      errors.push({
        row,
        field: 'Grade',
        message: 'Grade is required for students'
      });
    }
    if (user.teacherId && user.teacherId.trim() !== '') {
      errors.push({
        row,
        field: 'Teacher ID',
        message: 'Teacher ID should be empty for students'
      });
    }
  }
  
  if (user.role === 'teacher') {
    if (!user.teacherId || user.teacherId.trim().length < 3) {
      errors.push({
        row,
        field: 'Teacher ID',
        message: 'Teacher ID is required and must be at least 3 characters'
      });
    }
    if (user.grade && user.grade.trim() !== '') {
      errors.push({
        row,
        field: 'Grade',
        message: 'Grade should be empty for teachers'
      });
    }
  }
  
  if (user.role === 'admin') {
    if (user.grade && user.grade.trim() !== '') {
      errors.push({
        row,
        field: 'Grade',
        message: 'Grade should be empty for admins'
      });
    }
    if (user.teacherId && user.teacherId.trim() !== '') {
      errors.push({
        row,
        field: 'Teacher ID',
        message: 'Teacher ID should be empty for admins'
      });
    }
  }
  
  return errors;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    // Only accept XLSX files
    if (!file.name.endsWith('.xlsx')) {
      throw new Error('Unsupported file format. Please upload XLSX files only.');
    }

    let users: UserData[] = [];
    const errors: ValidationError[] = [];
    let createdUsers = 0;
    let skippedUsers = 0;
    const startTime = Date.now();

    // Parse XLSX file
    const xlsxContent = await file.arrayBuffer();
    users = parseXLSX(xlsxContent);

    // Check maximum users limit
    if (users.length > 1000) {
      return new Response(JSON.stringify({
        success: false,
        totalRows: users.length,
        createdUsers: 0,
        errors: [{
          row: 0,
          field: 'File',
          message: `Maximum 1000 users allowed per upload. Found ${users.length} users.`
        }],
        message: 'File exceeds maximum user limit'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Validate all users
    for (let i = 0; i < users.length; i++) {
      const userErrors = validateUserData(users[i], i + 2); // +2 because of header row and 1-based indexing
      errors.push(...userErrors);
    }

    // Check for duplicate emails
    const emails = users.map(u => u.email.toLowerCase());
    const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index);
    
    for (const email of duplicateEmails) {
      const indices = emails.map((e, i) => e === email ? i : -1).filter(i => i !== -1);
      for (const index of indices) {
        errors.push({
          row: index + 2,
          field: 'Email',
          message: 'Duplicate email address'
        });
      }
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        totalRows: users.length,
        createdUsers: 0,
        errors,
        message: 'Validation failed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Check for existing users with optimized query
    const existingEmails = await supabaseAdmin
      .from('profiles')
      .select('email')
      .in('email', emails)
      .limit(1000); // Add limit for safety

    // Filter out existing users and count them as skipped
    if (existingEmails.data && existingEmails.data.length > 0) {
      const existingEmailSet = new Set(existingEmails.data.map(u => u.email.toLowerCase()));
      users = users.filter(user => {
        if (existingEmailSet.has(user.email.toLowerCase())) {
          skippedUsers++;
          return false; // Remove from users array
        }
        return true; // Keep in users array
      });
    }

    // Create users with batch processing and rate limiting
    const batchSize = 50; // Process 50 users at a time
    const rateLimitDelay = 100; // 100ms delay between batches
    let batchesProcessed = 0;
    
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const batchPromises = batch.map(async (user, batchIndex) => {
        const userIndex = i + batchIndex;
        
        try {
          // Additional email validation
          const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
          if (!emailRegex.test(user.email)) {
            errors.push({
              row: userIndex + 2,
              field: 'Email',
              message: `Invalid email format: ${user.email}`
            });
            return;
          }

          const userMetaData: { [key: string]: any } = {
            role: user.role,
            first_name: user.firstName,
            last_name: user.lastName,
            password_setup_required: true,
          };

          if (user.role === 'student' && user.grade) {
            userMetaData.grade = user.grade;
          } else if (user.role === 'teacher' && user.teacherId) {
            userMetaData.teacher_id = user.teacherId;
          }

          const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(user.email, {
            data: userMetaData,
          });

          if (error) {
            console.error(`Error creating user ${user.email}:`, error);
            errors.push({
              row: userIndex + 2,
              field: 'Email',
              message: `Failed to create user: ${error.message}`
            });
          } else {
            console.log(`Successfully created user: ${user.email}`);
            createdUsers++;
          }
        } catch (error) {
          console.error(`Exception creating user ${user.email}:`, error);
          errors.push({
            row: userIndex + 2,
            field: 'Email',
            message: `Failed to create user: ${error.message}`
          });
        }
      });

      // Process batch concurrently
      await Promise.all(batchPromises);
      batchesProcessed++;
      
      // Rate limiting delay between batches (except for the last batch)
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
      }
    }

    const processingTime = Date.now() - startTime;
    const result: UploadResult = {
      success: errors.length === 0,
      totalRows: users.length + skippedUsers, // Include skipped users in total
      createdUsers,
      skippedUsers,
      errors,
      message: errors.length === 0 
        ? `Successfully created ${createdUsers} users${skippedUsers > 0 ? `, skipped ${skippedUsers} existing users` : ''} in ${(processingTime / 1000).toFixed(2)}s` 
        : `Created ${createdUsers} users${skippedUsers > 0 ? `, skipped ${skippedUsers} existing users` : ''} with ${errors.length} errors in ${(processingTime / 1000).toFixed(2)}s`,
      processingTime,
      batchesProcessed
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: errors.length === 0 ? 200 : 207, // 207 for partial success
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
