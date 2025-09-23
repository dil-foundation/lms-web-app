# Environment Variables Build Fix Guide

## 🚨 **Problem Diagnosis**

You're getting the "Invalid API key" error because:

1. **Missing Environment Files**: The build process can't find `.env.production` file
2. **Vite Environment Loading**: Vite needs `VITE_` prefixed variables to be available during build
3. **Fallback Values**: The app is using hardcoded fallback values instead of your actual Supabase credentials

## 🔧 **Solution Steps**

### **Step 1: Create Environment Files**

Create the production environment file:

```bash
# In your project root (/Users/puttaiaharugunta/work-2/test/lms-web-app/)
cp .env.production.template .env.production
```

### **Step 2: Configure Environment Variables**

Edit `.env.production` with your actual Supabase credentials:

```bash
# .env.production
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-actual-anon-key"
VITE_API_BASE_URL="https://your-api-url.com"
```

### **Step 3: Update Vite Configuration**

The current `vite.config.ts` is correctly configured to load environment variables:

```typescript
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory
  const env = loadEnv(mode, process.cwd(), '')
  return {
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
    },
    // ... rest of config
  };
});
```

### **Step 4: Verify Environment Loading**

Add this temporary debug code to `src/integrations/supabase/client.ts` to verify variables are loaded:

```typescript
// Add this temporarily at the top of the file for debugging
console.log('🔍 Environment Debug:', {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing',
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD
});
```

## 🚀 **Build Commands**

### **For Production Build:**
```bash
npm run build:prod
```

### **For Development Build:**
```bash
npm run build:dev
```

## 🔒 **CI/CD Pipeline Configuration**

### **GitHub Actions / Pipeline Secrets**

Make sure your CI/CD pipeline has these environment variables set:

```yaml
# In your GitHub Actions or CI/CD pipeline
env:
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
  VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
```

### **Alternative: Create .env during CI/CD**

Add this step to your pipeline before the build:

```yaml
- name: Create environment file
  run: |
    echo "VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL }}" >> .env.production
    echo "VITE_SUPABASE_ANON_KEY=${{ secrets.VITE_SUPABASE_ANON_KEY }}" >> .env.production
    echo "VITE_API_BASE_URL=${{ secrets.VITE_API_BASE_URL }}" >> .env.production
```

## 🛠️ **Enhanced Vite Configuration (Optional)**

For better environment handling, you can enhance your `vite.config.ts`:

```typescript
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory
  const env = loadEnv(mode, process.cwd(), '');
  
  // Validate required environment variables
  const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !env[envVar]);
  
  if (missingEnvVars.length > 0 && mode === 'production') {
    console.error('❌ Missing required environment variables:', missingEnvVars);
    process.exit(1);
  }
  
  return {
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
      // Expose env vars to the client
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL),
    },
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
```

## 🧪 **Testing the Fix**

### **1. Local Testing:**
```bash
# Create the environment file
cp .env.production.template .env.production

# Edit .env.production with your actual values
# Then build
npm run build:prod

# Test the built application
npm run preview
```

### **2. Verify Environment Variables:**
```bash
# Check if variables are loaded during build
npm run build:prod 2>&1 | grep -i "supabase\|env"
```

## 🔍 **Debugging Steps**

### **1. Check Current Environment Variables:**
```bash
# In your project directory
echo "Current environment files:"
ls -la .env*

echo "Environment variables during build:"
npm run build:prod --verbose
```

### **2. Verify Supabase Configuration:**
Add this to your `src/integrations/supabase/client.ts` temporarily:

```typescript
// Debug logging (remove after fixing)
console.log('🔧 Supabase Config Debug:', {
  url: SUPABASE_URL,
  keyPresent: !!SUPABASE_PUBLISHABLE_KEY,
  keyLength: SUPABASE_PUBLISHABLE_KEY?.length,
  isUsingFallback: SUPABASE_URL === 'https://yfaiauooxwvekdimfeuu.supabase.co'
});
```

## 📋 **Quick Fix Checklist**

- [ ] Create `.env.production` file from template
- [ ] Add actual Supabase URL and anon key to `.env.production`
- [ ] Verify CI/CD pipeline has the correct secrets
- [ ] Test build locally with `npm run build:prod`
- [ ] Check browser console for environment debug logs
- [ ] Remove debug logs after verification

## 🚨 **Common Issues & Solutions**

### **Issue 1: Variables Not Loading**
```bash
# Solution: Ensure file exists and has correct format
ls -la .env.production
cat .env.production
```

### **Issue 2: Wrong Mode**
```bash
# Ensure you're using the correct build command
npm run build:prod  # Uses production mode
npm run build:dev   # Uses development mode
```

### **Issue 3: Cache Issues**
```bash
# Clear build cache
rm -rf dist node_modules/.vite
npm install
npm run build:prod
```

### **Issue 4: Pipeline Secrets**
- Verify secrets are set in your CI/CD platform
- Check secret names match exactly (case-sensitive)
- Ensure secrets don't have extra spaces or newlines

## 🎯 **Expected Result**

After implementing this fix:

1. ✅ Build process will use actual Supabase credentials
2. ✅ No more "Invalid API key" errors
3. ✅ Application will connect to your Supabase instance
4. ✅ Environment variables will be properly embedded in the build

## 📞 **Need Help?**

If you're still getting errors after following these steps:

1. Share the exact error message
2. Show the contents of your `.env.production` file (redact sensitive values)
3. Confirm your CI/CD pipeline configuration
4. Check browser console for any additional error details

---

**Note:** Remember to never commit actual environment files (`.env.production`, `.env.development`) to version control. They should remain in `.gitignore`.

