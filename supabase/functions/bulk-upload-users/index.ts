import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'teacher' | 'admin' | 'content_creator' | 'super_user' | 'view_only';
  grade?: string;
  teacherId?: string;
  gender?: string;
  schoolName?: string;
  project?: string;
  city?: string;
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
    
    // Map expected headers to their variations
    const headerMap: { [key: string]: string[] } = {
      'firstName': ['First Name', 'FirstName', 'first_name'],
      'lastName': ['Last Name', 'LastName', 'last_name'],
      'email': ['Email Address', 'Email', 'email'],
      'role': ['Role', 'role', 'User Role', 'User_Role'],
      'grade': ['Class/Grade', 'Grade', 'Class', 'grade', 'class'],
      'teacherId': ['Teacher ID', 'TeacherID', 'teacher_id', 'TeacherId'],
      'gender': ['Gender', 'gender'],
      'schoolName': ['School Name', 'SchoolName', 'school_name', 'School'],
      'project': ['Project', 'project'],
      'city': ['City', 'city']
    };

    // Find header mappings
    const fieldHeaders: { [key: string]: string } = {};
    for (const [field, variations] of Object.entries(headerMap)) {
      for (const variation of variations) {
        if (headers.includes(variation)) {
          fieldHeaders[field] = variation;
          break;
        }
      }
    }

    // Validate required headers
    const requiredHeaders = ['firstName', 'lastName', 'email', 'role'];
    for (const field of requiredHeaders) {
      if (!fieldHeaders[field]) {
        const variations = headerMap[field].join(', ');
        throw new Error(`Missing required header for ${field}. Expected one of: ${variations}`);
      }
    }
    
    const users: UserData[] = [];
    const parsingErrors: ValidationError[] = [];
    
    // Process data rows (skip header row)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (!row || row.length === 0) continue;
      
      const rowNumber = i + 1; // +1 because row 1 is header, so row 2 is i=1
      
      // Create user object from row data
      const user: any = {};
      headers.forEach((header, index) => {
        user[header] = row[index] || '';
      });
      
      // Extract and validate required fields
      const firstName = user[fieldHeaders.firstName]?.toString().trim();
      const lastName = user[fieldHeaders.lastName]?.toString().trim();
      const email = user[fieldHeaders.email]?.toString().trim().toLowerCase();
      const role = user[fieldHeaders.role]?.toString().trim().toLowerCase();
      
      // Validate required fields before adding to users array
      let hasRequiredFields = true;
      
      if (!firstName || firstName === '') {
        parsingErrors.push({
          row: rowNumber,
          field: 'First Name',
          message: 'First Name is required'
        });
        hasRequiredFields = false;
      }
      
      if (!lastName || lastName === '') {
        parsingErrors.push({
          row: rowNumber,
          field: 'Last Name',
          message: 'Last Name is required'
        });
        hasRequiredFields = false;
      }
      
      if (!email || email === '') {
        parsingErrors.push({
          row: rowNumber,
          field: 'Email Address',
          message: 'Email Address is required'
        });
        hasRequiredFields = false;
      }
      
      if (!role || role === '') {
        parsingErrors.push({
          row: rowNumber,
          field: 'Role',
          message: 'Role is required'
        });
        hasRequiredFields = false;
      }
      
      // Only add to users array if all required fields are present
      if (hasRequiredFields) {
        users.push({
          firstName,
          lastName,
          email,
          role: role as 'student' | 'teacher' | 'admin' | 'content_creator' | 'super_user' | 'view_only',
          grade: fieldHeaders.grade ? user[fieldHeaders.grade]?.toString().trim() : undefined,
          teacherId: fieldHeaders.teacherId ? user[fieldHeaders.teacherId]?.toString().trim() : undefined,
          gender: fieldHeaders.gender ? user[fieldHeaders.gender]?.toString().trim() : undefined,
          schoolName: fieldHeaders.schoolName ? user[fieldHeaders.schoolName]?.toString().trim() : undefined,
          project: fieldHeaders.project ? user[fieldHeaders.project]?.toString().trim() : undefined,
          city: fieldHeaders.city ? user[fieldHeaders.city]?.toString().trim() : undefined,
        });
      }
    }
    
    // If there are parsing errors, throw them so they can be caught and returned
    if (parsingErrors.length > 0) {
      throw new Error(JSON.stringify({ parsingErrors }));
    }
    
    return users;
  } catch (error: any) {
    // Don't wrap parsing errors - check if error message contains parsingErrors
    try {
      const parsed = JSON.parse(error.message);
      if (parsed.parsingErrors) {
        throw error; // Re-throw the original error with parsingErrors
      }
    } catch {
      // Not a parsing error, wrap it
    }
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
      field: 'Email Address',
      message: 'Please enter a valid email address'
    });
  }
  
  // Validate role
  const validRoles = ['student', 'teacher', 'admin', 'content_creator', 'super_user', 'view_only'];
  if (!validRoles.includes(user.role)) {
    errors.push({
      row,
      field: 'Role',
      message: 'Role must be one of: student, teacher, admin, content_creator, super_user, view_only'
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
        message: 'Teacher ID is required and must be at least 3 characters for teachers'
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
  
  if (['admin', 'content_creator', 'super_user', 'view_only'].includes(user.role)) {
    if (user.grade && user.grade.trim() !== '') {
      errors.push({
        row,
        field: 'Grade',
        message: `Grade should be empty for ${user.role} role`
      });
    }
    if (user.teacherId && user.teacherId.trim() !== '') {
      errors.push({
        row,
        field: 'Teacher ID',
        message: `Teacher ID should be empty for ${user.role} role`
      });
    }
  }
  
  // Validate grade if provided
  if (user.grade) {
    const validGrades = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    if (!validGrades.includes(user.grade)) {
      errors.push({
        row,
        field: 'Class/Grade',
        message: 'Grade must be between 1 and 12'
      });
    }
  }
  
  // Validate gender if provided
  if (user.gender) {
    const validGenders = ['male', 'female', 'other'];
    if (!validGenders.includes(user.gender.toLowerCase())) {
      errors.push({
        row,
        field: 'Gender',
        message: 'Gender must be Male, Female, or Other'
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
    try {
      users = parseXLSX(xlsxContent);
    } catch (parseError: any) {
      // Check if this is a parsing error with validation details
      let parsingErrors = null;
      
      // Try direct parse first
      try {
        const errorData = JSON.parse(parseError.message);
        if (errorData.parsingErrors) {
          parsingErrors = errorData.parsingErrors;
        }
      } catch {
        // If direct parse fails, check if it's wrapped in "Failed to parse XLSX file: "
        const wrappedMatch = parseError.message.match(/Failed to parse XLSX file: (.+)/);
        if (wrappedMatch) {
          try {
            const errorData = JSON.parse(wrappedMatch[1]);
            if (errorData.parsingErrors) {
              parsingErrors = errorData.parsingErrors;
            }
          } catch {
            // Not a parsing error
          }
        }
      }
      
      if (parsingErrors) {
        return new Response(JSON.stringify({
          success: false,
          totalRows: 0,
          createdUsers: 0,
          errors: parsingErrors,
          message: 'Validation failed: Missing required fields'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      
      // If parsing fails, it's a different error - throw it
      throw parseError;
    }

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
          field: 'Email Address',
          message: 'Duplicate email address in file'
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

    // Create users with sequential processing and rate limiting
    // Respects SMTP rate limits: 100 emails/hour and 1 second minimum interval
    const delayBetweenEmails = 1200; // 1.2 seconds between emails (respects 1 second minimum + buffer)
    let batchesProcessed = 0;
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const userIndex = i;
      
      try {
        // Additional email validation
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!emailRegex.test(user.email)) {
          errors.push({
            row: userIndex + 2,
            field: 'Email Address',
            message: `Invalid email format: ${user.email}`
          });
          continue;
        }

        const userMetaData: { [key: string]: any } = {
          role: user.role,
          first_name: user.firstName,
          last_name: user.lastName,
          password_setup_required: true,
          gender: user.gender?.toLowerCase(),
          school_name: user.schoolName,
          project: user.project,
          city: user.city,
        };

        // Add role-specific metadata
        if (user.role === 'student' && user.grade) {
          userMetaData.grade = user.grade;
        } else if (user.role === 'teacher' && user.teacherId) {
          userMetaData.teacher_id = user.teacherId;
        }

        const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(user.email, {
          data: userMetaData,
          redirectTo: `${Deno.env.get('APP_URL')}/dashboard/profile-settings?source=reset`,
        });

        if (error) {
          console.error(`Error creating user ${user.email}:`, error);
          errors.push({
            row: userIndex + 2,
            field: 'Email Address',
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
          field: 'Email Address',
          message: `Failed to create user: ${error.message}`
        });
      }

      // Rate limiting delay between emails (except for the last user)
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenEmails));
      }
      
      // Track progress every 10 users
      if ((i + 1) % 10 === 0) {
        batchesProcessed++;
        console.log(`Progress: ${i + 1}/${users.length} users processed`);
      }
    }
    
    batchesProcessed = Math.ceil(users.length / 10);

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

  } catch (error: any) {
    // Check if this error contains parsing errors
    let parsingErrors = null;
    
    try {
      // Try to parse the error message directly
      const parsed = JSON.parse(error.message);
      if (parsed.parsingErrors) {
        parsingErrors = parsed.parsingErrors;
      }
    } catch {
      // If direct parse fails, check if it's wrapped in "Failed to parse XLSX file: "
      const wrappedMatch = error.message.match(/Failed to parse XLSX file: (.+)/);
      if (wrappedMatch) {
        try {
          const nestedParsed = JSON.parse(wrappedMatch[1]);
          if (nestedParsed.parsingErrors) {
            parsingErrors = nestedParsed.parsingErrors;
          }
        } catch {
          // Not a parsing error
        }
      }
    }
    
    if (parsingErrors) {
      return new Response(JSON.stringify({
        success: false,
        totalRows: 0,
        createdUsers: 0,
        errors: parsingErrors,
        message: 'Validation failed: Missing required fields'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    // Regular error - return as before
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
