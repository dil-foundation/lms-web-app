# Debug Guide: Super User Empty Pages Issue

## 🔍 Logging Added

I've added comprehensive logging to trace where the super_user role might be getting lost or filtered. Here's what to do:

---

## 📋 Step-by-Step Debugging Process

### **Step 1: Clear Everything and Reload**

1. **Open Browser DevTools** (F12)
2. **Console Tab** - Run this:
```javascript
// Clear all caches
localStorage.clear();
sessionStorage.clear();

// Clear IndexedDB (if used)
indexedDB.databases().then(dbs => {
  dbs.forEach(db => indexedDB.deleteDatabase(db.name));
});

// Reload
location.reload();
```

3. **Application Tab** → **Clear Storage** → **Clear site data**
4. **Hard Refresh**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

---

### **Step 2: Login and Check Console Logs**

After logging in as `superadmin@dil.com`, check the console for these logs:

#### **A. Profile Fetching (useUserProfile hook)**
Look for:
```
🔄 useUserProfile: Fetching fresh profile data
✅ useUserProfile: Profile data fetched: {…}
🔍 useUserProfile: USER ROLE: super_user    ← SHOULD SAY "super_user"
🔍 useUserProfile: Full profile object: {…}
🔍 useUserProfile: Profile state updated with role: super_user
```

**❓ Question 1:** Does the role show as `super_user`?
- ✅ **YES** → Continue to B
- ❌ **NO** → The profile is not being fetched correctly from database

#### **B. Dashboard Role Detection**
Look for:
```
🔍 Dashboard: Profile state changed
🔍 Dashboard: profile?.role: super_user    ← SHOULD SAY "super_user"
🔍 Dashboard: currentRole: super_user      ← SHOULD SAY "super_user"
🔍 Dashboard: Full profile: {…}
```

**❓ Question 2:** Does Dashboard see the role as `super_user`?
- ✅ **YES** → Continue to C
- ❌ **NO** → The profile state is not propagating correctly

#### **C. Users Management Component**
When you click on "Users" section, look for:
```
🔍 UsersManagement: fetchUsers called
🔍 UsersManagement: Params: {page: 1, rowsPerPage: 8, searchTerm: "", roleFilter: "all"}
🔍 UsersManagement: get-users response: {data: {…}, error: null}
🔍 UsersManagement: Fetched users count: 28 Users: 8
```

**❓ Question 3:** Does it show the correct user count?
- ✅ **YES, shows 28 users** → Frontend is working, continue to D
- ❌ **NO, shows 0 users or error** → Check edge function logs

#### **D. Edge Function Logs (get-users)**
Check **Supabase Dashboard → Functions → get-users → Logs**:
```
🔍 get-users function: Params received: {…}
🔍 get-users function: Query result - count: 28, profiles: 8
```

**❓ Question 4:** Does the edge function return data?
- ✅ **YES** → Data is being fetched but not displayed
- ❌ **NO** → RLS policy issue or authentication problem

---

## 🐛 Common Issues and Solutions

### **Issue 1: Profile Role is NULL or Wrong**
**Symptoms:** useUserProfile logs show `role: null` or wrong role

**Solution:**
```sql
-- Run in Supabase SQL Editor
UPDATE public.profiles 
SET role = 'super_user'
WHERE id = '215c77fc-a529-43ca-84c5-e6bb78889d8b';

-- Verify
SELECT id, email, role FROM public.profiles 
WHERE id = '215c77fc-a529-43ca-84c5-e6bb78889d8b';
```

---

### **Issue 2: Profile Cache Not Clearing**
**Symptoms:** Still showing old role after cache clear

**Solution:**
```javascript
// In browser console
const profileCacheKey = 'dil_user_profile_offline_cache';
localStorage.removeItem(profileCacheKey);

// Also clear all auth tokens
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('auth')) {
    localStorage.removeItem(key);
  }
});

location.reload();
```

---

### **Issue 3: TypeScript Type Issue**
**Symptoms:** Role is fetched but not recognized

**Check:** `src/config/roleNavigation.ts`
```typescript
export type UserRole = 'student' | 'teacher' | 'admin' | 'content_creator' | 'super_user' | 'view_only';
```

Make sure `super_user` is in the type definition.

---

### **Issue 4: Edge Function Not Returning Data**
**Symptoms:** get-users returns empty array

**Solution:**
1. Check **Supabase Dashboard → Functions → get-users → Logs**
2. Look for errors like "permission denied" or "RLS policy"
3. Verify edge function is using `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)

---

## 📊 What Each Log Tells You

| Log Location | What It Means | If Missing/Wrong |
|--------------|---------------|------------------|
| `useUserProfile: USER ROLE` | Profile fetched from DB | Database issue or cache issue |
| `Dashboard: currentRole` | Dashboard received role | State propagation issue |
| `UsersManagement: Fetched users count` | Data retrieved | Edge function or RLS issue |
| `get-users function: Query result` | Database query succeeded | RLS policy blocking data |

---

## 🔧 **Push Updated Code to Supabase**

The edge function logging needs to be deployed:

```bash
cd D:\work\DIL-LMS\dil
supabase functions deploy get-users
```

---

## 📞 **Report Back**

After following these steps, please share:

1. **Screenshot of console logs** (all 4 sections A-D)
2. **Screenshot of Supabase Functions logs** (if edge function is being called)
3. **Answer to the 4 questions above**

This will help identify exactly where the issue is!

---

## 🎯 **Quick Test Script**

Run this in browser console after login:

```javascript
// Quick diagnostic
console.log('=== SUPER USER DEBUG ===');
console.log('1. LocalStorage auth:', localStorage.getItem(import.meta.env.VITE_AUTH_TOKEN));
console.log('2. Profile cache:', localStorage.getItem('dil_user_profile_offline_cache'));
console.log('3. Current URL:', window.location.href);
console.log('4. Network online:', navigator.onLine);
```

---

**Next Steps:** Follow the step-by-step process above and report back with the console logs!

