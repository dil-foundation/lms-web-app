-- =====================================================
-- Class Management Database Schema (Simplified - No Subjects)
-- =====================================================
-- This script creates the database schema for
-- class management functionality in the DIL-LMS system
-- =====================================================

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CLASSES TABLE
-- =====================================================
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    grade VARCHAR(10) NOT NULL CHECK (grade IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    academic_year VARCHAR(9) NOT NULL, -- e.g., '2024-2025'
    semester VARCHAR(20) DEFAULT 'full_year' CHECK (semester IN ('full_year', 'semester_1', 'semester_2', 'quarter_1', 'quarter_2', 'quarter_3', 'quarter_4')),
    max_students INTEGER DEFAULT 30 CHECK (max_students > 0),
    current_students INTEGER DEFAULT 0 CHECK (current_students >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Ensure current_students doesn't exceed max_students
    CONSTRAINT check_current_students_limit CHECK (current_students <= max_students),
    
    -- Ensure unique class code per academic year
    CONSTRAINT unique_class_code_per_year UNIQUE (code, academic_year)
);

-- =====================================================
-- CLASS_TEACHERS TABLE (Many-to-Many relationship)
-- =====================================================
CREATE TABLE public.class_teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'teacher' CHECK (role IN ('teacher', 'assistant_teacher', 'substitute_teacher', 'co_teacher')),
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique teacher per class (one teacher can't be assigned twice to same class)
    CONSTRAINT unique_teacher_per_class UNIQUE (class_id, teacher_id)
);

-- =====================================================
-- CLASS_STUDENTS TABLE (Many-to-Many relationship)
-- =====================================================
CREATE TABLE public.class_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    enrollment_status VARCHAR(20) DEFAULT 'active' CHECK (enrollment_status IN ('active', 'inactive', 'transferred', 'graduated', 'dropped')),
    student_number VARCHAR(20), -- Student's roll number in the class
    seat_number VARCHAR(10),
    parent_guardian_contact TEXT,
    emergency_contact TEXT,
    notes TEXT,
    enrolled_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique student per class
    CONSTRAINT unique_student_per_class UNIQUE (class_id, student_id)
);

-- =====================================================
-- UNIQUE INDEXES FOR COMPLEX CONSTRAINTS
-- =====================================================

-- Ensure only one primary teacher per class
CREATE UNIQUE INDEX unique_primary_teacher_per_class 
ON public.class_teachers (class_id) 
WHERE is_primary = true;

-- Ensure unique student number per class (only for non-null values)
CREATE UNIQUE INDEX unique_student_number_per_class 
ON public.class_students (class_id, student_number) 
WHERE student_number IS NOT NULL;

-- Ensure unique seat number per class (only for non-null values)
CREATE UNIQUE INDEX unique_seat_number_per_class 
ON public.class_students (class_id, seat_number) 
WHERE seat_number IS NOT NULL;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Classes table indexes
CREATE INDEX idx_classes_name ON public.classes(name);
CREATE INDEX idx_classes_code ON public.classes(code);
CREATE INDEX idx_classes_grade ON public.classes(grade);
CREATE INDEX idx_classes_school_id ON public.classes(school_id);
CREATE INDEX idx_classes_board_id ON public.classes(board_id);
CREATE INDEX idx_classes_status ON public.classes(status);
CREATE INDEX idx_classes_academic_year ON public.classes(academic_year);
CREATE INDEX idx_classes_semester ON public.classes(semester);
CREATE INDEX idx_classes_created_at ON public.classes(created_at);
CREATE INDEX idx_classes_created_by ON public.classes(created_by);

-- Class teachers indexes
CREATE INDEX idx_class_teachers_class_id ON public.class_teachers(class_id);
CREATE INDEX idx_class_teachers_teacher_id ON public.class_teachers(teacher_id);
CREATE INDEX idx_class_teachers_role ON public.class_teachers(role);
CREATE INDEX idx_class_teachers_is_primary ON public.class_teachers(is_primary);
CREATE INDEX idx_class_teachers_assigned_at ON public.class_teachers(assigned_at);

