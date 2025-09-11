-- =====================================================
-- DIL-LMS Multitenancy Database Schema
-- =====================================================
-- This script creates the complete database schema for the
-- organizational hierarchy management system
-- =====================================================

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- COUNTRIES TABLE
-- =====================================================
CREATE TABLE countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(3) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for countries
CREATE INDEX idx_countries_name ON countries(name);
CREATE INDEX idx_countries_code ON countries(code);
CREATE INDEX idx_countries_created_at ON countries(created_at);

-- =====================================================
-- REGIONS TABLE
-- =====================================================
CREATE TABLE regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(name, country_id),
    UNIQUE(code, country_id)
);

-- Create indexes for regions
CREATE INDEX idx_regions_name ON regions(name);
CREATE INDEX idx_regions_code ON regions(code);
CREATE INDEX idx_regions_country_id ON regions(country_id);
CREATE INDEX idx_regions_created_at ON regions(created_at);

-- =====================================================
-- CITIES TABLE
-- =====================================================
CREATE TABLE cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(name, region_id),
    UNIQUE(code, region_id)
);

-- Create indexes for cities
CREATE INDEX idx_cities_name ON cities(name);
CREATE INDEX idx_cities_code ON cities(code);
CREATE INDEX idx_cities_country_id ON cities(country_id);
CREATE INDEX idx_cities_region_id ON cities(region_id);
CREATE INDEX idx_cities_created_at ON cities(created_at);

-- =====================================================
-- PROJECTS TABLE
-- =====================================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL,
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'cancelled')),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(code),
    UNIQUE(name, city_id)
);

-- Create indexes for projects
CREATE INDEX idx_projects_name ON projects(name);
CREATE INDEX idx_projects_code ON projects(code);
CREATE INDEX idx_projects_country_id ON projects(country_id);
CREATE INDEX idx_projects_region_id ON projects(region_id);
CREATE INDEX idx_projects_city_id ON projects(city_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- =====================================================
-- BOARDS TABLE
-- =====================================================
CREATE TABLE boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL,
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    description TEXT,
    board_type VARCHAR(50) DEFAULT 'educational' CHECK (board_type IN ('educational', 'examination', 'certification', 'accreditation')),
    website VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(code),
    UNIQUE(name, project_id)
);

-- Create indexes for boards
CREATE INDEX idx_boards_name ON boards(name);
CREATE INDEX idx_boards_code ON boards(code);
CREATE INDEX idx_boards_country_id ON boards(country_id);
CREATE INDEX idx_boards_region_id ON boards(region_id);
CREATE INDEX idx_boards_city_id ON boards(city_id);
CREATE INDEX idx_boards_project_id ON boards(project_id);
CREATE INDEX idx_boards_board_type ON boards(board_type);
CREATE INDEX idx_boards_status ON boards(status);
CREATE INDEX idx_boards_created_at ON boards(created_at);

-- =====================================================
-- SCHOOLS TABLE
-- =====================================================
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL,
    school_type VARCHAR(50) NOT NULL CHECK (school_type IN ('Private', 'Public', 'International', 'Charter', 'Religious')),
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    principal_name VARCHAR(255),
    principal_email VARCHAR(255),
    principal_phone VARCHAR(50),
    established_year INTEGER,
    total_students INTEGER DEFAULT 0,
    total_teachers INTEGER DEFAULT 0,
    total_classes INTEGER DEFAULT 0,
    facilities TEXT[],
    curriculum TEXT[],
    languages_offered TEXT[],
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'closed')),
    accreditation_status VARCHAR(50) DEFAULT 'pending' CHECK (accreditation_status IN ('pending', 'accredited', 'expired', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(code),
    UNIQUE(name, board_id)
);

-- Create indexes for schools
CREATE INDEX idx_schools_name ON schools(name);
CREATE INDEX idx_schools_code ON schools(code);
CREATE INDEX idx_schools_school_type ON schools(school_type);
CREATE INDEX idx_schools_country_id ON schools(country_id);
CREATE INDEX idx_schools_region_id ON schools(region_id);
CREATE INDEX idx_schools_city_id ON schools(city_id);
CREATE INDEX idx_schools_project_id ON schools(project_id);
CREATE INDEX idx_schools_board_id ON schools(board_id);
CREATE INDEX idx_schools_status ON schools(status);
CREATE INDEX idx_schools_accreditation_status ON schools(accreditation_status);
CREATE INDEX idx_schools_created_at ON schools(created_at);

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
CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON countries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON regions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cities_updated_at BEFORE UPDATE ON cities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- RLS Policies for countries
CREATE POLICY "Countries are viewable by everyone" ON countries FOR SELECT USING (true);
CREATE POLICY "Only admins can insert countries" ON countries FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);
CREATE POLICY "Only admins can update countries" ON countries FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);
CREATE POLICY "Only admins can delete countries" ON countries FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);

