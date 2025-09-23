# 🔧 Supabase API Key Error - Complete Solution

## 🚨 **Problem Summary**

You're encountering this error during S3 deployment:
```json
{
  "message": "Invalid API key", 
  "hint": "Double check your Supabase `anon` or `service_role` API key."
}
```

**Root Cause:** The build process (`npm run build:prod`) is not loading your actual Supabase environment variables, causing the application to use fallback/placeholder values.

---

## ✅ **Complete Solution**

### **Step 1: Create Environment Files**

I've created a setup script for you. Run this command:

```bash
cd /Users/puttaiaharugunta/work-2/test/lms-web-app
./setup-env.sh
```

This creates:
- `.env.production` (for production builds)
- `.env.development` (for development builds)

### **Step 2: Configure Your Actual Supabase Credentials**

Edit the `.env.production` file with your real Supabase credentials:

```bash
# Open the file
nano .env.production

# Or use any text editor
code .env.production
```

Replace the placeholder values:
```env
VITE_SUPABASE_URL="https://your-actual-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-actual-anon-key-from-supabase-dashboard"
VITE_API_BASE_URL="https://your-api-url.com"
```

### **Step 3: Get Your Actual Supabase Credentials**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (for `VITE_SUPABASE_URL`)
   - **anon/public key** (for `VITE_SUPABASE_ANON_KEY`)

### **Step 4: Test the Build Locally**

```bash
# Build for production
npm run build:prod

# Test the built application
npm run preview
```

### **Step 5: Update CI/CD Pipeline**

If you're using a CI/CD pipeline, ensure these secrets are configured:

**GitHub Actions Secrets:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`

**Pipeline Configuration Example:**
```yaml
- name: Create environment file
  run: |
    echo "VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL }}" >> .env.production
    echo "VITE_SUPABASE_ANON_KEY=${{ secrets.VITE_SUPABASE_ANON_KEY }}" >> .env.production
    echo "VITE_API_BASE_URL=${{ secrets.VITE_API_BASE_URL }}" >> .env.production

- name: Build application
  run: npm run build:prod
```

---

## 🔍 **Verification Steps**

### **1. Check Environment Loading**

Add this temporary debug code to `src/integrations/supabase/client.ts`:

```typescript
// Add at the top for debugging (remove after verification)
console.log('🔍 Environment Debug:', {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing',
  MODE: import.meta.env.MODE,
  isUsingFallback: import.meta.env.VITE_SUPABASE_URL === 'https://yfaiauooxwvekdimfeuu.supabase.co'
});
```

### **2. Verify Build Output**

```bash
# Check if environment variables are loaded during build
npm run build:prod 2>&1 | grep -i "supabase\|env"

# Check the built files
ls -la dist/
```

### **3. Test in Browser**

After deployment, open browser console and check for:
- No "Invalid API key" errors
- Environment debug logs showing correct values
- Successful Supabase connection

---

## 🛠️ **Files Created/Modified**

### **New Files:**
1. **`ENV_VARIABLES_BUILD_FIX.md`** - Comprehensive troubleshooting guide
2. **`setup-env.sh`** - Automated environment setup script
3. **`ci-cd-env-setup.yml`** - CI/CD configuration examples
4. **`.env.production`** - Production environment variables (created by script)
5. **`.env.development`** - Development environment variables (created by script)

### **Existing Configuration:**
- **`vite.config.ts`** - Already correctly configured for environment loading
- **`src/integrations/supabase/client.ts`** - Has fallback values (will use real values when env is set)
- **`.gitignore`** - Already ignores environment files

---

## 🚀 **Quick Fix Commands**

```bash
# 1. Navigate to project
cd /Users/puttaiaharugunta/work-2/test/lms-web-app

# 2. Create environment files
./setup-env.sh

# 3. Edit with your actual credentials
nano .env.production

# 4. Build for production
npm run build:prod

# 5. Deploy to S3 (your existing process)
# The dist/ folder now contains the correct environment variables
```

---

## 🎯 **Expected Results**

After implementing this solution:

✅ **Build Process:**
- Environment variables properly loaded during `npm run build:prod`
- No more placeholder/fallback values in the built application
- Correct Supabase credentials embedded in the production build

✅ **Application Behavior:**
- No "Invalid API key" errors
- Successful connection to your Supabase instance
- All authentication and database operations working

✅ **Deployment:**
- S3 deployment succeeds without API key errors
- Application loads correctly in production
- Users can authenticate and access features

---

## 🔒 **Security Notes**

- ✅ Environment files (`.env.production`, `.env.development`) are in `.gitignore`
- ✅ Never commit actual credentials to version control
- ✅ Use CI/CD secrets for automated deployments
- ✅ Rotate keys if they were accidentally exposed

---

## 📞 **Still Having Issues?**

If you continue to get the "Invalid API key" error:

1. **Verify Credentials:**
   ```bash
   # Check your .env.production file
   cat .env.production
   ```

2. **Test Supabase Connection:**
   ```bash
   # Use curl to test your Supabase endpoint
   curl -H "apikey: YOUR_ANON_KEY" "https://your-project-id.supabase.co/rest/v1/"
   ```

3. **Check Build Output:**
   ```bash
   # Look for environment variable issues in build logs
   npm run build:prod --verbose
   ```

4. **Browser Console:**
   - Open developer tools
   - Check for environment debug logs
   - Look for any Supabase connection errors

---

**The solution is now ready! Run `./setup-env.sh`, edit `.env.production` with your actual credentials, and rebuild with `npm run build:prod`.**

