# 🚀 Multi-Environment CI/CD Guide for LMS Web App

## 📋 **Overview**

This guide explains how to manage different build packages and secrets across multiple environments (Development, Staging, Production) using a comprehensive CI/CD strategy.

## 🏗️ **Environment Architecture**

### **Environment Mapping**
| Environment | Branch | Purpose | Configuration |
|-------------|--------|---------|---------------|
| **Development** | `feature/*`, manual | Feature development & testing | Debug enabled, local APIs |
| **Staging** | `develop` | Pre-production testing | Production-like, test data |
| **Production** | `main` | Live application | Optimized, real data |

### **Build Configurations**
```bash
# Development Build
npm run build:dev          # Uses .env.development
npm run dev:development    # Local dev server

# Staging Build  
npm run build:staging      # Uses .env.staging
npm run dev:staging        # Staging dev server

# Production Build
npm run build:prod         # Uses .env.production
npm run dev:production     # Production dev server
```

## 🔐 **Secrets Management Strategy**

### **GitHub Secrets Organization**

#### **Development Environment**
```
DEV_VITE_SUPABASE_URL
DEV_VITE_SUPABASE_ANON_KEY
DEV_VITE_API_BASE_URL
DEV_VITE_AUTH_TOKEN
DEV_VITE_MCP_ADAPTER_URL
DEV_VITE_MCP_SSE_URL
DEV_VITE_OPENAI_API_KEY
DEV_VITE_BULK_UPLOAD_XLSX_TEMPLATE_URL
DEV_S3_BUCKET_NAME
DEV_CLOUDFRONT_DISTRIBUTION_ID
```

#### **Staging Environment**
```
STAGING_VITE_SUPABASE_URL
STAGING_VITE_SUPABASE_ANON_KEY
STAGING_VITE_API_BASE_URL
STAGING_VITE_AUTH_TOKEN
STAGING_VITE_MCP_ADAPTER_URL
STAGING_VITE_MCP_SSE_URL
STAGING_VITE_OPENAI_API_KEY
STAGING_VITE_BULK_UPLOAD_XLSX_TEMPLATE_URL
STAGING_S3_BUCKET_NAME
STAGING_CLOUDFRONT_DISTRIBUTION_ID
```

#### **Production Environment**
```
PROD_VITE_SUPABASE_URL
PROD_VITE_SUPABASE_ANON_KEY
PROD_VITE_API_BASE_URL
PROD_VITE_AUTH_TOKEN
PROD_VITE_MCP_ADAPTER_URL
PROD_VITE_MCP_SSE_URL
PROD_VITE_OPENAI_API_KEY
PROD_VITE_BULK_UPLOAD_XLSX_TEMPLATE_URL
PROD_S3_BUCKET_NAME
PROD_CLOUDFRONT_DISTRIBUTION_ID
```

#### **Shared Secrets**
```
AWS_ACCESS_KEY_ID          # Same AWS account, different buckets
AWS_SECRET_ACCESS_KEY      # Same AWS account, different buckets
```

## 🔄 **CI/CD Workflow Features**

### **Automatic Environment Detection**
- **Main branch** → Production deployment
- **Develop branch** → Staging deployment  
- **Feature branches** → Development deployment
- **Manual trigger** → Choose any environment

### **Environment-Specific Configurations**
```yaml
# Production
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=error
Cache-Control: public,max-age=31536000,immutable

# Staging  
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=info
Cache-Control: public,max-age=3600

# Development
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
Cache-Control: no-cache
```

### **Build Validation**
- ✅ Environment variable validation
- ✅ Build output verification
- ✅ Asset size reporting
- ✅ Security scanning (secrets redaction)

### **Deployment Features**
- ✅ Environment-specific S3 buckets
- ✅ CloudFront invalidation per environment
- ✅ Rollback capabilities
- ✅ Deployment notifications

## 🛠️ **Setup Instructions**

### **Step 1: Configure GitHub Secrets**

1. Go to your repository **Settings** → **Secrets and variables** → **Actions**
2. Add all environment-specific secrets using the naming convention above
3. Use the **Environment secrets** feature for additional security:
   - Create environments: `development`, `staging`, `production`
   - Add environment-specific secrets to each environment
   - Configure protection rules (e.g., require approval for production)

### **Step 2: Create Environment Files**

```bash
# Copy templates and fill with actual values
cp env.development.template .env.development
cp env.staging.template .env.staging  
cp env.production.template .env.production

# Edit each file with environment-specific values
```

### **Step 3: Configure AWS Resources**

#### **S3 Buckets**
```bash
# Create environment-specific buckets
aws s3 mb s3://your-app-dev
aws s3 mb s3://your-app-staging
aws s3 mb s3://your-app-prod

# Configure bucket policies for static website hosting
```

#### **CloudFront Distributions**
```bash
# Create distributions for each environment
# Point to respective S3 buckets
# Configure custom domains if needed
```

### **Step 4: Test the Pipeline**

```bash
# Test development build
git checkout -b feature/test-pipeline
git push origin feature/test-pipeline

# Test staging build  
git checkout develop
git push origin develop

# Test production build
git checkout main
git push origin main
```

