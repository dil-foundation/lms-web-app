# Progress Resume API Documentation

## Overview

This document describes the API endpoints required to implement the progress tracking and resume functionality for Practice lessons in Stage 1 and Stage 2. The system allows users to resume their practice sessions from where they left off across different devices and sessions.

## API Endpoints

### 1. Get Current Topic Progress

**Endpoint:** `POST /api/progress/get-current-topic`

**Purpose:** Retrieves the user's current progress to determine where they should resume their practice session.

#### Request Format

```json
{
  "user_id": "string",
  "stage_id": 1,
  "exercise_id": 2
}
```

#### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "current_topic_id": 4,
    "is_new_exercise": false,
    "is_completed": false,
    "exercise_data": {
      "id": 37,
      "user_id": "423ead59-a712-486e-87c8-39cc82684867",
      "stage_id": 1,
      "exercise_id": 1,
      "attempts": 5,
      "scores": [100, 100, 50, 20, 100],
      "last_5_scores": [100, 100, 50, 20, 100],
      "average_score": 74,
      "urdu_used": [true, true, true, true, true],
      "mature": false,
      "total_score": 370,
      "best_score": 100,
      "time_spent_minutes": 0,
      "started_at": "2025-07-22T19:57:18.777101+00:00",
      "completed_at": null,
      "last_attempt_at": "2025-07-24T17:42:16.21509+00:00",
      "created_at": "2025-07-22T19:57:18.82543+00:00",
      "updated_at": "2025-07-22T19:57:18.82543+00:00",
      "current_topic_id": 4
    }
  },
  "error": null,
  "message": "Current topic retrieved successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "User not found or no progress data available"
}
```

#### Stage and Exercise ID Mapping

| Stage | Exercise ID | Component Name | Description |
|-------|-------------|----------------|-------------|
| 1 | 1 | RepeatAfterMe | Stage 1 - Repeat After Me practice |
| 1 | 2 | QuickResponse | Stage 1 - Quick Response practice |
| 1 | 3 | ListenAndReply | Stage 1 - Listen and Reply practice |
| 2 | 1 | DailyRoutine | Stage 2 - Daily Routine practice |
| 2 | 2 | QuickAnswer | Stage 2 - Quick Answer practice |
| 2 | 3 | RoleplaySimulation | Stage 2 - Roleplay Simulation practice |

### 2. Update Current Progress

**Endpoint:** `POST /api/progress/get-current-topic`

**Purpose:** Updates the user's last activity timestamp to track engagement.

#### Request Format

```json
{
  "user_id": "string",
  "stage_id": 1,
  "exercise_id": 2
}
```

#### Response Format

**Success Response:**
```json
{
  "success": true,
  "message": "Progress updated successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to update progress: Database error"
}
```

### 3. Initialize Progress (Existing)

**Endpoint:** `POST /api/progress/initialize-progress`

**Purpose:** Creates initial progress records for new users and sets up tracking infrastructure.

#### Request Format

```json
{
  "user_id": "string"
}
```

#### Response Format

**Success Response:**
```json
{
  "success": true,
  "message": "Progress initialized successfully",
  "data": {
    "user_id": "string",
    "stages_unlocked": [1, 2],
    "exercises_available": 6,
    "initial_setup_complete": true
  }
}
```

## Database Schema Recommendations

### Progress Table Structure

```sql
CREATE TABLE user_progress (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  stage_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  current_topic_id INTEGER DEFAULT 1,
  total_topics INTEGER,
  attempts INTEGER DEFAULT 0,
  scores JSON,
  last_5_scores JSON,
  average_score DECIMAL(5,2) DEFAULT 0,
  urdu_used JSON,
  mature BOOLEAN DEFAULT false,
  total_score INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, stage_id, exercise_id),
  INDEX idx_user_stage_exercise (user_id, stage_id, exercise_id),
  INDEX idx_last_activity (user_id, last_attempt_at)
);
```

### Sample Data

```sql
INSERT INTO user_progress (user_id, stage_id, exercise_id, current_topic_id, total_topics, attempts, scores, average_score, best_score) VALUES
('user123', 1, 1, 4, 15, 5, '[100, 100, 50, 20, 100]', 74.0, 100),
('user123', 1, 2, 8, 20, 3, '[85, 90, 75]', 83.3, 90),
('user123', 2, 1, 3, 12, 2, '[95, 88]', 91.5, 95);
```

## Implementation Logic

### Get Current Topic Logic

1. Query the database for the specific user, stage, and exercise:
   ```sql
   SELECT * FROM user_progress 
   WHERE user_id = ? AND stage_id = ? AND exercise_id = ?
   LIMIT 1;
   ```

2. If no progress found, return success=false
3. If progress found, return the exercise data with current_topic_id

### Update Progress Logic

1. Update the user's last activity timestamp for the exercise:
   ```sql
   UPDATE user_progress 
   SET last_attempt_at = NOW(), updated_at = NOW()
   WHERE user_id = ? AND stage_id = ? AND exercise_id = ?;
   ```

## Frontend Integration

### How Components Use the API

1. **On Component Mount:**
   - Call `getCurrentTopicProgress(userId, stageId, exerciseId)`
   - If success and data.success is true, resume from `current_topic_id`
   - Convert topic ID to array index (topic ID is 1-based, arrays are 0-based)
   - If no data or topic ID is 0/undefined, start from beginning

2. **During Practice:**
   - Call `updateCurrentProgress()` after successful evaluations
   - Call `updateCurrentProgress()` when navigating between items
   - Updates last activity timestamp without interrupting user experience

3. **Error Handling:**
   - If resume fails, gracefully fall back to starting from beginning
   - Activity update failures are logged but don't block user interaction

### Example Frontend Code

```typescript
// Resume functionality
const currentProgress = await getCurrentTopicProgress(user.id, 1, 1); // Stage 1, Exercise 1
if (currentProgress.success && currentProgress.data && currentProgress.data.success) {
  const { current_topic_id } = currentProgress.data;
  if (current_topic_id !== undefined && current_topic_id > 0) {
    // Convert topic ID to array index (topic ID is 1-based, array index is 0-based)
    const resumeIndex = Math.min(Math.max(0, current_topic_id - 1), items.length - 1);
    setCurrentItemIndex(resumeIndex);
  }
}

