# Test Guide: Offline Quiz & Assignment Hiding Feature

## Quick Test Steps

### Prerequisites
1. Have at least one course with mixed content types (videos, quizzes, assignments, attachments)
2. Download the course for offline access
3. Open browser DevTools (F12)

### Test 1: Visual Verification (3 minutes)

#### Step 1: View Course Online
1. Navigate to a downloaded course: `/dashboard/courses/{course-id}/content`
2. In the left sidebar, count the number of content items
3. Note which items are quizzes (❓ icon) and assignments (📝 icon)
4. **Expected**: All content items visible

#### Step 2: Go Offline
1. In DevTools → Network tab
2. Check the "Offline" checkbox
3. Look at the course sidebar again
4. **Expected Result**:
   - ❓ Quiz items should disappear
   - 📝 Assignment items should disappear
   - 🎥 Video items should remain
   - 📎 Attachment items should remain

#### Step 3: Go Back Online
1. Uncheck the "Offline" checkbox in DevTools
2. Look at the course sidebar
3. **Expected**: All content items reappear (including quizzes and assignments)

### Test 2: Navigation Test (2 minutes)

#### While Offline:
1. Note the progress indicator (e.g., "2 of 10" at top right)
2. Click through content using "Next" button
3. **Expected**:
   - Navigation should skip over quiz and assignment items
   - Progress counter should only count visible items (videos + attachments)
   - Should not get stuck or show errors

### Test 3: Edge Cases (5 minutes)

#### Test Case 1: Course with Only Quizzes/Assignments
1. Create or find a course that only has quiz/assignment content
2. Download it and go offline
3. View the course
4. **Expected**: Lessons should appear empty (no content items listed)

#### Test Case 2: Mixed Lesson
Find a lesson with this structure:
- Video
- Quiz
- Assignment
- Attachment

**While Online**: Should see 4 items (1. Video, 2. Quiz, 3. Assignment, 4. Attachment)
**While Offline**: Should see 2 items (1. Video, 2. Attachment)

Note: The numbering stays sequential (1, 2) not (1, 4)

#### Test Case 3: Mid-Course Offline Switch
1. Start viewing a course online
2. Navigate to a quiz item
3. Switch to offline mode (DevTools)
4. **Expected**: 
   - Should redirect or show appropriate message
   - Sidebar should update to hide quiz/assignment items
   - Navigation should work without errors

### Test 4: Different User Roles (3 minutes)

#### As Teacher/Admin:
1. Login as teacher or admin
2. Download a course (if permitted)
3. Go offline and view the course
4. **Expected**: Quiz and assignment items should still be hidden
   - Even though teachers can reorder content, offline restrictions apply

### Visual Checklist

#### ✅ What Should Happen
- [ ] Quizzes disappear when offline
- [ ] Assignments disappear when offline
- [ ] Videos remain visible when offline
- [ ] Attachments remain visible when offline
- [ ] Progress counter updates correctly
- [ ] Next/Previous navigation works smoothly
- [ ] No console errors appear
- [ ] Smooth transition between online/offline states

#### ❌ What Should NOT Happen
- [ ] Videos should NOT disappear
- [ ] Attachments should NOT disappear
- [ ] Should NOT show broken icons or placeholders for hidden items
- [ ] Should NOT get stuck on navigation
- [ ] Should NOT show quiz/assignment content when offline
- [ ] Should NOT cause page crashes or errors

## Expected Console Messages

When viewing offline courses, you might see these console logs:
```
📊 CourseDataLayer: Getting course {id} - Online: false, Offline Available: true
🔴 OfflineLearning: Offline - skipping online courses fetch
```

These are normal and indicate the offline system is working correctly.

## Troubleshooting

### Quiz/Assignment Still Showing Offline?
- **Check**: Ensure DevTools Network tab shows "Offline"
- **Check**: Browser might be caching. Hard refresh (Ctrl+Shift+R)
- **Check**: Verify `isOfflineMode` state is true (React DevTools)

### Navigation Not Working?
- **Check**: Ensure the course was fully downloaded before going offline
- **Check**: Check console for errors
- **Check**: Try clicking directly on a video/attachment item instead of using Next button

### Nothing Shows in Sidebar?
- **Check**: Course might only have quiz/assignment content
- **Check**: Try viewing a different course with video content
- **Check**: Verify course data loaded correctly (check React DevTools state)

## Success Criteria

The feature is working correctly if:
1. ✅ Quiz items (❓) are hidden when offline
2. ✅ Assignment items (📝) are hidden when offline  
3. ✅ Video items (🎥) remain visible when offline
4. ✅ Attachment items (📎) remain visible when offline
5. ✅ Progress calculations exclude hidden items
6. ✅ Navigation skips hidden items smoothly
7. ✅ No errors in console
8. ✅ Going online/offline updates the UI immediately

## Screenshots to Take

For documentation, capture:
1. Course sidebar showing all items (online mode)
2. Course sidebar showing filtered items (offline mode)
3. Progress indicator comparison (online vs offline)
4. Network tab showing "Offline" mode active

## Report Issues

If you encounter any issues:
1. Note the exact steps to reproduce
2. Check browser console for errors
3. Include course ID and content types
4. Note your user role (student/teacher/admin)
5. Provide screenshot if possible

---

**Estimated Testing Time**: 15-20 minutes for complete test coverage