## 📊 **Environment Comparison**

| Feature | Development | Staging | Production |
|---------|-------------|---------|------------|
| **Debug Mode** | ✅ Enabled | ✅ Enabled | ❌ Disabled |
| **Source Maps** | ✅ Included | ✅ Included | ❌ Excluded |
| **API Endpoints** | 🏠 Local/Dev | 🧪 Staging | 🌐 Production |
| **Database** | 🧪 Test Data | 🧪 Staging Data | 📊 Live Data |
| **Caching** | ❌ No Cache | ⏱️ Short Cache | 🚀 Long Cache |
| **Monitoring** | 📝 Console Logs | 📊 Basic Analytics | 📈 Full Monitoring |
| **Error Reporting** | 🔍 Detailed | 📋 Moderate | 🎯 Essential Only |

## 🔒 **Security Best Practices**

### **Secret Management**
- ✅ Use environment-specific secret prefixes
- ✅ Rotate secrets regularly
- ✅ Use GitHub Environment protection rules
- ✅ Implement least-privilege access
- ✅ Never commit secrets to code

### **Build Security**
- ✅ Redact secrets in build logs
- ✅ Validate environment variables
- ✅ Scan for exposed credentials
- ✅ Use secure artifact storage

### **Deployment Security**
- ✅ Environment-specific AWS IAM roles
- ✅ S3 bucket policies with environment restrictions
- ✅ CloudFront security headers
- ✅ HTTPS enforcement

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Environment Variables Not Loading**
```bash
# Check if environment file exists
ls -la .env.*

# Verify build mode
npm run build:dev --verbose

# Check Vite configuration
cat vite.config.ts
```

#### **Wrong Environment Deployed**
```bash
# Check branch mapping in workflow
# Verify GitHub secrets are set correctly
# Check workflow dispatch input
```

#### **Build Failures**
```bash
# Clear cache and rebuild
rm -rf node_modules/.vite dist
npm ci
npm run build:prod
```

#### **AWS Deployment Issues**
```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check S3 bucket permissions
aws s3 ls s3://your-bucket-name

# Verify CloudFront distribution
aws cloudfront list-distributions
```

## 📈 **Monitoring & Analytics**

### **Build Metrics**
- Build time per environment
- Bundle size tracking
- Dependency analysis
- Performance budgets

### **Deployment Metrics**
- Deployment frequency
- Success/failure rates
- Rollback frequency
- Environment-specific performance

### **Application Metrics**
- Environment-specific error rates
- Performance by environment
- User engagement per environment
- Feature flag effectiveness

## 🔄 **Advanced Features**

### **Feature Flags**
```typescript
// Environment-specific feature flags
const FEATURES = {
  development: {
    debugPanel: true,
    experimentalFeatures: true,
    mockData: true
  },
  staging: {
    debugPanel: true,
    experimentalFeatures: true,
    mockData: false
  },
  production: {
    debugPanel: false,
    experimentalFeatures: false,
    mockData: false
  }
};
```

### **Environment-Specific Configurations**
```typescript
// config/environment.ts
export const getEnvironmentConfig = () => {
  const mode = import.meta.env.MODE;
  
  const configs = {
    development: {
      apiTimeout: 30000,
      retryAttempts: 3,
      logLevel: 'debug'
    },
    staging: {
      apiTimeout: 15000,
      retryAttempts: 2,
      logLevel: 'info'
    },
    production: {
      apiTimeout: 10000,
      retryAttempts: 1,
      logLevel: 'error'
    }
  };
  
  return configs[mode] || configs.production;
};
```

### **Automated Testing by Environment**
```yaml
# Add to workflow
- name: Run environment-specific tests
  run: |
    case ${{ needs.determine-environment.outputs.environment }} in
      development)
        npm run test:dev
        ;;
      staging)
        npm run test:staging
        npm run test:e2e:staging
        ;;
      production)
        npm run test:prod
        npm run test:e2e:prod
        npm run test:security
        ;;
    esac
```

## 📋 **Checklist for Implementation**

### **Initial Setup**
- [ ] Create environment-specific GitHub secrets
- [ ] Set up AWS resources (S3 buckets, CloudFront)
- [ ] Configure environment files locally
- [ ] Update package.json scripts
- [ ] Test local builds for each environment

### **CI/CD Pipeline**
- [ ] Deploy multi-environment workflow
- [ ] Test automatic environment detection
- [ ] Verify manual deployment triggers
- [ ] Test rollback procedures
- [ ] Set up monitoring and notifications

### **Security & Compliance**
- [ ] Implement secret rotation schedule
- [ ] Set up environment protection rules
- [ ] Configure security scanning
- [ ] Document access controls
- [ ] Test disaster recovery procedures

### **Monitoring & Maintenance**
- [ ] Set up environment-specific monitoring
- [ ] Configure alerting rules
- [ ] Implement performance budgets
- [ ] Schedule regular security audits
- [ ] Document troubleshooting procedures

---

**🎉 Your multi-environment CI/CD pipeline is now ready to handle different packages and secrets across dev, staging, and production environments!**
