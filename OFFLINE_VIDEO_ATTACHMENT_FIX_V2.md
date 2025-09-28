# Offline Video & Attachment Fix - Version 2

## Issue Identified
Videos and attachments were not displaying in offline mode because:

1. **ID Mismatch**: The content item IDs used to search for videos/attachments didn't match the IDs used when storing them in IndexedDB
2. **Limited Search Strategy**: Only tried exact ID matches without fallback strategies
3. **Missing Debug Information**: Couldn't see what was actually stored vs. what was being searched for
4. **MIME Type Issues**: Video blobs had incorrect or missing MIME types causing playback failures

## Comprehensive Fix Applied

### 1. **Enhanced Video Retrieval Logic** (`courseDataLayer.ts`)

**Before**: Only tried exact content item ID match
```typescript
signedUrl = await this.getVideoUrlOffline(item.id);
```

**After**: Multiple fallback strategies with detailed logging
```typescript
// List all videos stored for the lesson
const allVideosForLesson = await this.db.getVideosByLesson(lesson.id);
console.log(`Found ${allVideosForLesson.length} videos stored for lesson ${lesson.id}`);

// Try multiple search strategies
const videoSearchIds = [
  item.id,                    // Content item ID (primary)
  lesson.videoId,             // Lesson's video ID
  `${lesson.id}_video`,       // Lesson ID + suffix
  lesson.id                   // Lesson ID itself
];

// If no exact match, use first video found for the lesson
if (!signedUrl && videosByLesson.length > 0) {
  const video = videosByLesson[0];
  // Apply MIME type fix and create blob URL
  signedUrl = URL.createObjectURL(videoBlob);
}
```

### 2. **Enhanced Attachment Retrieval Logic** (`courseDataLayer.ts`)

**Before**: Only tried exact content item ID match
```typescript
signedUrl = await this.getAssetUrlOffline(item.id);
```

**After**: Multiple fallback strategies with detailed logging
```typescript
// List all assets stored for the lesson
const allAssetsForLesson = await this.db.getAssetsByLesson(lesson.id);
console.log(`Found ${allAssetsForLesson.length} assets stored for lesson ${lesson.id}`);

// Try multiple search strategies
const assetSearchIds = [
  item.id,                    // Content item ID (primary)
  `${lesson.id}_attachment`,  // Lesson ID + suffix
  lesson.id                   // Lesson ID itself
];

// If no exact match, use first asset found for the lesson
if (!signedUrl && assetsByLesson.length > 0) {
  const asset = assetsByLesson[0];
  signedUrl = URL.createObjectURL(asset.blob);
}
```

### 3. **Added Missing Database Method** (`offlineDatabase.ts`)

Added `getAssetsByLesson()` method to retrieve all assets for a specific lesson:

```typescript
async getAssetsByLesson(lessonId: string): Promise<OfflineAsset[]> {
  return this.performTransaction(STORES.ASSETS, 'readonly', (store) => {
    return new Promise<OfflineAsset[]>((resolve, reject) => {
      const index = (store as IDBObjectStore).index('lessonId');
      const request = index.getAll(lessonId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}
```

### 4. **Enhanced MIME Type Detection** (`courseDataLayer.ts`)

Added comprehensive MIME type detection for video blobs:

```typescript
private detectVideoMimeType(format: string, originalUrl: string): string {
  // Detects MIME types for: mp4, webm, ogg, avi, mov, wmv, flv, 3gp, mkv
  // Uses both format field and URL extension analysis
  // Provides fallback to 'video/mp4' if detection fails
}
```

### 5. **Comprehensive Debug Logging**

Now logs detailed information about:
- What videos/assets are actually stored for each lesson
- What IDs are being searched for
- Which search strategy succeeds
- Blob URL creation details
- MIME type fixes applied

## Expected Results

When you view an offline course now, you should see in the console:

```
🎥 CourseDataLayer: Found 1 videos stored for lesson [lesson-id]:
  📹 Video ID: [video-id], originalUrl: [url], size: 23.16MB
🎥 CourseDataLayer: Will try video search IDs: [item-id], [lesson-video-id], [lesson-id]_video, [lesson-id]
🎥 CourseDataLayer: ✅ Found video by lesson lookup: [video-id], blob URL: blob:http://localhost:8080/...

📎 CourseDataLayer: Found 1 assets stored for lesson [lesson-id]:
  📎 Asset ID: [asset-id], filename: [filename], type: attachment, size: 123.45KB
📎 CourseDataLayer: ✅ Found asset by lesson lookup: [asset-id], blob URL: blob:http://localhost:8080/...
```

## Testing Instructions

1. **Go offline** (disconnect internet or use browser dev tools)
2. **Navigate to your downloaded course**
3. **Click on a video lesson** - Video should now play properly
4. **Click on an attachment lesson** - Attachment should now be available for view/download
5. **Check browser console** - Should see detailed debug logs showing successful video/asset retrieval

The fix addresses the core ID mismatch issue by implementing multiple search strategies and using lesson-based lookups as fallbacks, ensuring that videos and attachments are found regardless of how they were stored during the download process.
