# Observation Reports Database Setup

This document explains how to set up the database-backed observation reports system.

## Database Table Creation

To set up the observation reports table in your Supabase database, you need to run the SQL migration located at:

```
supabase/migrations/001_create_observation_reports_table.sql
```

### Option 1: Using Supabase CLI (Recommended)

1. Install Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Run the migration:
   ```bash
   supabase db push
   ```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase/migrations/001_create_observation_reports_table.sql`
4. Run the SQL script

## Features Implemented

### ✅ Database Operations
- **Create**: Save new observation reports to database
- **Read**: Fetch reports with filtering, pagination, and search
- **Update**: Modify existing reports (prepared for future use)
- **Delete**: Remove reports with proper user permissions

### ✅ Security Features
- **Row Level Security (RLS)**: Users can only access their own reports
- **Authentication**: All operations require valid user authentication
- **Data Validation**: Database constraints ensure data integrity

### ✅ Performance Optimizations
- **Indexes**: Optimized queries for common operations
- **JSONB Storage**: Efficient storage of form data for complex queries
- **Automatic Timestamps**: Tracks creation and modification times

### ✅ User Experience
- **Real-time Statistics**: Dynamic dashboard with up-to-date metrics
- **Advanced Filtering**: Search by name, school, role, date ranges
- **Sorting Options**: Multiple sorting criteria available
- **Loading States**: Proper loading indicators during database operations
- **Error Handling**: Graceful error handling with user-friendly messages

## Database Schema

### Main Table: `observation_reports`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `observer_name` | VARCHAR(255) | Name of the observer |
| `observer_role` | VARCHAR(50) | Role: principal, ece, school-officer, project-manager |
| `school_name` | VARCHAR(255) | Name of the school observed |
| `teacher_name` | VARCHAR(255) | Name of the teacher observed |
| `observation_date` | DATE | Date of observation |
| `start_time` | TIME | Start time of observation |
| `end_time` | TIME | End time of observation |
| `lesson_code` | VARCHAR(100) | Lesson identifier code |
| `project_name` | VARCHAR(255) | Associated project name |
| `overall_score` | INTEGER | Calculated score (0-100) |
| `status` | VARCHAR(20) | completed or draft |
| `form_data` | JSONB | Complete form data as JSON |
| `submitted_by` | UUID | User who submitted the report |
| `show_teal_observations` | BOOLEAN | Whether TEAL observations are included |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

### Indexes for Performance

- `idx_observation_reports_submitted_by` - User-specific queries
- `idx_observation_reports_created_at` - Date sorting
- `idx_observation_reports_observation_date` - Date filtering
- `idx_observation_reports_observer_role` - Role filtering
- `idx_observation_reports_school_name` - School filtering
- `idx_observation_reports_status` - Status filtering

## API Service Layer

The system uses a dedicated service layer (`src/services/observationReportsService.ts`) that:

- Handles all database interactions
- Provides type-safe interfaces
- Implements proper error handling
- Supports filtering, pagination, and statistics
- Maintains security through RLS policies

## Context Integration

The React context (`src/contexts/ObservationReportsContext.tsx`) provides:

- Global state management
- Async database operations
- Real-time data synchronization
- Statistics calculation
- Error state management
- Loading state management

## Usage Flow

1. **Submit Report**: Form data → Database via service → Context update → UI refresh
2. **View Reports**: Context loads from database → Displays in UI with filters/search
3. **Delete Report**: User action → Database deletion → Context update → UI refresh
4. **Statistics**: Context calculates from database data → Real-time dashboard updates

## Production Ready Features

- ✅ **Data Persistence**: All data stored in PostgreSQL database
- ✅ **User Isolation**: RLS ensures data privacy between users
- ✅ **Performance**: Indexed queries for fast operations
- ✅ **Error Handling**: Comprehensive error management
- ✅ **Type Safety**: Full TypeScript interfaces
- ✅ **Security**: Authentication and authorization
- ✅ **Scalability**: Designed for multi-user production use

## Troubleshooting

### Common Issues

1. **Table doesn't exist**: Run the migration SQL script
2. **Permission denied**: Check RLS policies and user authentication
3. **Data not loading**: Verify user is authenticated and context is properly initialized
4. **Insert/Update fails**: Check data validation constraints

### Verification Steps

1. Check if table exists:
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'observation_reports';
   ```

2. Verify RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'observation_reports';
   ```

3. Test basic operations:
   ```sql
   -- This should only show your own reports
   SELECT COUNT(*) FROM observation_reports;
   ```

## Next Steps for Enhancement

- [ ] Add real-time subscriptions for collaborative features
- [ ] Implement report templates and customization
- [ ] Add bulk operations (import/export)
- [ ] Create advanced analytics and reporting dashboards
- [ ] Implement report approval workflows
- [ ] Add file attachments and media support 