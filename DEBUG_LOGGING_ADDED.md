# Comprehensive Debug Logging Added

## What I've Added

I've added extensive debug logging to help diagnose why videos and attachments aren't showing in offline mode. Here's what will now be logged when you view an offline course:

### 1. **Complete Course Data Debug** (`courseDataLayer.ts`)
When you view an offline course, the system will now log:

```
==================== COURSE DEBUG START ====================
📋 Course Info: {id, title, subtitle, downloadStatus, totalSize, etc.}
📚 Found X lessons for course [courseId]

For each lesson:
📖 Lesson [lessonId]:
  - Title: [lesson title]
  - Type: [video/text/quiz/assignment]
  - VideoId: [video ID reference]
  - Order: [lesson order]
  - Duration: [duration]
  - AssetIds: [list of asset IDs]
  - Metadata: [full metadata object]
  - Original Content Items (X):
    1. VIDEO: [title] (ID: [id])
       - content_path: [storage path]
       - order: [order]
    2. ATTACHMENT: [title] (ID: [id])
       - content_path: [storage path]
       - order: [order]
  🎥 Videos for lesson (X):
    📹 Video ID: [id]
       - Original URL: [download URL]
       - Size: [size in MB]
       - Quality: [quality]
       - Format: [format]
       - Compressed: [true/false]
       - Download Date: [timestamp]
       - Metadata: [metadata]

🎬 All videos in course [courseId] (X):
  1. Video ID: [id] | Lesson: [lessonId] | Size: [size]

📎 All assets in course [courseId] (X):
  1. Asset ID: [id] | Type: [type] | Filename: [filename]
     - Size: [size in KB]
     - Lesson: [lessonId]
     - Download Date: [timestamp]
==================== COURSE DEBUG END ====================
```

### 2. **Enhanced Video Retrieval Logging**
When trying to load videos offline:

```
🎥 CourseDataLayer: Attempting to get offline video for ID: [videoId]
🎥 CourseDataLayer: Cache miss, querying IndexedDB for video [videoId]
🎥 CourseDataLayer: ✅ Found video in IndexedDB: {
  id, lessonId, courseId, size, format, quality, 
  originalUrl, blobType, blobSize
}
🎥 CourseDataLayer: ✅ Created blob URL for video [videoId]: blob:http://...
```

### 3. **Enhanced Asset Retrieval Logging**
When trying to load attachments offline:

```
📎 CourseDataLayer: Attempting to get offline asset for ID: [assetId]
📎 CourseDataLayer: Cache miss, querying IndexedDB for asset [assetId]
📎 CourseDataLayer: ✅ Found asset in IndexedDB: {
  id, filename, type, size, courseId, lessonId,
  blobType, blobSize, metadata
}
📎 CourseDataLayer: ✅ Created blob URL for asset [assetId]: blob:http://...
```

### 4. **Content Item Processing Logging**
For each content item being processed:

```
📚 CourseDataLayer: Processing content item [id] (video): [title]
🎥 CourseDataLayer: Trying video ID: [id]
🎥 CourseDataLayer: ✅ Found video with ID: [id]
```

## How to Use This Debug Information

### Step 1: Reproduce the Issue
1. Go offline (DevTools Network → Offline)
2. Navigate to your downloaded course
3. Try to view a video lesson

### Step 2: Check Console Output
Open browser console and look for:

1. **Course Debug Section**: Shows all stored data for the course
2. **Video Processing**: Shows if videos are found and blob URLs created
3. **Asset Processing**: Shows if attachments are found and blob URLs created

### Step 3: Identify the Problem
Based on the logs, you can determine:

- **No videos/assets stored**: The debug section will show 0 videos/assets
- **Videos stored but not found**: Video processing will show "❌ No video found"
- **ID mismatch**: Content item IDs won't match stored video/asset IDs
- **Blob creation issues**: Errors when creating blob URLs

### Step 4: Report Findings
Please share the console output, specifically:
1. The complete "COURSE DEBUG" section
2. Any error messages (❌)
3. The video/asset processing logs for the specific content you're trying to view

## Expected Output for Working Content

For a properly working video:
```
🎥 CourseDataLayer: ✅ Found video with ID: [content-item-id]
🎥 CourseDataLayer: ✅ Created blob URL for video [id]: blob:http://localhost:8080/[uuid]
```

For a properly working attachment:
```
📎 CourseDataLayer: ✅ Found asset in IndexedDB: {...}
📎 CourseDataLayer: ✅ Created blob URL for asset [id]: blob:http://localhost:8080/[uuid]
```

## Next Steps

Once you provide the debug output, I can:
1. Identify exactly what data is stored vs. what's expected
2. Fix any ID mapping issues
3. Resolve blob URL creation problems
4. Ensure proper content item to stored data mapping

This comprehensive logging will help us pinpoint the exact issue preventing videos and attachments from displaying offline.
