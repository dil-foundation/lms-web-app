# Bulk Upload User Template Guide

## Template Structure

The bulk upload template contains the following columns:

### Required Fields
- **First Name** (Required): User's first name
  - Must be 2-30 characters
  - Can contain letters, spaces, and '.-
  - Example: "John", "Mary-Jane"

- **Last Name** (Required): User's last name
  - Must be 2-30 characters
  - Can contain letters, spaces, and '.-
  - Example: "Doe", "O'Connor"

- **Email** (Required): User's email address
  - Must be a valid email format
  - Must be unique across the system
  - Example: "john.doe@example.com"

- **Role** (Required): User's role in the system
  - Valid values: "student", "teacher", "admin"
  - Case-sensitive

### Optional Fields
- **Grade** (Optional): Student's grade level
  - Only required for students
  - Can be any text (e.g., "Grade 10", "Year 11", "Class 12")
  - Leave empty for teachers and admins

- **Teacher ID** (Optional): Teacher's unique identifier
  - Only required for teachers
  - Must be at least 3 characters
  - Example: "T001", "MATH001"
  - Leave empty for students and admins

## Validation Rules

### General Rules
1. All required fields must be filled
2. Email addresses must be unique
3. Role must be one of: student, teacher, admin
4. First and last names must be 2-30 characters
5. Teacher ID must be at least 3 characters (for teachers)

### Role-Specific Rules
- **Students**: Grade is required, Teacher ID should be empty
- **Teachers**: Teacher ID is required, Grade should be empty
- **Admins**: Both Grade and Teacher ID should be empty

## Sample Data

| First Name | Last Name | Email | Role | Grade | Teacher ID |
|------------|-----------|-------|------|-------|------------|
| John | Doe | john.doe@example.com | student | Grade 10 | |
| Jane | Smith | jane.smith@example.com | teacher | | T001 |
| Admin | User | admin@example.com | admin | | |
| Sarah | Johnson | sarah.johnson@example.com | student | Grade 11 | |
| Mike | Wilson | mike.wilson@example.com | teacher | | T002 |

## File Format Requirements

- **Format**: Excel (.xlsx) or CSV (.csv)
- **Encoding**: UTF-8
- **Maximum rows**: 1000 users per upload
- **Headers**: Must match exactly (case-sensitive)

## Upload Process

1. Download the template
2. Fill in user data following the validation rules
3. Save the file
4. Upload through the admin interface
5. Review validation results
6. Confirm bulk user creation

## Error Handling

The system will validate each row and provide detailed error messages for:
- Missing required fields
- Invalid email formats
- Duplicate email addresses
- Invalid role values
- Role-specific field requirements
- Data format issues

## Success Response

Upon successful upload, you will receive:
- Total number of users created
- List of successfully created users
- Any validation errors (if applicable)
- Email invitations sent to new users
