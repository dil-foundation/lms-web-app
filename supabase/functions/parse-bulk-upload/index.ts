import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

interface CourseData {
  courseTitle: string;
  courseSubtitle: string;
  courseDescription: string;
  category: string;
  language: string;
  level: string;
  countryCodes: string[];
  regionCodes: string[];
  cityCodes: string[];
  projectCodes: string[];
  boardCodes: string[];
  schoolCodes: string[];
  classCodes: string[];
  requirements: string[];
  learningOutcomes: string[];
  duration: string;
  sections: CourseSection[];
}

interface CourseSection {
  title: string;
  overview: string;
  lessons: CourseLesson[];
}

interface CourseLesson {
  title: string;
  overview: string;
  contentItems: CourseContentItem[];
}

interface CourseContentItem {
  type: 'video' | 'attachment' | 'assignment' | 'quiz';
  title: string;
  path?: string;
  dueDate?: string;
  assignmentInstructions?: string;
}

// Parse XLSX content using proper XLSX library
function parseXLSX(xlsxContent: ArrayBuffer): CourseData[] {
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
    console.log('Headers found:', headers);
    
    // Validate required headers
    const requiredHeaders = ['Course Title', 'Category', 'Language', 'Level'];
    for (const header of requiredHeaders) {
      if (!headers.includes(header)) {
        throw new Error(`Missing required header: ${header}`);
      }
    }
    
    const courses: CourseData[] = [];
    
    // Process data rows (skip header row)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (!row || row.length === 0) continue;
      
      console.log(`Processing row ${i + 1}:`, row);
      
      // Create course object from row data
      const course: any = {};
      headers.forEach((header, index) => {
        course[header] = row[index] || '';
      });
      
      console.log('Parsed course object:', course);
      
      // Only add if we have the minimum required data
      if (course['Course Title'] && course['Category'] && course['Language'] && course['Level']) {
        const parsedCourse: CourseData = {
          courseTitle: course['Course Title'].toString().trim(),
          courseSubtitle: course['Course Subtitle'] ? course['Course Subtitle'].toString().trim() : '',
          courseDescription: course['Course Description'] ? course['Course Description'].toString().trim() : '',
          category: course['Category'].toString().trim(),
          language: course['Language'].toString().trim(),
          level: course['Level'].toString().trim(),
          countryCodes: course['Country Codes'] ? course['Country Codes'].toString().split(',').map((c: string) => c.trim()).filter((c: string) => c) : [],
          regionCodes: course['Region Codes'] ? course['Region Codes'].toString().split(',').map((c: string) => c.trim()).filter((c: string) => c) : [],
          cityCodes: course['City Codes'] ? course['City Codes'].toString().split(',').map((c: string) => c.trim()).filter((c: string) => c) : [],
          projectCodes: course['Project Codes'] ? course['Project Codes'].toString().split(',').map((c: string) => c.trim()).filter((c: string) => c) : [],
          boardCodes: course['Board Codes'] ? course['Board Codes'].toString().split(',').map((c: string) => c.trim()).filter((c: string) => c) : [],
          schoolCodes: course['School Codes'] ? course['School Codes'].toString().split(',').map((c: string) => c.trim()).filter((c: string) => c) : [],
          classCodes: course['Class Codes'] ? course['Class Codes'].toString().split(',').map((c: string) => c.trim()).filter((c: string) => c) : [],
          requirements: course['Requirements'] ? course['Requirements'].toString().split(',').map((r: string) => r.trim()).filter((r: string) => r) : [],
          learningOutcomes: course['Learning Outcomes'] ? course['Learning Outcomes'].toString().split(',').map((o: string) => o.trim()).filter((o: string) => o) : [],
          duration: course['Duration'] ? course['Duration'].toString().trim() : '',
          sections: parseSections(course)
        };
        
        console.log('Fully parsed course:', parsedCourse);
        courses.push(parsedCourse);
      }
    }
    
    console.log('Total courses parsed:', courses.length);
    return courses;
  } catch (error) {
    console.error('Error parsing XLSX:', error);
    throw new Error(`Failed to parse XLSX file: ${error.message}`);
  }
}

// Parse sections from the course data
function parseSections(course: any): CourseSection[] {
  const sections: CourseSection[] = [];
  
  // Look for section patterns like "Section 1 Title", "Section 2 Title", etc.
  let sectionIndex = 1;
  while (course[`Section ${sectionIndex} Title`]) {
    const sectionTitle = course[`Section ${sectionIndex} Title`].toString().trim();
    const sectionOverview = course[`Section ${sectionIndex} Overview`] ? course[`Section ${sectionIndex} Overview`].toString().trim() : '';
    
    if (sectionTitle) {
      const section: CourseSection = {
        title: sectionTitle,
        overview: sectionOverview,
        lessons: parseLessons(course, sectionIndex)
      };
      
      console.log(`Parsed section ${sectionIndex}:`, section);
      sections.push(section);
    }
    
    sectionIndex++;
  }
  
  return sections;
}

