# 🔐 GitHub Secrets Setup Guide for LMS Web App

## 📋 **Required GitHub Secrets**

Your updated GitHub Actions pipeline now requires the following secrets to be configured in your repository settings.

### **🔑 Supabase Configuration**
| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://your-project-id.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_API_BASE_URL` | Base URL for your API | `https://your-api-domain.com` |

### **🔥 Firebase Configuration (Optional)**
| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key | `AIzaSyC...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | `1:123456789:web:abc123` |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase measurement ID | `G-XXXXXXXXXX` |
| `VITE_FIREBASE_VAPID_KEY` | Firebase VAPID key | `BNxxx...` |

### **🤖 OpenAI Configuration (Optional)**
| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `VITE_OPENAI_API_KEY` | OpenAI API key for AI features | `sk-...` |

### **☁️ AWS Configuration**
| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `AWS_ACCESS_KEY_ID` | AWS access key ID | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | AWS region for S3 bucket | `us-east-1` |
| `S3_BUCKET_NAME` | S3 bucket name for deployment | `your-app-bucket` |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID (optional) | `E1234567890ABC` |

---

## 🛠️ **How to Set Up GitHub Secrets**

### **Step 1: Navigate to Repository Settings**
1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**

### **Step 2: Add Repository Secrets**
1. Click **New repository secret**
2. Enter the secret name (exactly as shown above)
3. Enter the secret value
4. Click **Add secret**

### **Step 3: Verify All Secrets Are Set**
Use this checklist to ensure all required secrets are configured:

#### **✅ Required Secrets (Must Have)**
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `AWS_ACCESS_KEY_ID`
- [ ] `AWS_SECRET_ACCESS_KEY`
- [ ] `AWS_REGION`
- [ ] `S3_BUCKET_NAME`

#### **🔧 Optional Secrets (If Using These Services)**
- [ ] `VITE_API_BASE_URL`
- [ ] `VITE_OPENAI_API_KEY`
- [ ] `CLOUDFRONT_DISTRIBUTION_ID`
- [ ] Firebase secrets (if using Firebase)

---

## 📍 **Where to Find These Values**

### **🔗 Supabase Credentials**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

### **🔥 Firebase Credentials**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **General**
4. Scroll to **Your apps** section
5. Click on your web app
6. Copy the config values from the Firebase SDK snippet

### **🤖 OpenAI API Key**
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to **API Keys**
3. Create a new API key or use existing one

### **☁️ AWS Credentials**
1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Create a new user or use existing one
3. Attach policies: `AmazonS3FullAccess`, `CloudFrontFullAccess`
4. Generate access keys
5. For S3 bucket name: Go to S3 console and note your bucket name
6. For CloudFront distribution: Go to CloudFront console and copy distribution ID

---

## 🚀 **Updated Pipeline Features**

Your enhanced pipeline now includes:

### **✅ Environment Management**
- ✅ Automatically creates `.env.production` from GitHub secrets
- ✅ Validates all required environment variables before build
- ✅ Supports both file-based and environment-based variable loading
- ✅ Redacts sensitive values in logs for security

### **✅ Build Process**
- ✅ Comprehensive build verification
- ✅ Build statistics and asset counting
- ✅ Proper error handling and validation
- ✅ Support for skipping deployment (build-only mode)

### **✅ Deployment Features**
- ✅ Optimized S3 sync with proper cache headers
- ✅ Separate cache policies for static assets vs HTML
- ✅ Automatic CloudFront invalidation (if configured)
- ✅ Comprehensive deployment summary

### **✅ Error Handling**
- ✅ Pre-flight checks for all required secrets
- ✅ Build output verification
- ✅ AWS configuration validation
- ✅ Detailed error messages and troubleshooting info

---

## 🧪 **Testing Your Pipeline**

### **Manual Trigger**
1. Go to **Actions** tab in your repository
2. Select **Build & Deploy (Vite → S3 + CloudFront)**
3. Click **Run workflow**
4. Choose environment and options:
   - **Environment**: `production` or `staging`
   - **Skip deployment**: Check to build only (no S3 upload)

### **Expected Output**
The pipeline will show detailed logs for each step:
```
🔍 Verifying environment variables are set...
✅ Required environment variables are present
📋 Environment file contents (redacted):
VITE_SUPABASE_URL=***REDACTED***
VITE_SUPABASE_ANON_KEY=***REDACTED***
...
✅ Build output verified
📊 Build statistics: 2.1M
🚀 Deploying to S3 bucket: your-app-bucket
✅ S3 sync completed
🎉 Deployment completed successfully!
```

---

## 🔧 **Troubleshooting**

### **❌ "Secret is not set" Error**
```bash
❌ ERROR: VITE_SUPABASE_URL secret is not set
```
**Solution:** Add the missing secret in GitHub repository settings.

### **❌ Build Fails with Environment Error**
```bash
❌ ERROR: dist directory not found
```
**Solution:** Check if environment variables are correctly set and build command succeeds.

### **❌ AWS Deployment Fails**
```bash
❌ ERROR: AWS_ACCESS_KEY_ID secret is not set
```
**Solution:** Verify all AWS secrets are configured and IAM user has proper permissions.

### **❌ CloudFront Invalidation Fails**
**Solution:** Ensure `CLOUDFRONT_DISTRIBUTION_ID` is set and AWS user has CloudFront permissions.

---

## 🔒 **Security Best Practices**

### **✅ Do's**
- ✅ Use repository secrets for all sensitive values
- ✅ Regularly rotate API keys and access tokens
- ✅ Use least-privilege IAM policies for AWS
- ✅ Monitor secret usage in Actions logs

### **❌ Don'ts**
- ❌ Never commit secrets to code repository
- ❌ Don't use organization secrets for project-specific values
- ❌ Don't share secrets between unrelated repositories
- ❌ Don't use production secrets in development/testing

---

## 📋 **Quick Setup Checklist**

1. **✅ Gather Credentials**
   - [ ] Supabase project URL and anon key
   - [ ] AWS access keys and S3 bucket name
   - [ ] Optional: Firebase, OpenAI, CloudFront credentials

2. **✅ Configure GitHub Secrets**
   - [ ] Add all required secrets to repository settings
   - [ ] Verify secret names match exactly (case-sensitive)
   - [ ] Test with a manual workflow run

3. **✅ Test Pipeline**
   - [ ] Run workflow manually with "Skip deployment" checked
   - [ ] Verify build succeeds and environment variables load
   - [ ] Run full deployment to S3

4. **✅ Verify Deployment**
   - [ ] Check S3 bucket for deployed files
   - [ ] Test application in browser
   - [ ] Verify no "Invalid API key" errors

---

**🎉 Your pipeline is now configured to securely manage environment variables and deploy your LMS application!**