-- RLS Policies for regions
CREATE POLICY "Regions are viewable by everyone" ON regions FOR SELECT USING (true);
CREATE POLICY "Only admins can insert regions" ON regions FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);
CREATE POLICY "Only admins can update regions" ON regions FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);
CREATE POLICY "Only admins can delete regions" ON regions FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);

-- RLS Policies for cities
CREATE POLICY "Cities are viewable by everyone" ON cities FOR SELECT USING (true);
CREATE POLICY "Only admins can insert cities" ON cities FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);
CREATE POLICY "Only admins can update cities" ON cities FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);
CREATE POLICY "Only admins can delete cities" ON cities FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);

-- RLS Policies for projects
CREATE POLICY "Projects are viewable by everyone" ON projects FOR SELECT USING (true);
CREATE POLICY "Only admins can insert projects" ON projects FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);
CREATE POLICY "Only admins can update projects" ON projects FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);
CREATE POLICY "Only admins can delete projects" ON projects FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);

-- RLS Policies for boards
CREATE POLICY "Boards are viewable by everyone" ON boards FOR SELECT USING (true);
CREATE POLICY "Only admins can insert boards" ON boards FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);
CREATE POLICY "Only admins can update boards" ON boards FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);
CREATE POLICY "Only admins can delete boards" ON boards FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);

-- RLS Policies for schools
CREATE POLICY "Schools are viewable by everyone" ON schools FOR SELECT USING (true);
CREATE POLICY "Only admins can insert schools" ON schools FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);
CREATE POLICY "Only admins can update schools" ON schools FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);
CREATE POLICY "Only admins can delete schools" ON schools FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================

-- Insert sample countries
INSERT INTO countries (name, code, description) VALUES
('Pakistan', 'PK', 'Islamic Republic of Pakistan, a country in South Asia.'),
('United States', 'US', 'United States of America, a federal republic in North America.'),
('United Kingdom', 'UK', 'United Kingdom of Great Britain and Northern Ireland.');

-- Insert sample regions
INSERT INTO regions (name, code, country_id, description) VALUES
('Lahore', 'LHR', (SELECT id FROM countries WHERE code = 'PK'), 'The cultural capital of Pakistan, known for its rich history and vibrant culture.'),
('Karachi', 'KHI', (SELECT id FROM countries WHERE code = 'PK'), 'The economic hub of Pakistan, largest region by population.'),
('New York', 'NYC', (SELECT id FROM countries WHERE code = 'US'), 'The Big Apple, financial capital of the world.'),
('England', 'ENG', (SELECT id FROM countries WHERE code = 'UK'), 'The largest and most populous country in the United Kingdom.');

-- Insert sample cities
INSERT INTO cities (name, code, country_id, region_id, description) VALUES
('Lahore', 'LHE', (SELECT id FROM countries WHERE code = 'PK'), (SELECT id FROM regions WHERE code = 'LHR'), 'The cultural capital of Pakistan, known for its rich history and vibrant culture.'),
('Karachi', 'KHI', (SELECT id FROM countries WHERE code = 'PK'), (SELECT id FROM regions WHERE code = 'KHI'), 'The economic hub of Pakistan, largest city by population.'),
('New York City', 'NYC', (SELECT id FROM countries WHERE code = 'US'), (SELECT id FROM regions WHERE code = 'NYC'), 'The Big Apple, financial capital of the world.'),
('London', 'LON', (SELECT id FROM countries WHERE code = 'UK'), (SELECT id FROM regions WHERE code = 'ENG'), 'The capital and largest city of England and the United Kingdom.');

