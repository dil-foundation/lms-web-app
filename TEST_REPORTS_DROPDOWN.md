# Testing Checklist: Reports Analytics Date Filter Dropdown

## Quick Test (2 minutes)

### Setup
1. [ ] Open browser to `http://localhost:8080/dashboard`
2. [ ] Log in as Admin/Super User
3. [ ] Navigate to "Performance Analytics" (AI Reports page)
4. [ ] Open DevTools Console (F12)

### Basic Functionality Test
1. [ ] **Initial State**
   - Dropdown displays "This month"
   - Console shows: `📊 [ReportsAnalytics] Current dateRange: thismonth`

2. [ ] **Click Dropdown**
   - Dropdown opens smoothly
   - Shows 4 options (Today, This week, This month, All time)
   - "This month" has checkmark

3. [ ] **Select "Today"**
   - Console shows: `📅 [ReportsAnalytics] Date filter changed to: today`
   - Dropdown closes
   - Data refreshes (brief loading indicator)
   - Toast notification: "Reports data refreshed successfully"

4. [ ] **Select "All time"**
   - Same behavior as above
   - Console shows: `alltime` → `all_time` mapping

## Detailed Test (5 minutes)

### Desktop View Testing (≥768px width)

#### Visual Check
- [ ] Dropdown positioned correctly in header (right side)
- [ ] Width: `w-40 md:w-48` (160px on md, 192px on lg)
- [ ] Height: `h-9 md:h-10` (36px on md, 40px on lg)
- [ ] Text size: `text-sm` (14px)
- [ ] Refresh button visible next to dropdown
- [ ] Export button visible (if data available)

#### Interaction Check
- [ ] **Click outside dropdown** → Closes without selection
- [ ] **Press Escape** → Closes dropdown
- [ ] **Arrow keys** → Navigate options
- [ ] **Enter key** → Select highlighted option
- [ ] **Tab key** → Focus moves correctly

#### Console Verification
```
Expected logs when selecting "This week":
✓ 📅 [ReportsAnalytics] Date filter changed to: thisweek
✓ Time range changed to: thisweek
✓ 🔄 [useReportsData] Fetching data with timeRange: this_week
✓ ✅ [useReportsData] Successfully loaded data
```

### Mobile View Testing (<768px width)

#### Setup
- [ ] Open DevTools → Toggle device toolbar (Ctrl+Shift+M)
- [ ] Select "Samsung Galaxy S8+" (360x740)

#### Visual Check
- [ ] Dropdown in mobile header layout (stacked)
- [ ] Full width: `flex-1`
- [ ] Smaller height: `h-8` (32px)
- [ ] Smaller text: `text-xs` (12px)
- [ ] Refresh button visible and clickable

#### Interaction Check
- [ ] Dropdown opens without being cut off
- [ ] Options fully visible
- [ ] Selection works correctly
- [ ] Console shows "Mobile" tag in logs

#### Console Verification
```
Expected logs when selecting "Today" on mobile:
✓ 📅 [ReportsAnalytics Mobile] Date filter changed to: today
✓ Time range changed to: today
✓ 🔄 [useReportsData] Fetching data with timeRange: today
```

### Edge Cases Testing

#### 1. Rapid Selection Changes
**Action:** Quickly select Today → This week → This month → All time

**Expected:**
- [ ] Multiple "changed to" logs appear
- [ ] Only ONE API request fires (after 300ms)
- [ ] Last selection wins

**Console:**
```
📅 Date filter changed to: today
📅 Date filter changed to: thisweek
📅 Date filter changed to: thismonth
📅 Date filter changed to: alltime
Time range changed to: alltime  ← Only this one
🔄 Fetching data with timeRange: all_time  ← Single request
```

#### 2. Selecting Same Option
**Action:** Select "This month" when already on "This month"

**Expected:**
- [ ] Console log still fires
- [ ] No API request (optimization)
- [ ] Dropdown closes
- [ ] No error

#### 3. Network Failure
**Action:** 
1. Open Network tab in DevTools
2. Enable "Offline" mode
3. Select different time range

**Expected:**
- [ ] Selection changes in UI
- [ ] Error toast appears
- [ ] Console shows error message
- [ ] Dropdown still functional after going online

#### 4. Long Loading Time
**Action:**
1. Throttle network to "Slow 3G"
2. Select different time range

**Expected:**
- [ ] Loading indicator appears
- [ ] Refresh button shows spinning icon
- [ ] Dropdown remains disabled during load
- [ ] Selection completes successfully

### Data Refresh Verification

For each time range option, verify data changes:

#### Today
- [ ] "Practice Stage Performance" chart updates
- [ ] "User Engagement Overview" pie chart updates
- [ ] "Time of Day Usage" line chart updates
- [ ] "Top Content" list updates
- [ ] Key metrics cards update

