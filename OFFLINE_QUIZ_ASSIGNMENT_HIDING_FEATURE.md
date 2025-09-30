# Offline Quiz & Assignment Hiding Feature

## Overview
This feature automatically hides Quiz and Assignment lesson content when viewing courses in offline mode, providing a cleaner offline learning experience for students.

## Implementation Details

### Date Implemented
September 30, 2025

### Files Modified
- `src/pages/CourseContent.tsx`

### Changes Made

#### 1. Added WifiOff Icon Import (Line 37)
Added `WifiOff` icon to the lucide-react imports for displaying the offline message.

#### 2. Enhanced `allContentItems` Computation (Line 1319-1327)
Added filtering logic to exclude quiz and assignment content items when in offline mode:

```typescript
// Filter out quiz and assignment content items when in offline mode
const allContentItems = useMemo(() => {
  const items = course?.modules.flatMap((m: any) => m.lessons.flatMap((l: any) => l.contentItems)) || [];
  // Hide quiz and assignment content when offline
  if (isOfflineMode) {
    return items.filter((item: any) => item.content_type !== 'quiz' && item.content_type !== 'assignment');
  }
  return items;
}, [course, isOfflineMode]);
```

**Impact**: This affects all calculations and navigation that depend on `allContentItems`, including:
- Progress calculation (e.g., "2 of 10")
- Next/Previous navigation
- Content item click handlers

#### 3. Auto-Redirect When Going Offline (Lines 1332-1342)
Added a useEffect hook to automatically redirect to the first available content when a quiz/assignment is currently being viewed and the user goes offline:

```typescript
// Redirect to first available content if current item is quiz/assignment and we go offline
useEffect(() => {
  if (isOfflineMode && currentContentItem && (currentContentItem.content_type === 'quiz' || currentContentItem.content_type === 'assignment')) {
    // Find the first available (non-quiz/assignment) content item
    const firstAvailableItem = allContentItems.find((item: any) => item.content_type !== 'quiz' && item.content_type !== 'assignment');
    if (firstAvailableItem) {
      console.log('📴 Redirecting from', currentContentItem.content_type, 'to first available content');
      setCurrentContentItemId(firstAvailableItem.id);
    }
  }
}, [isOfflineMode, currentContentItem, allContentItems]);
```

**Impact**: Prevents users from being stuck on a quiz/assignment screen when going offline.

#### 4. Main Content Area - Offline Message (Lines 1430-1453)
Added early return in `renderContent()` function to show a friendly offline message when quiz/assignment content is accessed:

```typescript
// Hide quiz and assignment content when offline
if (isOfflineMode && (currentContentItem.content_type === 'quiz' || currentContentItem.content_type === 'assignment')) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <WifiOff className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Content Not Available Offline
              </h3>
              <p className="text-sm text-muted-foreground">
                {currentContentItem.content_type === 'quiz' ? 'Quizzes' : 'Assignments'} require an internet connection. Please go online to access this content.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Impact**: Instead of showing quiz/assignment content, displays a user-friendly message explaining why the content is unavailable.

#### 5. Course Sidebar - Admin/Teacher View with Reordering (Lines 2339-2375)
Added filtering for content items in the drag-and-drop enabled view:

```typescript
<SortableContext 
  items={lesson.contentItems
    .filter((item: any) => {
      // Hide quiz and assignment when offline
      if (isOfflineMode && (item.content_type === 'quiz' || item.content_type === 'assignment')) {
        return false;
      }
      return true;
    })
    .map((item: any) => item.id)}
  strategy={verticalListSortingStrategy}
>
  {lesson.contentItems
    .filter((item: any) => {
      // Hide quiz and assignment when offline
      if (isOfflineMode && (item.content_type === 'quiz' || item.content_type === 'assignment')) {
        return false;
      }
      return true;
    })
    .map((item: any, index: number) => {
      // ... render logic
    })}
</SortableContext>
```

**Impact**: When admins or teachers view courses offline (if they have downloaded them), quiz and assignment items won't appear in the sortable list.

#### 6. Course Sidebar - Student View (Lines 2377-2403)
Added filtering for content items in the non-reorderable student view:

```typescript
lesson.contentItems
  .filter((item: any) => {
    // Hide quiz and assignment when offline
    if (isOfflineMode && (item.content_type === 'quiz' || item.content_type === 'assignment')) {
      return false;
    }
    return true;
  })
  .map((item: any, index: number) => {
    // ... render logic
  })
