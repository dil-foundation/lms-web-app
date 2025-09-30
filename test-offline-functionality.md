# Offline Learning Feature Testing Checklist

## 🎯 Pre-Testing Setup
- [ ] App running on `http://localhost:8080`
- [ ] Browser DevTools open (F12)
- [ ] Logged in as a **Student** (important!)

## 📋 Test Cases

### ✅ **Test 1: Basic Offline Detection**
1. **Go to Network tab in DevTools**
2. **Check "Offline" checkbox**
3. **Expected Result:**
   - Toast notification: "You're now offline"
   - Connection status banner appears
   - Any restricted page redirects to offline-learning

### ✅ **Test 2: Allowed Routes (Should Work Offline)**
**While offline, navigate to:**
- [ ] `/dashboard/offline-learning` ✅ Should work
- [ ] `/dashboard/courses/[any-course-id]/content` ✅ Should work

### 🚫 **Test 3: Blocked Routes (Should Redirect)**
**While offline, try to navigate to:**
- [ ] `/dashboard/courses` 🚫 Should redirect
- [ ] `/dashboard/assignments` 🚫 Should redirect  
- [ ] `/dashboard/progress` 🚫 Should redirect
- [ ] `/dashboard/messages` 🚫 Should redirect
- [ ] `/dashboard/discussion` 🚫 Should redirect
- [ ] `/dashboard/meetings` 🚫 Should redirect

**Expected for all blocked routes:**
- Immediate redirect to `/dashboard/offline-learning`
- Toast: "You're now offline. Redirecting to available content..."

### 🔄 **Test 4: Online/Offline Transitions**
1. **Start online** → Navigate freely ✅
2. **Go offline** → See notification + redirects 🚫
3. **Go back online** → See "Connection restored!" ✅
4. **Navigate freely again** ✅

### 👨‍🏫 **Test 5: Teacher/Admin (No Restrictions)**
1. **Logout and login as Teacher or Admin**
2. **Go offline using DevTools**
3. **Navigate to any route**
4. **Expected:** Full access, no redirects ✅

### 🌐 **Test 6: Connection Quality**
**In DevTools Network tab, test:**
- [ ] "No throttling" → No warnings
- [ ] "Fast 3G" → No warnings  
- [ ] "Slow 3G" → Yellow warning banner
- [ ] "Offline" → Red offline banner + redirects

### 🔧 **Test 7: Manual Refresh**
1. **While offline, click "Check Connection" button**
2. **Expected:** Loading spinner + re-check network
3. **If still offline:** Stay on current state
4. **If back online:** Success notification

## 🐛 **Debugging Tips**

### **Console Messages to Look For:**
```javascript
🛡️ OfflineRouteGuard: Route guard check: {...}
🟢 Network: Online event detected
🔴 Network: Offline event detected  
🔄 Student redirected from X to Y due to offline
```

### **Network Status Object:**
```javascript
// In console, type:
navigator.onLine  // Basic online status
navigator.connection  // Detailed connection info (if available)
```

### **Force Network Events:**
```javascript
// In console, simulate events:
window.dispatchEvent(new Event('online'))
window.dispatchEvent(new Event('offline'))
```

## 🎯 **Expected User Experience**

### **For Students:**
- **Online:** 🟢 Full access to all features
- **Goes offline:** 🔄 Immediate notification + redirect
- **Tries restricted route:** 🚫 Professional access denied  
- **Can access:** ✅ Offline Learning + Course Content only
- **Back online:** 🎉 Success notification + full access

### **For Teachers/Admins:**
- **Always:** ✅ Full functionality regardless of connection
- **Optional:** 📊 Connection quality indicators

## ✅ **Success Criteria**
- [ ] Students get redirected when offline
- [ ] Teachers/Admins have no restrictions
- [ ] Proper toast notifications show
- [ ] Connection status banners appear
- [ ] Allowed routes work offline
- [ ] Blocked routes redirect properly
- [ ] Online restoration works smoothly
- [ ] No console errors
- [ ] Professional UI/UX throughout

## 🚨 **Common Issues to Check**
- [ ] Make sure you're logged in as a **Student**
- [ ] Clear browser cache if behavior seems inconsistent
- [ ] Check console for any JavaScript errors
- [ ] Verify network throttling is actually applied
- [ ] Test in different browsers (Chrome, Firefox, Safari)
