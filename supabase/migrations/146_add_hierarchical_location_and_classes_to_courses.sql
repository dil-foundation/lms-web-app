-- Add hierarchical location fields and classes to the courses table
-- This migration adds support for the CourseBuilder's location hierarchy and class enrollment features

ALTER TABLE public.courses 
ADD COLUMN country_ids uuid[] DEFAULT '{}',
ADD COLUMN region_ids uuid[] DEFAULT '{}',
ADD COLUMN city_ids uuid[] DEFAULT '{}',
ADD COLUMN project_ids uuid[] DEFAULT '{}',
ADD COLUMN board_ids uuid[] DEFAULT '{}',
ADD COLUMN class_ids uuid[] DEFAULT '{}';

-- Add indexes for better query performance on array fields
CREATE INDEX IF NOT EXISTS idx_courses_country_ids ON public.courses USING GIN (country_ids);
CREATE INDEX IF NOT EXISTS idx_courses_region_ids ON public.courses USING GIN (region_ids);
CREATE INDEX IF NOT EXISTS idx_courses_city_ids ON public.courses USING GIN (city_ids);
CREATE INDEX IF NOT EXISTS idx_courses_project_ids ON public.courses USING GIN (project_ids);
CREATE INDEX IF NOT EXISTS idx_courses_board_ids ON public.courses USING GIN (board_ids);
CREATE INDEX IF NOT EXISTS idx_courses_class_ids ON public.courses USING GIN (class_ids);

-- Add comments to document the new fields
COMMENT ON COLUMN public.courses.country_ids IS 'Array of country UUIDs where this course is available';
COMMENT ON COLUMN public.courses.region_ids IS 'Array of region UUIDs where this course is available';
COMMENT ON COLUMN public.courses.city_ids IS 'Array of city UUIDs where this course is available';
COMMENT ON COLUMN public.courses.project_ids IS 'Array of project UUIDs this course is associated with';
COMMENT ON COLUMN public.courses.board_ids IS 'Array of board UUIDs this course is associated with';
COMMENT ON COLUMN public.courses.class_ids IS 'Array of class UUIDs enrolled for this course';

-- Optional: Add constraints to ensure arrays contain valid UUIDs
-- (This assumes you have the corresponding tables: countries, regions, cities, projects, boards, classes)
-- Uncomment these if you want to enforce referential integrity:

-- ALTER TABLE public.courses 
-- ADD CONSTRAINT courses_country_ids_check 
-- CHECK (array_length(country_ids, 1) IS NULL OR country_ids <@ (SELECT array_agg(id) FROM countries));

-- ALTER TABLE public.courses 
-- ADD CONSTRAINT courses_region_ids_check 
-- CHECK (array_length(region_ids, 1) IS NULL OR region_ids <@ (SELECT array_agg(id) FROM regions));

-- ALTER TABLE public.courses 
-- ADD CONSTRAINT courses_city_ids_check 
-- CHECK (array_length(city_ids, 1) IS NULL OR city_ids <@ (SELECT array_agg(id) FROM cities));

-- ALTER TABLE public.courses 
-- ADD CONSTRAINT courses_project_ids_check 
-- CHECK (array_length(project_ids, 1) IS NULL OR project_ids <@ (SELECT array_agg(id) FROM projects));

-- ALTER TABLE public.courses 
-- ADD CONSTRAINT courses_board_ids_check 
-- CHECK (array_length(board_ids, 1) IS NULL OR board_ids <@ (SELECT array_agg(id) FROM boards));

-- ALTER TABLE public.courses 
-- ADD CONSTRAINT courses_class_ids_check 
-- CHECK (array_length(class_ids, 1) IS NULL OR class_ids <@ (SELECT array_agg(id) FROM classes));