-- Class students indexes
CREATE INDEX idx_class_students_class_id ON public.class_students(class_id);
CREATE INDEX idx_class_students_student_id ON public.class_students(student_id);
CREATE INDEX idx_class_students_enrollment_status ON public.class_students(enrollment_status);
CREATE INDEX idx_class_students_enrollment_date ON public.class_students(enrollment_date);
CREATE INDEX idx_class_students_student_number ON public.class_students(student_number);
CREATE INDEX idx_class_students_seat_number ON public.class_students(seat_number);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
CREATE TRIGGER update_classes_updated_at 
    BEFORE UPDATE ON public.classes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_students_updated_at 
    BEFORE UPDATE ON public.class_students 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;

-- RLS Policies for classes
CREATE POLICY "Admins can manage all classes" ON public.classes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Teachers can view classes they teach" ON public.classes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.class_teachers ct
            WHERE ct.class_id = classes.id 
            AND ct.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can view their classes" ON public.classes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.class_students cs
            WHERE cs.class_id = classes.id 
            AND cs.student_id = auth.uid()
            AND cs.enrollment_status = 'active'
        )
    );

-- RLS Policies for class_teachers
CREATE POLICY "Admins can manage class teachers" ON public.class_teachers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Teachers can view their class assignments" ON public.class_teachers
    FOR SELECT USING (teacher_id = auth.uid());

-- RLS Policies for class_students
CREATE POLICY "Admins can manage class students" ON public.class_students
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Students can view their class enrollments" ON public.class_students
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers can view students in their classes" ON public.class_students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.class_teachers ct
            WHERE ct.class_id = class_students.class_id 
            AND ct.teacher_id = auth.uid()
        )
    );

-- =====================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =====================================================