#### This Week
- [ ] All charts show week data
- [ ] Metrics increase compared to "Today"
- [ ] Time patterns show week distribution

#### This Month
- [ ] All charts show month data
- [ ] Larger data sets visible
- [ ] Monthly trends apparent

#### All Time
- [ ] Maximum data displayed
- [ ] Historical trends visible
- [ ] All stages have data

### Cross-Browser Testing

#### Chrome/Edge (Chromium)
- [ ] Desktop: All tests pass
- [ ] Mobile: All tests pass
- [ ] Console logs correct

#### Firefox
- [ ] Desktop: All tests pass
- [ ] Mobile: All tests pass
- [ ] Console logs correct

#### Safari (if available)
- [ ] Desktop: All tests pass
- [ ] Mobile: All tests pass
- [ ] Console logs correct

## Accessibility Testing

### Keyboard Navigation
1. [ ] Tab to dropdown → Focus visible
2. [ ] Enter → Opens dropdown
3. [ ] Arrow Down → Highlights next option
4. [ ] Arrow Up → Highlights previous option
5. [ ] Enter → Selects highlighted option
6. [ ] Escape → Closes dropdown

### Screen Reader Testing (Optional)
1. [ ] Enable screen reader (NVDA/JAWS/VoiceOver)
2. [ ] Navigate to dropdown
3. [ ] Verify "Select time range" announced
4. [ ] Verify options are announced
5. [ ] Verify selection feedback

## Performance Testing

### Initial Load
- [ ] Page loads in < 2 seconds
- [ ] Dropdown renders immediately
- [ ] No layout shift

### Selection Performance
- [ ] Dropdown opens instantly (< 100ms)
- [ ] Selection registers immediately
- [ ] API call starts within 300ms
- [ ] Data refresh completes in < 2 seconds

### Memory Check (DevTools → Performance)
1. [ ] Record performance
2. [ ] Change dropdown 10 times
3. [ ] Stop recording
4. [ ] Verify no memory leaks
5. [ ] Check for excessive re-renders

## Bug Scenarios to Test

### Scenario 1: Overlapping Elements
**Test:** Scroll page, open dropdown near page edges

**Expected:**
- [ ] Dropdown renders on top (z-999999)
- [ ] No elements overlay dropdown
- [ ] Portal rendering ensures visibility

### Scenario 2: Duplicate Component Instances
**Test:** Check React DevTools → Components

**Expected:**
- [ ] Single ReportsAnalytics instance
- [ ] Single useReportsData hook
- [ ] No duplicate API calls

### Scenario 3: State Persistence
**Action:**
1. Select "This week"
2. Navigate to different page
3. Return to Reports Analytics

**Expected:**
- [ ] Still shows "This week"
- [ ] Data matches selection
- [ ] No reset to default

### Scenario 4: Simultaneous Interactions
**Action:**
1. Change dropdown
2. Immediately click refresh button

**Expected:**
- [ ] Both actions handled gracefully
- [ ] No race conditions
- [ ] Final data state is correct

## Sign-off Checklist

### Functionality
- [ ] All time ranges selectable
- [ ] Data refreshes correctly
- [ ] Console logs appear as expected
- [ ] Toast notifications work
- [ ] No JavaScript errors

### Visual
- [ ] Desktop layout correct
- [ ] Mobile layout correct
- [ ] Dropdown styling consistent
- [ ] Selected option highlighted
- [ ] Smooth animations

### UX
- [ ] Debouncing prevents spam
- [ ] Loading states clear
- [ ] Error handling graceful
- [ ] Keyboard accessible
- [ ] Fast and responsive

### Technical
- [ ] No memory leaks
- [ ] No duplicate API calls
- [ ] Proper state management
- [ ] Clean console (no warnings)
- [ ] No linter errors

## Test Results

**Tester:** _______________  
**Date:** _______________  
**Browser:** _______________  
**OS:** _______________  

**Overall Status:** [ ] Pass / [ ] Fail  
**Issues Found:** _______________  
**Notes:** _______________

---

## Known Limitations

1. **Time Zone:** All times are in user's local timezone
2. **Data Availability:** "Today" may show limited data if no recent activity
3. **Cache Duration:** Repeated requests within 60s may return cached data
4. **Debounce Delay:** 300ms delay between selection and API call is intentional

## Next Steps After Testing

✅ **If all tests pass:**
- [ ] Remove debug console logs (optional)
- [ ] Deploy to staging environment
- [ ] Monitor production logs for issues

❌ **If tests fail:**
- [ ] Document failure details
- [ ] Check console for errors
- [ ] Review network requests
- [ ] File bug report with steps to reproduce

