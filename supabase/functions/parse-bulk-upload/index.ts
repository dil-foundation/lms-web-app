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

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

// Validate course data
function validateCourseData(course: CourseData, row: number, referenceData: any): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Validate course title (optional for draft)
  if (course.courseTitle && course.courseTitle.trim().length > 100) {
    errors.push({
      row,
      field: 'Course Title',
      message: 'Title must be 100 characters or less'
    });
  }
  
  // Validate course subtitle (optional for draft)
  if (course.courseSubtitle && course.courseSubtitle.trim().length > 150) {
    errors.push({
      row,
      field: 'Course Subtitle',
      message: 'Subtitle must be 150 characters or less'
    });
  }
  
  // Validate course description (optional for draft)
  if (course.courseDescription && course.courseDescription.trim().length > 0 && course.courseDescription.trim().length < 20) {
    errors.push({
      row,
      field: 'Course Description',
      message: 'Description must be at least 20 characters if provided'
    });
  }
  
  // Validate category against database (if provided)
  if (course.category && course.category.trim().length > 0) {
    const categoryExists = referenceData.categories.some((cat: any) => cat.name.toLowerCase() === course.category.toLowerCase());
    if (!categoryExists) {
      errors.push({
        row,
        field: 'Category',
        message: `Category "${course.category}" does not exist, please create the category`
      });
    }
  }
  
  // Validate language against database (if provided)
  if (course.language && course.language.trim().length > 0) {
    const languageExists = referenceData.languages.some((lang: any) => lang.name.toLowerCase() === course.language.toLowerCase());
    if (!languageExists) {
      errors.push({
        row,
        field: 'Language',
        message: `Language "${course.language}" does not exist, please create the language`
      });
    }
  }
  
  // Validate level against database (if provided)
  if (course.level && course.level.trim().length > 0) {
    const levelExists = referenceData.levels.some((level: any) => level.name.toLowerCase() === course.level.toLowerCase());
    if (!levelExists) {
      errors.push({
        row,
        field: 'Level',
        message: `Level "${course.level}" does not exist, please create the level`
      });
    }
  }
  
  // Validate country codes against database (if provided)
  if (course.countryCodes && course.countryCodes.length > 0) {
    for (const code of course.countryCodes) {
      const countryExists = referenceData.countries.some((country: any) => country.code.toLowerCase() === code.toLowerCase());
      if (!countryExists) {
        errors.push({
          row,
          field: 'Country Codes',
          message: `Country code "${code}" does not exist, please create the country`
        });
      }
    }
  }
  
  // Validate region codes against database (if provided)
  if (course.regionCodes && course.regionCodes.length > 0) {
    for (const code of course.regionCodes) {
      const regionExists = referenceData.regions.some((region: any) => region.code.toLowerCase() === code.toLowerCase());
      if (!regionExists) {
        errors.push({
          row,
          field: 'Region Codes',
          message: `Region code "${code}" does not exist, please create the region`
        });
      }
    }
  }
  
  // Validate city codes against database (if provided)
  if (course.cityCodes && course.cityCodes.length > 0) {
    for (const code of course.cityCodes) {
      const cityExists = referenceData.cities.some((city: any) => city.code.toLowerCase() === code.toLowerCase());
      if (!cityExists) {
        errors.push({
          row,
          field: 'City Codes',
          message: `City code "${code}" does not exist, please create the city`
        });
      }
    }
  }
  
  // Validate project codes against database (if provided)
  if (course.projectCodes && course.projectCodes.length > 0) {
    for (const code of course.projectCodes) {
      const projectExists = referenceData.projects.some((project: any) => project.code.toLowerCase() === code.toLowerCase());
      if (!projectExists) {
        errors.push({
          row,
          field: 'Project Codes',
          message: `Project code "${code}" does not exist, please create the project`
        });
      }
    }
  }
  
  // Validate board codes against database (if provided)
  if (course.boardCodes && course.boardCodes.length > 0) {
    for (const code of course.boardCodes) {
      const boardExists = referenceData.boards.some((board: any) => board.code.toLowerCase() === code.toLowerCase());
      if (!boardExists) {
        errors.push({
          row,
          field: 'Board Codes',
          message: `Board code "${code}" does not exist, please create the board`
        });
      }
    }
  }
  
  // Validate school codes against database (if provided)
  if (course.schoolCodes && course.schoolCodes.length > 0) {
    for (const code of course.schoolCodes) {
      const schoolExists = referenceData.schools.some((school: any) => school.code.toLowerCase() === code.toLowerCase());
      if (!schoolExists) {
        errors.push({
          row,
          field: 'School Codes',
          message: `School code "${code}" does not exist, please create the school`
        });
      }
    }
  }
  
  // Validate class codes against database (if provided)
  if (course.classCodes && course.classCodes.length > 0) {
    for (const code of course.classCodes) {
      const classExists = referenceData.classes.some((cls: any) => cls.code.toLowerCase() === code.toLowerCase());
      if (!classExists) {
        errors.push({
          row,
          field: 'Class Codes',
          message: `Class code "${code}" does not exist, please create the class`
        });
      }
    }
  }
  
  // Validate duration (optional)
  if (course.duration && course.duration.trim().length > 0) {
    if (course.duration.trim().length < 3 || course.duration.trim().length > 50) {
      errors.push({
        row,
        field: 'Duration',
        message: 'Duration must be 3-50 characters if provided'
      });
    }
  }
  
  // Validate sections (optional for draft)
  if (course.sections.length > 0) {
    for (let i = 0; i < course.sections.length; i++) {
      const section = course.sections[i];
      
      // Validate section title
      if (!section.title || section.title.trim().length < 3 || section.title.trim().length > 100) {
        errors.push({
          row,
          field: `Section ${i + 1} Title`,
          message: 'Section title must be 3-100 characters'
        });
      }
      
      // Validate section overview (optional)
      if (section.overview && (section.overview.trim().length < 5 || section.overview.trim().length > 500)) {
        errors.push({
          row,
          field: `Section ${i + 1} Overview`,
          message: 'Section overview must be 5-500 characters if provided'
        });
      }
      
      // Validate lessons (optional for draft)
      if (section.lessons.length > 0) {
        for (let j = 0; j < section.lessons.length; j++) {
          const lesson = section.lessons[j];
          
          // Validate lesson title
          if (!lesson.title || lesson.title.trim().length < 3 || lesson.title.trim().length > 100) {
            errors.push({
              row,
              field: `Lesson ${i + 1}.${j + 1} Title`,
              message: 'Lesson title must be 3-100 characters'
            });
          }
          
          // Validate lesson overview (optional)
          if (lesson.overview && (lesson.overview.trim().length < 5 || lesson.overview.trim().length > 500)) {
            errors.push({
              row,
              field: `Lesson ${i + 1}.${j + 1} Overview`,
              message: 'Lesson overview must be 5-500 characters if provided'
            });
          }
          
          // Validate content items
          for (let k = 0; k < lesson.contentItems.length; k++) {
            const content = lesson.contentItems[k];
            
            // Validate content type
            if (!['video', 'attachment', 'assignment', 'quiz'].includes(content.type)) {
              errors.push({
                row,
                field: `Content ${i + 1}.${j + 1}.${k + 1} Type`,
                message: 'Content type must be one of: video, attachment, assignment, quiz'
              });
            }
            
            // Validate content title
            if (!content.title || content.title.trim().length < 3 || content.title.trim().length > 100) {
              errors.push({
                row,
                field: `Content ${i + 1}.${j + 1}.${k + 1} Title`,
                message: 'Content title must be 3-100 characters'
              });
            }
            
            // Validate content path for video and attachment types
            if ((content.type === 'video' || content.type === 'attachment') && (!content.path || content.path.trim().length === 0)) {
              errors.push({
                row,
                field: `Content ${i + 1}.${j + 1}.${k + 1} Path`,
                message: 'Path is required for video and attachment content types'
              });
            }

            // For assignments, validate that either path (attachment) or instructions are provided
            if (content.type === 'assignment') {
              const hasPath = content.path && content.path.trim().length > 0;
              const hasInstructions = content.assignmentInstructions && content.assignmentInstructions.trim().length > 0;
              
              if (!hasPath && !hasInstructions) {
                errors.push({
                  row,
                  field: `Content ${i + 1}.${j + 1}.${k + 1}`,
                  message: 'Assignment must have either a content path (attachment) or assignment instructions'
                });
              }
            }

            // Validate assignment instructions for assignment type
            if (content.type === 'assignment' && content.assignmentInstructions && content.assignmentInstructions.trim().length < 10) {
              errors.push({
                row,
                field: `Content ${i + 1}.${j + 1}.${k + 1} Assignment Instructions`,
                message: 'Assignment instructions must be at least 10 characters if provided'
              });
            }
          }
        }
      }
    }
  }
  
  return errors;
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

    // Fetch reference data for validation
    console.log('🔍 Fetching reference data for validation...');
    const [categoriesRes, languagesRes, levelsRes, countriesRes, regionsRes, citiesRes, projectsRes, boardsRes, schoolsRes, classesRes] = await Promise.all([
      supabaseAdmin.from('course_categories').select('id, name'),
      supabaseAdmin.from('course_languages').select('id, name'),
      supabaseAdmin.from('course_levels').select('id, name'),
      supabaseAdmin.from('countries').select('id, name, code'),
      supabaseAdmin.from('regions').select('id, name, code'),
      supabaseAdmin.from('cities').select('id, name, code'),
      supabaseAdmin.from('projects').select('id, name, code'),
      supabaseAdmin.from('boards').select('id, name, code'),
      supabaseAdmin.from('schools').select('id, name, code'),
      supabaseAdmin.from('classes').select('id, name, code')
    ]);

    const categories = categoriesRes.data || [];
    const languages = languagesRes.data || [];
    const levels = levelsRes.data || [];
    const countries = countriesRes.data || [];
    const regions = regionsRes.data || [];
    const cities = citiesRes.data || [];
    const projects = projectsRes.data || [];
    const boards = boardsRes.data || [];
    const schools = schoolsRes.data || [];
    const classes = classesRes.data || [];

    const referenceData = {
      categories,
      languages,
      levels,
      countries,
      regions,
      cities,
      projects,
      boards,
      schools,
      classes
    };

    // Validate all courses
    console.log('🔍 Validating all courses...');
    const errors: ValidationError[] = [];
    for (let i = 0; i < courses.length; i++) {
      const courseErrors = validateCourseData(courses[i], i + 1, referenceData);
      errors.push(...courseErrors);
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        errors,
        message: 'Validation failed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`✅ All courses validated successfully`);

    // Return parsed data for frontend processing
    return new Response(JSON.stringify({
      success: true,
      courses: courses,
      totalCourses: courses.length,
      message: `Successfully parsed and validated ${courses.length} courses. Ready for batch processing.`
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