-- Function to get class details with teacher and student counts
CREATE OR REPLACE FUNCTION get_class_details(class_uuid UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    code VARCHAR,
    grade VARCHAR,
    school_name VARCHAR,
    board_name VARCHAR,
    description TEXT,
    status VARCHAR,
    academic_year VARCHAR,
    semester VARCHAR,
    max_students INTEGER,
    current_students INTEGER,
    teacher_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.code,
        c.grade,
        s.name as school_name,
        b.name as board_name,
        c.description,
        c.status,
        c.academic_year,
        c.semester,
        c.max_students,
        c.current_students,
        COUNT(DISTINCT ct.teacher_id) as teacher_count,
        c.created_at,
        c.updated_at
    FROM public.classes c
    JOIN public.schools s ON c.school_id = s.id
    JOIN public.boards b ON c.board_id = b.id
    LEFT JOIN public.class_teachers ct ON c.id = ct.class_id
    WHERE c.id = class_uuid
    GROUP BY c.id, s.name, b.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get classes for a specific user (teacher or student)
CREATE OR REPLACE FUNCTION get_user_classes(user_uuid UUID, user_role TEXT)
RETURNS TABLE (
    class_id UUID,
    class_name VARCHAR,
    class_code VARCHAR,
    grade VARCHAR,
    school_name VARCHAR,
    board_name VARCHAR,
    role_in_class VARCHAR,
    enrollment_status VARCHAR,
    academic_year VARCHAR
) AS $$
BEGIN
    IF user_role = 'teacher' THEN
        RETURN QUERY
        SELECT 
            c.id as class_id,
            c.name as class_name,
            c.code as class_code,
            c.grade,
            s.name as school_name,
            b.name as board_name,
            ct.role as role_in_class,
            NULL::VARCHAR as enrollment_status,
            c.academic_year
        FROM public.classes c
        JOIN public.schools s ON c.school_id = s.id
        JOIN public.boards b ON c.board_id = b.id
        JOIN public.class_teachers ct ON c.id = ct.class_id
        WHERE ct.teacher_id = user_uuid;
    ELSIF user_role = 'student' THEN
        RETURN QUERY
        SELECT 
            c.id as class_id,
            c.name as class_name,
            c.code as class_code,
            c.grade,
            s.name as school_name,
            b.name as board_name,
            'student'::VARCHAR as role_in_class,
            cs.enrollment_status,
            c.academic_year
        FROM public.classes c
        JOIN public.schools s ON c.school_id = s.id
        JOIN public.boards b ON c.board_id = b.id
        JOIN public.class_students cs ON c.id = cs.class_id
        WHERE cs.student_id = user_uuid;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update student count when students are added/removed
CREATE OR REPLACE FUNCTION update_class_student_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment student count
        UPDATE public.classes 
        SET current_students = current_students + 1
        WHERE id = NEW.class_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement student count
        UPDATE public.classes 
        SET current_students = current_students - 1
        WHERE id = OLD.class_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle status changes
        IF OLD.enrollment_status != NEW.enrollment_status THEN
            IF OLD.enrollment_status = 'active' AND NEW.enrollment_status != 'active' THEN
                -- Student became inactive
                UPDATE public.classes 
                SET current_students = current_students - 1
                WHERE id = NEW.class_id;
            ELSIF OLD.enrollment_status != 'active' AND NEW.enrollment_status = 'active' THEN
                -- Student became active
                UPDATE public.classes 
                SET current_students = current_students + 1
                WHERE id = NEW.class_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update student count
CREATE TRIGGER trigger_update_class_student_count
    AFTER INSERT OR UPDATE OR DELETE ON public.class_students
    FOR EACH ROW
    EXECUTE FUNCTION update_class_student_count();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for complete class information
CREATE VIEW class_overview AS
SELECT 
    c.id,
    c.name,
    c.code,
    c.grade,
    s.name as school_name,
    b.name as board_name,
    c.description,
    c.status,
    c.academic_year,
    c.semester,
    c.max_students,
    c.current_students,
    COUNT(DISTINCT ct.teacher_id) as teacher_count,
    c.created_at,
    c.updated_at
FROM public.classes c
JOIN public.schools s ON c.school_id = s.id
JOIN public.boards b ON c.board_id = b.id
LEFT JOIN public.class_teachers ct ON c.id = ct.class_id
GROUP BY c.id, s.name, b.name;

-- View for class statistics
CREATE VIEW class_statistics AS
SELECT 
    COUNT(*) as total_classes,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_classes,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_classes,
    COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_classes,
    COUNT(DISTINCT school_id) as schools_with_classes,
    COUNT(DISTINCT board_id) as boards_with_classes,
    SUM(current_students) as total_enrolled_students,
    AVG(current_students) as avg_students_per_class
FROM public.classes;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_teachers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_students TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_class_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_classes(UUID, TEXT) TO authenticated;

-- Grant permissions on views
GRANT SELECT ON class_overview TO authenticated;
GRANT SELECT ON class_statistics TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.classes IS 'Stores academic classes with their basic information and settings';
COMMENT ON TABLE public.class_teachers IS 'Many-to-many relationship between classes and teachers';
COMMENT ON TABLE public.class_students IS 'Many-to-many relationship between classes and students with enrollment details';

COMMENT ON COLUMN public.classes.academic_year IS 'Academic year in format YYYY-YYYY (e.g., 2024-2025)';
COMMENT ON COLUMN public.classes.semester IS 'Academic period within the year';
COMMENT ON COLUMN public.classes.max_students IS 'Maximum number of students allowed in the class';
COMMENT ON COLUMN public.classes.current_students IS 'Current number of active students in the class';

COMMENT ON COLUMN public.class_teachers.role IS 'Role of the teacher in the class (teacher, assistant, substitute, co-teacher)';
COMMENT ON COLUMN public.class_teachers.is_primary IS 'Whether this teacher is the primary teacher for the class';

COMMENT ON COLUMN public.class_students.enrollment_status IS 'Current status of student enrollment';
COMMENT ON COLUMN public.class_students.student_number IS 'Roll number or student ID within the class';
COMMENT ON COLUMN public.class_students.seat_number IS 'Assigned seat number in the classroom';

-- =====================================================
-- END OF SCRIPT
-- =====================================================