// Parse lessons for a specific section
function parseLessons(course: any, sectionIndex: number): CourseLesson[] {
  const lessons: CourseLesson[] = [];
  
  // Look for lesson patterns like "Lesson 1.1 Title", "Lesson 1.2 Title", etc.
  let lessonIndex = 1;
  while (course[`Lesson ${sectionIndex}.${lessonIndex} Title`]) {
    const lessonTitle = course[`Lesson ${sectionIndex}.${lessonIndex} Title`].toString().trim();
    const lessonOverview = course[`Lesson ${sectionIndex}.${lessonIndex} Overview`] ? course[`Lesson ${sectionIndex}.${lessonIndex} Overview`].toString().trim() : '';
    
    if (lessonTitle) {
      const lesson: CourseLesson = {
        title: lessonTitle,
        overview: lessonOverview,
        contentItems: parseContentItems(course, sectionIndex, lessonIndex)
      };
      
      console.log(`Parsed lesson ${sectionIndex}.${lessonIndex}:`, lesson);
      lessons.push(lesson);
    }
    
    lessonIndex++;
  }
  
  return lessons;
}

// Parse content items for a specific lesson
function parseContentItems(course: any, sectionIndex: number, lessonIndex: number): CourseContentItem[] {
  const contentItems: CourseContentItem[] = [];
  
  console.log(`\n=== CONTENT PARSING DEBUG ===`);
  console.log(`Parsing content for section ${sectionIndex}, lesson ${lessonIndex}`);
  console.log(`Raw course object keys:`, Object.keys(course));
  console.log(`Looking for content patterns like: Content ${sectionIndex}.${lessonIndex}.1 Type`);
  console.log(`Available content-related keys:`, Object.keys(course).filter(key => key.includes('Content')));
  
  // Look for content patterns like "Content 1.1.1 Type", "Content 1.1.2 Type", etc.
  let contentIndex = 1;
  while (course[`Content ${sectionIndex}.${lessonIndex}.${contentIndex} Type`]) {
    console.log(`\n--- Processing Content ${sectionIndex}.${lessonIndex}.${contentIndex} ---`);
    
    const contentType = course[`Content ${sectionIndex}.${lessonIndex}.${contentIndex} Type`].toString().trim();
    const contentTitle = course[`Content ${sectionIndex}.${lessonIndex}.${contentIndex} Title`] ? course[`Content ${sectionIndex}.${lessonIndex}.${contentIndex} Title`].toString().trim() : '';
    const contentPath = course[`Content ${sectionIndex}.${lessonIndex}.${contentIndex} Path`] ? course[`Content ${sectionIndex}.${lessonIndex}.${contentIndex} Path`].toString().trim() : '';
    const dueDate = course[`Content ${sectionIndex}.${lessonIndex}.${contentIndex} Due Date (YYYY-MM-DD)`] ? course[`Content ${sectionIndex}.${lessonIndex}.${contentIndex} Due Date (YYYY-MM-DD)`].toString().trim() : '';
    const assignmentInstructions = course[`Content ${sectionIndex}.${lessonIndex}.${contentIndex} Assignment Instructions`] ? course[`Content ${sectionIndex}.${lessonIndex}.${contentIndex} Assignment Instructions`].toString().trim() : '';
    
    console.log(`Raw values:`);
    console.log(`  Type: "${contentType}"`);
    console.log(`  Title: "${contentTitle}"`);
    console.log(`  Path: "${contentPath}"`);
    console.log(`  Due Date: "${dueDate}"`);
    console.log(`  Assignment Instructions: "${assignmentInstructions}"`);
    
    console.log(`🔍 Validating content item...`);
    console.log(`  Content Type: "${contentType}"`);
    console.log(`  Valid types: ['video', 'attachment', 'assignment', 'quiz']`);
    console.log(`  Is valid type: ${['video', 'attachment', 'assignment', 'quiz'].includes(contentType)}`);
    console.log(`  Content Type exists: ${!!contentType}`);
    console.log(`  Content Type length: ${contentType?.length || 0}`);
    
    if (contentType && ['video', 'attachment', 'assignment', 'quiz'].includes(contentType)) {
      const contentItem: CourseContentItem = {
        type: contentType as 'video' | 'attachment' | 'assignment' | 'quiz',
        title: contentTitle,
        path: contentPath || undefined,
        dueDate: dueDate || undefined,
        assignmentInstructions: assignmentInstructions || undefined
      };
      
      console.log(`✅ Valid content item created:`, contentItem);
      contentItems.push(contentItem);
    } else {
      console.log(`❌ Invalid content type or empty: "${contentType}"`);
      console.log(`❌ Content type validation failed. Skipping this content item.`);
    }
    
    contentIndex++;
  }
  
  console.log(`Total content items parsed: ${contentItems.length}`);
  console.log(`=== END CONTENT PARSING DEBUG ===\n`);
  
  return contentItems;
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

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authorization header required'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid authentication token'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    // Only accept XLSX files
    if (!file.name.endsWith('.xlsx')) {
      throw new Error('Unsupported file format. Please upload XLSX files only.');
    }

    console.log('🚀 Starting file parsing...');
    console.log('📁 File name:', file.name);
    console.log('📁 File size:', file.size);
    console.log('📁 File type:', file.type);

    // Parse XLSX file
    const xlsxContent = await file.arrayBuffer();
    const courses = parseXLSX(xlsxContent);

    // Validate courses count
    if (courses.length > 100) {
      return new Response(JSON.stringify({
        success: false,
        error: `Maximum 100 courses allowed per upload. Found ${courses.length} courses.`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`✅ Successfully parsed ${courses.length} courses`);

    // Return parsed data for frontend processing
    return new Response(JSON.stringify({
      success: true,
      courses: courses,
      totalCourses: courses.length,
      message: `Successfully parsed ${courses.length} courses. Ready for batch processing.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('❌ Parse error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
