import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

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
  errors: ValidationError[];
  message: string;
}

// Parse CSV content
function parseCSV(csvContent: string): UserData[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Validate headers
  const requiredHeaders = ['First Name', 'Last Name', 'Email', 'Role'];
  const optionalHeaders = ['Grade', 'Teacher ID'];
  const allHeaders = [...requiredHeaders, ...optionalHeaders];
  
  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      throw new Error(`Missing required header: ${header}`);
    }
  }
  
  const users: UserData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim());
    const user: any = {};
    
    headers.forEach((header, index) => {
      user[header] = values[index] || '';
    });
    
    users.push({
      firstName: user['First Name'],
      lastName: user['Last Name'],
      email: user['Email'],
      role: user['Role'],
      grade: user['Grade'] || undefined,
      teacherId: user['Teacher ID'] || undefined,
    });
  }
  
  return users;
}

// Parse XLSX content (simplified - you might want to use a proper XLSX library)
function parseXLSX(xlsxContent: ArrayBuffer): UserData[] {
  // For now, we'll convert XLSX to CSV format
  // In production, you'd want to use a proper XLSX parser like 'xlsx' library
  const decoder = new TextDecoder('utf-8');
  const csvContent = decoder.decode(xlsxContent);
  return parseCSV(csvContent);
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

    let users: UserData[] = [];
    const errors: ValidationError[] = [];
    let createdUsers = 0;

    // Parse file based on type
    if (file.name.endsWith('.csv')) {
      const csvContent = await file.text();
      users = parseCSV(csvContent);
    } else if (file.name.endsWith('.xlsx')) {
      const xlsxContent = await file.arrayBuffer();
      users = parseXLSX(xlsxContent);
    } else {
      throw new Error('Unsupported file format. Please upload CSV or XLSX files only.');
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

    // Check for existing users
    const existingEmails = await supabaseAdmin
      .from('profiles')
      .select('email')
      .in('email', emails);

    if (existingEmails.data && existingEmails.data.length > 0) {
      const existingEmailList = existingEmails.data.map(u => u.email);
      for (const email of existingEmailList) {
        const userIndex = emails.indexOf(email.toLowerCase());
        errors.push({
          row: userIndex + 2,
          field: 'Email',
          message: 'User with this email already exists'
        });
      }
      
      if (errors.length > 0) {
        return new Response(JSON.stringify({
          success: false,
          totalRows: users.length,
          createdUsers: 0,
          errors,
          message: 'Some users already exist'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
    }

    // Create users
    for (const user of users) {
      try {
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
          errors.push({
            row: users.indexOf(user) + 2,
            field: 'Email',
            message: `Failed to create user: ${error.message}`
          });
        } else {
          createdUsers++;
        }
      } catch (error) {
        errors.push({
          row: users.indexOf(user) + 2,
          field: 'Email',
          message: `Failed to create user: ${error.message}`
        });
      }
    }

    const result: UploadResult = {
      success: errors.length === 0,
      totalRows: users.length,
      createdUsers,
      errors,
      message: errors.length === 0 
        ? `Successfully created ${createdUsers} users` 
        : `Created ${createdUsers} users with ${errors.length} errors`
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