-- Insert sample projects
INSERT INTO projects (name, code, country_id, region_id, city_id, description, status, start_date) VALUES
('Digital Learning Initiative', 'DLI-001', (SELECT id FROM countries WHERE code = 'PK'), (SELECT id FROM regions WHERE code = 'LHR'), (SELECT id FROM cities WHERE code = 'LHE'), 'A comprehensive digital learning platform for schools in Lahore.', 'active', '2024-01-01'),
('Smart Education Hub', 'SEH-001', (SELECT id FROM countries WHERE code = 'PK'), (SELECT id FROM regions WHERE code = 'KHI'), (SELECT id FROM cities WHERE code = 'KHI'), 'Modern educational technology integration project for Karachi schools.', 'active', '2024-01-01'),
('Global Learning Network', 'GLN-001', (SELECT id FROM countries WHERE code = 'US'), (SELECT id FROM regions WHERE code = 'NYC'), (SELECT id FROM cities WHERE code = 'NYC'), 'International collaboration project for educational excellence.', 'active', '2024-01-01'),
('Future Schools Program', 'FSP-001', (SELECT id FROM countries WHERE code = 'UK'), (SELECT id FROM regions WHERE code = 'ENG'), (SELECT id FROM cities WHERE code = 'LON'), 'Innovative teaching methods and technology adoption program.', 'active', '2024-01-01');

-- Insert sample boards
INSERT INTO boards (name, code, country_id, region_id, city_id, project_id, description, board_type, status) VALUES
('Federal Board of Intermediate and Secondary Education', 'FBISE', (SELECT id FROM countries WHERE code = 'PK'), (SELECT id FROM regions WHERE code = 'LHR'), (SELECT id FROM cities WHERE code = 'LHE'), (SELECT id FROM projects WHERE code = 'DLI-001'), 'The Federal Board of Intermediate and Secondary Education is a federal level board of education in Pakistan for public and private schools.', 'educational', 'active'),
('Punjab Board of Intermediate and Secondary Education', 'PBISE', (SELECT id FROM countries WHERE code = 'PK'), (SELECT id FROM regions WHERE code = 'LHR'), (SELECT id FROM cities WHERE code = 'LHE'), (SELECT id FROM projects WHERE code = 'DLI-001'), 'Punjab Board of Intermediate and Secondary Education is the provincial education board of Punjab, Pakistan.', 'educational', 'active'),
('International Baccalaureate', 'IB', (SELECT id FROM countries WHERE code = 'UK'), (SELECT id FROM regions WHERE code = 'ENG'), (SELECT id FROM cities WHERE code = 'LON'), (SELECT id FROM projects WHERE code = 'FSP-001'), 'The International Baccalaureate is an international educational foundation headquartered in Geneva, Switzerland.', 'educational', 'active');

-- Insert sample schools
INSERT INTO schools (name, code, school_type, country_id, region_id, city_id, project_id, board_id, address, phone, email, website, status, accreditation_status) VALUES
('Beaconhouse School System', 'BSS-001', 'Private', (SELECT id FROM countries WHERE code = 'PK'), (SELECT id FROM regions WHERE code = 'LHR'), (SELECT id FROM cities WHERE code = 'LHE'), (SELECT id FROM projects WHERE code = 'DLI-001'), (SELECT id FROM boards WHERE code = 'FBISE'), '123 Main Street, Gulberg III', '+92-42-1234567', 'info@beaconhouse.edu.pk', 'www.beaconhouse.edu.pk', 'active', 'accredited'),
('Lahore Grammar School', 'LGS-001', 'Private', (SELECT id FROM countries WHERE code = 'PK'), (SELECT id FROM regions WHERE code = 'LHR'), (SELECT id FROM cities WHERE code = 'LHE'), (SELECT id FROM projects WHERE code = 'DLI-001'), (SELECT id FROM boards WHERE code = 'PBISE'), '456 Mall Road, Gulberg V', '+92-42-2345678', 'info@lgs.edu.pk', 'www.lgs.edu.pk', 'active', 'accredited'),
('Karachi Public School', 'KPS-001', 'Public', (SELECT id FROM countries WHERE code = 'PK'), (SELECT id FROM regions WHERE code = 'KHI'), (SELECT id FROM cities WHERE code = 'KHI'), (SELECT id FROM projects WHERE code = 'SEH-001'), (SELECT id FROM boards WHERE code = 'FBISE'), '789 University Road, Gulshan-e-Iqbal', '+92-21-3456789', 'info@kps.edu.pk', 'www.kps.edu.pk', 'active', 'accredited');

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for complete school hierarchy
CREATE VIEW school_hierarchy AS
SELECT 
    s.id as school_id,
    s.name as school_name,
    s.code as school_code,
    s.school_type,
    s.status as school_status,
    b.name as board_name,
    b.code as board_code,
    p.name as project_name,
    p.code as project_code,
    c.name as city_name,
    c.code as city_code,
    r.name as region_name,
    r.code as region_code,
    co.name as country_name,
    co.code as country_code