```

**Impact**: Students viewing courses offline will not see quiz and assignment items in the lesson content list.

## How It Works

### Detection
The feature uses the existing `isOfflineMode` state variable which is already tracked in the `CourseContent` component.

### Filtering Logic
- **Content Types Filtered**: `'quiz'` and `'assignment'`
- **Content Types Displayed**: `'video'` and `'attachment'`
- **When Active**: Only when `isOfflineMode === true`

### User Experience

#### Before Implementation (Offline Mode - Old Behavior)
**Sidebar**:
```
Course Module
├─ Lesson 1
│  ├─ 1. Introduction Video ✓
│  ├─ 2. Quiz: Chapter 1 ❌ (Visible but not functional)
│  ├─ 3. Assignment: Homework ❌ (Visible but not functional)
│  └─ 4. Reference Material
```

**Main Content Area**: Quiz content would still render, causing confusion

#### After Implementation (Offline Mode - New Behavior)
**Sidebar**:
```
Course Module
├─ Lesson 1
│  ├─ 1. Introduction Video ✓
│  └─ 2. Reference Material
```

**Main Content Area**: Shows friendly "Content Not Available Offline" message if quiz/assignment is accessed

#### Online Mode (Unchanged)
```
Course Module
├─ Lesson 1
│  ├─ 1. Introduction Video ✓
│  ├─ 2. Quiz: Chapter 1
│  ├─ 3. Assignment: Homework
│  └─ 4. Reference Material
```

## Benefits

1. **Cleaner UI**: Removes non-functional content items from the offline view
2. **Better UX**: Students don't see unavailable content types and get helpful offline messages
3. **Accurate Progress**: Progress calculations only count items that are actually available
4. **Consistent Navigation**: Next/Previous buttons skip over hidden items
5. **Auto-Redirect**: Automatically navigates to available content when going offline
6. **Friendly Messages**: Clear explanations when quiz/assignment content is accessed offline
7. **No Breaking Changes**: All existing functionality remains intact when online

## Technical Considerations

### Why This Approach?
- **Non-destructive**: Doesn't modify the actual course data
- **Runtime filtering**: Applied at multiple strategic layers (computation, rendering, main content)
- **Minimal changes**: Only 6 strategic additions to 1 file
- **Type-safe**: Uses existing TypeScript interfaces
- **Performant**: Uses React's `useMemo` and `useEffect` for efficient computation
- **User-friendly**: Provides clear feedback instead of broken functionality

### Limitations
1. Quiz and assignment data is still downloaded as part of the course (not filtered at download time)
2. ~~If a student is in the middle of a quiz and goes offline, they may see navigation issues~~ ✅ FIXED: Auto-redirects to first available content
3. Progress percentages may differ between online and offline views for the same course (by design - only counts available content)

### Future Enhancements
Potential improvements for consideration:
1. Add a user preference toggle to show/hide quiz and assignments in offline mode
2. Filter out quiz/assignment content at download time to save storage space
3. Add visual indicators explaining why content is hidden
4. Allow "read-only" viewing of quiz questions (without submission) in offline mode
5. Cache quiz/assignment progress and sync when going back online

## Testing Recommendations

### Test Scenarios

#### 1. Basic Filtering
- [ ] Go offline and view a downloaded course
- [ ] Verify quiz and assignment items are hidden
- [ ] Verify video and attachment items are still visible

#### 2. Navigation
- [ ] Navigate through content items using Next/Previous buttons
- [ ] Verify navigation skips hidden items
- [ ] Check that progress counter (e.g., "2 of 10") excludes hidden items

#### 3. Online/Offline Transition
- [ ] Start viewing a course online (all items visible)
- [ ] Go offline (quiz and assignments should disappear)
- [ ] Go back online (quiz and assignments should reappear)

#### 4. Different User Roles
- [ ] Test as student (most common use case)
- [ ] Test as teacher (if teachers can download courses)
- [ ] Test as admin (if admins can download courses)

#### 5. Edge Cases
- [ ] Course with only quiz/assignment content (empty when offline)
- [ ] Lesson with mixed content types
- [ ] Course with no quiz/assignment content (should work the same)

### Browser Testing
Test in Chrome, Firefox, Safari, and Edge with:
- Network throttling (offline mode)
- Mobile responsive views
- Different screen sizes

## Rollback Plan

If issues arise, revert the changes by:
1. Remove the filtering logic from the three locations modified
2. Keep the original `allContentItems` computation without the filter

The change is self-contained and can be easily reverted without affecting other features.

## Related Files
- `src/pages/CourseContent.tsx` - Main implementation
- `src/services/courseDataLayer.ts` - Handles offline/online data switching (not modified)
- `src/services/offlineDatabase.ts` - IndexedDB storage (not modified)
- `src/hooks/useOfflineRouteGuard.ts` - Route protection (not modified)

## Notes
- This feature complements the existing offline learning infrastructure
- No database migrations required
- No API changes required
- Works seamlessly with existing offline download functionality
