# Offline Video Fix - Testing Instructions

## Issue Fixed
Videos were not displaying in offline mode when viewing downloaded courses in the LMS Student portal.

## Root Cause
1. **Video URL Generation**: The `getVideoUrl` method in `courseDownloadService.ts` was returning raw `content_path` instead of creating signed URLs for download
2. **Video ID Mapping**: Inconsistent mapping between content item IDs and stored video IDs in offline database
3. **Fallback Logic**: Limited fallback strategies when primary video ID lookup failed

## Fixes Applied

### 1. Enhanced Video URL Generation (`courseDownloadService.ts`)
- Fixed `getVideoUrl()` method to create proper signed URLs from storage paths
- Added proper error handling and logging
- Now handles both full URLs and storage paths correctly

### 2. Improved Video Retrieval Logic (`courseDataLayer.ts`)
- Enhanced `transformOfflineContentItems()` with multiple fallback strategies:
  - Primary: Content item ID
  - Secondary: Lesson video ID  
  - Tertiary: Lesson ID with suffix
  - Quaternary: Direct lesson lookup in videos store
- Added comprehensive logging for debugging
- Added `debugListVideos()` method for troubleshooting

### 3. Added Missing Database Methods (`offlineDatabase.ts`)
- Added `getVideosByCourse()` method for comprehensive video lookup
- Enhanced video retrieval capabilities

### 4. Enhanced Debug Logging (`CourseContent.tsx`)
- Added detailed logging when loading offline courses
- Lists all video content items and their URL status
- Calls debug video listing for offline courses

## Testing Steps

### Prerequisites
1. Ensure you have a course with video content
2. Make sure you're logged in as a Student
3. Have the course downloaded for offline access

### Test Procedure

1. **Start the application**
   ```bash
   npm run dev
   ```

2. **Go online and download a course**
   - Navigate to `/dashboard/offline-learning`
   - Download a course that contains video lessons
   - Wait for download to complete

3. **Go offline**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Check "Offline" checkbox

4. **View the downloaded course**
   - In the Offline Learning tab, click "View Course" on a downloaded course
   - Navigate to a video lesson
   - **Expected Result**: Video should display and play properly

5. **Check console logs**
   - Open browser console
   - Look for debug messages starting with:
     - `🔄 CourseContent: Loading course data`
     - `🔍 CourseContent: Course is offline, debugging video storage`
     - `🎥 CourseContent: Video content items found`
     - `🎥 CourseDataLayer: Processing video item`
     - `✅ Found video with ID`

### Success Criteria
- ✅ Videos display properly in offline mode
- ✅ Video controls work (play, pause, seek)
- ✅ No "No video content available" message
- ✅ Console shows successful video URL generation
- ✅ No errors in browser console

### Troubleshooting

If videos still don't work:

1. **Check console logs** for error messages
2. **Verify video storage** - look for debug messages showing stored videos
3. **Re-download the course** - the fix improves download process too
4. **Clear browser data** and try again if needed

### Debug Commands (Browser Console)

```javascript
// Get course data layer instance and debug a specific course
const dataLayer = getCourseDataLayer();
await dataLayer.debugListVideos('your-course-id-here');
```

## Technical Details

### Video Storage Flow
1. **Download**: Videos are downloaded with proper signed URLs and stored with content item IDs
2. **Storage**: Videos stored in IndexedDB with multiple reference points (content ID, lesson ID)
3. **Retrieval**: Multiple fallback strategies ensure videos are found regardless of ID variations
4. **Display**: Blob URLs created from stored video data for offline playback

### Key Files Modified
- `src/services/courseDownloadService.ts` - Fixed video URL generation
- `src/services/courseDataLayer.ts` - Enhanced video retrieval with fallbacks
- `src/services/offlineDatabase.ts` - Added missing database methods
- `src/pages/CourseContent.tsx` - Added debug logging

## Rollback Plan
If issues occur, revert the changes to these files:
- `src/services/courseDownloadService.ts` (lines 613-644)
- `src/services/courseDataLayer.ts` (lines 499-582, 128-158)
- `src/services/offlineDatabase.ts` (lines 475-487)
- `src/pages/CourseContent.tsx` (lines 1130-1184)
