import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

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

// Map API question types to database question types
function mapQuestionType(apiType: string): string {
  switch (apiType) {
    case 'single':
      return 'single_choice';
    case 'multiple':
      return 'multiple_choice';
    case 'short_answer':
      return 'text_answer';
    case 'true_or_false':
      return 'single_choice'; // True/false questions are single choice with 2 options
    case 'math_expression':
      return 'math_expression';
    default:
      return 'single_choice'; // Default fallback
  }
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

    // Parse request body
    const body = await req.json();
    const { courses, batchIndex } = body;

    if (!courses || !Array.isArray(courses)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid request: courses array is required'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Limit to 2 courses per batch
    if (courses.length > 2) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Maximum 2 courses allowed per batch'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`🚀 Processing batch ${batchIndex || 1} with ${courses.length} courses`);

    // Fetch reference data for validation
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

    // Validate all courses in this batch
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

    // Create courses in the database
    const creationErrors: ValidationError[] = [];
    let createdCourses = 0;

    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      
      console.log(`\n🏗️  Creating course ${i + 1}/${courses.length}`);
      console.log(`📚 Course title: ${course.courseTitle}`);
      
      try {
        // Get reference IDs
        const categoryId = referenceData.categories.find((cat: any) => cat.name.toLowerCase() === course.category.toLowerCase())?.id;
        const languageId = referenceData.languages.find((lang: any) => lang.name.toLowerCase() === course.language.toLowerCase())?.id;
        const levelId = referenceData.levels.find((level: any) => level.name.toLowerCase() === course.level.toLowerCase())?.id;
        
        const countryIds = course.countryCodes.map(code => 
          referenceData.countries.find((country: any) => country.code.toLowerCase() === code.toLowerCase())?.id
        ).filter(Boolean);
        
        const regionIds = course.regionCodes.map(code => 
          referenceData.regions.find((region: any) => region.code.toLowerCase() === code.toLowerCase())?.id
        ).filter(Boolean);
        
        const cityIds = course.cityCodes.map(code => 
          referenceData.cities.find((city: any) => city.code.toLowerCase() === code.toLowerCase())?.id
        ).filter(Boolean);
        
        const projectIds = course.projectCodes.map(code => 
          referenceData.projects.find((project: any) => project.code.toLowerCase() === code.toLowerCase())?.id
        ).filter(Boolean);
        
        const boardIds = course.boardCodes.map(code => 
          referenceData.boards.find((board: any) => board.code.toLowerCase() === code.toLowerCase())?.id
        ).filter(Boolean);
        
        const schoolIds = course.schoolCodes.map(code => 
          referenceData.schools.find((school: any) => school.code.toLowerCase() === code.toLowerCase())?.id
        ).filter(Boolean);
        
        const classIds = course.classCodes.map(code => 
          referenceData.classes.find((cls: any) => cls.code.toLowerCase() === code.toLowerCase())?.id
        ).filter(Boolean);

        // Create course record
        const { data: courseData, error: courseError } = await supabaseAdmin
          .from('courses')
          .insert({
            title: course.courseTitle,
            subtitle: course.courseSubtitle,
            description: course.courseDescription,
            category_id: categoryId,
            language_id: languageId,
            level_id: levelId,
            duration: course.duration,
            requirements: course.requirements,
            learning_outcomes: course.learningOutcomes,
            country_ids: countryIds,
            region_ids: regionIds,
            city_ids: cityIds,
            project_ids: projectIds,
            board_ids: boardIds,
            school_ids: schoolIds,
            class_ids: classIds,
            status: 'Draft',
            author_id: user.id
          })
          .select('id')
          .single();

        if (courseError) {
          throw courseError;
        }

        const courseId = courseData.id;

        // Create sections, lessons, and content items
        console.log(`📖 Creating ${course.sections.length} sections...`);
        for (const [sectionIndex, section] of course.sections.entries()) {
          console.log(`📖 Creating section ${sectionIndex + 1}: "${section.title}"`);
          
          const { data: sectionData, error: sectionError } = await supabaseAdmin
            .from('course_sections')
            .insert({
              course_id: courseId,
              title: section.title,
              overview: section.overview,
              position: sectionIndex
            })
            .select('id')
            .single();

          if (sectionError) {
            console.error(`❌ Error creating section ${sectionIndex + 1}:`, sectionError);
            throw sectionError;
          }
          
          console.log(`✅ Created section ${sectionIndex + 1} with ID: ${sectionData.id}`);

          for (const [lessonIndex, lesson] of section.lessons.entries()) {
            console.log(`📚 Creating lesson ${lessonIndex + 1}: "${lesson.title}"`);
            
            const { data: lessonData, error: lessonError } = await supabaseAdmin
              .from('course_lessons')
              .insert({
                section_id: sectionData.id,
                title: lesson.title,
                overview: lesson.overview,
                position: lessonIndex
              })
              .select('id')
              .single();

            if (lessonError) {
              console.error(`❌ Error creating lesson ${lessonIndex + 1}:`, lessonError);
              throw lessonError;
            }
            
            console.log(`✅ Created lesson ${lessonIndex + 1} with ID: ${lessonData.id}`);

            for (const [contentIndex, contentItem] of lesson.contentItems.entries()) {
              console.log(`\n=== PROCESSING CONTENT ITEM ${contentIndex + 1} ===`);
              console.log(`Content Type: ${contentItem.type}`);
              console.log(`Content Title: ${contentItem.title}`);
              console.log(`Content Path: ${contentItem.path}`);
              
              let contentPath = contentItem.path;

              // Handle content download for video, attachment, assignment, and quiz types (if they have a path)
              if (contentPath && (contentItem.type === 'video' || contentItem.type === 'attachment' || (contentItem.type === 'assignment' && contentPath) || contentItem.type === 'quiz')) {
                console.log(`\n=== CONTENT DOWNLOAD DEBUG ===`);
                console.log(`Content Type: ${contentItem.type}`);
                console.log(`Original Path: ${contentPath}`);
                console.log(`URL Analysis:`);
                console.log(`  - Is Google Docs: ${contentPath.includes('docs.google.com')}`);
                console.log(`  - Is Google Drive: ${contentPath.includes('drive.google.com')}`);
                console.log(`  - Is direct file URL: ${contentPath.match(/\.(pdf|doc|docx|mp4|avi|mov|jpg|png|gif)$/i) ? 'Yes' : 'No'}`);
                
                // Handle Google Drive URLs specially
                let originalGoogleDriveUrl = null;
                if (contentPath.includes('drive.google.com')) {
                  console.log(`🔄 Google Drive URL detected - converting to direct download URL`);
                  console.log(`Original URL: ${contentPath}`);
                  
                  // Store original URL for extension detection
                  originalGoogleDriveUrl = contentPath;
                  
                  // Convert Google Drive sharing URL to direct download URL
                  const fileIdMatch = contentPath.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
                  if (fileIdMatch) {
                    const fileId = fileIdMatch[1];
                    const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                    console.log(`✅ Converted to direct download URL: ${directDownloadUrl}`);
                    contentPath = directDownloadUrl;
                  } else {
                    console.log(`❌ Could not extract file ID from Google Drive URL`);
                  }
                }
                
                try {
                  // Download content from the provided URL
                  console.log(`Attempting to fetch: ${contentPath}`);
                  const response = await fetch(contentPath);
                  console.log(`Response Status: ${response.status}`);
                  console.log(`Response OK: ${response.ok}`);
                  console.log(`Response Status Text: ${response.statusText}`);
                  
                  if (response.ok) {
                    const fileBuffer = await response.arrayBuffer();
                    console.log(`File Buffer Size: ${fileBuffer.byteLength} bytes`);
                    
                    // Extract clean filename from URL (remove query parameters)
                    const urlParts = contentPath.split('?')[0]; // Remove query parameters
                    const originalFileName = urlParts.split('/').pop() || `content-${Date.now()}`;
                    console.log(`Clean base filename: ${originalFileName}`);
                    
                    // Get all response headers for debugging
                    const allHeaders = {};
                    response.headers.forEach((value, key) => {
                      allHeaders[key] = value;
                    });
                    console.log(`All Response Headers:`, allHeaders);
                    
                    // Check for content-disposition header first (most reliable for Google Drive)
                    const contentDisposition = response.headers.get('content-disposition');
                    console.log(`Content-Disposition Header: ${contentDisposition}`);
                    
                    // Determine file extension based on content type and response headers
                    let fileExtension = '';
                    const contentType = response.headers.get('content-type');
                    console.log(`Content-Type Header: ${contentType}`);
                    
                    // Try to extract filename from content-disposition header first
                    let extractedFilename = null;
                    if (contentDisposition) {
                      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                      if (filenameMatch) {
                        extractedFilename = filenameMatch[1].replace(/['"]/g, '');
                        console.log(`Extracted filename from content-disposition: ${extractedFilename}`);
                        
                        // Extract extension from the filename
                        const extMatch = extractedFilename.match(/\.([a-zA-Z0-9]+)$/);
                        if (extMatch) {
                          fileExtension = `.${extMatch[1]}`;
                          console.log(`Found extension from content-disposition filename: ${fileExtension}`);
                        }
                      }
                    }
                    
                    if (contentItem.type === 'video') {
                      console.log(`Processing video content...`);
                      if (contentType?.includes('video/mp4')) {
                        fileExtension = '.mp4';
                        console.log(`Detected MP4 video`);
                      } else if (contentType?.includes('video/webm')) {
                        fileExtension = '.webm';
                        console.log(`Detected WebM video`);
                      } else if (contentType?.includes('video/avi')) {
                        fileExtension = '.avi';
                        console.log(`Detected AVI video`);
                      } else if (contentType?.includes('video/mov')) {
                        fileExtension = '.mov';
                        console.log(`Detected MOV video`);
                      } else {
                        // Default to .mp4 for videos if content type is unclear
                        fileExtension = '.mp4';
                        console.log(`Unknown video type, defaulting to .mp4`);
                      }
                    } else if (contentItem.type === 'attachment') {
                      console.log(`Processing attachment content...`);
                      
                      // Special handling for Google Drive files
                      if (originalGoogleDriveUrl) {
                        console.log(`Google Drive file detected - attempting to determine extension`);
                        console.log(`Original Google Drive URL: ${originalGoogleDriveUrl}`);
                        
                        // If we already extracted filename from content-disposition, use it
                        if (extractedFilename && fileExtension) {
                          console.log(`Using extension from content-disposition: ${fileExtension}`);
                        } else {
                          // Try to determine from content type first (most reliable)
                          if (contentType?.includes('application/pdf')) {
                            fileExtension = '.pdf';
                            console.log(`Detected PDF from content type`);
                          } else if (contentType?.includes('application/msword')) {
                            fileExtension = '.doc';
                            console.log(`Detected Word document from content type`);
                          } else if (contentType?.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
                            fileExtension = '.docx';
                            console.log(`Detected Word document (new format) from content type`);
                          } else if (contentType?.includes('application/vnd.ms-excel')) {
                            fileExtension = '.xls';
                            console.log(`Detected Excel document from content type`);
                          } else if (contentType?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
                            fileExtension = '.xlsx';
                            console.log(`Detected Excel document (new format) from content type`);
                          } else if (contentType?.includes('image/')) {
                            if (contentType.includes('jpeg')) fileExtension = '.jpg';
                            else if (contentType.includes('png')) fileExtension = '.png';
                            else if (contentType.includes('gif')) fileExtension = '.gif';
                            else fileExtension = '.jpg';
                            console.log(`Detected image from content type: ${fileExtension}`);
                          } else if (contentType?.includes('text/')) {
                            if (contentType.includes('html')) fileExtension = '.html';
                            else if (contentType.includes('plain')) fileExtension = '.txt';
                            else fileExtension = '.txt';
                            console.log(`Detected text from content type: ${fileExtension}`);
                          } else {
                            // Try to extract from original URL as fallback
                            const urlExtMatch = originalGoogleDriveUrl.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
                            if (urlExtMatch) {
                              fileExtension = `.${urlExtMatch[1]}`;
                              console.log(`Found extension from original URL: ${fileExtension}`);
                            } else {
                              // Final fallback - use generic extension
                              fileExtension = '.bin';
                              console.log(`Could not determine extension, using .bin as fallback`);
                            }
                          }
                        }
                      } else if (contentType?.includes('application/pdf')) {
                        fileExtension = '.pdf';
                        console.log(`Detected PDF document`);
                      } else if (contentType?.includes('application/msword')) {
                        fileExtension = '.doc';
                        console.log(`Detected Word document`);
                      } else if (contentType?.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
                        fileExtension = '.docx';
                        console.log(`Detected Word document (new format)`);
                      } else if (contentType?.includes('application/vnd.ms-excel')) {
                        fileExtension = '.xls';
                        console.log(`Detected Excel document`);
                      } else if (contentType?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
                        fileExtension = '.xlsx';
                        console.log(`Detected Excel document (new format)`);
                      } else if (contentType?.includes('image/')) {
                        if (contentType.includes('jpeg')) fileExtension = '.jpg';
                        else if (contentType.includes('png')) fileExtension = '.png';
                        else if (contentType.includes('gif')) fileExtension = '.gif';
                        else fileExtension = '.jpg';
                        console.log(`Detected image: ${fileExtension}`);
                      } else {
                        // Try to extract extension from original filename
                        const originalExt = originalFileName.split('.').pop();
                        console.log(`Original extension from filename: ${originalExt}`);
                        if (originalExt && originalExt.length <= 5) {
                          fileExtension = `.${originalExt}`;
                          console.log(`Using original extension: ${fileExtension}`);
                        } else {
                          fileExtension = '.bin'; // Generic binary file
                          console.log(`No valid extension found, using .bin`);
                        }
                      }
                    } else if (contentItem.type === 'assignment') {
                      console.log(`Processing assignment content...`);
                      if (contentType?.includes('text/html')) {
                        fileExtension = '.html';
                        console.log(`Detected HTML assignment`);
                      } else if (contentType?.includes('text/plain')) {
                        fileExtension = '.txt';
                        console.log(`Detected text assignment`);
                      } else {
                        fileExtension = '.html'; // Default for assignments
                        console.log(`Unknown assignment type, defaulting to .html`);
                      }
                    } else if (contentItem.type === 'quiz') {
                      console.log(`Processing quiz content...`);
                      if (contentType?.includes('application/pdf')) {
                        fileExtension = '.pdf';
                        console.log(`Detected PDF quiz`);
                      } else if (contentType?.includes('text/html')) {
                        fileExtension = '.html';
                        console.log(`Detected HTML quiz`);
                      } else if (contentType?.includes('text/plain')) {
                        fileExtension = '.txt';
                        console.log(`Detected text quiz`);
                      } else {
                        fileExtension = '.pdf'; // Default for quiz files
                        console.log(`Unknown quiz type, defaulting to .pdf`);
                      }
                    }
                    
                    console.log(`Determined file extension: ${fileExtension}`);
                    
                    // Create filename with proper extension
                    let baseFileName;
                    let fileName;
                    
                    if (extractedFilename && fileExtension) {
                      // Use the extracted filename from content-disposition
                      baseFileName = extractedFilename.replace(fileExtension, '');
                      fileName = extractedFilename;
                      console.log(`Using extracted filename: ${fileName}`);
                    } else {
                      // Fallback to original logic
                      baseFileName = originalFileName.split('.')[0] || `content-${Date.now()}`;
                      fileName = `${baseFileName}${fileExtension}`;
                      console.log(`Using generated filename: ${fileName}`);
                    }
                    
                    const filePath = `bulk-upload-content/${courseId}/${sectionData.id}/${lessonData.id}/${contentIndex}/${fileName}`;
                    
                    console.log(`Base filename: ${baseFileName}`);
                    console.log(`Final filename: ${fileName}`);
                    console.log(`Full storage path: ${filePath}`);
                    console.log(`Uploading content with proper extension: ${fileName} (${contentType})`);
                    
                    // Upload to Supabase storage with proper content type
                    const { error: uploadError } = await supabaseAdmin.storage
                      .from('dil-lms')
                      .upload(filePath, fileBuffer, {
                        contentType: contentType || 'application/octet-stream'
                      });
                    
                    if (!uploadError) {
                      console.log(`✅ Content uploaded successfully to: ${filePath}`);
                      contentPath = filePath;
                    } else {
                      console.error(`❌ Storage upload error:`, uploadError);
                    }
                  } else {
                    console.error(`❌ Download failed with status: ${response.status}`);
                    console.error(`Response status text: ${response.statusText}`);
                    
                    // Check if it's a Google Docs/Drive URL that can't be directly downloaded
                    if (contentPath.includes('docs.google.com') || contentPath.includes('drive.google.com')) {
                      console.log(`⚠️  Google Docs/Drive URL detected - these URLs often require authentication or special handling`);
                      console.log(`⚠️  Consider using direct file URLs or making the document publicly accessible`);
                      console.log(`⚠️  For Google Docs, try: File > Share > Anyone with the link can view > Copy link`);
                      console.log(`⚠️  For Google Drive, try: Right-click > Share > Anyone with the link can view > Copy link`);
                      console.log(`⚠️  Make sure the file is shared with "Anyone with the link can view" permission`);
                    }
                  }
                } catch (downloadError) {
                  console.error(`❌ Failed to download content:`, downloadError);
                  console.error(`Error details:`, {
                    message: downloadError.message,
                    stack: downloadError.stack,
                    name: downloadError.name
                  });
                  
                  // Check if it's a Google Docs URL that can't be directly downloaded
                  if (contentPath.includes('docs.google.com') || contentPath.includes('drive.google.com')) {
                    console.log(`⚠️  Google Docs/Drive URL detected - these URLs often require authentication or special handling`);
                    console.log(`⚠️  Consider using direct file URLs or making the document publicly accessible`);
                  }
                  
                  // Continue with original path if download fails
                }
                
                console.log(`=== END CONTENT DOWNLOAD DEBUG ===\n`);
              }

              // Handle PDF quiz extraction for quiz content items
              let extractedQuizData = null;
              console.log(`\n=== QUIZ EXTRACTION CHECK ===`);
              console.log(`Content Type: ${contentItem.type}`);
              console.log(`Content Path: ${contentPath}`);
              console.log(`Path starts with bulk-upload-content/: ${contentPath && contentPath.startsWith('bulk-upload-content/')}`);
              console.log(`Is quiz type: ${contentItem.type === 'quiz'}`);
              console.log(`Has content path: ${!!contentPath}`);
              console.log(`Should trigger extraction: ${contentItem.type === 'quiz' && contentPath && contentPath.startsWith('bulk-upload-content/')}`);
              
              // Check if this should be treated as a quiz based on content type AND file extension
              const isPdfFile = contentPath && contentPath.toLowerCase().includes('.pdf');
              const isQuizType = contentItem.type === 'quiz';
              // More precise quiz detection - only consider titles that are explicitly quiz-related
              const title = contentItem.title?.toLowerCase() || '';
              const isQuizRelated = title.includes('quiz') ||
                                   (title.includes('test') && !title.includes('assignment') && !title.includes('attachment')) ||
                                   title.includes('exam') ||
                                   title.includes('assessment');
              
              // Only extract quiz data if it's explicitly a quiz type OR if it's a PDF with quiz-related title
              const shouldExtractQuiz = isQuizType || (isPdfFile && isQuizRelated);
              
              console.log(`\n=== QUIZ DETECTION DEBUG ===`);
              console.log(`Content Path: ${contentPath}`);
              console.log(`Content Title: ${contentItem.title}`);
              console.log(`Content Type: ${contentItem.type}`);
              console.log(`Is PDF file: ${isPdfFile}`);
              console.log(`Is quiz type: ${isQuizType}`);
              console.log(`Is quiz-related title: ${isQuizRelated}`);
              console.log(`Should extract quiz: ${shouldExtractQuiz}`);
              console.log(`Content type: ${contentItem.type}`);
              console.log(`Path starts with bulk-upload-content/: ${contentPath?.startsWith('bulk-upload-content/')}`);
              console.log(`=== END QUIZ DETECTION DEBUG ===\n`);
              
              // Use the shouldExtractQuiz variable we already calculated above
              console.log(`Final should extract quiz: ${shouldExtractQuiz}`);
              
              if (shouldExtractQuiz && contentPath && contentPath.startsWith('bulk-upload-content/')) {
                console.log(`\n=== QUIZ PDF EXTRACTION DEBUG ===`);
                console.log(`Processing quiz content for PDF extraction: ${contentPath}`);
                
                try {
                  // Get the downloaded file from storage
                  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
                    .from('dil-lms')
                    .download(contentPath);
                  
                  if (downloadError) {
                    console.error(`❌ Failed to download quiz file for extraction:`, downloadError);
                  } else {
                    console.log(`✅ Downloaded quiz file for extraction, size: ${fileData.size} bytes`);
                    
                    // Convert to File object for API call
                    const fileBlob = new Blob([fileData], { type: 'application/pdf' });
                    const quizFile = new File([fileBlob], 'quiz.pdf', { type: 'application/pdf' });
                    
                    // Call the PDF quiz extraction API
                    const apiBaseUrl = Deno.env.get('API_BASE_URL');
                    console.log(`🔧 API_BASE_URL: ${apiBaseUrl}`);
                    console.log(`🔧 API_BASE_URL exists: ${!!apiBaseUrl}`);
                    console.log(`🔧 API_BASE_URL length: ${apiBaseUrl?.length || 0}`);
                    
                    if (apiBaseUrl) {
                      const apiUrl = `${apiBaseUrl}/api/quiz/ai-based-quiz-from-pdf-upload`;
                      console.log(`🚀 Calling quiz extraction API: ${apiUrl}`);
                      console.log(`🔧 File size being sent: ${quizFile.size} bytes`);
                      console.log(`🔧 File type being sent: ${quizFile.type}`);
                      console.log(`🔧 Authorization token available: ${!!token}`);
                      console.log(`🔧 Token length: ${token?.length || 0}`);
                      
                      const formData = new FormData();
                      formData.append('file', quizFile);
                      
                      // Add timeout to prevent hanging requests
                      const controller = new AbortController();
                      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
                      
                      const extractionResponse = await fetch(`${apiBaseUrl}/api/quiz/ai-based-quiz-from-pdf-upload`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                        },
                        body: formData,
                        signal: controller.signal
                      });
                      
                      clearTimeout(timeoutId);
                      
                      console.log(`📡 API Response Status: ${extractionResponse.status}`);
                      console.log(`📡 API Response OK: ${extractionResponse.ok}`);
                      console.log(`📡 API Response Status Text: ${extractionResponse.statusText}`);
                      console.log(`📡 API Response Headers:`, Object.fromEntries(extractionResponse.headers.entries()));
                      
                      if (extractionResponse.ok) {
                        console.log(`✅ API call successful, parsing response...`);
                        
                        // Get response body for debugging and parsing
                        const responseText = await extractionResponse.text();
                        console.log(`📡 API Response Body Length: ${responseText.length} characters`);
                        console.log(`📡 API Response Body: ${responseText}`);
                        
                        // Parse the response text as JSON
                        let extractionResult;
                        try {
                          extractionResult = JSON.parse(responseText);
                          console.log(`✅ Quiz extraction successful:`, JSON.stringify(extractionResult, null, 2));
                        } catch (parseError) {
                          console.error(`❌ Failed to parse API response as JSON:`, parseError);
                          console.error(`❌ Response text that failed to parse: ${responseText}`);
                          throw new Error(`Invalid JSON response from quiz extraction API: ${parseError.message}`);
                        }
                        console.log(`📊 Extraction result type: ${typeof extractionResult}`);
                        console.log(`📊 Extraction result keys: ${Object.keys(extractionResult || {})}`);
                        console.log(`📊 Questions array exists: ${!!extractionResult.questions}`);
                        console.log(`📊 Questions array length: ${extractionResult.questions?.length || 0}`);
                        
                        if (extractionResult.questions && extractionResult.questions.length > 0) {
                          console.log(`🔄 Converting ${extractionResult.questions.length} questions to quiz format...`);
                          console.log(`📋 Sample original question:`, JSON.stringify(extractionResult.questions[0], null, 2));
                          
                          // Convert to our quiz format
                          extractedQuizData = {
                            id: `extracted_quiz_${Date.now()}`,
                            questions: extractionResult.questions.map((q: any, index: number) => {
                              console.log(`🔄 Processing question ${index + 1}:`, {
                                question: q.question,
                                type: q.type,
                                options: q.options,
                                answer: q.answer
                              });
                              
                              const mappedQuestionType = mapQuestionType(q.type);
                              console.log(`🔄 Mapped question type: ${q.type} -> ${mappedQuestionType}`);
                              
                              return {
                                id: `question_${Date.now()}_${index}`,
                                question_text: q.question,
                                question_type: mappedQuestionType,
                                options: q.options ? q.options.map((option: string, optIndex: number) => ({
                                  id: `option_${Date.now()}_${index}_${optIndex}`,
                                  option_text: option,
                                  is_correct: q.answer === option || q.answer === String.fromCharCode(65 + optIndex),
                                  position: optIndex + 1
                                })) : [],
                                position: index + 1,
                                points: 1
                              };
                            })
                          };
                          console.log(`✅ Extracted ${extractedQuizData.questions.length} quiz questions`);
                          console.log(`📋 Sample converted question:`, JSON.stringify(extractedQuizData.questions[0], null, 2));
                        } else {
                          console.log(`⚠️  No questions extracted from PDF`);
                          console.log(`❌ Quiz extraction failed: No questions found in PDF`);
                          extractedQuizData = null;
                        }
                      } else {
                        console.error(`❌ Quiz extraction API failed: ${extractionResponse.status}`);
                        
                        // Get response body for error debugging
                        const errorResponseText = await extractionResponse.text();
                        console.error(`Error details: ${errorResponseText}`);
                        
                        // Try to parse error response for more details
                        try {
                          const errorData = JSON.parse(errorResponseText);
                          console.error(`Parsed error data:`, errorData);
                        } catch (parseError) {
                          console.error(`Could not parse error response as JSON: ${parseError.message}`);
                        }
                        
                        console.error(`❌ Quiz extraction failed: API returned ${extractionResponse.status} status`);
                        extractedQuizData = null;
                      }
                    } else {
                      console.error(`❌ API_BASE_URL not configured for quiz extraction`);
                      console.error(`❌ Environment variable API_BASE_URL is missing or empty`);
                      console.error(`❌ Available environment variables:`, Object.keys(Deno.env.toObject()));
                    }
                  }
                } catch (extractionError) {
                  console.error(`❌ Quiz extraction failed:`, extractionError);
                  console.error(`Error name: ${extractionError.name}`);
                  console.error(`Error message: ${extractionError.message}`);
                  console.error(`Error stack: ${extractionError.stack}`);
                  
                  console.error(`❌ Quiz extraction failed: ${extractionError.message}`);
                  extractedQuizData = null;
                }
                
                console.log(`=== END QUIZ PDF EXTRACTION DEBUG ===\n`);
              }

              // Skip due date for draft courses
              const dueDate = null;

              // Prepare content data - update type to quiz if we extracted quiz data
              let finalContentType = contentItem.type;
              if (extractedQuizData) {
                finalContentType = 'quiz';
                console.log(`🔄 Updating content type from ${contentItem.type} to quiz due to extracted quiz data`);
              }
              
              let contentDataToInsert: any = {
                lesson_id: lessonData.id,
                title: contentItem.title,
                content_type: finalContentType,
                content_path: contentPath,
                position: contentIndex,
                due_date: dueDate
              };

              // For assignments, combine instructions and attachment link in HTML
              if (contentItem.type === 'assignment') {
                let assignmentHtml = '';
                
                if (contentItem.assignmentInstructions) {
                  assignmentHtml += contentItem.assignmentInstructions;
                }
                
                if (contentPath && contentPath.startsWith('bulk-upload-content/')) {
                  try {
                    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
                      .from('dil-lms')
                      .createSignedUrl(contentPath, 60 * 60 * 24 * 365 * 1000);
                    
                    if (!signedUrlError && signedUrlData?.signedUrl) {
                      const attachmentName = contentPath.split('/').pop() || 'Assignment Attachment';
                      const attachmentLink = `<p><a href="${signedUrlData.signedUrl}" target="_blank" rel="noopener noreferrer">${attachmentName}</a></p>`;
                      
                      if (assignmentHtml) {
                        assignmentHtml += '<br>' + attachmentLink;
                      } else {
                        assignmentHtml = attachmentLink;
                      }
                    }
                  } catch (error) {
                    console.error('Error generating signed URL for assignment attachment:', error);
                  }
                }
                
                if (assignmentHtml) {
                  contentDataToInsert.content_path = assignmentHtml;
                }
              }

              const { data: contentData, error: contentError } = await supabaseAdmin
                .from('course_lesson_content')
                .insert(contentDataToInsert)
                .select('id')
                .single();

              if (contentError) throw contentError;

              // Handle quiz creation if it's a quiz type OR if we extracted quiz data from a PDF
              console.log(`\n=== QUIZ CREATION CHECK ===`);
              console.log(`Content Item Type: ${contentItem.type}`);
              console.log(`Content Item Title: ${contentItem.title}`);
              console.log(`Content Path: ${contentPath}`);
              console.log(`Extracted Quiz Data Available: ${extractedQuizData ? 'Yes' : 'No'}`);
              console.log(`Content Item Quiz Available: ${contentItem.quiz ? 'Yes' : 'No'}`);
              console.log(`Should Create Quiz: ${contentItem.type === 'quiz' || (extractedQuizData && extractedQuizData.questions && extractedQuizData.questions.length > 0)}`);
              
              if (contentItem.type === 'quiz' || (extractedQuizData && extractedQuizData.questions && extractedQuizData.questions.length > 0)) {
                console.log(`\n=== QUIZ CREATION DEBUG ===`);
                console.log(`Content Item Type: ${contentItem.type}`);
                console.log(`Content Item Title: ${contentItem.title}`);
                console.log(`Extracted Quiz Data:`, extractedQuizData ? 'Available' : 'Not available');
                console.log(`Content Item Quiz:`, contentItem.quiz ? 'Available' : 'Not available');
                
                // Use extracted quiz data if available, otherwise use contentItem.quiz
                const quizData = extractedQuizData || contentItem.quiz;
                
                console.log(`Selected Quiz Data:`, quizData ? 'Available' : 'Not available');
                if (quizData) {
                  console.log(`Quiz Data Structure:`, JSON.stringify(quizData, null, 2));
                }
                
                if (quizData && quizData.questions && quizData.questions.length > 0) {
                  console.log(`🎯 Creating quiz with ${quizData.questions.length} questions`);
                  
                  for (const [qIndex, question] of quizData.questions.entries()) {
                    console.log(`📝 Creating question ${qIndex + 1}: "${question.question_text}"`);
                    console.log(`📝 Question type: ${question.question_type}`);
                    console.log(`📝 Question options: ${question.options ? question.options.length : 0}`);
                    
                    const { data: questionData, error: questionError } = await supabaseAdmin
                      .from('quiz_questions')
                      .insert({
                        lesson_content_id: contentData.id,
                        question_text: question.question_text,
                        question_type: question.question_type,
                        position: qIndex,
                        points: question.points || 1,
                        math_expression: question.math_expression || null,
                        math_tolerance: question.math_tolerance || null,
                        math_hint: question.math_hint || null,
                        math_allow_drawing: question.math_allow_drawing === true,
                        image_url: question.image_url || null
                      })
                      .select('id')
                      .single();

                    if (questionError) {
                      console.error(`❌ Error creating question ${qIndex + 1}:`, questionError);
                      throw questionError;
                    }
                    
                    console.log(`✅ Created question ${qIndex + 1} with ID: ${questionData.id}`);

                    if (question.options && question.options.length > 0) {
                      console.log(`📝 Creating ${question.options.length} options for question ${qIndex + 1}`);
                      
                      for (const [oIndex, option] of question.options.entries()) {
                        console.log(`📝 Creating option ${oIndex + 1}: "${option.option_text}" (correct: ${option.is_correct})`);
                        
                        const { error: optionError } = await supabaseAdmin.from('question_options').insert({
                          question_id: questionData.id,
                          option_text: option.option_text,
                          is_correct: option.is_correct,
                          position: oIndex
                        });
                        
                        if (optionError) {
                          console.error(`❌ Error creating option ${oIndex + 1}:`, optionError);
                          throw optionError;
                        }
                      }
                      
                      console.log(`✅ Created ${question.options.length} options for question ${qIndex + 1}`);
                    } else {
                      console.log(`⚠️  No options found for question ${qIndex + 1}`);
                    }
                  }
                  
                  console.log(`✅ Successfully created quiz with ${quizData.questions.length} questions`);
                } else {
                  console.log(`⚠️  No quiz data available for quiz content item`);
                  console.log(`Quiz data structure:`, quizData);
                  console.log(`❌ Cannot create quiz: No valid quiz data found`);
                }
                
                console.log(`=== END QUIZ CREATION DEBUG ===\n`);
              }
            }
          }
        }

        createdCourses++;
        console.log(`✅ Successfully created course: ${course.courseTitle}`);
      } catch (error: any) {
        console.error(`Error creating course ${i + 1}:`, error);
        creationErrors.push({
          row: i + 1,
          field: 'Course Creation',
          message: `Failed to create course: ${error.message}`
        });
      }
    }

    return new Response(JSON.stringify({
      success: creationErrors.length === 0,
      createdCourses,
      errors: creationErrors,
      batchIndex: batchIndex || 1,
      message: creationErrors.length === 0 
        ? `Successfully created ${createdCourses} courses in batch ${batchIndex || 1}` 
        : `Created ${createdCourses} courses with ${creationErrors.length} errors in batch ${batchIndex || 1}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: creationErrors.length === 0 ? 200 : 207,
    });

  } catch (error: any) {
    console.error('❌ Batch creation error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