FROM schools s
JOIN boards b ON s.board_id = b.id
JOIN projects p ON s.project_id = p.id
JOIN cities c ON s.city_id = c.id
JOIN regions r ON s.region_id = r.id
JOIN countries co ON s.country_id = co.id;

-- View for project statistics
CREATE VIEW project_statistics AS
SELECT 
    p.id,
    p.name,
    p.code,
    p.status,
    COUNT(DISTINCT b.id) as total_boards,
    COUNT(DISTINCT s.id) as total_schools,
    SUM(s.total_students) as total_students,
    SUM(s.total_teachers) as total_teachers
FROM projects p
LEFT JOIN boards b ON p.id = b.project_id
LEFT JOIN schools s ON b.id = s.board_id
GROUP BY p.id, p.name, p.code, p.status;

-- =====================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =====================================================

-- Function to get schools by location
CREATE OR REPLACE FUNCTION get_schools_by_location(
    p_country_code VARCHAR(3) DEFAULT NULL,
    p_region_code VARCHAR(10) DEFAULT NULL,
    p_city_code VARCHAR(10) DEFAULT NULL
)
RETURNS TABLE (
    school_id UUID,
    school_name VARCHAR(255),
    school_code VARCHAR(20),
    school_type VARCHAR(50),
    board_name VARCHAR(255),
    project_name VARCHAR(255),
    city_name VARCHAR(255),
    region_name VARCHAR(255),
    country_name VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.code,
        s.school_type,
        b.name,
        p.name,
        c.name,
        r.name,
        co.name
    FROM schools s
    JOIN boards b ON s.board_id = b.id
    JOIN projects p ON s.project_id = p.id
    JOIN cities c ON s.city_id = c.id
    JOIN regions r ON s.region_id = r.id
    JOIN countries co ON s.country_id = co.id
    WHERE 
        (p_country_code IS NULL OR co.code = p_country_code)
        AND (p_region_code IS NULL OR r.code = p_region_code)
        AND (p_city_code IS NULL OR c.code = p_city_code)
        AND s.status = 'active'
    ORDER BY s.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get hierarchy statistics
CREATE OR REPLACE FUNCTION get_hierarchy_statistics()
RETURNS TABLE (
    total_countries INTEGER,
    total_regions INTEGER,
    total_cities INTEGER,
    total_projects INTEGER,
    total_boards INTEGER,
    total_schools INTEGER,
    total_students BIGINT,
    total_teachers BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM countries)::INTEGER,
        (SELECT COUNT(*) FROM regions)::INTEGER,
        (SELECT COUNT(*) FROM cities)::INTEGER,
        (SELECT COUNT(*) FROM projects)::INTEGER,
        (SELECT COUNT(*) FROM boards)::INTEGER,
        (SELECT COUNT(*) FROM schools)::INTEGER,
        (SELECT COALESCE(SUM(total_students), 0) FROM schools)::BIGINT,
        (SELECT COALESCE(SUM(total_teachers), 0) FROM schools)::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE countries IS 'Master table for countries in the organizational hierarchy';
COMMENT ON TABLE regions IS 'Geographic regions within countries';
COMMENT ON TABLE cities IS 'Cities within regions';
COMMENT ON TABLE projects IS 'Educational projects within specific locations';
COMMENT ON TABLE boards IS 'Educational boards and examination bodies';
COMMENT ON TABLE schools IS 'Educational institutions with complete information';

COMMENT ON COLUMN countries.code IS 'ISO country code (2-3 characters)';
COMMENT ON COLUMN regions.code IS 'Region code within the country';
COMMENT ON COLUMN cities.code IS 'City code within the region';
COMMENT ON COLUMN projects.code IS 'Unique project identifier';
COMMENT ON COLUMN boards.code IS 'Unique board identifier';
COMMENT ON COLUMN schools.code IS 'Unique school identifier';

-- =====================================================
-- END OF SCRIPT
-- =====================================================