// Save progress
const saveProgress = async (itemIndex: number) => {
  await updateCurrentProgress(user.id, 1, 1);
};
```

## Security Considerations

1. **Authentication:** Ensure user_id belongs to authenticated user
2. **Input Validation:** Validate stage_id, exercise_id, and topic IDs are within valid ranges
3. **Rate Limiting:** Implement reasonable rate limits for progress updates
4. **Data Integrity:** Ensure current_topic_id doesn't exceed total_topics and is at least 1

## Performance Considerations

1. **Indexing:** Index on (user_id, stage_id, exercise_id) for fast lookups
2. **Caching:** Consider caching recent progress data in Redis
3. **Batch Updates:** For high-frequency progress updates, consider batching
4. **Connection Pooling:** Use database connection pooling for concurrent users

## Testing Scenarios

1. **New User:** No existing progress, should initialize properly
2. **Returning User:** Should resume from correct position
3. **Cross-Stage Navigation:** Should handle switching between different stages
4. **Progress Edge Cases:** Handle completion, reset, and boundary cases
5. **Concurrent Sessions:** Handle multiple devices/sessions gracefully

## Error Handling

- Database connection failures
- Invalid user_id or exercise_id values
- Progress data corruption scenarios
- Timestamp parsing issues
- Concurrent update conflicts

## Monitoring and Analytics

Consider tracking:
- Resume success rates
- Most common resume points
- Progress completion patterns
- User engagement metrics
- API response times and error rates 