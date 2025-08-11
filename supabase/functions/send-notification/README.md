# Unified Notification Function

This edge function handles all push notifications for the DIL-LMS application.

## Usage Examples

### 1. New Discussion Notification
```typescript
// Triggered by database trigger when discussion is created
const payload = {
  type: "new_discussion",
  title: "New Discussion Created",
  body: `A new discussion "${discussionTitle}" has been started.`,
  data: {
    discussionId: discussionId,
    discussionTitle: discussionTitle
  },
  targetDiscussionId: discussionId // Will notify all participants
};
```

### 2. Assignment Due Notification
```typescript
const payload = {
  type: "assignment_due",
  title: "Assignment Due Soon",
  body: `Assignment "${assignmentTitle}" is due in 24 hours.`,
  data: {
    assignmentId: assignmentId,
    courseId: courseId
  },
  targetRoles: ["student"] // Notify all students
};
```

### 3. Grade Posted Notification
```typescript
const payload = {
  type: "grade_posted",
  title: "Grade Posted",
  body: `Your grade for "${assignmentTitle}" has been posted.`,
  data: {
    assignmentId: assignmentId,
    grade: grade
  },
  targetUsers: [studentId] // Notify specific student
};
```

### 4. Course Update Notification
```typescript
const payload = {
  type: "course_update",
  title: "Course Updated",
  body: `Course "${courseTitle}" has been updated with new content.`,
  data: {
    courseId: courseId,
    updateType: "new_content"
  },
  targetRoles: ["student", "teacher"] // Notify all students and teachers
};
```

### 5. Announcement Notification
```typescript
const payload = {
  type: "announcement",
  title: "Important Announcement",
  body: announcementContent,
  data: {
    announcementId: announcementId
  },
  targetRoles: ["admin", "teacher", "student"] // Notify everyone
};
```

## Targeting Options

### 1. `targetUsers` (string[])
- Send to specific user IDs
- Most precise targeting
- Use when you know exactly who to notify

### 2. `targetRoles` (string[])
- Send to all users with specified roles
- Good for role-based notifications
- Examples: `["student"]`, `["teacher", "admin"]`

### 3. `targetDiscussionId` (string)
- Send to all participants of a specific discussion
- Automatically resolves to discussion participants
- Perfect for discussion-related notifications

## Notification Types

- `new_discussion` - New discussion created
- `new_message` - New message in discussion
- `assignment_due` - Assignment deadline approaching
- `course_update` - Course content updated
- `announcement` - General announcement
- `grade_posted` - Grade posted for assignment
- `comment_reply` - Reply to comment

## Database Trigger Example

```sql
-- Trigger for new discussions
CREATE OR REPLACE FUNCTION handle_new_discussion()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the unified notification function
  PERFORM net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-notification',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}',
    body := json_build_object(
      'type', 'new_discussion',
      'title', 'New Discussion Created',
      'body', 'A new discussion "' || NEW.title || '" has been started.',
      'data', json_build_object(
        'discussionId', NEW.id,
        'discussionTitle', NEW.title
      ),
      'targetDiscussionId', NEW.id
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_new_discussion
  AFTER INSERT ON discussions
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_discussion();
```

## Benefits

1. **Single Function**: All notifications go through one endpoint
2. **Flexible Targeting**: Multiple ways to target users
3. **Type Safety**: TypeScript interfaces ensure correct payload structure
4. **Reusable**: Easy to add new notification types
5. **Maintainable**: One place to update notification logic
6. **Cost Effective**: Shared OAuth token and reduced cold starts
