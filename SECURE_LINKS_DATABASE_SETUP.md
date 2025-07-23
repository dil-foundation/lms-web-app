# Secure Links Database Setup

This document explains how to set up the database table for the Secure Links feature in the DIL application.

## Overview

The Secure Links feature allows administrators to generate secure, time-limited URLs that external observers can use to submit observation reports without requiring login credentials. The system includes:

- **Database Storage**: All secure links are stored in a dedicated `secure_links` table
- **Role-based Forms**: Different observer roles get different form interfaces
- **Token Validation**: Secure token-based access with expiration
- **Usage Tracking**: Links can be marked as used and track who used them
- **TEAL Integration**: Optional Technology Enhanced Active Learning observations

## Database Schema

The `secure_links` table includes the following columns:

- `id`: UUID primary key
- `role`: Display name for the observer role (Principal, ECE Observer, etc.)
- `observer_role`: Internal role identifier (principal, ece, school-officer, project-manager)
- `token`: Unique secure access token
- `full_url`: Complete URL with token for sharing
- `expiry`: Timestamp when the link expires
- `status`: Link status (active, expired, used, deactivated)
- `used_by`: Name of person who used the link (optional)
- `used_at`: Timestamp when link was used (optional)
- `created_at`: When the link was created
- `updated_at`: When the link was last modified
- `created_by`: UUID of the user who created the link
- `expiry_days`: Number of days the link was set to be valid

## Setup Instructions

### Step 1: Run the Database Migration

1. Open your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/migrations/002_create_secure_links_table.sql`
4. Paste and execute the SQL script

### Step 2: Verify the Setup

After running the migration, verify that:

1. The `secure_links` table exists
2. All indexes are created
3. Row Level Security (RLS) policies are active
4. Triggers for `updated_at` are working

### Step 3: Test the Feature

1. Log in as an administrator
2. Navigate to Observation Reports → Manage Secure Links
3. Generate a test secure link
4. Open the generated link in an incognito window
5. Complete and submit a test observation report

## Security Features

### Row Level Security (RLS)

The system implements comprehensive RLS policies:

- **User Isolation**: Users can only see/modify their own secure links
- **Token Validation**: Special policy allows public token validation
- **Admin Control**: Only authenticated admins can create/manage links

### Token Security

- **Strong Tokens**: 32-character random tokens using alphanumeric characters
- **Expiration**: All links have configurable expiration dates
- **One-time Use**: Links can be marked as used to prevent reuse
- **Deactivation**: Links can be manually deactivated by administrators

### Data Protection

- **Encrypted Storage**: All data is encrypted at rest in Supabase
- **Audit Trail**: Complete tracking of link creation, usage, and modifications
- **User Privacy**: No sensitive user data is stored in the secure links

## System Architecture

### Components

1. **SecureLinksService** (`src/services/secureLinksService.ts`)
   - Database operations
   - Token validation
   - Link management

2. **SecureLinksContext** (`src/contexts/SecureLinksContext.tsx`)
   - State management
   - Real-time updates
   - Error handling

3. **SecureLinkManagement** (`src/components/admin/SecureLinkManagement.tsx`)
   - Admin interface
   - Link generation
   - Statistics dashboard

4. **SecureObserverForm** (`src/components/admin/SecureObserverForm.tsx`)
   - External observer interface
   - Form validation
   - Database integration

### Data Flow

1. Admin creates secure link via management interface
2. Link data stored in database with generated token
3. External observer accesses link via unique URL
4. Token validated against database
5. Observer completes role-specific form
6. Form submission marks link as used
7. Data stored in observation reports system

## Observer Roles

The system supports four observer roles:

### Principal
- Teaching effectiveness assessment
- Classroom environment evaluation
- Professional development recommendations

### ECE Observer
- Early childhood education specific evaluations
- Play-based learning assessment
- Developmental observations

### School Officer
- Administrative compliance checking
- Documentation verification
- Infrastructure assessment

### Project Manager
- Implementation fidelity scoring
- Program alignment evaluation
- Strategic recommendations

## TEAL Observations

Optional Technology Enhanced Active Learning assessments include:

- Video content usage
- Guiding question display
- Think-pair-share activities
- Collaborative learning
- Device engagement levels

## Maintenance

### Regular Tasks

1. **Expired Link Cleanup**: Links automatically expire based on their expiry date
2. **Usage Monitoring**: Track link usage patterns and statistics
3. **Security Audits**: Regular review of access logs and usage patterns

### Database Maintenance

- The system includes automated triggers for `updated_at` timestamps
- Expired links are automatically marked when detected
- Indexes ensure optimal query performance

## Troubleshooting

### Common Issues

1. **"Database table not set up yet"**
   - Solution: Run the migration SQL script in Supabase

2. **"Token validation failed"**
   - Check if link is expired or deactivated
   - Verify RLS policies are correctly applied

3. **"Failed to create secure link"**
   - Ensure user is authenticated
   - Check database connection and permissions

### Error Handling

The system includes comprehensive error handling:

- User-friendly error messages
- Automatic fallback to setup instructions
- Detailed logging for debugging

## Performance Considerations

- Indexes on frequently queried columns (token, created_by, status)
- Efficient RLS policies for data isolation
- Automatic cleanup of expired links
- Optimized database queries with proper pagination

## Future Enhancements

Potential improvements to consider:

1. **Bulk Link Generation**: Create multiple links at once
2. **Template System**: Pre-configured link templates for common use cases
3. **Email Integration**: Automatic email delivery of secure links
4. **Analytics Dashboard**: Detailed usage analytics and reporting
5. **API Integration**: RESTful API for external system integration

---

For technical support or questions about the secure links system, please refer to the development team or check the system logs for detailed error information. 